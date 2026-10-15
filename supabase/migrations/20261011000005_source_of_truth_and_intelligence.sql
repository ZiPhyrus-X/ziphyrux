-- Migration: 20261011000005_source_of_truth_and_intelligence.sql
-- Description: Establishes Source of Truth and Intelligence Architecture (Layers B, C, D)
--              Guarantees separation of Authoritative Source of Truth, Authoritative Intelligence,
--              Adjusted Reporting Intelligence, and Audit Provenance.

-- 1. Metric Registry: Authoritative metadata catalog for all computed employability metrics
CREATE TABLE IF NOT EXISTS intelligence.metric_registry (
    metric_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('employability', 'competency', 'coding', 'distribution')),
    description TEXT,
    unit VARCHAR(20) NOT NULL CHECK (unit IN ('percentage', 'score', 'count', 'distribution')),
    formula TEXT NOT NULL,
    aggregation_rule VARCHAR(50) NOT NULL CHECK (aggregation_rule IN ('weighted_average', 'arithmetic_mean', 'sum', 'histogram')),
    applicable_scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_data_behavior VARCHAR(50) NOT NULL DEFAULT 'preserve_null' CHECK (missing_data_behavior IN ('preserve_null', 'exclude_from_denominator')),
    allow_editor_override BOOLEAN NOT NULL DEFAULT false,
    export_policy VARCHAR(50) NOT NULL DEFAULT 'both' CHECK (export_policy IN ('authoritative_only', 'standard_only', 'both')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Seed core authoritative metrics
INSERT INTO intelligence.metric_registry (metric_id, name, category, description, unit, formula, aggregation_rule, applicable_scopes, missing_data_behavior, allow_editor_override, export_policy)
VALUES
    ('met_readiness_score', 'Employability Readiness Score', 'employability', 'Core composite readiness metric derived from multi-domain competencies', 'percentage', '0.35 * Tech + 0.25 * Apt + 0.15 * Verbal + 0.15 * Soft + 0.10 * (CodingVerdictScore)', 'weighted_average', '["student", "section", "branch", "year", "college", "platform"]'::jsonb, 'preserve_null', true, 'both'),
    ('met_technical_competency', 'Technical Competency', 'competency', 'Technical assessment score derived from validated technical skill domains', 'percentage', 'Weighted average of domain-verified technical evaluations', 'weighted_average', '["student", "section", "branch", "year", "college", "platform"]'::jsonb, 'preserve_null', true, 'both'),
    ('met_aptitude_competency', 'Aptitude Competency', 'competency', 'Quantitative and logical problem-solving score', 'percentage', 'Weighted average of validated aptitude evaluations', 'weighted_average', '["student", "section", "branch", "year", "college", "platform"]'::jsonb, 'preserve_null', true, 'both'),
    ('met_verbal_competency', 'Verbal Competency', 'competency', 'Verbal communication and comprehension score', 'percentage', 'Weighted average of validated verbal evaluations', 'weighted_average', '["student", "section", "branch", "year", "college", "platform"]'::jsonb, 'preserve_null', true, 'both'),
    ('met_soft_skills_competency', 'Soft Skills Competency', 'competency', 'Behavioral, professional, and soft skill assessment score', 'percentage', 'Weighted average of validated behavioral evaluations', 'weighted_average', '["student", "section", "branch", "year", "college", "platform"]'::jsonb, 'preserve_null', true, 'both'),
    ('met_coding_judge_score', 'Coding Judge Score', 'coding', 'Authoritative code evaluation verdict score from test suite executions', 'score', 'Sum of testcase pass weight / total testcase weight * 100', 'arithmetic_mean', '["student", "section", "branch", "year", "college", "platform"]'::jsonb, 'preserve_null', false, 'both'),
    ('met_coding_problems_solved', 'Problems Solved', 'coding', 'Authoritative count of unique coding problems with Accepted verdict', 'count', 'COUNT(DISTINCT problem_id WHERE verdict = "Accepted")', 'sum', '["student", "section", "branch", "year", "college", "platform"]'::jsonb, 'preserve_null', false, 'both'),
    ('met_readiness_bands_distribution', 'Readiness Bands Distribution', 'distribution', 'Student distribution across industry readiness tiers', 'distribution', 'Histogram of readiness bands: High (>=75), Medium (50-74), Low (<50)', 'histogram', '["section", "branch", "year", "college", "platform"]'::jsonb, 'exclude_from_denominator', false, 'both')
ON CONFLICT (metric_id) DO UPDATE SET
    formula = EXCLUDED.formula,
    description = EXCLUDED.description,
    allow_editor_override = EXCLUDED.allow_editor_override;

-- 2. Layer B: Authoritative Intelligence Snapshots
-- Computed strictly from Layer A primary evidence without presentation overrides
CREATE TABLE IF NOT EXISTS intelligence.authoritative_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('platform', 'college', 'branch', 'year', 'section', 'student')),
    scope_id VARCHAR(100) NOT NULL,
    metrics JSONB NOT NULL,
    calculation_version VARCHAR(50) NOT NULL DEFAULT 'v2.6-engine',
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    status VARCHAR(20) NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'stale', 'archived')),
    sample_size INT,
    freshness_timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_authoritative_snapshot UNIQUE (scope, scope_id, calculation_version)
);

