-- +goose Up
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE hubs SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE hubs ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE hubs ALTER COLUMN updated_at SET NOT NULL;

-- +goose Down
ALTER TABLE hubs DROP COLUMN IF EXISTS updated_at;