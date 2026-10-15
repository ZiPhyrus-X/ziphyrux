-- Migration: 20261010000003_content_and_operations.sql
-- Description: Coding problems, question banks, operational services, integrations, jobs, and master reference entities.

-- 1. Coding Problems (Coding domain)
CREATE TABLE IF NOT EXISTS coding.problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    topic VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT 'v1',
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('published', 'draft', 'archived')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_coding_problems_status ON coding.problems(status);
CREATE INDEX IF NOT EXISTS idx_coding_problems_topic ON coding.problems(topic);

-- 2. Questions & Assessment Repository (Assessment domain)
-- Enforces: MCQ has exactly 4 options and a configured correct answer!
CREATE TABLE IF NOT EXISTS assessment.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    stem TEXT NOT NULL,
    domain VARCHAR(50) NOT NULL CHECK (domain IN ('Technical', 'Verbal', 'Aptitude', 'Soft Skills')),
    type VARCHAR(30) NOT NULL CHECK (type IN ('MCQ', 'Long Answer', 'Short Answer')),
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    options JSONB,
    correct_answer TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('published', 'draft', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_mcq_options_and_answer CHECK (
        type != 'MCQ' OR (
            options IS NOT NULL 
            AND jsonb_typeof(options) = 'array' 
            AND jsonb_array_length(options) = 4
            AND correct_answer IS NOT NULL
            AND length(trim(correct_answer)) > 0
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_domain ON assessment.questions(domain);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_type ON assessment.questions(type);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_status ON assessment.questions(status);

-- 3. Operations Services Health
CREATE TABLE IF NOT EXISTS operations.services (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
    latency VARCHAR(50) NOT NULL DEFAULT '—',
    checked_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 4. Operations Integrations
CREATE TABLE IF NOT EXISTS operations.integrations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'inactive', 'degraded')),
    capabilities TEXT NOT NULL,
    last_sync TIMESTAMPTZ,
    last_error VARCHAR(255) DEFAULT '—',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 5. Operations Background Jobs
CREATE TABLE IF NOT EXISTS operations.background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('succeeded', 'running', 'queued', 'failed')),
    duration VARCHAR(50),
    attempts INT NOT NULL DEFAULT 1 CHECK (attempts >= 1),
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    completed_at TIMESTAMPTZ,
    payload JSONB DEFAULT '{}'::jsonb,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON operations.background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_started ON operations.background_jobs(started_at DESC);

-- 6. Master Reference Data
CREATE TABLE IF NOT EXISTS master.reference_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity VARCHAR(100) NOT NULL UNIQUE,
    records INT NOT NULL DEFAULT 0 CHECK (records >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
