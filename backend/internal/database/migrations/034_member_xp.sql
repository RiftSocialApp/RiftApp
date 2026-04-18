-- +goose Up

CREATE TABLE IF NOT EXISTS member_xp (
    hub_id      UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    xp          BIGINT NOT NULL DEFAULT 0,
    level       INT NOT NULL DEFAULT 0,
    last_xp_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (hub_id, user_id)
);

CREATE TABLE IF NOT EXISTS level_roles (
    hub_id      UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    level       INT NOT NULL,
    rank_id     UUID NOT NULL REFERENCES ranks(id) ON DELETE CASCADE,
    PRIMARY KEY (hub_id, level)
);

-- +goose Down

DROP TABLE IF EXISTS level_roles;
DROP TABLE IF EXISTS member_xp;
