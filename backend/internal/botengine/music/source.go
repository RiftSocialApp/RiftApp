package music

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
)

type Source struct{}

func NewSource() *Source {
	return &Source{}
}

type AudioInfo struct {
	Title    string `json:"title"`
	URL      string `json:"url"`
	Duration string `json:"duration_string"`
}

func (s *Source) Resolve(ctx context.Context, query string) (*AudioInfo, error) {
	if !strings.HasPrefix(query, "http") {
		query = "ytsearch1:" + query
	}

	cmd := exec.CommandContext(ctx, "yt-dlp",
		"--no-download", "--print-json",
		"-f", "bestaudio",
		query,
	)

	out, err := cmd.Output()
	if err != nil {
		return &AudioInfo{
			Title:    query,
			URL:      query,
			Duration: "Unknown",
		}, nil
	}

	var info struct {
		Title          string  `json:"title"`
		WebpageURL     string  `json:"webpage_url"`
		DurationString string  `json:"duration_string"`
		Duration       float64 `json:"duration"`
	}
	if err := json.Unmarshal(out, &info); err != nil {
		return &AudioInfo{Title: query, URL: query, Duration: "Unknown"}, nil
	}

	dur := info.DurationString
	if dur == "" && info.Duration > 0 {
		mins := int(info.Duration) / 60
		secs := int(info.Duration) % 60
		dur = fmt.Sprintf("%d:%02d", mins, secs)
	}

	return &AudioInfo{
		Title:    info.Title,
		URL:      info.WebpageURL,
		Duration: dur,
	}, nil
}
