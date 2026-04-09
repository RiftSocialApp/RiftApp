package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type HubModerationSettings struct {
	HubID              string   `json:"hub_id"`
	Enabled            bool     `json:"enabled"`
	Classifiers        []string `json:"classifiers"`
	ToxicityThreshold  float32  `json:"toxicity_threshold"`
	SpamThreshold      float32  `json:"spam_threshold"`
	NSFWThreshold      float32  `json:"nsfw_threshold"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type HubBan struct {
	HubID     string    `json:"hub_id"`
	UserID    string    `json:"user_id"`
	BannedBy  string    `json:"banned_by"`
	Reason    string    `json:"reason"`
	CreatedAt time.Time `json:"created_at"`
	Username  string    `json:"username,omitempty"`
	DisplayName string  `json:"display_name,omitempty"`
	AvatarURL *string   `json:"avatar_url,omitempty"`
}

type HubModerationRepo struct {
	db *pgxpool.Pool
}

func NewHubModerationRepo(db *pgxpool.Pool) *HubModerationRepo {
	return &HubModerationRepo{db: db}
}

func (r *HubModerationRepo) GetSettings(ctx context.Context, hubID string) (*HubModerationSettings, error) {
	s := &HubModerationSettings{HubID: hubID}
	err := r.db.QueryRow(ctx,
		`SELECT enabled, classifiers, toxicity_threshold, spam_threshold, nsfw_threshold, updated_at
		 FROM hub_moderation_settings WHERE hub_id = $1`, hubID).Scan(
		&s.Enabled, &s.Classifiers, &s.ToxicityThreshold, &s.SpamThreshold, &s.NSFWThreshold, &s.UpdatedAt)
	if err != nil {
		return &HubModerationSettings{
			HubID:             hubID,
			Enabled:           false,
			Classifiers:       []string{"toxicity", "spam", "nsfw_text"},
			ToxicityThreshold: 0.7,
			SpamThreshold:     0.8,
			NSFWThreshold:     0.7,
		}, nil
	}
	return s, nil
}

func (r *HubModerationRepo) UpsertSettings(ctx context.Context, s *HubModerationSettings) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO hub_moderation_settings (hub_id, enabled, classifiers, toxicity_threshold, spam_threshold, nsfw_threshold, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,now())
		 ON CONFLICT (hub_id) DO UPDATE SET
		   enabled=$2, classifiers=$3, toxicity_threshold=$4, spam_threshold=$5, nsfw_threshold=$6, updated_at=now()`,
		s.HubID, s.Enabled, s.Classifiers, s.ToxicityThreshold, s.SpamThreshold, s.NSFWThreshold)
	return err
}

func (r *HubModerationRepo) ListBans(ctx context.Context, hubID string) ([]HubBan, error) {
	rows, err := r.db.Query(ctx,
		`SELECT hb.hub_id, hb.user_id, hb.banned_by, COALESCE(hb.reason,''), hb.created_at,
		        COALESCE(u.username,''), COALESCE(u.display_name,''), u.avatar_url
		 FROM hub_bans hb
		 LEFT JOIN users u ON hb.user_id = u.id
		 WHERE hb.hub_id = $1
		 ORDER BY hb.created_at DESC`, hubID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bans []HubBan
	for rows.Next() {
		var b HubBan
		if err := rows.Scan(&b.HubID, &b.UserID, &b.BannedBy, &b.Reason, &b.CreatedAt,
			&b.Username, &b.DisplayName, &b.AvatarURL); err != nil {
			return nil, err
		}
		bans = append(bans, b)
	}
	if bans == nil {
		bans = []HubBan{}
	}
	return bans, nil
}

func (r *HubModerationRepo) CreateBan(ctx context.Context, hubID, userID, bannedBy, reason string) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO hub_bans (hub_id, user_id, banned_by, reason) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
		hubID, userID, bannedBy, reason)
	return err
}

func (r *HubModerationRepo) DeleteBan(ctx context.Context, hubID, userID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM hub_bans WHERE hub_id=$1 AND user_id=$2`, hubID, userID)
	return err
}

func (r *HubModerationRepo) IsBanned(ctx context.Context, hubID, userID string) bool {
	var exists bool
	_ = r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM hub_bans WHERE hub_id=$1 AND user_id=$2)`, hubID, userID).Scan(&exists)
	return exists
}
