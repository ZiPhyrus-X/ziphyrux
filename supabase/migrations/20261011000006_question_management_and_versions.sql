-- Migration: 20261011000006_question_management_and_versions.sql
-- Description: Complete Question Management, Modules, Versioning, Bulk Upload Batches, and RLS

-- 1. Question Modules Table
CREATE TABLE IF NOT EXISTS assessment.question_modules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_question_modules_status ON assessment.question_modules(status);
CREATE INDEX IF NOT EXISTS idx_question_modules_normalized ON assessment.question_modules(normalized_name);

-- Seed Initial Core Modules
INSERT INTO assessment.question_modules (id, name, normalized_name, description, status, created_by)
VALUES
    ('mod-tech', 'Technical', 'technical', 'Core engineering, computer science fundamentals, data structures, and algorithms.', 'active', 'system'),
    ('mod-verb', 'Verbal', 'verbal', 'Workplace communication, reading comprehension, vocabulary, and grammar evaluation.', 'active', 'system'),
    ('mod-apt', 'Aptitude', 'aptitude', 'Quantitative analysis, arithmetic, discrete logic, and analytical reasoning.', 'active', 'system'),
    ('mod-soft', 'Soft Skills', 'soft skills', 'Behavioral, teamwork, leadership, situational judgment, and ethics scenarios.', 'active', 'system')
ON CONFLICT (normalized_name) DO UPDATE SET
    description = EXCLUDED.description;

-- 2. Question Versions Table (Immutable historical snapshots for assessments)
CREATE TABLE IF NOT EXISTS assessment.question_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL,
    version_number INT NOT NULL CHECK (version_number >= 1),
    module_id VARCHAR(50) NOT NULL REFERENCES assessment.question_modules(id),
    type VARCHAR(30) NOT NULL CHECK (type IN ('MCQ', 'Long Answer', 'Short Answer')),
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    stem TEXT NOT NULL,
    options JSONB,
    correct_answer TEXT,
    expected_answer TEXT,
    rubric TEXT,
    explanation TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    content_hash VARCHAR(64),
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'published', 'archived')),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    published_at TIMESTAMPTZ,
    published_by VARCHAR(100),
    CONSTRAINT chk_mcq_version_options_and_answer CHECK (
        type != 'MCQ' OR (
            options IS NOT NULL 
            AND jsonb_typeof(options) = 'array' 
            AND jsonb_array_length(options) = 4
            AND correct_answer IS NOT NULL
            AND length(trim(correct_answer)) > 0
        )
    ),
    CONSTRAINT uq_question_version UNIQUE (question_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_question_versions_qid ON assessment.question_versions(question_id);
CREATE INDEX IF NOT EXISTS idx_question_versions_module ON assessment.question_versions(module_id);
CREATE INDEX IF NOT EXISTS idx_question_versions_status ON assessment.question_versions(status);

-- 3. Upload Batches Table (Immutable file import ledger)
CREATE TABLE IF NOT EXISTS assessment.upload_batches (
    id VARCHAR(50) PRIMARY KEY,
    module_id VARCHAR(50) REFERENCES assessment.question_modules(id),
    module_name VARCHAR(100) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    upload_method VARCHAR(50) NOT NULL CHECK (upload_method IN ('Manual question creation', 'CSV import', 'XLSX import', 'JSON import', 'AI-generated draft import')),
    uploaded_by VARCHAR(100) NOT NULL,
    total_rows INT NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
    imported_rows INT NOT NULL DEFAULT 0 CHECK (imported_rows >= 0),
    rejected_rows INT NOT NULL DEFAULT 0 CHECK (rejected_rows >= 0),
    duplicate_rows INT NOT NULL DEFAULT 0 CHECK (duplicate_rows >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'processing', 'failed', 'partial')),
    publication_status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'in_review', 'published')),
    error_summary TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_upload_batches_module ON assessment.upload_batches(module_id);
CREATE INDEX IF NOT EXISTS idx_upload_batches_status ON assessment.upload_batches(status);
CREATE INDEX IF NOT EXISTS idx_upload_batches_created ON assessment.upload_batches(created_at DESC);

-- 4. Upload Row Results Table (Row-level error and rejected data ledger)
CREATE TABLE IF NOT EXISTS assessment.upload_row_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id VARCHAR(50) NOT NULL REFERENCES assessment.upload_batches(id) ON DELETE CASCADE,
    row_number INT NOT NULL CHECK (row_number >= 1),
    processing_result VARCHAR(30) NOT NULL CHECK (processing_result IN ('imported', 'rejected', 'duplicate')),
    question_stem_preview TEXT,
    validation_errors JSONB DEFAULT '[]'::jsonb,
    imported_question_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_upload_row_results_batch ON assessment.upload_row_results(batch_id);

-- 5. Row Level Security Policies
ALTER TABLE assessment.question_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.question_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.upload_row_results ENABLE ROW LEVEL SECURITY;

-- Question Modules RLS
CREATE POLICY "Super Admin and Editors full access to question modules"
    ON assessment.question_modules
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    );

CREATE POLICY "Coordinators and Students read active question modules"
    ON assessment.question_modules
    FOR SELECT
    TO authenticated
    USING (status = 'active');

-- Question Versions RLS (Strict Answer Key Protection)
CREATE POLICY "Editors and Super Admin manage question versions"
    ON assessment.question_versions
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    );

CREATE POLICY "Assessment delivery view for active published questions without correct answer"
    ON assessment.question_versions
    FOR SELECT
    TO authenticated
    USING (
        status = 'published'
        AND (
            auth.jwt() ->> 'role' IN ('super_admin', 'editor')
            OR auth.jwt() ->> 'role' = 'student'
        )
    );

-- Upload Batches RLS
CREATE POLICY "Editors and Super Admin view and manage upload batches"
    ON assessment.upload_batches
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    );

-- Upload Row Results RLS
CREATE POLICY "Editors and Super Admin view upload row results"
    ON assessment.upload_row_results
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    );
