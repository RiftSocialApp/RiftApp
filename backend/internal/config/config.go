package config

import (
	"log"
	"os"
	"strings"
)

type Config struct {
	Port           string
	DatabaseURL    string
	RedisURL       string
	JWTSecret      string
	AllowedOrigins []string
	S3Endpoint     string
	S3PublicURL    string // No longer used for stored URLs (now relative), kept for backward compat.
	S3AccessKey    string
	S3SecretKey    string
	S3Bucket       string
	LiveKitURL     string
	LiveKitKey     string
	LiveKitSecret  string
}

func Load() *Config {
	cfg := &Config{
		Port:           getEnv("PORT", "8080"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://riftapp:riftapp_dev@localhost:5432/riftapp?sslmode=disable"),
		RedisURL:       getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:      getEnv("JWT_SECRET", "dev-secret-change-me"),
		AllowedOrigins: parseOrigins(getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")),
		S3Endpoint:     getEnv("S3_ENDPOINT", "http://localhost:9000"),
		S3PublicURL:    getEnv("S3_PUBLIC_URL", ""),
		S3AccessKey:    getEnv("S3_ACCESS_KEY", "riftapp"),
		S3SecretKey:    getEnv("S3_SECRET_KEY", "riftapp_dev"),
		S3Bucket:       getEnv("S3_BUCKET", "riftapp"),
		LiveKitURL:     getEnv("LIVEKIT_URL", ""),
		LiveKitKey:     getEnv("LIVEKIT_API_KEY", "devkey"),
		LiveKitSecret:  getEnv("LIVEKIT_API_SECRET", "devsecret"),
	}
	if cfg.JWTSecret == "dev-secret-change-me" {
		log.Println("WARNING: JWT_SECRET is set to the default dev value. Set a strong secret in production.")
	}
	if cfg.LiveKitKey == "devkey" || cfg.LiveKitSecret == "devsecret" {
		log.Println("WARNING: LiveKit API key/secret are set to default dev values. Set real credentials in production.")
	}
	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func parseOrigins(s string) []string {
	parts := strings.Split(s, ",")
	origins := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			origins = append(origins, p)
		}
	}
	return origins
}
