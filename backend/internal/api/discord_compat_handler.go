package api

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/riftapp-cloud/riftapp/internal/models"
	"github.com/riftapp-cloud/riftapp/internal/repository"
	"github.com/riftapp-cloud/riftapp/internal/service"
)

type DiscordCompatDeps struct {
	DevSvc     *service.DeveloperService
	HubRepo    *repository.HubRepo
	StreamRepo *repository.StreamRepo
	MsgRepo    *repository.MessageRepo
	RankRepo   *repository.RankRepo
	DevRepo    *repository.DeveloperRepo
	BaseURL    string
}

type DiscordCompatHandler struct {
	devSvc     *service.DeveloperService
	hubRepo    *repository.HubRepo
	streamRepo *repository.StreamRepo
	msgRepo    *repository.MessageRepo
	rankRepo   *repository.RankRepo
	devRepo    *repository.DeveloperRepo
	baseURL    string
}

func NewDiscordCompatHandler(deps DiscordCompatDeps) *DiscordCompatHandler {
	return &DiscordCompatHandler{
		devSvc:     deps.DevSvc,
		hubRepo:    deps.HubRepo,
		streamRepo: deps.StreamRepo,
		msgRepo:    deps.MsgRepo,
		rankRepo:   deps.RankRepo,
		devRepo:    deps.DevRepo,
		baseURL:    deps.BaseURL,
	}
}

func (h *DiscordCompatHandler) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth == "" {
			discordError(w, 0, "401: Unauthorized", http.StatusUnauthorized)
			return
		}
		parts := strings.SplitN(auth, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bot" {
			discordError(w, 0, "401: Unauthorized", http.StatusUnauthorized)
			return
		}
		rawToken := parts[1]
		bt, err := h.devSvc.ValidateBotToken(r.Context(), rawToken)
		if err != nil {
			discordError(w, 0, "401: Unauthorized", http.StatusUnauthorized)
			return
		}
		ctx := setBotUserID(r.Context(), bt.BotUserID)
		ctx = setAppID(ctx, bt.ApplicationID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (h *DiscordCompatHandler) GetGateway(w http.ResponseWriter, r *http.Request) {
	url := h.baseURL
	if url == "" {
		url = "wss://" + r.Host
	}
	writeJSON(w, http.StatusOK, map[string]string{"url": url + "/gateway/"})
}

func (h *DiscordCompatHandler) GetGatewayBot(w http.ResponseWriter, r *http.Request) {
	url := h.baseURL
	if url == "" {
		url = "wss://" + r.Host
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"url":    url + "/gateway/",
		"shards": 1,
		"session_start_limit": map[string]interface{}{
			"total":           1000,
			"remaining":       999,
			"reset_after":     14400000,
			"max_concurrency": 1,
		},
	})
}

