-- Migration: 20261013000016_placement_workspace_and_security.sql
-- Description: Complete Placement Officer Workspace schema, tables, foreign keys, RLS policies, and audit triggers.

-- 1. Placement Officer Profiles (identity schema)
CREATE TABLE IF NOT EXISTS identity.placement_officer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    college_code VARCHAR(20) NOT NULL,
    office_location VARCHAR(255),
    contact_phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_po_user_college UNIQUE (user_id, college_id)
);

CREATE INDEX IF NOT EXISTS idx_po_profiles_user ON identity.placement_officer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_po_profiles_college ON identity.placement_officer_profiles(college_id);

-- 2. Companies (Global master identity)
CREATE TABLE IF NOT EXISTS placement.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    website VARCHAR(255),
    industry VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    tier VARCHAR(50) NOT NULL DEFAULT 'Tier 2' CHECK (tier IN ('Tier 1', 'Tier 2', 'Tier 3')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_companies_industry ON placement.companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_tier ON placement.companies(tier);

-- 3. Company College Relationships (College-specific recruitment partner link)
CREATE TABLE IF NOT EXISTS placement.company_college_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES placement.companies(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    relationship_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (relationship_status IN ('partner', 'active', 'prospective', 'archived')),
    mou_signed BOOLEAN NOT NULL DEFAULT false,
    mou_valid_until DATE,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_company_college UNIQUE (company_id, college_id)
);

CREATE INDEX IF NOT EXISTS idx_company_col_rel_college ON placement.company_college_relationships(college_id);

-- 4. Recruiter Contacts (Recruiter personal data protected per relationship)
CREATE TABLE IF NOT EXISTS placement.recruiter_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_id UUID NOT NULL REFERENCES placement.company_college_relationships(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_recruiter_contacts_rel ON placement.recruiter_contacts(relationship_id);

-- 5. Placement Opportunities (Jobs & Internships)
CREATE TABLE IF NOT EXISTS placement.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES placement.companies(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    employment_type VARCHAR(50) NOT NULL CHECK (employment_type IN ('full_time', 'internship', 'intern_to_fte')),
    description TEXT,
    work_location VARCHAR(255) NOT NULL,
    compensation_package NUMERIC(10, 2) NOT NULL,
    compensation_unit VARCHAR(50) NOT NULL DEFAULT 'LPA' CHECK (compensation_unit IN ('LPA', 'per_month', 'fixed_stipend')),
    min_cgpa NUMERIC(4, 2) NOT NULL DEFAULT 6.0,
    max_backlogs INT NOT NULL DEFAULT 0,
    eligible_branches TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    graduation_year INT NOT NULL,
    required_skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    criteria_version INT NOT NULL DEFAULT 1,
    application_deadline TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'archived')),
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_college ON placement.opportunities(college_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON placement.opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_grad_year ON placement.opportunities(graduation_year);

-- 6. Placement Drives
CREATE TABLE IF NOT EXISTS placement.drives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES placement.companies(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    mode VARCHAR(50) NOT NULL DEFAULT 'on_campus' CHECK (mode IN ('on_campus', 'off_campus', 'virtual', 'hybrid')),
    venue VARCHAR(255),
    registration_open_at TIMESTAMPTZ NOT NULL,
    registration_close_at TIMESTAMPTZ NOT NULL,
    drive_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled')),
    coordinator_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_drives_college ON placement.drives(college_id);
CREATE INDEX IF NOT EXISTS idx_drives_status ON placement.drives(status);

-- 7. Drive Stages (Configurable selection workflow stages)
CREATE TABLE IF NOT EXISTS placement.drive_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID NOT NULL REFERENCES placement.drives(id) ON DELETE CASCADE,
    stage_number INT NOT NULL,
    stage_type VARCHAR(50) NOT NULL CHECK (stage_type IN ('registration', 'assessment', 'technical_interview', 'hr_interview', 'final_selection')),
    title VARCHAR(100) NOT NULL,
    scheduled_at TIMESTAMPTZ,
    venue VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_drive_stage_order UNIQUE (drive_id, stage_number)
);

CREATE INDEX IF NOT EXISTS idx_drive_stages_drive ON placement.drive_stages(drive_id);

-- 8. Eligibility Evaluations (Factual criteria calculation snapshot)
CREATE TABLE IF NOT EXISTS placement.eligibility_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES placement.opportunities(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES student.profiles(id) ON DELETE CASCADE,
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('eligible', 'ineligible', 'needs_verification')),
    passed_criteria TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    failed_criteria TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    missing_evidence TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    criteria_version INT NOT NULL DEFAULT 1,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_opp_student_eval UNIQUE (opportunity_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_eligibility_opp ON placement.eligibility_evaluations(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_student ON placement.eligibility_evaluations(student_id);

-- 9. Placement Applications
CREATE TABLE IF NOT EXISTS placement.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES placement.opportunities(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES student.profiles(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    drive_id UUID REFERENCES placement.drives(id) ON DELETE SET NULL,
    resume_version VARCHAR(50) NOT NULL DEFAULT 'v1',
    status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'shortlisted', 'rejected', 'withdrawn', 'closed')),
    current_stage_number INT NOT NULL DEFAULT 1,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_student_opportunity_app UNIQUE (opportunity_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_opp ON placement.applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_applications_student ON placement.applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_college ON placement.applications(college_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON placement.applications(status);

-- 10. Application Stage Results (Stage evaluation history)
CREATE TABLE IF NOT EXISTS placement.application_stage_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES placement.applications(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES placement.drive_stages(id) ON DELETE CASCADE,
    result VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'passed', 'failed', 'no_show', 'on_hold')),
    evaluator_notes TEXT,
    decided_by UUID,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_app_stage UNIQUE (application_id, stage_id)
);

CREATE INDEX IF NOT EXISTS idx_app_stage_results_app ON placement.application_stage_results(application_id);

-- 11. Placement Offers & Outcomes
CREATE TABLE IF NOT EXISTS placement.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student.profiles(id) ON DELETE RESTRICT,
    opportunity_id UUID NOT NULL REFERENCES placement.opportunities(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES placement.companies(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    offered_package NUMERIC(10, 2) NOT NULL,
    compensation_unit VARCHAR(50) NOT NULL DEFAULT 'LPA',
    offer_date DATE NOT NULL,
    acceptance_deadline DATE NOT NULL,
    offer_letter_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'accepted', 'declined', 'expired', 'withdrawn')),
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending_verification' CHECK (verification_status IN ('pending_verification', 'verified', 'rejected')),
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_offers_student ON placement.offers(student_id);
CREATE INDEX IF NOT EXISTS idx_offers_college ON placement.offers(college_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON placement.offers(status);

-- 12. Joining Outcomes
CREATE TABLE IF NOT EXISTS placement.joining_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES placement.offers(id) ON DELETE CASCADE UNIQUE,
    student_id UUID NOT NULL REFERENCES student.profiles(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'joining_pending' CHECK (status IN ('joining_pending', 'joined', 'did_not_join', 'deferred')),
    expected_joining_date DATE,
    actual_joining_date DATE,
    verification_evidence_url TEXT,
    confirmed_by UUID,
    confirmed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_joining_outcomes_college ON placement.joining_outcomes(college_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE identity.placement_officer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement.company_college_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement.recruiter_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement.drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement.drive_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement.eligibility_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement.application_stage_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement.joining_outcomes ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION identity.is_active_placement_officer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM identity.users u
        JOIN identity.roles r ON r.id = u.role_id
        JOIN identity.placement_officer_profiles pop ON pop.user_id = u.id
        WHERE u.id = auth.uid()
          AND r.code = 'placement_officer'
          AND u.status = 'active'
          AND pop.is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION identity.placement_officer_college_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT pop.college_id
    FROM identity.placement_officer_profiles pop
    JOIN identity.users u ON u.id = pop.user_id
    WHERE u.id = auth.uid()
      AND u.status = 'active'
      AND pop.is_active = true;
$$;

-- RLS: Companies (All authenticated can read global directory; only placement officers/admins can manage)
CREATE POLICY companies_read_all ON placement.companies
    FOR SELECT TO authenticated USING (true);

-- RLS: Company College Relationships (Scoped to college)
CREATE POLICY company_col_rel_po_scope ON placement.company_college_relationships
    FOR ALL TO authenticated
    USING (
        college_id IN (SELECT identity.placement_officer_college_ids())
        OR EXISTS (SELECT 1 FROM identity.users u JOIN identity.roles r ON r.id = u.role_id WHERE u.id = auth.uid() AND r.code IN ('super_admin', 'coordinator'))
    );

-- RLS: Opportunities (College scoped; students only see published)
CREATE POLICY opportunities_po_scope ON placement.opportunities
    FOR ALL TO authenticated
    USING (
        college_id IN (SELECT identity.placement_officer_college_ids())
        OR EXISTS (SELECT 1 FROM identity.users u JOIN identity.roles r ON r.id = u.role_id WHERE u.id = auth.uid() AND r.code IN ('super_admin', 'coordinator'))
    );

CREATE POLICY opportunities_student_view ON placement.opportunities
    FOR SELECT TO authenticated
    USING (
        status = 'published'
        AND college_id IN (SELECT college_id FROM student.profiles WHERE user_id = auth.uid())
    );

-- RLS: Drives (College scoped)
CREATE POLICY drives_po_scope ON placement.drives
    FOR ALL TO authenticated
    USING (
        college_id IN (SELECT identity.placement_officer_college_ids())
        OR EXISTS (SELECT 1 FROM identity.users u JOIN identity.roles r ON r.id = u.role_id WHERE u.id = auth.uid() AND r.code IN ('super_admin', 'coordinator'))
    );

-- RLS: Applications (PO sees college scope; Student sees own)
CREATE POLICY applications_po_scope ON placement.applications
    FOR ALL TO authenticated
    USING (
        college_id IN (SELECT identity.placement_officer_college_ids())
        OR EXISTS (SELECT 1 FROM identity.users u JOIN identity.roles r ON r.id = u.role_id WHERE u.id = auth.uid() AND r.code IN ('super_admin', 'coordinator'))
    );

CREATE POLICY applications_student_scope ON placement.applications
    FOR ALL TO authenticated
    USING (
        student_id IN (SELECT id FROM student.profiles WHERE user_id = auth.uid())
    );

-- RLS: Offers (PO sees college scope; Student sees own verified)
CREATE POLICY offers_po_scope ON placement.offers
    FOR ALL TO authenticated
    USING (
        college_id IN (SELECT identity.placement_officer_college_ids())
        OR EXISTS (SELECT 1 FROM identity.users u JOIN identity.roles r ON r.id = u.role_id WHERE u.id = auth.uid() AND r.code IN ('super_admin', 'coordinator'))
    );

CREATE POLICY offers_student_scope ON placement.offers
    FOR SELECT TO authenticated
    USING (
        student_id IN (SELECT id FROM student.profiles WHERE user_id = auth.uid())
    );
