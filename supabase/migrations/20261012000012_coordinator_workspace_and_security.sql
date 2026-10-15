-- ============================================================================
-- Migration: 20261012000012_coordinator_workspace_and_security.sql
-- Description: Coordinator Workspace Schema, College Isolation, Single Active Coordinator
--              Constraint, and Row Level Security Policies (ZERO ATTENDANCE)
-- ============================================================================

-- 1. Invariant: Exactly One Active Coordinator Per College
-- Partial unique index guarantees at database layer that only one active coordinator account can exist per college
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_coordinator_per_college
ON identity.users (college_id)
WHERE status = 'active';

-- 2. Academic Classes & Sections Table
CREATE TABLE IF NOT EXISTS academic.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    academic_year VARCHAR(20) NOT NULL,
    branch VARCHAR(100) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    section VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_academic_class UNIQUE (college_id, academic_year, branch, semester, section)
);

CREATE INDEX IF NOT EXISTS idx_classes_college_id ON academic.classes(college_id);

-- 3. Academic Batches Table
CREATE TABLE IF NOT EXISTS academic.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    year VARCHAR(20) NOT NULL,
    section VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_college_batch_name UNIQUE (college_id, name)
);

CREATE INDEX IF NOT EXISTS idx_batches_college_id ON academic.batches(college_id);

-- 4. Academic Batch Students Membership
CREATE TABLE IF NOT EXISTS academic.batch_students (
    batch_id UUID NOT NULL REFERENCES academic.batches(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (batch_id, student_id)
);

-- 5. Trainer Allocations (Who teaches what)
CREATE TABLE IF NOT EXISTS academic.trainer_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    trainer_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES academic.batches(id) ON DELETE SET NULL,
    department VARCHAR(100) NOT NULL,
    year VARCHAR(20) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    section VARCHAR(20) NOT NULL,
    skill VARCHAR(100) NOT NULL,
    course_name VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_allocations_college_id ON academic.trainer_allocations(college_id);
CREATE INDEX IF NOT EXISTS idx_allocations_trainer_id ON academic.trainer_allocations(trainer_id);

-- 6. Training Schedules
CREATE TABLE IF NOT EXISTS academic.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    allocation_id UUID REFERENCES academic.trainer_allocations(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    mode VARCHAR(50) NOT NULL DEFAULT 'Offline' CHECK (mode IN ('Offline', 'Online', 'Hybrid')),
    location VARCHAR(200) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'requires_attention')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    completion_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_schedules_college_id ON academic.schedules(college_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON academic.schedules(date);

-- 7. Action Plans
CREATE TABLE IF NOT EXISTS academic.action_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
    student_name VARCHAR(255) NOT NULL,
    trainer_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    trainer_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    deadline DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Blocked', 'Completed')),
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_action_plans_college_id ON academic.action_plans(college_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_student_id ON academic.action_plans(student_id);

-- 8. Placement Requirements
CREATE TABLE IF NOT EXISTS placement.requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    company_name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    min_cgpa NUMERIC(4, 2) NOT NULL DEFAULT 6.0,
    eligible_branches TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    required_skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    deadline DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_placement_requirements_college_id ON placement.requirements(college_id);

-- 9. Operations Data Imports (Audit Trail for 12-Step Bulk Pipeline)
CREATE TABLE IF NOT EXISTS operations.data_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    batch_code VARCHAR(100) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    total_rows INT NOT NULL DEFAULT 0,
    valid_rows INT NOT NULL DEFAULT 0,
    rejected_rows INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'preview' CHECK (status IN ('preview', 'committed', 'failed')),
    errors JSONB DEFAULT '[]'::jsonb,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    committed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_imports_college_id ON operations.data_imports(college_id);

-- 10. Enable Row Level Security (RLS) on all coordinator tables
ALTER TABLE academic.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic.batch_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic.trainer_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic.action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations.data_imports ENABLE ROW LEVEL SECURITY;

-- 11. Strict College Isolation RLS Policies
-- Super Admin can manage all; Coordinator is strictly confined to current_user_college_id()

-- Academic Classes
CREATE POLICY classes_coordinator_scope ON academic.classes
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin') OR college_id = identity.current_user_college_id())
    WITH CHECK (identity.has_role('super_admin') OR college_id = identity.current_user_college_id());

-- Academic Batches
CREATE POLICY batches_coordinator_scope ON academic.batches
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin') OR college_id = identity.current_user_college_id())
    WITH CHECK (identity.has_role('super_admin') OR college_id = identity.current_user_college_id());

-- Batch Students
CREATE POLICY batch_students_coordinator_scope ON academic.batch_students
    FOR ALL TO authenticated
    USING (
        identity.has_role('super_admin')
        OR batch_id IN (SELECT id FROM academic.batches WHERE college_id = identity.current_user_college_id())
    )
    WITH CHECK (
        identity.has_role('super_admin')
        OR batch_id IN (SELECT id FROM academic.batches WHERE college_id = identity.current_user_college_id())
    );

-- Trainer Allocations
CREATE POLICY allocations_coordinator_scope ON academic.trainer_allocations
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin') OR college_id = identity.current_user_college_id())
    WITH CHECK (identity.has_role('super_admin') OR college_id = identity.current_user_college_id());

-- Schedules
CREATE POLICY schedules_coordinator_scope ON academic.schedules
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin') OR college_id = identity.current_user_college_id())
    WITH CHECK (identity.has_role('super_admin') OR college_id = identity.current_user_college_id());

-- Action Plans
CREATE POLICY action_plans_coordinator_scope ON academic.action_plans
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin') OR college_id = identity.current_user_college_id())
    WITH CHECK (identity.has_role('super_admin') OR college_id = identity.current_user_college_id());

-- Placement Requirements
CREATE POLICY placement_reqs_coordinator_scope ON placement.requirements
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin') OR college_id = identity.current_user_college_id())
    WITH CHECK (identity.has_role('super_admin') OR college_id = identity.current_user_college_id());

-- Data Imports
CREATE POLICY data_imports_coordinator_scope ON operations.data_imports
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin') OR college_id = identity.current_user_college_id())
    WITH CHECK (identity.has_role('super_admin') OR college_id = identity.current_user_college_id());
