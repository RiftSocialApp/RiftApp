-- +goose Up

ALTER TABLE reactions ADD COLUMN emoji_id UUID REFERENCES hub_emojis(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reactions_emoji_id ON reactions(emoji_id) WHERE emoji_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_reactions_emoji_id;
ALTER TABLE reactions DROP COLUMN IF EXISTS emoji_id;
