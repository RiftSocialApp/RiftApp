package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/riftapp-cloud/riftapp/internal/models"
)

type HubCustomizationRepo struct {
	db *pgxpool.Pool
}

// ErrLimitReached is returned when a per-hub item limit would be exceeded.
var ErrLimitReached = fmt.Errorf("item limit reached")

func NewHubCustomizationRepo(db *pgxpool.Pool) *HubCustomizationRepo {
	return &HubCustomizationRepo{db: db}
}

// ── Emojis ──

func (r *HubCustomizationRepo) ListEmojis(ctx context.Context, hubID string) ([]models.HubEmoji, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, hub_id, name, file_url, created_at FROM hub_emojis WHERE hub_id = $1 ORDER BY created_at`, hubID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.HubEmoji
	for rows.Next() {
		var e models.HubEmoji
		if err := rows.Scan(&e.ID, &e.HubID, &e.Name, &e.FileURL, &e.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, e)
	}
	if items == nil {
		items = []models.HubEmoji{}
	}
	return items, rows.Err()
}

func (r *HubCustomizationRepo) CreateEmoji(ctx context.Context, hubID, name, fileURL string) (*models.HubEmoji, error) {
	e := &models.HubEmoji{
		ID:        uuid.New().String(),
		HubID:     hubID,
		Name:      name,
		FileURL:   fileURL,
		CreatedAt: time.Now(),
	}
	_, err := r.db.Exec(ctx,
		`INSERT INTO hub_emojis (id, hub_id, name, file_url, created_at) VALUES ($1, $2, $3, $4, $5)`,
		e.ID, e.HubID, e.Name, e.FileURL, e.CreatedAt)
	if err != nil {
		return nil, err
	}
	return e, nil
}

// CreateEmojiTx atomically checks the per-hub limit and inserts within a single transaction.
// It locks the hub row with FOR UPDATE to serialize concurrent creates.
func (r *HubCustomizationRepo) CreateEmojiTx(ctx context.Context, hubID, name, fileURL string, maxItems int) (*models.HubEmoji, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Lock the hub row to serialize concurrent creates for this hub.
	if _, err := tx.Exec(ctx, `SELECT id FROM hubs WHERE id = $1 FOR UPDATE`, hubID); err != nil {
		return nil, fmt.Errorf("lock hub: %w", err)
	}

	var count int
	if err := tx.QueryRow(ctx, `SELECT COUNT(1) FROM hub_emojis WHERE hub_id = $1`, hubID).Scan(&count); err != nil {
		return nil, fmt.Errorf("count emojis: %w", err)
	}
	if count >= maxItems {
		return nil, ErrLimitReached
	}

	e := &models.HubEmoji{
		ID:        uuid.New().String(),
		HubID:     hubID,
		Name:      name,
		FileURL:   fileURL,
		CreatedAt: time.Now(),
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO hub_emojis (id, hub_id, name, file_url, created_at) VALUES ($1, $2, $3, $4, $5)`,
		e.ID, e.HubID, e.Name, e.FileURL, e.CreatedAt); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}
	return e, nil
}

func (r *HubCustomizationRepo) DeleteEmoji(ctx context.Context, hubID, emojiID string) (string, error) {
	var fileURL string
	err := r.db.QueryRow(ctx,
		`DELETE FROM hub_emojis WHERE id = $1 AND hub_id = $2 RETURNING file_url`, emojiID, hubID).Scan(&fileURL)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", pgx.ErrNoRows
		}
		return "", err
	}
	return fileURL, nil
}

// ── Stickers ──

