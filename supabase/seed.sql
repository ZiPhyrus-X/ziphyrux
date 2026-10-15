-- Seed Data: supabase/seed.sql
-- Development and staging seed data for Ziphyrus X Super Admin

-- 1. Insert Core Roles
INSERT INTO identity.roles (id, name, display_name, description) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'super_admin', 'Super Admin', 'Full platform governance and administration'),
    ('a0000000-0000-0000-0000-000000000002', 'editor', 'Editor', 'Controls feature availability, content, problems, and questions'),
    ('a0000000-0000-0000-0000-000000000003', 'coordinator', 'Coordinator', 'Manage college operations and academic structure'),
    ('a0000000-0000-0000-0000-000000000004', 'trainer', 'Trainer', 'Inspect student evidence for assigned batches'),
    ('a0000000-0000-0000-0000-000000000005', 'placement_officer', 'Placement Officer', 'Review authorized readiness and applications'),
    ('a0000000-0000-0000-0000-000000000006', 'employer', 'Employer', 'View candidates who granted access'),
    ('a0000000-0000-0000-0000-000000000007', 'student', 'Student', 'View own evidence and recommendations')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Permissions
INSERT INTO identity.permissions (id, code, scope, description) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'platform.*', 'Platform', 'Full platform governance'),
    ('b0000000-0000-0000-0000-000000000002', 'college.manage', 'Own college', 'Manage college operations and structure'),
    ('b0000000-0000-0000-0000-000000000003', 'batch.view_evidence', 'Assigned batches', 'Inspect student evidence for assigned batches'),
    ('b0000000-0000-0000-0000-000000000004', 'content.edit', 'Platform content', 'Author problems and questions'),
    ('b0000000-0000-0000-0000-000000000005', 'placement.review', 'Own college', 'Review authorized readiness and applications'),
    ('b0000000-0000-0000-0000-000000000006', 'candidates.view_authorized', 'Authorized candidates', 'View candidates who granted access'),
    ('b0000000-0000-0000-0000-000000000007', 'self.view', 'Self', 'View own evidence and recommendations')
ON CONFLICT (code) DO NOTHING;

-- 3. Link Roles to Permissions
INSERT INTO identity.role_permissions (role_id, permission_id) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
    ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004'),
    ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002'),
    ('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003'),
    ('a0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005'),
    ('a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000006'),
    ('a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000007')
ON CONFLICT DO NOTHING;

-- 4. Initial Colleges
INSERT INTO master.colleges (id, name, code, status, campuses, students, trainers) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Sample Institute of Technology', 'SMP101', 'active', 2, 850, 18),
    ('c0000000-0000-0000-0000-000000000002', 'Demo College of Engineering', 'SMP102', 'active', 1, 620, 12),
    ('c0000000-0000-0000-0000-000000000003', 'Example University', 'SMP103', 'pending', 3, 1200, 25),
    ('c0000000-0000-0000-0000-000000000004', 'Placeholder Polytechnic', 'SMP104', 'inactive', 1, 410, 8),
    ('c0000000-0000-0000-0000-000000000005', 'Test Academy of Sciences', 'SMP105', 'active', 2, 940, 20)
ON CONFLICT (code) DO NOTHING;

-- 5. Permanent Protected Accounts (sAdmin1@ziphyrus.in and editor1@ziphyrus.in)
INSERT INTO identity.users (id, login_id, email, name, status, is_protected) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'sAdmin1@ziphyrus.in', 'sAdmin1@ziphyrus.in', 'Ziphyrus Super Admin', 'active', true),
    ('d0000000-0000-0000-0000-000000000002', 'editor1@ziphyrus.in', 'editor1@ziphyrus.in', 'Ziphyrus Editor', 'active', true),
    ('d0000000-0000-0000-0000-000000000003', 'coordinator.smp101', 'coord@smp101.edu', 'Asha Sharma', 'active', false),
    ('d0000000-0000-0000-0000-000000000004', 'trainer.dev', 'trainer@smp101.edu', 'Rohan Verma', 'active', false)
ON CONFLICT (login_id) DO NOTHING;

-- Assign User Roles
INSERT INTO identity.user_roles (user_id, role_id) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'), -- Super Admin
    ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002'), -- Editor
    ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003'), -- Coordinator
    ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004')  -- Trainer
ON CONFLICT DO NOTHING;

-- 6. System Feature Flags
INSERT INTO system.feature_flags (key, name, description, is_enabled, controlled_by_role) VALUES
    ('workspace.employer', 'Employer workspace', 'Enable access to employer portal for candidate inspection', true, 'editor'),
    ('auth.student_registration', 'Student self-registration', 'Permit students to register independently', false, 'editor'),
    ('intelligence.recommendations', 'Recommendation engine', 'Real-time employability skill gap analysis', true, 'editor'),
    ('judge.submissions', 'Coding judge submissions', 'Code execution and grading pipeline', true, 'editor')
ON CONFLICT (key) DO NOTHING;

-- 7. Operations Services Status
INSERT INTO operations.services (id, name, status, latency) VALUES
    ('api', 'Backend API', 'healthy', '84 ms'),
    ('db', 'Database', 'healthy', '12 ms'),
    ('worker', 'Background workers', 'degraded', '—'),
    ('judge', 'Coding judge', 'healthy', '310 ms'),
    ('storage', 'Object storage', 'healthy', '45 ms'),
    ('auth', 'Authentication provider', 'healthy', '61 ms')
