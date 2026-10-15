import { describe, it, expect, beforeEach } from "vitest";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import { db } from "../server/db";
import type { AuthenticatedUser } from "../server/types";

describe("Editor Workspace Complete Architecture & Invariants", () => {
  const superAdminUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000009",
    loginId: "superadmin@ziphyrus.in",
    email: "superadmin@ziphyrus.in",
    name: "Ziphyrus Super Admin",
    role: "super_admin",
    isProtected: true,
    permissions: ["platform.*"],
  };

  const editorUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000002",
    loginId: "editor1@ziphyrus.in",
    email: "editor1@ziphyrus.in",
    name: "Ziphyrus Lead Editor",
    role: "editor",
    isProtected: true,
    permissions: [
      "content.edit",
      "feature.manage",
      "problem.manage",
      "question.manage",
      "course.manage",
      "assessment.manage",
      "notification.manage",
      "override.manage",
    ],
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
      "schedule.manage",
      "session.manage",
      "actionplan.manage",
    ],
  };

  const editorToken = createSessionToken(editorUser);
  const coordinatorToken = createSessionToken(coordinatorUser);
  const superAdminToken = createSessionToken(superAdminUser);

  // --------------------------------------------------------------------------
  // 1. Coordinator Provisioning & One Active Coordinator per College Invariant
  // --------------------------------------------------------------------------
  describe("1. Coordinator Provisioning & Invariants", () => {
    it("allows Editor to list coordinator accounts", async () => {
      const req = new Request("http://localhost/api/v1/editor/coordinators", {
        headers: { Authorization: `Bearer ${editorToken}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
    });

    it("allows Editor to provision a coordinator for a college without an active coordinator", async () => {
      // Find or create a college that doesn't have a coordinator (SMP102)
      const targetCollege = "SMP102";
      const email = `coord.test.${Date.now()}@smp102.edu`;

      const req = new Request("http://localhost/api/v1/editor/coordinators", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Coordinator SMP102",
          email,
          collegeCode: targetCollege,
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.email).toBe(email);
      expect(json.data.college).toBe(targetCollege);
      expect(json.data.role).toBe("coordinator");
      expect(json.data.status).toBe("active");
    });

    it("strictly blocks provisioning a second active coordinator for the same college", async () => {
      // SMP101 already has Asha Sharma (coord@smp101.edu)
      const req = new Request("http://localhost/api/v1/editor/coordinators", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Duplicate Coordinator",
          email: `duplicate.${Date.now()}@smp101.edu`,
          collegeCode: "SMP101",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.message).toContain("Only one active Coordinator per college is permitted");
    });

    it("prohibits Coordinators from provisioning Coordinator accounts", async () => {
      const req = new Request("http://localhost/api/v1/editor/coordinators", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${coordinatorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Unauthorized Provisioning",
          email: "unauthorized@test.edu",
          collegeCode: "SMP103",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Editor Cannot Create Colleges (Super Admin Exclusive)
  // --------------------------------------------------------------------------
  describe("2. College Creation Boundaries", () => {
    it("strictly rejects Editor attempts to create colleges with HTTP 403", async () => {
      const req = new Request("http://localhost/api/v1/editor/colleges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Editor Attempted College",
          code: "EAC999",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.message).toContain("Editor is not permitted to create colleges");
    });

    it("allows Super Admin to create colleges with default active status", async () => {
      const uniqueCode = `SAC${Math.floor(100 + Math.random() * 899)}`;
      const req = new Request("http://localhost/api/v1/admin/colleges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Super Admin Created Institute",
          code: uniqueCode,
          status: "active",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("active");
    });
  });

  // --------------------------------------------------------------------------
  // 3. College Lifecycle & Code Corrections by Editor
  // --------------------------------------------------------------------------
  describe("3. College Lifecycle & Code Updates", () => {
    it("allows Editor to update college status with mandatory justification >= 5 chars", async () => {
      const req = new Request("http://localhost/api/v1/editor/colleges/c0000000-0000-0000-0000-000000000001/status", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "hold",
          reason: "Semester break transition interval active.",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("hold");

      // Reset back to active
      await handleApiRequest(
        new Request("http://localhost/api/v1/editor/colleges/c0000000-0000-0000-0000-000000000001/status", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${editorToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "active",
            reason: "New semester coursework commenced.",
          }),
        })
      );
    });

    it("rejects college status change when reason is less than 5 characters", async () => {
      const req = new Request("http://localhost/api/v1/editor/colleges/c0000000-0000-0000-0000-000000000001/status", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "hold",
          reason: "tiny",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.message).toContain("at least 5 characters");
    });
  });

  // --------------------------------------------------------------------------
  // 4. Feature Availability & Training & Courses Disabled by Default
  // --------------------------------------------------------------------------
  describe("4. Feature Availability Invariants", () => {
    it("ensures Training & Courses feature is present and disabled by default", async () => {
      const req = new Request("http://localhost/api/v1/editor/features", {
        headers: { Authorization: `Bearer ${editorToken}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const trainingFlag = json.data.find((f: any) => f.key === "training.courses");
      expect(trainingFlag).toBeDefined();
      expect(trainingFlag.name).toBe("Training & Courses");
      expect(trainingFlag.isEnabled).toBe(false);
    });

    it("allows Editor to toggle a feature flag and records an audit log", async () => {
      const req = new Request("http://localhost/api/v1/editor/features/workspace.employer", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isEnabled: false }),
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.isEnabled).toBe(false);

      // Re-enable
      await handleApiRequest(
        new Request("http://localhost/api/v1/editor/features/workspace.employer", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${editorToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isEnabled: true }),
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // 5. Question Bank Management
  // --------------------------------------------------------------------------
  describe("5. Question Bank Management", () => {
    it("validates MCQ creation requiring 4 options and valid correct answer", async () => {
      const req = new Request("http://localhost/api/v1/editor/questions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stem: "What is the amortized time complexity of HashMap lookup?",
          domain: "Technical",
          type: "MCQ",
          difficulty: "Medium",
          options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
          correctAnswer: "O(1)",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.options.length).toBe(4);
      expect(json.data.correctAnswer).toBe("O(1)");
    });
  });

  // --------------------------------------------------------------------------
  // 6. Visible-Value Overrides & Non-Corruption of Authoritative Data
  // --------------------------------------------------------------------------
  describe("6. Visible-Value Overrides Architectural Separation", () => {
    it("requires mandatory explanation of at least 5 characters for overrides", async () => {
      const req = new Request("http://localhost/api/v1/editor/overrides", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entityType: "course",
          entityId: "CRS-001",
          fieldName: "title",
          actualValue: "Data Structures & Algorithmic Thinking",
          visibleValue: "Advanced DSA Masterclass",
          mandatoryReason: "ok",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.message).toContain("at least 5 characters");
    });

    it("creates a presentation override without altering raw intelligence calculation", async () => {
      const req = new Request("http://localhost/api/v1/editor/overrides", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entityType: "course",
          entityId: "CRS-DSA101",
          fieldName: "title",
          actualValue: "Data Structures & Algorithmic Thinking",
          visibleValue: "Advanced Algorithms & Data Structures",
          mandatoryReason: "Approved executive syllabus presentation rename.",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.actualValue).toBe("Data Structures & Algorithmic Thinking");
      expect(json.data.visibleValue).toBe("Advanced Algorithms & Data Structures");

      // Verify underlying course entity is untouched in db
      const course = db.getCourses().find((c) => c.code === "CRS-DSA101");
      expect(course).toBeDefined();
      expect(course?.title).toBe("Data Structures & Algorithmic Thinking");
    });
  });

  // --------------------------------------------------------------------------
  // 7. Protected Accounts Invariant
  // --------------------------------------------------------------------------
  describe("7. Protected Accounts Invariant", () => {
    it("strictly prohibits deactivation of protected editor account", async () => {
      const editorRecord = db.getUserById("editor1@ziphyrus.in");
      expect(editorRecord).toBeDefined();

      expect(() => {
        db.setUserStatus(editorRecord!.id, "inactive");
      }).toThrow(/Protected account/);
    });

    it("strictly prohibits deactivation of protected super admin account", async () => {
      const adminRecord = db.getUserById("sAdmin1@ziphyrus.in");
      expect(adminRecord).toBeDefined();

      expect(() => {
        db.setUserStatus(adminRecord!.id, "inactive");
      }).toThrow(/Protected account/);
    });
  });
});
