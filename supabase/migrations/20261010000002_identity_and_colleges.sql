-- Migration: 20261010000002_identity_and_colleges.sql
-- Description: Master colleges, campuses, roles, permissions, and identity users with protected accounts.

-- 1. Master Colleges
CREATE TABLE IF NOT EXISTS master.colleges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending', 'archived')),
    campuses INT NOT NULL DEFAULT 1 CHECK (campuses >= 1),
    students INT NOT NULL DEFAULT 0 CHECK (students >= 0),
    trainers INT NOT NULL DEFAULT 0 CHECK (trainers >= 0),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_college_code_format CHECK (code ~ '^[A-Z0-9]{3,12}$')
);

CREATE INDEX IF NOT EXISTS idx_colleges_code ON master.colleges(code);
CREATE INDEX IF NOT EXISTS idx_colleges_status ON master.colleges(status);

-- 2. Master Campuses
CREATE TABLE IF NOT EXISTS master.campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES master.colleges(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 3. Identity Roles & Permissions
CREATE TABLE IF NOT EXISTS identity.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS identity.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    scope VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS identity.role_permissions (
    role_id UUID NOT NULL REFERENCES identity.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES identity.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Identity Users
CREATE TABLE IF NOT EXISTS identity.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID,
    login_id VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    college_id UUID REFERENCES master.colleges(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'archived')),
    is_protected BOOLEAN NOT NULL DEFAULT FALSE,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_users_login_id ON identity.users(login_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON identity.users(email);
CREATE INDEX IF NOT EXISTS idx_users_college_id ON identity.users(college_id);

CREATE TABLE IF NOT EXISTS identity.user_roles (
    user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES identity.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (user_id, role_id)
);

-- 5. Trigger for Permanent Protected Accounts
-- Rules: sAdmin1@ziphyrus.in and editor1@ziphyrus.in can NEVER be deleted or deactivated
CREATE OR REPLACE FUNCTION identity.protect_permanent_accounts()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.email IN ('sAdmin1@ziphyrus.in', 'editor1@ziphyrus.in') 
        OR OLD.login_id IN ('sAdmin1@ziphyrus.in', 'editor1@ziphyrus.in', 'sAdmin1', 'editor1')
        OR OLD.is_protected IS TRUE) THEN
        
        IF (TG_OP = 'DELETE') THEN
            RAISE EXCEPTION 'Permanent protected account % cannot be deleted.', OLD.email;
        END IF;

        IF (TG_OP = 'UPDATE' AND NEW.status != 'active') THEN
            RAISE EXCEPTION 'Permanent protected account % cannot be deactivated.', OLD.email;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_permanent_users ON identity.users;
CREATE TRIGGER trg_protect_permanent_users
BEFORE UPDATE OR DELETE ON identity.users
FOR EACH ROW EXECUTE FUNCTION identity.protect_permanent_accounts();
