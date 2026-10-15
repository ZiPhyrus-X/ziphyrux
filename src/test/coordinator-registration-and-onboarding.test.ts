import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../server/db";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import type { AuthenticatedUser } from "../server/types";

describe("Coordinator Student Registration Links & 5-Step Onboarding Architecture", () => {
  const coordinatorSMP101: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000003",
    loginId: "coordinator.smp101",
    email: "coord@smp101.edu",
    name: "Asha Sharma",
    role: "coordinator",
    collegeId: "c0000000-0000-0000-0000-000000000001",
    collegeCode: "SMP101",
    isProtected: false,
    permissions: ["coordinator.*"],
  };

  const coordinatorSMP105: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000006",
    loginId: "coordinator.smp105",
    email: "coord@smp105.edu",
    name: "Rajesh Rao",
    role: "coordinator",
    collegeId: "c0000000-0000-0000-0000-000000000005",
    collegeCode: "SMP105",
    isProtected: false,
    permissions: ["coordinator.*"],
  };

  let smp101Token: string;
  let smp105Token: string;

  beforeEach(() => {
    smp101Token = createSessionToken(coordinatorSMP101);
    smp105Token = createSessionToken(coordinatorSMP105);
  });

  // =========================================================================
  // 1. AUTHORITATIVE TOKEN STORAGE & DYNAMIC ORIGIN RESOLUTION
  // =========================================================================
  describe("1. Authoritative Token Storage & Dynamic Origin", () => {
    it("generates 1-hour expiring registration link with dynamic origin and audit log", async () => {
      const customOrigin = "https://campus-portal.ziphyrus.edu";
      const req = new Request("http://localhost/api/v1/coordinator/registration-links", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${smp101Token}`,
          "Content-Type": "application/json",
          Origin: customOrigin,
        },
        body: JSON.stringify({
          metadata: { department: "Computer Science & Engineering", batch: "Batch 2026-CS-A" },
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);

      const link = json.data;
      expect(link.token).toMatch(/^reg_\d+_[a-z0-9]+$/);
      expect(link.url).toContain(customOrigin);
      expect(link.url).toContain(`/register?college=SMP101&token=${encodeURIComponent(link.token)}`);

      // Verify strict 1-hour expiration (between 58 and 61 minutes)
      const expiryTime = new Date(link.expiresAt).getTime();
      const diffMinutes = (expiryTime - Date.now()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThan(58);
      expect(diffMinutes).toBeLessThanOrEqual(61);

      // Verify token persisted authoritatively in db.registrationTokens
      const dbRecord = db.registrationTokens.find((t) => t.token === link.token);
      expect(dbRecord).toBeDefined();
      expect(dbRecord?.collegeCode).toBe("SMP101");
      expect(dbRecord?.status).toBe("active");
      expect(dbRecord?.metadata?.department).toBe("Computer Science & Engineering");

      // Verify audit log
      const audit = db.auditLogs.find(
        (a) => a.action === "registration.link_generated" && a.metadata?.token === link.token
      );
      expect(audit).toBeDefined();
      expect(audit?.target).toBe("SMP101");
    });

    it("respects fallback host when origin header is absent", async () => {
      const req = new Request("http://localhost/api/v1/coordinator/registration-links", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${smp101Token}`,
          Host: "test.ziphyrus.app",
        },
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.url).toContain("test.ziphyrus.app/register");
    });
  });

  // =========================================================================
  // 2. TOKEN LIFECYCLE & COLLEGE ISOLATION
  // =========================================================================
  describe("2. Token Lifecycle & College Isolation", () => {
    it("lists registration tokens strictly scoped to the coordinator's college", async () => {
      // Coordinator SMP101 fetches tokens
      const req101 = new Request("http://localhost/api/v1/coordinator/registration-links", {
        method: "GET",
        headers: { Authorization: `Bearer ${smp101Token}` },
      });
      const res101 = await handleApiRequest(req101);
      expect(res101.status).toBe(200);
      const list101 = (await res101.json()).data;
      expect(list101.length).toBeGreaterThan(0);
      list101.forEach((t: any) => {
        expect(t.collegeCode).toBe("SMP101");
      });

      // Coordinator SMP105 fetches tokens
      const req105 = new Request("http://localhost/api/v1/coordinator/registration-links", {
        method: "GET",
        headers: { Authorization: `Bearer ${smp105Token}` },
      });
      const res105 = await handleApiRequest(req105);
      expect(res105.status).toBe(200);
      const list105 = (await res105.json()).data;
      // Cannot see SMP101 tokens
      list105.forEach((t: any) => {
        expect(t.collegeCode).toBe("SMP105");
      });
    });

    it("allows coordinator to revoke an active registration token", async () => {
      // 1. Create a fresh token
      const link = db.generateRegistrationLink("SMP101", "coordinator.smp101");
      expect(link.status).toBe("active");

      // 2. Revoke the token
      const revokeReq = new Request(`http://localhost/api/v1/coordinator/registration-links/${link.id}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${smp101Token}` },
      });
      const revokeRes = await handleApiRequest(revokeReq);
      expect(revokeRes.status).toBe(200);
      const revoked = (await revokeRes.json()).data;
      expect(revoked.status).toBe("revoked");

      // Verify in db
      const inDb = db.registrationTokens.find((t) => t.id === link.id);
      expect(inDb?.status).toBe("revoked");

      // Verify audit log
      const audit = db.auditLogs.find(
        (a) => a.action === "registration.link_revoked" && a.metadata?.tokenId === link.id
      );
      expect(audit).toBeDefined();
    });

    it("blocks cross-college revocation (college isolation enforced)", async () => {
      // Create token for SMP101
      const link = db.generateRegistrationLink("SMP101", "coordinator.smp101");

      // Coordinator SMP105 attempts to revoke SMP101's token
      const crossReq = new Request(`http://localhost/api/v1/coordinator/registration-links/${link.id}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${smp105Token}` },
      });
      const crossRes = await handleApiRequest(crossReq);
      expect(crossRes.status).toBe(400);
      const json = await crossRes.json();
      expect(json.error.message).toContain("Forbidden");
    });
  });

  // =========================================================================
  // 3. PUBLIC TOKEN VERIFICATION ENDPOINT
  // =========================================================================
  describe("3. Public Token Verification (/api/v1/registration/verify)", () => {
    it("successfully verifies an active token and returns college metadata", async () => {
      const link = db.generateRegistrationLink("SMP101", "coordinator.smp101");

      const req = new Request(`http://localhost/api/v1/registration/verify?token=${link.token}&college=SMP101`, {
        method: "GET",
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.valid).toBe(true);
      expect(json.data.college.code).toBe("SMP101");
      expect(json.data.college.name).toContain("Sample Institute of Technology");
    });

    it("rejects non-existent token with invalid_token error", async () => {
      const req = new Request("http://localhost/api/v1/registration/verify?token=reg_nonexistent_123", {
        method: "GET",
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("invalid_token");
      expect(json.error.message).toContain("does not exist");
    });

    it("rejects token when college query parameter mismatches designated college", async () => {
      const link = db.generateRegistrationLink("SMP101", "coordinator.smp101");

      const req = new Request(`http://localhost/api/v1/registration/verify?token=${link.token}&college=SMP105`, {
        method: "GET",
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.message).toContain("designated for campus SMP101, not SMP105");
    });

    it("rejects revoked tokens", async () => {
      const link = db.generateRegistrationLink("SMP101", "coordinator.smp101");
      db.revokeRegistrationToken(link.id, "SMP101", "coordinator.smp101");

      const req = new Request(`http://localhost/api/v1/registration/verify?token=${link.token}`, {
        method: "GET",
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.message).toContain("revoked");
    });

    it("rejects expired tokens", async () => {
      const link = db.generateRegistrationLink("SMP101", "coordinator.smp101");
      // Force token to be expired
      const tokenRecord = db.registrationTokens.find((t) => t.id === link.id);
      tokenRecord!.expiresAt = new Date(Date.now() - 1000 * 60).toISOString();

      const req = new Request(`http://localhost/api/v1/registration/verify?token=${link.token}`, {
        method: "GET",
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.message).toContain("expired");
    });
  });

  // =========================================================================
  // 4. PASSWORDLESS STUDENT ONBOARDING, SYSTEM-GENERATED PASSWORD & CROSS-ROLE SEARCH
  // =========================================================================
  describe("4. Passwordless Student Onboarding, System-Generated Password & Cross-Role Search", () => {
    it("completes registration without password, generates Ziphyrus-x+last3, enables immediate login with fresh start, and displays to all roles", async () => {
      const link = db.generateRegistrationLink("SMP101", "coordinator.smp101");

      const randomSuffix = Math.floor(100 + Math.random() * 899);
      const studentUsn = `1MS24CS${randomSuffix}`;
      const last3 = studentUsn.slice(-3);
      const expectedPassword = `Ziphyrus-x${last3}`;

      // Invariant: Registration form NEVER asks for a password
      const studentPayload = {
        name: "Varun Kulkarni",
        email: `varun.${Date.now()}.${randomSuffix}@smp101.edu`,
        phone: "+91 99887 76655",
        department: "Computer Science & Engineering",
        degreeProgram: "B.Tech",
        section: "Section A",
        year: "1st Year",
        usn: studentUsn,
      };

      const completeReq = new Request("http://localhost/api/v1/registration/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: link.token, student: studentPayload }),
      });

      const res = await handleApiRequest(completeReq);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);

      const createdStudent = json.data.student;
      expect(createdStudent.name).toBe("Varun Kulkarni");
      expect(createdStudent.usn).toBe(studentUsn);
      expect(createdStudent.collegeCode).toBe("SMP101");

      // Verify system-generated password formula: "Ziphyrus-x" + last 3 characters of USN
      expect(json.data.generatedPassword).toBe(expectedPassword);
      expect(json.data.loginId).toBe(studentUsn);

      // Verify token is now CONSUMED
      const consumedToken = json.data.token;
      expect(consumedToken.status).toBe("consumed");
      expect(consumedToken.consumedByStudentId).toBe(createdStudent.id);
      expect(consumedToken.consumedByStudentName).toBe("Varun Kulkarni");
      expect(consumedToken.consumedAt).toBeDefined();

      // Verify authoritative fresh start in db: 0 readiness score, 0 coding problems solved
      const dbStudent = db.students.find((s) => s.usn === studentUsn);
      expect(dbStudent).toBeDefined();
      expect(dbStudent?.collegeCode).toBe("SMP101");

      const studentIntel = db.studentIntelligence[dbStudent!.id];
      expect(studentIntel).toBeDefined();
      expect(studentIntel.readinessScore).toBe(0);
      expect(studentIntel.coding.problemsSolved).toBe(0);
      expect(studentIntel.assessmentHistory.length).toBe(0);

      // Verify user identity account was created with loginId = USN
      const dbUser = db.users.find((u) => u.loginId === studentUsn);
      expect(dbUser).toBeDefined();
      expect(dbUser?.role).toBe("student");
      expect(dbUser?.college).toBe("SMP101");

      // -----------------------------------------------------------------------
      // IMMEDIATE STUDENT LOGIN WITH GENERATED PASSWORD
      // -----------------------------------------------------------------------
      // 1. Wrong password attempt fails
      const failedLoginReq = new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: studentUsn, password: "WrongPassword999" }),
      });
      const failedLoginRes = await handleApiRequest(failedLoginReq);
      expect(failedLoginRes.status).toBe(401);

      // 2. Immediate login with system-generated password succeeds
      const loginReq = new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: studentUsn, password: expectedPassword }),
      });
      const loginRes = await handleApiRequest(loginReq);
      expect(loginRes.status).toBe(200);
      const loginJson = await loginRes.json();
      expect(loginJson.success).toBe(true);
      expect(loginJson.data.user.role).toBe("student");
      expect(loginJson.data.user.loginId).toBe(studentUsn);
      expect(loginJson.data.token).toBeDefined();

      // Student views dashboard with fresh start
      const studentSessionToken = loginJson.data.token;
      const dashReq = new Request("http://localhost/api/v1/student/dashboard", {
        method: "GET",
        headers: { Authorization: `Bearer ${studentSessionToken}` },
      });
      const dashRes = await handleApiRequest(dashReq);
      expect(dashRes.status).toBe(200);
      const dashJson = await dashRes.json();
      expect(dashJson.data.student.stats.readinessScore).toBe(0);
      expect(dashJson.data.student.stats.solvedProblems).toBe(0);
      expect(dashJson.data.metrics.readinessScore).toBe(0);
      expect(dashJson.data.metrics.problemsSolved).toBe(0);

      // -----------------------------------------------------------------------
      // CROSS-ROLE VISIBILITY & SEARCH
      // Afterwards, if placement officer / trainer / coordinator / editor / super admin
      // search for that particular student, they can see the desired data.
      // -----------------------------------------------------------------------
      // A. Super Admin search:
      const adminUsers = db.getUsers({ search: studentUsn });
      expect(adminUsers.length).toBeGreaterThan(0);
      expect(adminUsers[0].loginId).toBe(studentUsn);
      expect(adminUsers[0].role).toBe("student");

      // B. Coordinator search:
      const coordStudents = db.getStudents("SMP101", { search: studentUsn });
      expect(coordStudents.length).toBeGreaterThan(0);
      expect(coordStudents[0].usn).toBe(studentUsn);
      expect(coordStudents[0].department).toBe("Computer Science & Engineering");

      // C. Editor cascading option search:
      const editorOptions = db.getAcademicOptions("SMP101");
      const editorStudent = editorOptions.students.find((s) => s.usn === studentUsn);
      expect(editorStudent).toBeDefined();
      expect(editorStudent?.name).toBe("Varun Kulkarni");

      // D. Placement Officer / Trainer Search:
      const multiRoleSearch = db.searchStudents({ q: studentUsn });
      expect(multiRoleSearch.length).toBeGreaterThan(0);
      expect(multiRoleSearch[0].usn).toBe(studentUsn);
      expect(multiRoleSearch[0].readinessScore).toBe(0);
      expect(multiRoleSearch[0].problemsSolved).toBe(0);
      expect(multiRoleSearch[0].phone).toBe("+91 99887 76655");
    });

    it("prevents single-use token replay: cannot reuse consumed token", async () => {
      const link = db.generateRegistrationLink("SMP101", "coordinator.smp101");

      const studentPayload1 = {
        name: "First Student",
        email: `first.${Date.now()}.${Math.random().toString(36).substring(2, 7)}@smp101.edu`,
        department: "Computer Science & Engineering",
        degreeProgram: "B.Tech",
        section: "Section A",
        year: "1st Year",
        usn: `1MS24CS${Math.floor(10000 + Math.random() * 90000)}`,
      };

      // 1. Consume token
      const firstRes = await handleApiRequest(
        new Request("http://localhost/api/v1/registration/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: link.token, student: studentPayload1 }),
        })
      );
      expect(firstRes.status).toBe(201);

      // 2. Second student attempts to reuse the same token
      const studentPayload2 = {
        name: "Second Student",
        email: `second.${Date.now()}.${Math.random().toString(36).substring(2, 7)}@smp101.edu`,
        department: "Computer Science & Engineering",
        degreeProgram: "B.Tech",
        section: "Section B",
        year: "1st Year",
        usn: `1MS24CS${Math.floor(10000 + Math.random() * 90000)}`,
      };

      const replayRes = await handleApiRequest(
        new Request("http://localhost/api/v1/registration/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: link.token, student: studentPayload2 }),
        })
      );

      expect(replayRes.status).toBe(400);
      const json = await replayRes.json();
      expect(json.error.message).toContain("already been used");
    });

    it("rejects registration with duplicate USN within institution", async () => {
      const link = db.generateRegistrationLink("SMP101", "coordinator.smp101");

      // Aarav Sharma (stu-1) has USN "1MS22CS001" in SMP101
      const dupPayload = {
        name: "Impostor Student",
        email: `impostor.${Date.now()}@smp101.edu`,
        department: "Computer Science & Engineering",
        degreeProgram: "B.Tech",
        section: "Section A",
        year: "1st Year",
        usn: "1MS22CS001", // Duplicate USN
      };

      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/registration/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: link.token, student: dupPayload }),
        })
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.message).toContain("already registered in campus records");
    });

    it("rejects registration with duplicate email across platform", async () => {
      const link = db.generateRegistrationLink("SMP101", "coordinator.smp101");

      // Aarav Sharma has email "aarav@smp101.edu"
      const dupEmailPayload = {
        name: "Duplicate Email Student",
        email: "aarav@smp101.edu", // Duplicate email
        department: "Computer Science & Engineering",
        degreeProgram: "B.Tech",
        section: "Section A",
        year: "1st Year",
        usn: `1MS24CS${Math.floor(100 + Math.random() * 900)}`,
      };

      const res = await handleApiRequest(
        new Request("http://localhost/api/v1/registration/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: link.token, student: dupEmailPayload }),
        })
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.message).toContain("already registered to another student account");
    });

    it("cannot revoke an already consumed token", () => {
      const link = db.generateRegistrationLink("SMP101", "coordinator.smp101");
      const tokenRecord = db.registrationTokens.find((t) => t.id === link.id);
      tokenRecord!.status = "consumed";

      expect(() => {
        db.revokeRegistrationToken(link.id, "SMP101", "coordinator.smp101");
      }).toThrow("Cannot revoke a registration token that has already been consumed");
    });
  });

  // =========================================================================
  // 5. COLLEGE CODE VERIFICATION GIVEN BY ZIPHYRUS-X & DIRECT ONBOARDING
  // =========================================================================
  describe("5. College Code Verification Given by Ziphyrus-X & Direct Onboarding", () => {
    it("verifies College Code given by Ziphyrus-X via /api/v1/registration/verify-college", async () => {
      const req = new Request("http://localhost/api/v1/registration/verify-college?code=SMP101", {
        method: "GET",
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.valid).toBe(true);
      expect(json.data.college.code).toBe("SMP101");
      expect(json.data.college.name).toContain("Sample Institute of Technology");
      expect(json.data.college.status).toBe("active");
    });

    it("rejects non-existent College Code given by Ziphyrus-X", async () => {
      const req = new Request("http://localhost/api/v1/registration/verify-college?code=NONEXISTENT999", {
        method: "GET",
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("invalid_college_code");
      expect(json.error.message).toContain("was not found");
    });

    it("completes student registration directly with College Code given by Ziphyrus-X (without token)", async () => {
      const randomSuffix = Math.floor(100 + Math.random() * 899);
      const studentUsn = `1MS24CS${randomSuffix}`;
      const last3 = studentUsn.slice(-3);
      const expectedPassword = `Ziphyrus-x${last3}`;

      const studentPayload = {
        name: "Direct Registered Student",
        email: `direct.${Date.now()}.${randomSuffix}@smp101.edu`,
        phone: "+91 99000 11223",
        department: "Computer Science & Engineering",
        degreeProgram: "B.Tech",
        section: "Section B",
        year: "1st Year",
        usn: studentUsn,
      };

      const completeReq = new Request("http://localhost/api/v1/registration/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collegeCode: "SMP101",
          student: studentPayload,
        }),
      });

      const res = await handleApiRequest(completeReq);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);

      const createdStudent = json.data.student;
      expect(createdStudent.name).toBe("Direct Registered Student");
      expect(createdStudent.collegeCode).toBe("SMP101");
      expect(createdStudent.usn).toBe(studentUsn);
      expect(json.data.generatedPassword).toBe(expectedPassword);
      expect(json.data.loginId).toBe(studentUsn);

      // Verify immediate login with generated password
      const loginReq = new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: studentUsn, password: expectedPassword }),
      });
      const loginRes = await handleApiRequest(loginReq);
      expect(loginRes.status).toBe(200);
      const loginJson = await loginRes.json();
      expect(loginJson.success).toBe(true);
      expect(loginJson.data.user.role).toBe("student");
      expect(loginJson.data.user.loginId).toBe(studentUsn);

      // Verify fresh start baseline
      const dashReq = new Request("http://localhost/api/v1/student/dashboard", {
        method: "GET",
        headers: { Authorization: `Bearer ${loginJson.data.token}` },
      });
      const dashRes = await handleApiRequest(dashReq);
      expect(dashRes.status).toBe(200);
      const dashJson = await dashRes.json();
      expect(dashJson.data.student.stats.readinessScore).toBe(0);
      expect(dashJson.data.student.stats.solvedProblems).toBe(0);
    });
  });
});
