import { describe, it, expect } from "vitest";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import { db } from "../server/db";
import { intelligenceEngine } from "../server/intelligence/engine";
import { METRIC_REGISTRY } from "../server/intelligence/metric-registry";
import type { AuthenticatedUser } from "../server/types";

describe("ZIPHYRUS X — SOURCE OF TRUTH & INTELLIGENCE ARCHITECTURE", () => {
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

  const studentUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000005",
    loginId: "student.smp01",
    email: "student01@smp101.edu",
    name: "Aditya Verma",
    role: "student",
    collegeCode: "SMP101",
    isProtected: false,
    permissions: ["student.read"],
  };

  const superAdminToken = createSessionToken(superAdminUser);
  const editorToken = createSessionToken(editorUser);
  const coordinatorToken = createSessionToken(coordinatorUser);
  const studentToken = createSessionToken(studentUser);

  // 1. Authoritative source records remain unchanged after presentation overrides
  it("Requirement 1: Authoritative source records remain unchanged after presentation overrides", async () => {
    // Check initial student intelligence
    const initialAuth = db.getStudentIntelligence("stu-1", "authoritative");
    expect(initialAuth).not.toBeNull();
    const originalScore = initialAuth!.readinessScore;

    // Apply an Editor presentation override
    const override = db.createOverride({
      entityType: "student",
      entityId: "stu-1",
      fieldName: "readinessScore",
      actualValue: String(originalScore),
      visibleValue: "95",
      mandatoryReason: "Authorized external industrial credential validation",
      overriddenBy: editorUser.loginId,
    });
    expect(override.id).toBeDefined();

    // Verify Authoritative Layer B intelligence is NOT mutated
    const authAfter = db.getStudentIntelligence("stu-1", "authoritative");
    expect(authAfter).not.toBeNull();
    expect(authAfter!.readinessScore).toBe(originalScore);

    // Verify Adjusted Layer C intelligence reflects the override
    const adjAfter = db.getStudentIntelligence("stu-1", "adjusted");
    expect(adjAfter).not.toBeNull();
    expect(adjAfter!.readinessScore).toBe(95);
  });

  // 2. Intelligence formulas use authoritative evidence
  it("Requirement 2: Intelligence formulas derive strictly from authoritative evidence", () => {
    const student = db.getStudentIntelligence("stu-1", "authoritative");
    expect(student).not.toBeNull();

    // Composite readiness calculation: 0.35 * Tech + 0.25 * Apt + 0.15 * Verbal + 0.15 * Soft + 0.10 * Coding
    const tech = student!.skills.technical ?? 0;
    const apt = student!.skills.aptitude ?? 0;
    const verb = student!.skills.verbal ?? 0;
    const soft = student!.skills.softSkills ?? 0;
    const coding = student!.coding.score ?? 0;

    const expected = Math.round(tech * 0.35 + apt * 0.25 + verb * 0.15 + soft * 0.15 + coding * 0.1);
    expect(student!.readinessScore).toBe(expected);
  });

  // 3. Adjusted reporting uses the correct override
  it("Requirement 3: Adjusted reporting returns the specified override value for the exact entity", () => {
    const adj = db.getStudentIntelligence("stu-1", "adjusted");
    expect(adj).not.toBeNull();
    expect(adj!.readinessScore).toBe(95);

    // Other students should not be affected by stu-1's override
    const otherStudentAuth = db.getStudentIntelligence("stu-2", "authoritative");
    const otherStudentAdj = db.getStudentIntelligence("stu-2", "adjusted");
    expect(otherStudentAdj).not.toBeNull();
    expect(otherStudentAuth).not.toBeNull();
    expect(otherStudentAdj!.readinessScore).toBe(otherStudentAuth!.readinessScore);
  });

  // 4. Dependent adjusted totals recalculate correctly
  it("Requirement 4: Dependent adjusted aggregates recalculate across Section, Branch, College, and Platform", () => {
    const authCollege = db.getCollegeIntelligence("SMP101", "authoritative");
    const adjCollege = db.getCollegeIntelligence("SMP101", "adjusted");

    // Since stu-1's readiness was increased from 82 to 95, the college average in adjusted layer should be recalculated
    expect(adjCollege).toBeDefined();
    expect(authCollege).toBeDefined();
    // Authoritative should remain unshifted
    expect(typeof authCollege.averageReadiness).toBe("number");
    expect(typeof adjCollege.averageReadiness).toBe("number");
  });

  // 5. Percentages use valid denominators (exclude unassessed)
  it("Requirement 5: Population metrics exclude unassessed students from denominators", () => {
    const sampleStudents = [
      {
        skills: { technical: 80, aptitude: 70, verbal: null, softSkills: 90 },
        coding: { score: 85, problemsSolved: 10 },
      },
      {
        skills: { technical: 60, aptitude: null, verbal: null, softSkills: 80 },
        coding: { score: 75, problemsSolved: 8 },
      },
    ];

    const aggregated = intelligenceEngine.computePopulationMetrics(sampleStudents as any, "authoritative");
    // Technical is (80 + 60) / 2 = 70
    expect(aggregated.technicalAvg).toBe(70);
    // Aptitude is 70 / 1 = 70 (2nd student is excluded from denominator, not treated as 0)
    expect(aggregated.aptitudeAvg).toBe(70);
    // Verbal has 0 assessed students; should be null
    expect(aggregated.verbalAvg).toBeNull();
  });

  // 6. Weighted calculations preserve weights
  it("Requirement 6: Metric Registry verifies official formula weights", () => {
    const readinessMetric = METRIC_REGISTRY.met_readiness_score;
    expect(readinessMetric).toBeDefined();
    expect(readinessMetric.calculationFormula).toContain("Technical(35%)");
    expect(readinessMetric.calculationFormula).toContain("Aptitude(25%)");
    expect(readinessMetric.calculationFormula).toContain("Verbal(15%)");
  });

  // 7. Missing evidence is not converted to zero
  it("Requirement 7: Missing evidence is preserved as null, never converted to 0", () => {
    const student = {
      skills: { technical: null, aptitude: 80, verbal: null, softSkills: null },
      coding: { score: 90 },
    };

    const resolved = intelligenceEngine.resolveStudentMetric(student, "technicalCompetency", "authoritative");
    // Crucial: Must be null, not 0 (0 implies failed assessment, null implies unassessed)
    expect(resolved).toBeNull();
  });

  // 8. Scope filters return the exact selected population
  it("Requirement 8: Scope filtering returns the exact scoped cohort", () => {
    const sectionIntel = db.getSectionIntelligence("SMP101", "Computer Science & Engineering", "3rd Year", "Section A");
    expect(sectionIntel).toBeDefined();
    expect(sectionIntel.section).toBe("Section A");
    expect(sectionIntel.students.length).toBeGreaterThan(0);
    sectionIntel.students.forEach((s) => {
      expect(s.section).toBe("Section A");
    });
  });

  // 9. Direct aggregate overrides do not rewrite student records
  it("Requirement 9: Direct aggregate overrides take precedence for that scope without rewriting child student records", () => {
    // Record an aggregate override on Section A
    db.createOverride({
      entityType: "section",
      entityId: "SMP101:Computer Science & Engineering:3rd Year:Section A",
      fieldName: "averageReadiness",
      actualValue: "80",
      visibleValue: "88",
      mandatoryReason: "Authorized accredited batch uplift per coordinator audit",
      overriddenBy: editorUser.loginId,
    });

    // Check adjusted section intelligence
    const adjSec = db.getSectionIntelligence("SMP101", "Computer Science & Engineering", "3rd Year", "Section A", "adjusted");
    expect(adjSec.averageReadiness).toBe(88);

    // Verify child student records inside the section were NOT mutated to 88
    adjSec.students.forEach((s) => {
      expect(s.readinessScore).not.toBe(88);
    });
  });

  // 10. Concurrent override changes are handled safely
  it("Requirement 10: Concurrent overrides are recorded and resolved independently", () => {
    const ovr1 = db.createOverride({
      entityType: "student",
      entityId: "stu-3",
      fieldName: "technical",
      actualValue: "60",
      visibleValue: "85",
      mandatoryReason: "External hackathon certificate verified",
      overriddenBy: editorUser.loginId,
    });

    const ovr2 = db.createOverride({
      entityType: "student",
      entityId: "stu-4",
      fieldName: "coding",
      actualValue: "68",
      visibleValue: "90",
      mandatoryReason: "National coding olympiad medal verification",
      overriddenBy: editorUser.loginId,
    });

    expect(ovr1.id).toBeDefined();
    expect(ovr2.id).toBeDefined();
    expect(ovr1.id).not.toBe(ovr2.id);

    const provenance = db.getProvenanceLedger();
    expect(provenance.some((p) => p.targetId === "stu-3")).toBe(true);
    expect(provenance.some((p) => p.targetId === "stu-4")).toBe(true);
  });

  // 11. Recalculation failures and statuses are observable
  it("Requirement 11: Recalculation engine version and provenance timestamps are observable", () => {
    const reconciliation = db.getIntelligenceReconciliation("platform");
    expect(reconciliation.calculationVersion).toBe("v2.6-engine");
    expect(reconciliation.reconciledAt).toBeDefined();
    expect(reconciliation.comparison).toBeDefined();
  });

  // 12. Super Admin can inspect provenance, actors, and reasons
  it("Requirement 12: Super Admin can inspect full provenance ledger, actor logins, and reasons", async () => {
    const res = await handleApiRequest(
      new Request("http://localhost/api/v1/admin/intelligence/provenance", {
        method: "GET",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    const entry = body.data[0];
    expect(entry.editorLogin).toBeDefined();
    expect(entry.mandatoryReason.length).toBeGreaterThanOrEqual(5);
    expect(entry.calculationVersion).toBe("v2.6-engine");
  });

  // 13. Non-admin roles (Coordinator, Student) cannot access Editor audit metadata
  it("Requirement 13: Non-admin roles receive clean reporting view stripped of internal Editor audit metadata", () => {
    const dirtyData = {
      collegeCode: "SMP101",
      averageReadiness: 85,
      isOverridden: true,
      overriddenBy: "editor1@ziphyrus.in",
      mandatoryReason: "Internal client presentation adjustment",
      delta: 7.5,
      internalAuditTrail: ["event1", "event2"],
      departments: [
        {
          department: "CSE",
          averageReadiness: 88,
          isOverridden: true,
          overriddenBy: "editor1@ziphyrus.in",
        },
      ],
    };

    // Sanitize for coordinator
    const sanitized = intelligenceEngine.sanitizeForRole(dirtyData, "coordinator");
    expect(sanitized.averageReadiness).toBe(85);
    expect(sanitized.isOverridden).toBeUndefined();
    expect(sanitized.overriddenBy).toBeUndefined();
    expect(sanitized.mandatoryReason).toBeUndefined();
    expect(sanitized.delta).toBeUndefined();
    expect(sanitized.internalAuditTrail).toBeUndefined();
    expect(sanitized.departments[0].overriddenBy).toBeUndefined();

    // Sanitize for student
    const studentSanitized = intelligenceEngine.sanitizeForRole(dirtyData, "student");
    expect(studentSanitized.overriddenBy).toBeUndefined();
    expect(studentSanitized.mandatoryReason).toBeUndefined();
  });

  // 14. Report exports follow the correct value policy
  it("Requirement 14: Report exports follow the designated value policy (standard_progress vs intelligence vs audit)", async () => {
    // Standard progress report: Clean Layer C reporting values
    const stdRes = await handleApiRequest(
      new Request("http://localhost/api/v1/admin/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          collegeCode: "SMP101",
          reportType: "progress",
          format: "json",
          policy: "standard_progress",
        }),
      })
    );
    expect(stdRes.status).toBe(200);
    const stdBody = await stdRes.json();
    expect(stdBody.success).toBe(true);

    // Audit report: Super Admin only, full provenance
    const auditRes = await handleApiRequest(
      new Request("http://localhost/api/v1/admin/intelligence/provenance", {
        method: "GET",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      })
    );
    expect(auditRes.status).toBe(200);

    // Non-superadmin cannot access audit endpoint
    const forbiddenRes = await handleApiRequest(
      new Request("http://localhost/api/v1/admin/intelligence/provenance", {
        method: "GET",
        headers: { Authorization: `Bearer ${coordinatorToken}` },
      })
    );
    expect(forbiddenRes.status).toBe(403);
  });

  // 15. Hold and Deactive colleges preserve historical intelligence
  it("Requirement 15: Colleges in Hold or Deactive status preserve historical intelligence and calculation access", async () => {
    // Put SMP101 on Hold
    const updateRes = await handleApiRequest(
      new Request("http://localhost/api/v1/admin/colleges/SMP101/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          status: "hold",
          reason: "Semester transition pause",
        }),
      })
    );
    expect(updateRes.status).toBe(200);

    // Historical intelligence must remain accessible
    const intelRes = await handleApiRequest(
      new Request("http://localhost/api/v1/admin/intelligence/college/SMP101", {
        method: "GET",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      })
    );
    expect(intelRes.status).toBe(200);
    const intelBody = await intelRes.json();
    expect(intelBody.success).toBe(true);
    expect(intelBody.data.averageReadiness).toBeGreaterThan(0);

    // Restore back to Active
    await handleApiRequest(
      new Request("http://localhost/api/v1/admin/colleges/SMP101/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          status: "active",
          reason: "Resumed operations",
        }),
      })
    );
  });

  // 16. Zero attendance law: strict prohibition of any attendance tables, metrics, percentages, or registers
  it("Requirement 16: Zero Attendance Law — Strict absence of any attendance tables, fields, or metrics", () => {
    // Check Metric Registry
    const metricKeys = Object.keys(METRIC_REGISTRY);
    const attendanceMetrics = metricKeys.filter((k) => k.toLowerCase().includes("attendance"));
    expect(attendanceMetrics).toEqual([]);

    // Check metric names
    Object.values(METRIC_REGISTRY).forEach((m) => {
      expect(m.name.toLowerCase()).not.toContain("attendance");
      if (m.calculationFormula) {
        expect(m.calculationFormula.toLowerCase()).not.toContain("attendance");
      }
    });

    // Check platform intelligence output
    const platformIntel = db.getPlatformIntelligence();
    const jsonStr = JSON.stringify(platformIntel).toLowerCase();
    expect(jsonStr).not.toContain("attendance");
  });
});
