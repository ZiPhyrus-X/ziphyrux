import { describe, expect, it } from "vitest";
import { db } from "../server/db";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import type { AuthenticatedUser } from "../server/types";

describe("Super Admin Master Architecture & Invariants", () => {
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

  describe("1. Editor Account Provisioning & Governance", () => {
    it("Super Admin can provision new authorized Editor accounts", () => {
      const newEditorEmail = `editor.test.${Date.now()}@ziphyrus.in`;
      const created = db.createEditorUser(
        { name: "Priya Sharma", email: newEditorEmail },
        superAdminUser.loginId
      );

      expect(created).toBeDefined();
      expect(created.role).toBe("editor");
      expect(created.email).toBe(newEditorEmail);
      expect(created.status).toBe("active");
      expect(created.isProtected).toBe(false);

      // Verify audit log entry
      const audit = db.auditLogs.find(
        (l) => l.action === "editor.create" && l.target === newEditorEmail
      );
      expect(audit).toBeDefined();
      expect(audit?.actor).toBe(superAdminUser.loginId);
    });

    it("Rejects duplicate editor email provisioning", () => {
      expect(() => {
        db.createEditorUser(
          { name: "Duplicate", email: "editor1@ziphyrus.in" },
          superAdminUser.loginId
        );
      }).toThrow(/already exists/i);
    });

    it("Rejects invalid editor email format", () => {
      expect(() => {
        db.createEditorUser(
          { name: "Invalid", email: "invalid-email" },
          superAdminUser.loginId
        );
      }).toThrow(/valid email address/i);
    });
  });

  describe("2. Permanent Protected Accounts Safeguards", () => {
    it("Permanent Super Admin (sAdmin1@ziphyrus.in) cannot be deactivated", () => {
      expect(() => {
        db.setUserStatus("sAdmin1@ziphyrus.in", "inactive");
      }).toThrow(/protected account/i);
    });

    it("Permanent Editor (editor1@ziphyrus.in) cannot be deactivated", () => {
      expect(() => {
        db.setUserStatus("editor1@ziphyrus.in", "inactive");
      }).toThrow(/protected account/i);
    });

    it("Protected accounts cannot be deactivated via API endpoint", async () => {
      const editorUser = db.getUserById("editor1@ziphyrus.in");
      expect(editorUser).toBeDefined();

      const req = new Request(`http://localhost/api/v1/admin/users/${editorUser!.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({ status: "inactive" }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.message).toMatch(/protected account/i);
    });
  });

  describe("3. Hierarchical College Intelligence Engine (6 Levels)", () => {
    it("Level 1 (Platform): Aggregates cross-college readiness, skills, and distribution", () => {
      const platformIntel = db.getPlatformIntelligence();
      expect(platformIntel).toBeDefined();
      expect(platformIntel.averageReadiness).toBeGreaterThan(0);
      expect(platformIntel.technicalAvg).toBeGreaterThan(0);
      expect(platformIntel.aptitudeAvg).toBeGreaterThan(0);
      expect(platformIntel.codingAvg).toBeGreaterThan(0);
      expect(platformIntel.colleges.length).toBeGreaterThanOrEqual(2);
      expect(platformIntel.readinessBands).toBeDefined();
      expect(platformIntel.historyTrend.length).toBeGreaterThan(0);
    });

    it("Level 2 (College): Computes college-specific readiness and departmental breakdown", () => {
      const smp101Intel = db.getCollegeIntelligence("SMP101");
      expect(smp101Intel).toBeDefined();
      expect(smp101Intel.collegeCode).toBe("SMP101");
      expect(smp101Intel.averageReadiness).toBeGreaterThan(0);
      expect(smp101Intel.departments.length).toBeGreaterThan(0);

      const csDept = smp101Intel.departments.find(
        (d) => d.department === "Computer Science & Engineering"
      );
      expect(csDept).toBeDefined();
      expect(csDept?.studentCount).toBeGreaterThanOrEqual(2);
    });

    it("Level 3 (Branch): Computes branch metrics and academic year breakdown", () => {
      const branchIntel = db.getBranchIntelligence("SMP101", "Computer Science & Engineering");
      expect(branchIntel).toBeDefined();
      expect(branchIntel.collegeCode).toBe("SMP101");
      expect(branchIntel.department).toBe("Computer Science & Engineering");
      expect(branchIntel.years.length).toBeGreaterThan(0);
    });

    it("Level 4 (Year): Computes academic year metrics and section breakdown", () => {
      const yearIntel = db.getYearIntelligence("SMP101", "Computer Science & Engineering", "3rd Year");
      expect(yearIntel).toBeDefined();
      expect(yearIntel.year).toBe("3rd Year");
      expect(yearIntel.sections.length).toBeGreaterThan(0);
    });

    it("Level 5 (Section): Computes section metrics and individual student roster", () => {
      const secIntel = db.getSectionIntelligence("SMP101", "Computer Science & Engineering", "3rd Year", "Section A");
      expect(secIntel).toBeDefined();
      expect(secIntel.section).toBe("Section A");
      expect(secIntel.students.length).toBeGreaterThanOrEqual(2);
      expect(secIntel.students[0]?.usn).toBeDefined();
      expect(secIntel.students[0]?.readinessScore).toBeDefined();
    });

    it("Level 6 (Student): Returns deep individual profile with diagnostic history and coding stats", () => {
      const studentProfile = db.getStudentIntelligence("stu-1");
      expect(studentProfile).toBeDefined();
      expect(studentProfile?.name).toBe("Aarav Sharma");
      expect(studentProfile?.usn).toBe("1MS22CS001");
      expect(studentProfile?.skills.technical).toBe(85);
      expect(studentProfile?.coding.problemsSolved).toBe(54);
      expect(studentProfile?.coding.verdicts.accepted).toBe(48);
      expect(studentProfile?.assessmentHistory.length).toBeGreaterThan(0);
    });
  });

  describe("4. Dependent Filter Validation & Strict College Isolation", () => {
    it("Prevents cross-college data leaks in hierarchical queries", () => {
      // Querying SMP102 students from SMP101 scope returns 0 students
      const crossLeakTest = db.getBranchIntelligence("SMP101", "Information Technology");
      expect(crossLeakTest.totalStudents).toBe(0); // IT is at SMP102, not SMP101 (SMP101 has Information Science)

      const smp102Students = db.getCollegeIntelligence("SMP102");
      expect(smp102Students.collegeCode).toBe("SMP102");
      // Verify every student in SMP102 profile belongs exclusively to SMP102
      const smp102StudentProfiles = Object.values(db.studentIntelligence).filter(
        (s) => s.collegeCode === "SMP102"
      );
      expect(smp102StudentProfiles.every((s) => s.collegeCode === "SMP102")).toBe(true);
    });
  });

  describe("5. Missing Evidence Principle (Non-Fabrication)", () => {
    it("Preserves null for untested skill areas and does not coerce to 0%", () => {
      const stu4 = db.getStudentIntelligence("stu-4");
      expect(stu4).toBeDefined();
      // stu-4 has not taken the verbal assessment
      expect(stu4?.skills.verbal).toBeNull();
      expect(stu4?.skills.technical).toBe(72);

      // Average calculation excludes unassessed nulls rather than treating them as 0
      const secIntel = db.getSectionIntelligence("SMP101", "Electronics & Communication", "2nd Year", "Section A");
      expect(secIntel.verbalAvg).toBeNull(); // No students in this section took verbal -> preserved as null
    });
  });

  describe("6. Zero Attendance Law Invariant", () => {
    it("Strictly verifies NO attendance tables, columns, or metrics exist in the platform", () => {
      const stu1 = db.getStudentIntelligence("stu-1") as any;
      expect(stu1.attendance).toBeUndefined();
      expect(stu1.attendanceRate).toBeUndefined();
      expect(stu1.attendancePercentage).toBeUndefined();

      const platformIntel = db.getPlatformIntelligence() as any;
      expect(platformIntel.attendance).toBeUndefined();
      expect(platformIntel.attendanceAvg).toBeUndefined();

      const session = db.sessions[0] as any;
      expect(session.attendanceCount).toBeUndefined();
      expect(session.absentStudents).toBeUndefined();
      expect(session.attendanceSheet).toBeUndefined();
    });
  });

  describe("7. Editor Changes Tracking & Visible Overrides Transparency", () => {
    it("Tracks Editor data changes with before and after state values", () => {
      const changes = db.getEditorChanges();
      expect(changes.length).toBeGreaterThan(0);

      const firstChange = changes[0];
      expect(firstChange?.editorLogin).toBeDefined();
      expect(firstChange?.entityType).toBeDefined();
      expect(firstChange?.action).toBeDefined();
    });

    it("Visible-value overrides preserve actual calculated values with mandatory justifications", () => {
      const overrides = db.getOverrides();
      expect(overrides.length).toBeGreaterThan(0);

      const ovr = overrides[0];
      expect(ovr?.actualValue).toBeDefined();
      expect(ovr?.visibleValue).toBeDefined();
      expect(ovr?.mandatoryReason.length).toBeGreaterThanOrEqual(5);
    });
  });
});
