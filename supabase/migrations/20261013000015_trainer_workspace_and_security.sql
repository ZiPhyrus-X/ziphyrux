-- ============================================================================
-- Migration: 20261013000015_trainer_workspace_and_security.sql
-- Description: Trainer Workspace Architecture, Active Allocation Scoping,
--              Read-Only Security Invariants, and Strict Class-Scoped RLS Policies
-- ============================================================================

-- 1. Trainer Profile Table (Linked to identity.users)
CREATE TABLE IF NOT EXISTS identity.trainer_profiles (
    id UUID PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    assigned_classes_count INT NOT NULL DEFAULT 0,
    bio TEXT,
    phone VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_trainer_profiles_college_id ON identity.trainer_profiles(college_id);

-- Enable RLS on trainer profiles
ALTER TABLE identity.trainer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_manage_trainer_profiles"
ON identity.trainer_profiles
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role') = 'super_admin'
)
WITH CHECK (
    (auth.jwt() ->> 'role') = 'super_admin'
);

CREATE POLICY "coordinator_manage_college_trainers"
ON identity.trainer_profiles
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role') = 'coordinator'
    AND college_id::text = (auth.jwt() ->> 'college_id')
)
WITH CHECK (
    (auth.jwt() ->> 'role') = 'coordinator'
    AND college_id::text = (auth.jwt() ->> 'college_id')
);

CREATE POLICY "trainer_view_own_profile"
ON identity.trainer_profiles
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role') = 'trainer'
    AND id = auth.uid()
);

-- 2. Trainer Read-Only RLS Policies on Academic Tables

-- A. Trainer Allocations: Trainer can only view their own active allocations within their college
CREATE POLICY "trainer_select_own_allocations"
ON academic.trainer_allocations
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role') = 'trainer'
    AND trainer_id = auth.uid()
    AND college_id::text = (auth.jwt() ->> 'college_id')
);

-- B. Academic Batches: Trainer can only view batches assigned to them
CREATE POLICY "trainer_select_assigned_batches"
ON academic.batches
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role') = 'trainer'
    AND id IN (
        SELECT batch_id FROM academic.trainer_allocations
        WHERE trainer_id = auth.uid()
        AND status = 'active'
    )
);

-- C. Batch Students: Trainer can only view students enrolled in their assigned batches
CREATE POLICY "trainer_select_assigned_students"
ON academic.batch_students
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role') = 'trainer'
    AND batch_id IN (
        SELECT batch_id FROM academic.trainer_allocations
        WHERE trainer_id = auth.uid()
        AND status = 'active'
    )
);

-- D. Schedules: Trainer can only view schedules for their allocations
CREATE POLICY "trainer_select_assigned_schedules"
ON academic.schedules
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role') = 'trainer'
    AND allocation_id IN (
        SELECT id FROM academic.trainer_allocations
        WHERE trainer_id = auth.uid()
    )
);

-- E. Action Plans: Trainer can view action plans assigned to them or their students
CREATE POLICY "trainer_select_assigned_action_plans"
ON academic.action_plans
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role') = 'trainer'
    AND (
        trainer_id = auth.uid()
        OR student_id IN (
            SELECT bs.student_id
            FROM academic.batch_students bs
            JOIN academic.trainer_allocations ta ON bs.batch_id = ta.batch_id
            WHERE ta.trainer_id = auth.uid()
            AND ta.status = 'active'
        )
    )
);

-- F. Placement Requirements: Trainer can read placement requirements within their college
CREATE POLICY "trainer_select_college_placement_requirements"
ON placement.requirements
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role') = 'trainer'
    AND college_id::text = (auth.jwt() ->> 'college_id')
);
