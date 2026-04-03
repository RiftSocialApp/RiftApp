package apperror

import (
	"errors"
	"net/http"
	"testing"
)

func TestNew(t *testing.T) {
	err := New(400, "bad request")
	if err.Code != 400 || err.Message != "bad request" {
		t.Fatalf("unexpected error: %+v", err)
	}
}

func TestWrap(t *testing.T) {
	inner := errors.New("db error")
	err := Wrap(500, "internal error", inner)
	if err.Code != 500 || err.Err != inner {
		t.Fatalf("unexpected wrapped error: %+v", err)
	}
	if !errors.Is(err, inner) {
		t.Fatal("expected to unwrap to inner error")
	}
}

func TestError_String(t *testing.T) {
	err := New(400, "bad request")
	if err.Error() != "bad request" {
		t.Fatalf("expected 'bad request', got %q", err.Error())
	}

	wrapped := Wrap(500, "internal", errors.New("oops"))
	expected := "internal: oops"
	if wrapped.Error() != expected {
		t.Fatalf("expected %q, got %q", expected, wrapped.Error())
	}
}

func TestHTTPCode(t *testing.T) {
	tests := []struct {
		err  error
		code int
	}{
		{BadRequest("bad"), http.StatusBadRequest},
		{NotFound("nope"), http.StatusNotFound},
		{Forbidden("no"), http.StatusForbidden},
		{Conflict("dup"), http.StatusConflict},
		{Internal("fail", nil), http.StatusInternalServerError},
		{errors.New("plain"), http.StatusInternalServerError},
	}
	for _, tt := range tests {
		got := HTTPCode(tt.err)
		if got != tt.code {
			t.Errorf("HTTPCode(%v) = %d, want %d", tt.err, got, tt.code)
		}
	}
}

func TestMessage(t *testing.T) {
	tests := []struct {
		err error
		msg string
	}{
		{BadRequest("invalid input"), "invalid input"},
		{errors.New("plain error"), "internal error"},
	}
	for _, tt := range tests {
		got := Message(tt.err)
		if got != tt.msg {
			t.Errorf("Message(%v) = %q, want %q", tt.err, got, tt.msg)
		}
	}
}

func TestPredefined(t *testing.T) {
	if ErrNotFound.Code != 404 {
		t.Error("ErrNotFound code wrong")
	}
	if ErrForbidden.Code != 403 {
		t.Error("ErrForbidden code wrong")
	}
	if ErrBadRequest.Code != 400 {
		t.Error("ErrBadRequest code wrong")
	}
	if ErrUnauthorized.Code != 401 {
		t.Error("ErrUnauthorized code wrong")
	}
	if ErrConflict.Code != 409 {
		t.Error("ErrConflict code wrong")
	}
	if ErrInternal.Code != 500 {
		t.Error("ErrInternal code wrong")
	}
}