func (h *DiscordCompatHandler) GetApplicationMe(w http.ResponseWriter, r *http.Request) {
	appID := getAppID(r.Context())
	app, err := h.devSvc.GetApplication(r.Context(), appID)
	if err != nil {
		discordError(w, 0, "application not found", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, toDiscordApplication(app))
}

func (h *DiscordCompatHandler) GetUserMe(w http.ResponseWriter, r *http.Request) {
	botUserID := getBotUserID(r.Context())
	u, err := h.devRepo.GetUserByID(r.Context(), botUserID)
	if err != nil {
		discordError(w, 0, "user not found", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, toDiscordUser(u))
}

func (h *DiscordCompatHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	u, err := h.devRepo.GetUserByID(r.Context(), userID)
	if err != nil {
		discordError(w, 10013, "Unknown User", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, toDiscordUser(u))
}

func (h *DiscordCompatHandler) GetGuild(w http.ResponseWriter, r *http.Request) {
	guildID := chi.URLParam(r, "guildID")
	hub, err := h.hubRepo.GetByID(r.Context(), guildID)
	if err != nil {
		discordError(w, 10004, "Unknown Guild", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, toDiscordGuild(hub))
}

func (h *DiscordCompatHandler) GetGuildChannels(w http.ResponseWriter, r *http.Request) {
	guildID := chi.URLParam(r, "guildID")
	streams, err := h.streamRepo.ListByHub(r.Context(), guildID)
	if err != nil {
		discordError(w, 10004, "Unknown Guild", http.StatusNotFound)
		return
	}
	channels := make([]map[string]interface{}, 0, len(streams))
	for _, s := range streams {
		channels = append(channels, toDiscordChannel(&s))
	}
	writeJSON(w, http.StatusOK, channels)
}

func (h *DiscordCompatHandler) GetGuildMembers(w http.ResponseWriter, r *http.Request) {
	guildID := chi.URLParam(r, "guildID")
	members, err := h.hubRepo.ListMembers(r.Context(), guildID)
	if err != nil {
		discordError(w, 10004, "Unknown Guild", http.StatusNotFound)
		return
	}
	limit := 100
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 1000 {
			limit = n
		}
	}
	out := make([]map[string]interface{}, 0, len(members))
	for i, m := range members {
		if i >= limit {
			break
		}
		out = append(out, toDiscordMember(&m))
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *DiscordCompatHandler) GetGuildMember(w http.ResponseWriter, r *http.Request) {
	guildID := chi.URLParam(r, "guildID")
	userID := chi.URLParam(r, "userID")
	members, err := h.hubRepo.ListMembers(r.Context(), guildID)
	if err != nil {
		discordError(w, 10004, "Unknown Guild", http.StatusNotFound)
		return
	}
	for _, m := range members {
		if m.ID == userID {
			writeJSON(w, http.StatusOK, toDiscordMember(&m))
			return
		}
	}
	discordError(w, 10007, "Unknown Member", http.StatusNotFound)
}

func (h *DiscordCompatHandler) GetGuildRoles(w http.ResponseWriter, r *http.Request) {
	guildID := chi.URLParam(r, "guildID")
	ranks, err := h.rankRepo.ListByHub(r.Context(), guildID)
	if err != nil {
		discordError(w, 10004, "Unknown Guild", http.StatusNotFound)
		return
	}
	roles := make([]map[string]interface{}, 0, len(ranks)+1)
	// @everyone role
	roles = append(roles, map[string]interface{}{
		"id":          guildID,
		"name":        "@everyone",
		"color":       0,
		"hoist":       false,
		"position":    0,
		"permissions": strconv.FormatInt(models.PermDefault, 10),
		"managed":     false,
		"mentionable": false,
	})
	for _, rank := range ranks {
		roles = append(roles, toDiscordRole(&rank))
	}
	writeJSON(w, http.StatusOK, roles)
}

func (h *DiscordCompatHandler) GetChannel(w http.ResponseWriter, r *http.Request) {
	channelID := chi.URLParam(r, "channelID")
	stream, err := h.streamRepo.GetByID(r.Context(), channelID)
	if err != nil {
		discordError(w, 10003, "Unknown Channel", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, toDiscordChannel(stream))
}

func (h *DiscordCompatHandler) GetChannelMessages(w http.ResponseWriter, r *http.Request) {
	channelID := chi.URLParam(r, "channelID")
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}
	msgs, err := h.msgRepo.ListByStream(r.Context(), channelID, nil, limit)
	if err != nil {
		discordError(w, 10003, "Unknown Channel", http.StatusNotFound)
		return
	}
	out := make([]map[string]interface{}, 0, len(msgs))
	for i := range msgs {
		out = append(out, toDiscordMessage(&msgs[i]))
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *DiscordCompatHandler) CreateChannelMessage(w http.ResponseWriter, r *http.Request) {
	channelID := chi.URLParam(r, "channelID")
	botUserID := getBotUserID(r.Context())
	var body struct {
		Content string `json:"content"`
	}
	if err := readJSON(r, &body); err != nil || body.Content == "" {
		discordError(w, 50035, "content is required", http.StatusBadRequest)
		return
	}
	now := time.Now()
	msg := &models.Message{
		ID:        uuid.New().String(),
		StreamID:  &channelID,
		AuthorID:  botUserID,
		Content:   body.Content,
		CreatedAt: now,
	}
	if err := h.msgRepo.Create(r.Context(), msg); err != nil {
		discordError(w, 0, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, toDiscordMessage(msg))
}

func (h *DiscordCompatHandler) GetChannelMessage(w http.ResponseWriter, r *http.Request) {
	messageID := chi.URLParam(r, "messageID")
	msg, err := h.msgRepo.GetByID(r.Context(), messageID)
	if err != nil {
		discordError(w, 10008, "Unknown Message", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, toDiscordMessage(msg))
}

func (h *DiscordCompatHandler) DeleteChannelMessage(w http.ResponseWriter, r *http.Request) {
	messageID := chi.URLParam(r, "messageID")
	if err := h.msgRepo.Delete(r.Context(), messageID); err != nil {
		discordError(w, 10008, "Unknown Message", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ─── Conversion helpers ────────────────────────────────────────────────────

func toDiscordApplication(app *models.Application) map[string]interface{} {
	result := map[string]interface{}{
		"id":                      app.ID,
		"name":                    app.Name,
		"description":             app.Description,
		"icon":                    app.Icon,
		"bot_public":              app.BotPublic,
		"bot_require_code_grant":  app.BotRequireCodeGrant,
		"verify_key":              app.VerifyKey,
		"flags":                   app.Flags,
		"tags":                    app.Tags,
		"terms_of_service_url":    app.TermsOfServiceURL,
		"privacy_policy_url":      app.PrivacyPolicyURL,
		"custom_install_url":      app.CustomInstallURL,
		"interactions_endpoint_url": app.InteractionsEndpointURL,
	}
	if app.Owner != nil {
		result["owner"] = toDiscordUser(app.Owner)
	}
	return result
}

func toDiscordUser(u *models.User) map[string]interface{} {
	return map[string]interface{}{
		"id":            u.ID,
		"username":      u.Username,
		"discriminator": "0000",
		"avatar":        u.AvatarURL,
		"bot":           u.IsBot,
		"system":        false,
		"flags":         0,
		"public_flags":  0,
	}
}

func toDiscordGuild(hub *models.Hub) map[string]interface{} {
	return map[string]interface{}{
		"id":                          hub.ID,
		"name":                        hub.Name,
		"icon":                        hub.IconURL,
		"owner_id":                    hub.OwnerID,
		"permissions":                 strconv.FormatInt(models.PermDefault, 10),
		"features":                    []string{},
		"member_count":                0,
		"verification_level":          0,
		"default_message_notifications": 0,
		"explicit_content_filter":     0,
		"mfa_level":                   0,
		"premium_tier":                0,
		"preferred_locale":            "en-US",
	}
}

func toDiscordChannel(s *models.Stream) map[string]interface{} {
	chType := 0
	if s.Type == 1 {
		chType = 2
	}
	return map[string]interface{}{
		"id":        s.ID,
		"type":      chType,
		"guild_id":  s.HubID,
		"name":      s.Name,
		"position":  s.Position,
		"nsfw":      false,
		"topic":     nil,
		"bitrate":   s.Bitrate,
		"user_limit": s.UserLimit,
		"parent_id": s.CategoryID,
		"permission_overwrites": []interface{}{},
	}
}

func toDiscordMember(m *repository.MemberWithRole) map[string]interface{} {
	roles := []string{}
	if m.RankID != nil {
		roles = append(roles, *m.RankID)
	}
	return map[string]interface{}{
		"user":    toDiscordUser(&m.User),
		"nick":    nil,
		"roles":   roles,
		"joined_at": m.JoinedAt.Format("2006-01-02T15:04:05.000000+00:00"),
		"deaf":    false,
		"mute":    false,
	}
}

func toDiscordRole(rank *models.Rank) map[string]interface{} {
	color := 0
	if rank.Color != "" {
		if c, err := strconv.ParseInt(strings.TrimPrefix(rank.Color, "#"), 16, 64); err == nil {
			color = int(c)
		}
	}
	return map[string]interface{}{
		"id":          rank.ID,
		"name":        rank.Name,
		"color":       color,
		"hoist":       false,
		"position":    rank.Position,
		"permissions": strconv.FormatInt(rank.Permissions, 10),
		"managed":     false,
		"mentionable": false,
	}
}

func toDiscordMessage(msg *models.Message) map[string]interface{} {
	result := map[string]interface{}{
		"id":         msg.ID,
		"channel_id": msg.StreamID,
		"content":    msg.Content,
		"timestamp":  msg.CreatedAt.Format("2006-01-02T15:04:05.000000+00:00"),
		"tts":        false,
		"pinned":     msg.Pinned,
		"type":       0,
		"embeds":     []interface{}{},
		"attachments": []interface{}{},
		"mentions":   []interface{}{},
		"mention_roles": []string{},
		"mention_everyone": false,
	}
	if msg.Author != nil {
		result["author"] = toDiscordUser(msg.Author)
	} else {
		result["author"] = map[string]interface{}{
			"id":       msg.AuthorID,
			"username": "unknown",
		}
	}
	if msg.EditedAt != nil {
		result["edited_timestamp"] = msg.EditedAt.Format("2006-01-02T15:04:05.000000+00:00")
	} else {
		result["edited_timestamp"] = nil
	}
	return result
}

func discordError(w http.ResponseWriter, code int, msg string, status int) {
	writeJSON(w, status, map[string]interface{}{
		"code":    code,
		"message": msg,
	})
}

// mapPermissions converts RiftApp permission bits to Discord-equivalent strings.
func mapPermissions(perms int64) string {
	return fmt.Sprintf("%d", perms)
}
