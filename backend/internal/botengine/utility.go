package botengine

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/riftapp-cloud/riftapp/internal/models"
	"github.com/riftapp-cloud/riftapp/internal/repository"
)

type UtilityTemplate struct{}

func NewUtilityTemplate() *UtilityTemplate {
	return &UtilityTemplate{}
}

func (t *UtilityTemplate) Name() string { return "utility" }

func (t *UtilityTemplate) DefaultConfig() json.RawMessage {
	return json.RawMessage(`{}`)
}

func (t *UtilityTemplate) ValidateConfig(cfg json.RawMessage) error {
	return nil
}

func (t *UtilityTemplate) OnEvent(ctx context.Context, hctx *HubContext, event Event) error {
	switch event.Type {
	case EventSlashCommand:
		return t.handleSlashCommand(ctx, hctx, event)
	case EventComponentClick:
		return t.handleComponentClick(ctx, hctx, event)
	}
	return nil
}

func (t *UtilityTemplate) handleSlashCommand(ctx context.Context, hctx *HubContext, event Event) error {
	var cmd SlashCommandData
	if err := json.Unmarshal(event.Data, &cmd); err != nil {
		return nil
	}

	switch cmd.CommandName {
	case "poll":
		return t.handlePollCommand(ctx, hctx, cmd)
	case "remind":
		return t.handleRemindCommand(ctx, hctx, cmd)
	case "serverinfo":
		return t.handleServerInfoCommand(ctx, hctx, cmd)
	case "announce":
		return t.handleAnnounceCommand(ctx, hctx, cmd)
	}
	return nil
}

func (t *UtilityTemplate) handlePollCommand(ctx context.Context, hctx *HubContext, cmd SlashCommandData) error {
	question := cmd.Options["question"]
	if question == "" {
		_, _ = hctx.SendMessage(ctx, cmd.StreamID, "Please provide a question for the poll.", nil, nil)
		return nil
	}

	var options []string
	for i := 1; i <= 10; i++ {
		key := fmt.Sprintf("option%d", i)
		if val, ok := cmd.Options[key]; ok && val != "" {
			options = append(options, val)
		}
	}
	if len(options) < 2 {
		_, _ = hctx.SendMessage(ctx, cmd.StreamID, "Polls need at least 2 options.", nil, nil)
		return nil
	}

	pollID := uuid.New().String()
	optionsJSON, _ := json.Marshal(options)

	poll := &repository.Poll{
		ID:       pollID,
		HubID:    hctx.HubID,
		StreamID: cmd.StreamID,
		AuthorID: cmd.UserID,
		Question: question,
		Options:  optionsJSON,
		CreatedAt: time.Now(),
	}
	if err := hctx.CreatePoll(ctx, poll); err != nil {
		_, _ = hctx.SendMessage(ctx, cmd.StreamID, "Failed to create poll.", nil, nil)
		return nil
	}

	var fields []models.EmbedField
	for i, opt := range options {
		fields = append(fields, models.EmbedField{
			Name:  fmt.Sprintf("Option %d", i+1),
			Value: opt,
		})
	}

	var buttons []models.Component
	for i := range options {
		buttons = append(buttons, models.Component{
			Type:     models.ComponentTypeButton,
			Style:    models.ButtonStylePrimary,
			Label:    fmt.Sprintf("%d", i+1),
			CustomID: fmt.Sprintf("poll_vote:%s:%d", pollID, i),
		})
	}

	embed := models.Embed{
		Title:       "📊 " + question,
		Description: "Click a button to vote!",
		Color:       0x5865F2,
		Fields:      fields,
	}

	actionRow := models.Component{
		Type:       models.ComponentTypeActionRow,
		Components: buttons,
	}

	msg, _ := hctx.SendMessage(ctx, cmd.StreamID, "", []models.Embed{embed}, []models.Component{actionRow})
	if msg != nil && hctx.pollRepo != nil {
		poll.MessageID = &msg.ID
	}

	return nil
}

