-- +goose Up
CREATE TABLE friendships (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status     INT  NOT NULL DEFAULT 0,  -- 0=pending, 1=accepted
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, friend_id),
    CHECK (user_id != friend_id)
);

CREATE INDEX idx_friendships_friend ON friendships(friend_id, status);
CREATE INDEX idx_friendships_user   ON friendships(user_id, status);

CREATE TABLE blocks (
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);

-- +goose Down
DROP TABLE IF EXISTS blocks;
DROP TABLE IF EXISTS friendships;
