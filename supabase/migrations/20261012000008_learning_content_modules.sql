-- Migration: 20261012000008_learning_content_modules.sql
-- Description: Complete Learning Content Module-Wise Architecture, Educational Hierarchy
--              (Course -> Course Version -> Course Module -> Topic -> Lesson -> Activity),
--              Upload History Batches, College Visibility, and Row Level Security.

-- 1. Learning Modules Table (Independent from assessment.question_modules)
CREATE TABLE IF NOT EXISTS learning.learning_modules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    visibility_status VARCHAR(20) NOT NULL DEFAULT 'hidden' CHECK (visibility_status IN ('hidden', 'visible')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_learning_modules_status ON learning.learning_modules(status);
CREATE INDEX IF NOT EXISTS idx_learning_modules_visibility ON learning.learning_modules(visibility_status);

-- 2. Learning Module College Access Table (Audited college assignment ledger)
CREATE TABLE IF NOT EXISTS learning.learning_module_college_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id VARCHAR(50) NOT NULL REFERENCES learning.learning_modules(id) ON DELETE CASCADE,
    college_id VARCHAR(100) NOT NULL,
    college_code VARCHAR(20),
    granted_by VARCHAR(100) NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    revoked_at TIMESTAMPTZ,
    revoked_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_learning_mca_module ON learning.learning_module_college_access(module_id);
CREATE INDEX IF NOT EXISTS idx_learning_mca_college ON learning.learning_module_college_access(college_id);
CREATE INDEX IF NOT EXISTS idx_learning_mca_active ON learning.learning_module_college_access(module_id, college_id) WHERE revoked_at IS NULL;

-- 3. Courses Table (Root entity associated with a learning module)
CREATE TABLE IF NOT EXISTS learning.courses (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    learning_module_id VARCHAR(50) NOT NULL REFERENCES learning.learning_modules(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) NOT NULL DEFAULT 'Beginner' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    prerequisites TEXT,
    learning_objectives JSONB DEFAULT '[]'::jsonb,
    estimated_duration_hours INT NOT NULL DEFAULT 10,
    thumbnail_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'published', 'archived')),
    current_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    published_at TIMESTAMPTZ,
    published_by VARCHAR(100),
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_courses_module ON learning.courses(learning_module_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON learning.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON learning.courses(difficulty);

-- 4. Course Versions Table (Immutable/Stable version snapshots)
CREATE TABLE IF NOT EXISTS learning.course_versions (
    id VARCHAR(50) PRIMARY KEY,
    course_id VARCHAR(50) NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    version_number VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'published', 'archived')),
    structure_snapshot JSONB,
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    published_at TIMESTAMPTZ,
    published_by VARCHAR(100),
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_course_versions_course ON learning.course_versions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_versions_status ON learning.course_versions(status);

