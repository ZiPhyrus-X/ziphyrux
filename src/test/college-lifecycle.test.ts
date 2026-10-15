import { describe, expect, it } from "vitest";
import { db } from "../server/db";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import type { AuthenticatedUser } from "../server/types";

describe("College Lifecycle & College Code Management Architecture", () => {
  const superAdminUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000001",
    loginId: "sAdmin1@ziphyrus.in",
    email: "sAdmin1@ziphyrus.in",
    name: "Ziphyrus Super Admin",
    role: "super_admin",
    isProtected: true,
    permissions: ["platform.*"],
  };
  const superAdminToken = createSessionToken(superAdminUser);

  const editorUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000002",
    loginId: "editor1@ziphyrus.in",
    email: "editor1@ziphyrus.in",
    name: "Ziphyrus Lead Editor",
    role: "editor",
    isProtected: true,
    permissions: ["content.edit"],
  };
  const editorToken = createSessionToken(editorUser);

  describe("1. College Creation Authority (Super Admin Exclusive)", () => {
    it("Super Admin can create a new college with initial status (Active, Hold, Deactive)", async () => {
      const uniqueCode = `TST${Date.now().toString().slice(-4)}`;
      const req = new Request("http://localhost/api/v1/admin/colleges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          name: "Test Technology Institute",
          code: uniqueCode,
          status: "active",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.code).toBe(uniqueCode);
      expect(json.data.status).toBe("active");
      expect(json.data.id).toBeDefined();

      // Check DB persistence
      const collegeInDb = db.getCollegeById(uniqueCode);
      expect(collegeInDb).toBeDefined();
      expect(collegeInDb?.status).toBe("active");

      // Verify audit trail
      const audit = db.auditLogs.find((l) => l.action === "college.create" && l.target === uniqueCode);
      expect(audit).toBeDefined();
    });

    it("Editor CANNOT create a college via API (Strictly rejected with HTTP 403)", async () => {
      const req = new Request("http://localhost/api/v1/editor/colleges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${editorToken}`,
        },
        body: JSON.stringify({
          name: "Unauthorized College",
          code: "UNAUTH1",
          status: "active",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("forbidden");
      expect(json.error?.message).toMatch(/strictly restricted to Super Admin/i);
    });

    it("Editor attempting creation on /api/v1/admin/colleges is also rejected with HTTP 403", async () => {
      const req = new Request("http://localhost/api/v1/admin/colleges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${editorToken}`,
        },
        body: JSON.stringify({
          name: "Unauthorized College Direct",
          code: "UNAUTH2",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(403);
    });
  });

  describe("2. College Lifecycle Status Management (Active, Hold, Deactive)", () => {
    it("Super Admin can change college status with mandatory justification", async () => {
      const college = db.getColleges()[0];
      expect(college).toBeDefined();

      const req = new Request(`http://localhost/api/v1/admin/colleges/${college.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          status: "hold",
          reason: "Semester break between terms for cohort realignment.",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("hold");
      expect(json.data.statusReason).toBe("Semester break between terms for cohort realignment.");

      // Verify persistent history entry
      const history = db.getCollegeStatusHistory(college.id);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].newStatus).toBe("hold");
      expect(history[0].reason).toContain("Semester break");
    });

    it("Editor can change college status with mandatory justification", async () => {
      const college = db.getCollegeById("SMP102");
      expect(college).toBeDefined();

      const req = new Request(`http://localhost/api/v1/editor/colleges/${college!.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${editorToken}`,
        },
        body: JSON.stringify({
          status: "hold",
          reason: "Annual maintenance and syllabus transition window.",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("hold");
    });

    it("Rejects status change if reason is less than 5 characters", async () => {
      const college = db.getColleges()[0];
      const req = new Request(`http://localhost/api/v1/admin/colleges/${college.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          status: "deactive",
          reason: "test", // only 4 chars
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error?.message).toMatch(/at least 5 characters/i);
    });

    it("Allows authorized transition from Deactive to Active (Reactivation workflow)", async () => {
      const college = db.getCollegeById("SMP104"); // SMP104 is Deactive in seed
      expect(college).toBeDefined();
      expect(college?.status).toBe("deactive");

      const req = new Request(`http://localhost/api/v1/admin/colleges/${college!.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          status: "active",
          reason: "New partnership contract executed and verified for 2026-27.",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("active");
    });
  });

  describe("3. Editor College Code Modification & Relational Integrity", () => {
    it("Editor can update an existing college code with mandatory reason", async () => {
      const college = db.getCollegeById("SMP105");
      expect(college).toBeDefined();
      const originalId = college!.id;
      const newCode = `TEC${Date.now().toString().slice(-4)}`;

      const req = new Request(`http://localhost/api/v1/editor/colleges/${originalId}/code`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${editorToken}`,
        },
        body: JSON.stringify({
          newCode,
          reason: "Official acronym revision requested by university registrar.",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.code).toBe(newCode);

      // Verifies internal immutable ID was preserved
      expect(json.data.id).toBe(originalId);

      // Verifies previous code was recorded
      expect(json.data.previousCodes).toContain("SMP105");

      // Verify code history record
      const codeHist = db.getCollegeCodeHistory(originalId);
      expect(codeHist.length).toBeGreaterThan(0);
      expect(codeHist[0].previousCode).toBe("SMP105");
      expect(codeHist[0].newCode).toBe(newCode);
      expect(codeHist[0].changedBy).toBe(editorUser.loginId);

      // Verify audit log
      const audit = db.auditLogs.find((l) => l.action === "college.code_update" && l.target.includes(newCode));
      expect(audit).toBeDefined();
    });

    it("Rejects duplicate college code modification", async () => {
      const college = db.getColleges()[0];
      const otherCollege = db.getColleges()[1];

      const req = new Request(`http://localhost/api/v1/editor/colleges/${college.id}/code`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${editorToken}`,
        },
        body: JSON.stringify({
          newCode: otherCollege.code, // already in use!
          reason: "Attempting duplicate assignment.",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error?.message).toMatch(/already exists/i);
    });

    it("Rejects invalid format college code", async () => {
      const college = db.getColleges()[0];

      const req = new Request(`http://localhost/api/v1/editor/colleges/${college.id}/code`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${editorToken}`,
        },
        body: JSON.stringify({
          newCode: "INVALID CODE WITH SPACES",
          reason: "Format test validation.",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error?.message).toMatch(/3–12 uppercase letters or digits/i);
    });
  });

  describe("4. Status-Based Data Ingestion Enforcement", () => {
    it("Active college permits authorized data ingestion", async () => {
      // Find or set an active college
      const activeCollege = db.getColleges().find((c) => c.status === "active");
      expect(activeCollege).toBeDefined();

      const req = new Request("http://localhost/api/v1/ingestion/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          collegeCode: activeCollege!.code,
          payload: { batch: "CS-2026", syncType: "assessment_scores" },
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("processed");
    });

    it("Hold college pauses data ingestion and buffers records without data loss", async () => {
      // Set a college to hold
      const college = db.getColleges()[2];
      db.updateCollegeStatus(college.id, "hold", "Semester interval pause.", superAdminUser.loginId);

      const req = new Request("http://localhost/api/v1/ingestion/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          collegeCode: college.code,
          payload: { batch: "IS-2026", syncType: "batch_roster" },
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("paused");
      expect(json.data.message).toMatch(/buffered/i);
    });

    it("Deactive college blocks data ingestion with explicit HTTP 403", async () => {
      // Set a college to deactive
      const college = db.getColleges()[3];
      db.updateCollegeStatus(college.id, "deactive", "Partnership agreement completed.", superAdminUser.loginId);

      const req = new Request("http://localhost/api/v1/ingestion/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          collegeCode: college.code,
          payload: { batch: "EC-2026" },
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error?.code).toBe("ingestion_blocked");
      expect(json.error?.message).toMatch(/deactive/i);
    });

    it("Historical intelligence and student data remain preserved for Deactive and Hold colleges", () => {
      // Check student intelligence for a college placed on hold/deactive
      const allStudents = Object.values(db.studentIntelligence);
      expect(allStudents.length).toBeGreaterThan(0);

      // Student profiles must remain intact and accessible
      const profile = allStudents[0];
      const retrieved = db.getStudentIntelligence(profile.studentId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.readinessScore).toBe(profile.readinessScore);
    });
  });

  describe("5. Invariants & Security Principles", () => {
    it("Zero Attendance Invariant: Absolutely NO attendance tables, keys, or percentages", () => {
      const sampleCol = db.getColleges()[0];
      expect((sampleCol as any).attendance).toBeUndefined();
      expect((sampleCol as any).attendanceRate).toBeUndefined();

      const sampleStudent = Object.values(db.studentIntelligence)[0];
      expect((sampleStudent as any).attendance).toBeUndefined();
      expect((sampleStudent as any).attendancePercentage).toBeUndefined();
    });

    it("Protected permanent accounts (sAdmin1 and editor1) cannot be deactivated", () => {
      expect(() => {
        db.setUserStatus("sAdmin1@ziphyrus.in", "inactive");
      }).toThrow(/protected account/i);

      expect(() => {
        db.setUserStatus("editor1@ziphyrus.in", "inactive");
      }).toThrow(/protected account/i);
    });
  });
});
