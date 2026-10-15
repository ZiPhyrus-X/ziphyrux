-- Migration: 20261012000010_question_modules_blueprint_linkage.sql
-- Description: Add Assessment Blueprint Code Linkage, Target Difficulty, and Domain to Question Modules.

-- 1. Extend assessment.question_modules with blueprint_code, target_difficulty, domain
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'assessment' 
        AND table_name = 'question_modules' 
        AND column_name = 'blueprint_code'
    ) THEN
        ALTER TABLE assessment.question_modules 
        ADD COLUMN blueprint_code VARCHAR(30);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'assessment' 
        AND table_name = 'question_modules' 
        AND column_name = 'target_difficulty'
    ) THEN
        ALTER TABLE assessment.question_modules 
        ADD COLUMN target_difficulty VARCHAR(20) CHECK (target_difficulty IN ('Beginner', 'Intermediate', 'Advanced'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'assessment' 
        AND table_name = 'question_modules' 
        AND column_name = 'domain'
    ) THEN
        ALTER TABLE assessment.question_modules 
        ADD COLUMN domain VARCHAR(50);
    END IF;
END $$;

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_question_modules_blueprint ON assessment.question_modules(blueprint_code);
CREATE INDEX IF NOT EXISTS idx_question_modules_domain ON assessment.question_modules(domain);
CREATE INDEX IF NOT EXISTS idx_question_modules_difficulty ON assessment.question_modules(target_difficulty);

-- 3. Audit trigger / comment
COMMENT ON COLUMN assessment.question_modules.blueprint_code IS 'Unique code of the linked assessment blueprint (e.g. ASM-TECH01)';
COMMENT ON COLUMN assessment.question_modules.target_difficulty IS 'Expected difficulty level aligned with the blueprint';
COMMENT ON COLUMN assessment.question_modules.domain IS 'Curriculum domain aligned with the blueprint';
