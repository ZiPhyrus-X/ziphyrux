-- ============================================================================
-- Migration: 20261012000011_notifications_expiration_and_deletion.sql
-- Description: Communication & Operations Notifications with Lifetime Expiry and Deletion
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS communication;

-- 1. Notifications Table
CREATE TABLE IF NOT EXISTS communication.notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_role TEXT NOT NULL DEFAULT 'all',
    college_scope TEXT,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'scheduled', 'archived')),
    duration_days INTEGER NOT NULL DEFAULT 7 CHECK (duration_days > 0),
    expires_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_by TEXT
);

-- 2. Indexes for efficient lookup, expiration filtering, and targeting
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON communication.notifications (expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON communication.notifications (target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_college_scope ON communication.notifications (college_scope);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON communication.notifications (sent_at DESC);

-- 3. Expiration Cleanup Function
-- Automatically purges notifications whose lifetime (expires_at) has elapsed
CREATE OR REPLACE FUNCTION communication.purge_expired_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    purged_count INTEGER;
BEGIN
    DELETE FROM communication.notifications
    WHERE expires_at <= clock_timestamp();
    GET DIAGNOSTICS purged_count = ROW_COUNT;
    RETURN purged_count;
END;
$$;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE communication.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Editors and Super Admins have full access to manage notifications
CREATE POLICY "notifications_editor_all" ON communication.notifications
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('editor', 'super_admin')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('editor', 'super_admin')
    );

-- Policy: Recipients can only read active non-expired notifications targeting their role/college
CREATE POLICY "notifications_recipient_select" ON communication.notifications
    FOR SELECT
    TO authenticated
    USING (
        expires_at > clock_timestamp()
        AND (
            target_role = 'all'
            OR target_role = auth.jwt() ->> 'role'
            OR (auth.jwt() ->> 'role' = 'coordinator' AND target_role IN ('coordinators', 'coordinator'))
            OR (auth.jwt() ->> 'role' = 'student' AND target_role IN ('students', 'student'))
            OR (auth.jwt() ->> 'role' = 'trainer' AND target_role IN ('trainers', 'trainer'))
        )
        AND (
            college_scope IS NULL
            OR college_scope = auth.jwt() ->> 'college_code'
        )
    );

-- Policy: Coordinators can delete notifications scoped to their campus
CREATE POLICY "notifications_coordinator_delete" ON communication.notifications
    FOR DELETE
    TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'coordinator'
        AND (college_scope = auth.jwt() ->> 'college_code' OR target_role = 'coordinator')
    );

-- 5. Expose notifications via public view for standard PostgREST API access
CREATE OR REPLACE VIEW public.notifications AS
SELECT
    id,
    title,
    message,
    target_role,
    college_scope,
    status,
    duration_days,
    expires_at,
    sent_at,
    created_at,
    created_by
FROM communication.notifications;
