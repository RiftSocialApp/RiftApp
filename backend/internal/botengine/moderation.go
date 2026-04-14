package botengine

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/riftapp-cloud/riftapp/internal/models"
)

type ModerationConfig struct {
	LogStreamID      string   `json:"log_stream_id"`
	AutoDeleteFlagged bool    `json:"auto_delete_flagged"`
	WarnThreshold    int      `json:"warn_threshold"`
	BanOnThreshold   bool     `json:"ban_on_threshold"`
	WordBlacklist    []string `json:"word_blacklist"`
	SpamDetection    bool     `json:"spam_detection"`
	MaxMentions      int      `json:"max_mentions"`
	MaxMessagesPer10s int     `json:"max_messages_per_10s"`
	AntiRaid         struct {
		Enabled        bool `json:"enabled"`
		JoinThreshold  int  `json:"join_threshold"`
		WindowSeconds  int  `json:"window_seconds"`
	} `json:"anti_raid"`
}

type ModerationTemplate struct {
	mu            sync.RWMutex
	warnings      map[string]map[string]int    // hubID -> userID -> warning count
	spamTracker   map[string]map[string][]time.Time // hubID -> userID -> message timestamps
	raidTracker   map[string][]time.Time        // hubID -> join timestamps
}

func NewModerationTemplate() *ModerationTemplate {
	return &ModerationTemplate{
		warnings:    make(map[string]map[string]int),
		spamTracker: make(map[string]map[string][]time.Time),
		raidTracker: make(map[string][]time.Time),
	}
}

func (t *ModerationTemplate) Name() string { return "moderation" }

func (t *ModerationTemplate) DefaultConfig() json.RawMessage {
	cfg := ModerationConfig{
		AutoDeleteFlagged: true,
		WarnThreshold:     3,
		BanOnThreshold:    true,
		SpamDetection:     true,
		MaxMentions:       10,
		MaxMessagesPer10s: 5,
	}
	cfg.AntiRaid.Enabled = false
	cfg.AntiRaid.JoinThreshold = 10
	cfg.AntiRaid.WindowSeconds = 60
	b, _ := json.Marshal(cfg)
	return b
}

func (t *ModerationTemplate) ValidateConfig(cfg json.RawMessage) error {
	var c ModerationConfig
	return json.Unmarshal(cfg, &c)
}

func (t *ModerationTemplate) OnEvent(ctx context.Context, hctx *HubContext, event Event) error {
	var cfg ModerationConfig
	if err := json.Unmarshal(hctx.Config, &cfg); err != nil {
		cfg = ModerationConfig{
			AutoDeleteFlagged: true,
			WarnThreshold:     3,
			BanOnThreshold:    true,
			SpamDetection:     true,
			MaxMentions:       10,
			MaxMessagesPer10s: 5,
		}
	}

	switch event.Type {
	case EventMessageCreate:
		return t.handleMessage(ctx, hctx, event, cfg)
	case EventMemberJoin:
		return t.handleMemberJoin(ctx, hctx, event, cfg)
	}
	return nil
}

