package music

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"
)

type SpotifyClient struct {
	clientID     string
	clientSecret string

	mu    sync.Mutex
	token string
	expAt time.Time
}

func NewSpotifyClient(clientID, clientSecret string) *SpotifyClient {
	return &SpotifyClient{
		clientID:     clientID,
		clientSecret: clientSecret,
	}
}

func (c *SpotifyClient) Valid() bool {
	return c.clientID != "" && c.clientSecret != ""
}

func (c *SpotifyClient) authenticate(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.token != "" && time.Now().Before(c.expAt) {
		return nil
	}

	data := url.Values{"grant_type": {"client_credentials"}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://accounts.spotify.com/api/token", strings.NewReader(data.Encode()))
	if err != nil {
		return err
	}

	auth := base64.StdEncoding.EncodeToString([]byte(c.clientID + ":" + c.clientSecret))
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("spotify auth failed (%d): %s", resp.StatusCode, body)
	}

	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return err
	}

	c.token = result.AccessToken
	c.expAt = time.Now().Add(time.Duration(result.ExpiresIn-60) * time.Second)
	return nil
}

func (c *SpotifyClient) apiGet(ctx context.Context, path string) (json.RawMessage, error) {
	if err := c.authenticate(ctx); err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.spotify.com/v1"+path, nil)
	if err != nil {
		return nil, err
	}

	c.mu.Lock()
	req.Header.Set("Authorization", "Bearer "+c.token)
	c.mu.Unlock()

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("spotify API error (%d): %s", resp.StatusCode, body)
	}

	body, err := io.ReadAll(resp.Body)
	return json.RawMessage(body), err
}

type SpotifyTrack struct {
	Name    string
	Artists string
	Album   string
}

func (t SpotifyTrack) SearchQuery() string {
	return t.Artists + " - " + t.Name
}

var (
	spotifyTrackRe    = regexp.MustCompile(`spotify\.com/track/([a-zA-Z0-9]+)`)
	spotifyAlbumRe    = regexp.MustCompile(`spotify\.com/album/([a-zA-Z0-9]+)`)
	spotifyPlaylistRe = regexp.MustCompile(`spotify\.com/playlist/([a-zA-Z0-9]+)`)
)

func IsSpotifyURL(u string) bool {
	return strings.Contains(u, "spotify.com/")
}

func (c *SpotifyClient) ResolveTracks(ctx context.Context, rawURL string) ([]SpotifyTrack, error) {
	if m := spotifyTrackRe.FindStringSubmatch(rawURL); len(m) > 1 {
		return c.resolveTrack(ctx, m[1])
	}
	if m := spotifyAlbumRe.FindStringSubmatch(rawURL); len(m) > 1 {
		return c.resolveAlbum(ctx, m[1])
	}
	if m := spotifyPlaylistRe.FindStringSubmatch(rawURL); len(m) > 1 {
		return c.resolvePlaylist(ctx, m[1])
	}
	return nil, fmt.Errorf("unrecognized Spotify URL")
}

func (c *SpotifyClient) resolveTrack(ctx context.Context, id string) ([]SpotifyTrack, error) {
	data, err := c.apiGet(ctx, "/tracks/"+id)
	if err != nil {
		return nil, err
	}

	var track struct {
		Name    string `json:"name"`
		Artists []struct {
			Name string `json:"name"`
		} `json:"artists"`
		Album struct {
			Name string `json:"name"`
		} `json:"album"`
	}
	if err := json.Unmarshal(data, &track); err != nil {
		return nil, err
	}

	artists := extractArtists(track.Artists)
	return []SpotifyTrack{{Name: track.Name, Artists: artists, Album: track.Album.Name}}, nil
}

func (c *SpotifyClient) resolveAlbum(ctx context.Context, id string) ([]SpotifyTrack, error) {
	data, err := c.apiGet(ctx, "/albums/"+id)
	if err != nil {
		return nil, err
	}

	var album struct {
		Name    string `json:"name"`
		Artists []struct {
			Name string `json:"name"`
		} `json:"artists"`
		Tracks struct {
			Items []struct {
				Name    string `json:"name"`
				Artists []struct {
					Name string `json:"name"`
				} `json:"artists"`
			} `json:"items"`
		} `json:"tracks"`
	}
	if err := json.Unmarshal(data, &album); err != nil {
		return nil, err
	}

	var tracks []SpotifyTrack
	for _, item := range album.Tracks.Items {
		artists := extractArtists(item.Artists)
		tracks = append(tracks, SpotifyTrack{
			Name:    item.Name,
			Artists: artists,
			Album:   album.Name,
		})
	}
	return tracks, nil
}

func (c *SpotifyClient) resolvePlaylist(ctx context.Context, id string) ([]SpotifyTrack, error) {
	var tracks []SpotifyTrack
	offset := 0
	limit := 100

	for {
		path := fmt.Sprintf("/playlists/%s/tracks?limit=%d&offset=%d&fields=items(track(name,artists(name),album(name))),next", id, limit, offset)
		data, err := c.apiGet(ctx, path)
		if err != nil {
			return tracks, err
		}

		var page struct {
			Items []struct {
				Track *struct {
					Name    string `json:"name"`
					Artists []struct {
						Name string `json:"name"`
					} `json:"artists"`
					Album struct {
						Name string `json:"name"`
					} `json:"album"`
				} `json:"track"`
			} `json:"items"`
			Next *string `json:"next"`
		}
		if err := json.Unmarshal(data, &page); err != nil {
			return tracks, err
		}

		for _, item := range page.Items {
			if item.Track == nil {
				continue
			}
			artists := extractArtists(item.Track.Artists)
			tracks = append(tracks, SpotifyTrack{
				Name:    item.Track.Name,
				Artists: artists,
				Album:   item.Track.Album.Name,
			})
		}

		if page.Next == nil || len(page.Items) == 0 {
			break
		}
		offset += limit

		if len(tracks) >= 200 {
			break
		}
	}

	return tracks, nil
}

func extractArtists(artists []struct {
	Name string `json:"name"`
}) string {
	names := make([]string, 0, len(artists))
	for _, a := range artists {
		names = append(names, a.Name)
	}
	return strings.Join(names, ", ")
}
