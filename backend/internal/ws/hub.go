package ws

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Hub struct {
	clients    map[string]map[string]*Client // userID -> sessionID -> client
	streamSubs map[string]map[string]*Client // streamID -> sessionKey -> client
	register   chan *Client
	unregister chan *Client
	broadcast  chan *BroadcastMessage
	mu         sync.RWMutex
	db         *pgxpool.Pool
}

type BroadcastMessage struct {
	StreamID string
	Data     []byte
	Exclude  string
}

func NewHub(db *pgxpool.Pool) *Hub {
	return &Hub{
		clients:    make(map[string]map[string]*Client),
		streamSubs: make(map[string]map[string]*Client),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *BroadcastMessage, 256),
		db:         db,
	}
}

func GenerateSessionID() string {
	return uuid.New().String()
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.clients[client.userID] == nil {
				h.clients[client.userID] = make(map[string]*Client)
			}
			h.clients[client.userID][client.sessionID] = client
			sessionCount := len(h.clients[client.userID])
			h.mu.Unlock()
			log.Printf("ws: client connected user=%s session=%s (sessions=%d)", client.userID, client.sessionID, sessionCount)

			client.Send(NewEvent(OpReady, nil))

			if sessionCount == 1 {
				go h.setPresence(client.userID, 1)
			}

		case client := <-h.unregister:
			h.mu.Lock()
			sessions, ok := h.clients[client.userID]
			if ok {
				if existing, found := sessions[client.sessionID]; found && existing == client {
					close(client.send)
					delete(sessions, client.sessionID)
					if len(sessions) == 0 {
						delete(h.clients, client.userID)
					}

					for _, streamID := range client.GetSubscribedStreams() {
						sessionKey := client.userID + ":" + client.sessionID
						if subs, ok := h.streamSubs[streamID]; ok {
							delete(subs, sessionKey)
							if len(subs) == 0 {
								delete(h.streamSubs, streamID)
							}
						}
					}
				}
			}
			remainingSessions := len(h.clients[client.userID])
			h.mu.Unlock()

			for _, streamID := range client.GetSubscribedStreams() {
				h.BroadcastToStream(streamID, NewEvent(OpTypingStop, TypingStopData{
					UserID:   client.userID,
					StreamID: streamID,
				}), "")
			}

			log.Printf("ws: client disconnected user=%s session=%s", client.userID, client.sessionID)

			if remainingSessions == 0 {
				go h.setPresence(client.userID, 0)
			}

		case msg := <-h.broadcast:
			h.mu.RLock()
			seen := make(map[string]bool)
			for _, client := range h.streamSubs[msg.StreamID] {
				if client.userID != msg.Exclude && !seen[client.userID+":"+client.sessionID] {
					seen[client.userID+":"+client.sessionID] = true
					client.Send(msg.Data)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) setPresence(userID string, status int) {
	if h.db == nil {
		return
	}
	ctx := context.Background()

	if status == 0 {
		_, _ = h.db.Exec(ctx,
			`UPDATE users SET status = 0, last_seen = now(), updated_at = now() WHERE id = $1`, userID)
	} else {
		_, _ = h.db.Exec(ctx,
			`UPDATE users SET status = $2, updated_at = now() WHERE id = $1`, userID, status)
	}

	rows, err := h.db.Query(ctx,
		`SELECT DISTINCT hm2.user_id
		 FROM hub_members hm1
		 JOIN hub_members hm2 ON hm1.hub_id = hm2.hub_id
		WHERE hm1.user_id = $1 AND hm2.user_id != $1`, userID)
	if err != nil {
		return
	}
	defer rows.Close()

	evt := NewEvent(OpPresenceUpdate, PresenceData{
		UserID: userID,
		Status: status,
	})

	h.mu.RLock()
	for rows.Next() {
		var coMemberID string
		if err := rows.Scan(&coMemberID); err != nil {
			continue
		}
		if sessions, ok := h.clients[coMemberID]; ok {
			for _, client := range sessions {
				client.Send(evt)
			}
		}
	}
	h.mu.RUnlock()
}

func (h *Hub) Register(client *Client) {
	h.register <- client
}

func (h *Hub) BroadcastToStream(streamID string, data []byte, excludeUserID string) {
	h.broadcast <- &BroadcastMessage{
		StreamID: streamID,
		Data:     data,
		Exclude:  excludeUserID,
	}
}

func (h *Hub) SendToUser(userID string, data []byte) {
	h.mu.RLock()
	if sessions, ok := h.clients[userID]; ok {
		for _, client := range sessions {
			client.Send(data)
		}
	}
	h.mu.RUnlock()
}

func (h *Hub) handleClientEvent(c *Client, evt *Event) {
	switch evt.Op {
	case OpHeartbeat:
		c.Send(NewEvent(OpHeartbeatAck, nil))

	case OpSubscribe:
		var data SubscribeData
		if err := json.Unmarshal(evt.Data, &data); err != nil || data.StreamID == "" {
			return
		}
		c.Subscribe(data.StreamID)
		sessionKey := c.userID + ":" + c.sessionID
		h.mu.Lock()
		if h.streamSubs[data.StreamID] == nil {
			h.streamSubs[data.StreamID] = make(map[string]*Client)
		}
		h.streamSubs[data.StreamID][sessionKey] = c
		h.mu.Unlock()

	case OpUnsubscribe:
		var data SubscribeData
		if err := json.Unmarshal(evt.Data, &data); err != nil || data.StreamID == "" {
			return
		}
		c.Unsubscribe(data.StreamID)
		sessionKey := c.userID + ":" + c.sessionID
		h.mu.Lock()
		if subs, ok := h.streamSubs[data.StreamID]; ok {
			delete(subs, sessionKey)
			if len(subs) == 0 {
				delete(h.streamSubs, data.StreamID)
			}
		}
		h.mu.Unlock()

	case OpTyping:
		var data TypingData
		if err := json.Unmarshal(evt.Data, &data); err != nil || data.StreamID == "" {
			return
		}
		h.BroadcastToStream(data.StreamID, NewEvent(OpTypingStart, TypingStartData{
			UserID:   c.userID,
			StreamID: data.StreamID,
		}), c.userID)

	case OpTypingStop:
		var data TypingData
		if err := json.Unmarshal(evt.Data, &data); err != nil || data.StreamID == "" {
			return
		}
		h.BroadcastToStream(data.StreamID, NewEvent(OpTypingStop, TypingStopData{
			UserID:   c.userID,
			StreamID: data.StreamID,
		}), c.userID)

	case OpSetStatus:
		var data SetStatusData
		if err := json.Unmarshal(evt.Data, &data); err != nil {
			return
		}
		if data.Status < 1 || data.Status > 3 {
			return
		}
		go h.setPresence(c.userID, data.Status)
	}
}

func (h *Hub) IsOnline(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	sessions, ok := h.clients[userID]
	return ok && len(sessions) > 0
}