func (t *ModerationTemplate) handleMessage(ctx context.Context, hctx *HubContext, event Event, cfg ModerationConfig) error {
	var msg MessageEventData
	if err := json.Unmarshal(event.Data, &msg); err != nil {
		return nil
	}

	if msg.AuthorID == hctx.BotUserID {
		return nil
	}

	var violations []string

	if len(cfg.WordBlacklist) > 0 {
		lower := strings.ToLower(msg.Content)
		for _, word := range cfg.WordBlacklist {
			if strings.Contains(lower, strings.ToLower(word)) {
				violations = append(violations, fmt.Sprintf("blacklisted word: `%s`", word))
				break
			}
		}
	}

	if cfg.MaxMentions > 0 {
		mentionCount := strings.Count(msg.Content, "@")
		if mentionCount > cfg.MaxMentions {
			violations = append(violations, fmt.Sprintf("too many mentions (%d)", mentionCount))
		}
	}

	if cfg.SpamDetection && cfg.MaxMessagesPer10s > 0 {
		if t.isSpamming(hctx.HubID, msg.AuthorID, cfg.MaxMessagesPer10s) {
			violations = append(violations, "spam detected")
		}
	}

	if len(violations) == 0 {
		return nil
	}

	if cfg.AutoDeleteFlagged {
		_ = hctx.DeleteMessage(ctx, msg.MessageID)
	}

	warningCount := t.addWarning(hctx.HubID, msg.AuthorID)

	warnEmbed := models.Embed{
		Title:       "Message Flagged",
		Description: fmt.Sprintf("**Reason:** %s\n**User:** <@%s>\n**Warnings:** %d/%d", strings.Join(violations, ", "), msg.AuthorID, warningCount, cfg.WarnThreshold),
		Color:       0xFF6B35,
	}

	if cfg.LogStreamID != "" {
		_, _ = hctx.SendEmbed(ctx, cfg.LogStreamID, warnEmbed)
	}

	if cfg.BanOnThreshold && cfg.WarnThreshold > 0 && warningCount >= cfg.WarnThreshold {
		_ = hctx.BanMember(ctx, msg.AuthorID, fmt.Sprintf("auto-ban: reached %d warnings", warningCount))

		banEmbed := models.Embed{
			Title:       "Member Auto-Banned",
			Description: fmt.Sprintf("<@%s> was automatically banned after reaching %d warnings.", msg.AuthorID, warningCount),
			Color:       0xFF0000,
		}
		if cfg.LogStreamID != "" {
			_, _ = hctx.SendEmbed(ctx, cfg.LogStreamID, banEmbed)
		}

		t.mu.Lock()
		if hubWarnings, ok := t.warnings[hctx.HubID]; ok {
			delete(hubWarnings, msg.AuthorID)
		}
		t.mu.Unlock()
	}

	return nil
}

func (t *ModerationTemplate) handleMemberJoin(ctx context.Context, hctx *HubContext, event Event, cfg ModerationConfig) error {
	if !cfg.AntiRaid.Enabled || cfg.AntiRaid.JoinThreshold <= 0 {
		return nil
	}

	t.mu.Lock()
	now := time.Now()
	window := time.Duration(cfg.AntiRaid.WindowSeconds) * time.Second
	if window == 0 {
		window = 60 * time.Second
	}

	joins := t.raidTracker[hctx.HubID]
	cutoff := now.Add(-window)
	filtered := make([]time.Time, 0, len(joins))
	for _, j := range joins {
		if j.After(cutoff) {
			filtered = append(filtered, j)
		}
	}
	filtered = append(filtered, now)
	t.raidTracker[hctx.HubID] = filtered
	count := len(filtered)
	t.mu.Unlock()

	if count >= cfg.AntiRaid.JoinThreshold {
		alertEmbed := models.Embed{
			Title:       "Anti-Raid Alert",
			Description: fmt.Sprintf("**%d members** joined within %d seconds. Possible raid detected!", count, cfg.AntiRaid.WindowSeconds),
			Color:       0xFF0000,
		}
		if cfg.LogStreamID != "" {
			_, _ = hctx.SendEmbed(ctx, cfg.LogStreamID, alertEmbed)
		}
	}

	return nil
}

func (t *ModerationTemplate) isSpamming(hubID, userID string, maxPer10s int) bool {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.spamTracker[hubID] == nil {
		t.spamTracker[hubID] = make(map[string][]time.Time)
	}

	now := time.Now()
	cutoff := now.Add(-10 * time.Second)
	timestamps := t.spamTracker[hubID][userID]

	filtered := make([]time.Time, 0, len(timestamps))
	for _, ts := range timestamps {
		if ts.After(cutoff) {
			filtered = append(filtered, ts)
		}
	}
	filtered = append(filtered, now)
	t.spamTracker[hubID][userID] = filtered

	return len(filtered) > maxPer10s
}

func (t *ModerationTemplate) addWarning(hubID, userID string) int {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.warnings[hubID] == nil {
		t.warnings[hubID] = make(map[string]int)
	}
	t.warnings[hubID][userID]++
	return t.warnings[hubID][userID]
}
