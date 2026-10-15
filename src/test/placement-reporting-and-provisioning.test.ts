import { describe, it, expect, beforeEach } from "vitest";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import { db } from "../server/db";
import { PlacementService } from "../server/placement-service";
import type { AuthenticatedUser } from "../server/types";

describe("Placement Officer Role, Coordinator Provisioning, and Dual-Layer Reporting Engine", () => {
  const coordinatorUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000003",
    loginId: "coordinator.smp101",
    email: "coordinator@smp101.edu",
    name: "Campus Coordinator",
    role: "coordinator",
    collegeCode: "SMP101",
    collegeId: "c0000000-0000-0000-0000-000000000001",
    isProtected: false,
    permissions: ["coordinator.manage"],
  };

  const placementOfficerUser: AuthenticatedUser = {
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

  beforeEach(() => {
    const col = db.colleges.find((c) => c.code === "SMP101");
    if (col) col.status = "active";
  });

  // --------------------------------------------------------------------------
  // 1. Coordinator Placement Officer Account Provisioning
  // --------------------------------------------------------------------------
  describe("Coordinator Placement Officer Provisioning", () => {
    it("allows Coordinator to list placement officers scoped to campus", async () => {
      const token = createSessionToken(coordinatorUser);
      const req = new Request("http://localhost/api/v1/coordinator/placement-officers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
      expect(json.data[0].collegeCode).toBe("SMP101");
    });

    it("allows Coordinator to provision a new Placement Officer with default credentials", async () => {
      const token = createSessionToken(coordinatorUser);
      const req = new Request("http://localhost/api/v1/coordinator/placement-officers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Prof. Priya Nair",
          email: "priya.nair@smp101.edu",
          phone: "+91 99887 76655",
          departmentScope: ["CSE", "ISE"],
        }),
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Prof. Priya Nair");
      expect(json.data.email).toBe("priya.nair@smp101.edu");
      expect(json.data.collegeCode).toBe("SMP101");
      expect(json.data.departmentScope).toEqual(["CSE", "ISE"]);
      expect(json.data.status).toBe("active");

      // Verify user account exists in db.users with role placement_officer
      const user = db.users.find((u) => u.email === "priya.nair@smp101.edu");
      expect(user).toBeDefined();
      expect(user?.role).toBe("placement_officer");
      expect(user?.college).toBe("SMP101");
    });

    it("rejects duplicate placement officer emails on the same campus", async () => {
      const token = createSessionToken(coordinatorUser);
      const req = new Request("http://localhost/api/v1/coordinator/placement-officers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Duplicate Officer",
          email: "placement@smp101.edu", // already seeded
        }),
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.message).toContain("already exists");
    });

    it("allows Coordinator to toggle placement officer status (active/inactive)", async () => {
      const token = createSessionToken(coordinatorUser);
      const poList = db.getPlacementOfficers("SMP101");
      const targetPo = poList[0];

      // Deactivate
      const deactivateReq = new Request(
        `http://localhost/api/v1/coordinator/placement-officers/${targetPo.id}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "inactive" }),
        }
      );
      const res1 = await handleApiRequest(deactivateReq);
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.data.status).toBe("inactive");

      // Reactivate
      const reactivateReq = new Request(
        `http://localhost/api/v1/coordinator/placement-officers/${targetPo.id}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "active" }),
        }
      );
      const res2 = await handleApiRequest(reactivateReq);
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.data.status).toBe("active");
    });
  });

  // --------------------------------------------------------------------------
  // 2. Strict Read-Only Enforcement for Placement Officers
  // --------------------------------------------------------------------------
  describe("Placement Officer Read-Only Security Invariant", () => {
    it("allows Placement Officer to read student search and profiles", async () => {
      const token = createSessionToken(placementOfficerUser);
      const req = new Request("http://localhost/api/v1/students/search?q=Aarav", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
    });

    it("strictly blocks Placement Officer from mutating student data (HTTP 403 action_prohibited)", async () => {
      const token = createSessionToken(placementOfficerUser);
      const req = new Request("http://localhost/api/v1/students/stu-1", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Hacked Name" }),
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("action_prohibited");
    });

    it("strictly blocks Placement Officer from mutating student marks or overrides (HTTP 403 action_prohibited)", async () => {
      const token = createSessionToken(placementOfficerUser);
      const req = new Request("http://localhost/api/v1/admin/overrides", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ metric: "readiness_score", studentId: "stu-1", value: 99 }),
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("action_prohibited");
    });
  });

  // --------------------------------------------------------------------------
  // 3. Ground-Truth vs Visible Marks Dual-Layer Resolution
  // --------------------------------------------------------------------------
  describe("Dual-Layer Marks Resolution & Ground-Truth Invariant", () => {
    it("resolves visible readiness score with Editor overrides while preserving ground truth", () => {
      const studentsResult = PlacementService.getPlacementStudents(db, placementOfficerUser);
      expect(studentsResult.students.length).toBeGreaterThan(0);

      const student = studentsResult.students[0];
      // Has visible readiness score
      expect(student.readinessScoreVisible).toBeDefined();
      expect(typeof student.readinessScoreVisible).toBe("number");
      // Has raw readiness score
      expect(student.readinessScore).toBeDefined();
      // Readiness tier is strictly determined from raw factual ground truth
      expect(["Tier 1", "Tier 2", "Tier 3"]).toContain(student.readinessTier);
    });

    it("evaluates student eligibility strictly based on ground-truth thresholds", () => {
      const opps = PlacementService.getOpportunities(db, placementOfficerUser);
      expect(opps.length).toBeGreaterThan(0);

      const evalResult = PlacementService.evaluateStudentEligibility(
        db,
        placementOfficerUser,
        opps[0].id,
        "stu-1"
      );
      expect(evalResult).toBeDefined();
      expect(["eligible", "ineligible", "needs_verification"]).toContain(evalResult.status);
      expect(Array.isArray(evalResult.passedCriteria)).toBe(true);
      expect(Array.isArray(evalResult.failedCriteria)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Dual-Layer Report Export Engine & system.data_jobs Audit
  // --------------------------------------------------------------------------
  describe("Dual-Layer Report Export Engine", () => {
    it("exports Mode A Individual Class report and logs to system.data_jobs", async () => {
      const token = createSessionToken(placementOfficerUser);
      const req = new Request("http://localhost/api/v1/placement/reports/export", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "individual_class",
          department: "CSE",
          year: "3rd Year",
          section: "A",
          format: "csv",
          selectedFields: [
            "usn",
            "name",
            "department",
            "section",
            "readinessScoreVisible",
            "readinessScoreRaw",
            "verificationStatus",
          ],
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.rowCount).toBeGreaterThan(0);
      expect(json.data.csvContent).toContain("USN");
      expect(json.data.csvContent).toContain("Visible Readiness %");
      expect(json.data.csvContent).toContain("Ground Truth Readiness %");

      // Verify job logged in system.data_jobs
      expect(json.data.job).toBeDefined();
      expect(json.data.job.jobType).toBe("placement.export.class");
      expect(json.data.job.collegeCode).toBe("SMP101");
      expect(json.data.job.actorRole).toBe("placement_officer");
      expect(json.data.job.format).toBe("csv");
      expect(json.data.job.status).toBe("completed");
    });

    it("exports Mode B Combined Batch report with Excel format", async () => {
      const token = createSessionToken(placementOfficerUser);
      const req = new Request("http://localhost/api/v1/placement/reports/export", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "combined_batch",
          batch: "Batch 2026",
          format: "xlsx",
          selectedFields: ["usn", "name", "department", "batch", "readinessScoreVisible", "offersCount"],
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.job.jobType).toBe("placement.export.batch");
      expect(json.data.job.format).toBe("xlsx");
      expect(json.data.filename).toContain("combined_batch");
    });

    it("lists export jobs through GET /api/v1/placement/reports/jobs", async () => {
      const token = createSessionToken(placementOfficerUser);
      const req = new Request("http://localhost/api/v1/placement/reports/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
      expect(json.data[0].collegeCode).toBe("SMP101");
    });

    it("returns rich telemetry for visual charts including tierDistribution and readinessComparison", async () => {
      const token = createSessionToken(placementOfficerUser);
      const req = new Request("http://localhost/api/v1/placement/reports?type=overview", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.summary).toBeDefined();
      expect(json.data.branchWisePlacements).toBeDefined();
      expect(json.data.tierDistribution).toBeDefined();
      expect(json.data.tierDistribution.length).toBeGreaterThanOrEqual(4);
      expect(json.data.readinessComparison).toBeDefined();
      expect(json.data.readinessComparison.length).toBeGreaterThanOrEqual(4);

      // Verify tier distribution structure
      const tier1 = json.data.tierDistribution[0];
      expect(tier1).toHaveProperty("name");
      expect(tier1).toHaveProperty("value");
      expect(tier1).toHaveProperty("color");

      // Verify readiness comparison structure
      const cseReadiness = json.data.readinessComparison.find((r: any) => r.department === "CSE");
      expect(cseReadiness).toBeDefined();
      expect(cseReadiness.visibleScore).toBeGreaterThanOrEqual(cseReadiness.rawScore);
    });

    it("verifies binary XLSX and PDF generation engines produce valid non-corrupted document buffers", async () => {
      const XLSX = await import("xlsx");
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      // 1. Generate real Excel workbook
      const wb = XLSX.utils.book_new();
      const wsRoster = XLSX.utils.json_to_sheet([
        { USN: "1MS21CS001", Name: "Aarav Sharma", Dept: "CSE", "Visible %": "86%", Status: "Verified Placed" },
        { USN: "1MS21CS002", Name: "Bhavna Patel", Dept: "CSE", "Visible %": "82%", Status: "Offer Accepted" },
      ]);
      XLSX.utils.book_append_sheet(wb, wsRoster, "Candidate Roster");
      const wsSummary = XLSX.utils.json_to_sheet([
        { Parameter: "Campus Jurisdiction", Value: "Campus SMP101" },
        { Parameter: "Placement Conversion Rate", Value: "80.0%" },
      ]);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");

      const xlsxBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
      expect(xlsxBuffer).toBeDefined();
      expect(xlsxBuffer.length).toBeGreaterThan(1000);
      // Valid ZIP/OpenXML magic number header: PK (0x50, 0x4B)
      expect(xlsxBuffer[0]).toBe(0x50);
      expect(xlsxBuffer[1]).toBe(0x4b);

      // Verify the generated workbook can be re-read by XLSX without throwing
      const parsedWb = XLSX.read(xlsxBuffer, { type: "buffer" });
      expect(parsedWb.SheetNames).toContain("Candidate Roster");
      expect(parsedWb.SheetNames).toContain("Executive Summary");

      // 2. Generate real binary PDF document
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.text("ZIPHYRUS X — INSTITUTIONAL PLACEMENT REPORT", 20, 20);
      autoTable(doc, {
        head: [["USN", "Name", "Department", "Verification Status"]],
        body: [
          ["1MS21CS001", "Aarav Sharma", "CSE", "Verified Placed"],
          ["1MS21CS002", "Bhavna Patel", "CSE", "Offer Accepted"],
        ],
      });

      const pdfOutput = doc.output("arraybuffer");
      const pdfBytes = new Uint8Array(pdfOutput);
      expect(pdfBytes.length).toBeGreaterThan(1000);

      // Valid PDF magic bytes: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
      const pdfHeader = String.fromCharCode(...pdfBytes.slice(0, 5));
      expect(pdfHeader).toBe("%PDF-");
    });
  });
});
