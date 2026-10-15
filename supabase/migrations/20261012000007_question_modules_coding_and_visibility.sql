-- Migration: 20261012000007_question_modules_coding_and_visibility.sql
-- Description: Five Default Question Modules, Module Kind (Assessment vs Coding), 
--              Configurable College Visibility, Module College Access, and RLS.

-- 1. Extend assessment.question_modules with module_kind and visibility_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'assessment' 
        AND table_name = 'question_modules' 
        AND column_name = 'module_kind'
    ) THEN
        ALTER TABLE assessment.question_modules 
        ADD COLUMN module_kind VARCHAR(30) NOT NULL DEFAULT 'assessment' CHECK (module_kind IN ('assessment', 'coding'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'assessment' 
        AND table_name = 'question_modules' 
        AND column_name = 'visibility_status'
    ) THEN
        ALTER TABLE assessment.question_modules 
        ADD COLUMN visibility_status VARCHAR(20) NOT NULL DEFAULT 'hidden' CHECK (visibility_status IN ('hidden', 'visible'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_question_modules_kind ON assessment.question_modules(module_kind);
CREATE INDEX IF NOT EXISTS idx_question_modules_visibility ON assessment.question_modules(visibility_status);

-- 2. Module College Access Table (Immutable and audited college assignment ledger)
CREATE TABLE IF NOT EXISTS assessment.module_college_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id VARCHAR(50) NOT NULL REFERENCES assessment.question_modules(id) ON DELETE CASCADE,
    college_id VARCHAR(100) NOT NULL,
    college_code VARCHAR(20),
    granted_by VARCHAR(100) NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    revoked_at TIMESTAMPTZ,
    revoked_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_module_college_access_mod ON assessment.module_college_access(module_id);
CREATE INDEX IF NOT EXISTS idx_module_college_access_col ON assessment.module_college_access(college_id);
CREATE INDEX IF NOT EXISTS idx_module_college_access_active ON assessment.module_college_access(module_id, college_id) WHERE revoked_at IS NULL;

-- 3. Coding Problems Extension & Test Cases (Coding Domain)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'coding' 
        AND table_name = 'problems' 
        AND column_name = 'module_id'
    ) THEN
        ALTER TABLE coding.problems 
        ADD COLUMN module_id VARCHAR(50) DEFAULT 'mod-code';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'coding' 
        AND table_name = 'problems' 
        AND column_name = 'time_limit_ms'
    ) THEN
        ALTER TABLE coding.problems 
        ADD COLUMN time_limit_ms INT NOT NULL DEFAULT 2000;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'coding' 
        AND table_name = 'problems' 
        AND column_name = 'memory_limit_mb'
    ) THEN
        ALTER TABLE coding.problems 
        ADD COLUMN memory_limit_mb INT NOT NULL DEFAULT 256;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'coding' 
        AND table_name = 'problems' 
        AND column_name = 'supported_languages'
    ) THEN
        ALTER TABLE coding.problems 
        ADD COLUMN supported_languages JSONB DEFAULT '["python", "javascript", "typescript", "java", "cpp", "go"]'::jsonb;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'coding' 
        AND table_name = 'problems' 
        AND column_name = 'reference_solution'
    ) THEN
        ALTER TABLE coding.problems 
        ADD COLUMN reference_solution JSONB;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS coding.test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES coding.problems(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_sample BOOLEAN NOT NULL DEFAULT false,
    explanation TEXT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_coding_test_cases_prob ON coding.test_cases(problem_id);
CREATE INDEX IF NOT EXISTS idx_coding_test_cases_sample ON coding.test_cases(problem_id, is_sample);

-- 4. Idempotently Seed the Five Default Question Modules
INSERT INTO assessment.question_modules (id, name, normalized_name, description, module_kind, visibility_status, status, created_by)
VALUES
    ('mod-tech', 'Technical', 'technical', 'Core engineering, computer science fundamentals, data structures, and algorithms.', 'assessment', 'visible', 'active', 'system'),
    ('mod-verb', 'Verbal', 'verbal', 'Workplace communication, reading comprehension, vocabulary, and grammar evaluation.', 'assessment', 'visible', 'active', 'system'),
    ('mod-apt', 'Aptitude', 'aptitude', 'Quantitative analysis, arithmetic, discrete logic, and analytical reasoning.', 'assessment', 'visible', 'active', 'system'),
    ('mod-soft', 'Soft Skills', 'soft skills', 'Behavioral, teamwork, leadership, situational judgment, and ethics scenarios.', 'assessment', 'visible', 'active', 'system'),
    ('mod-code', 'Coding', 'coding', 'Algorithmic programming problems, automated test cases, and Coding Judge execution.', 'coding', 'visible', 'active', 'system')
ON CONFLICT (normalized_name) DO UPDATE SET
    module_kind = EXCLUDED.module_kind,
    description = EXCLUDED.description;

-- 5. Seed Initial College Access for Seed Modules to Active Colleges SMP101 and SMP102
INSERT INTO assessment.module_college_access (module_id, college_id, college_code, granted_by)
SELECT m.id, c.id, c.code, 'system'
FROM assessment.question_modules m
CROSS JOIN (
    SELECT 'c0000000-0000-0000-0000-000000000001' AS id, 'SMP101' AS code
    UNION ALL
    SELECT 'c0000000-0000-0000-0000-000000000002' AS id, 'SMP102' AS code
) c
WHERE m.visibility_status = 'visible'
AND NOT EXISTS (
    SELECT 1 FROM assessment.module_college_access mca
    WHERE mca.module_id = m.id AND mca.college_id = c.id AND mca.revoked_at IS NULL
);

-- 6. Row Level Security Policies for Module College Visibility
ALTER TABLE assessment.module_college_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding.test_cases ENABLE ROW LEVEL SECURITY;

-- Module College Access RLS:
CREATE POLICY "Super Admin and Editors full access to module college access"
    ON assessment.module_college_access
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    );

CREATE POLICY "Ordinary users read college access for their assigned college"
    ON assessment.module_college_access
    FOR SELECT
    TO authenticated
    USING (
        college_id = auth.jwt() ->> 'college_id'
        AND revoked_at IS NULL
    );

-- Question Modules Selective Visibility RLS:
DROP POLICY IF EXISTS "Coordinators and Students read active question modules" ON assessment.question_modules;

CREATE POLICY "Coordinators and Students read authorized visible modules"
    ON assessment.question_modules
    FOR SELECT
    TO authenticated
    USING (
        status = 'active'
        AND (
            auth.jwt() ->> 'role' IN ('super_admin', 'editor')
            OR (
                visibility_status = 'visible'
                AND EXISTS (
                    SELECT 1 FROM assessment.module_college_access mca
                    WHERE mca.module_id = assessment.question_modules.id
                    AND mca.college_id = auth.jwt() ->> 'college_id'
                    AND mca.revoked_at IS NULL
                )
            )
        )
    );

-- Test Cases RLS (Sample visible to students, hidden ONLY to Super Admin and Editors):
CREATE POLICY "Editors and Super Admin manage all test cases"
    ON coding.test_cases
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    );

CREATE POLICY "Students read only sample test cases for published problems"
    ON coding.test_cases
    FOR SELECT
    TO authenticated
    USING (
        is_sample = true
        AND EXISTS (
            SELECT 1 FROM coding.problems p
            WHERE p.id = coding.test_cases.problem_id
            AND p.status = 'published'
        )
    );