-- 5. Course Modules Table (Internal chapters/units within a course version)
CREATE TABLE IF NOT EXISTS learning.course_modules (
    id VARCHAR(50) PRIMARY KEY,
    course_version_id VARCHAR(50) NOT NULL REFERENCES learning.course_versions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_course_modules_version ON learning.course_modules(course_version_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_order ON learning.course_modules(course_version_id, sort_order);

-- 6. Course Topics Table (Topics within a course module chapter)
CREATE TABLE IF NOT EXISTS learning.course_topics (
    id VARCHAR(50) PRIMARY KEY,
    course_module_id VARCHAR(50) NOT NULL REFERENCES learning.course_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_course_topics_module ON learning.course_topics(course_module_id);
CREATE INDEX IF NOT EXISTS idx_course_topics_order ON learning.course_topics(course_module_id, sort_order);

-- 7. Course Lessons Table (Lessons within a topic)
CREATE TABLE IF NOT EXISTS learning.course_lessons (
    id VARCHAR(50) PRIMARY KEY,
    topic_id VARCHAR(50) NOT NULL REFERENCES learning.course_topics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    lesson_type VARCHAR(50) NOT NULL DEFAULT 'reading' CHECK (lesson_type IN ('reading', 'video', 'notes', 'code_example', 'practice_question', 'coding_exercise', 'interactive')),
    lesson_content TEXT,
    duration_minutes INT NOT NULL DEFAULT 15,
    asset_url TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_course_lessons_topic ON learning.course_lessons(topic_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_order ON learning.course_lessons(topic_id, sort_order);

-- 8. Learning Activities Table (Linked practice, video, or reading tasks inside a lesson)
CREATE TABLE IF NOT EXISTS learning.learning_activities (
    id VARCHAR(50) PRIMARY KEY,
    lesson_id VARCHAR(50) NOT NULL REFERENCES learning.course_lessons(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('reading', 'video', 'notes', 'practice_question', 'coding_exercise', 'interactive')),
    title VARCHAR(255) NOT NULL,
    configuration JSONB DEFAULT '{}'::jsonb,
    linked_question_id VARCHAR(100),
    linked_problem_id VARCHAR(100),
    sort_order INT NOT NULL DEFAULT 0,
    completion_policy VARCHAR(50) NOT NULL DEFAULT 'view' CHECK (completion_policy IN ('view', 'passing_score', 'accepted_verdict', 'manual_acknowledge')),
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_learning_activities_lesson ON learning.learning_activities(lesson_id);
CREATE INDEX IF NOT EXISTS idx_learning_activities_question ON learning.learning_activities(linked_question_id) WHERE linked_question_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_learning_activities_problem ON learning.learning_activities(linked_problem_id) WHERE linked_problem_id IS NOT NULL;

-- 9. Learning Assets Table (Files, PDFs, video metadata)
CREATE TABLE IF NOT EXISTS learning.learning_assets (
    id VARCHAR(50) PRIMARY KEY,
    owner_content_id VARCHAR(100) NOT NULL,
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'learning-content',
    storage_path TEXT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_learning_assets_owner ON learning.learning_assets(owner_content_id);

-- 10. Learning Import Batches Table (Upload & Bulk Ingestion History)
CREATE TABLE IF NOT EXISTS learning.learning_import_batches (
    id VARCHAR(50) PRIMARY KEY,
    learning_module_id VARCHAR(50) NOT NULL REFERENCES learning.learning_modules(id) ON DELETE RESTRICT,
    module_name VARCHAR(100) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    upload_method VARCHAR(50) NOT NULL DEFAULT 'ZIP import',
    format VARCHAR(50) NOT NULL DEFAULT 'zip',
    uploaded_by VARCHAR(100) NOT NULL,
    total_items INT NOT NULL DEFAULT 0,
    imported_items INT NOT NULL DEFAULT 0,
    rejected_items INT NOT NULL DEFAULT 0,
    duplicate_items INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
    publication_status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'in_review', 'published')),
    error_summary TEXT,
    validation_results JSONB DEFAULT '{}'::jsonb,
    rejected_details JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_learning_import_batches_module ON learning.learning_import_batches(learning_module_id);
CREATE INDEX IF NOT EXISTS idx_learning_import_batches_status ON learning.learning_import_batches(status);
CREATE INDEX IF NOT EXISTS idx_learning_import_batches_created ON learning.learning_import_batches(created_at DESC);

-- 11. Student Learning Progress Table
CREATE TABLE IF NOT EXISTS learning.student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(100) NOT NULL,
    college_id VARCHAR(100) NOT NULL,
    course_id VARCHAR(50) NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    course_version_id VARCHAR(50) NOT NULL REFERENCES learning.course_versions(id) ON DELETE CASCADE,
    lesson_id VARCHAR(50) NOT NULL REFERENCES learning.course_lessons(id) ON DELETE CASCADE,
    activity_id VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    evidence_type VARCHAR(50) NOT NULL DEFAULT 'reading' CHECK (evidence_type IN ('reading', 'video_watched', 'mcq_submitted', 'code_accepted')),
    evidence_reference TEXT,
    score NUMERIC(5, 2),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_learning_progress_student ON learning.student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_course ON learning.student_progress(course_id, student_id);

-- 12. Idempotently Seed the Five Default Learning Modules
INSERT INTO learning.learning_modules (id, name, normalized_name, description, visibility_status, status, created_by)
VALUES
    ('mod-learn-tech', 'Technical', 'technical', 'Core computer science, software engineering, systems architecture, databases, and algorithms.', 'visible', 'active', 'system'),
    ('mod-learn-verb', 'Verbal', 'verbal', 'Workplace communication, reading comprehension, professional vocabulary, and presentation skills.', 'visible', 'active', 'system'),
    ('mod-learn-apt', 'Aptitude', 'aptitude', 'Quantitative problem solving, discrete mathematical foundations, and analytical reasoning.', 'visible', 'active', 'system'),
    ('mod-learn-soft', 'Soft Skills', 'soft skills', 'Leadership, collaboration, situational judgment, workplace ethics, and emotional intelligence.', 'visible', 'active', 'system'),
    ('mod-learn-code', 'Coding', 'coding', 'Algorithmic programming practice, data structures implementation, and automated judge integration.', 'visible', 'active', 'system')
ON CONFLICT (normalized_name) DO UPDATE SET
    description = EXCLUDED.description;

-- 13. Seed Initial College Access for Seed Modules to Active Colleges SMP101 and SMP102
INSERT INTO learning.learning_module_college_access (module_id, college_id, college_code, granted_by)
SELECT m.id, c.id, c.code, 'system'
FROM learning.learning_modules m
CROSS JOIN (
    SELECT 'c0000000-0000-0000-0000-000000000001' AS id, 'SMP101' AS code
    UNION ALL
    SELECT 'c0000000-0000-0000-0000-000000000002' AS id, 'SMP102' AS code
) c
WHERE m.visibility_status = 'visible'
AND NOT EXISTS (
    SELECT 1 FROM learning.learning_module_college_access lmca
    WHERE lmca.module_id = m.id AND lmca.college_id = c.id AND lmca.revoked_at IS NULL
);

-- 14. Enable Row Level Security (RLS)
ALTER TABLE learning.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.learning_module_college_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.course_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.course_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.learning_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.learning_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.learning_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.student_progress ENABLE ROW LEVEL SECURITY;

-- 15. RLS Policies

-- Learning Modules RLS:
CREATE POLICY "Super Admin and Editors full access to learning modules"
    ON learning.learning_modules
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    );

CREATE POLICY "Ordinary users read authorized visible learning modules"
    ON learning.learning_modules
    FOR SELECT
    TO authenticated
    USING (
        status = 'active'
        AND visibility_status = 'visible'
        AND EXISTS (
            SELECT 1 FROM learning.learning_module_college_access lmca
            WHERE lmca.module_id = learning.learning_modules.id
            AND lmca.college_id = auth.jwt() ->> 'college_id'
            AND lmca.revoked_at IS NULL
        )
    );

-- Learning Module College Access RLS:
CREATE POLICY "Super Admin and Editors full access to learning module college access"
    ON learning.learning_module_college_access
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    );

CREATE POLICY "Ordinary users read college access for their assigned college"
    ON learning.learning_module_college_access
    FOR SELECT
    TO authenticated
    USING (
        college_id = auth.jwt() ->> 'college_id'
        AND revoked_at IS NULL
    );

-- Courses RLS:
CREATE POLICY "Editors and Super Admin manage all courses"
    ON learning.courses
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    );

CREATE POLICY "Students read published courses for their authorized college"
    ON learning.courses
    FOR SELECT
    TO authenticated
    USING (
        status = 'published'
        AND EXISTS (
            SELECT 1 FROM learning.learning_module_college_access lmca
            WHERE lmca.module_id = learning.courses.learning_module_id
            AND lmca.college_id = auth.jwt() ->> 'college_id'
            AND lmca.revoked_at IS NULL
        )
    );

-- Course Versions RLS:
CREATE POLICY "Editors and Super Admin manage course versions"
    ON learning.course_versions
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('super_admin', 'editor')
    );

CREATE POLICY "Students read published course versions"
    ON learning.course_versions
    FOR SELECT
    TO authenticated
    USING (
        status = 'published'
    );

-- Course Content Hierarchy (Modules, Topics, Lessons, Activities):
CREATE POLICY "Editors and Super Admin manage course modules"
    ON learning.course_modules FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('super_admin', 'editor'))
    WITH CHECK (auth.jwt() ->> 'role' IN ('super_admin', 'editor'));

CREATE POLICY "Students read course modules"
    ON learning.course_modules FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Editors and Super Admin manage course topics"
    ON learning.course_topics FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('super_admin', 'editor'))
    WITH CHECK (auth.jwt() ->> 'role' IN ('super_admin', 'editor'));

