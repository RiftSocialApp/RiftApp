-- +goose Up

-- Prevent duplicate names within the same hub for each customization type.
ALTER TABLE hub_emojis   ADD CONSTRAINT uq_hub_emojis_name   UNIQUE (hub_id, name);
ALTER TABLE hub_stickers ADD CONSTRAINT uq_hub_stickers_name UNIQUE (hub_id, name);
ALTER TABLE hub_sounds   ADD CONSTRAINT uq_hub_sounds_name   UNIQUE (hub_id, name);

-- +goose Down
ALTER TABLE hub_emojis   DROP CONSTRAINT IF EXISTS uq_hub_emojis_name;
ALTER TABLE hub_stickers DROP CONSTRAINT IF EXISTS uq_hub_stickers_name;
ALTER TABLE hub_sounds   DROP CONSTRAINT IF EXISTS uq_hub_sounds_name;
