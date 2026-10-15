import { describe, it, expect, beforeEach } from "vitest";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import { db } from "../server/db";
import type { AuthenticatedUser } from "../server/types";

describe("Coordinator Workspace — Full Architecture, Security & Invariants Test Suite", () => {
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
      "override.manage",
    ],
  };

  let coordinatorToken: string;
  let editorToken: string;

  beforeEach(() => {
    coordinatorToken = createSessionToken(coordinatorUser);
    editorToken = createSessionToken(editorUser);

    // Reset college status to active for clean tests
    const col = db.colleges.find((c) => c.code === "SMP101");
    if (col) col.status = "active";
  });

  // ---------------------------------------------------------------------------
  // 1. Single Active Coordinator Invariant
  // ---------------------------------------------------------------------------
  it("enforces strict invariant: exactly one active coordinator per college", () => {
    // SMP101 already has active coordinator
    expect(() =>
      db.createCoordinatorUser(
        {
          name: "Duplicate Coordinator",
          email: "duplicate.coord@smp101.edu",
          collegeCode: "SMP101",
        },
        editorUser.loginId
      )
    ).toThrow(/already has an active Coordinator account/i);
  });

  // ---------------------------------------------------------------------------
  // 2. Strict College Scope Isolation & Defense in Depth
  // ---------------------------------------------------------------------------
  it("strictly prevents cross-college access and audits violation attempts", async () => {
    const req = new Request("http://localhost:3000/api/v1/coordinator/students?collegeCode=OXF202", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });

    const res = await handleApiRequest(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.message).toMatch(/cross-college/i);

    // Verify audit log
    const auditLogs = db.getAuditLogs();
    const violation = auditLogs.find((l) => l.action === "security.cross_college_violation");
    expect(violation).toBeDefined();
    expect(violation?.target).toBe("OXF202");
  });

  it("resolves college jurisdiction from trusted identity data on /me", async () => {
    const req = new Request("http://localhost:3000/api/v1/coordinator/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });

    const res = await handleApiRequest(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.collegeCode).toBe("SMP101");
    expect(body.data.user.role).toBe("coordinator");
  });

  // ---------------------------------------------------------------------------
  // 3. College Lifecycle Enforcement (Deactive & Hold Policies)
  // ---------------------------------------------------------------------------
  it("blocks all coordinator access when college is deactivated", async () => {
    const col = db.colleges.find((c) => c.code === "SMP101")!;
    col.status = "deactive";

    const req = new Request("http://localhost:3000/api/v1/coordinator/overview", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });

    const res = await handleApiRequest(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.message).toMatch(/College is deactivated/i);
  });

  it("permits reads but blocks mutations when college is on hold", async () => {
    const col = db.colleges.find((c) => c.code === "SMP101")!;
    col.status = "hold";

    // 1. Read is permitted
    const readReq = new Request("http://localhost:3000/api/v1/coordinator/overview", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });
    const readRes = await handleApiRequest(readReq);
    expect(readRes.status).toBe(200);

    // 2. Mutation is blocked
    const mutationReq = new Request("http://localhost:3000/api/v1/coordinator/batches", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Test Batch",
        department: "Computer Science & Engineering",
        year: "3rd Year",
        section: "Section A",
      }),
    });
    const mutationRes = await handleApiRequest(mutationReq);
    expect(mutationRes.status).toBe(403);
    const body = await mutationRes.json();
    expect(body.error.message).toMatch(/College is currently on hold/i);
  });

  // ---------------------------------------------------------------------------
  // 4. Feature Flag Controlled Modules (Training & Courses Disabled by Default)
  // ---------------------------------------------------------------------------
  it("blocks Training & Courses module when feature flag is disabled", async () => {
    // Ensure flags are off
    db.setFeatureFlag("training.courses", false);
    db.setFeatureFlag("training_courses", false);
    db.setFeatureFlag("learning_content", false);

    const req = new Request("http://localhost:3000/api/v1/coordinator/training", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });

    const res = await handleApiRequest(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.message).toMatch(/Training & Courses module is currently disabled/i);
  });

  it("permits Training & Courses module when feature flag is enabled", async () => {
    db.setFeatureFlag("training.courses", true);

    const req = new Request("http://localhost:3000/api/v1/coordinator/training", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });

    const res = await handleApiRequest(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    // Cleanup
    db.setFeatureFlag("training.courses", false);
  });

  // ---------------------------------------------------------------------------
  // 5. Intelligence Layer C Reporting & Authoritative Score Immutability
  // ---------------------------------------------------------------------------
  it("consumes Intelligence Layer C for performance and student profile", async () => {
    // 1. Performance endpoint
    const perfReq = new Request("http://localhost:3000/api/v1/coordinator/performance", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });
    const perfRes = await handleApiRequest(perfReq);
    expect(perfRes.status).toBe(200);
    const perfBody = await perfRes.json();
    expect(perfBody.success).toBe(true);
    expect(perfBody.data.averageReadiness).toBeGreaterThan(0);
    expect(perfBody.data.readinessBands).toBeDefined();

    // 2. Student Details endpoint
    const students = db.getStudents("SMP101");
    expect(students.length).toBeGreaterThan(0);
    const firstStudent = students[0];

    const detailReq = new Request(`http://localhost:3000/api/v1/coordinator/students/${firstStudent.id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });
    const detailRes = await handleApiRequest(detailReq);
    expect(detailRes.status).toBe(200);
    const detailBody = await detailRes.json();
    expect(detailBody.success).toBe(true);
    expect(detailBody.data.student.id).toBe(firstStudent.id);
    expect(detailBody.data.metrics.readinessScore).toBeDefined();
    expect(detailBody.data.metrics.skills).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // 6. Zero Attendance Law
  // ---------------------------------------------------------------------------
  it("strictly enforces zero attendance tracking across the database and responses", () => {
    const overview = db.getCoordinatorOverview("SMP101");
    expect((overview as any).attendancePercentage).toBeUndefined();
    expect((overview as any).attendanceRate).toBeUndefined();
    expect((overview as any).attendanceCount).toBeUndefined();

    // Check sessions
    const sessions = db.getSessions("SMP101");
    sessions.forEach((s) => {
      expect((s as any).attendanceRoster).toBeUndefined();
      expect((s as any).presentStudents).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. 12-Step Bulk Student Import Pipeline
  // ---------------------------------------------------------------------------
  it("validates and rejects invalid rows in the 12-step pipeline", async () => {
    const invalidBatch = [
      {
        name: "", // Step 1: missing name
        usn: "INVALID_LONG_USN_THAT_EXCEEDS_NORMAL_BOUNDS_1234567890", // Step 2: format
        email: "notanemail", // Step 3: syntax
        department: "Nonexistent Department", // Step 9: academic structure check
      },
    ];

    const req = new Request("http://localhost:3000/api/v1/coordinator/data/import/validate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filename: "bad_roster.csv", rows: invalidBatch }),
    });

    const res = await handleApiRequest(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.validRows).toBe(0);
    expect(body.data.rejectedRows).toBe(1);
    expect(body.data.errors.length).toBeGreaterThan(0);
  });

  it("completes full 12-step validation and commits valid rows to student roster", async () => {
    const uniqueNum = Math.floor(1000 + Math.random() * 9000);
    const validBatch = [
      {
        name: `Candidate ${uniqueNum}`,
        usn: `1SI26CS${uniqueNum}`,
        email: `candidate.${uniqueNum}@smp101.edu`,
        department: "Computer Science & Engineering",
        program: "B.Tech",
        year: "3rd Year",
        semester: "Semester 5",
        section: "Section A",
      },
    ];

    // 1. Validate
    const valReq = new Request("http://localhost:3000/api/v1/coordinator/data/import/validate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filename: "good_roster.csv", rows: validBatch }),
    });
    const valRes = await handleApiRequest(valReq);
    expect(valRes.status).toBe(200);
    const valBody = await valRes.json();
    expect(valBody.data.validRows).toBe(1);
    expect(valBody.data.status).toBe("preview");

    // 2. Confirm Commit
    const confirmReq = new Request("http://localhost:3000/api/v1/coordinator/data/import/confirm", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ importId: valBody.data.id }),
    });
    const confirmRes = await handleApiRequest(confirmReq);
    expect(confirmRes.status).toBe(200);
    const confirmBody = await confirmRes.json();
    expect(confirmBody.data.confirmedCount).toBe(1);
    expect(confirmBody.data.importRecord.status).toBe("committed");

    // 3. Verify student exists in db
    const newlyCreated = db.getStudents("SMP101").find((s) => s.usn === `1SI26CS${uniqueNum}`);
    expect(newlyCreated).toBeDefined();
    expect(newlyCreated?.name).toBe(`Candidate ${uniqueNum}`);
  });

  // ---------------------------------------------------------------------------
  // 8. Placement Requirements & Eligibility Matching
  // ---------------------------------------------------------------------------
  it("creates placement requirement and computes matched student count", async () => {
    const createReq = new Request("http://localhost:3000/api/v1/coordinator/placement-requirements", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyName: "Google Cloud",
        roleTitle: "Cloud Solutions Architect Intern",
        minCgpa: 8.0,
        eligibleBranches: ["Computer Science & Engineering"],
        requiredSkills: ["Cloud", "Distributed Systems", "Python"],
        deadline: "2026-12-15",
      }),
    });

    const createRes = await handleApiRequest(createReq);
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    expect(createBody.data.companyName).toBe("Google Cloud");

    // Fetch requirements list
    const listReq = new Request("http://localhost:3000/api/v1/coordinator/placement-requirements", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });
    const listRes = await handleApiRequest(listReq);
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    const createdItem = listBody.data.find((r: any) => r.companyName === "Google Cloud");
    expect(createdItem).toBeDefined();
    expect(typeof createdItem.matchedStudentsCount).toBe("number");
  });

  // ---------------------------------------------------------------------------
  // 9. Operational Reports & CSV Generation
  // ---------------------------------------------------------------------------
  it("generates structured CSV report and logs audit event", async () => {
    const exportReq = new Request("http://localhost:3000/api/v1/coordinator/reports/export", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reportType: "readiness_summary",
        format: "csv",
      }),
    });

    const exportRes = await handleApiRequest(exportReq);
    expect(exportRes.status).toBe(200);
    const exportBody = await exportRes.json();
    expect(exportBody.data.format).toBe("csv");
    expect(exportBody.data.csvContent).toContain("Readiness Score");
    expect(exportBody.data.recordsCount).toBeGreaterThan(0);

    const logs = db.getAuditLogs();
    const exportLog = logs.find((l) => l.action === "coordinator.report_export");
    expect(exportLog).toBeDefined();
    expect(exportLog?.target).toBe("readiness_summary");
  });

  // ---------------------------------------------------------------------------
  // 10. College Settings
  // ---------------------------------------------------------------------------
  it("retrieves and updates campus operational settings", async () => {
    const patchReq = new Request("http://localhost:3000/api/v1/coordinator/settings", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sectionDefaults: {
          maxStudentsPerSection: 75,
          defaultAcademicYear: "2026-2027",
        },
      }),
    });

    const patchRes = await handleApiRequest(patchReq);
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.data.sectionDefaults.maxStudentsPerSection).toBe(75);

    const getReq = new Request("http://localhost:3000/api/v1/coordinator/settings", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });
    const getRes = await handleApiRequest(getReq);
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.data.sectionDefaults.maxStudentsPerSection).toBe(75);
  });

  // ---------------------------------------------------------------------------
  // 11. Campus Demo Students Roster & Intelligence Integrity (20 Students)
  // ---------------------------------------------------------------------------
  it("provides 20 realistic demo students for coordinator campus SMP101 with intelligence profiles and zero attendance", async () => {
    const req = new Request("http://localhost:3000/api/v1/coordinator/students", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });

    const res = await handleApiRequest(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(20);

    const seededDemoStudents = body.data.filter((stu: any) => stu.usn.startsWith("1MS"));
    expect(seededDemoStudents).toHaveLength(20);

    // Verify all 20 demo students belong strictly to SMP101
    seededDemoStudents.forEach((stu: any) => {
      expect(stu.collegeCode).toBe("SMP101");
      expect(stu.name).toBeDefined();
      expect(stu.usn).toMatch(/^1MS/);
      expect(stu.department).toBeDefined();
      expect(stu.batch).toBeDefined();

      // Zero Attendance Law
      expect(stu.attendance).toBeUndefined();
      expect(stu.attendanceRate).toBeUndefined();
      expect(stu.attendancePercentage).toBeUndefined();

      // Verify matching intelligence profile
      const intel = db.studentIntelligence[stu.id];
      expect(intel).toBeDefined();
      expect(intel.readinessScore).toBeGreaterThanOrEqual(0);
      expect(intel.skills).toBeDefined();
      expect(intel.coding).toBeDefined();
    });

    // Check Overview student count is at least 20
    const overviewReq = new Request("http://localhost:3000/api/v1/coordinator/overview", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });
    const overviewRes = await handleApiRequest(overviewReq);
    const overviewBody = await overviewRes.json();
    expect(overviewBody.data.studentsCount).toBeGreaterThanOrEqual(20);
  });

  // ---------------------------------------------------------------------------
  // 12. Negative Security & Privilege Boundaries
  // ---------------------------------------------------------------------------
  it("strictly prevents Coordinator from performing Super Admin and Editor actions", async () => {
    // 1. Cannot create colleges (Super Admin only)
    const collegeReq = new Request("http://localhost:3000/api/v1/admin/colleges", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Rogue College", code: "ROG999", email: "rogue@col.in" }),
    });
    const collegeRes = await handleApiRequest(collegeReq);
    expect(collegeRes.status).toBe(403);

    // 2. Cannot create visible-value overrides (Editor only)
    const overrideReq = new Request("http://localhost:3000/api/v1/editor/overrides", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entityType: "student",
        entityId: "stu-1",
        fieldName: "readiness",
        visibleValue: "99",
        mandatoryReason: "Unauthorized bump",
      }),
    });
    const overrideRes = await handleApiRequest(overrideReq);
    expect(overrideRes.status).toBe(403);

    // 3. Cannot toggle global feature availability (Editor only)
    const flagReq = new Request("http://localhost:3000/api/v1/editor/features/training.courses/toggle", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
      },
    });
    const flagRes = await handleApiRequest(flagReq);
    expect(flagRes.status).toBe(403);
  });

  // ---------------------------------------------------------------------------
  // 13. Coordinator Classes & Sections Management (CRUD & College Isolation)
  // ---------------------------------------------------------------------------
  it("allows Coordinator to list, create, and delete classes within authorized college scope", async () => {
    // 1. List classes for SMP101
    const listReq = new Request("http://localhost:3000/api/v1/coordinator/classes", {
      method: "GET",
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    const listRes = await handleApiRequest(listReq);
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.length).toBeGreaterThan(0);
    expect(listBody.data.every((c: any) => c.collegeCode === "SMP101")).toBe(true);

    // 2. Create a new class & section
    const createReq = new Request("http://localhost:3000/api/v1/coordinator/classes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${coordinatorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        branch: "Artificial Intelligence & Data Science",
        academicYear: "2026-2027",
        semester: "Semester 5",
        section: "Section C",
        studentsCount: 48,
        trainersCount: 2,
      }),
    });
    const createRes = await handleApiRequest(createReq);
    expect(createRes.status).toBe(200);
    const createBody = await createRes.json();
    expect(createBody.data.id).toBeDefined();
    expect(createBody.data.branch).toBe("Artificial Intelligence & Data Science");
    expect(createBody.data.section).toBe("Section C");
    expect(createBody.data.collegeCode).toBe("SMP101");

    // 3. Delete the created class
    const deleteReq = new Request(`http://localhost:3000/api/v1/coordinator/classes/${createBody.data.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    const deleteRes = await handleApiRequest(deleteReq);
    expect(deleteRes.status).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.success).toBe(true);
  });
});
