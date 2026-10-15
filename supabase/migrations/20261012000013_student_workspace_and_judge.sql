-- ============================================================================
-- Migration: 20261012000013_student_workspace_and_judge.sql
-- Description: Student Workspace Schema, Coding Judge Drafts & Submissions,
--              Automatic GitHub Sync Jobs, Assessment Attempts & Answers,
--              Learning Progress, and Strict Row Level Security (RLS).
--              Zero Attendance Law strictly enforced.
-- ============================================================================

-- 1. Student Coding Judge Drafts Table
CREATE TABLE IF NOT EXISTS coding.judge_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL,
    language VARCHAR(50) NOT NULL,
    code TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_student_problem_lang_draft UNIQUE (student_id, problem_id, language)
);

CREATE INDEX IF NOT EXISTS idx_judge_drafts_student ON coding.judge_drafts(student_id);
CREATE INDEX IF NOT EXISTS idx_judge_drafts_problem ON coding.judge_drafts(problem_id);

-- 2. Coding Judge Submissions Table
CREATE TABLE IF NOT EXISTS coding.judge_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL,
    problem_title VARCHAR(255) NOT NULL,
    student_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    college_code VARCHAR(50) NOT NULL,
    language VARCHAR(50) NOT NULL,
    source_code TEXT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN (
        'queued', 'compiling', 'running', 'accepted', 'wrong_answer',
        'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error',
        'compile_error', 'internal_error'
    )),
    score NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    memory_used_mb NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    test_cases_passed INTEGER NOT NULL DEFAULT 0,
    total_test_cases INTEGER NOT NULL DEFAULT 0,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    github_synced BOOLEAN NOT NULL DEFAULT FALSE,
    github_commit_sha VARCHAR(100),
    github_repo_name VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_judge_submissions_student ON coding.judge_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_judge_submissions_problem ON coding.judge_submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_judge_submissions_college ON coding.judge_submissions(college_id);
CREATE INDEX IF NOT EXISTS idx_judge_submissions_status ON coding.judge_submissions(status);

-- 3. Automatic GitHub Sync Jobs Table
CREATE TABLE IF NOT EXISTS coding.github_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES coding.judge_submissions(id) ON DELETE CASCADE,
    repo_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed', 'retrying')),
    commit_sha VARCHAR(100),
    file_path VARCHAR(255) NOT NULL,
    commit_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_github_sync_student ON coding.github_sync_jobs(student_id);
CREATE INDEX IF NOT EXISTS idx_github_sync_status ON coding.github_sync_jobs(status);

-- 4. Student Assessment Attempts Table
CREATE TABLE IF NOT EXISTS assessment.assessment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL,
    student_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expired', 'abandoned')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    submitted_at TIMESTAMPTZ,
    duration_seconds INTEGER NOT NULL,
    time_remaining_seconds INTEGER NOT NULL,
    score NUMERIC(5, 2) DEFAULT 0.0,
    total_marks NUMERIC(5, 2) DEFAULT 0.0,
    percentage NUMERIC(5, 2) DEFAULT 0.0,
    questions_count INTEGER NOT NULL DEFAULT 0,
    answered_count INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_student_assessment_attempt UNIQUE (student_id, assessment_id, started_at)
);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_student ON assessment.assessment_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assessment ON assessment.assessment_attempts(assessment_id);

-- 5. Student Assessment Answers (Autosaved responses)
CREATE TABLE IF NOT EXISTS assessment.assessment_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES assessment.assessment_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL,
    selected_option TEXT,
    answer_text TEXT,
    is_saved BOOLEAN NOT NULL DEFAULT TRUE,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_attempt_question_answer UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_assessment_answers_attempt ON assessment.assessment_answers(attempt_id);

-- 6. Student Activity Events Table (Authoritative verified events for heatmap & timeline)
CREATE TABLE IF NOT EXISTS student.activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'coding_submission', 'assessment_completed', 'lesson_completed', 'action_plan_milestone'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reference_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_student ON student.activity_events(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_date ON student.activity_events(created_at);

-- 7. Student Learning Progress Table
CREATE TABLE IF NOT EXISTS learning.student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    course_id UUID NOT NULL,
    module_id UUID NOT NULL,
    lesson_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed')),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_student_course_lesson UNIQUE (student_id, course_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_student_progress_student ON learning.student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_course ON learning.student_progress(course_id);

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE coding.judge_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding.judge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding.github_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE student.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.student_progress ENABLE ROW LEVEL SECURITY;

-- 8.1. Judge Drafts: Students can ONLY select and manage their own code drafts
DROP POLICY IF EXISTS p_judge_drafts_student_isolation ON coding.judge_drafts;
CREATE POLICY p_judge_drafts_student_isolation ON coding.judge_drafts
    FOR ALL
    TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- 8.2. Judge Submissions: Students can SELECT only their own submissions.
-- Only backend service role or coordinator of that college can inspect.
DROP POLICY IF EXISTS p_judge_submissions_student_select ON coding.judge_submissions;
CREATE POLICY p_judge_submissions_student_select ON coding.judge_submissions
    FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM identity.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('super_admin', 'editor')
        ) OR
        EXISTS (
            SELECT 1 FROM identity.users u
            WHERE u.id = auth.uid()
            AND u.role = 'coordinator'
            AND u.college_id = coding.judge_submissions.college_id
        )
    );

-- Student insertion is permitted for creating queued submission
DROP POLICY IF EXISTS p_judge_submissions_student_insert ON coding.judge_submissions;
CREATE POLICY p_judge_submissions_student_insert ON coding.judge_submissions
    FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

-- 8.3. GitHub Sync Jobs: Students can only view their own sync jobs
DROP POLICY IF EXISTS p_github_sync_student_select ON coding.github_sync_jobs;
CREATE POLICY p_github_sync_student_select ON coding.github_sync_jobs
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

-- 8.4. Assessment Attempts: Students can view and start their own attempts
DROP POLICY IF EXISTS p_assessment_attempts_student ON assessment.assessment_attempts;
CREATE POLICY p_assessment_attempts_student ON assessment.assessment_attempts
    FOR ALL
    TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- 8.5. Assessment Answers: Students can view and autosave only their own answers
DROP POLICY IF EXISTS p_assessment_answers_student ON assessment.assessment_answers;
CREATE POLICY p_assessment_answers_student ON assessment.assessment_answers
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessment.assessment_attempts a
            WHERE a.id = attempt_id AND a.student_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM assessment.assessment_attempts a
            WHERE a.id = attempt_id AND a.student_id = auth.uid()
        )
    );

-- 8.6. Student Activity Events: Students can only view their own events
DROP POLICY IF EXISTS p_activity_events_student ON student.activity_events;
CREATE POLICY p_activity_events_student ON student.activity_events
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

-- 8.7. Learning Progress: Students can view and update their own progress
DROP POLICY IF EXISTS p_student_progress_student ON learning.student_progress;
CREATE POLICY p_student_progress_student ON learning.student_progress
    FOR ALL
    TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());
