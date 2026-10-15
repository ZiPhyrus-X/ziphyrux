-- ============================================================================
-- Migration: 20261013000014_coordinator_registration_tokens_and_onboarding.sql
-- Description: Authoritative Registration Tokens, 1-Hour Expiration, Revocation,
--              and Student 5-Step Onboarding Schema
-- ============================================================================

-- 1. Create Registration Tokens Table in identity schema
CREATE TABLE IF NOT EXISTS identity.registration_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) NOT NULL UNIQUE,
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE CASCADE,
    college_code VARCHAR(50) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'expired', 'revoked')),
    consumed_at TIMESTAMPTZ,
    consumed_by_student_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    consumed_by_student_name VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_reg_tokens_college_id ON identity.registration_tokens(college_id);
CREATE INDEX IF NOT EXISTS idx_reg_tokens_token ON identity.registration_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reg_tokens_status ON identity.registration_tokens(status);
CREATE INDEX IF NOT EXISTS idx_reg_tokens_expires_at ON identity.registration_tokens(expires_at);

-- 3. Enable Row Level Security
ALTER TABLE identity.registration_tokens ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Super Admin: Full Access
CREATE POLICY "super_admin_manage_registration_tokens"
ON identity.registration_tokens
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role') = 'super_admin'
)
WITH CHECK (
    (auth.jwt() ->> 'role') = 'super_admin'
);

-- Coordinator: Select, Insert, Update strictly scoped to their assigned college
CREATE POLICY "coordinator_select_assigned_registration_tokens"
ON identity.registration_tokens
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role') = 'coordinator'
    AND college_id::text = (auth.jwt() ->> 'college_id')
);

CREATE POLICY "coordinator_insert_assigned_registration_tokens"
ON identity.registration_tokens
FOR INSERT
TO authenticated
WITH CHECK (
    (auth.jwt() ->> 'role') = 'coordinator'
    AND college_id::text = (auth.jwt() ->> 'college_id')
);

CREATE POLICY "coordinator_update_assigned_registration_tokens"
ON identity.registration_tokens
FOR UPDATE
TO authenticated
USING (
    (auth.jwt() ->> 'role') = 'coordinator'
    AND college_id::text = (auth.jwt() ->> 'college_id')
)
WITH CHECK (
    (auth.jwt() ->> 'role') = 'coordinator'
    AND college_id::text = (auth.jwt() ->> 'college_id')
);

-- Public / Anon: Read-only access to verify valid tokens for registration onboarding
CREATE POLICY "anon_verify_registration_tokens"
ON identity.registration_tokens
FOR SELECT
TO anon
USING (
    status = 'active' AND expires_at > clock_timestamp()
);
