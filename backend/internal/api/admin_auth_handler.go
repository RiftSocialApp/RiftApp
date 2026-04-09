package api

import (
	"errors"
	"net/http"

	"github.com/riftapp-cloud/riftapp/internal/admin"
)

type AdminAuthHandler struct {
	svc *admin.Service
}

func NewAdminAuthHandler(svc *admin.Service) *AdminAuthHandler {
	return &AdminAuthHandler{svc: svc}
}

func (h *AdminAuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.Email == "" || body.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password required")
		return
	}

	ip := r.RemoteAddr
	ua := r.UserAgent()
	result, err := h.svc.Login(r.Context(), body.Email, body.Password, ip, ua)
	if err != nil {
		if errors.Is(err, admin.ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		writeError(w, http.StatusInternalServerError, "login failed")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *AdminAuthHandler) Verify2FA(w http.ResponseWriter, r *http.Request) {
	var body struct {
		LoginToken string `json:"login_token"`
		Code       string `json:"code"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ip := r.RemoteAddr
	ua := r.UserAgent()
	result, err := h.svc.Verify2FA(r.Context(), body.LoginToken, body.Code, ip, ua)
	if err != nil {
		if errors.Is(err, admin.ErrInvalidCredentials) || errors.Is(err, admin.ErrInvalidTOTPCode) {
			writeError(w, http.StatusUnauthorized, "invalid code")
			return
		}
		writeError(w, http.StatusInternalServerError, "verification failed")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *AdminAuthHandler) SetupTOTP(w http.ResponseWriter, r *http.Request) {
	var body struct {
		LoginToken string `json:"login_token"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := h.svc.SetupTOTP(r.Context(), body.LoginToken)
	if err != nil {
		if errors.Is(err, admin.ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "invalid login token")
			return
		}
		writeError(w, http.StatusInternalServerError, "setup failed")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *AdminAuthHandler) ConfirmTOTP(w http.ResponseWriter, r *http.Request) {
	var body struct {
		LoginToken string `json:"login_token"`
		Code       string `json:"code"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ip := r.RemoteAddr
	ua := r.UserAgent()
	result, err := h.svc.ConfirmTOTP(r.Context(), body.LoginToken, body.Code, ip, ua)
	if err != nil {
		if errors.Is(err, admin.ErrInvalidCredentials) || errors.Is(err, admin.ErrInvalidTOTPCode) {
			writeError(w, http.StatusUnauthorized, "invalid code")
			return
		}
		writeError(w, http.StatusInternalServerError, "confirmation failed")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *AdminAuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	claims := admin.GetAdminClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	header := r.Header.Get("Authorization")
	token := ""
	if len(header) > 7 {
		token = header[7:]
	}
	if token != "" {
		_ = h.svc.Logout(r.Context(), token)
	}
	w.WriteHeader(http.StatusNoContent)
}
