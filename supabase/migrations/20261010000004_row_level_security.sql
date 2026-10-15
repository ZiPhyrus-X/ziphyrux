-- Migration: 20261010000004_row_level_security.sql
-- Description: Enables Row Level Security (RLS) across all tables and establishes strict least-privilege policies.

-- 1. Enable RLS on all tables
ALTER TABLE system.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.visible_value_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE master.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE master.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE master.reference_data ENABLE ROW LEVEL SECURITY;

ALTER TABLE identity.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE coding.problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE operations.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations.background_jobs ENABLE ROW LEVEL SECURITY;

-- 2. Helper functions to inspect authenticated user without trusting client headers
CREATE OR REPLACE FUNCTION identity.current_user_id()
RETURNS UUID AS $$
    SELECT id FROM identity.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION identity.current_user_college_id()
RETURNS UUID AS $$
    SELECT college_id FROM identity.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION identity.has_role(required_role VARCHAR)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM identity.user_roles ur
        JOIN identity.roles r ON ur.role_id = r.id
        JOIN identity.users u ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND (r.name = required_role OR r.name = 'super_admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Audit Logs Policies: Read-only for Super Admin, absolutely NO direct client updates or deletes
CREATE POLICY audit_logs_read_super_admin ON audit.audit_logs
    FOR SELECT TO authenticated
    USING (identity.has_role('super_admin'));

-- 4. Feature Flags Policies: Read-only for authenticated; Editor / Super Admin controlled
CREATE POLICY feature_flags_select ON system.feature_flags
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY feature_flags_modify_editor ON system.feature_flags
    FOR ALL TO authenticated
    USING (identity.has_role('editor'))
    WITH CHECK (identity.has_role('editor'));

-- 5. Visible-Value Overrides: Super Admin only
CREATE POLICY overrides_super_admin ON system.visible_value_overrides
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('super_admin'));

-- 6. Master Colleges Policies: College isolation!
-- Super Admin reads all; campus/college staff read only their own college
CREATE POLICY colleges_read ON master.colleges
    FOR SELECT TO authenticated
    USING (
        identity.has_role('super_admin') 
        OR id = identity.current_user_college_id()
    );

CREATE POLICY colleges_modify_super_admin ON master.colleges
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('super_admin'));

-- 7. Campuses Policies
CREATE POLICY campuses_read ON master.campuses
    FOR SELECT TO authenticated
    USING (
        identity.has_role('super_admin')
        OR college_id = identity.current_user_college_id()
    );

CREATE POLICY campuses_modify_super_admin ON master.campuses
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('super_admin'));

-- 8. Master Reference Data Policies
CREATE POLICY reference_data_read ON master.reference_data
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY reference_data_modify_admin ON master.reference_data
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('super_admin'));

-- 9. Identity Users Policies:
-- Self can read self; Super Admin reads all; College coordinator reads users in same college
CREATE POLICY users_read ON identity.users
    FOR SELECT TO authenticated
    USING (
        auth_user_id = auth.uid()
        OR identity.has_role('super_admin')
        OR (identity.has_role('coordinator') AND college_id = identity.current_user_college_id())
    );

CREATE POLICY users_modify_super_admin ON identity.users
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('super_admin'));

-- 10. Identity Roles & Permissions: Read for authenticated, modify only for Super Admin
CREATE POLICY roles_read ON identity.roles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY roles_modify_super_admin ON identity.roles
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('super_admin'));

CREATE POLICY permissions_read ON identity.permissions
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY permissions_modify_super_admin ON identity.permissions
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('super_admin'));

CREATE POLICY user_roles_read ON identity.user_roles
    FOR SELECT TO authenticated
    USING (identity.has_role('super_admin') OR user_id = identity.current_user_id());

CREATE POLICY user_roles_modify_super_admin ON identity.user_roles
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('super_admin'));

-- 11. Coding Problems & Questions: Read published for students/trainers, draft/modify for editor & super_admin
CREATE POLICY problems_read ON coding.problems
    FOR SELECT TO authenticated
    USING (
        status = 'published'
        OR identity.has_role('editor')
        OR identity.has_role('super_admin')
    );

CREATE POLICY problems_modify ON coding.problems
    FOR ALL TO authenticated
    USING (identity.has_role('editor') OR identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('editor') OR identity.has_role('super_admin'));

CREATE POLICY questions_read ON assessment.questions
    FOR SELECT TO authenticated
    USING (
        status = 'published'
        OR identity.has_role('editor')
        OR identity.has_role('super_admin')
    );

CREATE POLICY questions_modify ON assessment.questions
    FOR ALL TO authenticated
    USING (identity.has_role('editor') OR identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('editor') OR identity.has_role('super_admin'));

-- 12. Operations Services, Integrations, Jobs: Super Admin only
CREATE POLICY operations_services_read ON operations.services
    FOR SELECT TO authenticated
    USING (identity.has_role('super_admin'));

CREATE POLICY operations_services_modify ON operations.services
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('super_admin'));

CREATE POLICY operations_integrations_read ON operations.integrations
    FOR SELECT TO authenticated
    USING (identity.has_role('super_admin'));

CREATE POLICY operations_integrations_modify ON operations.integrations
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('super_admin'));

CREATE POLICY operations_jobs_read ON operations.background_jobs
    FOR SELECT TO authenticated
    USING (identity.has_role('super_admin'));

CREATE POLICY operations_jobs_modify ON operations.background_jobs
    FOR ALL TO authenticated
    USING (identity.has_role('super_admin'))
    WITH CHECK (identity.has_role('super_admin'));