CREATE POLICY "Students read course topics"
    ON learning.course_topics FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Editors and Super Admin manage course lessons"
    ON learning.course_lessons FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('super_admin', 'editor'))
    WITH CHECK (auth.jwt() ->> 'role' IN ('super_admin', 'editor'));

CREATE POLICY "Students read course lessons"
    ON learning.course_lessons FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Editors and Super Admin manage learning activities"
    ON learning.learning_activities FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('super_admin', 'editor'))
    WITH CHECK (auth.jwt() ->> 'role' IN ('super_admin', 'editor'));

CREATE POLICY "Students read learning activities"
    ON learning.learning_activities FOR SELECT TO authenticated
    USING (true);

-- Learning Assets RLS:
CREATE POLICY "Editors and Super Admin manage learning assets"
    ON learning.learning_assets FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('super_admin', 'editor'))
    WITH CHECK (auth.jwt() ->> 'role' IN ('super_admin', 'editor'));

CREATE POLICY "Authenticated users read learning assets"
    ON learning.learning_assets FOR SELECT TO authenticated
    USING (true);

-- Learning Import Batches RLS:
CREATE POLICY "Editors and Super Admin manage learning import batches"
    ON learning.learning_import_batches FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('super_admin', 'editor'))
    WITH CHECK (auth.jwt() ->> 'role' IN ('super_admin', 'editor'));

-- Student Progress RLS:
CREATE POLICY "Students manage their own progress"
    ON learning.student_progress FOR ALL TO authenticated
    USING (student_id = auth.jwt() ->> 'sub')
    WITH CHECK (student_id = auth.jwt() ->> 'sub');

CREATE POLICY "Super Admin and Editors inspect all student progress"
    ON learning.student_progress FOR SELECT TO authenticated
    USING (auth.jwt() ->> 'role' IN ('super_admin', 'editor'));
