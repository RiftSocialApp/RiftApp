-- +goose Up
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE streams ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- +goose Down
ALTER TABLE streams DROP COLUMN IF EXISTS category_id;
DROP TABLE IF EXISTS categories;
