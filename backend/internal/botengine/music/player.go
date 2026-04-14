package music

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/riftapp-cloud/riftapp/internal/models"
)

type Config struct {
	DefaultVolume  int      `json:"default_volume"`
	MaxQueueSize   int      `json:"max_queue_size"`
	AllowedStreams []string `json:"allowed_streams"`
	DJRoleID       string   `json:"dj_role_id"`
}

type Track struct {
	Title     string `json:"title"`
	URL       string `json:"url"`
	Duration  string `json:"duration"`
	Requester string `json:"requester"`
}

type Player struct {
	mu       sync.Mutex
	queue    []Track
	current  *Track
	playing  bool
	volume   int
	looping  bool
	shuffle  bool
}

type HubContext interface {
	SendMessage(ctx context.Context, streamID, content string, embeds []models.Embed, components []models.Component) (*models.Message, error)
	SendEmbed(ctx context.Context, streamID string, embed models.Embed) (*models.Message, error)
}

type Template struct {
	mu      sync.RWMutex
	players map[string]*Player // hubID -> player
}

func NewTemplate() *Template {
	return &Template{
		players: make(map[string]*Player),
	}
}

func (t *Template) Name() string { return "music" }

func (t *Template) DefaultConfig() json.RawMessage {
	cfg := Config{DefaultVolume: 80, MaxQueueSize: 100}
	b, _ := json.Marshal(cfg)
	return b
}

func (t *Template) ValidateConfig(cfg json.RawMessage) error {
	var c Config
	return json.Unmarshal(cfg, &c)
}

type SlashCommandData struct {
	CommandName string            `json:"command_name"`
	Options     map[string]string `json:"options"`
	StreamID    string            `json:"stream_id"`
	UserID      string            `json:"user_id"`
}

type BotEvent struct {
	Type     string
	HubID    string
	StreamID string
	UserID   string
	Data     json.RawMessage
}

func (t *Template) HandleCommand(ctx context.Context, hctx HubContext, hubID string, cmd SlashCommandData) error {
	switch cmd.CommandName {
	case "play":
		return t.handlePlay(ctx, hctx, hubID, cmd)
	case "pause":
		return t.handlePause(ctx, hctx, hubID, cmd)
	case "skip":
		return t.handleSkip(ctx, hctx, hubID, cmd)
	case "stop":
		return t.handleStop(ctx, hctx, hubID, cmd)
	case "queue":
		return t.handleQueue(ctx, hctx, hubID, cmd)
	case "volume":
		return t.handleVolume(ctx, hctx, hubID, cmd)
	case "nowplaying":
		return t.handleNowPlaying(ctx, hctx, hubID, cmd)
	case "loop":
		return t.handleLoop(ctx, hctx, hubID, cmd)
	case "shuffle":
		return t.handleShuffle(ctx, hctx, hubID, cmd)
	}
	return nil
}

func (t *Template) getOrCreatePlayer(hubID string, volume int) *Player {
	t.mu.Lock()
	defer t.mu.Unlock()
	if p, ok := t.players[hubID]; ok {
		return p
	}
	p := &Player{volume: volume}
	t.players[hubID] = p
	return p
}

func (t *Template) handlePlay(ctx context.Context, hctx HubContext, hubID string, cmd SlashCommandData) error {
	query := cmd.Options["query"]
	if query == "" {
		_, _ = hctx.SendMessage(ctx, cmd.StreamID, "Please provide a song name or URL.", nil, nil)
		return nil
	}

	player := t.getOrCreatePlayer(hubID, 80)
	player.mu.Lock()
	defer player.mu.Unlock()

	track := Track{
		Title:     query,
		URL:       query,
		Duration:  "Unknown",
		Requester: cmd.UserID,
	}

	if player.current == nil {
		player.current = &track
		player.playing = true

		embed := models.Embed{
			Title:       "🎵 Now Playing",
			Description: fmt.Sprintf("**%s**\nRequested by <@%s>", track.Title, track.Requester),
			Color:       0x9B59B6,
		}

		components := []models.Component{
			{
				Type: models.ComponentTypeActionRow,
				Components: []models.Component{
					{Type: models.ComponentTypeButton, Style: models.ButtonStyleSecondary, Label: "⏸ Pause", CustomID: "music:pause"},
					{Type: models.ComponentTypeButton, Style: models.ButtonStylePrimary, Label: "⏭ Skip", CustomID: "music:skip"},
					{Type: models.ComponentTypeButton, Style: models.ButtonStyleDanger, Label: "⏹ Stop", CustomID: "music:stop"},
					{Type: models.ComponentTypeButton, Style: models.ButtonStyleSecondary, Label: "📋 Queue", CustomID: "music:queue"},
				},
			},
		}

		_, _ = hctx.SendMessage(ctx, cmd.StreamID, "", []models.Embed{embed}, components)
	} else {
		player.queue = append(player.queue, track)
		position := len(player.queue)

		embed := models.Embed{
			Title:       "Added to Queue",
			Description: fmt.Sprintf("**%s**\nPosition: #%d\nRequested by <@%s>", track.Title, position, track.Requester),
			Color:       0x3498DB,
		}
		_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
	}

	return nil
}

func (t *Template) handlePause(ctx context.Context, hctx HubContext, hubID string, cmd SlashCommandData) error {
	t.mu.RLock()
	player, ok := t.players[hubID]
	t.mu.RUnlock()
	if !ok || player.current == nil {
		_, _ = hctx.SendMessage(ctx, cmd.StreamID, "Nothing is playing right now.", nil, nil)
		return nil
	}

	player.mu.Lock()
	player.playing = !player.playing
	state := "Paused ⏸"
	if player.playing {
		state = "Resumed ▶"
	}
	player.mu.Unlock()

	embed := models.Embed{
		Description: fmt.Sprintf("**%s** — %s", player.current.Title, state),
		Color:       0xF39C12,
	}
	_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
	return nil
}

