package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type HubBot struct {
	ID           string          `json:"id"`
	HubID        string          `json:"hub_id"`
	BotUserID    string          `json:"bot_user_id"`
	TemplateType string          `json:"template_type"`
	Config       json.RawMessage `json:"config"`
	Enabled      bool            `json:"enabled"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

type HubBotRepo struct {
	db *pgxpool.Pool
}

func NewHubBotRepo(db *pgxpool.Pool) *HubBotRepo {
	return &HubBotRepo{db: db}
}

func (r *HubBotRepo) Create(ctx context.Context, bot *HubBot) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO hub_bots (id, hub_id, bot_user_id, template_type, config, enabled, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		bot.ID, bot.HubID, bot.BotUserID, bot.TemplateType, bot.Config, bot.Enabled, bot.CreatedAt, bot.UpdatedAt)
	return err
}

func (r *HubBotRepo) GetByID(ctx context.Context, id string) (*HubBot, error) {
	var bot HubBot
	err := r.db.QueryRow(ctx,
		`SELECT id, hub_id, bot_user_id, template_type, config, enabled, created_at, updated_at FROM hub_bots WHERE id = $1`, id).
		Scan(&bot.ID, &bot.HubID, &bot.BotUserID, &bot.TemplateType, &bot.Config, &bot.Enabled, &bot.CreatedAt, &bot.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &bot, nil
}

func (r *HubBotRepo) ListByHub(ctx context.Context, hubID string) ([]HubBot, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, hub_id, bot_user_id, template_type, config, enabled, created_at, updated_at FROM hub_bots WHERE hub_id = $1 ORDER BY created_at`, hubID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bots []HubBot
	for rows.Next() {
		var bot HubBot
		if err := rows.Scan(&bot.ID, &bot.HubID, &bot.BotUserID, &bot.TemplateType, &bot.Config, &bot.Enabled, &bot.CreatedAt, &bot.UpdatedAt); err != nil {
			return nil, err
		}
		bots = append(bots, bot)
	}
	return bots, nil
}

func (r *HubBotRepo) ListEnabledByHub(ctx context.Context, hubID string) ([]HubBot, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, hub_id, bot_user_id, template_type, config, enabled, created_at, updated_at FROM hub_bots WHERE hub_id = $1 AND enabled = true ORDER BY created_at`, hubID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bots []HubBot
	for rows.Next() {
		var bot HubBot
		if err := rows.Scan(&bot.ID, &bot.HubID, &bot.BotUserID, &bot.TemplateType, &bot.Config, &bot.Enabled, &bot.CreatedAt, &bot.UpdatedAt); err != nil {
			return nil, err
		}
		bots = append(bots, bot)
	}
	return bots, nil
}

func (r *HubBotRepo) ListAllEnabled(ctx context.Context) ([]HubBot, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, hub_id, bot_user_id, template_type, config, enabled, created_at, updated_at FROM hub_bots WHERE enabled = true ORDER BY hub_id, created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bots []HubBot
	for rows.Next() {
		var bot HubBot
		if err := rows.Scan(&bot.ID, &bot.HubID, &bot.BotUserID, &bot.TemplateType, &bot.Config, &bot.Enabled, &bot.CreatedAt, &bot.UpdatedAt); err != nil {
			return nil, err
		}
		bots = append(bots, bot)
	}
	return bots, nil
}

func (r *HubBotRepo) Update(ctx context.Context, id string, config json.RawMessage, enabled bool) error {
	_, err := r.db.Exec(ctx,
		`UPDATE hub_bots SET config = $2, enabled = $3, updated_at = now() WHERE id = $1`,
		id, config, enabled)
	return err
}

func (r *HubBotRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM hub_bots WHERE id = $1`, id)
	return err
}

func (r *HubBotRepo) GetByHubAndTemplate(ctx context.Context, hubID, templateType string) (*HubBot, error) {
	var bot HubBot
	err := r.db.QueryRow(ctx,
		`SELECT id, hub_id, bot_user_id, template_type, config, enabled, created_at, updated_at FROM hub_bots WHERE hub_id = $1 AND template_type = $2`, hubID, templateType).
		Scan(&bot.ID, &bot.HubID, &bot.BotUserID, &bot.TemplateType, &bot.Config, &bot.Enabled, &bot.CreatedAt, &bot.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &bot, nil
}
