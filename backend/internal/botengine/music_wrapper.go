package botengine

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/riftapp-cloud/riftapp/internal/botengine/music"
	"github.com/riftapp-cloud/riftapp/internal/models"
)

type MusicTemplate struct {
	tmpl *music.Template
}

func NewMusicTemplate(lkURL, lkKey, lkSecret string) *MusicTemplate {
	return &MusicTemplate{
		tmpl: music.NewTemplate(lkURL, lkKey, lkSecret),
	}
}

func (t *MusicTemplate) Name() string { return "music" }

func (t *MusicTemplate) DefaultConfig() json.RawMessage {
	return t.tmpl.DefaultConfig()
}

func (t *MusicTemplate) ValidateConfig(cfg json.RawMessage) error {
	return t.tmpl.ValidateConfig(cfg)
}

func (t *MusicTemplate) OnEvent(ctx context.Context, hctx *HubContext, event Event) error {
	switch event.Type {
	case EventSlashCommand:
		var cmd SlashCommandData
		if err := json.Unmarshal(event.Data, &cmd); err != nil {
			return nil
		}
		musicCmds := []string{"play", "pause", "skip", "stop", "queue", "volume", "nowplaying", "loop", "shuffle"}
		found := false
		for _, c := range musicCmds {
			if cmd.CommandName == c {
				found = true
				break
			}
		}
		if !found {
			return nil
		}
		t.tmpl.SetHubConfig(hctx.HubID, hctx.Config)
		return t.tmpl.HandleCommand(ctx, &musicHubContextAdapter{hctx: hctx}, hctx.HubID, music.SlashCommandData{
			CommandName: cmd.CommandName,
			Options:     cmd.Options,
			StreamID:    cmd.StreamID,
			UserID:      cmd.UserID,
		})
	case EventComponentClick:
		var click ComponentClickData
		if err := json.Unmarshal(event.Data, &click); err != nil {
			return nil
		}
		if !strings.HasPrefix(click.CustomID, "music:") {
			return nil
		}
		t.tmpl.SetHubConfig(hctx.HubID, hctx.Config)
		cmdName := strings.TrimPrefix(click.CustomID, "music:")
		return t.tmpl.HandleCommand(ctx, &musicHubContextAdapter{hctx: hctx}, hctx.HubID, music.SlashCommandData{
			CommandName: cmdName,
			StreamID:    click.StreamID,
			UserID:      click.UserID,
		})
	}
	return nil
}

type musicHubContextAdapter struct {
	hctx *HubContext
}

func (a *musicHubContextAdapter) SendMessage(ctx context.Context, streamID, content string, embeds []models.Embed, components []models.Component) (*models.Message, error) {
	return a.hctx.SendMessage(ctx, streamID, content, embeds, components)
}

func (a *musicHubContextAdapter) SendEmbed(ctx context.Context, streamID string, embed models.Embed) (*models.Message, error) {
	return a.hctx.SendEmbed(ctx, streamID, embed)
}