func (r *HubCustomizationRepo) ListStickers(ctx context.Context, hubID string) ([]models.HubSticker, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, hub_id, name, file_url, created_at FROM hub_stickers WHERE hub_id = $1 ORDER BY created_at`, hubID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.HubSticker
	for rows.Next() {
		var s models.HubSticker
		if err := rows.Scan(&s.ID, &s.HubID, &s.Name, &s.FileURL, &s.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, s)
	}
	if items == nil {
		items = []models.HubSticker{}
	}
	return items, rows.Err()
}

func (r *HubCustomizationRepo) CreateSticker(ctx context.Context, hubID, name, fileURL string) (*models.HubSticker, error) {
	s := &models.HubSticker{
		ID:        uuid.New().String(),
		HubID:     hubID,
		Name:      name,
		FileURL:   fileURL,
		CreatedAt: time.Now(),
	}
	_, err := r.db.Exec(ctx,
		`INSERT INTO hub_stickers (id, hub_id, name, file_url, created_at) VALUES ($1, $2, $3, $4, $5)`,
		s.ID, s.HubID, s.Name, s.FileURL, s.CreatedAt)
	if err != nil {
		return nil, err
	}
	return s, nil
}

// CreateStickerTx atomically checks the per-hub limit and inserts within a single transaction.
func (r *HubCustomizationRepo) CreateStickerTx(ctx context.Context, hubID, name, fileURL string, maxItems int) (*models.HubSticker, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `SELECT id FROM hubs WHERE id = $1 FOR UPDATE`, hubID); err != nil {
		return nil, fmt.Errorf("lock hub: %w", err)
	}

	var count int
	if err := tx.QueryRow(ctx, `SELECT COUNT(1) FROM hub_stickers WHERE hub_id = $1`, hubID).Scan(&count); err != nil {
		return nil, fmt.Errorf("count stickers: %w", err)
	}
	if count >= maxItems {
		return nil, ErrLimitReached
	}

	s := &models.HubSticker{
		ID:        uuid.New().String(),
		HubID:     hubID,
		Name:      name,
		FileURL:   fileURL,
		CreatedAt: time.Now(),
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO hub_stickers (id, hub_id, name, file_url, created_at) VALUES ($1, $2, $3, $4, $5)`,
		s.ID, s.HubID, s.Name, s.FileURL, s.CreatedAt); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}
	return s, nil
}

func (r *HubCustomizationRepo) DeleteSticker(ctx context.Context, hubID, stickerID string) (string, error) {
	var fileURL string
	err := r.db.QueryRow(ctx,
		`DELETE FROM hub_stickers WHERE id = $1 AND hub_id = $2 RETURNING file_url`, stickerID, hubID).Scan(&fileURL)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", pgx.ErrNoRows
		}
		return "", err
	}
	return fileURL, nil
}

// ── Sounds ──

func (r *HubCustomizationRepo) ListSounds(ctx context.Context, hubID string) ([]models.HubSound, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, hub_id, name, file_url, created_at FROM hub_sounds WHERE hub_id = $1 ORDER BY created_at`, hubID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.HubSound
	for rows.Next() {
		var s models.HubSound
		if err := rows.Scan(&s.ID, &s.HubID, &s.Name, &s.FileURL, &s.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, s)
	}
	if items == nil {
		items = []models.HubSound{}
	}
	return items, rows.Err()
}

func (r *HubCustomizationRepo) CreateSound(ctx context.Context, hubID, name, fileURL string) (*models.HubSound, error) {
	s := &models.HubSound{
		ID:        uuid.New().String(),
		HubID:     hubID,
		Name:      name,
		FileURL:   fileURL,
		CreatedAt: time.Now(),
	}
	_, err := r.db.Exec(ctx,
		`INSERT INTO hub_sounds (id, hub_id, name, file_url, created_at) VALUES ($1, $2, $3, $4, $5)`,
		s.ID, s.HubID, s.Name, s.FileURL, s.CreatedAt)
	if err != nil {
		return nil, err
	}
	return s, nil
}

// CreateSoundTx atomically checks the per-hub limit and inserts within a single transaction.
func (r *HubCustomizationRepo) CreateSoundTx(ctx context.Context, hubID, name, fileURL string, maxItems int) (*models.HubSound, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `SELECT id FROM hubs WHERE id = $1 FOR UPDATE`, hubID); err != nil {
		return nil, fmt.Errorf("lock hub: %w", err)
	}

	var count int
	if err := tx.QueryRow(ctx, `SELECT COUNT(1) FROM hub_sounds WHERE hub_id = $1`, hubID).Scan(&count); err != nil {
		return nil, fmt.Errorf("count sounds: %w", err)
	}
	if count >= maxItems {
		return nil, ErrLimitReached
	}

	s := &models.HubSound{
		ID:        uuid.New().String(),
		HubID:     hubID,
		Name:      name,
		FileURL:   fileURL,
		CreatedAt: time.Now(),
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO hub_sounds (id, hub_id, name, file_url, created_at) VALUES ($1, $2, $3, $4, $5)`,
		s.ID, s.HubID, s.Name, s.FileURL, s.CreatedAt); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}
	return s, nil
}

func (r *HubCustomizationRepo) DeleteSound(ctx context.Context, hubID, soundID string) (string, error) {
	var fileURL string
	err := r.db.QueryRow(ctx,
		`DELETE FROM hub_sounds WHERE id = $1 AND hub_id = $2 RETURNING file_url`, soundID, hubID).Scan(&fileURL)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", pgx.ErrNoRows
		}
		return "", err
	}
	return fileURL, nil
}
