package botengine

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/riftapp-cloud/riftapp/internal/models"
)

type WelcomeConfig struct {
	WelcomeStreamID string       `json:"welcome_stream_id"`
	WelcomeMessage  string       `json:"welcome_message"`
	WelcomeEmbed    *models.Embed `json:"welcome_embed,omitempty"`
	AutoRoleID      string       `json:"auto_role_id"`
	GoodbyeStreamID string       `json:"goodbye_stream_id"`
	GoodbyeMessage  string       `json:"goodbye_message"`
}

type WelcomeTemplate struct{}

func NewWelcomeTemplate() *WelcomeTemplate {
	return &WelcomeTemplate{}
}

func (t *WelcomeTemplate) Name() string { return "welcome" }

func (t *WelcomeTemplate) DefaultConfig() json.RawMessage {
	cfg := WelcomeConfig{
		WelcomeMessage: "Welcome to the server, {user}! 🎉",
		GoodbyeMessage: "{user} has left the server.",
	}
	b, _ := json.Marshal(cfg)
	return b
}

func (t *WelcomeTemplate) ValidateConfig(cfg json.RawMessage) error {
	var c WelcomeConfig
	return json.Unmarshal(cfg, &c)
}

func (t *WelcomeTemplate) OnEvent(ctx context.Context, hctx *HubContext, event Event) error {
	var cfg WelcomeConfig
	if err := json.Unmarshal(hctx.Config, &cfg); err != nil {
		return nil
	}

	switch event.Type {
	case EventMemberJoin:
		return t.handleJoin(ctx, hctx, event, cfg)
	case EventMemberLeave:
		return t.handleLeave(ctx, hctx, event, cfg)
	}
	return nil
}

func (t *WelcomeTemplate) handleJoin(ctx context.Context, hctx *HubContext, event Event, cfg WelcomeConfig) error {
	var data MemberEventData
	if err := json.Unmarshal(event.Data, &data); err != nil {
		return nil
	}

	if cfg.AutoRoleID != "" {
		_ = hctx.AssignRole(ctx, data.UserID, cfg.AutoRoleID)
	}

	if cfg.WelcomeStreamID == "" {
		return nil
	}

	memberCount, _ := hctx.GetHubMemberCount(ctx)

	vars := map[string]string{
		"{user}":         fmt.Sprintf("<@%s>", data.UserID),
		"{username}":     data.Username,
		"{hub}":          hctx.HubID,
		"{member_count}": fmt.Sprintf("%d", memberCount),
	}

	message := applyTemplateVars(cfg.WelcomeMessage, vars)

	if cfg.WelcomeEmbed != nil {
		embed := *cfg.WelcomeEmbed
		embed.Description = applyTemplateVars(embed.Description, vars)
		embed.Title = applyTemplateVars(embed.Title, vars)
		_, _ = hctx.SendMessage(ctx, cfg.WelcomeStreamID, message, []models.Embed{embed}, nil)
	} else {
		_, _ = hctx.SendMessage(ctx, cfg.WelcomeStreamID, message, nil, nil)
	}

	return nil
}

func (t *WelcomeTemplate) handleLeave(ctx context.Context, hctx *HubContext, event Event, cfg WelcomeConfig) error {
	var data MemberEventData
	if err := json.Unmarshal(event.Data, &data); err != nil {
		return nil
	}

	if cfg.GoodbyeStreamID == "" && cfg.WelcomeStreamID == "" {
		return nil
	}

	streamID := cfg.GoodbyeStreamID
	if streamID == "" {
		streamID = cfg.WelcomeStreamID
	}

	vars := map[string]string{
		"{user}":     fmt.Sprintf("<@%s>", data.UserID),
		"{username}": data.Username,
		"{hub}":      hctx.HubID,
	}

	message := applyTemplateVars(cfg.GoodbyeMessage, vars)
	_, _ = hctx.SendMessage(ctx, streamID, message, nil, nil)

	return nil
}

func applyTemplateVars(text string, vars map[string]string) string {
	for k, v := range vars {
		text = strings.ReplaceAll(text, k, v)
	}
	return text
}
