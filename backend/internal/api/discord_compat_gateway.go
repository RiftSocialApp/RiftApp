package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/riftapp-cloud/riftapp/internal/repository"
	"github.com/riftapp-cloud/riftapp/internal/service"
)

const (
	GatewayOpDispatch        = 0
	GatewayOpHeartbeat       = 1
	GatewayOpIdentify        = 2
	GatewayOpStatusUpdate    = 3
	GatewayOpVoiceStateUpdate = 4
	GatewayOpResume          = 6
	GatewayOpReconnect       = 7
	GatewayOpRequestGuildMembers = 8
	GatewayOpInvalidSession  = 9
	GatewayOpHello           = 10
	GatewayOpHeartbeatAck    = 11
)

type GatewayMessage struct {
	Op int              `json:"op"`
	D  json.RawMessage  `json:"d,omitempty"`
	S  *int             `json:"s,omitempty"`
	T  *string          `json:"t,omitempty"`
}

type IdentifyPayload struct {
	Token      string `json:"token"`
	Intents    int    `json:"intents"`
	Properties struct {
		OS      string `json:"os"`
		Browser string `json:"browser"`
		Device  string `json:"device"`
	} `json:"properties"`
}

type DiscordGatewayHandler struct {
	devSvc    *service.DeveloperService
	devRepo   *repository.DeveloperRepo
	hubRepo   *repository.HubRepo
	streamRepo *repository.StreamRepo
	rankRepo  *repository.RankRepo
	upgrader  websocket.Upgrader
}

func NewDiscordGatewayHandler(
	devSvc *service.DeveloperService,
	devRepo *repository.DeveloperRepo,
	hubRepo *repository.HubRepo,
	streamRepo *repository.StreamRepo,
	rankRepo *repository.RankRepo,
	origins []string,
) *DiscordGatewayHandler {
	return &DiscordGatewayHandler{
		devSvc:     devSvc,
		devRepo:    devRepo,
		hubRepo:    hubRepo,
		streamRepo: streamRepo,
		rankRepo:   rankRepo,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *DiscordGatewayHandler) Handle(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("gateway upgrade error: %v", err)
		return
	}
	defer conn.Close()

	sessionID := uuid.New().String()
	var seq int64
	var writeMu sync.Mutex

	send := func(op int, d interface{}, eventName string) {
		writeMu.Lock()
		defer writeMu.Unlock()
		msg := GatewayMessage{Op: op}
		if d != nil {
			raw, _ := json.Marshal(d)
			msg.D = raw
		}
		if eventName != "" {
			msg.T = &eventName
			s := int(atomic.AddInt64(&seq, 1))
			msg.S = &s
		}
		conn.WriteJSON(msg)
	}

	heartbeatInterval := 41250
	send(GatewayOpHello, map[string]interface{}{
		"heartbeat_interval": heartbeatInterval,
	}, "")

	var lastHeartbeat atomic.Int64
	lastHeartbeat.Store(time.Now().UnixMilli())

	go func() {
		for {
			time.Sleep(time.Duration(heartbeatInterval*2) * time.Millisecond)
			if time.Now().UnixMilli()-lastHeartbeat.Load() > int64(heartbeatInterval*3) {
				log.Printf("gateway: no heartbeat, closing session %s", sessionID)
				conn.Close()
				return
			}
		}
	}()

	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			break
		}
		var msg GatewayMessage
		if err := json.Unmarshal(raw, &msg); err != nil {
			continue
		}

		switch msg.Op {
		case GatewayOpHeartbeat:
			lastHeartbeat.Store(time.Now().UnixMilli())
			send(GatewayOpHeartbeatAck, nil, "")

		case GatewayOpIdentify:
			var payload IdentifyPayload
			if err := json.Unmarshal(msg.D, &payload); err != nil {
				send(GatewayOpInvalidSession, false, "")
				continue
			}
			ctx := context.Background()
			bt, err := h.devSvc.ValidateBotToken(ctx, payload.Token)
			if err != nil {
				send(GatewayOpInvalidSession, false, "")
				continue
			}
			botUser, err := h.devRepo.GetUserByID(ctx, bt.BotUserID)
			if err != nil {
				send(GatewayOpInvalidSession, false, "")
				continue
			}

			send(GatewayOpDispatch, map[string]interface{}{
				"v":          10,
				"user":       toDiscordUser(botUser),
				"guilds":     h.getUnavailableGuilds(ctx, bt.BotUserID),
				"session_id": sessionID,
				"application": map[string]interface{}{
					"id":    bt.ApplicationID,
					"flags": 0,
				},
			}, "READY")

			go h.sendGuildCreates(ctx, bt.BotUserID, send)

		case GatewayOpResume:
			send(GatewayOpDispatch, nil, "RESUMED")
		}
	}
}

func (h *DiscordGatewayHandler) getUnavailableGuilds(ctx context.Context, botUserID string) []map[string]interface{} {
	hubs, _ := h.hubRepo.ListByUser(ctx, botUserID)
	guilds := make([]map[string]interface{}, 0, len(hubs))
	for _, hub := range hubs {
		guilds = append(guilds, map[string]interface{}{
			"id":          hub.ID,
			"unavailable": true,
		})
	}
	return guilds
}

func (h *DiscordGatewayHandler) sendGuildCreates(ctx context.Context, botUserID string, send func(int, interface{}, string)) {
	hubs, err := h.hubRepo.ListByUser(ctx, botUserID)
	if err != nil {
		return
	}
	for _, hub := range hubs {
		channels := make([]map[string]interface{}, 0)
		streams, _ := h.streamRepo.ListByHub(ctx, hub.ID)
		for _, s := range streams {
			channels = append(channels, toDiscordChannel(&s))
		}

		roles := make([]map[string]interface{}, 0)
		ranks, _ := h.rankRepo.ListByHub(ctx, hub.ID)
		for _, rank := range ranks {
			roles = append(roles, toDiscordRole(&rank))
		}

		members, _ := h.hubRepo.ListMembers(ctx, hub.ID)
		discordMembers := make([]map[string]interface{}, 0, len(members))
		for _, m := range members {
			discordMembers = append(discordMembers, toDiscordMember(&m))
		}

		g := toDiscordGuild(&hub)
		g["channels"] = channels
		g["roles"] = roles
		g["members"] = discordMembers
		g["member_count"] = len(members)

		send(GatewayOpDispatch, g, "GUILD_CREATE")
	}
}
