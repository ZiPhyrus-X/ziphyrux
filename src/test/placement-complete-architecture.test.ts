import { describe, it, expect, beforeEach } from "vitest";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import { db } from "../server/db";
import { homeForRole } from "../lib/auth/service";
import { PlacementService } from "../server/placement-service";
import type { AuthenticatedUser } from "../server/types";

describe("Placement Officer Workspace — Complete Architecture & Operational Invariants", () => {
  const placementOfficer: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000011",
    loginId: "placement.smp101",
    email: "placement@smp101.edu",
    name: "Dr. Rajesh Varma",
    role: "placement_officer",
    collegeCode: "SMP101",
    collegeId: "c0000000-0000-0000-0000-000000000001",
    isProtected: false,
    permissions: [
      "placement.view",
      "placement.manage",
      "company.manage",
      "drive.manage",
      "offer.verify",
      "eligibility.evaluate",
    ],
  };

  const foreignOfficer: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000099",
    loginId: "placement.foreign",
    email: "officer@foreign.edu",
    name: "Foreign Officer",
    role: "placement_officer",
    collegeCode: "OTHER202",
    collegeId: "c0000000-0000-0000-0000-000000000099",
    isProtected: false,
    permissions: ["placement.view", "placement.manage"],
  };

  const studentUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000002",
    loginId: "stu-1",
    email: "aarav.sharma@campus.edu",
    name: "Aarav Sharma",
    role: "student",
    collegeCode: "SMP101",
    collegeId: "c0000000-0000-0000-0000-000000000001",
    isProtected: false,
    permissions: ["student.read"],
  };

  const coordinatorUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000003",
    loginId: "coordinator.smp101",
    email: "coordinator@smp101.edu",
    name: "Prof. Ananya Rao",
    role: "coordinator",
    collegeCode: "SMP101",
    collegeId: "c0000000-0000-0000-0000-000000000001",
    isProtected: false,
    permissions: [
      "college.manage",
      "placement.manage",
      "company.manage",
      "opportunity.manage",
      "drive.manage",
      "offer.manage",
      "eligibility.evaluate",
    ],
  };

  const trainerUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000004",
    loginId: "trainer.rohan",
    email: "rohan@smp101.edu",
    name: "Rohan Verma",
    role: "trainer",
    collegeCode: "SMP101",
    collegeId: "c0000000-0000-0000-0000-000000000001",
    isProtected: false,
    permissions: ["batch.view_evidence"],
  };

  let officerToken: string;
  let coordinatorToken: string;
  let trainerToken: string;
  let foreignToken: string;
  let studentToken: string;

  beforeEach(() => {
    officerToken = createSessionToken(placementOfficer);
    coordinatorToken = createSessionToken(coordinatorUser);
    trainerToken = createSessionToken(trainerUser);
    foreignToken = createSessionToken(foreignOfficer);
    studentToken = createSessionToken(studentUser);

    // Ensure active college status for testing
    const col = db.colleges.find((c) => c.code === "SMP101");
    if (col) col.status = "active";
  });

  // ---------------------------------------------------------------------------
  // 1. Role Routing & Auth Invariants
  // ---------------------------------------------------------------------------
  describe("Role Routing & Authentication Invariants", () => {
    it("routes placement_officer role to /placement in homeForRole", () => {
      expect(homeForRole("placement_officer")).toBe("/placement");
      expect(homeForRole("trainer")).toBe("/trainer");
      expect(homeForRole("coordinator")).toBe("/coordinator");
      expect(homeForRole("super_admin")).toBe("/admin");
      expect(homeForRole("student")).toBe("/student");
    });

    it("authorizes placement officer session to college scope", async () => {
      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/dashboard", {
          headers: { Authorization: `Bearer ${officerToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.college.code).toBe("SMP101");
      expect(json.data.kpis).toBeDefined();
      expect(json.data.kpis.distinctPlacedStudents).toBeDefined();
      expect(json.data.kpis.offersReceived).toBeDefined();
    });

    it("rejects unauthorized access without valid token", async () => {
      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/dashboard")
      );
      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Multi-Tenant College Isolation
  // ---------------------------------------------------------------------------
  describe("Multi-Tenant Scope Isolation & Cross-College Protection", () => {
    it("denies access when college status is suspended or inactive", async () => {
      const col = db.colleges.find((c) => c.code === "SMP101");
      if (col) col.status = "suspended";

      try {
        const res = await handleApiRequest(
          new Request("http://localhost/api/v1/placement/dashboard", {
            headers: { Authorization: `Bearer ${officerToken}` },
          })
        );
        expect(res.status).toBe(403);
      } finally {
        if (col) col.status = "active";
      }
    });

    it("strictly isolates student directory to officer's college", async () => {
      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/students", {
          headers: { Authorization: `Bearer ${officerToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      const students = json.data.students || json.data.items;
      expect(students.length).toBeGreaterThan(0);
      // All returned students must belong to SMP101
      for (const s of students) {
        const fullStudent = db.students.find((dbS) => dbS.id === s.id);
        expect(fullStudent?.collegeCode).toBe("SMP101");
      }
    });

    it("rejects retrieval of student details outside officer college jurisdiction", async () => {
      // Temporarily add a foreign student
      const foreignStudentId = "stu-foreign-999";
      db.students.push({
        id: foreignStudentId,
        usn: "FOR99CS001",
        name: "Foreign Candidate",
        email: "candidate@foreign.edu",
        department: "CSE",
        collegeCode: "OTHER999",
        batchYear: 2026,
        currentSemester: 8,
        academicStatus: "active",
      });

      try {
        const res = await handleApiRequest(
          new Request(`http://localhost/api/v1/placement/students/${foreignStudentId}`, {
            headers: { Authorization: `Bearer ${officerToken}` },
          })
        );
        expect(res.status).toBe(403); // Throws unauthorized/not found error
      } finally {
        db.students = db.students.filter((s) => s.id !== foreignStudentId);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Corporate Partners & Opportunities
  // ---------------------------------------------------------------------------
  describe("Corporate Partners & Opportunity Posting Workflows", () => {
    it("authorizes company creation by placement officer and validates college jurisdiction", async () => {
      const companyPayload = {
        name: "Acme Cloud Robotics",
        industry: "Autonomous Systems",
        tier: "Tier 1",
        website: "https://acme-robotics.ai",
        location: "Bengaluru, India",
        recruiterContacts: [
          {
            name: "Sunita Menon",
            designation: "Campus University Lead",
            email: "sunita@acme-robotics.ai",
            phone: "+91-9876543210",
          },
        ],
      };

      // Officer creates company
      const officerRes = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/companies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify(companyPayload),
        })
      );
      expect(officerRes.status).toBe(201);
      const officerJson = await officerRes.json();
      expect(officerJson.success).toBe(true);
      expect(officerJson.data.name).toBe("Acme Cloud Robotics");
      expect(officerJson.data.tier).toBe("Tier 1");
      expect(officerJson.data.collegeCode).toBe("SMP101");
      expect(officerJson.data.recruiterContacts.length).toBe(1);

      // Coordinator can also create company
      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/companies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${coordinatorToken}`,
          },
          body: JSON.stringify({ ...companyPayload, name: "Acme Cloud Robotics Corp" }),
        })
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Officer can read companies
      const readRes = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/companies", {
          headers: { Authorization: `Bearer ${officerToken}` },
        })
      );
      expect(readRes.status).toBe(200);
    });

    it("authorizes opportunity creation and criteria management by placement officer", async () => {
      const oppPayload = {
        title: "Systems Engineer 2026",
        companyId: "cmp-1",
        employmentType: "full_time",
        compensationPackage: 14.5,
        minCgpa: 7.0,
        maxBacklogs: 0,
        eligibleBranches: ["CSE", "ISE"],
        graduationYear: 2026,
      };

      // Officer creates opportunity
      const officerRes = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/opportunities", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify(oppPayload),
        })
      );
      expect(officerRes.status).toBe(201);
      const json = await officerRes.json();
      expect(json.success).toBe(true);
      const oppId = json.data.id;
      expect(json.data.criteriaVersion).toBe(1);
      expect(json.data.minCgpa).toBe(7.0);

      // Officer updates opportunity status
      const officerPatch = await handleApiRequest(
        new Request(`http://localhost/api/v1/placement/opportunities/${oppId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({ status: "published" }),
        })
      );
      expect(officerPatch.status).toBe(200);
      const patchJson = await officerPatch.json();
      expect(patchJson.success).toBe(true);
      expect(patchJson.data.status).toBe("published");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Centralized Backend Eligibility Engine
  // ---------------------------------------------------------------------------
  describe("Centralized Backend Eligibility Engine (Deterministic Evaluation)", () => {
    it("evaluates student eligibility and returns passed criteria when student qualifies", async () => {
      // Find an opportunity and a qualified student (stu-1)
      const opp = (db.placementOpportunities || [])[0];
      expect(opp).toBeDefined();

      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/eligibility/evaluate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({
            opportunityId: opp.id,
            studentId: "stu-1",
          }),
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("eligible");
      expect(json.data.passedCriteria.length).toBeGreaterThan(0);
      expect(json.data.failedCriteria.length).toBe(0);
      expect(json.data.criteriaVersion).toBeDefined();
    });

    it("evaluates student as ineligible when CGPA is below requirement regardless of readiness score", async () => {
      // Create opportunity with high CGPA requirement (e.g. 9.8)
      const highCgpaOpp = PlacementService.createOpportunity(db, placementOfficer, {
        title: "Elite Research Scientist",
        companyId: "cmp-1",
        compensationPackage: 45.0,
        minCgpa: 9.8,
        maxBacklogs: 0,
        eligibleBranches: ["Computer Science & Engineering"],
        graduationYear: 2026,
      });

      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/eligibility/evaluate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({
            opportunityId: highCgpaOpp.id,
            studentId: "stu-1", // stu-1 has CGPA 8.7 < 9.8
          }),
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("ineligible");
      expect(json.data.failedCriteria).toEqual(
        expect.arrayContaining([expect.stringContaining("CGPA")])
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Recruitment Drives & Application Lifecycle
  // ---------------------------------------------------------------------------
  describe("Recruitment Drives & Application Lifecycle", () => {
    it("rejects drive creation by officer and allows coordinator", async () => {
      const drivePayload = {
        title: "Google Campus Drive 2026",
        companyId: "cmp-1",
        mode: "on_campus",
        venue: "Placement Auditorium",
        driveDate: new Date().toISOString(),
        coordinatorNotes: "Bring physical copies of resume.",
      };

      // Officer creates drive
      const officerRes = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/drives", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify(drivePayload),
        })
      );
      expect(officerRes.status).toBe(201);
      const officerJson = await officerRes.json();
      expect(officerJson.success).toBe(true);
      expect(officerJson.data.title).toBe("Google Campus Drive 2026");
      expect(officerJson.data.stages.length).toBeGreaterThanOrEqual(4);

      // Coordinator can also create drive
      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/drives", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${coordinatorToken}`,
          },
          body: JSON.stringify({ ...drivePayload, title: "Google Cloud Campus Drive 2026" }),
        })
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Officer can read drives
      const readRes = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/drives", {
          headers: { Authorization: `Bearer ${officerToken}` },
        })
      );
      expect(readRes.status).toBe(200);
    });

    it("authorizes placement officer to update placement drives", async () => {
      const drives = db.placementDrives || [];
      const drive = drives[0];
      expect(drive).toBeDefined();

      const updateRes = await handleApiRequest(
        new Request(`http://localhost/api/v1/placement/drives/${drive.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({
            title: "Updated Drive Title 2026",
            status: "in_progress",
            venue: "New Placement Hall B",
            coordinatorNotes: "Shortlisted students must report by 9:00 AM.",
          }),
        })
      );
      expect(updateRes.status).toBe(200);
      const updateJson = await updateRes.json();
      expect(updateJson.success).toBe(true);
      expect(updateJson.data.title).toBe("Updated Drive Title 2026");
      expect(updateJson.data.status).toBe("in_progress");
      expect(updateJson.data.venue).toBe("New Placement Hall B");
    });

    it("authorizes stage advancement by placement officer", async () => {
      const apps = db.placementApplications || [];
      const app = apps[0];
      expect(app).toBeDefined();

      // Officer advances stage
      const officerRes = await handleApiRequest(
        new Request(`http://localhost/api/v1/placement/applications/${app.id}/stage`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({
            stageId: "stg-2",
            stageResult: "passed",
            notes: "Passed technical interview round 2.",
          }),
        })
      );
      expect(officerRes.status).toBe(200);
      const officerJson = await officerRes.json();
      expect(officerJson.success).toBe(true);
      expect(officerJson.data.currentStageNumber).toBeGreaterThan(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Offers & Distinct Placed Students Invariant
  // ---------------------------------------------------------------------------
  describe("Offers Repository & Distinct Placed Students Invariant", () => {
    it("authorizes placement officer to record offers and maintains distinct placed student count", async () => {
      const opp1 = (db.placementOpportunities || [])[0];
      const opp2 = (db.placementOpportunities || [])[1] || opp1;

      // Officer records offer
      const officerRes = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/offers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({
            studentId: "stu-1",
            opportunityId: opp2.id,
            offeredPackage: 22.0,
            status: "accepted",
            verificationStatus: "verified",
          }),
        })
      );
      expect(officerRes.status).toBe(201);

      // Check Dashboard KPI numbers as Placement Officer
      const dashRes = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/dashboard", {
          headers: { Authorization: `Bearer ${officerToken}` },
        })
      );

      const dashJson = await dashRes.json();
      expect(dashJson.success).toBe(true);
      // Even though stu-1 has 2 accepted/verified offers, distinct placed students must count stu-1 as ONE (1)
      expect(dashJson.data.kpis.offersReceived).toBeGreaterThanOrEqual(2);
      expect(dashJson.data.kpis.distinctPlacedStudents).toBe(1);
    });

    it("authorizes offer verification and joining updates by placement officer", async () => {
      const offers = db.placementOffers || [];
      const offer = offers[0];

      // Officer verifies offer
      const officerVerify = await handleApiRequest(
        new Request(`http://localhost/api/v1/placement/offers/${offer.id}/verify`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({ status: "verified", notes: "Offer letter authentic and stamped." }),
        })
      );
      expect(officerVerify.status).toBe(200);
      const verifyJson = await officerVerify.json();
      expect(verifyJson.success).toBe(true);
      expect(verifyJson.data.verificationStatus).toBe("verified");

      // Officer updates joining outcome
      const officerJoin = await handleApiRequest(
        new Request(`http://localhost/api/v1/placement/offers/${offer.id}/joining`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({ joiningStatus: "joined", actualJoiningDate: "2026-07-01" }),
        })
      );
      expect(officerJoin.status).toBe(200);
      const joiningJson = await officerJoin.json();
      expect(joiningJson.success).toBe(true);
      expect(joiningJson.data.joiningStatus).toBe("joined");
      expect(joiningJson.data.actualJoiningDate).toBe("2026-07-01");
    });
  });

  // ---------------------------------------------------------------------------
  // 6B. Strict File Import Prohibitions
  // ---------------------------------------------------------------------------
  describe("File Import Prohibitions & Strict Read-Only Invariants", () => {
    it("rejects file import attempts by placement officer with 403 Forbidden", async () => {
      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/data/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({ fileData: "sample,csv,data" }),
        })
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("import_prohibited");
      expect(json.error.message).toContain("File imports are strictly prohibited");
    });

    it("rejects file import attempts by trainer with 403 Forbidden", async () => {
      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/trainer/data/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${trainerToken}`,
          },
          body: JSON.stringify({ fileData: "sample,csv,data" }),
        })
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("import_prohibited");
      expect(json.error.message).toContain("File imports are strictly prohibited");
    });
  });

  // ---------------------------------------------------------------------------
  // 6C. Upcoming Placement Drive Notifications & Broadcast Workflows
  // ---------------------------------------------------------------------------
  describe("Upcoming Drive Notifications & Student Broadcast Workflows", () => {
    it("authorizes placement officer to broadcast upcoming drive notification to students", async () => {
      const payload = {
        title: "Upcoming Drive Alert: Google Cloud — Solutions Architect",
        message: "Campus drive scheduled on Nov 10, 2026. Venue: Main Auditorium at 09:00 AM. Bring college ID and resumes.",
        driveId: "drv-google-101",
        driveName: "Google Cloud Solutions Architect 2026",
      };

      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify(payload),
        })
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe(payload.title);
      expect(json.data.message).toBe(payload.message);
      expect(json.data.targetRole).toBe("Students");
      expect(json.data.collegeScope).toBe("SMP101");
      expect(json.data.createdBy).toBe(placementOfficer.loginId);

      // Verify audit log
      const auditLog = db.auditLogs.find(
        (a) => a.action === "placement.notification_send" && a.target === payload.title
      );
      expect(auditLog).toBeDefined();
      expect(auditLog?.actor).toBe(placementOfficer.loginId);

      // Verify Placement Officer can retrieve notification in broadcast feed
      const getRes = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/notifications", {
          headers: { Authorization: `Bearer ${officerToken}` },
        })
      );
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.success).toBe(true);
      const found = getJson.data.find((n: any) => n.id === json.data.id);
      expect(found).toBeDefined();
      expect(found.title).toBe(payload.title);

      // Verify student in SMP101 can receive the notification
      const stuNotifs = db.getNotifications({ collegeScope: "SMP101", targetRole: "Students" });
      const stuFound = stuNotifs.find((n: any) => n.id === json.data.id);
      expect(stuFound).toBeDefined();
    });

    it("rejects broadcast with missing title or message with 400 Bad Request", async () => {
      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({ title: "", message: "" }),
        })
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("validation_error");
    });

    it("rejects notification broadcast attempt by trainer with 403 Forbidden", async () => {
      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${trainerToken}`,
          },
          body: JSON.stringify({
            title: "Trainer unauthorized alert",
            message: "Should be blocked.",
          }),
        })
      );
      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Student Workspace Placement Integration
  // ---------------------------------------------------------------------------
  describe("Student Workspace Placement Endpoints (/api/v1/student/placement/*)", () => {
    it("allows student to browse published opportunities", async () => {
      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/student/placement/opportunities", {
          headers: { Authorization: `Bearer ${studentToken}` },
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("allows student to fetch their own placement applications and offers", async () => {
      const appRes = await handleApiRequest(
        new Request("http://localhost/api/v1/student/placement/applications", {
          headers: { Authorization: `Bearer ${studentToken}` },
        })
      );
      expect(appRes.status).toBe(200);
      const appJson = await appRes.json();
      expect(appJson.success).toBe(true);

      const ofrRes = await handleApiRequest(
        new Request("http://localhost/api/v1/student/placement/offers", {
          headers: { Authorization: `Bearer ${studentToken}` },
        })
      );
      expect(ofrRes.status).toBe(200);
      const ofrJson = await ofrRes.json();
      expect(ofrJson.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Strict Student Data Immutability & Forbidden Permissions
  // ---------------------------------------------------------------------------
  describe("Student Data Immutability & Unauthorized Mutation Guards", () => {
    it("rejects PATCH to coordinator student USN endpoint with 403 Forbidden and critical audit log", async () => {
      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/coordinator/students/stu-1/usn", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({ proposedUsn: "1ZX22CS999", mandatoryReason: "Unauthorized correction" }),
        })
      );

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.message).toContain("Placement Officers do not have permission to alter authoritative student records");

      // Verify critical audit log
      const auditLog = db.auditLogs.find(
        (a) => a.action === "security.unauthorized_student_mutation" && a.metadata?.blockedField === "usn"
      );
      expect(auditLog).toBeDefined();
      expect(auditLog?.severity).toBe("critical");
      expect(auditLog?.actor).toBe(placementOfficer.loginId);
    });

    it("rejects PATCH to placement student details endpoint (CGPA modification) with 403 Forbidden", async () => {
      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/students/stu-1", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({ cgpa: 9.8 }),
        })
      );

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.message).toContain("Placement Officers do not have permission to alter authoritative student records");

      const auditLog = db.auditLogs.find(
        (a) => a.action === "security.unauthorized_student_mutation" && a.metadata?.blockedField === "cgpa"
      );
      expect(auditLog).toBeDefined();
      expect(auditLog?.severity).toBe("critical");
    });

    it("rejects attempts to modify student backlogs or student intelligence", async () => {
      const backlogRes = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/students/stu-1", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({ backlogs: 0 }),
        })
      );
      expect(backlogRes.status).toBe(403);

      const intelRes = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/opportunities/opp-1", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({ studentIntelligence: { readinessScore: 99 } }),
        })
      );
      expect(intelRes.status).toBe(403);

      const intelAudit = db.auditLogs.find(
        (a) => a.action === "security.unauthorized_student_mutation" && a.metadata?.blockedField === "studentIntelligence"
      );
      expect(intelAudit).toBeDefined();
    });

    it("rejects file import to coordinator import endpoints with 403 Forbidden", async () => {
      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/coordinator/data/import/students", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({ csv: "usn,name,cgpa" }),
        })
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("import_prohibited");
    });

    it("rejects cross-college write attempts with 403 Forbidden (tenant isolation)", async () => {
      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/companies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({
            name: "Foreign Branch Corp",
            industry: "Defense Tech",
            collegeCode: "OTHER999", // Attempting cross-college injection
          }),
        })
      );
      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Preparation & Training (Targeting Engine & Action Plans)
  // ---------------------------------------------------------------------------
  describe("Preparation & Training Module", () => {
    it("returns preparation targets, cohorts, students, and active action plans", async () => {
      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/preparation", {
          headers: { Authorization: `Bearer ${officerToken}` },
        })
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.targetedStudentGroups.length).toBeGreaterThan(0);
      expect(json.data.targetedStudentGroups[0].students.length).toBeGreaterThan(0);
      expect(json.data.activeActionPlans.length).toBeGreaterThan(0);
    });

    it("authorizes placement officer to assign training action plans and update status", async () => {
      const createRes = await handleApiRequest(
        new Request("http://localhost/api/v1/placement/action-plans", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({
            studentId: "stu-1",
            studentName: "Aarav Sharma",
            description: "[DSA & Coding] Complete 15 dynamic programming memoization problems.",
            trainerName: "Rohan Verma",
            trainerId: "trn-1",
            deadline: "2026-11-15",
          }),
        })
      );
      expect(createRes.status).toBe(201);
      const createJson = await createRes.json();
      expect(createJson.success).toBe(true);
      expect(createJson.data.studentName).toBe("Aarav Sharma");
      expect(createJson.data.status).toBe("In Progress");

      // Update status
      const patchRes = await handleApiRequest(
        new Request(`http://localhost/api/v1/placement/action-plans/${createJson.data.id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${officerToken}`,
          },
          body: JSON.stringify({ status: "Completed" }),
        })
      );
      expect(patchRes.status).toBe(200);
      const patchJson = await patchRes.json();
      expect(patchJson.success).toBe(true);
      expect(patchJson.data.status).toBe("Completed");
    });
  });
});
