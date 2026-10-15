import { describe, it, expect, beforeEach } from "vitest";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import { db } from "../server/db";
import { PlacementService } from "../server/placement-service";
import type { AuthenticatedUser } from "../server/types";

describe("Core Operational Enhancements — Coordinator & Placement Officer Workspaces", () => {
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
      "import.manage",
    ],
  };

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

  const coordToken = createSessionToken(coordinatorUser);
  const placementToken = createSessionToken(placementOfficer);

  beforeEach(() => {
    // Seed db if necessary
  });

  describe("Part 1: Coordinator Workspace Enhancements", () => {
    it("1.1 parses roster CSV data conforming to 12-step validation schema", async () => {
      // Simulate client-side CSV parsing logic
      const csvContent = `name,usn,email,department,program,year,semester,section
Aarav Sharma,1MS21CS001,aarav.sharma@campus.edu,Computer Science,B.Tech,2024,6,A
Diya Nair,1MS21CS002,diya.nair@campus.edu,Computer Science,B.Tech,2024,6,A`;

      const lines = csvContent.trim().split(/\r?\n/);
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      expect(headers).toContain("name");
      expect(headers).toContain("usn");
      expect(headers).toContain("email");
      expect(headers).toContain("department");
      expect(headers).toContain("program");
      expect(headers).toContain("year");
      expect(headers).toContain("semester");
      expect(headers).toContain("section");

      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row: Record<string, any> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] ?? "";
        });
        return row;
      });

      expect(rows).toHaveLength(2);
      expect(rows[0].usn).toBe("1MS21CS001");
      expect(rows[1].email).toBe("diya.nair@campus.edu");

      // Validate through coordinator import API
      const req = new Request("http://localhost/api/v1/coordinator/data/import/validate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${coordToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: "roster-test.csv",
          rows,
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("totalRows");
      expect(body.data).toHaveProperty("validRows");
      expect(body.data).toHaveProperty("rejectedRows");
    });

    it("1.2 creates campus announcements with expiration and audit logging", async () => {
      const payload = {
        title: "Upcoming Campus Placement Drive Schedule",
        message: "Google and Microsoft campus recruitment drives will commence next Monday.",
        targetRole: "Students Only",
        durationDays: 14,
      };

      const req = new Request("http://localhost/api/v1/coordinator/notifications", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${coordToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe(payload.title);
      expect(body.data.targetRole).toBe("Students");
      expect(body.data.collegeScope).toBe("SMP101");
      expect(body.data.durationDays).toBe(14);
      expect(body.data).toHaveProperty("expiresAt");

      // Verify audit log
      const audit = db.auditLogs.find(
        (log: any) =>
          log.action === "coordinator.notification_created" &&
          log.target === payload.title
      );
      expect(audit).toBeDefined();
      expect(audit?.actor).toBe(coordinatorUser.loginId);
    });

    it("1.3 rejects announcement creation if title or message is empty", async () => {
      const req = new Request("http://localhost/api/v1/coordinator/notifications", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${coordToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "", message: "Test" }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
    });
  });

  describe("Part 2: Placement Officer Workspace Enhancements", () => {
    it("2.1 bulk advances candidate recruitment stages with targetRound mapping", async () => {
      // Find or create an application in SMP101
      const apps = db.placementApplications.filter((a: any) => a.collegeCode === "SMP101");
      expect(apps.length).toBeGreaterThan(0);
      const targetApp = apps[0];

      // Advance to Technical Interview
      const updated = PlacementService.updateApplicationStage(db, placementOfficer, targetApp.id, {
        targetRound: "Technical Interview",
      });

      expect(updated.currentStageNumber).toBe(3);
      expect(updated.currentStageName).toBe("Technical Interview");
      expect(updated.status).toBe("under_review");

      // Advance to HR Round
      const hrRound = PlacementService.updateApplicationStage(db, placementOfficer, targetApp.id, {
        targetRound: "HR Round",
      });

      expect(hrRound.currentStageNumber).toBe(4);
      expect(hrRound.currentStageName).toBe("HR Round");
      expect(hrRound.status).toBe("shortlisted");
    });

    it("2.2 generates visiting recruiter candidate packet CSV with exact required headers", async () => {
      const req = new Request("http://localhost/api/v1/placement/recruiter-packet", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${placementToken}`,
        },
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      const packet = body.data || body;
      expect(packet).toHaveProperty("csv");
      expect(packet).toHaveProperty("filename");

      const csvLines = packet.csv.split("\n");
      const headerLine = csvLines[0];

      // Exact required headers:
      // ["USN", "Candidate Name", "Department", "CGPA", "Active Backlogs", "Current Interview Stage", "Interview Status", "Official Email"]
      expect(headerLine).toContain("USN");
      expect(headerLine).toContain("Candidate Name");
      expect(headerLine).toContain("Department");
      expect(headerLine).toContain("CGPA");
      expect(headerLine).toContain("Active Backlogs");
      expect(headerLine).toContain("Current Interview Stage");
      expect(headerLine).toContain("Interview Status");
      expect(headerLine).toContain("Official Email");

      // Must be scoped strictly to SMP101
      if (csvLines.length > 1 && csvLines[1].trim()) {
        const studentRecord = db.students.find((s: any) => packet.csv.includes(s.usn));
        if (studentRecord) {
          expect(studentRecord.collegeCode).toBe("SMP101");
        }
      }
    });

    it("2.3 attaches offer letter document scan and authoritatively confirms verification", async () => {
      const offers = db.placementOffers.filter((o: any) => o.collegeCode === "SMP101");
      expect(offers.length).toBeGreaterThan(0);
      const offer = offers[0];

      const scanUrl = `https://storage.ziphyrus.internal/offers/${offer.studentUsn}-offer-letter.pdf`;
      const filename = `${offer.studentUsn}-offer-letter.pdf`;

      const req = new Request(`http://localhost/api/v1/placement/offers/${offer.id}/document`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${placementToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offerLetterUrl: scanUrl,
          filename,
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.offerLetterUrl).toBe(scanUrl);
      expect(body.data.filename).toBe(filename);

      // Verify audit log for document attachment
      const attachAudit = db.auditLogs.find(
        (log: any) =>
          log.action === "placement.offer_document_attached" &&
          log.metadata?.offerId === offer.id
      );
      expect(attachAudit).toBeDefined();

      // Now verify the offer
      const verifyReq = new Request(`http://localhost/api/v1/placement/offers/${offer.id}/verify`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${placementToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "verified" }),
      });

      const verifyRes = await handleApiRequest(verifyReq);
      expect(verifyRes.status).toBe(200);
      const verifyBody = await verifyRes.json();
      expect(verifyBody.data.verificationStatus).toBe("verified");
    });
  });

  describe("Part 3: Cross-Workspace Remediation Bridge", () => {
    it("3.1 dispatches remedial training request from placement intelligence to faculty coordinator queue", async () => {
      const payload = {
        domain: "Data Structures & Algorithms",
        priority: "High" as const,
        targetDate: "2026-11-15",
        notes: "Intensive 2-week problem solving bootcamp for technical interview clearing.",
        affectedStudentsCount: 30,
      };

      const req = new Request("http://localhost/api/v1/placement/remediation/request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${placementToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.collegeCode).toBe("SMP101");
      expect(body.data.studentName).toContain("Remedial Cohort: Data Structures & Algorithms");
      expect(body.data.trainerName).toBe("Lead Faculty Coordinator");

      // Verify it exists in shared action plans accessible to coordinator
      const sharedPlan = db.actionPlans.find((p: any) => p.id === body.data.id);
      expect(sharedPlan).toBeDefined();
      expect(sharedPlan.collegeCode).toBe("SMP101");

      // Verify audit log
      const remedialAudit = db.auditLogs.find(
        (log: any) =>
          log.action === "placement.remediation_requested" &&
          log.target === payload.domain
      );
      expect(remedialAudit).toBeDefined();
      expect(remedialAudit?.actor).toBe(placementOfficer.loginId);
    });
  });

  describe("Part 4: Architectural Invariants Preservation", () => {
    it("4.1 strictly preserves student record immutability for placement officers", async () => {
      const student = db.students.find((s: any) => s.collegeCode === "SMP101");
      expect(student).toBeDefined();

      const patchStudentReq = new Request(`http://localhost/api/v1/coordinator/students/${student.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${placementToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cgpa: 9.9 }),
      });

      const res = await handleApiRequest(patchStudentReq);
      expect(res.status).toBe(403);
    });

    it("4.2 preserves Zero Attendance Tracking Law", () => {
      // Ensure no attendance tables or fields exist in database or models
      expect((db as any).attendance).toBeUndefined();
      expect((db as any).attendanceLogs).toBeUndefined();
      expect((db as any).attendanceSheets).toBeUndefined();
    });
  });
});
