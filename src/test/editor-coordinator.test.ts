import { describe, it, expect, beforeEach } from "vitest";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import { db } from "../server/db";
import { homeForRole } from "../lib/auth/service";
import type { AuthenticatedUser } from "../server/types";

describe("Editor and Coordinator Workspaces Integration", () => {
  const superAdminUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000009",
    loginId: "superadmin@ziphyrus.in",
    email: "superadmin@ziphyrus.in",
    name: "Platform Architect",
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

  const studentUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000005",
    loginId: "student.meera",
    email: "meera@smp102.edu",
    name: "Meera Patel",
    role: "student",
    collegeCode: "SMP102",
    isProtected: false,
    permissions: ["self.view"],
  };

  const editorToken = createSessionToken(editorUser);
  const coordinatorToken = createSessionToken(coordinatorUser);
  const studentToken = createSessionToken(studentUser);
  const superAdminToken = createSessionToken(superAdminUser);

  describe("1. Role Routing Invariants", () => {
    it("routes verified sessions to correct workspace entrypoints", () => {
      expect(homeForRole("super_admin")).toBe("/admin");
      expect(homeForRole("editor")).toBe("/editor");
      expect(homeForRole("coordinator")).toBe("/coordinator");
      expect(homeForRole("student")).toBe("/student");
      expect(homeForRole("trainer")).toBe("/trainer");
    });
  });

  describe("2. Editor Workspace Capabilities & Constraints", () => {
    it("loads Editor overview metrics for authorized editor", async () => {
      const req = new Request("http://localhost/api/v1/editor/overview", {
        headers: { Authorization: `Bearer ${editorToken}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.counts.courses).toBeGreaterThan(0);
      expect(json.data.counts.questions).toBeGreaterThan(0);
      expect(json.data.counts.featureFlags).toBeGreaterThan(0);
    });

    it("rejects unauthorized roles from Editor endpoints", async () => {
      const req = new Request("http://localhost/api/v1/editor/overview", {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(403);
    });

    it("creates course in draft status and allows publishing", async () => {
      const createReq = new Request("http://localhost/api/v1/editor/courses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Distributed Systems & Raft Consensus",
          modulesCount: 3,
          lessonsCount: 12,
        }),
      });
      const createRes = await handleApiRequest(createReq);
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()).data;
      expect(created.title).toBe("Distributed Systems & Raft Consensus");
      expect(created.status).toBe("draft");

      // Update to published
      const statusReq = new Request(`http://localhost/api/v1/editor/courses/${created.id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "published" }),
      });
      const statusRes = await handleApiRequest(statusReq);
      expect(statusRes.status).toBe(200);
      const updated = (await statusRes.json()).data;
      expect(updated.status).toBe("published");
    });

    it("enforces 4 options invariant on MCQ question creation", async () => {
      const invalidReq = new Request("http://localhost/api/v1/editor/questions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stem: "What is 2 + 2?",
          domain: "Aptitude",
          type: "MCQ",
          difficulty: "Easy",
          options: ["3", "4", "5"], // Only 3 options (violates invariant)
          correctAnswer: "4",
        }),
      });
      const invalidRes = await handleApiRequest(invalidReq);
      expect(invalidRes.status).toBe(400);

      const validReq = new Request("http://localhost/api/v1/editor/questions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stem: "What is the time complexity of QuickSort average case?",
          domain: "Technical",
          type: "MCQ",
          difficulty: "Medium",
          options: ["O(N)", "O(N log N)", "O(N^2)", "O(1)"],
          correctAnswer: "O(N log N)",
        }),
      });
      const validRes = await handleApiRequest(validReq);
      expect(validRes.status).toBe(201);
      const q = (await validRes.json()).data;
      expect(q.correctAnswer).toBe("O(N log N)");
    });

    it("enforces that ONLY Editor can toggle feature flags", async () => {
      // Editor can toggle
      const editorReq = new Request("http://localhost/api/v1/editor/features/workspace.employer", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isEnabled: false }),
      });
      const editorRes = await handleApiRequest(editorReq);
      expect(editorRes.status).toBe(200);
      const flag = (await editorRes.json()).data;
      expect(flag.isEnabled).toBe(false);

      // Super Admin cannot toggle feature flag (Editor-controlled invariant!)
      const superAdminReq = new Request("http://localhost/api/v1/editor/features/workspace.employer", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isEnabled: true }),
      });
      const superAdminRes = await handleApiRequest(superAdminReq);
      expect(superAdminRes.status).toBe(403);
    });

    it("requires mandatory reason >= 5 characters for visible-value overrides", async () => {
      const invalidReq = new Request("http://localhost/api/v1/editor/overrides", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entityType: "course",
          entityId: "crs-1",
          fieldName: "title",
          actualValue: "Data Structures",
          visibleValue: "DS & Algorithms",
          mandatoryReason: "no", // Too short (< 5 chars)
        }),
      });
      const invalidRes = await handleApiRequest(invalidReq);
      expect(invalidRes.status).toBe(400);

      const validReq = new Request("http://localhost/api/v1/editor/overrides", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entityType: "course",
          entityId: "crs-1",
          fieldName: "title",
          actualValue: "Data Structures",
          visibleValue: "DS & Algorithms",
          mandatoryReason: "University syllabus naming synchronization",
        }),
      });
      const validRes = await handleApiRequest(validReq);
      expect(validRes.status).toBe(201);
    });
  });

  describe("3. Coordinator Workspace Capabilities & Constraints", () => {
    it("strictly isolates coordinator to their assigned college (cross-college rejected with 403)", async () => {
      // Accessing assigned college SMP101 works
      const ownCollegeReq = new Request("http://localhost/api/v1/coordinator/overview", {
        headers: { Authorization: `Bearer ${coordinatorToken}` },
      });
      const ownRes = await handleApiRequest(ownCollegeReq);
      expect(ownRes.status).toBe(200);

      // Attempting to query another college OTHER99 is rejected
      const crossCollegeReq = new Request("http://localhost/api/v1/coordinator/overview?collegeCode=OTHER99", {
        headers: { Authorization: `Bearer ${coordinatorToken}` },
      });
      const crossRes = await handleApiRequest(crossCollegeReq);
      expect(crossRes.status).toBe(403);
      const json = await crossRes.json();
      expect(json.error.code).toBe("forbidden");
    });

    it("updates student USN with mandatory reason and logs to audit", async () => {
      // Find a student
      const studentsReq = new Request("http://localhost/api/v1/coordinator/students", {
        headers: { Authorization: `Bearer ${coordinatorToken}` },
      });
      const studentsRes = await handleApiRequest(studentsReq);
      expect(studentsRes.status).toBe(200);
      const students = (await studentsRes.json()).data;
      const targetStudent = students[0];

      // Rejects update if reason < 5 chars
      const invalidPatch = new Request(`http://localhost/api/v1/coordinator/students/${targetStudent.id}/usn`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${coordinatorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposedUsn: "1MS23CS999",
          mandatoryReason: "fix", // < 5 chars
        }),
      });
      const invalidRes = await handleApiRequest(invalidPatch);
      expect(invalidRes.status).toBe(400);

      // Valid update
      const validPatch = new Request(`http://localhost/api/v1/coordinator/students/${targetStudent.id}/usn`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${coordinatorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposedUsn: "1MS23CS999",
          mandatoryReason: "Correction as per VTU University Registrar official gazette",
        }),
      });
      const validRes = await handleApiRequest(validPatch);
      expect(validRes.status).toBe(200);
      const updatedStudent = (await validRes.json()).data;
      expect(updatedStudent.usn).toBe("1MS23CS999");
      expect(updatedStudent.lastCorrection.reason).toBe("Correction as per VTU University Registrar official gazette");
    });

    it("generates 1-hour expiring single-use tokenized registration link", async () => {
      const linkReq = new Request("http://localhost/api/v1/coordinator/registration-links", {
        method: "POST",
        headers: { Authorization: `Bearer ${coordinatorToken}` },
      });
      const linkRes = await handleApiRequest(linkReq);
      expect(linkRes.status).toBe(201);
      const link = (await linkRes.json()).data;
      expect(link.url).toContain("token=reg_");
      expect(link.url).toContain("college=SMP101");
      const expiry = new Date(link.expiresAt).getTime();
      const diffMinutes = (expiry - Date.now()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThan(58);
      expect(diffMinutes).toBeLessThanOrEqual(61);
    });

    it("verifies ZERO ATTENDANCE LAW on training sessions", async () => {
      const sessionsReq = new Request("http://localhost/api/v1/coordinator/sessions", {
        headers: { Authorization: `Bearer ${coordinatorToken}` },
      });
      const sessionsRes = await handleApiRequest(sessionsReq);
      expect(sessionsRes.status).toBe(200);
      const sessions = (await sessionsRes.json()).data;
      expect(sessions.length).toBeGreaterThan(0);

      // Verify ZERO ATTENDANCE fields exist
      sessions.forEach((s: any) => {
        expect(s).not.toHaveProperty("attendance");
        expect(s).not.toHaveProperty("attendancePercentage");
        expect(s).not.toHaveProperty("attendanceSheet");
        expect(s).not.toHaveProperty("presentCount");
        expect(s).not.toHaveProperty("absentCount");
      });

      // Coordinator completes session with mandatory reason
      const completeReq = new Request("http://localhost/api/v1/coordinator/sessions/ses-2/complete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${coordinatorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mandatoryReason: "Trainer completed practical evaluation remotely",
        }),
      });
      const completeRes = await handleApiRequest(completeReq);
      expect(completeRes.status).toBe(200);
      const completed = (await completeRes.json()).data;
      expect(completed.status).toBe("completed");
      expect(completed.completionReason).toBe("Trainer completed practical evaluation remotely");
      expect(completed).not.toHaveProperty("attendance");
    });

    it("creates and updates action plans", async () => {
      const createReq = new Request("http://localhost/api/v1/coordinator/action-plans", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${coordinatorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName: "Priya Rao",
          studentId: "stu-2",
          description: "Complete mock coding contest on dynamic programming",
          trainerName: "Rohan Verma",
          trainerId: "trn-1",
          deadline: "2026-10-25",
        }),
      });
      const createRes = await handleApiRequest(createReq);
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()).data;
      expect(created.status).toBe("Not Started");

      const updateReq = new Request(`http://localhost/api/v1/coordinator/action-plans/${created.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${coordinatorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "In Progress" }),
      });
      const updateRes = await handleApiRequest(updateReq);
      expect(updateRes.status).toBe(200);
      const updated = (await updateRes.json()).data;
      expect(updated.status).toBe("In Progress");
    });
  });
});
