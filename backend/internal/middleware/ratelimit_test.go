package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"golang.org/x/time/rate"
)

func TestRateLimiter_AllowsBurst(t *testing.T) {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate.Limit(10),
		burst:    5,
	}

	for i := 0; i < 5; i++ {
		limiter := rl.getLimiter("test-ip")
		if !limiter.Allow() {
			t.Fatalf("request %d should have been allowed", i)
		}
	}
}

func TestRateLimiter_BlocksAfterBurst(t *testing.T) {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate.Limit(0.1),
		burst:    2,
	}

	limiter := rl.getLimiter("test-ip")
	limiter.Allow()
	limiter.Allow()

	if limiter.Allow() {
		t.Fatal("third request should have been blocked")
	}
}

func TestRateLimit_Middleware(t *testing.T) {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate.Limit(0.1),
		burst:    1,
	}

	handler := RateLimit(rl)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "1.2.3.4:1234"

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("first request should be OK, got %d", rr.Code)
	}

	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("second request should be rate limited, got %d", rr.Code)
	}
}

func TestRateLimit_UsesUserID(t *testing.T) {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate.Limit(0.1),
		burst:    1,
	}

	handler := RateLimit(rl)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "1.2.3.4:1234"
	ctx := context.WithValue(req.Context(), UserIDKey, "user-1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("first request should be OK, got %d", rr.Code)
	}

	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("second request should be rate limited, got %d", rr.Code)
	}

	req2 := httptest.NewRequest("GET", "/", nil)
	req2.RemoteAddr = "1.2.3.4:1234"
	ctx2 := context.WithValue(req2.Context(), UserIDKey, "user-2")
	req2 = req2.WithContext(ctx2)

	rr2 := httptest.NewRecorder()
	handler.ServeHTTP(rr2, req2)
	if rr2.Code != http.StatusOK {
		t.Fatalf("different user should not be rate limited, got %d", rr2.Code)
	}
}

func TestGetUserID(t *testing.T) {
	ctx := context.Background()
	if id := GetUserID(ctx); id != "" {
		t.Fatalf("expected empty, got %q", id)
	}

	ctx = context.WithValue(ctx, UserIDKey, "user-1")
	if id := GetUserID(ctx); id != "user-1" {
		t.Fatalf("expected user-1, got %q", id)
	}
}
