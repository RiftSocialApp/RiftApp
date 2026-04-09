package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type discordBotInfo struct {
	ID            string `json:"id"`
	Username      string `json:"username"`
	Discriminator string `json:"discriminator"`
	Avatar        string `json:"avatar"`
	Bot           bool   `json:"bot"`
}

func fetchDiscordBotInfo(botToken string) (*discordBotInfo, error) {
	botToken = strings.TrimSpace(botToken)
	if botToken == "" {
		return nil, fmt.Errorf("bot token is required")
	}

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", "https://discord.com/api/v10/users/@me", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bot "+botToken)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("discord bot info request failed: %s", resp.Status)
	}

	var info discordBotInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}
	if info.ID == "" || strings.TrimSpace(info.Username) == "" || !info.Bot {
		return nil, fmt.Errorf("discord returned invalid bot identity")
	}
	return &info, nil
}
