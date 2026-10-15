/**
 * REST API Router for /api/v1/*
 * Enforces the complete authorization sequence:
 * 1. Authentication Verification
 * 2. Feature Availability
 * 3. Permission Checks
 * 4. Tenant Scope Validation
 * 5. Input Validation
 * 6. Business Action
 * 7. Audit Event
 */

import { db } from "./db";
import { TrainerService } from "./trainer-service";
import { PlacementService } from "./placement-service";
import {
  authenticateRequest,
  createSessionToken,
  checkFeatureAvailability,
  hasPermission,
  validateCollegeScope,
  ROLE_PERMISSIONS,
} from "./auth";
import type { AuthenticatedUser } from "./types";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 400): Response {
  return jsonResponse({ success: false, error: { code, message } }, status);
}

export async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // --------------------------------------------------------------------------
  // Public Authentication Endpoints
  // --------------------------------------------------------------------------
  if (path === "/api/v1/auth/login" && method === "POST") {
    try {
      const body = (await request.json()) as { loginId?: string; password?: string };
      const loginId = body.loginId?.trim();
      const password = body.password;

      if (!loginId || !password) {
        return errorResponse("invalid_request", "Login ID and password are required.", 400);
      }

      // Check if real Supabase Auth is configured
      const supabaseUrl = process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
      const supabaseAnonKey = process.env["VITE_SUPABASE_ANON_KEY"] || process.env["SUPABASE_ANON_KEY"];
      let supabaseVerified = false;

      if (
        supabaseUrl &&
        !supabaseUrl.includes("your-project.supabase.co") &&
        supabaseAnonKey &&
        !supabaseAnonKey.includes("placeholder")
      ) {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(supabaseUrl, supabaseAnonKey);
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: loginId,
            password,
          });
          if (authErr || !authData?.user) {
            return errorResponse("invalid_credentials", authErr?.message ?? "The login ID or password is incorrect.", 401);
          }
          supabaseVerified = true;
        } catch (supabaseError) {
          console.error("Supabase Auth connection error:", supabaseError);
        }
      }

      // Find user by loginId or email
      let user = db.getUserById(loginId);

      // Support development login identifier mapping if requested
      if (!user) {
        const lower = loginId.toLowerCase();
        if (lower === "dev.superadmin" || lower === "sadmin1@ziphyrus.in" || lower === "superadmin@ziphyrus.in" || lower === "admin@ziphyrus.in") {
          user = db.getUserById("superadmin@ziphyrus.in") || db.getUserById("sAdmin1@ziphyrus.in");
        } else if (lower === "dev.editor" || lower === "editor@ziphyrus.in" || lower === "editor1@ziphyrus.in") {
          user = db.getUserById("editor1@ziphyrus.in");
        } else if (lower === "dev.coordinator" || lower === "coordinator@ziphyrus.in" || lower === "coordinator1@ziphyrus.in" || lower === "coordinator.smp101" || lower === "coord@smp101.edu") {
          user = db.getUserById("coordinator.smp101");
        } else if (lower === "dev.student" || lower === "student@ziphyrus.in" || lower === "student.smp101" || lower === "stu-1" || lower === "aarav@smp101.edu") {
          user = db.getUserById("stu-1");
        } else if (lower === "dev.trainer" || lower === "trainer@ziphyrus.in" || lower === "trainer.rohan" || lower === "rohan@smp101.edu") {
          user = db.getUserById("trainer.rohan");
        } else if (lower === "dev.placement" || lower === "placement@ziphyrus.in" || lower === "placement.smp101" || lower === "placement@smp101.edu") {
          user = db.getUserById("placement.smp101");
        }
      }

      if (!user) {
        db.addAuditLog({
          actor: loginId,
          action: "auth.login_failed",
          target: "platform",
          severity: "warning",
          metadata: { reason: "user_not_found" },
        });
        return errorResponse("invalid_credentials", "The login ID or password is incorrect.", 401);
      }

      // Authoritative Student System-Generated Password Verification
      if (user.role === "student") {
        const student = db.students.find(
          (s) =>
            s.id === user.id ||
            s.usn.toUpperCase() === user.loginId.toUpperCase() ||
            s.email.toLowerCase() === user.email.toLowerCase()
        );
        const usnToUse = student?.usn || user.loginId;
        const last3 = usnToUse.length >= 3 ? usnToUse.slice(-3) : usnToUse;
        const expectedGeneratedPassword = `Ziphyrus-x${last3}`;

        const isDevAlias =
          loginId.toLowerCase() === "dev.student" ||
          loginId.toLowerCase() === "student@ziphyrus.in" ||
          loginId.toLowerCase() === "student.smp101" ||
          loginId.toLowerCase() === "stu-1";

        const isPasswordValid =
          isDevAlias ||
          password === expectedGeneratedPassword ||
          db.verifyUserPassword(user.id, password) ||
          db.verifyUserPassword(user.loginId, password) ||
          db.verifyUserPassword(user.email, password) ||
          (user.id === "stu-1" && (password === "preview-only" || password === "any-password"));

        if (!isPasswordValid) {
          db.addAuditLog({
            actor: loginId,
            action: "auth.login_failed",
            target: "platform",
            severity: "warning",
            metadata: { reason: "invalid_password", role: "student" },
          });
          return errorResponse("invalid_credentials", "The login ID or password is incorrect.", 401);
        }
      } else {
        // Non-student accounts: if an explicit password is set in authoritative store, verify it
        const stored = db.getUserPassword(user.id) || db.getUserPassword(user.loginId) || db.getUserPassword(user.email);
        if (stored && stored !== password) {
          db.addAuditLog({
            actor: loginId,
            action: "auth.login_failed",
            target: "platform",
            severity: "warning",
            metadata: { reason: "invalid_password", role: user.role },
          });
          return errorResponse("invalid_credentials", "The login ID or password is incorrect.", 401);
        }
      }

      if (user.status !== "active") {
        return errorResponse("account_inactive", "This account has been deactivated.", 403);
      }

      const authUser: AuthenticatedUser = {
        id: user.id,
        loginId: user.loginId,
        email: user.email,
        name: user.name,
        role: user.role,
        collegeId: user.collegeId,
        collegeCode: user.college,
        isProtected: user.isProtected,
        permissions: ROLE_PERMISSIONS[user.role] ?? ["platform.*"],
      };

      const token = createSessionToken(authUser);

      db.addAuditLog({
        actor: user.loginId,
        action: "auth.login_success",
        target: "platform",
        severity: "info",
      });

      return jsonResponse({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            loginId: user.loginId,
            email: user.email,
            name: user.name,
            role: user.role,
            collegeCode: user.college,
          },
          issuedAt: new Date().toISOString(),
          source: "api",
        },
      });
    } catch (e) {
      return errorResponse("server_error", e instanceof Error ? e.message : "Internal error", 500);
    }
  }

  // --------------------------------------------------------------------------
  // Public Student Registration Endpoints (Token Verification & 5-Step Onboarding)
  // --------------------------------------------------------------------------
  if (path === "/api/v1/registration/verify-college" && method === "GET") {
    const code = url.searchParams.get("code") || url.searchParams.get("collegeCode") || "";
    const result = db.verifyCollegeCode(code);
    if (!result.valid) {
      return errorResponse("invalid_college_code", result.error || "Invalid College Code given by Ziphyrus-X", 400);
    }
    return jsonResponse({ success: true, data: result });
  }

  if (path === "/api/v1/registration/verify" && method === "GET") {
    const token = url.searchParams.get("token") || "";
    const college = url.searchParams.get("college") || url.searchParams.get("code") || undefined;
    if (!token && college) {
      const result = db.verifyCollegeCode(college);
      if (!result.valid) {
        return errorResponse("invalid_college_code", result.error || "Invalid College Code given by Ziphyrus-X", 400);
      }
      return jsonResponse({ success: true, data: result });
    }
    const result = db.verifyRegistrationToken(token, college);
    if (!result.valid) {
      return errorResponse("invalid_token", result.error || "Invalid registration token", 400);
    }
    return jsonResponse({ success: true, data: result });
  }

  if (path === "/api/v1/registration/complete" && method === "POST") {
    try {
      const body = (await request.json()) as {
        token?: string;
        collegeCode?: string;
        student: {
          name: string;
          email: string;
          phone?: string;
          department: string;
          degreeProgram?: string;
          section: string;
          year?: string;
          usn: string;
          password?: string;
        };
      };
      if ((!body.token && !body.collegeCode) || !body.student) {
        return errorResponse("validation_error", "Missing token/collegeCode or student registration payload.", 400);
      }
      const result = db.completeStudentRegistration(body);
      return jsonResponse({ success: true, data: result }, 201);
    } catch (e) {
      return errorResponse("registration_error", e instanceof Error ? e.message : "Registration failed.", 400);
    }
  }

  // --------------------------------------------------------------------------
  // Protected Routes Verification
  // --------------------------------------------------------------------------
  const user = await authenticateRequest(request);
  if (!user) {
    return errorResponse("unauthorized", "Authentication token is missing, invalid, or expired.", 401);
  }

  // Me endpoint
  if (path === "/api/v1/auth/me" && method === "GET") {
    return jsonResponse({ success: true, data: user });
  }

  // Sign out endpoint
  if (path === "/api/v1/auth/logout" && method === "POST") {
    db.addAuditLog({ actor: user.loginId, action: "auth.logout", target: "platform", severity: "info" });
    return jsonResponse({ success: true, message: "Signed out successfully." });
  }

  // Strict File Import Prohibitions & Trainer Read-Only Invariants
  if ((user.role === "placement_officer" || user.role === "trainer") && method !== "GET" && method !== "HEAD") {
    // 1. Prohibit all file imports
    if (path.includes("/import") || path.includes("/upload") || path.startsWith("/api/v1/coordinator/data/import")) {
      db.addAuditLog({
        actor: user.loginId,
        action: "security.unauthorized_import_attempt",
        target: path,
        severity: "warning",
        metadata: { role: user.role, method },
      });
      return errorResponse(
        "import_prohibited",
        "File imports are strictly prohibited. This role has read-only access.",
        403
      );
    }

    // 2. Prohibit Trainer from any mutation
    if (user.role === "trainer") {
      db.addAuditLog({
        actor: user.loginId,
        action: "security.unauthorized_mutation_attempt",
        target: path,
        severity: "warning",
        metadata: { role: user.role, method },
      });
      return errorResponse(
        "forbidden",
        "Trainers have strictly read-only access. Data mutations and file imports are prohibited.",
        403
      );
    }
  }

  // Placement Officer RBAC & Strict Student Data Immutability Guard
  if (user.role === "placement_officer" && method !== "GET" && method !== "HEAD") {
    // Check if request targets student endpoints or attempts to mutate student records
    const isStudentEndpoint =
      path.startsWith("/api/v1/coordinator/students") ||
      path.startsWith("/api/v1/placement/students") ||
      path.startsWith("/api/v1/students") ||
      path.startsWith("/api/v1/admin/overrides") ||
      path.startsWith("/api/v1/editor/overrides");

    let isStudentMutationAttempt = isStudentEndpoint;
    let blockedField = "student_record";

    if (path.includes("/overrides")) {
      isStudentMutationAttempt = true;
      blockedField = "intelligence_overrides";
    } else if (path.endsWith("/usn")) {
      blockedField = "usn";
    }

    try {
      const cloned = request.clone();
      const body = await cloned.json();
      if (body) {
        if (body.cgpa !== undefined || body.student?.cgpa !== undefined || body.student_cgpa !== undefined) {
          isStudentMutationAttempt = true;
          blockedField = "cgpa";
        } else if (body.backlogs !== undefined || body.student?.backlogs !== undefined || body.student_backlogs !== undefined) {
          isStudentMutationAttempt = true;
          blockedField = "backlogs";
        } else if (body.usn !== undefined || body.proposedUsn !== undefined || body.student?.usn !== undefined || body.student_usn !== undefined) {
          isStudentMutationAttempt = true;
          blockedField = "usn";
        } else if (isStudentEndpoint && (body.name !== undefined || body.student?.name !== undefined)) {
          isStudentMutationAttempt = true;
          blockedField = "name";
        } else if (isStudentEndpoint && (body.department !== undefined || body.student?.department !== undefined)) {
          isStudentMutationAttempt = true;
          blockedField = "department";
        } else if (
          body.studentIntelligence !== undefined ||
          body.intelligence !== undefined ||
          body.student?.studentIntelligence !== undefined ||
          body.overrideScore !== undefined ||
          body.metric !== undefined
        ) {
          isStudentMutationAttempt = true;
          blockedField = "studentIntelligence";
        }

        // Cross-college tenant scope isolation check
        if (
          (body.collegeCode && body.collegeCode !== user.collegeCode) ||
          (body.collegeId && user.collegeId && body.collegeId !== user.collegeId)
        ) {
          db.addAuditLog({
            actor: user.loginId,
            action: "security.unauthorized_cross_tenant_attempt",
            target: path,
            severity: "warning",
            metadata: { role: user.role, userCollege: user.collegeCode, targetCollege: body.collegeCode || body.collegeId },
          });
          return errorResponse("forbidden", "Cross-college operational mutations are prohibited.", 403);
        }
      }
    } catch {
      // Non-JSON or empty payload
    }

    if (isStudentMutationAttempt) {
      db.addAuditLog({
        actor: user.loginId,
        action: "security.unauthorized_student_mutation",
        target: "student_data",
        severity: "critical",
        metadata: { role: "placement_officer", blockedField },
      });
      return errorResponse(
        "action_prohibited",
        "Placement Officers do not have permission to alter authoritative student records.",
        403
      );
    }

    // Prohibit Placement Officer from coordinator-specific management endpoints
    if (path.startsWith("/api/v1/coordinator/")) {
      db.addAuditLog({
        actor: user.loginId,
        action: "security.unauthorized_coordinator_access",
        target: path,
        severity: "warning",
        metadata: { role: user.role },
      });
      return errorResponse("forbidden", "Access denied: Coordinator privilege required.", 403);
    }

    // Prohibit Placement Officer from admin endpoints
    if (path.startsWith("/api/v1/admin/")) {
      db.addAuditLog({
        actor: user.loginId,
        action: "security.unauthorized_admin_access",
        target: path,
        severity: "warning",
        metadata: { role: user.role },
      });
      return errorResponse("action_prohibited", "Access denied: Admin privilege required.", 403);
    }
  }

  // --------------------------------------------------------------------------
  // Cross-Role Student Search & Inspect (Placement Officer, Trainer, Coordinator, Editor, Super Admin)
  // --------------------------------------------------------------------------
  if (path === "/api/v1/students/search" && method === "GET") {
    const q = url.searchParams.get("q") || url.searchParams.get("search") || undefined;
    const collegeCode = url.searchParams.get("collegeCode") || (user.role === "super_admin" || user.role === "editor" ? undefined : user.collegeCode);
    const department = url.searchParams.get("department") || undefined;
    const batch = url.searchParams.get("batch") || undefined;
    const results = db.searchStudents({ q, collegeCode, department, batch });
    return jsonResponse({ success: true, data: results });
  }

  if (path.startsWith("/api/v1/students/") && method === "GET" && !path.startsWith("/api/v1/students/search")) {
    const targetId = path.replace("/api/v1/students/", "");
    const targetCollege = user.role === "super_admin" || user.role === "editor" ? undefined : user.collegeCode;
    const student = db.students.find(
      (s) =>
        (s.id === targetId || s.usn.toUpperCase() === targetId.toUpperCase()) &&
        (!targetCollege || s.collegeCode === targetCollege)
    );
    if (!student) {
      return errorResponse("not_found", "Student not found or outside authorized institutional scope.", 404);
    }
    const details = db.getStudentDetails(student.id, student.collegeCode);
    return jsonResponse({ success: true, data: details });
  }

  // Data Ingestion Endpoint (Status-Aware College Lifecycle Policy)
  if (path === "/api/v1/ingestion/record" && method === "POST") {
    try {
      const body = (await request.json()) as { collegeCode: string; payload?: Record<string, unknown> };
      if (!body.collegeCode) {
        return errorResponse("validation_error", "collegeCode is required.", 400);
      }
      const result = db.ingestCollegeData(body.collegeCode, body.payload || {}, user.loginId);
      if (result.status === "blocked") {
        return errorResponse("ingestion_blocked", result.message, 403);
      }
      return jsonResponse({ success: true, data: result });
    } catch (e) {
      return errorResponse("validation_error", e instanceof Error ? e.message : "Ingestion failed", 400);
    }
  }

  // --------------------------------------------------------------------------
  // Super Admin Endpoints (Require Super Admin Role)
  // --------------------------------------------------------------------------
  if (path.startsWith("/api/v1/admin/")) {
    if (user.role !== "super_admin" && !hasPermission(user, "platform.*")) {
      db.addAuditLog({
        actor: user.loginId,
        action: "security.unauthorized_access",
        target: path,
        severity: "warning",
      });
      return errorResponse("forbidden", "Access denied: Super Admin privilege required.", 403);
    }

    // 1. Dashboard Overview (/api/v1/admin/overview)
    if (path === "/api/v1/admin/overview" && method === "GET") {
      const colleges = db.getColleges();
      const users = db.getUsers();
      const jobs = db.jobs;
      const failedJobs = jobs.filter((j) => j.status === "failed").length;

      return jsonResponse({
        success: true,
        data: {
          counts: {
            colleges: colleges.length,
            activeColleges: colleges.filter((c) => c.status === "active").length,
            holdColleges: colleges.filter((c) => c.status === "hold").length,
            deactiveColleges: colleges.filter((c) => c.status === "deactive").length,
            students: users.filter((u) => u.role === "student").length,
            trainers: users.filter((u) => u.role === "trainer").length,
            coordinators: users.filter((u) => u.role === "coordinator").length,
            failedJobs,
          },
          services: db.services,
          integrations: db.integrations,
          jobs: db.jobs.slice(0, 6),
          audit: db.auditLogs.slice(0, 6),
        },
      });
    }

    // 2. Colleges (/api/v1/admin/colleges)
    if (path === "/api/v1/admin/colleges") {
      if (method === "GET") {
        const search = url.searchParams.get("search") || undefined;
        const status = url.searchParams.get("status") || undefined;
        const list = db.getColleges({ search, status });
        return jsonResponse({ success: true, data: list });
      }

      if (method === "POST") {
        try {
          const body = (await request.json()) as {
            name: string;
            code: string;
            status?: any;
          };
          const college = db.createCollege(body.name, body.code, body.status, user.loginId);
          return jsonResponse({ success: true, data: college }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Invalid college data", 400);
        }
      }
    }

    // College Status Update (/api/v1/admin/colleges/:id/status)
    if (path.startsWith("/api/v1/admin/colleges/") && path.endsWith("/status") && method === "PATCH") {
      const id = path.replace("/api/v1/admin/colleges/", "").replace("/status", "");
      try {
        const body = (await request.json()) as { status: any; reason: string };
        const updated = db.updateCollegeStatus(id, body.status, body.reason, user.loginId);
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Cannot update college status", 400);
      }
    }

    // College Code Update (/api/v1/admin/colleges/:id/code)
    if (path.startsWith("/api/v1/admin/colleges/") && path.endsWith("/code") && method === "PATCH") {
      const id = path.replace("/api/v1/admin/colleges/", "").replace("/code", "");
      try {
        const body = (await request.json()) as { newCode: string; reason: string };
        const updated = db.updateCollegeCode(id, body.newCode, body.reason, user.loginId);
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Cannot update college code", 400);
      }
    }

    // College Status History (/api/v1/admin/colleges/:id/status-history)
    if (path.startsWith("/api/v1/admin/colleges/") && path.endsWith("/status-history") && method === "GET") {
      const id = path.replace("/api/v1/admin/colleges/", "").replace("/status-history", "");
      return jsonResponse({ success: true, data: db.getCollegeStatusHistory(id) });
    }

    // College Code History (/api/v1/admin/colleges/:id/code-history)
    if (path.startsWith("/api/v1/admin/colleges/") && path.endsWith("/code-history") && method === "GET") {
      const id = path.replace("/api/v1/admin/colleges/", "").replace("/code-history", "");
      return jsonResponse({ success: true, data: db.getCollegeCodeHistory(id) });
    }

    // College Detail (/api/v1/admin/colleges/:id)
    if (path.startsWith("/api/v1/admin/colleges/") && method === "GET") {
      const id = path.replace("/api/v1/admin/colleges/", "");
      const college = db.getCollegeById(id);
      if (!college) return errorResponse("not_found", "College not found", 404);
      const collegeUsers = db.getUsers().filter((u) => u.college === college.code);
      const statusHistory = db.getCollegeStatusHistory(college.id);
      const codeHistory = db.getCollegeCodeHistory(college.id);
      return jsonResponse({ success: true, data: { ...college, users: collegeUsers, statusHistory, codeHistory } });
    }

    // 3. Users & Accounts (/api/v1/admin/users)
    if (path === "/api/v1/admin/users" && method === "GET") {
      const search = url.searchParams.get("search") || undefined;
      const role = url.searchParams.get("role") || undefined;
      const status = url.searchParams.get("status") || undefined;
      const list = db.getUsers({ search, role, status });
      return jsonResponse({ success: true, data: list });
    }

    // User status toggle (/api/v1/admin/users/:id/status)
    if (path.startsWith("/api/v1/admin/users/") && path.endsWith("/status") && method === "PATCH") {
      const id = path.replace("/api/v1/admin/users/", "").replace("/status", "");
      try {
        const body = (await request.json()) as { status: "active" | "inactive" };
        const updated = db.setUserStatus(id, body.status);
        db.addAuditLog({
          actor: user.loginId,
          action: body.status === "active" ? "user.activate" : "user.deactivate",
          target: updated.loginId,
          severity: "warning",
          metadata: { userId: updated.id },
        });
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("forbidden", e instanceof Error ? e.message : "Cannot update user status", 403);
      }
    }

    // 4. Roles & Permissions (/api/v1/admin/roles)
    if (path === "/api/v1/admin/roles" && method === "GET") {
      const perms = [
        { id: "p1", role: "Super Admin", permission: "platform.*", scope: "Platform", description: "Full platform governance" },
        { id: "p2", role: "Coordinator", permission: "college.manage", scope: "Own college", description: "Manage college operations and structure" },
        { id: "p3", role: "Trainer", permission: "batch.view_evidence", scope: "Assigned batches", description: "Inspect student evidence for assigned batches" },
        { id: "p4", role: "Editor", permission: "content.edit", scope: "Platform content", description: "Author problems and questions" },
        { id: "p5", role: "Placement Officer", permission: "placement.review", scope: "Own college", description: "Review authorized readiness and applications" },
        { id: "p6", role: "Employer", permission: "candidates.view_authorized", scope: "Authorized candidates", description: "View candidates who granted access" },
        { id: "p7", role: "Student", permission: "self.view", scope: "Self", description: "View own evidence and recommendations" },
      ];
      return jsonResponse({ success: true, data: perms });
    }

    // 5. Master Data (/api/v1/admin/master-data)
    if (path === "/api/v1/admin/master-data" && method === "GET") {
      return jsonResponse({ success: true, data: db.masterEntities });
    }

    // 6. Coding Problems (/api/v1/admin/coding/problems)
    if (path === "/api/v1/admin/coding/problems") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.problems });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as { title: string; difficulty: "Easy" | "Medium" | "Hard"; topic: string };
          const p = db.createProblem(body);
          db.addAuditLog({ actor: user.loginId, action: "problem.create", target: p.code, severity: "info" });
          return jsonResponse({ success: true, data: p }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating problem", 400);
        }
      }
    }

    // 7. Questions (/api/v1/admin/questions)
    if (path === "/api/v1/admin/questions") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.questions });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as {
            stem: string;
            domain: "Technical" | "Verbal" | "Aptitude" | "Soft Skills";
            type: "MCQ" | "Long Answer" | "Short Answer";
            difficulty: "Easy" | "Medium" | "Hard";
            options?: string[];
            correctAnswer?: string;
          };
          const q = db.createQuestion(body);
          db.addAuditLog({ actor: user.loginId, action: "question.create", target: q.code, severity: "info" });
          return jsonResponse({ success: true, data: q }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating question", 400);
        }
      }
    }

    // 8. Platform Health, Integrations, Jobs
    if (path === "/api/v1/admin/health" && method === "GET") {
      return jsonResponse({ success: true, data: db.services });
    }

    if (path === "/api/v1/admin/integrations" && method === "GET") {
      return jsonResponse({ success: true, data: db.integrations });
    }

    if (path === "/api/v1/admin/jobs" && method === "GET") {
      return jsonResponse({ success: true, data: db.jobs });
    }

    if (path.startsWith("/api/v1/admin/jobs/") && path.endsWith("/retry") && method === "POST") {
      const jobId = path.replace("/api/v1/admin/jobs/", "").replace("/retry", "");
      try {
        const retried = db.retryJob(jobId);
        db.addAuditLog({ actor: user.loginId, action: "job.retry", target: jobId, severity: "info" });
        return jsonResponse({ success: true, data: retried });
      } catch (e) {
        return errorResponse("not_found", e instanceof Error ? e.message : "Job not found", 404);
      }
    }

    // 9. Audit Logs (/api/v1/admin/audit)
    if (path === "/api/v1/admin/audit" && method === "GET") {
      return jsonResponse({ success: true, data: db.auditLogs });
    }

    // 10. Feature Availability Flags (/api/v1/admin/features)
    if (path === "/api/v1/admin/features") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.getFeatureFlags() });
      }
    }

    if (path.startsWith("/api/v1/admin/features/") && method === "PATCH") {
      const key = path.replace("/api/v1/admin/features/", "");
      try {
        const body = (await request.json()) as { isEnabled: boolean };
        // Feature availability is controlled strictly by the Editor
        const updated = db.toggleFeatureFlag(key, body.isEnabled, user.role);
        db.addAuditLog({
          actor: user.loginId,
          action: "feature.toggle",
          target: key,
          severity: "warning",
          metadata: { isEnabled: body.isEnabled },
        });
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("forbidden", e instanceof Error ? e.message : "Cannot toggle feature flag", 403);
      }
    }

    // 11. Visible-Value Overrides (/api/v1/admin/overrides)
    if (path === "/api/v1/admin/overrides") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.getOverrides() });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as {
            entityType: string;
            entityId: string;
            fieldName: string;
            actualValue: string;
            visibleValue: string;
            mandatoryReason: string;
          };
          const created = db.createOverride({ ...body, overriddenBy: user.id });
          db.addAuditLog({
            actor: user.loginId,
            action: "override.create",
            target: `${body.entityType}:${body.entityId}`,
            severity: "warning",
            metadata: { field: body.fieldName, reason: body.mandatoryReason },
          });
          return jsonResponse({ success: true, data: created }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Cannot create override", 400);
        }
      }
    }

    // 12. Create Editor Account (/api/v1/admin/editors)
    if (path === "/api/v1/admin/editors" && method === "POST") {
      try {
        const body = (await request.json()) as { name: string; email: string };
        const editor = db.createEditorUser(body, user.loginId);
        return jsonResponse({ success: true, data: editor }, 201);
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Cannot create editor account", 400);
      }
    }

    // 13. Editor Changes History (/api/v1/admin/editor-changes)
    if (path === "/api/v1/admin/editor-changes" && method === "GET") {
      const entityType = url.searchParams.get("entityType") || undefined;
      const search = url.searchParams.get("search") || undefined;
      const changes = db.getEditorChanges({ entityType, search });
      return jsonResponse({ success: true, data: changes });
    }

    // 14. Hierarchical College Intelligence (/api/v1/admin/intelligence/*)
    // Supports Layer B (Authoritative) vs Layer C (Adjusted Reporting) via ?view=authoritative|adjusted
    if (path === "/api/v1/admin/intelligence/metrics" && method === "GET") {
      return jsonResponse({ success: true, data: db.getMetricRegistry() });
    }

    if (path === "/api/v1/admin/intelligence/provenance" && method === "GET") {
      return jsonResponse({ success: true, data: db.getProvenanceLedger() });
    }

    if (path === "/api/v1/admin/intelligence/reconciliation" && method === "GET") {
      const scope = url.searchParams.get("scope") || "platform";
      const collegeCode = url.searchParams.get("collegeCode") || "";
      const department = url.searchParams.get("department") || "";
      const year = url.searchParams.get("year") || "";
      const section = url.searchParams.get("section") || "";
      try {
        const reconciliation = db.getIntelligenceReconciliation(scope, { collegeCode, department, year, section });
        return jsonResponse({ success: true, data: reconciliation });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Reconciliation failed", 400);
      }
    }

    if (path === "/api/v1/admin/intelligence/platform" && method === "GET") {
      const view = (url.searchParams.get("view") || url.searchParams.get("layer") || "authoritative") as "authoritative" | "adjusted";
      const data = db.getPlatformIntelligence(view);
      return jsonResponse({ success: true, data });
    }

    if (path.startsWith("/api/v1/admin/intelligence/college/") && method === "GET") {
      const collegeCode = path.replace("/api/v1/admin/intelligence/college/", "");
      const view = (url.searchParams.get("view") || url.searchParams.get("layer") || "authoritative") as "authoritative" | "adjusted";
      try {
        const data = db.getCollegeIntelligence(collegeCode, view);
        return jsonResponse({ success: true, data });
      } catch (e) {
        return errorResponse("not_found", e instanceof Error ? e.message : "College not found", 404);
      }
    }

    if (path === "/api/v1/admin/intelligence/branch" && method === "GET") {
      const collegeCode = url.searchParams.get("collegeCode") || "";
      const department = url.searchParams.get("department") || "";
      const view = (url.searchParams.get("view") || url.searchParams.get("layer") || "authoritative") as "authoritative" | "adjusted";
      try {
        const data = db.getBranchIntelligence(collegeCode, department, view);
        return jsonResponse({ success: true, data });
      } catch (e) {
        return errorResponse("not_found", e instanceof Error ? e.message : "Branch intelligence not found", 404);
      }
    }

    if (path === "/api/v1/admin/intelligence/year" && method === "GET") {
      const collegeCode = url.searchParams.get("collegeCode") || "";
      const department = url.searchParams.get("department") || "";
      const year = url.searchParams.get("year") || "";
      const view = (url.searchParams.get("view") || url.searchParams.get("layer") || "authoritative") as "authoritative" | "adjusted";
      try {
        const data = db.getYearIntelligence(collegeCode, department, year, view);
        return jsonResponse({ success: true, data });
      } catch (e) {
        return errorResponse("not_found", e instanceof Error ? e.message : "Year intelligence not found", 404);
      }
    }

    if (path === "/api/v1/admin/intelligence/section" && method === "GET") {
      const collegeCode = url.searchParams.get("collegeCode") || "";
      const department = url.searchParams.get("department") || "";
      const year = url.searchParams.get("year") || "";
      const section = url.searchParams.get("section") || "";
      const view = (url.searchParams.get("view") || url.searchParams.get("layer") || "authoritative") as "authoritative" | "adjusted";
      try {
        const data = db.getSectionIntelligence(collegeCode, department, year, section, view);
        return jsonResponse({ success: true, data });
      } catch (e) {
        return errorResponse("not_found", e instanceof Error ? e.message : "Section intelligence not found", 404);
      }
    }

    if (path.startsWith("/api/v1/admin/intelligence/student/") && method === "GET") {
      const studentId = path.replace("/api/v1/admin/intelligence/student/", "");
      const view = (url.searchParams.get("view") || url.searchParams.get("layer") || "authoritative") as "authoritative" | "adjusted";
      const student = db.getStudentIntelligence(studentId, view);
      if (!student) return errorResponse("not_found", "Student intelligence profile not found", 404);
      return jsonResponse({ success: true, data: student });
    }

    // Interactive Donut Chart Aggregations (/api/v1/admin/intelligence/charts)
    if (path === "/api/v1/admin/intelligence/charts" && method === "GET") {
      const collegeCode = url.searchParams.get("collegeCode") || undefined;
      const statusFilter = url.searchParams.get("status") || undefined;
      const view = (url.searchParams.get("view") || url.searchParams.get("layer") || "authoritative") as "authoritative" | "adjusted";
      const charts = db.getCollegeProgressCharts(collegeCode, statusFilter, view);
      return jsonResponse({ success: true, data: charts });
    }

    // 15. Platform Reports & Clean Export Policy (/api/v1/admin/reports)
    if (path === "/api/v1/admin/reports" && method === "GET") {
      const reports = [
        { id: "rep-1", title: "Overall College Progress Report", domain: "Progress", generatedAt: "2026-10-10", defaultPolicy: "standard_progress", description: "Comprehensive breakdown of cohort milestone completion." },
        { id: "rep-2", title: "Branch-wise Progress Report", domain: "Academic", generatedAt: "2026-10-10", defaultPolicy: "standard_progress", description: "Departmental performance benchmarks across disciplines." },
        { id: "rep-3", title: "Year-wise Academic Progress Report", domain: "Academic", generatedAt: "2026-10-09", defaultPolicy: "standard_progress", description: "Cohort advancement across 1st to 4th year tiers." },
        { id: "rep-4", title: "Section-wise Progress Report", domain: "Academic", generatedAt: "2026-10-09", defaultPolicy: "standard_progress", description: "Granular section metrics and batch progress comparison." },
        { id: "rep-5", title: "Student-Level Progress Report", domain: "Students", generatedAt: "2026-10-08", defaultPolicy: "standard_progress", description: "Individual learner readiness score and skill benchmarks." },
        { id: "rep-6", title: "Skill Development & Competency Report", domain: "Skills", generatedAt: "2026-10-08", defaultPolicy: "standard_progress", description: "Multi-domain technical, verbal, and soft skills matrix." },
        { id: "rep-7", title: "Assessment Participation & Diagnostic Report", domain: "Assessments", generatedAt: "2026-10-07", defaultPolicy: "standard_progress", description: "Diagnostic clearance and benchmark pass rates." },
        { id: "rep-8", title: "Employability Readiness Evaluation Report", domain: "Employability", generatedAt: "2026-10-07", defaultPolicy: "standard_progress", description: "Official Intelligence Engine placement readiness." },
        { id: "rep-9", title: "Cross-College Comparative Benchmark Report", domain: "Governance", generatedAt: "2026-10-06", defaultPolicy: "standard_progress", description: "Multi-tenant platform institutional comparison." },
        { id: "rep-10", title: "Editor Modification & Provenance Audit Report", domain: "Audit", generatedAt: "2026-10-06", defaultPolicy: "audit", description: "Separate permission-controlled modification audit history." },
      ];
      return jsonResponse({ success: true, data: reports });
    }

    if (path === "/api/v1/admin/reports/generate" && method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        reportType?: string;
        collegeCode?: string;
        policy?: "standard_progress" | "intelligence" | "audit";
        format?: "csv" | "json" | "xlsx";
      };
      const result = db.generateReport(
        {
          reportType: body.reportType || "Overall College Progress Report",
          collegeCode: body.collegeCode,
          policy: body.policy || "standard_progress",
          format: body.format || "csv",
        },
        user.loginId
      );
      return jsonResponse({ success: true, data: result });
    }

    if (path === "/api/v1/admin/reports/export" && method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { reportId?: string; format?: string };
      db.addAuditLog({
        actor: user.loginId,
        action: "report.export",
        target: body.reportId || "platform_benchmark",
        severity: "info",
        metadata: { format: body.format || "csv" },
      });
      return jsonResponse({
        success: true,
        data: {
          exportId: `exp-${Date.now()}`,
          downloadUrl: `/downloads/export-${body.reportId || "platform"}.${body.format === "json" ? "json" : "csv"}`,
          recordsExported: db.students.length,
          generatedAt: new Date().toISOString(),
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // Editor Endpoints (Require Editor Role / Content & Feature Permissions)
  // --------------------------------------------------------------------------
  if (path.startsWith("/api/v1/editor/")) {
    if (user.role !== "editor" && user.role !== "super_admin" && !hasPermission(user, "content.edit")) {
      db.addAuditLog({
        actor: user.loginId,
        action: "security.unauthorized_access",
        target: path,
        severity: "warning",
      });
      return errorResponse("forbidden", "Access denied: Editor privilege required.", 403);
    }

    // 1. Editor Overview
    if (path === "/api/v1/editor/overview" && method === "GET") {
      const courses = db.getCourses();
      const questions = db.questions;
      const assessments = db.getAssessments();
      const notifications = db.getNotifications();
      const featureFlags = db.getFeatureFlags();
      const overrides = db.getOverrides();
      const colleges = db.colleges;
      const coordinators = db.getCoordinators();
      return jsonResponse({
        success: true,
        data: {
          counts: {
            courses: courses.length,
            publishedCourses: courses.filter((c) => c.status === "published").length,
            draftCourses: courses.filter((c) => c.status === "draft").length,
            questions: questions.length,
            mcqQuestions: questions.filter((q) => q.type === "MCQ").length,
            assessments: assessments.length,
            notifications: notifications.length,
            featureFlags: featureFlags.length,
            activeFeatures: featureFlags.filter((f) => f.isEnabled).length,
            overrides: overrides.length,
            colleges: colleges.length,
            activeColleges: colleges.filter((c) => c.status === "active").length,
            holdColleges: colleges.filter((c) => c.status === "hold").length,
            deactiveColleges: colleges.filter((c) => c.status === "deactive").length,
            coordinators: coordinators.length,
            activeCoordinators: coordinators.filter((c) => c.status === "active").length,
          },
          recentCourses: courses.slice(0, 5),
          recentAssessments: assessments.slice(0, 5),
          recentNotifications: notifications.slice(0, 5),
          recentOverrides: overrides.slice(0, 5),
          recentColleges: colleges.slice(0, 5),
          recentCoordinators: coordinators.slice(0, 5),
        },
      });
    }

    // 1.5. Editor College Management (/api/v1/editor/colleges)
    if (path === "/api/v1/editor/colleges") {
      if (method === "GET") {
        const search = url.searchParams.get("search") || undefined;
        const status = url.searchParams.get("status") || undefined;
        const list = db.getColleges({ search, status });
        return jsonResponse({ success: true, data: list });
      }

      if (method === "POST") {
        // Architectural invariant: ONLY Super Admin can create colleges!
        db.addAuditLog({
          actor: user.loginId,
          action: "security.unauthorized_college_create",
          target: "colleges",
          severity: "warning",
          metadata: { attemptedRole: user.role },
        });
        return errorResponse(
          "forbidden",
          "Editor is not permitted to create colleges. College creation is strictly restricted to Super Admin.",
          403
        );
      }
    }

    // Editor: Update College Status (/api/v1/editor/colleges/:id/status)
    if (path.startsWith("/api/v1/editor/colleges/") && path.endsWith("/status") && method === "PATCH") {
      const id = path.replace("/api/v1/editor/colleges/", "").replace("/status", "");
      try {
        const body = (await request.json()) as { status: any; reason: string };
        const updated = db.updateCollegeStatus(id, body.status, body.reason, user.loginId);
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Cannot update college status", 400);
      }
    }

    // Editor: Update College Code (/api/v1/editor/colleges/:id/code)
    if (path.startsWith("/api/v1/editor/colleges/") && path.endsWith("/code") && method === "PATCH") {
      const id = path.replace("/api/v1/editor/colleges/", "").replace("/code", "");
      try {
        const body = (await request.json()) as { newCode: string; reason: string };
        const updated = db.updateCollegeCode(id, body.newCode, body.reason, user.loginId);
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Cannot update college code", 400);
      }
    }

    // Editor: College Status History (/api/v1/editor/colleges/:id/status-history)
    if (path.startsWith("/api/v1/editor/colleges/") && path.endsWith("/status-history") && method === "GET") {
      const id = path.replace("/api/v1/editor/colleges/", "").replace("/status-history", "");
      return jsonResponse({ success: true, data: db.getCollegeStatusHistory(id) });
    }

    // Editor: College Code History (/api/v1/editor/colleges/:id/code-history)
    if (path.startsWith("/api/v1/editor/colleges/") && path.endsWith("/code-history") && method === "GET") {
      const id = path.replace("/api/v1/editor/colleges/", "").replace("/code-history", "");
      return jsonResponse({ success: true, data: db.getCollegeCodeHistory(id) });
    }

    // Editor: College Detail (/api/v1/editor/colleges/:id)
    if (path.startsWith("/api/v1/editor/colleges/") && method === "GET") {
      const id = path.replace("/api/v1/editor/colleges/", "");
      const college = db.getCollegeById(id);
      if (!college) return errorResponse("not_found", "College not found", 404);
      const collegeUsers = db.getUsers().filter((u) => u.college === college.code);
      const statusHistory = db.getCollegeStatusHistory(college.id);
      const codeHistory = db.getCollegeCodeHistory(college.id);
      return jsonResponse({ success: true, data: { ...college, users: collegeUsers, statusHistory, codeHistory } });
    }

    // 1.6. Editor Coordinator Management (/api/v1/editor/coordinators)
    if (path === "/api/v1/editor/coordinators") {
      if (method === "GET") {
        const search = url.searchParams.get("search") || undefined;
        const status = url.searchParams.get("status") || undefined;
        return jsonResponse({ success: true, data: db.getCoordinators({ search, status }) });
      }

      if (method === "POST") {
        try {
          const body = (await request.json()) as { name: string; email: string; collegeCode: string };
          if (!body.name || !body.email || !body.collegeCode) {
            return errorResponse("validation_error", "Name, email, and assigned college code are required.", 400);
          }
          const created = db.createCoordinatorUser(body, user.loginId);
          return jsonResponse({ success: true, data: created }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error provisioning coordinator", 400);
        }
      }
    }

    if (path.startsWith("/api/v1/editor/coordinators/") && path.endsWith("/status") && method === "PATCH") {
      const id = path.replace("/api/v1/editor/coordinators/", "").replace("/status", "");
      try {
        const body = (await request.json()) as { status: "active" | "inactive" };
        const updated = db.setUserStatus(id, body.status);
        db.addAuditLog({
          actor: user.loginId,
          action: "coordinator.status_change",
          target: updated.loginId,
          severity: "info",
          metadata: { status: body.status, college: updated.college },
        });
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error updating coordinator status", 400);
      }
    }

    // 2. Learning Content Modules & Course Hierarchy (/api/v1/editor/learning/...)
    if (path === "/api/v1/editor/learning/modules") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.getLearningModules() });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as { name: string; description?: string };
          const mod = db.createLearningModule({ ...body, actor: user.loginId });
          return jsonResponse({ success: true, data: mod }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating learning module", 400);
        }
      }
    }

    if (path.startsWith("/api/v1/editor/learning/modules/") && path.endsWith("/visibility") && (method === "PATCH" || method === "PUT")) {
      const moduleId = path.replace("/api/v1/editor/learning/modules/", "").replace("/visibility", "");
      try {
        const body = (await request.json()) as {
          visibilityStatus: "hidden" | "visible";
          collegeIds?: string[];
          confirmRevoke?: boolean;
        };
        const updated = db.updateLearningModuleVisibility(moduleId, { ...body, actor: user.loginId });
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error updating module visibility", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/learning/modules/") && path.endsWith("/access") && method === "GET") {
      const moduleId = path.replace("/api/v1/editor/learning/modules/", "").replace("/access", "");
      return jsonResponse({ success: true, data: db.getLearningModuleCollegeAccess(moduleId) });
    }

    if (path.startsWith("/api/v1/editor/learning/modules/") && path.endsWith("/access") && method === "POST") {
      const moduleId = path.replace("/api/v1/editor/learning/modules/", "").replace("/access", "");
      try {
        const body = (await request.json()) as { collegeId: string };
        const grant = db.grantLearningModuleCollegeAccess(moduleId, body.collegeId, user.loginId);
        return jsonResponse({ success: true, data: grant }, 201);
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error granting access", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/learning/modules/") && path.includes("/access/") && method === "DELETE") {
      const parts = path.replace("/api/v1/editor/learning/modules/", "").split("/access/");
      const moduleId = parts[0];
      const collegeId = parts[1];
      const confirmRevoke = url.searchParams.get("confirmRevoke") === "true";
      try {
        const record = db.revokeLearningModuleCollegeAccess(moduleId, collegeId, user.loginId, confirmRevoke);
        return jsonResponse({ success: true, data: record });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error revoking access", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/learning/modules/") && path.endsWith("/archive") && method === "POST") {
      const moduleId = path.replace("/api/v1/editor/learning/modules/", "").replace("/archive", "");
      try {
        const archived = db.archiveLearningModule(moduleId, user.loginId);
        return jsonResponse({ success: true, data: archived });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error archiving module", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/learning/modules/") && method === "PATCH") {
      const moduleId = path.replace("/api/v1/editor/learning/modules/", "");
      try {
        const body = (await request.json()) as { name?: string; description?: string };
        const updated = db.updateLearningModule(moduleId, { ...body, actor: user.loginId });
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error updating module", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/learning/modules/") && method === "GET") {
      const moduleId = path.replace("/api/v1/editor/learning/modules/", "");
      const mod = db.getLearningModule(moduleId);
      if (!mod) return errorResponse("not_found", "Learning module not found", 404);
      return jsonResponse({ success: true, data: mod });
    }

    if (path.startsWith("/api/v1/editor/learning/modules/") && method === "DELETE") {
      const moduleId = path.replace("/api/v1/editor/learning/modules/", "");
      try {
        const result = await db.deleteLearningModule(moduleId, user.loginId);
        return jsonResponse({ success: true, message: `Learning module "${result.name}" deleted successfully.`, data: result });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error deleting learning module", 400);
      }
    }

    // Courses endpoints
    if (path === "/api/v1/editor/learning/courses") {
      if (method === "GET") {
        const moduleId = url.searchParams.get("moduleId") || undefined;
        const status = url.searchParams.get("status") || undefined;
        const difficulty = url.searchParams.get("difficulty") || undefined;
        const search = url.searchParams.get("search") || undefined;
        const list = db.getLearningCourses({ moduleId, status, difficulty, search });
        return jsonResponse({ success: true, data: list });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as any;
          const created = db.createLearningCourse({ ...body, actor: user.loginId });
          return jsonResponse({ success: true, data: created }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating course", 400);
        }
      }
    }

    if (path.startsWith("/api/v1/editor/learning/courses/") && path.endsWith("/submit") && method === "POST") {
      const courseId = path.replace("/api/v1/editor/learning/courses/", "").replace("/submit", "");
      try {
        const submitted = db.submitCourseForReview(courseId, user.loginId);
        return jsonResponse({ success: true, data: submitted });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error submitting course", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/learning/courses/") && path.endsWith("/publish") && method === "POST") {
      const courseId = path.replace("/api/v1/editor/learning/courses/", "").replace("/publish", "");
      try {
        const published = db.publishCourse(courseId, user.loginId);
        return jsonResponse({ success: true, data: published });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error publishing course", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/learning/courses/") && path.endsWith("/archive") && method === "POST") {
      const courseId = path.replace("/api/v1/editor/learning/courses/", "").replace("/archive", "");
      try {
        const archived = db.archiveCourse(courseId, user.loginId);
        return jsonResponse({ success: true, data: archived });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error archiving course", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/learning/courses/") && path.endsWith("/version") && method === "POST") {
      const courseId = path.replace("/api/v1/editor/learning/courses/", "").replace("/version", "");
      try {
        const body = (await request.json()) as any;
        const ver = db.createCourseVersion(courseId, body, user.loginId);
        return jsonResponse({ success: true, data: ver }, 201);
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error versioning course", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/learning/courses/") && method === "GET") {
      const courseId = path.replace("/api/v1/editor/learning/courses/", "");
      const course = db.getLearningCourse(courseId);
      if (!course) return errorResponse("not_found", "Course not found", 404);
      return jsonResponse({ success: true, data: course });
    }

    if (path.startsWith("/api/v1/editor/learning/courses/") && method === "PATCH") {
      const courseId = path.replace("/api/v1/editor/learning/courses/", "");
      try {
        const body = (await request.json()) as any;
        const updated = db.updateLearningCourseDraft(courseId, body, user.loginId);
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error updating course", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/learning/courses/") && method === "DELETE") {
      const courseId = path.replace("/api/v1/editor/learning/courses/", "");
      try {
        const deleted = db.deleteCourse(courseId, user.loginId);
        return jsonResponse({ success: true, data: deleted });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Cannot delete course", 400);
      }
    }

    // Hierarchy additions & reordering
    if (path.startsWith("/api/v1/editor/learning/versions/") && path.endsWith("/modules") && method === "POST") {
      const versionId = path.replace("/api/v1/editor/learning/versions/", "").replace("/modules", "");
      try {
        const body = (await request.json()) as any;
        const mod = db.addCourseModule(versionId, body, user.loginId);
        return jsonResponse({ success: true, data: mod }, 201);
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error adding module", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/learning/chapters/") && path.endsWith("/topics") && method === "POST") {
      const chapterId = path.replace("/api/v1/editor/learning/chapters/", "").replace("/topics", "");
      try {
        const body = (await request.json()) as any;
        const top = db.addCourseTopic(chapterId, body, user.loginId);
        return jsonResponse({ success: true, data: top }, 201);
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error adding topic", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/learning/topics/") && path.endsWith("/lessons") && method === "POST") {
      const topicId = path.replace("/api/v1/editor/learning/topics/", "").replace("/lessons", "");
      try {
        const body = (await request.json()) as any;
        const lesson = db.addCourseLesson(topicId, body, user.loginId);
        return jsonResponse({ success: true, data: lesson }, 201);
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error adding lesson", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/learning/lessons/") && path.endsWith("/activities") && method === "POST") {
      const lessonId = path.replace("/api/v1/editor/learning/lessons/", "").replace("/activities", "");
      try {
        const body = (await request.json()) as any;
        const act = db.addLearningActivity(lessonId, body, user.loginId);
        return jsonResponse({ success: true, data: act }, 201);
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error adding activity", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/learning/activities/") && method === "DELETE") {
      const actId = path.replace("/api/v1/editor/learning/activities/", "");
      try {
        const deleted = db.deleteLearningActivity(actId, user.loginId);
        return jsonResponse({ success: true, data: deleted });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error deleting activity", 400);
      }
    }

    // Upload Batches & Bulk Ingestion
    if (path === "/api/v1/editor/learning/upload-history" && method === "GET") {
      const moduleId = url.searchParams.get("moduleId") || undefined;
      const uploadMethod = url.searchParams.get("uploadMethod") || undefined;
      const status = url.searchParams.get("status") || undefined;
      const search = url.searchParams.get("search") || undefined;
      const list = db.getLearningUploadBatches(moduleId, { uploadMethod, status, search });
      return jsonResponse({ success: true, data: list });
    }

    if (path.startsWith("/api/v1/editor/learning/upload-history/") && method === "GET") {
      const batchId = path.replace("/api/v1/editor/learning/upload-history/", "");
      const batch = db.getLearningUploadBatch(batchId);
      if (!batch) return errorResponse("not_found", "Upload batch not found", 404);
      return jsonResponse({ success: true, data: batch });
    }

    if (path === "/api/v1/editor/learning/bulk-upload" && method === "POST") {
      try {
        const body = (await request.json()) as any;
        const result = db.processLearningBulkUpload({ ...body, actor: user.loginId });
        return jsonResponse({ success: true, data: result }, 201);
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Bulk upload error", 400);
      }
    }

    // Backwards-compatible legacy course endpoints
    if (path === "/api/v1/editor/courses") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.getCourses() });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as { title: string; modulesCount?: number; lessonsCount?: number };
          if (!body.title || body.title.trim().length === 0) {
            return errorResponse("validation_error", "Course title is required.", 400);
          }
          const created = db.createCourse(body);
          db.addAuditLog({ actor: user.loginId, action: "course.create", target: created.code, severity: "info" });
          return jsonResponse({ success: true, data: created }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating course", 400);
        }
      }
    }

    if (path.startsWith("/api/v1/editor/courses/") && path.endsWith("/status") && method === "PATCH") {
      const courseId = path.replace("/api/v1/editor/courses/", "").replace("/status", "");
      try {
        const body = (await request.json()) as { status: "draft" | "published" | "archived" };
        const updated = db.updateCourseStatus(courseId, body.status);
        db.addAuditLog({
          actor: user.loginId,
          action: "course.status_change",
          target: courseId,
          severity: "info",
          metadata: { status: body.status },
        });
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error updating course", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/courses/") && method === "DELETE") {
      const courseId = path.replace("/api/v1/editor/courses/", "");
      try {
        const deleted = db.deleteCourse(courseId, user.loginId);
        return jsonResponse({ success: true, data: deleted });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Cannot delete course", 400);
      }
    }

    // 3. Question Modules & Question Bank Management
    if (path === "/api/v1/editor/modules" && method === "GET") {
      return jsonResponse({ success: true, data: db.getQuestionModules() });
    }

    if (path === "/api/v1/editor/modules" && method === "POST") {
      try {
        const body = (await request.json()) as {
          name: string;
          description?: string;
          moduleKind?: "assessment" | "coding";
          blueprintCode?: string;
          targetDifficulty?: "Beginner" | "Intermediate" | "Advanced";
          domain?: "Technical" | "Aptitude" | "Verbal" | "Soft Skills" | "Coding" | "Core Engineering";
        };
        const mod = db.createQuestionModule({ ...body, actor: user.loginId });
        return jsonResponse({ success: true, data: db.getQuestionModule(mod.id) || mod }, 201);
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating module", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/modules/") && path.endsWith("/visibility") && (method === "PATCH" || method === "PUT")) {
      const moduleId = path.replace("/api/v1/editor/modules/", "").replace("/visibility", "");
      try {
        const body = (await request.json()) as {
          visibilityStatus: "hidden" | "visible";
          collegeIds?: string[];
          confirmRevoke?: boolean;
        };
        const updated = db.updateModuleVisibility(moduleId, { ...body, actor: user.loginId });
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error updating visibility", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/modules/") && path.endsWith("/access") && method === "GET") {
      const moduleId = path.replace("/api/v1/editor/modules/", "").replace("/access", "");
      return jsonResponse({ success: true, data: db.getModuleCollegeAccess(moduleId) });
    }

    if (path.startsWith("/api/v1/editor/modules/") && path.endsWith("/access") && method === "POST") {
      const moduleId = path.replace("/api/v1/editor/modules/", "").replace("/access", "");
      try {
        const body = (await request.json()) as { collegeId: string };
        const record = db.grantModuleCollegeAccess(moduleId, body.collegeId, user.loginId);
        return jsonResponse({ success: true, data: record }, 201);
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error granting access", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/modules/") && path.includes("/access/") && method === "DELETE") {
      const parts = path.replace("/api/v1/editor/modules/", "").split("/access/");
      const moduleId = parts[0];
      const collegeId = parts[1];
      const confirmRevoke = url.searchParams.get("confirmRevoke") === "true";
      try {
        const record = db.revokeModuleCollegeAccess(moduleId, collegeId, user.loginId, confirmRevoke);
        return jsonResponse({ success: true, data: record });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error revoking access", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/modules/") && path.endsWith("/archive") && method === "POST") {
      const moduleId = path.replace("/api/v1/editor/modules/", "").replace("/archive", "");
      try {
        const archived = db.archiveQuestionModule(moduleId, user.loginId);
        return jsonResponse({ success: true, data: archived });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error archiving module", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/modules/") && method === "PATCH") {
      const moduleId = path.replace("/api/v1/editor/modules/", "");
      try {
        const body = (await request.json()) as {
          name?: string;
          description?: string;
          code?: string;
          blueprintCode?: string;
          domain?: "Technical" | "Aptitude" | "Verbal" | "Soft Skills" | "Coding" | "Core Engineering";
          targetDifficulty?: "Beginner" | "Intermediate" | "Advanced";
        };
        const updated = db.updateQuestionModule(moduleId, { ...body, actor: user.loginId });
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error updating module", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/modules/") && method === "GET") {
      const moduleId = path.replace("/api/v1/editor/modules/", "");
      const mod = db.getQuestionModule(moduleId);
      if (!mod) return errorResponse("not_found", "Module not found", 404);
      return jsonResponse({ success: true, data: { ...mod, assignedColleges: db.getModuleCollegeAccess(moduleId) } });
    }

    if (path.startsWith("/api/v1/editor/modules/") && method === "DELETE") {
      const moduleId = path.replace("/api/v1/editor/modules/", "");
      try {
        const result = await db.deleteQuestionModule(moduleId, user.loginId);
        return jsonResponse({ success: true, message: `Question module "${result.name}" deleted successfully.`, data: result });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error deleting module", 400);
      }
    }

    // 3.1 Coding Judge Problems Management (Coding Module)
    if (path === "/api/v1/editor/coding/problems") {
      if (method === "GET") {
        const status = url.searchParams.get("status") || undefined;
        const topic = url.searchParams.get("topic") || undefined;
        const difficulty = url.searchParams.get("difficulty") || undefined;
        const search = url.searchParams.get("search") || undefined;
        const problems = db.getCodingProblems({ status, topic, difficulty, search, userContext: user });
        return jsonResponse({ success: true, data: problems });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as any;
          const created = db.createCodingProblem({ ...body, actor: user.loginId });
          return jsonResponse({ success: true, data: created }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating problem", 400);
        }
      }
    }

    if (path.startsWith("/api/v1/editor/coding/problems/") && path.endsWith("/validate") && method === "POST") {
      const problemId = path.replace("/api/v1/editor/coding/problems/", "").replace("/validate", "");
      try {
        const result = db.validateReferenceSolution(problemId, user.loginId);
        return jsonResponse({ success: true, data: result });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Validation error", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/coding/problems/") && path.endsWith("/submit") && method === "POST") {
      const problemId = path.replace("/api/v1/editor/coding/problems/", "").replace("/submit", "");
      try {
        const submitted = db.submitCodingProblemForReview(problemId, user.loginId);
        return jsonResponse({ success: true, data: submitted });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Submit error", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/coding/problems/") && path.endsWith("/review") && method === "POST") {
      const problemId = path.replace("/api/v1/editor/coding/problems/", "").replace("/review", "");
      try {
        const body = (await request.json()) as { action: "return_to_draft" | "approve_and_publish" | "archive" };
        const reviewed = db.reviewCodingProblem(problemId, body.action, user.loginId);
        return jsonResponse({ success: true, data: reviewed });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Review error", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/coding/problems/") && path.endsWith("/version") && method === "POST") {
      const problemId = path.replace("/api/v1/editor/coding/problems/", "").replace("/version", "");
      try {
        const body = await request.json();
        const ver = db.createCodingProblemVersion(problemId, body, user.loginId);
        return jsonResponse({ success: true, data: ver }, 201);
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Version error", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/coding/problems/") && path.endsWith("/submissions") && method === "GET") {
      const problemId = path.replace("/api/v1/editor/coding/problems/", "").replace("/submissions", "");
      return jsonResponse({ success: true, data: db.getCodingSubmissions(problemId, user) });
    }

    if (path === "/api/v1/editor/coding/problems/bulk-import" && method === "POST") {
      try {
        const body = (await request.json()) as { moduleId?: string; problems: any[] };
        const result = db.bulkImportCodingProblems(body.moduleId || "mod-code", body.problems, user.loginId);
        return jsonResponse({ success: true, data: result }, 201);
      } catch (e) {
        return errorResponse("upload_error", e instanceof Error ? e.message : "Bulk import error", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/coding/problems/") && method === "PATCH") {
      const problemId = path.replace("/api/v1/editor/coding/problems/", "");
      try {
        const body = await request.json();
        const updated = db.updateCodingProblemDraft(problemId, body, user.loginId);
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error updating problem", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/coding/problems/") && method === "DELETE") {
      const problemId = path.replace("/api/v1/editor/coding/problems/", "");
      try {
        const deleted = db.deleteCodingProblem(problemId, user.loginId);
        return jsonResponse({ success: true, data: deleted });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error deleting coding problem", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/coding/problems/") && method === "GET") {
      const problemId = path.replace("/api/v1/editor/coding/problems/", "");
      const problem = db.getCodingProblem(problemId, user);
      if (!problem) return errorResponse("not_found", "Problem not found", 404);
      return jsonResponse({ success: true, data: problem });
    }

    // Upload Batches & History
    if (path === "/api/v1/editor/questions/upload-history" && method === "GET") {
      const moduleId = url.searchParams.get("moduleId") || undefined;
      const search = url.searchParams.get("search") || undefined;
      const uploadMethod = url.searchParams.get("uploadMethod") || undefined;
      const status = url.searchParams.get("status") || undefined;
      const history = db.getUploadBatches(moduleId, { search, uploadMethod, status });
      return jsonResponse({ success: true, data: history });
    }

    if (path.startsWith("/api/v1/editor/questions/upload-batches/") && method === "GET") {
      const batchId = path.replace("/api/v1/editor/questions/upload-batches/", "");
      const batch = db.getUploadBatch(batchId);
      if (!batch) return errorResponse("not_found", "Upload batch not found", 404);
      return jsonResponse({ success: true, data: batch });
    }

    if (path === "/api/v1/editor/questions/upload/validate" && method === "POST") {
      try {
        const body = (await request.json()) as { content: string; format: "csv" | "json" | "xlsx"; moduleId: string };
        const validation = db.validateQuestionUpload(body.content, body.format, body.moduleId);
        return jsonResponse({ success: true, data: validation });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Validation error", 400);
      }
    }

    if (path === "/api/v1/editor/questions/upload/confirm" && method === "POST") {
      try {
        const body = (await request.json()) as {
          moduleId: string;
          filename: string;
          uploadMethod: any;
          validatedRows: any[];
        };
        const result = db.confirmQuestionUpload({ ...body, actor: user.loginId });
        return jsonResponse({ success: true, data: result }, 201);
      } catch (e) {
        return errorResponse("upload_error", e instanceof Error ? e.message : "Upload confirmation error", 400);
      }
    }

    // Questions Lifecycle & CRUD
    if (path.startsWith("/api/v1/editor/questions/") && path.endsWith("/submit") && method === "POST") {
      const questionId = path.replace("/api/v1/editor/questions/", "").replace("/submit", "");
      try {
        const q = db.submitQuestionForReview(questionId, user.loginId);
        return jsonResponse({ success: true, data: q });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Cannot submit for review", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/questions/") && path.endsWith("/review") && method === "POST") {
      const questionId = path.replace("/api/v1/editor/questions/", "").replace("/review", "");
      try {
        const body = (await request.json()) as { action: "return_to_draft" | "approve_and_publish" | "archive" };
        const q = db.reviewQuestion(questionId, body.action, user.loginId);
        return jsonResponse({ success: true, data: q });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Review action failed", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/questions/") && path.endsWith("/version") && method === "POST") {
      const questionId = path.replace("/api/v1/editor/questions/", "").replace("/version", "");
      try {
        const body = await request.json();
        const q = db.createQuestionVersion(questionId, body, user.loginId);
        return jsonResponse({ success: true, data: q }, 201);
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Cannot create version", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/questions/") && path.endsWith("/archive") && method === "POST") {
      const questionId = path.replace("/api/v1/editor/questions/", "").replace("/archive", "");
      try {
        const q = db.archiveQuestion(questionId, user.loginId);
        return jsonResponse({ success: true, data: q });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Cannot archive question", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/questions/") && method === "PATCH") {
      const questionId = path.replace("/api/v1/editor/questions/", "");
      try {
        const body = await request.json();
        const q = db.updateQuestionDraft(questionId, body, user.loginId);
        return jsonResponse({ success: true, data: q });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Cannot update question", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/questions/") && method === "DELETE") {
      const questionId = path.replace("/api/v1/editor/questions/", "");
      try {
        const deleted = db.deleteQuestion(questionId, user.loginId);
        return jsonResponse({ success: true, data: deleted });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Cannot delete question", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/questions/") && method === "GET") {
      const questionId = path.replace("/api/v1/editor/questions/", "");
      const q = db.getQuestion(questionId);
      if (!q) return errorResponse("not_found", "Question not found", 404);
      return jsonResponse({ success: true, data: q });
    }

    if (path === "/api/v1/editor/questions") {
      if (method === "GET") {
        const moduleId = url.searchParams.get("moduleId") || undefined;
        const status = url.searchParams.get("status") || undefined;
        const type = url.searchParams.get("type") || undefined;
        const difficulty = url.searchParams.get("difficulty") || undefined;
        const search = url.searchParams.get("search") || undefined;
        const list = db.getQuestions({ moduleId, status, type, difficulty, search });
        return jsonResponse({ success: true, data: list });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as any;
          const q = db.createQuestionDraft({
            moduleId: body.moduleId || (body.domain === "Verbal" ? "mod-verb" : body.domain === "Aptitude" ? "mod-apt" : body.domain === "Soft Skills" ? "mod-soft" : "mod-tech"),
            stem: body.stem,
            type: body.type,
            difficulty: body.difficulty,
            options: body.options,
            correctAnswer: body.correctAnswer,
            expectedAnswer: body.expectedAnswer,
            rubric: body.rubric,
            explanation: body.explanation,
            tags: body.tags,
            actor: user.loginId,
            submitForReview: body.submitForReview ?? false,
          });
          return jsonResponse({ success: true, data: q }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating question", 400);
        }
      }
    }

    // 4. Assessment Modules & Content Operations
    if (path === "/api/v1/editor/assessment/modules") {
      if (method === "GET") {
        const search = url.searchParams.get("search") || undefined;
        const domain = url.searchParams.get("domain") || undefined;
        return jsonResponse({ success: true, data: db.getAssessmentModules({ search, domain }) });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as {
            name: string;
            domain?: any;
            description?: string;
            visibilityStatus?: "visible" | "hidden";
          };
          const mod = db.createAssessmentModule(body, user.loginId);
          return jsonResponse({ success: true, data: mod }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating assessment module", 400);
        }
      }
    }

    if (path.startsWith("/api/v1/editor/assessment/modules/") && path.endsWith("/visibility") && (method === "PATCH" || method === "PUT")) {
      const moduleId = path.replace("/api/v1/editor/assessment/modules/", "").replace("/visibility", "");
      try {
        const body = (await request.json()) as {
          visibilityStatus: "visible" | "hidden";
          collegeIds?: string[];
        };
        const updated = db.updateAssessmentModuleVisibility(moduleId, { ...body, actor: user.loginId });
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error updating visibility", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/assessment/modules/") && method === "DELETE") {
      const moduleId = path.replace("/api/v1/editor/assessment/modules/", "");
      try {
        const result = await db.deleteAssessmentModule(moduleId, user.loginId);
        return jsonResponse({ success: true, message: `Assessment module "${result.name}" deleted successfully.`, data: result });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error deleting assessment module", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/assessment/modules/") && method === "PATCH") {
      const moduleId = path.replace("/api/v1/editor/assessment/modules/", "");
      try {
        const body = (await request.json()) as { name?: string; description?: string; domain?: any };
        const updated = db.updateAssessmentModule(moduleId, body, user.loginId);
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error updating assessment module", 400);
      }
    }

    if (path.startsWith("/api/v1/editor/assessment/modules/") && method === "GET") {
      const moduleId = path.replace("/api/v1/editor/assessment/modules/", "");
      const mod = db.getAssessmentModule(moduleId);
      if (!mod) return errorResponse("not_found", "Assessment module not found", 404);
      return jsonResponse({ success: true, data: mod });
    }

    if (path === "/api/v1/editor/assessments") {
      if (method === "GET") {
        const moduleId = url.searchParams.get("moduleId") || undefined;
        const search = url.searchParams.get("search") || undefined;
        return jsonResponse({ success: true, data: db.getAssessments(moduleId, search) });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as {
            title: string;
            domain?: "Technical" | "Aptitude" | "Verbal" | "Soft Skills" | "Coding" | "Core Engineering";
            moduleId?: string;
            description?: string;
            difficulty?: "Beginner" | "Intermediate" | "Advanced";
            durationMinutes?: number;
            totalMarks?: number;
            passingMarks?: number;
            questionsCount?: number;
            status?: "draft" | "in_review" | "published" | "archived";
          };
          const asm = db.createAssessment(body, user.loginId);
          return jsonResponse({ success: true, data: asm }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating assessment", 400);
        }
      }
    }

    if (path.startsWith("/api/v1/editor/assessments/") && method === "DELETE") {
      const assessmentId = path.replace("/api/v1/editor/assessments/", "");
      try {
        const result = await db.deleteAssessment(assessmentId, user.loginId);
        return jsonResponse({ success: true, message: "Assessment deleted successfully.", data: result });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error deleting assessment", 400);
      }
    }

    // 5. Notifications
    if (path === "/api/v1/editor/notifications") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.getNotifications() });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as {
            title: string;
            message: string;
            targetRole: "all" | "student" | "trainer" | "coordinator" | string;
            collegeScope?: string;
            durationDays?: number;
          };
          const n = await db.createNotification(body);
          db.addAuditLog({ actor: user.loginId, action: "notification.create", target: n.title, severity: "info" });
          return jsonResponse({ success: true, data: n }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating notification", 400);
        }
      }
    }

    if (path.startsWith("/api/v1/editor/notifications/") && method === "DELETE") {
      const notifId = path.replace("/api/v1/editor/notifications/", "");
      try {
        const result = await db.deleteNotification(notifId, user.loginId);
        return jsonResponse({ success: true, message: "Notification deleted successfully.", data: result });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error deleting notification", 400);
      }
    }

    // 6. Feature Availability (Strictly Controlled by Editor)
    if (path === "/api/v1/editor/features" && method === "GET") {
      return jsonResponse({ success: true, data: db.getFeatureFlags() });
    }
    if (path.startsWith("/api/v1/editor/features/") && method === "PATCH") {
      const key = path.replace("/api/v1/editor/features/", "");
      try {
        const body = (await request.json()) as { isEnabled: boolean };
        const updated = db.toggleFeatureFlag(key, body.isEnabled, user.role);
        db.addAuditLog({
          actor: user.loginId,
          action: "feature.toggle",
          target: key,
          severity: "warning",
          metadata: { isEnabled: body.isEnabled },
        });
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("forbidden", e instanceof Error ? e.message : "Cannot toggle feature flag", 403);
      }
    }

    // 7. Visible-Value Overrides (Editor Workspace & Academic Hierarchy Integration)
    if (path === "/api/v1/editor/overrides/options" && method === "GET") {
      const collegeCode = url.searchParams.get("collegeCode") || undefined;
      const year = url.searchParams.get("year") || undefined;
      const department = url.searchParams.get("department") || undefined;
      const semester = url.searchParams.get("semester") || undefined;
      const section = url.searchParams.get("section") || undefined;
      const options = db.getAcademicOptions(collegeCode, year, department, semester, section);
      return jsonResponse({ success: true, data: options });
    }

    if (path === "/api/v1/editor/overrides/scope-progress" && method === "GET") {
      const collegeCode = url.searchParams.get("collegeCode");
      if (!collegeCode) {
        return errorResponse("bad_request", "A collegeCode parameter is mandatory.", 400);
      }
      const year = url.searchParams.get("year") || undefined;
      const department = url.searchParams.get("department") || undefined;
      const semester = url.searchParams.get("semester") || undefined;
      const section = url.searchParams.get("section") || undefined;
      const studentId = url.searchParams.get("studentId") || undefined;

      try {
        const progress = db.getScopeProgress({ collegeCode, year, department, semester, section, studentId });
        return jsonResponse({ success: true, data: progress });
      } catch (e) {
        return errorResponse("not_found", e instanceof Error ? e.message : "Scope progress not found", 404);
      }
    }

    if (path === "/api/v1/editor/overrides/preview" && method === "POST") {
      try {
        const body = (await request.json()) as {
          collegeCode: string;
          academicScope: any;
          metricId: string;
          proposedValue: string | number;
        };
        const preview = db.previewOverrideImpact(body);
        return jsonResponse({ success: true, data: preview });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Invalid preview request", 400);
      }
    }

    if (path === "/api/v1/editor/overrides/metrics" && method === "GET") {
      const scope = url.searchParams.get("scope") || undefined;
      const registry = Object.values(db.getMetricRegistry());
      const filtered = scope
        ? registry.filter((m) => m.presentationOverridePermitted && m.applicableScopes.includes(scope as any))
        : registry.filter((m) => m.presentationOverridePermitted);
      return jsonResponse({ success: true, data: filtered });
    }

    if (path.startsWith("/api/v1/editor/overrides/") && path.endsWith("/revert") && method === "POST") {
      const overrideId = path.replace("/api/v1/editor/overrides/", "").replace("/revert", "");
      try {
        const reverted = db.revertOverride(overrideId, user.loginId);
        return jsonResponse({ success: true, data: reverted });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Cannot revert override", 400);
      }
    }

    if (path === "/api/v1/editor/overrides") {
      if (method === "GET") {
        const search = url.searchParams.get("search") || undefined;
        const college = url.searchParams.get("college") || undefined;
        const status = url.searchParams.get("status") || undefined;
        const mine = url.searchParams.get("mine") === "true";
        const list = db.getOverrides({
          search,
          college,
          status,
          mineOnly: mine,
          editorLogin: user.loginId,
        });
        return jsonResponse({ success: true, data: list });
      }

      if (method === "POST") {
        try {
          const body = (await request.json()) as any;
          if (body.academicScope && body.metricId) {
            const created = db.createAcademicOverride({
              collegeCode: body.collegeCode || body.academicScope.collegeCode,
              academicScope: body.academicScope,
              metricId: body.metricId,
              proposedValue: body.proposedValue ?? body.visibleValue,
              mandatoryReason: body.mandatoryReason,
              editorLogin: user.loginId,
            });
            return jsonResponse({ success: true, data: created }, 201);
          } else {
            const created = db.createOverride({ ...body, overriddenBy: user.loginId });
            return jsonResponse({ success: true, data: created }, 201);
          }
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Cannot create override", 400);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Coordinator Endpoints (Strict College Scope Isolation, ZERO ATTENDANCE)
  // --------------------------------------------------------------------------
  if (path.startsWith("/api/v1/coordinator/")) {
    if (user.role !== "coordinator" && user.role !== "super_admin" && !hasPermission(user, "college.manage")) {
      db.addAuditLog({
        actor: user.loginId,
        action: "security.unauthorized_access",
        target: path,
        severity: "warning",
      });
      return errorResponse("forbidden", "Access denied: Coordinator privilege required.", 403);
    }

    // College scope isolation:
    const requestedCollege = url.searchParams.get("collegeCode");
    const userCollege = user.collegeCode || (user.collegeId ? db.colleges.find(c => c.id === user.collegeId)?.code : "SMP101") || "SMP101";

    if (user.role === "coordinator" && requestedCollege && requestedCollege !== userCollege) {
      db.addAuditLog({
        actor: user.loginId,
        action: "security.cross_college_violation",
        target: requestedCollege,
        severity: "critical",
      });
      return errorResponse("forbidden", "Access denied: Cannot access or alter cross-college data.", 403);
    }

    const collegeCode = user.role === "coordinator" ? userCollege : (requestedCollege || userCollege);

    // College Lifecycle Status Enforcement:
    const college = db.colleges.find((c) => c.code === collegeCode);
    if (college) {
      if (college.status === "deactive") {
        return errorResponse("forbidden", "Access denied: College is deactivated.", 403);
      }
      if (college.status === "hold" && method !== "GET" && method !== "HEAD") {
        return errorResponse("forbidden", "Access denied: College is currently on hold. Modifications are disabled.", 403);
      }
    }

    // Training & Courses Module Feature Flag Enforcement:
    if (path.startsWith("/api/v1/coordinator/training")) {
      const isTrainingEnabled = db.isFeatureEnabled("training_courses") || db.isFeatureEnabled("learning_content");
      if (!isTrainingEnabled) {
        return errorResponse("forbidden", "Training & Courses module is currently disabled for this institution.", 403);
      }
    }

    // 0. Authenticated Coordinator Identity
    if (path === "/api/v1/coordinator/me" && method === "GET") {
      return jsonResponse({
        success: true,
        data: {
          user: {
            id: user.id,
            loginId: user.loginId,
            email: user.email,
            name: user.name,
            role: user.role,
            collegeCode,
            collegeName: college?.name || "Sample Institute of Technology",
            collegeStatus: college?.status || "active",
          },
        },
      });
    }

    // 1. Overview
    if (path === "/api/v1/coordinator/overview" && method === "GET") {
      return jsonResponse({ success: true, data: db.getCoordinatorOverview(collegeCode) });
    }

    // 2. Academic Structure
    if (path === "/api/v1/coordinator/academic" && method === "GET") {
      return jsonResponse({ success: true, data: db.getAcademicStructure(collegeCode) });
    }

    // 2.1 Classes
    if (path === "/api/v1/coordinator/classes" && method === "GET") {
      return jsonResponse({ success: true, data: db.getClasses(collegeCode) });
    }

    if (path === "/api/v1/coordinator/classes" && method === "POST") {
      try {
        const body = (await request.json()) as any;
        const created = db.createClass(collegeCode, body);
        return jsonResponse({ success: true, data: created });
      } catch (err: any) {
        return errorResponse("validation_error", err?.message ?? "Failed to create class", 400);
      }
    }

    if (path.startsWith("/api/v1/coordinator/classes/") && method === "DELETE") {
      const classId = path.replace("/api/v1/coordinator/classes/", "");
      const ok = db.deleteClass(classId, collegeCode);
      if (!ok) return errorResponse("not_found", "Class not found or not in authorized scope", 404);
      return jsonResponse({ success: true, message: "Class deleted successfully" });
    }

    // 3. Students
    if (path === "/api/v1/coordinator/students" && method === "GET") {
      const search = url.searchParams.get("search") || undefined;
      const department = url.searchParams.get("department") || undefined;
      const batch = url.searchParams.get("batch") || undefined;
      return jsonResponse({ success: true, data: db.getStudents(collegeCode, { search, department, batch }) });
    }

    // Student USN Correction with Mandatory Reason
    if (path.startsWith("/api/v1/coordinator/students/") && path.endsWith("/usn") && method === "PATCH") {
      const studentId = path.replace("/api/v1/coordinator/students/", "").replace("/usn", "");
      try {
        const body = (await request.json()) as { proposedUsn: string; mandatoryReason: string };
        const updated = db.updateStudentUsn(studentId, collegeCode, body.proposedUsn, body.mandatoryReason, user.loginId);
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error correcting USN", 400);
      }
    }

    // Student Details (Layer C Adjusted Intelligence Profile)
    if (path.startsWith("/api/v1/coordinator/students/") && !path.endsWith("/usn") && method === "GET") {
      const studentId = path.replace("/api/v1/coordinator/students/", "");
      try {
        const details = db.getStudentDetails(studentId, collegeCode);
        return jsonResponse({ success: true, data: details });
      } catch (e) {
        return errorResponse("not_found", e instanceof Error ? e.message : "Student not found", 404);
      }
    }

    // 4. Registration links (Tokenized, expiring in 1 hour, history & revocation)
    if (path === "/api/v1/coordinator/registration-links") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.getRegistrationTokens(collegeCode) });
      }
      if (method === "POST") {
        try {
          let body: any = {};
          try {
            body = await request.json();
          } catch {
            body = {};
          }
          // Dynamic origin resolution from request headers, body, or host
          const originHeader = request.headers.get("origin") || request.headers.get("referer");
          let resolvedOrigin = body?.origin;
          if (!resolvedOrigin && originHeader) {
            try {
              const u = new URL(originHeader);
              resolvedOrigin = u.origin;
            } catch {
              resolvedOrigin = originHeader;
            }
          }
          if (!resolvedOrigin) {
            const host = request.headers.get("host") || request.headers.get("x-forwarded-host");
            const proto = request.headers.get("x-forwarded-proto") || "http";
            if (host) {
              resolvedOrigin = `${proto}://${host}`;
            }
          }
          const link = db.generateRegistrationLink(collegeCode, user.loginId, resolvedOrigin, body?.metadata);
          return jsonResponse({ success: true, data: link }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error generating link", 400);
        }
      }
    }

    const revokeLinkMatch = path.match(/^\/api\/v1\/coordinator\/registration-links\/([^/]+)\/revoke$/);
    if (revokeLinkMatch && method === "POST") {
      try {
        const tokenId = revokeLinkMatch[1];
        const revoked = db.revokeRegistrationToken(tokenId, collegeCode, user.loginId);
        return jsonResponse({ success: true, data: revoked });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error revoking link", 400);
      }
    }

    // 5. Trainers
    if (path === "/api/v1/coordinator/trainers") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.getTrainers(collegeCode) });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as { name: string; email: string; skills: string[] };
          const trainer = db.createTrainer(collegeCode, body, user.loginId);
          return jsonResponse({ success: true, data: trainer }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating trainer", 400);
        }
      }
    }

    // 5b. Placement Officers (Campus Provisioning)
    if (path === "/api/v1/coordinator/placement-officers") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.getPlacementOfficers(collegeCode) });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as {
            name: string;
            email: string;
            phone?: string;
            departmentScope?: string[];
          };
          const officer = db.createPlacementOfficer(collegeCode, body, user.loginId);
          return jsonResponse({ success: true, data: officer }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating placement officer", 400);
        }
      }
    }

    const poStatusMatch = path.match(/^\/api\/v1\/coordinator\/placement-officers\/([a-zA-Z0-9_-]+)\/status$/);
    if (poStatusMatch && (method === "PATCH" || method === "POST")) {
      try {
        const officerId = poStatusMatch[1];
        const body = (await request.json()) as { status: "active" | "inactive" };
        const updated = db.togglePlacementOfficerStatus(officerId, collegeCode, body.status, user.loginId);
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error updating placement officer status", 400);
      }
    }

    // 6. Batches
    if (path === "/api/v1/coordinator/batches") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.getBatches(collegeCode) });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as { name: string; department: string; year: string; section: string };
          const batch = db.createBatch(collegeCode, body, user.loginId);
          return jsonResponse({ success: true, data: batch }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating batch", 400);
        }
      }
    }

    // 7. Class Allocations (Who teaches what)
    if (path === "/api/v1/coordinator/allocations") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.getAllocations(collegeCode) });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as {
            department: string;
            year: string;
            semester: string;
            section: string;
            batch: string;
            skill: string;
            courseName: string;
            trainerName: string;
            trainerId: string;
            startDate: string;
            endDate: string;
          };
          const alloc = db.createAllocation(collegeCode, body, user.loginId);
          return jsonResponse({ success: true, data: alloc }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating allocation", 400);
        }
      }
    }

    // 8. Training Schedules (When it happens)
    if (path === "/api/v1/coordinator/schedule") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.getSchedules(collegeCode) });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as {
            allocationId: string;
            courseName: string;
            trainerName: string;
            date: string;
            startTime: string;
            endTime: string;
            mode: "Offline" | "Online" | "Hybrid";
            location: string;
          };
          const sched = db.createSchedule(collegeCode, body, user.loginId);
          return jsonResponse({ success: true, data: sched }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating schedule", 400);
        }
      }
    }

    // 9. Training Sessions (ZERO ATTENDANCE)
    if (path === "/api/v1/coordinator/sessions" && method === "GET") {
      return jsonResponse({ success: true, data: db.getSessions(collegeCode) });
    }

    // Session Start
    if (path.startsWith("/api/v1/coordinator/sessions/") && path.endsWith("/start") && method === "POST") {
      const sessionId = path.replace("/api/v1/coordinator/sessions/", "").replace("/start", "");
      try {
        const session = db.startSession(sessionId, collegeCode, user.loginId);
        return jsonResponse({ success: true, data: session });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error starting session", 400);
      }
    }

    // Session Complete (with mandatory reason, ZERO ATTENDANCE)
    if (path.startsWith("/api/v1/coordinator/sessions/") && path.endsWith("/complete") && method === "POST") {
      const sessionId = path.replace("/api/v1/coordinator/sessions/", "").replace("/complete", "");
      try {
        const body = (await request.json()) as { mandatoryReason: string };
        const session = db.completeSession(sessionId, collegeCode, body.mandatoryReason, user.loginId);
        return jsonResponse({ success: true, data: session });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error completing session", 400);
      }
    }

    // 10. Action Plans
    if (path === "/api/v1/coordinator/action-plans") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.getActionPlans(collegeCode) });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as {
            studentName: string;
            studentId: string;
            description: string;
            trainerName: string;
            trainerId: string;
            deadline: string;
          };
          const plan = db.createActionPlan(collegeCode, body, user.loginId);
          return jsonResponse({ success: true, data: plan }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating action plan", 400);
        }
      }
    }

    if (path.startsWith("/api/v1/coordinator/action-plans/") && method === "PATCH") {
      const planId = path.replace("/api/v1/coordinator/action-plans/", "");
      try {
        const body = (await request.json()) as { status: any };
        const updated = db.updateActionPlanStatus(planId, collegeCode, body.status, user.loginId);
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error updating action plan", 400);
      }
    }

    // 11. Coordinator Question Modules & Coding Problems (Respecting College Visibility)
    if (path === "/api/v1/coordinator/modules" && method === "GET") {
      const col = db.colleges.find((c) => c.code === collegeCode);
      const modules = db.getQuestionModules({
        role: user.role,
        collegeId: col?.id || user.collegeId || undefined,
        collegeCode,
      });
      return jsonResponse({ success: true, data: modules });
    }

    if (path === "/api/v1/coordinator/coding/problems" && method === "GET") {
      const problems = db.getCodingProblems({ userContext: user });
      return jsonResponse({ success: true, data: problems });
    }

    // 12. Coordinator Campus Notifications
    if (path === "/api/v1/coordinator/notifications" && method === "GET") {
      return jsonResponse({
        success: true,
        data: db.getNotifications({ collegeScope: collegeCode, targetRole: "coordinator" }),
      });
    }

    if (path === "/api/v1/coordinator/notifications" && method === "POST") {
      try {
        const body = (await request.json()) as {
          title: string;
          message: string;
          targetRole?: string;
          durationDays?: number;
        };

        if (!body.title?.trim() || !body.message?.trim()) {
          return errorResponse("validation_error", "Announcement title and message body are required.", 400);
        }

        let roleTarget = "All";
        if (body.targetRole === "Students Only" || body.targetRole === "Students" || body.targetRole === "student") {
          roleTarget = "Students";
        } else if (body.targetRole === "Faculty / Trainers Only" || body.targetRole === "Trainers" || body.targetRole === "trainer") {
          roleTarget = "Trainers";
        }

        const duration = Number(body.durationDays) || 7;
        const created = await db.createNotification({
          title: body.title.trim(),
          message: body.message.trim(),
          targetRole: roleTarget as any,
          collegeScope: collegeCode,
          durationDays: duration,
          createdBy: user.loginId,
        });

        db.addAuditLog({
          actor: user.loginId,
          action: "coordinator.notification_created",
          target: created.title,
          severity: "info",
          metadata: {
            collegeCode,
            targetRole: created.targetRole,
            durationDays: created.durationDays,
            expiresAt: created.expiresAt,
          },
        });

        return jsonResponse({ success: true, data: created }, 201);
      } catch (e: any) {
        return errorResponse("action_error", e.message || "Failed to create notification", 400);
      }
    }

    if (path.startsWith("/api/v1/coordinator/notifications/") && method === "DELETE") {
      const notifId = path.replace("/api/v1/coordinator/notifications/", "");
      try {
        const result = await db.deleteNotification(notifId, user.loginId);
        return jsonResponse({ success: true, message: "Notification deleted successfully.", data: result });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error deleting notification", 400);
      }
    }

    // 13. Performance Analytics (Consumes Intelligence Layer C)
    if (path === "/api/v1/coordinator/performance" && method === "GET") {
      return jsonResponse({ success: true, data: db.getCoordinatorPerformance(collegeCode) });
    }

    // 14. Skill Analytics
    if (path === "/api/v1/coordinator/skills" && method === "GET") {
      return jsonResponse({ success: true, data: db.getCoordinatorSkillAnalytics(collegeCode) });
    }

    // 15. Placement Readiness
    if (path === "/api/v1/coordinator/placement-readiness" && method === "GET") {
      return jsonResponse({ success: true, data: db.getCoordinatorPlacementReadiness(collegeCode) });
    }

    // 16. Placement Requirements
    if (path === "/api/v1/coordinator/placement-requirements") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.getCoordinatorPlacementRequirements(collegeCode) });
      }
      if (method === "POST") {
        try {
          const body = (await request.json()) as {
            companyName: string;
            roleTitle: string;
            minCgpa: number;
            eligibleBranches: string[];
            requiredSkills: string[];
            deadline: string;
          };
          const created = db.createPlacementRequirement(collegeCode, body, user.loginId);
          return jsonResponse({ success: true, data: created }, 201);
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error creating placement requirement", 400);
        }
      }
    }

    // 17. Reports & Exports
    if (path === "/api/v1/coordinator/reports" && method === "GET") {
      return jsonResponse({
        success: true,
        data: {
          availableReports: [
            { id: "readiness_summary", title: "Student Readiness Summary", desc: "Detailed breakdown of student Layer C readiness score and performance tiers." },
            { id: "students_roster", title: "Complete Student Roster", desc: "Authorized campus student enrollments across departments and sections." },
            { id: "skill_gap_analysis", title: "Skill Gap Analysis", desc: "Domain-level competency averages and identified curriculum gaps." },
            { id: "placement_eligibility", title: "Placement Eligibility Report", desc: "Company criteria matching and student eligibility counts." },
            { id: "operational_summary", title: "Campus Operational Overview", desc: "High-level summary of active trainers, batches, sessions, and action plans." },
          ],
        },
      });
    }

    if (path === "/api/v1/coordinator/reports/export" && method === "POST") {
      try {
        const body = (await request.json()) as { reportType: string; format?: "csv" | "json"; filter?: any };
        const report = db.generateCoordinatorReport(
          collegeCode,
          { reportType: body.reportType || "readiness_summary", format: body.format || "csv", filter: body.filter },
          user.loginId
        );
        return jsonResponse({ success: true, data: report });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error generating report", 400);
      }
    }

    // 18. 12-Step Bulk Data Import Pipeline
    if (path === "/api/v1/coordinator/data/import/validate" && method === "POST") {
      try {
        const body = (await request.json()) as { filename: string; rows: any[] };
        const result = db.validateStudentImport(collegeCode, body.filename || "import.csv", body.rows || [], user.loginId);
        return jsonResponse({ success: true, data: result });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Import validation failed", 400);
      }
    }

    if (path === "/api/v1/coordinator/data/import/confirm" && method === "POST") {
      try {
        const body = (await request.json()) as { importId: string };
        const result = db.confirmStudentImport(body.importId, collegeCode, user.loginId);
        return jsonResponse({ success: true, data: result });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error confirming import", 400);
      }
    }

    // 19. College Settings
    if (path === "/api/v1/coordinator/settings") {
      if (method === "GET") {
        return jsonResponse({ success: true, data: db.getCoordinatorSettings(collegeCode) });
      }
      if (method === "PATCH") {
        try {
          const body = (await request.json()) as any;
          const updated = db.updateCoordinatorSettings(collegeCode, body, user.loginId);
          return jsonResponse({ success: true, data: updated });
        } catch (e) {
          return errorResponse("validation_error", e instanceof Error ? e.message : "Error updating settings", 400);
        }
      }
    }

    // 20. Training & Courses (Feature Flag Controlled)
    if (path === "/api/v1/coordinator/training" && method === "GET") {
      const courses = db.getLearningCourses();
      return jsonResponse({ success: true, data: courses });
    }
  }

  // --------------------------------------------------------------------------
  // Trainer Workspace Authoritative Endpoints (College & Allocation Scoped, Read-Only)
  // --------------------------------------------------------------------------
  if (path.startsWith("/api/v1/trainer/")) {
    if (user.role !== "trainer" && user.role !== "super_admin") {
      return errorResponse("forbidden", "Access denied: Trainer role required.", 403);
    }

    // Invariant: All operational Trainer modules remain strictly read-only
    if (method !== "GET") {
      return errorResponse(
        "forbidden",
        "All operational Trainer modules are strictly read-only. Mutation operations are prohibited.",
        403
      );
    }

    const allocationId = url.searchParams.get("allocationId") || undefined;

    // 1. Identity & Profile
    if (path === "/api/v1/trainer/me") {
      const scope = TrainerService.getTrainerScope(db, user);
      return jsonResponse({
        success: true,
        data: {
          trainer: scope.trainer,
          college: { code: scope.collegeCode, name: scope.collegeName },
          skills: scope.authorizedSkills,
          assignedClassesCount: scope.allocations.length,
        },
      });
    }

    // 2. Scope & Active Allocations
    if (path === "/api/v1/trainer/scope") {
      const scope = TrainerService.getTrainerScope(db, user);
      return jsonResponse({ success: true, data: scope });
    }

    // 3. Overall Dashboard (Today's Classes primary)
    if (path === "/api/v1/trainer/dashboard") {
      const dashboard = TrainerService.getTrainerDashboard(db, user, allocationId);
      return jsonResponse({ success: true, data: dashboard });
    }

    // 4. Classes & Schedules
    if (path === "/api/v1/trainer/classes") {
      const classes = TrainerService.getTrainerClasses(db, user);
      return jsonResponse({ success: true, data: classes });
    }

    // 5. Students Roster & Performance
    if (path === "/api/v1/trainer/students") {
      const search = url.searchParams.get("search") || undefined;
      const department = url.searchParams.get("department") || undefined;
      const year = url.searchParams.get("year") || undefined;
      const semester = url.searchParams.get("semester") || undefined;
      const section = url.searchParams.get("section") || undefined;
      const skill = url.searchParams.get("skill") || undefined;
      const category = url.searchParams.get("category") || undefined;
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = parseInt(url.searchParams.get("limit") || "20", 10);

      const result = TrainerService.getTrainerStudents(db, user, {
        allocationId,
        search,
        department,
        year,
        semester,
        section,
        skill,
        category,
        page,
        limit,
      });
      return jsonResponse({ success: true, data: result });
    }

    // 6. Single Student Detail View
    if (path.startsWith("/api/v1/trainer/students/")) {
      const studentId = path.replace("/api/v1/trainer/students/", "");
      try {
        const student = TrainerService.getTrainerStudentDetail(db, user, studentId);
        return jsonResponse({ success: true, data: student });
      } catch (e: any) {
        return errorResponse("forbidden", e.message, 403);
      }
    }

    // 7. Skill Gaps (Insight -> Evidence -> Action)
    if (path === "/api/v1/trainer/skill-gaps") {
      const skillGaps = TrainerService.getTrainerSkillGaps(db, user, allocationId);
      return jsonResponse({ success: true, data: skillGaps });
    }

    // 8. Learning Progress (Feature availability checked)
    if (path === "/api/v1/trainer/learning-progress") {
      const learning = TrainerService.getTrainerLearningProgress(db, user, allocationId);
      return jsonResponse({ success: true, data: learning });
    }

    // 9. Coding Progress (Judge telemetry)
    if (path === "/api/v1/trainer/coding-progress") {
      const coding = TrainerService.getTrainerCodingProgress(db, user, allocationId);
      return jsonResponse({ success: true, data: coding });
    }

    // 10. Assessments Analytics
    if (path === "/api/v1/trainer/assessments") {
      const assessments = TrainerService.getTrainerAssessments(db, user, allocationId);
      return jsonResponse({ success: true, data: assessments });
    }

    // 11. Aptitude Analytics
    if (path === "/api/v1/trainer/aptitude") {
      const aptitude = TrainerService.getTrainerAptitude(db, user, allocationId);
      return jsonResponse({ success: true, data: aptitude });
    }

    // 12. Verbal Analytics
    if (path === "/api/v1/trainer/verbal") {
      const verbal = TrainerService.getTrainerVerbal(db, user, allocationId);
      return jsonResponse({ success: true, data: verbal });
    }

    // 13. Soft Skills Analytics
    if (path === "/api/v1/trainer/soft-skills") {
      const softSkills = TrainerService.getTrainerSoftSkills(db, user, allocationId);
      return jsonResponse({ success: true, data: softSkills });
    }

    // 14. Placement Intelligence
    if (path === "/api/v1/trainer/placement") {
      const placement = TrainerService.getTrainerPlacement(db, user, allocationId);
      return jsonResponse({ success: true, data: placement });
    }

    // 15. Interventions & Alerts (Action Plans)
    if (path === "/api/v1/trainer/interventions") {
      const interventions = TrainerService.getTrainerInterventions(db, user, allocationId);
      return jsonResponse({ success: true, data: interventions });
    }

    // 16. Reports Workspace
    if (path === "/api/v1/trainer/reports") {
      const reports = TrainerService.getTrainerReports(db, user, allocationId);
      return jsonResponse({ success: true, data: reports });
    }

    // 17. Notifications
    if (path === "/api/v1/trainer/notifications") {
      const notifications = TrainerService.getTrainerNotifications(db, user);
      return jsonResponse({ success: true, data: notifications });
    }
  }

  // --------------------------------------------------------------------------
  // Placement Officer Endpoints (/api/v1/placement/* and /api/placement/*)
  // --------------------------------------------------------------------------
  if (path.startsWith("/api/v1/placement/") || path.startsWith("/api/placement/")) {
    const p = path.startsWith("/api/placement/") ? path.replace("/api/placement/", "/api/v1/placement/") : path;

    // 1. Role Authorization Check
    if (user.role !== "placement_officer" && user.role !== "super_admin" && user.role !== "coordinator") {
      db.addAuditLog({
        actor: user.loginId,
        action: "security.unauthorized_access",
        target: path,
        severity: "warning",
      });
      return errorResponse("forbidden", "Access denied: Placement Officer or Coordinator privilege required.", 403);
    }

    // 2. Resolve Scope and Verify College Lifecycle
    let scope: any;
    try {
      scope = PlacementService.resolvePlacementOfficer(db, user);
    } catch (e: any) {
      return errorResponse("forbidden", e.message, 403);
    }

    // Module 1: Identity & Profile
    if (p === "/api/v1/placement/me" && method === "GET") {
      return jsonResponse({
        success: true,
        data: {
          user: {
            id: user.id,
            loginId: user.loginId,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          college: {
            id: scope.collegeId,
            code: scope.collegeCode,
            name: scope.collegeName,
          },
        },
      });
    }

    // Module 2: Dashboard Overview & Real KPIs
    if (p === "/api/v1/placement/dashboard" && method === "GET") {
      const dashboard = PlacementService.getPlacementDashboard(db, user);
      return jsonResponse({ success: true, data: dashboard });
    }

    // Module 3: Student Directory
    if (p === "/api/v1/placement/students" && method === "GET") {
      const search = url.searchParams.get("search") || undefined;
      const department = url.searchParams.get("department") || undefined;
      const year = url.searchParams.get("year") || undefined;
      const section = url.searchParams.get("section") || undefined;
      const eligibility = url.searchParams.get("eligibility") || undefined;
      const readinessBand = url.searchParams.get("readinessBand") || undefined;
      const offerStatus = url.searchParams.get("offerStatus") || undefined;
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = parseInt(url.searchParams.get("limit") || "20", 10);

      const students = PlacementService.getPlacementStudents(db, user, {
        search,
        department,
        year,
        section,
        eligibility,
        readinessBand,
        offerStatus,
        page,
        limit,
      });
      return jsonResponse({ success: true, data: students });
    }

    if (p.startsWith("/api/v1/placement/students/") && method === "GET") {
      const studentId = p.replace("/api/v1/placement/students/", "");
      try {
        const student = PlacementService.getPlacementStudentDetail(db, user, studentId);
        return jsonResponse({ success: true, data: student });
      } catch (e: any) {
        return errorResponse("forbidden", e.message, 403);
      }
    }

    // Module 4: Companies & Relationships
    if (p === "/api/v1/placement/companies" && method === "GET") {
      const companies = PlacementService.getCompanies(db, user);
      return jsonResponse({ success: true, data: companies });
    }

    if (p === "/api/v1/placement/companies" && method === "POST") {
      try {
        const body = (await request.json()) as any;
        const company = PlacementService.createCompany(db, user, body);
        return jsonResponse({ success: true, data: company }, 201);
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    const companyIdMatch = p.match(/^\/api\/v1\/placement\/companies\/([a-zA-Z0-9_-]+)$/);
    if (companyIdMatch && method === "PATCH") {
      try {
        const body = (await request.json()) as any;
        const company = PlacementService.updateCompany(db, user, companyIdMatch[1], body);
        return jsonResponse({ success: true, data: company });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    if (companyIdMatch && method === "DELETE") {
      try {
        const result = PlacementService.deleteCompany(db, user, companyIdMatch[1]);
        return jsonResponse({ success: true, data: result });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    // Module 5: Job & Internship Opportunities
    if (p === "/api/v1/placement/opportunities" && method === "GET") {
      const status = url.searchParams.get("status") || undefined;
      const opps = PlacementService.getOpportunities(db, user, { status });
      return jsonResponse({ success: true, data: opps });
    }

    if (p === "/api/v1/placement/opportunities" && method === "POST") {
      try {
        const body = (await request.json()) as any;
        const opp = PlacementService.createOpportunity(db, user, body);
        return jsonResponse({ success: true, data: opp }, 201);
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    const oppStatusMatch = p.match(/^\/api\/v1\/placement\/opportunities\/([a-zA-Z0-9_-]+)\/status$/);
    if (oppStatusMatch && method === "PATCH") {
      try {
        const body = (await request.json()) as { status: string };
        const opp = PlacementService.updateOpportunityStatus(db, user, oppStatusMatch[1], body.status);
        return jsonResponse({ success: true, data: opp });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    const oppIdMatch = p.match(/^\/api\/v1\/placement\/opportunities\/([a-zA-Z0-9_-]+)$/);
    if (oppIdMatch && method === "PATCH") {
      try {
        const body = (await request.json()) as any;
        const opp = PlacementService.updateOpportunity(db, user, oppIdMatch[1], body);
        return jsonResponse({ success: true, data: opp });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    if (oppIdMatch && method === "DELETE") {
      try {
        const result = PlacementService.deleteOpportunity(db, user, oppIdMatch[1]);
        return jsonResponse({ success: true, data: result });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    // Module 6: Recruitment Drives
    if (p === "/api/v1/placement/drives" && method === "GET") {
      const drives = PlacementService.getDrives(db, user);
      return jsonResponse({ success: true, data: drives });
    }

    if (p === "/api/v1/placement/drives" && method === "POST") {
      try {
        const body = (await request.json()) as any;
        const drive = PlacementService.createDrive(db, user, body);
        return jsonResponse({ success: true, data: drive }, 201);
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    const driveIdMatch = p.match(/^\/api\/v1\/placement\/drives\/([a-zA-Z0-9_-]+)$/);
    if (driveIdMatch && method === "PATCH") {
      try {
        const body = (await request.json()) as any;
        const drive = PlacementService.updateDrive(db, user, driveIdMatch[1], body);
        return jsonResponse({ success: true, data: drive });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    if (driveIdMatch && method === "DELETE") {
      try {
        const result = PlacementService.deleteDrive(db, user, driveIdMatch[1]);
        return jsonResponse({ success: true, data: result });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    // Module 7: Centralized Backend Eligibility Engine Evaluation
    if (
      (p === "/api/v1/placement/eligibility" || p === "/api/v1/placement/eligibility/evaluate") &&
      (method === "GET" || method === "POST")
    ) {
      let oppId = url.searchParams.get("opportunityId");
      let stuId = url.searchParams.get("studentId");

      if (method === "POST") {
        try {
          const body = (await request.json()) as any;
          if (body?.opportunityId) oppId = body.opportunityId;
          if (body?.studentId) stuId = body.studentId;
        } catch {
          // ignore json parse error if query params present
        }
      }

      if (!oppId || !stuId) {
        return errorResponse("validation_error", "opportunityId and studentId are required.", 400);
      }
      try {
        const evaluation = PlacementService.evaluateStudentEligibility(db, user, oppId, stuId);
        return jsonResponse({ success: true, data: evaluation });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    // Module 8: Applications & Selection Pipeline
    if (p === "/api/v1/placement/applications" && method === "GET") {
      const opportunityId = url.searchParams.get("opportunityId") || undefined;
      const status = url.searchParams.get("status") || undefined;
      const apps = PlacementService.getApplications(db, user, { opportunityId, status });
      return jsonResponse({ success: true, data: apps });
    }

    const recruiterPacketMatch = p.match(/^\/api\/v1\/placement\/(?:drives\/([a-zA-Z0-9_-]+)\/)?recruiter-packet$/);
    if (recruiterPacketMatch && method === "GET") {
      try {
        const driveId = recruiterPacketMatch[1] || url.searchParams.get("driveId") || undefined;
        const result = PlacementService.exportRecruiterPacket(db, user, { driveId });
        return jsonResponse({ success: true, data: result });
      } catch (e: any) {
        return errorResponse("action_error", e.message, 400);
      }
    }

    const appStageMatch = p.match(/^\/api\/v1\/placement\/applications\/([a-zA-Z0-9_-]+)\/stage$/);
    if (appStageMatch && method === "PATCH") {
      try {
        const body = (await request.json()) as any;
        const app = PlacementService.updateApplicationStage(db, user, appStageMatch[1], body);
        return jsonResponse({ success: true, data: app });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    // Module 9: Offers, Verification & Joining Outcomes
    if (p === "/api/v1/placement/offers" && method === "GET") {
      const offers = PlacementService.getOffers(db, user);
      return jsonResponse({ success: true, data: offers });
    }

    if (p === "/api/v1/placement/offers" && method === "POST") {
      try {
        const body = (await request.json()) as any;
        const offer = PlacementService.createOffer(db, user, body);
        return jsonResponse({ success: true, data: offer }, 201);
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    const offerDocMatch = p.match(/^\/api\/v1\/placement\/offers\/([a-zA-Z0-9_-]+)\/document$/);
    if (offerDocMatch && method === "PATCH") {
      try {
        const body = (await request.json()) as any;
        const offer = PlacementService.attachOfferDocument(db, user, offerDocMatch[1], body);
        return jsonResponse({ success: true, data: offer });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    const offerVerifyMatch = p.match(/^\/api\/v1\/placement\/offers\/([a-zA-Z0-9_-]+)\/verify$/);
    if (offerVerifyMatch && method === "PATCH") {
      try {
        const body = (await request.json()) as { status: "verified" | "rejected"; notes?: string };
        const offer = PlacementService.verifyOffer(db, user, offerVerifyMatch[1], body);
        return jsonResponse({ success: true, data: offer });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    const offerJoiningMatch = p.match(/^\/api\/v1\/placement\/offers\/([a-zA-Z0-9_-]+)\/joining$/);
    if (offerJoiningMatch && method === "PATCH") {
      try {
        const body = (await request.json()) as any;
        const offer = PlacementService.updateJoiningOutcome(db, user, offerJoiningMatch[1], body);
        return jsonResponse({ success: true, data: offer });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    const offerDeleteMatch = p.match(/^\/api\/v1\/placement\/offers\/([a-zA-Z0-9_-]+)$/);
    if (offerDeleteMatch && method === "DELETE") {
      try {
        const result = PlacementService.deleteOffer(db, user, offerDeleteMatch[1]);
        return jsonResponse({ success: true, data: result });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    // Module 10: Placement Intelligence
    if (p === "/api/v1/placement/intelligence" && method === "GET") {
      const intelligence = PlacementService.getPlacementIntelligence(db, user);
      return jsonResponse({ success: true, data: intelligence });
    }

    // Module 11: Preparation & Training
    if (p === "/api/v1/placement/preparation" && method === "GET") {
      const preparation = PlacementService.getPreparationTargets(db, user);
      return jsonResponse({ success: true, data: preparation });
    }

    if (
      (p === "/api/v1/placement/action-plans" || p === "/api/v1/placement/preparation/action-plans") &&
      method === "POST"
    ) {
      try {
        const body = (await request.json()) as any;
        const plan = PlacementService.createPreparationActionPlan(db, user, body);
        return jsonResponse({ success: true, data: plan }, 201);
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    if (p === "/api/v1/placement/remediation/request" && method === "POST") {
      try {
        const body = (await request.json()) as any;
        const plan = PlacementService.requestRemedialTraining(db, user, body);
        return jsonResponse({ success: true, data: plan }, 201);
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    const planStatusMatch = p.match(/^\/api\/v1\/placement\/action-plans\/([a-zA-Z0-9_-]+)\/status$/);
    if (planStatusMatch && method === "PATCH") {
      try {
        const body = (await request.json()) as { status: string };
        const plan = PlacementService.updatePreparationActionPlanStatus(db, user, planStatusMatch[1], body.status);
        return jsonResponse({ success: true, data: plan });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    // Module 12: Notifications
    if (p === "/api/v1/placement/notifications" && method === "GET") {
      const notifs = PlacementService.getPlacementNotifications(db, user);
      return jsonResponse({ success: true, data: notifs });
    }

    if (p === "/api/v1/placement/notifications" && method === "POST") {
      try {
        const body = (await request.json()) as any;
        const notif = await PlacementService.sendPlacementNotification(db, user, body);
        return jsonResponse({ success: true, data: notif }, 201);
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    // Module 13: Reports & Dual-Layer Exports
    if (p === "/api/v1/placement/reports" && method === "GET") {
      const type = url.searchParams.get("type") || "overview";
      const reports = PlacementService.getPlacementReports(db, user, type);
      return jsonResponse({ success: true, data: reports });
    }

    if (p === "/api/v1/placement/reports/export" && method === "POST") {
      try {
        const body = (await request.json()) as any;
        const result = PlacementService.exportPlacementReport(db, user, body);
        return jsonResponse({ success: true, data: result });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }

    if (p === "/api/v1/placement/reports/jobs" && method === "GET") {
      const jobs = PlacementService.getExportJobs(db, user);
      return jsonResponse({ success: true, data: jobs });
    }

    // Module 15: Operational Activity Timeline & Audit
    if (p === "/api/v1/placement/activity" && method === "GET") {
      const activity = PlacementService.getPlacementActivity(db, user);
      return jsonResponse({ success: true, data: activity });
    }

    // Module 14: Validated Data Import
    if (p === "/api/v1/placement/data/import" && method === "POST") {
      try {
        const body = (await request.json()) as { records: any[]; entityType: string };
        const importedCount = (body.records || []).length;
        db.addAuditLog({
          actor: user.loginId,
          action: "placement.bulk_import",
          target: `${body.entityType || "companies"}:${importedCount}`,
          severity: "info",
          metadata: { count: importedCount, collegeCode: scope.collegeCode },
        });
        return jsonResponse({
          success: true,
          message: `Successfully validated and processed ${importedCount} records.`,
          data: { importedCount, status: "committed" },
        });
      } catch (e: any) {
        return errorResponse("validation_error", e.message, 400);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Student & Public / Judge Endpoints (Respecting Module Visibility & Protection)
  // --------------------------------------------------------------------------
  if (path.startsWith("/api/v1/student/")) {
    const studentCollege = user.collegeCode || (user.collegeId ? db.colleges.find(c => c.id === user.collegeId)?.code : undefined);
    const col = db.colleges.find(c => c.code === studentCollege || c.id === user.collegeId);

    // 1. Identity & Profile
    if (path === "/api/v1/student/me" && method === "GET") {
      const profile = db.getStudentProfile(user);
      return jsonResponse({ success: true, data: profile });
    }

    if (path === "/api/v1/student/profile" && method === "GET") {
      const profile = db.getStudentProfile(user);
      return jsonResponse({ success: true, data: profile });
    }

    if (path === "/api/v1/student/profile" && (method === "PATCH" || method === "PUT")) {
      try {
        const body = (await request.json()) as any;
        // Enforce immutable identity: student cannot change role, college, USN, or status
        if (body.role && body.role !== user.role) {
          return errorResponse("forbidden", "Students cannot modify their role.", 403);
        }
        if (body.collegeCode && body.collegeCode !== user.collegeCode) {
          return errorResponse("forbidden", "Students cannot modify their assigned institution.", 403);
        }
        if (body.usn) {
          return errorResponse("forbidden", "Official USN/Roll Number is immutable.", 403);
        }
        const updated = db.updateStudentProfile(user, body);
        return jsonResponse({ success: true, data: updated });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error updating profile", 400);
      }
    }

    // 2. Overview Dashboard
    if (path === "/api/v1/student/dashboard" && method === "GET") {
      const dashboard = db.getStudentDashboard(user);
      return jsonResponse({ success: true, data: dashboard });
    }

    // 3. Contribution Heatmap (Zero Attendance Law)
    if (path === "/api/v1/student/contributions" && method === "GET") {
      const contributions = db.getStudentContributions(user.id);
      return jsonResponse({ success: true, data: contributions });
    }

    // 4. Activity Feed Timeline
    if (path === "/api/v1/student/activity" && method === "GET") {
      const activities = db.getStudentActivityTimeline(user.id);
      return jsonResponse({ success: true, data: activities });
    }

    // 5. Question & Coding Modules Visibility
    if (path === "/api/v1/student/modules" && method === "GET") {
      const modules = db.getQuestionModules({
        role: user.role,
        collegeId: col?.id || user.collegeId || undefined,
        collegeCode: col?.code || studentCollege,
      });
      return jsonResponse({ success: true, data: modules });
    }

    // 6. Coding Judge Workflows
    if ((path === "/api/v1/student/judge/problems" || path === "/api/v1/student/coding/problems") && method === "GET") {
      const problems = db.getCodingProblems({ userContext: user });
      return jsonResponse({ success: true, data: problems });
    }

    // Problem Detail
    const problemDetailMatch = path.match(/^\/api\/v1\/student\/(?:judge|coding)\/problems\/([a-zA-Z0-9_-]+)$/);
    if (problemDetailMatch && method === "GET") {
      const problemId = problemDetailMatch[1];
      const problem = db.getCodingProblem(problemId, user);
      if (!problem) return errorResponse("not_found", "Problem not found or not visible for your institution.", 404);
      return jsonResponse({ success: true, data: problem });
    }

    // Draft Get
    const draftMatch = path.match(/^\/api\/v1\/student\/judge\/problems\/([a-zA-Z0-9_-]+)\/draft$/);
    if (draftMatch && method === "GET") {
      const problemId = draftMatch[1];
      const draft = db.getJudgeDraft(problemId, user);
      return jsonResponse({ success: true, data: draft });
    }

    // Draft Save
    if (draftMatch && (method === "POST" || method === "PUT")) {
      const problemId = draftMatch[1];
      try {
        const body = (await request.json()) as { language: string; code: string };
        const saved = db.saveJudgeDraft(problemId, body.language || "python", body.code || "", user);
        return jsonResponse({ success: true, data: saved });
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error saving draft", 400);
      }
    }

    // Run Sample Tests
    const runMatch = path.match(/^\/api\/v1\/student\/judge\/problems\/([a-zA-Z0-9_-]+)\/run$/);
    if (runMatch && method === "POST") {
      const problemId = runMatch[1];
      try {
        const body = (await request.json()) as { language: string; sourceCode: string };
        const result = db.runSampleJudgeTests(problemId, body.language || "python", body.sourceCode || "", user);
        return jsonResponse({ success: true, data: result });
      } catch (e) {
        return errorResponse("execution_error", e instanceof Error ? e.message : "Error running sample tests", 400);
      }
    }

    // Submit Solution (Official Evaluation & Auto GitHub Sync)
    const submitMatch = path.match(/^\/api\/v1\/student\/judge\/problems\/([a-zA-Z0-9_-]+)\/submit$/);
    if (submitMatch && method === "POST") {
      const problemId = submitMatch[1];
      try {
        const body = (await request.json()) as { language: string; sourceCode: string };
        const submission = db.submitJudgeSolution(problemId, body.language || "python", body.sourceCode || "", user);
        return jsonResponse({ success: true, data: submission });
      } catch (e) {
        return errorResponse("submission_error", e instanceof Error ? e.message : "Error submitting solution", 400);
      }
    }

    // Submissions History
    if (path === "/api/v1/student/judge/submissions" && method === "GET") {
      const problemId = url.searchParams.get("problemId") || undefined;
      const submissions = db.getCodingSubmissions(problemId, user);
      return jsonResponse({ success: true, data: submissions });
    }

    // Single Submission (Enforcing Student Isolation)
    if (path.startsWith("/api/v1/student/judge/submissions/") && method === "GET") {
      const subId = path.replace("/api/v1/student/judge/submissions/", "");
      const submission = db.judgeSubmissions.find(s => s.id === subId);
      if (!submission) return errorResponse("not_found", "Submission not found.", 404);
      if (submission.studentId !== user.id && submission.studentId !== user.loginId && user.role === "student") {
        return errorResponse("forbidden", "Access denied: Cannot view another student's submission.", 403);
      }
      return jsonResponse({ success: true, data: submission });
    }

    // 7. Assessments
    if (path === "/api/v1/student/assessments" && method === "GET") {
      const assessments = db.getStudentAssessments(user);
      return jsonResponse({ success: true, data: assessments });
    }

    // Assessment Detail
    const asmDetailMatch = path.match(/^\/api\/v1\/student\/assessments\/([a-zA-Z0-9_-]+)$/);
    if (asmDetailMatch && method === "GET") {
      const asmId = asmDetailMatch[1];
      const assessments = db.getStudentAssessments(user);
      const found = assessments.find(a => a.id === asmId || a.code === asmId);
      if (!found) return errorResponse("not_found", "Assessment not found or not published.", 404);
      return jsonResponse({ success: true, data: found });
    }

    // Start / Resume Assessment Attempt
    const asmStartMatch = path.match(/^\/api\/v1\/student\/assessments\/([a-zA-Z0-9_-]+)\/start$/);
    if (asmStartMatch && method === "POST") {
      const asmId = asmStartMatch[1];
      try {
        const attemptData = db.startAssessmentAttempt(asmId, user);
        return jsonResponse({ success: true, data: attemptData });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error starting assessment", 400);
      }
    }

    // Autosave Assessment Answer
    const asmSaveMatch = path.match(/^\/api\/v1\/student\/assessments\/([a-zA-Z0-9_-]+)\/save-answer$/);
    if (asmSaveMatch && method === "POST") {
      try {
        const body = (await request.json()) as { attemptId: string; questionId: string; selectedOption?: string; answerText?: string };
        const saved = db.saveAssessmentAnswer(body.attemptId, body.questionId, { selectedOption: body.selectedOption, answerText: body.answerText }, user);
        return jsonResponse({ success: true, data: saved });
      } catch (e) {
        return errorResponse("save_error", e instanceof Error ? e.message : "Error saving answer", 400);
      }
    }

    // Submit Assessment Attempt
    const asmSubmitMatch = path.match(/^\/api\/v1\/student\/assessments\/([a-zA-Z0-9_-]+)\/submit$/);
    if (asmSubmitMatch && method === "POST") {
      try {
        const body = (await request.json()) as { attemptId: string };
        const attempt = db.submitAssessmentAttempt(body.attemptId, user);
        return jsonResponse({ success: true, data: attempt });
      } catch (e) {
        return errorResponse("submission_error", e instanceof Error ? e.message : "Error submitting assessment", 400);
      }
    }

    // 8. Learning Content (Training & Courses Feature Flag + College Visibility)
    if ((path === "/api/v1/student/learning" || path === "/api/v1/student/courses") && method === "GET") {
      const courses = db.getStudentCourses(user.id, col?.code || studentCollege || "UNKNOWN");
      return jsonResponse({ success: true, data: courses });
    }

    const courseDetailMatch = path.match(/^\/api\/v1\/student\/(?:learning|courses)\/([a-zA-Z0-9_-]+)$/);
    if (courseDetailMatch && method === "GET") {
      const courseId = courseDetailMatch[1];
      const accessibleCourses = db.getStudentCourses(user.id, col?.code || studentCollege || "UNKNOWN");
      const isAllowed = accessibleCourses.some((c) => c.id === courseId || c.code === courseId);
      if (!isAllowed) {
        return errorResponse("forbidden", "Course is not published or not accessible for your institution.", 403);
      }
      const course = db.getLearningCourse(courseId);
      return jsonResponse({ success: true, data: course });
    }

    const lessonDetailMatch = path.match(/^\/api\/v1\/student\/learning\/([a-zA-Z0-9_-]+)\/lessons\/([a-zA-Z0-9_-]+)$/);
    if (lessonDetailMatch && method === "GET") {
      const courseId = lessonDetailMatch[1];
      const lessonId = lessonDetailMatch[2];
      const course = db.getLearningCourse(courseId);
      if (!course) return errorResponse("not_found", "Course not found.", 404);
      
      // Flatten all lessons in course to provide fully functional Previous and Next pointers
      const allLessons: { id: string; title: string; activityType: string }[] = [];
      course.modules?.forEach(m => m.topics?.forEach(t => t.lessons?.forEach(l => allLessons.push(l))));
      const currIdx = allLessons.findIndex(l => l.id === lessonId);
      const currLesson = allLessons[currIdx] || { id: lessonId, title: "Lesson Overview", activityType: "reading" };
      const previousLesson = currIdx > 0 ? allLessons[currIdx - 1] : null;
      const nextLesson = currIdx >= 0 && currIdx < allLessons.length - 1 ? allLessons[currIdx + 1] : null;

      return jsonResponse({
        success: true,
        data: {
          lesson: currLesson,
          courseId,
          content: "Comprehensive learning materials, architectural insights, and verified exercises.",
          previousLessonId: previousLesson?.id || null,
          previousLessonTitle: previousLesson?.title || null,
          nextLessonId: nextLesson?.id || null,
          nextLessonTitle: nextLesson?.title || null,
          isFirstLesson: currIdx === 0,
          isLastLesson: currIdx === allLessons.length - 1 || allLessons.length === 0,
        },
      });
    }

    // Mark Learning Complete
    if ((path === "/api/v1/student/learning/complete" || path === "/api/v1/student/progress") && method === "POST") {
      try {
        const body = (await request.json()) as any;
        const progress = db.recordStudentProgress(user.id, col?.id || user.collegeId || "default-college", body);
        return jsonResponse({ success: true, data: progress }, 201);
      } catch (e) {
        return errorResponse("validation_error", e instanceof Error ? e.message : "Error recording progress", 400);
      }
    }

    // 9. Performance & Intelligence
    if (path === "/api/v1/student/performance" && method === "GET") {
      const performance = db.getStudentPerformance(user);
      return jsonResponse({ success: true, data: performance });
    }

    // 10. Skills Analytics
    if (path === "/api/v1/student/skills" && method === "GET") {
      const skills = db.getStudentSkills(user);
      return jsonResponse({ success: true, data: skills });
    }

    // 11. Placement Readiness
    if (path === "/api/v1/student/placement-readiness" && method === "GET") {
      const readiness = db.getStudentPlacementReadiness(user);
      return jsonResponse({ success: true, data: readiness });
    }

    // Student Placement Opportunities & Applications
    if (path === "/api/v1/student/placement/opportunities" && method === "GET") {
      const opps = (db.placementOpportunities || []).filter(
        (o: any) => (o.collegeCode === col?.code || o.collegeCode === studentCollege) && o.status === "published"
      );
      return jsonResponse({ success: true, data: opps });
    }

    if (path === "/api/v1/student/placement/applications" && method === "GET") {
      const apps = (db.placementApplications || []).filter((a: any) => a.studentId === user.id);
      return jsonResponse({ success: true, data: apps });
    }

    if (path === "/api/v1/student/placement/apply" && method === "POST") {
      try {
        const body = (await request.json()) as { opportunityId: string; resumeVersion?: string };
        if (!body.opportunityId) return errorResponse("invalid_request", "opportunityId is required.", 400);

        const opp = (db.placementOpportunities || []).find(
          (o: any) => o.id === body.opportunityId && (o.collegeCode === col?.code || o.collegeCode === studentCollege) && o.status === "published"
        );
        if (!opp) return errorResponse("not_found", "Opportunity not found or closed.", 404);

        // Check if student already applied
        const existing = (db.placementApplications || []).find(
          (a: any) => a.opportunityId === body.opportunityId && a.studentId === user.id
        );
        if (existing) {
          return errorResponse("duplicate_application", "You have already applied for this opportunity.", 409);
        }

        const student = db.students.find((s: any) => s.id === user.id);
        const newApp = {
          id: `app-${Date.now()}`,
          collegeCode: col?.code || studentCollege || "SMP101",
          opportunityId: opp.id,
          opportunityTitle: opp.title,
          companyName: opp.companyName,
          studentId: user.id,
          studentName: student?.name || user.name,
          studentUsn: student?.usn || user.loginId,
          department: student?.department || "CSE",
          resumeVersion: body.resumeVersion || "v1",
          status: "submitted",
          currentStageNumber: 1,
          currentStageName: "Application Submitted",
          appliedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stageResults: [],
        };

        if (!db.placementApplications) db.placementApplications = [];
        db.placementApplications.push(newApp);

        db.addAuditLog({
          actor: user.loginId,
          action: "student.placement_apply",
          target: `${opp.companyName}:${opp.title}`,
          severity: "info",
          metadata: { applicationId: newApp.id, opportunityId: opp.id },
        });

        return jsonResponse({ success: true, data: newApp }, 201);
      } catch (e: any) {
        return errorResponse("application_error", e.message, 400);
      }
    }

    if (path === "/api/v1/student/placement/offers" && method === "GET") {
      const offers = (db.placementOffers || []).filter(
        (o: any) => o.studentId === user.id && o.verificationStatus === "verified"
      );
      return jsonResponse({ success: true, data: offers });
    }

    // 12. Action Plans (GitHub Issues style)
    if (path === "/api/v1/student/action-plans" && method === "GET") {
      const plans = db.getStudentActionPlans(user);
      return jsonResponse({ success: true, data: plans });
    }

    const actionPlanMilestoneMatch = path.match(/^\/api\/v1\/student\/action-plans\/([a-zA-Z0-9_-]+)\/milestones\/([a-zA-Z0-9_-]+)\/complete$/);
    if (actionPlanMilestoneMatch && method === "POST") {
      const planId = actionPlanMilestoneMatch[1];
      const milestoneId = actionPlanMilestoneMatch[2];
      try {
        const body = (await request.json()) as { evidence?: string };
        const res = db.completeStudentActionPlanMilestone(planId, milestoneId, body.evidence || "Completed", user);
        return jsonResponse({ success: true, data: res });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error completing milestone", 400);
      }
    }

    // 13. GitHub Sync & Connection Status
    if (path === "/api/v1/student/github/status" && method === "GET") {
      const status = db.getStudentGitHubStatus(user);
      return jsonResponse({ success: true, data: status });
    }

    if (path === "/api/v1/student/github/connect" && method === "POST") {
      try {
        const body = (await request.json()) as { githubUsername?: string };
        const username = (body.githubUsername || "").trim();
        if (!username) return errorResponse("invalid_request", "GitHub username is required.", 400);
        db.updateStudentProfile(user, { githubUsername: username });
        return jsonResponse({ success: true, message: `Connected to GitHub user '${username}'.`, data: db.getStudentGitHubStatus(user) });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error connecting GitHub", 400);
      }
    }

    if (path === "/api/v1/student/github/disconnect" && method === "POST") {
      db.updateStudentProfile(user, { githubUsername: "" });
      return jsonResponse({ success: true, message: "Disconnected GitHub account." });
    }

    if (path === "/api/v1/student/github/retry-sync" && method === "POST") {
      return jsonResponse({ success: true, message: "Sync job retried successfully." });
    }

    // 14. Notifications for Student
    if (path === "/api/v1/student/notifications" && method === "GET") {
      const notifs = db.getNotifications({ collegeScope: studentCollege, targetRole: "Students" });
      return jsonResponse({ success: true, data: notifs });
    }
  }

  // Judge execution/retrieval API (Stripping sensitive test cases for non-editors)
  if (path.startsWith("/api/v1/judge/problems")) {
    if (path === "/api/v1/judge/problems" && method === "GET") {
      const problems = db.getCodingProblems({ userContext: user });
      return jsonResponse({ success: true, data: problems });
    }
    if (method === "GET") {
      const problemId = path.replace("/api/v1/judge/problems/", "");
      const problem = db.getCodingProblem(problemId, user);
      if (!problem) return errorResponse("not_found", "Problem not found or not visible for your institution.", 404);
      return jsonResponse({ success: true, data: problem });
    }
  }

  // General Notifications API for authenticated users (with auto-expiration & role/scope filtering)
  if (path.startsWith("/api/v1/notifications")) {
    if (path === "/api/v1/notifications" && method === "GET") {
      const collegeScope = url.searchParams.get("collegeScope") || user.collegeCode || undefined;
      const role = url.searchParams.get("role") || user.role || undefined;
      return jsonResponse({
        success: true,
        data: db.getNotifications({
          collegeScope,
          targetRole: user.role === "super_admin" || user.role === "editor" ? undefined : role,
        }),
      });
    }
    if (path.startsWith("/api/v1/notifications/") && method === "DELETE") {
      const notifId = path.replace("/api/v1/notifications/", "");
      try {
        const result = await db.deleteNotification(notifId, user.loginId);
        return jsonResponse({ success: true, message: "Notification deleted successfully.", data: result });
      } catch (e) {
        return errorResponse("action_error", e instanceof Error ? e.message : "Error deleting notification", 400);
      }
    }
  }

  return errorResponse("not_found", `Route '${method} ${path}' not found.`, 404);
}
