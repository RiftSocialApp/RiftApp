-- +goose Up
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS system_type VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_system_type_created
    ON messages(conversation_id, system_type, created_at DESC)
    WHERE system_type IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_messages_conversation_system_type_created;

ALTER TABLE messages
    DROP COLUMN IF EXISTS system_type;