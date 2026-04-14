package music

import (
	"bufio"
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
	AudioURL string `json:"audio_url"`
	Duration string `json:"duration_string"`
}

// Resolve resolves a single query (search term or URL) to audio info.
func (s *Source) Resolve(ctx context.Context, query string) (*AudioInfo, error) {
	if !strings.HasPrefix(query, "http") {
		query = "ytsearch1:" + query
	}

	cmd := exec.CommandContext(ctx, "yt-dlp",
		"--no-download", "--print-json",
		"-f", "bestaudio",
		"--no-playlist",
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

	return parseYTDLPJSON(out, query), nil
}

// ResolvePlaylist resolves a URL that may contain multiple tracks (YouTube
// playlist, SoundCloud set, or any yt-dlp-supported playlist). Returns one
// AudioInfo per track. For non-playlist URLs it returns a single element.
func (s *Source) ResolvePlaylist(ctx context.Context, rawURL string) ([]AudioInfo, error) {
	cmd := exec.CommandContext(ctx, "yt-dlp",
		"--flat-playlist", "--print-json",
		rawURL,
	)

	out, err := cmd.Output()
	if err != nil {
		single, err2 := s.Resolve(ctx, rawURL)
		if err2 != nil {
			return nil, err2
		}
		return []AudioInfo{*single}, nil
	}

	var infos []AudioInfo
	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	scanner.Buffer(make([]byte, 0, 512*1024), 512*1024)

	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) == "" {
			continue
		}

		var entry struct {
			Title          string  `json:"title"`
			URL            string  `json:"url"`
			WebpageURL     string  `json:"webpage_url"`
			DurationString string  `json:"duration_string"`
			Duration       float64 `json:"duration"`
		}
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			continue
		}

		pageURL := entry.WebpageURL
		if pageURL == "" {
			pageURL = entry.URL
		}

		dur := entry.DurationString
		if dur == "" && entry.Duration > 0 {
			mins := int(entry.Duration) / 60
			secs := int(entry.Duration) % 60
			dur = fmt.Sprintf("%d:%02d", mins, secs)
		}
		if dur == "" {
			dur = "Unknown"
		}

		title := entry.Title
		if title == "" {
			title = pageURL
		}

		infos = append(infos, AudioInfo{
			Title:    title,
			URL:      pageURL,
			Duration: dur,
		})

		if len(infos) >= 200 {
			break
		}
	}

	if len(infos) == 0 {
		single, err2 := s.Resolve(ctx, rawURL)
		if err2 != nil {
			return nil, err2
		}
		return []AudioInfo{*single}, nil
	}

	return infos, nil
}

// StreamURL returns the direct audio stream URL for a query using yt-dlp.
func (s *Source) StreamURL(ctx context.Context, query string) (string, error) {
	if !strings.HasPrefix(query, "http") {
		query = "ytsearch1:" + query
	}

	cmd := exec.CommandContext(ctx, "yt-dlp",
		"-f", "bestaudio",
		"--no-playlist",
		"--get-url",
		query,
	)
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("yt-dlp failed: %w", err)
	}
	u := strings.TrimSpace(string(out))
	if u == "" {
		return "", fmt.Errorf("yt-dlp returned empty URL")
	}
	return u, nil
}

// IsPlaylistURL returns true if the URL looks like a playlist/album/set.
func IsPlaylistURL(u string) bool {
	lower := strings.ToLower(u)
	if strings.Contains(lower, "list=") {
		return true
	}
	if strings.Contains(lower, "soundcloud.com/") && strings.Contains(lower, "/sets/") {
		return true
	}
	if strings.Contains(lower, "spotify.com/playlist/") || strings.Contains(lower, "spotify.com/album/") {
		return true
	}
	return false
}

func parseYTDLPJSON(data []byte, fallbackTitle string) *AudioInfo {
	var info struct {
		Title          string  `json:"title"`
		WebpageURL     string  `json:"webpage_url"`
		DurationString string  `json:"duration_string"`
		Duration       float64 `json:"duration"`
		URL            string  `json:"url"`
	}
	if err := json.Unmarshal(data, &info); err != nil {
		return &AudioInfo{Title: fallbackTitle, URL: fallbackTitle, Duration: "Unknown"}
	}

	dur := info.DurationString
	if dur == "" && info.Duration > 0 {
		mins := int(info.Duration) / 60
		secs := int(info.Duration) % 60
		dur = fmt.Sprintf("%d:%02d", mins, secs)
	}
	if dur == "" {
		dur = "Unknown"
	}

	return &AudioInfo{
		Title:    info.Title,
		URL:      info.WebpageURL,
		AudioURL: info.URL,
		Duration: dur,
	}
}
