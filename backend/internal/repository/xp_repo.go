package repository

import (
	"context"
	"math"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type MemberXP struct {
	HubID    string    `json:"hub_id"`
	UserID   string    `json:"user_id"`
	XP       int64     `json:"xp"`
	Level    int       `json:"level"`
	LastXPAt time.Time `json:"last_xp_at"`
}

type LevelRole struct {
	HubID  string `json:"hub_id"`
	Level  int    `json:"level"`
	RankID string `json:"rank_id"`
}

type XPRepo struct {
	db *pgxpool.Pool
}

func NewXPRepo(db *pgxpool.Pool) *XPRepo {
	return &XPRepo{db: db}
}

func LevelFromXP(xp int64) int {
	return int(math.Floor(0.1 * math.Sqrt(float64(xp))))
}

func (r *XPRepo) AddXP(ctx context.Context, hubID, userID string, amount int64, cooldownSeconds int) (newXP int64, newLevel int, leveledUp bool, err error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, 0, false, err
	}
	defer tx.Rollback(ctx)

	var current MemberXP
	err = tx.QueryRow(ctx,
		`SELECT xp, level, last_xp_at FROM member_xp WHERE hub_id = $1 AND user_id = $2`,
		hubID, userID).Scan(&current.XP, &current.Level, &current.LastXPAt)

	if err != nil {
		// Row doesn't exist yet
		newXP = amount
		newLevel = LevelFromXP(newXP)
		_, err = tx.Exec(ctx,
			`INSERT INTO member_xp (hub_id, user_id, xp, level, last_xp_at) VALUES ($1, $2, $3, $4, now())`,
			hubID, userID, newXP, newLevel)
		if err != nil {
			return 0, 0, false, err
		}
		if err := tx.Commit(ctx); err != nil {
			return 0, 0, false, err
		}
		return newXP, newLevel, newLevel > 0, nil
	}

	if time.Since(current.LastXPAt) < time.Duration(cooldownSeconds)*time.Second {
		return current.XP, current.Level, false, nil
	}

	newXP = current.XP + amount
	newLevel = LevelFromXP(newXP)
	leveledUp = newLevel > current.Level

	_, err = tx.Exec(ctx,
		`UPDATE member_xp SET xp = $3, level = $4, last_xp_at = now() WHERE hub_id = $1 AND user_id = $2`,
		hubID, userID, newXP, newLevel)
	if err != nil {
		return 0, 0, false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, false, err
	}
	return newXP, newLevel, leveledUp, nil
}

func (r *XPRepo) GetMemberXP(ctx context.Context, hubID, userID string) (*MemberXP, error) {
	var xp MemberXP
	xp.HubID = hubID
	xp.UserID = userID
	err := r.db.QueryRow(ctx,
		`SELECT xp, level, last_xp_at FROM member_xp WHERE hub_id = $1 AND user_id = $2`,
		hubID, userID).Scan(&xp.XP, &xp.Level, &xp.LastXPAt)
	if err != nil {
		return nil, err
	}
	return &xp, nil
}

func (r *XPRepo) Leaderboard(ctx context.Context, hubID string, limit int) ([]MemberXP, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	rows, err := r.db.Query(ctx,
		`SELECT hub_id, user_id, xp, level, last_xp_at FROM member_xp WHERE hub_id = $1 ORDER BY xp DESC LIMIT $2`,
		hubID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []MemberXP
	for rows.Next() {
		var e MemberXP
		if err := rows.Scan(&e.HubID, &e.UserID, &e.XP, &e.Level, &e.LastXPAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

func (r *XPRepo) GetLevelRoles(ctx context.Context, hubID string) ([]LevelRole, error) {
	rows, err := r.db.Query(ctx,
		`SELECT hub_id, level, rank_id FROM level_roles WHERE hub_id = $1 ORDER BY level`, hubID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []LevelRole
	for rows.Next() {
		var lr LevelRole
		if err := rows.Scan(&lr.HubID, &lr.Level, &lr.RankID); err != nil {
			return nil, err
		}
		roles = append(roles, lr)
	}
	return roles, nil
}

func (r *XPRepo) SetLevelRole(ctx context.Context, hubID string, level int, rankID string) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO level_roles (hub_id, level, rank_id) VALUES ($1, $2, $3) ON CONFLICT (hub_id, level) DO UPDATE SET rank_id = $3`,
		hubID, level, rankID)
	return err
}

func (r *XPRepo) DeleteLevelRole(ctx context.Context, hubID string, level int) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM level_roles WHERE hub_id = $1 AND level = $2`, hubID, level)
	return err
}
