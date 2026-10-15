import { describe, it, expect, beforeEach } from "vitest";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import { db } from "../server/db";
import { homeForRole } from "../lib/auth/service";
import { TrainerService } from "../server/trainer-service";
import type { AuthenticatedUser } from "../server/types";

describe("Trainer Workspace — Full Architecture, Scope Isolation & Read-Only Invariants", () => {
  const trainerUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000004",
    loginId: "trainer.rohan",
    email: "rohan@smp101.edu",
    name: "Rohan Deshmukh",
    role: "trainer",
    collegeCode: "SMP101",
    collegeId: "c0000000-0000-0000-0000-000000000001",
    isProtected: false,
    permissions: ["batch.view_evidence"],
  };

  const coordinatorUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000003",
    loginId: "coordinator.smp101",
    email: "coord@smp101.edu",
    name: "Asha Sharma",
    role: "coordinator",
    collegeCode: "SMP101",
    collegeId: "c0000000-0000-0000-0000-000000000001",
    isProtected: false,
    permissions: [
      "college.manage",
      "batch.view",
      "student.manage",
      "trainer.manage",
      "allocation.manage",
    ],
  };

  let trainerToken: string;
  let coordinatorToken: string;

  beforeEach(() => {
    trainerToken = createSessionToken(trainerUser);
    coordinatorToken = createSessionToken(coordinatorUser);

    // Ensure active college status for testing
    const col = db.colleges.find((c) => c.code === "SMP101");
    if (col) col.status = "active";
  });

  // ---------------------------------------------------------------------------
  // 1. Role Routing & Home Resolution
  // ---------------------------------------------------------------------------
  describe("Role Routing & Authentication Invariants", () => {
    it("routes trainer role to /trainer in homeForRole", () => {
      expect(homeForRole("trainer")).toBe("/trainer");
      expect(homeForRole("super_admin")).toBe("/admin");
      expect(homeForRole("coordinator")).toBe("/coordinator");
      expect(homeForRole("student")).toBe("/student");
      expect(homeForRole("editor")).toBe("/editor");
    });

    it("authenticates trainer and loads profile via /api/v1/trainer/me", async () => {
      const req = new Request("http://localhost/api/v1/trainer/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${trainerToken}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.trainer.name).toBe("Rohan Verma");
      expect(json.data.college.code).toBe("SMP101");
      expect(Array.isArray(json.data.skills)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. College Scope & Isolation
  // ---------------------------------------------------------------------------
  describe("College Jurisdiction & Tenant Isolation", () => {
    it("trainer is strictly scoped to their assigned college", async () => {
      const scope = TrainerService.getTrainerScope(db, trainerUser);
      expect(scope.collegeCode).toBe("SMP101");
      expect(scope.allocations.every((a) => a.collegeCode === "SMP101")).toBe(true);
    });

    it("rejects non-trainer users from accessing trainer endpoints", async () => {
      const req = new Request("http://localhost/api/v1/trainer/dashboard", {
        method: "GET",
        headers: { Authorization: `Bearer ${coordinatorToken}` }, // Coordinator calling trainer endpoint
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Strictly Read-Only Policy Enforcement (Non-GET Rejection)
  // ---------------------------------------------------------------------------
  describe("Read-Only Policy Enforcement", () => {
    it("rejects POST mutations to /api/v1/trainer/dashboard with 403 Forbidden", async () => {
      const req = new Request("http://localhost/api/v1/trainer/dashboard", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${trainerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "create_metric" }),
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("forbidden");
      expect(json.error.message).toContain("read-only");
    });

    it("rejects PUT mutations to /api/v1/trainer/classes with 403 Forbidden", async () => {
      const req = new Request("http://localhost/api/v1/trainer/classes", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${trainerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(403);
    });

    it("rejects DELETE attempts to /api/v1/trainer/students with 403 Forbidden", async () => {
      const req = new Request("http://localhost/api/v1/trainer/students/s01", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${trainerToken}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(403);
    });

    it("rejects PATCH attempts to /api/v1/trainer/skill-gaps with 403 Forbidden", async () => {
      const req = new Request("http://localhost/api/v1/trainer/skill-gaps", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${trainerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ score: 100 }),
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Allocation-Scoped Student Authorization & Boundaries
  // ---------------------------------------------------------------------------
  describe("Allocation Scoping & Student Boundary Invariants", () => {
    it("returns only students within assigned allocations or college scope", async () => {
      const req = new Request("http://localhost/api/v1/trainer/students", {
        method: "GET",
        headers: { Authorization: `Bearer ${trainerToken}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.students)).toBe(true);
      // All returned students must belong to SMP101
      json.data.students.forEach((s: any) => {
        expect(s.collegeCode).toBe("SMP101");
      });
    });

    it("allows drilling down into an authorized student's performance profile", async () => {
      // Find an authorized student
      const students = TrainerService.getTrainerStudents(db, trainerUser);
      expect(students.students.length).toBeGreaterThan(0);
      const target = students.students[0];

      const req = new Request(`http://localhost/api/v1/trainer/students/${target.id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${trainerToken}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(target.id);
      expect(json.data.usn).toBe(target.usn);
      expect(json.data.attendanceRate).toBeDefined();
    });

    it("blocks access to a student outside the trainer's authorized college", async () => {
      // Create a foreign student from another college
      const foreignId = "foreign-student-xyz-999";
      db.students.push({
        id: foreignId,
        usn: "1RV21CS999",
        name: "Foreign Campus Student",
        collegeCode: "OTHER_COLLEGE_99",
        collegeId: "c_other",
        department: "CSE",
        section: "A",
        year: 3,
        email: "foreign@other.edu",
        status: "active",
      });

      const req = new Request(`http://localhost/api/v1/trainer/students/${foreignId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${trainerToken}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.message).toMatch(/Access denied|outside your authorized/);

      // Cleanup foreign student
      db.students = db.students.filter((s) => s.id !== foreignId);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Shared Intelligence Engine & Pedagogical Insights
  // ---------------------------------------------------------------------------
  describe("Shared Intelligence Integration (Insight -> Evidence -> Action)", () => {
    it("returns structured pedagogical insights and evidence for skill gaps", async () => {
      const req = new Request("http://localhost/api/v1/trainer/skill-gaps", {
        method: "GET",
        headers: { Authorization: `Bearer ${trainerToken}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.insights)).toBe(true);

      // Verify Insight -> Evidence -> Action triad
      if (json.data.insights.length > 0) {
        const item = json.data.insights[0];
        expect(item.insight).toBeDefined();
        expect(item.evidence).toBeDefined();
        expect(item.action).toBeDefined();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Coding Judge Telemetry & Sensitive Test Stripping
  // ---------------------------------------------------------------------------
  describe("Coding Judge Telemetry Security", () => {
    it("returns submission verdicts and telemetry without leaking hidden test cases", async () => {
      const req = new Request("http://localhost/api/v1/trainer/coding-progress", {
        method: "GET",
        headers: { Authorization: `Bearer ${trainerToken}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.metrics).toBeDefined();
      expect(json.data.verdicts).toBeDefined();
      expect(Array.isArray(json.data.languages)).toBe(true);
      expect(Array.isArray(json.data.recentSubmissions)).toBe(true);

      // Verify no secret test case keys or inputs are exposed in recent submissions
      json.data.recentSubmissions.forEach((sub: any) => {
        expect(sub.hiddenTestCases).toBeUndefined();
        expect(sub.testCaseInputs).toBeUndefined();
        expect(sub.expectedOutputs).toBeUndefined();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Feature Flag Integration (Learning Module)
  // ---------------------------------------------------------------------------
  describe("Feature Flag Governance", () => {
    it("honors training.courses feature availability status", async () => {
      const req = new Request("http://localhost/api/v1/trainer/learning-progress", {
        method: "GET",
        headers: { Authorization: `Bearer ${trainerToken}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      // Since training.courses is disabled by default in db, enabled should be false
      expect(json.data.enabled).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Today's Classes & Dashboard Primary Sections
  // ---------------------------------------------------------------------------
  describe("Dashboard & Classes Timetable", () => {
    it("returns Today's Classes and core KPIs on trainer dashboard", async () => {
      const req = new Request("http://localhost/api/v1/trainer/dashboard", {
        method: "GET",
        headers: { Authorization: `Bearer ${trainerToken}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.metrics.totalStudents).toBeGreaterThan(0);
      expect(Array.isArray(json.data.todaysClasses)).toBe(true);
      expect(Array.isArray(json.data.skillDistribution)).toBe(true);
      expect(Array.isArray(json.data.recentVerdicts)).toBe(true);
    });

    it("returns assigned allocations and weekly schedule in /api/v1/trainer/classes", async () => {
      const req = new Request("http://localhost/api/v1/trainer/classes", {
        method: "GET",
        headers: { Authorization: `Bearer ${trainerToken}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.allocations.length).toBeGreaterThan(0);
      expect(Array.isArray(json.data.schedule)).toBe(true);
    });
  });
});