func (t *UtilityTemplate) handleRemindCommand(ctx context.Context, hctx *HubContext, cmd SlashCommandData) error {
	timeStr := cmd.Options["time"]
	message := cmd.Options["message"]
	if timeStr == "" || message == "" {
		_, _ = hctx.SendMessage(ctx, cmd.StreamID, "Usage: /remind time:<duration> message:<text>", nil, nil)
		return nil
	}

	duration, err := parseDuration(timeStr)
	if err != nil {
		_, _ = hctx.SendMessage(ctx, cmd.StreamID, "Invalid duration. Use formats like 30m, 2h, 1d.", nil, nil)
		return nil
	}

	remindAt := time.Now().Add(duration)
	if err := hctx.CreateReminder(ctx, cmd.UserID, message, &cmd.StreamID, remindAt); err != nil {
		_, _ = hctx.SendMessage(ctx, cmd.StreamID, "Failed to create reminder.", nil, nil)
		return nil
	}

	embed := models.Embed{
		Title:       "⏰ Reminder Set",
		Description: fmt.Sprintf("I'll remind you about **%s** <t:%d:R>", message, remindAt.Unix()),
		Color:       0x43B581,
	}
	_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
	return nil
}

func (t *UtilityTemplate) handleServerInfoCommand(ctx context.Context, hctx *HubContext, cmd SlashCommandData) error {
	memberCount, _ := hctx.GetHubMemberCount(ctx)

	embed := models.Embed{
		Title: "Server Information",
		Color: 0x5865F2,
		Fields: []models.EmbedField{
			{Name: "Hub ID", Value: hctx.HubID, Inline: true},
			{Name: "Members", Value: fmt.Sprintf("%d", memberCount), Inline: true},
		},
	}
	_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
	return nil
}

func (t *UtilityTemplate) handleAnnounceCommand(ctx context.Context, hctx *HubContext, cmd SlashCommandData) error {
	message := cmd.Options["message"]
	if message == "" {
		_, _ = hctx.SendMessage(ctx, cmd.StreamID, "Please provide a message to announce.", nil, nil)
		return nil
	}

	embed := models.Embed{
		Title:       "📢 Announcement",
		Description: message,
		Color:       0xFF9F43,
		Footer:      &models.EmbedFooter{Text: fmt.Sprintf("Announced by user %s", cmd.UserID)},
	}
	_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
	return nil
}

func (t *UtilityTemplate) handleComponentClick(ctx context.Context, hctx *HubContext, event Event) error {
	var click ComponentClickData
	if err := json.Unmarshal(event.Data, &click); err != nil {
		return nil
	}

	if !strings.HasPrefix(click.CustomID, "poll_vote:") {
		return nil
	}

	parts := strings.Split(click.CustomID, ":")
	if len(parts) != 3 {
		return nil
	}
	pollID := parts[1]
	optionIdx, err := strconv.Atoi(parts[2])
	if err != nil {
		return nil
	}

	if err := hctx.VotePoll(ctx, pollID, click.UserID, optionIdx); err != nil {
		return nil
	}

	counts, err := hctx.GetPollVoteCounts(ctx, pollID)
	if err != nil {
		return nil
	}

	poll, err := hctx.GetPoll(ctx, pollID)
	if err != nil {
		return nil
	}

	var options []string
	_ = json.Unmarshal(poll.Options, &options)

	totalVotes := 0
	for _, c := range counts {
		totalVotes += c
	}

	var fields []models.EmbedField
	for i, opt := range options {
		count := counts[i]
		pct := 0
		if totalVotes > 0 {
			pct = count * 100 / totalVotes
		}
		bar := strings.Repeat("▓", pct/5) + strings.Repeat("░", 20-pct/5)
		fields = append(fields, models.EmbedField{
			Name:  fmt.Sprintf("Option %d: %s", i+1, opt),
			Value: fmt.Sprintf("%s %d%% (%d votes)", bar, pct, count),
		})
	}

	embed := models.Embed{
		Title:       "📊 " + poll.Question,
		Description: fmt.Sprintf("Total votes: %d", totalVotes),
		Color:       0x5865F2,
		Fields:      fields,
		Footer:      &models.EmbedFooter{Text: fmt.Sprintf("Voted by %s", click.UserID)},
	}

	_, _ = hctx.SendEmbed(ctx, click.StreamID, embed)
	return nil
}

func parseDuration(s string) (time.Duration, error) {
	s = strings.TrimSpace(s)
	if len(s) < 2 {
		return 0, fmt.Errorf("invalid duration")
	}
	unit := s[len(s)-1]
	numStr := s[:len(s)-1]
	num, err := strconv.Atoi(numStr)
	if err != nil {
		return time.ParseDuration(s)
	}

	switch unit {
	case 's':
		return time.Duration(num) * time.Second, nil
	case 'm':
		return time.Duration(num) * time.Minute, nil
	case 'h':
		return time.Duration(num) * time.Hour, nil
	case 'd':
		return time.Duration(num) * 24 * time.Hour, nil
	case 'w':
		return time.Duration(num) * 7 * 24 * time.Hour, nil
	default:
		return time.ParseDuration(s)
	}
}
