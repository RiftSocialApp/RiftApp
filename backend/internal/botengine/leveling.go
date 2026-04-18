package botengine

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/riftapp-cloud/riftapp/internal/models"
)

type LevelingConfig struct {
	XPPerMessage       int64             `json:"xp_per_message"`
	XPCooldownSeconds  int               `json:"xp_cooldown_seconds"`
	LevelUpStreamID    string            `json:"level_up_stream_id"`
	LevelUpMessage     string            `json:"level_up_message"`
	IgnoredStreams     []string          `json:"ignored_streams"`
	LevelRoles         map[string]string `json:"level_roles"`
}

type LevelingTemplate struct{}

func NewLevelingTemplate() *LevelingTemplate {
	return &LevelingTemplate{}
}

func (t *LevelingTemplate) Name() string { return "leveling" }

func (t *LevelingTemplate) DefaultConfig() json.RawMessage {
	cfg := LevelingConfig{
		XPPerMessage:      15,
		XPCooldownSeconds: 60,
		LevelUpMessage:    "Congrats {user}, you reached level {level}! 🎉",
		LevelRoles:        make(map[string]string),
	}
	b, _ := json.Marshal(cfg)
	return b
}

func (t *LevelingTemplate) ValidateConfig(cfg json.RawMessage) error {
	var c LevelingConfig
	return json.Unmarshal(cfg, &c)
}

func (t *LevelingTemplate) OnEvent(ctx context.Context, hctx *HubContext, event Event) error {
	var cfg LevelingConfig
	if err := json.Unmarshal(hctx.Config, &cfg); err != nil {
		cfg = LevelingConfig{XPPerMessage: 15, XPCooldownSeconds: 60}
	}
	if cfg.XPPerMessage <= 0 {
		cfg.XPPerMessage = 15
	}
	if cfg.XPCooldownSeconds <= 0 {
		cfg.XPCooldownSeconds = 60
	}

	switch event.Type {
	case EventMessageCreate:
		return t.handleMessage(ctx, hctx, event, cfg)
	case EventSlashCommand:
		return t.handleSlashCommand(ctx, hctx, event, cfg)
	}
	return nil
}

func (t *LevelingTemplate) handleMessage(ctx context.Context, hctx *HubContext, event Event, cfg LevelingConfig) error {
	var msg MessageEventData
	if err := json.Unmarshal(event.Data, &msg); err != nil {
		return nil
	}

	if msg.AuthorID == hctx.BotUserID {
		return nil
	}

	for _, ignored := range cfg.IgnoredStreams {
		if ignored == msg.StreamID {
			return nil
		}
	}

	newXP, newLevel, leveledUp, err := hctx.AddXP(ctx, msg.AuthorID, cfg.XPPerMessage, cfg.XPCooldownSeconds)
	if err != nil || !leveledUp {
		return nil
	}

	streamID := cfg.LevelUpStreamID
	if streamID == "" {
		streamID = msg.StreamID
	}

	vars := map[string]string{
		"{user}":  fmt.Sprintf("<@%s>", msg.AuthorID),
		"{level}": strconv.Itoa(newLevel),
		"{xp}":    strconv.FormatInt(newXP, 10),
	}
	message := applyTemplateVars(cfg.LevelUpMessage, vars)

	embed := models.Embed{
		Title:       "Level Up!",
		Description: message,
		Color:       0xFEE75C,
		Fields: []models.EmbedField{
			{Name: "Level", Value: strconv.Itoa(newLevel), Inline: true},
			{Name: "Total XP", Value: strconv.FormatInt(newXP, 10), Inline: true},
		},
	}
	_, _ = hctx.SendEmbed(ctx, streamID, embed)

	if cfg.LevelRoles != nil {
		levelStr := strconv.Itoa(newLevel)
		if rankID, ok := cfg.LevelRoles[levelStr]; ok && rankID != "" {
			_ = hctx.AssignRole(ctx, msg.AuthorID, rankID)
		}
	}

	return nil
}

func (t *LevelingTemplate) handleSlashCommand(ctx context.Context, hctx *HubContext, event Event, cfg LevelingConfig) error {
	var cmd SlashCommandData
	if err := json.Unmarshal(event.Data, &cmd); err != nil {
		return nil
	}

	switch cmd.CommandName {
	case "rank":
		return t.handleRankCommand(ctx, hctx, cmd)
	case "leaderboard":
		return t.handleLeaderboardCommand(ctx, hctx, cmd)
	}
	return nil
}

func (t *LevelingTemplate) handleRankCommand(ctx context.Context, hctx *HubContext, cmd SlashCommandData) error {
	targetUserID := cmd.UserID
	if uid, ok := cmd.Options["user"]; ok && uid != "" {
		targetUserID = uid
	}

	xp, err := hctx.GetMemberXP(ctx, targetUserID)
	if err != nil {
		embed := models.Embed{
			Description: "No XP data found for this user.",
			Color:       0xFF6B6B,
		}
		_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
		return nil
	}

	embed := models.Embed{
		Title: fmt.Sprintf("Rank Card — <@%s>", targetUserID),
		Color: 0x5865F2,
		Fields: []models.EmbedField{
			{Name: "Level", Value: strconv.Itoa(xp.Level), Inline: true},
			{Name: "XP", Value: strconv.FormatInt(xp.XP, 10), Inline: true},
		},
	}
	_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
	return nil
}

func (t *LevelingTemplate) handleLeaderboardCommand(ctx context.Context, hctx *HubContext, cmd SlashCommandData) error {
	entries, err := hctx.GetLeaderboard(ctx, 10)
	if err != nil || len(entries) == 0 {
		embed := models.Embed{
			Description: "No leaderboard data yet.",
			Color:       0xFF6B6B,
		}
		_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
		return nil
	}

	var lines []string
	for i, e := range entries {
		medal := ""
		switch i {
		case 0:
			medal = "🥇"
		case 1:
			medal = "🥈"
		case 2:
			medal = "🥉"
		default:
			medal = fmt.Sprintf("**%d.**", i+1)
		}
		lines = append(lines, fmt.Sprintf("%s <@%s> — Level %d (%d XP)", medal, e.UserID, e.Level, e.XP))
	}

	embed := models.Embed{
		Title:       "🏆 XP Leaderboard",
		Description: fmt.Sprintf("%s", joinLines(lines)),
		Color:       0xFEE75C,
	}
	_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
	return nil
}

func joinLines(lines []string) string {
	result := ""
	for i, l := range lines {
		if i > 0 {
			result += "\n"
		}
		result += l
	}
	return result
}