func (t *Template) handleSkip(ctx context.Context, hctx HubContext, hubID string, cmd SlashCommandData) error {
	t.mu.RLock()
	player, ok := t.players[hubID]
	t.mu.RUnlock()
	if !ok || player.current == nil {
		_, _ = hctx.SendMessage(ctx, cmd.StreamID, "Nothing to skip.", nil, nil)
		return nil
	}

	player.mu.Lock()
	skipped := player.current.Title
	if len(player.queue) > 0 {
		next := player.queue[0]
		player.queue = player.queue[1:]
		player.current = &next
		player.playing = true
	} else {
		player.current = nil
		player.playing = false
	}
	player.mu.Unlock()

	desc := fmt.Sprintf("Skipped **%s**", skipped)
	if player.current != nil {
		desc += fmt.Sprintf("\nNow playing: **%s**", player.current.Title)
	}

	embed := models.Embed{
		Title:       "⏭ Skipped",
		Description: desc,
		Color:       0x2ECC71,
	}
	_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
	return nil
}

func (t *Template) handleStop(ctx context.Context, hctx HubContext, hubID string, cmd SlashCommandData) error {
	t.mu.Lock()
	delete(t.players, hubID)
	t.mu.Unlock()

	embed := models.Embed{
		Description: "⏹ Stopped playback and cleared the queue.",
		Color:       0xE74C3C,
	}
	_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
	return nil
}

func (t *Template) handleQueue(ctx context.Context, hctx HubContext, hubID string, cmd SlashCommandData) error {
	t.mu.RLock()
	player, ok := t.players[hubID]
	t.mu.RUnlock()
	if !ok || player.current == nil {
		_, _ = hctx.SendMessage(ctx, cmd.StreamID, "The queue is empty.", nil, nil)
		return nil
	}

	player.mu.Lock()
	desc := fmt.Sprintf("**Now Playing:** %s\n", player.current.Title)
	if len(player.queue) == 0 {
		desc += "\nNo tracks in queue."
	} else {
		for i, track := range player.queue {
			if i >= 10 {
				desc += fmt.Sprintf("\n...and %d more", len(player.queue)-10)
				break
			}
			desc += fmt.Sprintf("\n`%d.` %s — Requested by <@%s>", i+1, track.Title, track.Requester)
		}
	}
	player.mu.Unlock()

	embed := models.Embed{
		Title:       "📋 Queue",
		Description: desc,
		Color:       0x3498DB,
	}
	_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
	return nil
}

func (t *Template) handleVolume(ctx context.Context, hctx HubContext, hubID string, cmd SlashCommandData) error {
	player := t.getOrCreatePlayer(hubID, 80)

	volStr := cmd.Options["level"]
	if volStr == "" {
		embed := models.Embed{
			Description: fmt.Sprintf("🔊 Current volume: **%d%%**", player.volume),
			Color:       0x9B59B6,
		}
		_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
		return nil
	}

	vol := 0
	if _, err := fmt.Sscanf(volStr, "%d", &vol); err != nil || vol < 0 || vol > 100 {
		_, _ = hctx.SendMessage(ctx, cmd.StreamID, "Volume must be between 0 and 100.", nil, nil)
		return nil
	}

	player.mu.Lock()
	player.volume = vol
	player.mu.Unlock()

	embed := models.Embed{
		Description: fmt.Sprintf("🔊 Volume set to **%d%%**", vol),
		Color:       0x9B59B6,
	}
	_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
	return nil
}

func (t *Template) handleNowPlaying(ctx context.Context, hctx HubContext, hubID string, cmd SlashCommandData) error {
	t.mu.RLock()
	player, ok := t.players[hubID]
	t.mu.RUnlock()
	if !ok || player.current == nil {
		_, _ = hctx.SendMessage(ctx, cmd.StreamID, "Nothing is playing right now.", nil, nil)
		return nil
	}

	player.mu.Lock()
	track := *player.current
	player.mu.Unlock()

	embed := models.Embed{
		Title:       "🎵 Now Playing",
		Description: fmt.Sprintf("**%s**\nDuration: %s\nRequested by <@%s>\nVolume: %d%%", track.Title, track.Duration, track.Requester, player.volume),
		Color:       0x9B59B6,
		Footer:      &models.EmbedFooter{Text: time.Now().Format("3:04 PM")},
	}
	_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
	return nil
}

func (t *Template) handleLoop(ctx context.Context, hctx HubContext, hubID string, cmd SlashCommandData) error {
	player := t.getOrCreatePlayer(hubID, 80)
	player.mu.Lock()
	player.looping = !player.looping
	state := "disabled"
	if player.looping {
		state = "enabled"
	}
	player.mu.Unlock()

	embed := models.Embed{
		Description: fmt.Sprintf("🔁 Loop %s", state),
		Color:       0x9B59B6,
	}
	_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
	return nil
}

func (t *Template) handleShuffle(ctx context.Context, hctx HubContext, hubID string, cmd SlashCommandData) error {
	player := t.getOrCreatePlayer(hubID, 80)
	player.mu.Lock()
	player.shuffle = !player.shuffle
	state := "disabled"
	if player.shuffle {
		state = "enabled"
	}
	player.mu.Unlock()

	embed := models.Embed{
		Description: fmt.Sprintf("🔀 Shuffle %s", state),
		Color:       0x9B59B6,
	}
	_, _ = hctx.SendEmbed(ctx, cmd.StreamID, embed)
	return nil
}
