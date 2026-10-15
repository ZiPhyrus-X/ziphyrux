# Ziphyrus X — Editor & Coordinator Workspaces Implementation Status

## 1. Overview
This document tracks the verified implementation of the **Editor Workspace** and **Coordinator Workspace** inside the existing Ziphyrus X React + TypeScript + TanStack Start codebase, integrated with Supabase and the authoritative backend API.

---

## 2. Authorization & Scoping Invariants
- **Authentication**: Verified Bearer session tokens via `src/server/auth.ts` deriving authenticated identity.
- **Role Isolation & Routing**:
  - `super_admin`: Platform governance (`/admin`).
  - `editor`: Feature availability, learning content, question bank, assessment blueprints, notification authoring, visible overrides (`/editor`).
  - `coordinator`: College operational administration strictly scoped to assigned college (`/coordinator`).
- **College Scope Invariant**: Coordinator queries and mutations are locked to `user.collegeCode` / `user.collegeId`. Cross-tenant requests (`?collegeCode=OTHER99`) return `403 Forbidden`.
- **Zero Attendance Law**: Absolutely no attendance tables, fields, percentages, sheets, or metrics exist in the platform.
- **Feature Availability Sovereignty**: Controlled strictly by Editor. Super Admin cannot bypass Editor-disabled features.
- **USN Correction Policy**: Students cannot modify their USN. Coordinators submit corrections with a mandatory reason ($\ge 5$ characters) that is permanently recorded in audit logs.
- **Single-Use Registration Tokens**: Coordinator generates tokenized registration links expiring strictly in 1 hour.
- **Session Lifecycle**: Trainer begins sessions with Start action; Coordinator finalizes unstarted/attention sessions with mandatory explanatory reason ($\ge 5$ characters).

---

## 3. Workspace Inventory & Verification

| Role | Route | Purpose | Backend Endpoint | Status |
|---|---|---|---|---|
| **Editor** | `/editor` | Content & Feature Executive Dashboard | `GET /api/v1/editor/overview` | **Verified (Tested)** |
| **Editor** | `/editor/features` | Feature Availability Management | `GET /api/v1/editor/features`, `PATCH /api/v1/editor/features/:key` | **Verified (Tested)** |
| **Editor** | `/editor/courses` | Learning Content Hierarchy (Course/Module/Topic/Lesson) | `GET /api/v1/editor/courses`, `POST /api/v1/editor/courses`, `PATCH .../status` | **Verified (Tested)** |
| **Editor** | `/editor/questions` | Question Banks (MCQ 4 options, Long/Short Answer) | `GET /api/v1/editor/questions`, `POST /api/v1/editor/questions` | **Verified (Tested)** |
| **Editor** | `/editor/assessments`| Assessment Content & Snapshots | `GET /api/v1/editor/assessments`, `POST /api/v1/editor/assessments` | **Verified (Tested)** |
| **Editor** | `/editor/notifications`| Notification Authoring & Targeting | `GET /api/v1/editor/notifications`, `POST /api/v1/editor/notifications` | **Verified (Tested)** |
| **Editor** | `/editor/overrides` | Visible-Value Overrides (Presentation only) | `GET /api/v1/editor/overrides`, `POST /api/v1/editor/overrides` | **Verified (Tested)** |
| **Editor** | `/editor/m/:module` | Content History & Account | Secondary module route (`history`, `account`) | **Verified (Tested)** |
| **Coordinator** | `/coordinator` | College Operations Dashboard | `GET /api/v1/coordinator/overview` | **Verified (Tested)** |
| **Coordinator** | `/coordinator/academic` | Academic Masters (Departments, Programs, Semesters, Sections) | `GET /api/v1/coordinator/academic` | **Verified (Tested)** |
| **Coordinator** | `/coordinator/students` | College Student Roster & USN Correction Flow | `GET /api/v1/coordinator/students`, `PATCH /api/v1/coordinator/students/:id/usn` | **Verified (Tested)** |
| **Coordinator** | `/coordinator/registration`| 5-Step Student Registration & Single-use Token Invitations | `POST /api/v1/coordinator/registration-links` | **Verified (Tested)** |
| **Coordinator** | `/coordinator/trainers` | Assigned Trainers Management | `GET /api/v1/coordinator/trainers`, `POST /api/v1/coordinator/trainers` | **Verified (Tested)** |
| **Coordinator** | `/coordinator/batches` | Academic Batches (Non-attendance groupings) | `GET /api/v1/coordinator/batches`, `POST /api/v1/coordinator/batches` | **Verified (Tested)** |
| **Coordinator** | `/coordinator/allocations` | Class Allocation (Who teaches what) | `GET /api/v1/coordinator/allocations`, `POST /api/v1/coordinator/allocations` | **Verified (Tested)** |
| **Coordinator** | `/coordinator/schedule` | Training Schedule (When it happens, Offline/Online/Hybrid) | `GET /api/v1/coordinator/schedule`, `POST /api/v1/coordinator/schedule` | **Verified (Tested)** |
| **Coordinator** | `/coordinator/sessions` | Training Sessions & Operational Alerts | `GET /api/v1/coordinator/sessions`, `POST .../start`, `POST .../complete` | **Verified (Tested)** |
| **Coordinator** | `/coordinator/action-plans`| Trainer Action Plans & Deadlines | `GET /api/v1/coordinator/action-plans`, `POST ...`, `PATCH ...` | **Verified (Tested)** |
| **Coordinator** | `/coordinator/m/:module` | Imports/Exports, Reports, Notifications, Activity, Account | Secondary module route (`imports-exports`, `reports`, `notifications`, `activity`, `account`) | **Verified (Tested)** |

---

## 4. Test Suite Summary
- `vitest run` executes 4 test suites and 32 tests with 100% pass rate:
  - `src/test/auth.test.ts` (2 tests pass)
  - `src/test/supabase-integration.test.ts` (17 tests pass)
  - `src/test/editor-coordinator.test.ts` (12 tests pass)
  - `src/test/app-routing.test.tsx` (1 test pass)
- `vite build` completes in ~1.3 seconds with full SSR and client bundles.
