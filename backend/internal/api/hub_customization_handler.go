package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/riftapp-cloud/riftapp/internal/middleware"
	"github.com/riftapp-cloud/riftapp/internal/service"
)

type HubCustomizationHandler struct {
	svc *service.HubCustomizationService
}

func NewHubCustomizationHandler(svc *service.HubCustomizationService) *HubCustomizationHandler {
	return &HubCustomizationHandler{svc: svc}
}

// ── Emojis ──

func (h *HubCustomizationHandler) ListEmojis(w http.ResponseWriter, r *http.Request) {
	hubID := chi.URLParam(r, "hubID")
	userID := middleware.GetUserID(r.Context())
	items, err := h.svc.ListEmojis(r.Context(), hubID, userID)
	if err != nil {
		writeAppError(w, err)
		return
	}
	writeData(w, http.StatusOK, items)
}

func (h *HubCustomizationHandler) CreateEmoji(w http.ResponseWriter, r *http.Request) {
	hubID := chi.URLParam(r, "hubID")
	userID := middleware.GetUserID(r.Context())
	var body struct {
		Name    string `json:"name"`
		FileURL string `json:"file_url"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	item, err := h.svc.CreateEmoji(r.Context(), hubID, userID, body.Name, body.FileURL)
	if err != nil {
		writeAppError(w, err)
		return
	}
	writeData(w, http.StatusCreated, item)
}

func (h *HubCustomizationHandler) DeleteEmoji(w http.ResponseWriter, r *http.Request) {
	hubID := chi.URLParam(r, "hubID")
	emojiID := chi.URLParam(r, "emojiID")
	userID := middleware.GetUserID(r.Context())
	if err := h.svc.DeleteEmoji(r.Context(), hubID, userID, emojiID); err != nil {
		writeAppError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Stickers ──

func (h *HubCustomizationHandler) ListStickers(w http.ResponseWriter, r *http.Request) {
	hubID := chi.URLParam(r, "hubID")
	userID := middleware.GetUserID(r.Context())
	items, err := h.svc.ListStickers(r.Context(), hubID, userID)
	if err != nil {
		writeAppError(w, err)
		return
	}
	writeData(w, http.StatusOK, items)
}

func (h *HubCustomizationHandler) CreateSticker(w http.ResponseWriter, r *http.Request) {
	hubID := chi.URLParam(r, "hubID")
	userID := middleware.GetUserID(r.Context())
	var body struct {
		Name    string `json:"name"`
		FileURL string `json:"file_url"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	item, err := h.svc.CreateSticker(r.Context(), hubID, userID, body.Name, body.FileURL)
	if err != nil {
		writeAppError(w, err)
		return
	}
	writeData(w, http.StatusCreated, item)
}

func (h *HubCustomizationHandler) DeleteSticker(w http.ResponseWriter, r *http.Request) {
	hubID := chi.URLParam(r, "hubID")
	stickerID := chi.URLParam(r, "stickerID")
	userID := middleware.GetUserID(r.Context())
	if err := h.svc.DeleteSticker(r.Context(), hubID, userID, stickerID); err != nil {
		writeAppError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Sounds ──

func (h *HubCustomizationHandler) ListSounds(w http.ResponseWriter, r *http.Request) {
	hubID := chi.URLParam(r, "hubID")
	userID := middleware.GetUserID(r.Context())
	items, err := h.svc.ListSounds(r.Context(), hubID, userID)
	if err != nil {
		writeAppError(w, err)
		return
	}
	writeData(w, http.StatusOK, items)
}

func (h *HubCustomizationHandler) CreateSound(w http.ResponseWriter, r *http.Request) {
	hubID := chi.URLParam(r, "hubID")
	userID := middleware.GetUserID(r.Context())
	var body struct {
		Name    string `json:"name"`
		FileURL string `json:"file_url"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	item, err := h.svc.CreateSound(r.Context(), hubID, userID, body.Name, body.FileURL)
	if err != nil {
		writeAppError(w, err)
		return
	}
	writeData(w, http.StatusCreated, item)
}

func (h *HubCustomizationHandler) DeleteSound(w http.ResponseWriter, r *http.Request) {
	hubID := chi.URLParam(r, "hubID")
	soundID := chi.URLParam(r, "soundID")
	userID := middleware.GetUserID(r.Context())
	if err := h.svc.DeleteSound(r.Context(), hubID, userID, soundID); err != nil {
		writeAppError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
