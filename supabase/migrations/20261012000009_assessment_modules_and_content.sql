-- Migration: 20261012000009_assessment_modules_and_content.sql
-- Description: Complete Assessment Modules Architecture, Assessments Repository,
--              Multi-Tenant College Visibility, Cascading Deletion, and Row Level Security.

-- 1. Assessment Modules Table (Independent modular container for assessment blueprints)
CREATE TABLE IF NOT EXISTS assessment.assessment_modules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(100) NOT NULL UNIQUE,
    domain VARCHAR(50) NOT NULL CHECK (domain IN ('Technical', 'Aptitude', 'Verbal', 'Soft Skills', 'Coding', 'Core Engineering')),
    description TEXT,
    visibility_status VARCHAR(20) NOT NULL DEFAULT 'hidden' CHECK (visibility_status IN ('visible', 'hidden')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_assessment_modules_status ON assessment.assessment_modules(status);
CREATE INDEX IF NOT EXISTS idx_assessment_modules_visibility ON assessment.assessment_modules(visibility_status);
CREATE INDEX IF NOT EXISTS idx_assessment_modules_domain ON assessment.assessment_modules(domain);

-- 2. Assessment Module College Access Table (Multi-tenant college authorization ledger)
CREATE TABLE IF NOT EXISTS assessment.assessment_module_college_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id VARCHAR(50) NOT NULL REFERENCES assessment.assessment_modules(id) ON DELETE CASCADE,
    college_id VARCHAR(100) NOT NULL,
    college_code VARCHAR(20),
    granted_by VARCHAR(100) NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    revoked_at TIMESTAMPTZ,
    revoked_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_assessment_mca_module ON assessment.assessment_module_college_access(module_id);
CREATE INDEX IF NOT EXISTS idx_assessment_mca_college ON assessment.assessment_module_college_access(college_id);
CREATE INDEX IF NOT EXISTS idx_assessment_mca_active ON assessment.assessment_module_college_access(module_id, college_id) WHERE revoked_at IS NULL;

-- 3. Assessments Table (Diagnostic assessments and blueprints scoped to assessment modules)
CREATE TABLE IF NOT EXISTS assessment.assessments (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    module_id VARCHAR(50) NOT NULL REFERENCES assessment.assessment_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    domain VARCHAR(50) NOT NULL CHECK (domain IN ('Technical', 'Aptitude', 'Verbal', 'Soft Skills', 'Coding', 'Core Engineering')),
    difficulty VARCHAR(20) NOT NULL DEFAULT 'Intermediate' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    duration_minutes INT NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
    total_marks INT NOT NULL DEFAULT 100 CHECK (total_marks > 0),
    passing_marks INT NOT NULL DEFAULT 40 CHECK (passing_marks >= 0),
    questions_count INT NOT NULL DEFAULT 25 CHECK (questions_count >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'published', 'archived')),
    current_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_assessments_module ON assessment.assessments(module_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessment.assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_domain ON assessment.assessments(domain);

-- 4. Assessment Sections Table (Modular chapters/sections within an assessment)
CREATE TABLE IF NOT EXISTS assessment.assessment_sections (
    id VARCHAR(50) PRIMARY KEY,
    assessment_id VARCHAR(50) NOT NULL REFERENCES assessment.assessments(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    section_order INT NOT NULL DEFAULT 1,
    duration_minutes INT DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_assessment_sections_assessment ON assessment.assessment_sections(assessment_id);

-- 5. Assessment Items Table (Question & Coding Problem linkage)
CREATE TABLE IF NOT EXISTS assessment.assessment_items (
    id VARCHAR(50) PRIMARY KEY,
    assessment_id VARCHAR(50) NOT NULL REFERENCES assessment.assessments(id) ON DELETE CASCADE,
    section_id VARCHAR(50) REFERENCES assessment.assessment_sections(id) ON DELETE CASCADE,
    question_id UUID REFERENCES assessment.questions(id) ON DELETE SET NULL,
    item_type VARCHAR(30) NOT NULL DEFAULT 'question' CHECK (item_type IN ('question', 'coding_problem', 'custom')),
    marks INT NOT NULL DEFAULT 1,
    item_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_assessment_items_assessment ON assessment.assessment_items(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_items_question ON assessment.assessment_items(question_id);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE assessment.assessment_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.assessment_module_college_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.assessment_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.assessment_items ENABLE ROW LEVEL SECURITY;

-- Editors and Super Admins have complete read/write/delete privileges
CREATE POLICY superadmin_editor_assessment_modules_all
ON assessment.assessment_modules FOR ALL
TO authenticated
USING (
    COALESCE(auth.jwt() ->> 'role', '') IN ('super_admin', 'editor')
    OR COALESCE(current_setting('request.jwt.claim.role', true), '') IN ('super_admin', 'editor')
);

CREATE POLICY superadmin_editor_assessment_college_access_all
ON assessment.assessment_module_college_access FOR ALL
TO authenticated
USING (
    COALESCE(auth.jwt() ->> 'role', '') IN ('super_admin', 'editor')
    OR COALESCE(current_setting('request.jwt.claim.role', true), '') IN ('super_admin', 'editor')
);

CREATE POLICY superadmin_editor_assessments_all
ON assessment.assessments FOR ALL
TO authenticated
USING (
    COALESCE(auth.jwt() ->> 'role', '') IN ('super_admin', 'editor')
    OR COALESCE(current_setting('request.jwt.claim.role', true), '') IN ('super_admin', 'editor')
);

CREATE POLICY superadmin_editor_assessment_sections_all
ON assessment.assessment_sections FOR ALL
TO authenticated
USING (
    COALESCE(auth.jwt() ->> 'role', '') IN ('super_admin', 'editor')
    OR COALESCE(current_setting('request.jwt.claim.role', true), '') IN ('super_admin', 'editor')
);

CREATE POLICY superadmin_editor_assessment_items_all
ON assessment.assessment_items FOR ALL
TO authenticated
USING (
    COALESCE(auth.jwt() ->> 'role', '') IN ('super_admin', 'editor')
    OR COALESCE(current_setting('request.jwt.claim.role', true), '') IN ('super_admin', 'editor')
);

-- Coordinators and Trainers can read published assessments belonging to modules visible to their college
CREATE POLICY coordinator_trainer_read_published_assessments
ON assessment.assessments FOR SELECT
TO authenticated
USING (
    status = 'published'
    AND EXISTS (
        SELECT 1 FROM assessment.assessment_module_college_access mca
        JOIN assessment.assessment_modules m ON m.id = mca.module_id
        WHERE mca.module_id = assessment.assessments.module_id
          AND mca.revoked_at IS NULL
          AND m.visibility_status = 'visible'
          AND m.status = 'active'
          AND (
              mca.college_id = (auth.jwt() ->> 'college_id')
              OR mca.college_code = (auth.jwt() ->> 'college_code')
          )
    )
);

-- Students can read published assessments assigned to their college
CREATE POLICY student_read_published_assessments
ON assessment.assessments FOR SELECT
TO authenticated
USING (
    status = 'published'
    AND EXISTS (
        SELECT 1 FROM assessment.assessment_module_college_access mca
        JOIN assessment.assessment_modules m ON m.id = mca.module_id
        WHERE mca.module_id = assessment.assessments.module_id
          AND mca.revoked_at IS NULL
          AND m.visibility_status = 'visible'
          AND m.status = 'active'
          AND (
              mca.college_id = (auth.jwt() ->> 'college_id')
              OR mca.college_code = (auth.jwt() ->> 'college_code')
          )
    )
);

-- -----------------------------------------------------------------------------
-- IDEMPOTENT SEED DATA
-- -----------------------------------------------------------------------------
INSERT INTO assessment.assessment_modules (id, name, normalized_name, domain, description, visibility_status, status, created_by)
VALUES
    ('mod-asm-tech', 'Technical Assessment', 'technical', 'Technical', 'Core computer science, engineering fundamentals, system design and data structures diagnostic benchmarks.', 'visible', 'active', 'system'),
    ('mod-asm-apt', 'Aptitude Assessment', 'aptitude', 'Aptitude', 'Quantitative analysis, logical reasoning, numerical calculation and abstract problem solving.', 'visible', 'active', 'system'),
    ('mod-asm-vrb', 'Verbal Assessment', 'verbal', 'Verbal', 'Workplace communication, comprehension, vocabulary and business English proficiency.', 'visible', 'active', 'system'),
    ('mod-asm-soft', 'Soft Skills Assessment', 'soft_skills', 'Soft Skills', 'Leadership, teamwork, emotional intelligence, presentation, and workplace ethics evaluations.', 'visible', 'active', 'system'),
    ('mod-asm-code', 'Coding Diagnostic', 'coding', 'Coding', 'Algorithmic programming challenges, hands-on debugging, and automated test-suite verification.', 'visible', 'active', 'system')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    normalized_name = EXCLUDED.normalized_name,
    domain = EXCLUDED.domain,
    description = EXCLUDED.description,
    updated_at = clock_timestamp();

-- Seed initial college visibility access (SMP101 & SMP102)
INSERT INTO assessment.assessment_module_college_access (id, module_id, college_id, college_code, granted_by)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'mod-asm-tech', 'c0000000-0000-0000-0000-000000000001', 'SMP101', 'system'),
    ('a0000000-0000-0000-0000-000000000002', 'mod-asm-tech', 'c0000000-0000-0000-0000-000000000002', 'SMP102', 'system'),
    ('a0000000-0000-0000-0000-000000000003', 'mod-asm-apt', 'c0000000-0000-0000-0000-000000000001', 'SMP101', 'system'),
    ('a0000000-0000-0000-0000-000000000004', 'mod-asm-code', 'c0000000-0000-0000-0000-000000000001', 'SMP101', 'system')
ON CONFLICT (id) DO NOTHING;

-- Seed initial assessments
INSERT INTO assessment.assessments (id, code, module_id, title, description, domain, difficulty, duration_minutes, total_marks, passing_marks, questions_count, status, current_version, created_by)
VALUES
    ('asm-1', 'ASM-TECH01', 'mod-asm-tech', 'Core CS Fundamentals Diagnostic', 'Comprehensive diagnostic evaluating algorithms, OS, DBMS, and OOP mastery.', 'Technical', 'Intermediate', 60, 100, 40, 25, 'published', 'v1.1', 'system'),
    ('asm-2', 'ASM-APT02', 'mod-asm-apt', 'Quantitative Aptitude & Logic Benchmark', 'Timed benchmark testing quantitative speed, arithmetic reasoning, and pattern logic.', 'Aptitude', 'Intermediate', 45, 100, 50, 30, 'published', 'v2.0', 'system'),
    ('asm-3', 'ASM-VRB03', 'mod-asm-vrb', 'Verbal & Communication Readiness', 'Diagnostic assessing workplace reading comprehension, grammar precision, and verbal logic.', 'Verbal', 'Beginner', 30, 50, 20, 20, 'draft', 'v1.0', 'system'),
    ('asm-4', 'ASM-CODE01', 'mod-asm-code', 'Algorithmic Problem Solving Benchmark', 'Automated coding judge assessment with comprehensive test suites.', 'Coding', 'Advanced', 90, 100, 60, 4, 'published', 'v1.0', 'system')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    module_id = EXCLUDED.module_id,
    updated_at = clock_timestamp();
