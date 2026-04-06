-- +goose Up
CREATE INDEX IF NOT EXISTS idx_streams_hub_id ON streams(hub_id);
CREATE INDEX IF NOT EXISTS idx_categories_hub_id ON categories(hub_id);
CREATE INDEX IF NOT EXISTS idx_ranks_hub_id ON ranks(hub_id);
CREATE INDEX IF NOT EXISTS idx_hub_members_user_id ON hub_members(user_id);

-- +goose Down
DROP INDEX IF EXISTS idx_streams_hub_id;
DROP INDEX IF EXISTS idx_categories_hub_id;
DROP INDEX IF EXISTS idx_ranks_hub_id;
DROP INDEX IF EXISTS idx_hub_members_user_id;