CREATE INDEX IF NOT EXISTS idx_auth_snapshots_scope ON intelligence.authoritative_snapshots(scope, scope_id);
CREATE INDEX IF NOT EXISTS idx_auth_snapshots_status ON intelligence.authoritative_snapshots(status);

-- 3. Layer C: Adjusted Reporting Snapshots
-- Incorporates Editor visible-value overrides and re-aggregated dependent totals
CREATE TABLE IF NOT EXISTS intelligence.adjusted_reporting_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('platform', 'college', 'branch', 'year', 'section', 'student')),
    scope_id VARCHAR(100) NOT NULL,
    metrics JSONB NOT NULL,
    active_overrides JSONB NOT NULL DEFAULT '[]'::jsonb,
    recalculation_version VARCHAR(50) NOT NULL DEFAULT 'v2.6-engine',
    recalculated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    status VARCHAR(20) NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'stale', 'archived')),
    CONSTRAINT uq_adjusted_snapshot UNIQUE (scope, scope_id, recalculation_version)
);

CREATE INDEX IF NOT EXISTS idx_adj_snapshots_scope ON intelligence.adjusted_reporting_snapshots(scope, scope_id);
CREATE INDEX IF NOT EXISTS idx_adj_snapshots_status ON intelligence.adjusted_reporting_snapshots(status);

-- 4. Recalculation Jobs: Asynchronous and observable dependency recalculations
CREATE TABLE IF NOT EXISTS intelligence.recalculation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_override_id UUID,
    affected_scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recalc_jobs_status ON intelligence.recalculation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_recalc_jobs_created ON intelligence.recalculation_jobs(created_at DESC);

-- 5. Layer D: Audit & Provenance Ledger
-- Full provenance tracking: original value, adjusted value, actor, reason, deltas, and scope impact
CREATE TABLE IF NOT EXISTS audit.override_provenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    override_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('student', 'section', 'branch', 'year', 'college', 'platform')),
    target_id VARCHAR(100) NOT NULL,
    metric_key VARCHAR(100) NOT NULL,
    original_value NUMERIC(10,2),
    adjusted_value NUMERIC(10,2) NOT NULL,
    delta NUMERIC(10,2),
    editor_login VARCHAR(100) NOT NULL,
    mandatory_reason TEXT NOT NULL,
    affected_scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    calculation_version VARCHAR(50) NOT NULL DEFAULT 'v2.6-engine',
    recalculated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_provenance_reason CHECK (length(trim(mandatory_reason)) >= 5)
);

CREATE INDEX IF NOT EXISTS idx_provenance_target ON audit.override_provenance(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_provenance_override ON audit.override_provenance(override_id);
CREATE INDEX IF NOT EXISTS idx_provenance_editor ON audit.override_provenance(editor_login);
CREATE INDEX IF NOT EXISTS idx_provenance_created ON audit.override_provenance(created_at DESC);

-- Immutable audit trigger for provenance ledger
CREATE OR REPLACE FUNCTION audit.prevent_provenance_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Override provenance ledger entries are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_provenance_immutable ON audit.override_provenance;
CREATE TRIGGER trg_provenance_immutable
BEFORE UPDATE OR DELETE ON audit.override_provenance
FOR EACH ROW EXECUTE FUNCTION audit.prevent_provenance_tampering();

-- 6. Row Level Security Policies
ALTER TABLE intelligence.metric_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence.authoritative_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence.adjusted_reporting_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence.recalculation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.override_provenance ENABLE ROW LEVEL SECURITY;

-- Metric registry: Authenticated users can read; Super Admin can modify
CREATE POLICY metric_registry_select ON intelligence.metric_registry
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY metric_registry_admin ON intelligence.metric_registry
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('super_admin'));

-- Authoritative snapshots: Read allowed by authenticated, Super Admin can manage
CREATE POLICY auth_snapshots_select ON intelligence.authoritative_snapshots
    FOR SELECT TO authenticated
    USING (
        identity.has_role('super_admin')
        OR (scope = 'college' AND scope_id = (SELECT code FROM master.colleges WHERE id = identity.current_user_college_id()))
    );

CREATE POLICY auth_snapshots_admin ON intelligence.authoritative_snapshots
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('super_admin'));

-- Adjusted reporting snapshots: Read for college roles and Super Admin
CREATE POLICY adj_snapshots_select ON intelligence.adjusted_reporting_snapshots
    FOR SELECT TO authenticated
    USING (
        identity.has_role('super_admin')
        OR (scope = 'college' AND scope_id = (SELECT code FROM master.colleges WHERE id = identity.current_user_college_id()))
        OR scope = 'platform'
    );

CREATE POLICY adj_snapshots_admin ON intelligence.adjusted_reporting_snapshots
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('super_admin'));

-- Recalculation jobs: Super Admin only
CREATE POLICY recalc_jobs_admin ON intelligence.recalculation_jobs
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('super_admin'));

-- Audit provenance: Super Admin strictly read-only, NO direct updates or deletes
CREATE POLICY provenance_read_super_admin ON audit.override_provenance
    FOR SELECT TO authenticated
    USING (identity.has_role('super_admin'));

CREATE POLICY provenance_insert_editor_admin ON audit.override_provenance
    FOR INSERT TO authenticated
    WITH CHECK (identity.has_role('editor') OR identity.has_role('super_admin'));