ON CONFLICT (id) DO NOTHING;

-- 8. Operations Integrations
INSERT INTO operations.integrations (id, name, status, capabilities, last_sync, last_error) VALUES
    ('supabase-auth', 'Supabase Auth', 'active', 'Identity, sessions', clock_timestamp() - interval '3 minutes', '—'),
    ('github', 'GitHub', 'active', 'Repository linking', clock_timestamp() - interval '2 hours', '—'),
    ('judge', 'Coding Judge', 'active', 'Code execution, verdicts', clock_timestamp() - interval '9 minutes', '—'),
    ('storage', 'File/object storage', 'active', 'Uploads, exports', clock_timestamp() - interval '15 minutes', '—'),
    ('email', 'Email delivery', 'inactive', 'Notifications', clock_timestamp() - interval '4 days', 'Not configured')
ON CONFLICT (id) DO NOTHING;

-- 9. Sample Background Jobs
INSERT INTO operations.background_jobs (id, type, status, duration, attempts, started_at) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'recommendation.recompute', 'succeeded', '42s', 1, clock_timestamp() - interval '20 minutes'),
    ('e0000000-0000-0000-0000-000000000002', 'skill.aggregate', 'succeeded', '15s', 1, clock_timestamp() - interval '35 minutes'),
    ('e0000000-0000-0000-0000-000000000003', 'import.questions', 'running', '60s', 1, clock_timestamp() - interval '5 minutes'),
    ('e0000000-0000-0000-0000-000000000004', 'judge.sync', 'failed', '120s', 3, clock_timestamp() - interval '45 minutes')
ON CONFLICT (id) DO NOTHING;

-- 10. Sample Coding Problems
INSERT INTO coding.problems (id, code, title, difficulty, topic, version, status) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'PRB-0001', 'Two Sum Variant', 'Easy', 'Arrays', 'v1', 'published'),
    ('f0000000-0000-0000-0000-000000000002', 'PRB-0002', 'Shortest Path in Grid', 'Medium', 'Graphs', 'v1', 'draft'),
    ('f0000000-0000-0000-0000-000000000003', 'PRB-0003', 'Balanced Brackets', 'Easy', 'Stacks', 'v2', 'published'),
    ('f0000000-0000-0000-0000-000000000004', 'PRB-0004', 'LRU Cache', 'Hard', 'Design', 'v1', 'published')
ON CONFLICT (code) DO NOTHING;

-- 11. Sample Assessment Questions (MCQ has exactly 4 options and a correct answer)
INSERT INTO assessment.questions (id, code, stem, domain, type, difficulty, options, correct_answer, status) VALUES
    ('70000000-0000-0000-0000-000000000001', 'Q-0001', 'What is the average time complexity of binary search?', 'Technical', 'MCQ', 'Easy', '["O(1)", "O(log n)", "O(n)", "O(n^2)"]'::jsonb, 'O(log n)', 'published'),
    ('70000000-0000-0000-0000-000000000002', 'Q-0002', 'Choose the synonym for "Candor"', 'Verbal', 'MCQ', 'Medium', '["Deceit", "Frankness", "Shyness", "Apathy"]'::jsonb, 'Frankness', 'published'),
    ('70000000-0000-0000-0000-000000000003', 'Q-0003', 'Explain the Third Normal Form (3NF) in relational databases.', 'Technical', 'Long Answer', 'Medium', null, null, 'published'),
    ('70000000-0000-0000-0000-000000000004', 'Q-0004', 'How do you handle interpersonal conflict during code reviews?', 'Soft Skills', 'Short Answer', 'Easy', null, null, 'published')
ON CONFLICT (code) DO NOTHING;

-- 12. Master Reference Data
INSERT INTO master.reference_data (entity, records, status) VALUES
    ('Campuses', 12, 'active'),
    ('Departments', 28, 'active'),
    ('Programs & degrees', 16, 'active'),
    ('Academic sessions', 8, 'active'),
    ('Years', 4, 'active'),
    ('Semesters', 8, 'active'),
    ('Sections', 32, 'active'),
    ('Skills', 140, 'active'),
    ('Skill relationships', 210, 'active'),
    ('Course types', 6, 'active'),
    ('Training types', 5, 'active'),
    ('Question types', 3, 'active'),
    ('Difficulties', 3, 'active')
ON CONFLICT (entity) DO NOTHING;

-- 13. Audit Log Entries
INSERT INTO audit.audit_logs (actor_login, action, target, severity, metadata) VALUES
    ('sAdmin1@ziphyrus.in', 'college.update', 'SMP101', 'info', '{"field": "status", "value": "active"}'::jsonb),
    ('editor1@ziphyrus.in', 'problem.publish', 'PRB-0001', 'info', '{"version": "v1"}'::jsonb),
    ('system', 'integration.sync', 'GitHub', 'info', '{"status": "healthy"}'::jsonb),
    ('sAdmin1@ziphyrus.in', 'feature.toggle', 'auth.student_registration', 'warning', '{"is_enabled": false}'::jsonb);
