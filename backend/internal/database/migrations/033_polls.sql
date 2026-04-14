-- +goose Up

CREATE TABLE IF NOT EXISTS polls (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hub_id      UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    stream_id   UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    message_id  UUID REFERENCES messages(id) ON DELETE SET NULL,
    author_id   UUID NOT NULL REFERENCES users(id),
    question    TEXT NOT NULL,
    options     JSONB NOT NULL,
    multi_vote  BOOLEAN NOT NULL DEFAULT false,
    ends_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_votes (
    poll_id     UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    option_idx  INT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (poll_id, user_id, option_idx)
);

CREATE TABLE IF NOT EXISTS reminders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hub_id      UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stream_id   UUID REFERENCES streams(id) ON DELETE SET NULL,
    message     TEXT NOT NULL,
    remind_at   TIMESTAMPTZ NOT NULL,
    fired       BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminders_pending ON reminders(remind_at) WHERE NOT fired;

-- +goose Down

DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS poll_votes;
DROP TABLE IF EXISTS polls;
