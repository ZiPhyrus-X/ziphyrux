-- ============================================================================
-- Migration: 20261014000010_placement_officer_and_reporting.sql
-- Description: Placement Officer Role Architecture, Coordinator Provisioning,
--              and Dual-Layer Reporting Engine (system.data_jobs + RLS)
-- ============================================================================

-- 1. Ensure placement schema exists
CREATE SCHEMA IF NOT EXISTS placement;
CREATE SCHEMA IF NOT EXISTS system;

-- 2. placement.placement_officers Table
CREATE TABLE IF NOT EXISTS placement.placement_officers (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    college_id VARCHAR(50) NOT NULL REFERENCES master.colleges(id),
    college_code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    department_scope JSONB DEFAULT '[]'::jsonb, -- Optional array of allowed departments; empty means all
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by VARCHAR(50) NOT NULL, -- Coordinator login ID
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_placement_officers_college ON placement.placement_officers(college_code, status);
CREATE INDEX IF NOT EXISTS idx_placement_officers_user ON placement.placement_officers(user_id);

-- 3. system.data_jobs Table (Export Tracking & Audit)
CREATE TABLE IF NOT EXISTS system.data_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_code VARCHAR(20) NOT NULL,
    actor_id VARCHAR(50) NOT NULL,
    actor_role VARCHAR(30) NOT NULL,
    job_type VARCHAR(50) NOT NULL, -- e.g. 'placement.export.class', 'placement.export.batch'
    format VARCHAR(10) NOT NULL CHECK (format IN ('csv', 'xlsx', 'pdf')),
    filters JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. { "department": "CSE", "section": "A", "batch": "2026" }
    selected_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    row_count INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_data_jobs_college ON system.data_jobs(college_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_jobs_actor ON system.data_jobs(actor_id, actor_role);

-- 4. Row Level Security Policies
ALTER TABLE placement.placement_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.data_jobs ENABLE ROW LEVEL SECURITY;

-- Helper to check if current user is super admin or coordinator of the same college
CREATE OR REPLACE FUNCTION placement.is_authorized_coordinator(check_college_code VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM identity.users u
    WHERE u.id = auth.uid()::text
      AND (
        u.role = 'super_admin'
        OR (u.role = 'coordinator' AND u.college = check_college_code)
      )
  );
$$;

-- RLS: Coordinator & Super Admin can manage placement officers for their college
CREATE POLICY rls_placement_officers_manage
    ON placement.placement_officers
    FOR ALL
    USING (
      placement.is_authorized_coordinator(college_code)
      OR user_id = auth.uid()::text
    )
    WITH CHECK (
      placement.is_authorized_coordinator(college_code)
    );

-- RLS: Data jobs view and insert policies
CREATE POLICY rls_data_jobs_access
    ON system.data_jobs
    FOR SELECT
    USING (
      actor_id = auth.uid()::text
      OR placement.is_authorized_coordinator(college_code)
    );

CREATE POLICY rls_data_jobs_insert
    ON system.data_jobs
    FOR INSERT
    WITH CHECK (
      actor_id = auth.uid()::text
    );

-- 5. Updated_at Trigger
CREATE OR REPLACE FUNCTION placement.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_placement_officers_updated_at ON placement.placement_officers;
CREATE TRIGGER trg_placement_officers_updated_at
    BEFORE UPDATE ON placement.placement_officers
    FOR EACH ROW
    EXECUTE FUNCTION placement.set_updated_at();
