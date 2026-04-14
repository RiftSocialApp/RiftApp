-- +goose Up

CREATE TABLE IF NOT EXISTS hub_bots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hub_id          UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    bot_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_type   VARCHAR(32) NOT NULL,
    config          JSONB NOT NULL DEFAULT '{}',
    enabled         BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(hub_id, template_type)
);

CREATE INDEX idx_hub_bots_hub ON hub_bots(hub_id);
CREATE INDEX idx_hub_bots_enabled ON hub_bots(hub_id) WHERE enabled = true;

-- +goose Down

DROP TABLE IF EXISTS hub_bots;
