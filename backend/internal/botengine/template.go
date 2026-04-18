package botengine

import (
	"context"
	"encoding/json"
)

type EventType string

const (
	EventMessageCreate EventType = "message_create"
	EventMemberJoin    EventType = "member_join"
	EventMemberLeave   EventType = "member_leave"
	EventSlashCommand  EventType = "slash_command"
	EventComponentClick EventType = "component_click"
)

type Event struct {
	Type     EventType
	HubID    string
	StreamID string
	UserID   string
	Data     json.RawMessage
}

type MessageEventData struct {
	MessageID string `json:"message_id"`
	AuthorID  string `json:"author_id"`
	Content   string `json:"content"`
	StreamID  string `json:"stream_id"`
}

type MemberEventData struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
}

type SlashCommandData struct {
	CommandName string            `json:"command_name"`
	Options     map[string]string `json:"options"`
	StreamID    string            `json:"stream_id"`
	UserID      string            `json:"user_id"`
}

type ComponentClickData struct {
	MessageID string   `json:"message_id"`
	CustomID  string   `json:"custom_id"`
	Values    []string `json:"values"`
	UserID    string   `json:"user_id"`
	StreamID  string   `json:"stream_id"`
}

type BotTemplate interface {
	Name() string
	OnEvent(ctx context.Context, hctx *HubContext, event Event) error
	DefaultConfig() json.RawMessage
	ValidateConfig(cfg json.RawMessage) error
}
