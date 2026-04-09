-- +goose Up

-- Image moderation status on attachments
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS idx_attachments_moderation ON attachments(moderation_status) WHERE moderation_status = 'pending';

-- Reports system
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'other',
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    moderator_note TEXT,
    auto_moderation JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

CREATE TABLE IF NOT EXISTS moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    action_type VARCHAR(30) NOT NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
    performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mod_actions_report ON moderation_actions(report_id);

-- Hub-level moderation settings
CREATE TABLE IF NOT EXISTS hub_moderation_settings (
    hub_id UUID PRIMARY KEY REFERENCES hubs(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    classifiers TEXT[] NOT NULL DEFAULT '{"toxicity","spam","nsfw_text"}',
    toxicity_threshold REAL NOT NULL DEFAULT 0.7,
    spam_threshold REAL NOT NULL DEFAULT 0.8,
    nsfw_threshold REAL NOT NULL DEFAULT 0.7,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hub bans
CREATE TABLE IF NOT EXISTS hub_bans (
    hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    banned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (hub_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hub_bans_user ON hub_bans(user_id);

-- +goose Down
DROP TABLE IF EXISTS hub_bans;
DROP TABLE IF EXISTS hub_moderation_settings;
DROP TABLE IF EXISTS moderation_actions;
DROP TABLE IF EXISTS reports;
ALTER TABLE attachments DROP COLUMN IF EXISTS moderation_status;
