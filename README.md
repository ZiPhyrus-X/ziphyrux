# Ziphyrus X

> Next-Generation AI-Powered Enterprise Campus Placement, Training, and Assessment Platform.

Ziphyrus X is a comprehensive multi-tenant institutional platform engineered to unify university placement drives, intelligent skill assessment, coding execution runtimes, trainer management, and student career lifecycles.

---

## Key Workspaces & Modules

### 1. Super Admin Workspace
- **Institutional Governance**: College provisioning, subscription controls, and institutional domain validation.
- **System Oversight & Metrics**: Real-time intelligence metric registry tracking placement readiness, pass-fail rates, and domain competencies.
- **Audit Logging**: Immutable event auditing across all platform administrative actions.
- **Dynamic Overrides**: Granular operational overrides for system features and permissions.

### 2. Coordinator Workspace
- **Academic Operations**: Batch scheduling, session management, and curriculum calendar synchronization.
- **Resource Allocation**: Trainer-to-batch and session-to-classroom allocations.
- **Student Onboarding**: Registration token generation, bulk onboarding, and departmental rosters.
- **Placement Officer Liaison**: Synchronized placement workflow oversight and candidate nomination.

### 3. Placement Officer Workspace
- **Recruitment Drives**: End-to-end drive lifecycle tracking (on-campus, pooled, and virtual).
- **Opportunity Pipeline**: Company tiering, CTC ranges, job descriptions, and eligibility filtering.
- **Automated Reporting**: Instant binary generation for structured Excel (`.xlsx`) rosters and branded PDF summary reports.
- **Candidate Tracking**: Multi-stage shortlisting (Aptitude -> Technical -> Interview -> Offer).

### 4. Trainer Workspace
- **Classroom Sessions**: Live session management, attendance logging, and topic coverage.
- **Performance Diagnostics**: Continuous evaluation of student cohorts across theoretical and practical skills.
- **Curriculum Delivery**: Structured pacing guides aligned with institutional milestone targets.

### 5. Student Workspace
- **Online Judge**: In-browser coding sandbox with multi-language execution and test case verification.
- **Adaptive Assessments**: Timed examinations with automated scoring and anti-cheat telemetry.
- **Skill Progression**: Visualized competency radar charts and recommended learning trajectories.
- **Drive Applications**: One-click application and tracking for eligible campus recruitment drives.

### 6. Editor Workspace
- **Question Authoring**: Rich question bank management supporting MCQs, multi-language coding problems, and comprehension blocks.
- **Blueprint Linkage**: Modular question grouping linked directly to course and assessment blueprints.
- **Version Control & Visibility**: Semantic versioning for question revisions with tenant-level visibility overrides.

---

## Technical Architecture

- **Frontend & Routing**: [React 19](https://react.dev/), [TanStack Start](https://tanstack.com/start) (Full-Stack SSR & Server Functions), [TanStack Router](https://tanstack.com/router) with type-safe file-based routing.
- **State Management & Data**: [TanStack Query](https://tanstack.com/query) with caching and optimistic updates.
- **Styling & UI Components**: [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/) unstyled accessible primitives, and [Lucide Icons](https://lucide.dev/).
- **Animation Systems**: [GSAP](https://gsap.com/) and [Framer Motion](https://motion.dev/) for high-fidelity interactive physics and transitions.
- **Database & Security**: [Supabase](https://supabase.com/) (PostgreSQL) with Row-Level Security (RLS) policies, secure service-role adapters, and automated schema migrations.
- **Document Engines**: Client-side and server-side PDF generation (`jspdf`, `jspdf-autotable`) and spreadsheet synthesis (`xlsx`).
- **Testing**: [Vitest](https://vitest.dev/) and `@testing-library/react` with over 350 unit and integration tests.

---

## Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **npm** or **bun**
- **Git**

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ZiPhyrus-X/ziphyrux.git
   cd ziphyrux
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Configure your Supabase and API credentials in `.env`:
   ```env
   VITE_AUTH_MODE=api
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_BASE_URL=/api/v1
   ```

### Development

Start the development server:
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000` (or `http://localhost:5173` depending on port availability).

### Testing

Run the full automated test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

### Production Build

Create an optimized production build:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## Database Migrations

Database schemas and Row Level Security policies are managed in `supabase/migrations/`:
- `20261010000001_core_schemas.sql`: Core schema initialization.
- `20261010000002_identity_and_colleges.sql`: Identity structures and institutional entities.
- `20261010000003_content_and_operations.sql`: Operational models and content structures.
- `20261010000004_row_level_security.sql`: Multi-tenant isolation and security policies.
- `20261011000005_source_of_truth_and_intelligence.sql`: Metric registries and intelligence tables.
- `20261011000006_question_management_and_versions.sql`: Question versioning and authoring.
- `20261012000007_question_modules_coding_and_visibility.sql`: Coding challenges and visibility overrides.
- `20261012000008_learning_content_modules.sql`: Course and learning path modules.
- `20261012000009_assessment_modules_and_content.sql`: Assessment authoring and schedules.
- `20261012000010_question_modules_blueprint_linkage.sql`: Blueprint linkages and tagging.
- `20261012000011_notifications_expiration_and_deletion.sql`: Notification lifecycles and retention.
- `20261012000012_coordinator_workspace_and_security.sql`: Coordinator operational tables and access rules.
- `20261012000013_student_workspace_and_judge.sql`: Student workspace tables and judge submissions.
- `20261013000014_coordinator_registration_tokens_and_onboarding.sql`: Token-based secure registration.
- `20261013000015_trainer_workspace_and_security.sql`: Trainer access controls and session schedules.
- `20261013000016_placement_workspace_and_security.sql`: Placement management and company pipelines.
- `20261014000010_placement_officer_and_reporting.sql`: Placement reporting and provision metrics.

---

## License

Copyright © 2026 Ziphyrus X. All rights reserved. Proprietary and confidential.
