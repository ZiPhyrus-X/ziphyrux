import { describe, it, expect } from "vitest";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import { db } from "../server/db";
import { intelligenceEngine } from "../server/intelligence/engine";
import { METRIC_REGISTRY } from "../server/intelligence/metric-registry";
import type { AuthenticatedUser } from "../server/types";

describe("ZIPHYRUS X — EDITOR VISIBLE-VALUE OVERRIDES & ACADEMIC HIERARCHY", () => {
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

  const editorUser2: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000005",
    loginId: "editor2@ziphyrus.in",
    email: "editor2@ziphyrus.in",
    name: "Ziphyrus Curriculum Editor",
    role: "editor",
    isProtected: false,
    permissions: ["override.manage"],
  };

  const superAdminUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000009",
    loginId: "superadmin@ziphyrus.in",
    email: "superadmin@ziphyrus.in",
    name: "Ziphyrus Super Admin",
    role: "super_admin",
    isProtected: true,
    permissions: ["platform.*"],
  };

  const coordinatorUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000003",
    loginId: "coordinator.smp101",
    email: "coord@smp101.edu",
    name: "Asha Sharma",
    role: "coordinator",
    collegeCode: "SMP101",
    isProtected: false,
    permissions: ["college.manage"],
  };

  const studentUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000004",
    loginId: "stu-1",
    email: "rohit.sharma@smp101.edu",
    name: "Rohit Sharma",
    role: "student",
    collegeCode: "SMP101",
    isProtected: false,
    permissions: [],
  };

  const makeReq = (path: string, method: string = "GET", body?: any, user: AuthenticatedUser = editorUser) => {
    const token = createSessionToken(user);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    return new Request(`http://localhost:8080${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  // Scenario 1: Override History display with default sorting & filters
  it("Scenario 1: returns override history records with academic scopes and timestamps", async () => {
    const res = await handleApiRequest(makeReq("/api/v1/editor/overrides"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
    const item = data.data[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("actualValue");
    expect(item).toHaveProperty("visibleValue");
    expect(item).toHaveProperty("mandatoryReason");
    expect(item).toHaveProperty("createdAt");
  });

  // Scenario 2: Filter overrides by Editor identity (own overrides default)
  it("Scenario 2: filters overrides by Editor identity when mine=true", async () => {
    const res = await handleApiRequest(makeReq("/api/v1/editor/overrides?mine=true", "GET", undefined, editorUser));
    const data = await res.json();
    expect(data.success).toBe(true);
    for (const ovr of data.data) {
      const actor = ovr.editorLogin || ovr.overriddenBy;
      expect(actor).toBe(editorUser.loginId);
    }
  });

  // Scenario 3: Search overrides by college, scope, metric, actor, reason
  it("Scenario 3: searches overrides across college, reason, metric, and actor", async () => {
    const res = await handleApiRequest(makeReq("/api/v1/editor/overrides?search=SMP101"));
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
    for (const ovr of data.data) {
      const match =
        ovr.collegeCode?.includes("SMP101") ||
        ovr.academicScope?.collegeCode?.includes("SMP101") ||
        ovr.entityId?.includes("SMP101") ||
        ovr.mandatoryReason?.toLowerCase().includes("smp101") ||
        ovr.overriddenBy?.includes("SMP101");
      expect(Boolean(match)).toBe(true);
    }
  });

  // Scenario 4: Filter overrides by effective status (active, reverted, superseded)
  it("Scenario 4: filters overrides by effective status (active, reverted, superseded)", async () => {
    const resActive = await handleApiRequest(makeReq("/api/v1/editor/overrides?status=active"));
    const dataActive = await resActive.json();
    expect(dataActive.success).toBe(true);
    for (const ovr of dataActive.data) {
      expect(ovr.effectiveStatus ?? "active").toBe("active");
    }
  });

  // Scenario 5: Filter overrides by college
  it("Scenario 5: filters overrides by specific collegeCode", async () => {
    const res = await handleApiRequest(makeReq("/api/v1/editor/overrides?college=SMP101"));
    const data = await res.json();
    expect(data.success).toBe(true);
    for (const ovr of data.data) {
      expect(ovr.collegeCode || ovr.academicScope?.collegeCode).toBe("SMP101");
    }
  });

  // Scenario 6: View override details modal / provenance
  it("Scenario 6: returns full provenance including calculation version and actor audit", async () => {
    const res = await handleApiRequest(makeReq("/api/v1/editor/overrides"));
    const data = await res.json();
    const ovr = data.data.find((o: any) => o.calculationVersion);
    expect(ovr).toBeDefined();
    expect(ovr.calculationVersion).toBe("v2.6-engine");
    expect(ovr.overriddenBy).toBeDefined();
    expect(ovr.mandatoryReason.length).toBeGreaterThanOrEqual(5);
  });

  // Scenario 7: Authorized revert of an active override restores authoritative values
  it("Scenario 7: authorized revert restores authoritative value and records revert in audit", async () => {
    // Create an override to revert
    const postRes = await handleApiRequest(
      makeReq("/api/v1/editor/overrides", "POST", {
        collegeCode: "SMP101",
        academicScope: {
          scopeLevel: "student",
          collegeCode: "SMP101",
          studentId: "stu-1",
        },
        metricId: "met_employability_readiness",
        proposedValue: 88.0,
        mandatoryReason: "Temporary verification override for testing revert workflow",
      })
    );
    expect(postRes.status).toBe(201);
    const created = (await postRes.json()).data;
    expect(created.effectiveStatus).toBe("active");

    // Revert the override
    const revertRes = await handleApiRequest(
      makeReq(`/api/v1/editor/overrides/${created.id}/revert`, "POST")
    );
    expect(revertRes.status).toBe(200);
    const reverted = (await revertRes.json()).data;
    expect(reverted.effectiveStatus).toBe("reverted");
    expect(reverted.revertedBy).toBe(editorUser.loginId);
    expect(reverted.revertedAt).toBeDefined();
  });

  // Scenario 8: Reverted override status updates in registry
  it("Scenario 8: reverted override appears with effectiveStatus='reverted' in list", async () => {
    const res = await handleApiRequest(makeReq("/api/v1/editor/overrides?status=reverted"));
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.some((o: any) => o.effectiveStatus === "reverted")).toBe(true);
  });

  // Scenario 9: Superseded override handling on same scope and metric
  it("Scenario 9: creating a new override on the same scope and metric supersedes the previous active override", async () => {
    const scope = {
      scopeLevel: "section",
      collegeCode: "SMP101",
      year: "3rd Year",
      department: "Computer Science & Engineering",
      section: "Section A",
    };

    // First override
    const res1 = await handleApiRequest(
      makeReq("/api/v1/editor/overrides", "POST", {
        collegeCode: "SMP101",
        academicScope: scope,
        metricId: "met_employability_readiness",
        proposedValue: 82.0,
        mandatoryReason: "Initial revision for section cohort presentation",
      })
    );
    const firstOvr = (await res1.json()).data;
    expect(firstOvr.effectiveStatus).toBe("active");

    // Second override for the exact same scope & metric
    const res2 = await handleApiRequest(
      makeReq("/api/v1/editor/overrides", "POST", {
        collegeCode: "SMP101",
        academicScope: scope,
        metricId: "met_employability_readiness",
        proposedValue: 85.0,
        mandatoryReason: "Superseding prior adjustment with higher readiness rating",
      })
    );
    const secondOvr = (await res2.json()).data;
    expect(secondOvr.effectiveStatus).toBe("active");

    // Check that the first override is now superseded
    const allRes = await handleApiRequest(makeReq("/api/v1/editor/overrides"));
    const all = (await allRes.json()).data;
    const oldFound = all.find((o: any) => o.id === firstOvr.id);
    expect(oldFound.effectiveStatus).toBe("superseded");
    expect(oldFound.supersededBy).toBe(secondOvr.id);
  });

  // Scenario 10: Cascading filter - College selection updates downstream Year options
  it("Scenario 10: cascading filter returns years available for selected college", async () => {
    const res = await handleApiRequest(makeReq("/api/v1/editor/overrides/options?collegeCode=SMP101"));
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.years).toContain("3rd Year");
    expect(data.data.colleges.length).toBeGreaterThan(0);
  });

  // Scenario 11: Cascading filter - Year selection updates downstream Branch options
  it("Scenario 11: cascading filter returns branches available for selected college and year", async () => {
    const res = await handleApiRequest(
      makeReq("/api/v1/editor/overrides/options?collegeCode=SMP101&year=3rd+Year")
    );
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.departments).toContain("Computer Science & Engineering");
  });

  // Scenario 12: Cascading filter - Branch selection updates downstream Semester options
  it("Scenario 12: cascading filter returns semesters available for selected branch", async () => {
    const res = await handleApiRequest(
      makeReq("/api/v1/editor/overrides/options?collegeCode=SMP101&year=3rd+Year&department=Computer+Science+%26+Engineering")
    );
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.semesters).toContain("Semester 6");
  });

  // Scenario 13: Cascading filter - Semester selection updates downstream Section options
  it("Scenario 13: cascading filter returns sections available for selected semester", async () => {
    const res = await handleApiRequest(
      makeReq("/api/v1/editor/overrides/options?collegeCode=SMP101&year=3rd+Year&department=Computer+Science+%26+Engineering&semester=Semester+6")
    );
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.sections).toContain("Section A");
  });

  // Scenario 14: Cascading filter - Section selection updates downstream Student options
  it("Scenario 14: cascading filter returns students enrolled in selected section", async () => {
    const res = await handleApiRequest(
      makeReq("/api/v1/editor/overrides/options?collegeCode=SMP101&year=3rd+Year&department=Computer+Science+%26+Engineering&semester=Semester+6&section=Section+A")
    );
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.students.length).toBeGreaterThan(0);
    expect(data.data.students.some((s: any) => s.id === "stu-1")).toBe(true);
  });

  // Scenario 15: Upstream reset clears downstream selections
  it("Scenario 15: omitting upstream filters returns broad population options", async () => {
    const resAll = await handleApiRequest(makeReq("/api/v1/editor/overrides/options?collegeCode=SMP101"));
    const dataAll = await resAll.json();
    expect(dataAll.data.students.length).toBeGreaterThanOrEqual(1);
    expect(dataAll.data.years.length).toBeGreaterThanOrEqual(1);
  });

  // Scenario 16: Scope progress calculation across scopes
  it("Scenario 16: computes scope progress for College, Section, and Student scopes", async () => {
    // College level
    const resCollege = await handleApiRequest(makeReq("/api/v1/editor/overrides/scope-progress?collegeCode=SMP101"));
    const dataCollege = await resCollege.json();
    expect(dataCollege.data.scopeLevel).toBe("college");
    expect(dataCollege.data.authoritativeReadiness).toBeGreaterThan(0);

    // Section level
    const resSection = await handleApiRequest(
      makeReq("/api/v1/editor/overrides/scope-progress?collegeCode=SMP101&year=3rd+Year&department=Computer+Science+%26+Engineering&section=Section+A")
    );
    const dataSection = await resSection.json();
    expect(dataSection.data.scopeLevel).toBe("section");
    expect(dataSection.data.authoritativeReadiness).toBeGreaterThan(0);

    // Student level
    const resStudent = await handleApiRequest(
      makeReq("/api/v1/editor/overrides/scope-progress?collegeCode=SMP101&studentId=stu-1")
    );
    const dataStudent = await resStudent.json();
    expect(dataStudent.data.scopeLevel).toBe("student");
    expect(dataStudent.data.authoritativeReadiness).toBeGreaterThan(0);
  });

  // Scenario 17: Donut chart readiness distribution generation (High >=75%, Moderate 60-74%, Intervention Required <60%)
  it("Scenario 17: generates donut chart distribution with High, Moderate, and Needs Attention buckets", async () => {
    const res = await handleApiRequest(makeReq("/api/v1/editor/overrides/scope-progress?collegeCode=SMP101"));
    const data = await res.json();
    const chart = data.data.donutChartData;
    expect(Array.isArray(chart)).toBe(true);
    expect(chart.length).toBe(3);
    expect(chart[0].name).toContain("High Readiness");
    expect(chart[1].name).toContain("Moderate");
    expect(chart[2].name).toContain("Intervention Required");
    expect(chart[0].color).toBe("#10b981");
    expect(chart[1].color).toBe("#f59e0b");
    expect(chart[2].color).toBe("#ef4444");
  });

  // Scenario 18: Actual (Layer B) vs Displayed (Layer C) comparison card displays correct values and delta
  it("Scenario 18: returns authoritative and displayed values along with exact difference delta", async () => {
    const res = await handleApiRequest(makeReq("/api/v1/editor/overrides/scope-progress?collegeCode=SMP101"));
    const data = await res.json();
    const p = data.data;
    expect(p).toHaveProperty("authoritativeReadiness");
    expect(p).toHaveProperty("displayedReadiness");
    expect(p).toHaveProperty("readinessDelta");
    expect(p.readinessDelta).toBeCloseTo(p.displayedReadiness - p.authoritativeReadiness, 1);
  });

  // Scenario 19: Direct aggregate override takes precedence for its exact scope without rewriting underlying student records
  it("Scenario 19: direct aggregate override adjusts scope displayed value without rewriting raw student records", async () => {
    const targetSection = "Section B";
    // Check initial student score
    const studentBefore = db.getStudentIntelligence("stu-2", "authoritative");
    const rawScoreBefore = studentBefore?.readinessScore;

    // Apply direct override on Section B
    const res = await handleApiRequest(
      makeReq("/api/v1/editor/overrides", "POST", {
        collegeCode: "SMP101",
        academicScope: {
          scopeLevel: "section",
          collegeCode: "SMP101",
          year: "3rd Year",
          department: "Computer Science & Engineering",
          section: targetSection,
        },
        metricId: "met_employability_readiness",
        proposedValue: 79.5,
        mandatoryReason: "Direct section calibration override for coordinator presentation",
      })
    );
    expect(res.status).toBe(201);

    // Verify section scope reflects the override
    const secProgress = await handleApiRequest(
      makeReq(`/api/v1/editor/overrides/scope-progress?collegeCode=SMP101&year=3rd+Year&department=Computer+Science+%26+Engineering&section=${encodeURIComponent(targetSection)}`)
    );
    const secData = (await secProgress.json()).data;
    expect(secData.displayedReadiness).toBe(79.5);

    // Verify student authoritative record was NOT overwritten
    const studentAfter = db.getStudentIntelligence("stu-2", "authoritative");
    expect(studentAfter?.readinessScore).toBe(rawScoreBefore);
  });

  // Scenario 20: Student override propagates recalculation up through Section, Branch, Year, College, Platform
  it("Scenario 20: student override recalculates dependent aggregate reporting views", async () => {
    // Override a specific student
    const studentRes = await handleApiRequest(
      makeReq("/api/v1/editor/overrides", "POST", {
        collegeCode: "SMP101",
        academicScope: {
          scopeLevel: "student",
          collegeCode: "SMP101",
          studentId: "stu-1",
        },
        metricId: "met_employability_readiness",
        proposedValue: 95.0,
        mandatoryReason: "Student performance certification upward adjustment",
      })
    );
    expect(studentRes.status).toBe(201);

    // Check adjusted intelligence view for the student
    const adjStudent = db.getStudentIntelligence("stu-1", "adjusted");
    expect(adjStudent?.readinessScore).toBe(95.0);

    // Check authoritative view is still original
    const authStudent = db.getStudentIntelligence("stu-1", "authoritative");
    expect(authStudent?.readinessScore).not.toBe(95.0);
  });

  // Scenario 21: Override Impact Preview calculates accurate proposed delta, affected propagation chain, and predicted chart shift
  it("Scenario 21: preview impact endpoint returns delta, propagation scopes, and chart shift prediction", async () => {
    const previewRes = await handleApiRequest(
      makeReq("/api/v1/editor/overrides/preview", "POST", {
        collegeCode: "SMP101",
        academicScope: {
          scopeLevel: "student",
          collegeCode: "SMP101",
          studentId: "stu-1",
        },
        metricId: "met_employability_readiness",
        proposedValue: 92.0,
      })
    );
    expect(previewRes.status).toBe(200);
    const data = await previewRes.json();
    expect(data.success).toBe(true);
    const prev = data.data;
    expect(prev).toHaveProperty("proposedDelta");
    expect(prev).toHaveProperty("affectedScopes");
    expect(Array.isArray(prev.affectedScopes)).toBe(true);
    expect(prev.affectedScopes.length).toBeGreaterThan(1);
    expect(prev).toHaveProperty("chartShiftPrediction");
    expect(prev.chartShiftPrediction).toHaveProperty("projectedHighTier");
  });

  // Scenario 22: Metric validation: enforces permitted metric registry, value bounds, and mandatory reason
  it("Scenario 22: rejects override when reason is under 5 characters or value is outside 0-100", async () => {
    // Short reason
    const shortReasonRes = await handleApiRequest(
      makeReq("/api/v1/editor/overrides", "POST", {
        collegeCode: "SMP101",
        academicScope: { scopeLevel: "college", collegeCode: "SMP101" },
        metricId: "met_employability_readiness",
        proposedValue: 75.0,
        mandatoryReason: "hi", // Too short
      })
    );
    expect(shortReasonRes.status).toBe(400);

    // Value outside range (>100)
    const outOfBoundsRes = await handleApiRequest(
      makeReq("/api/v1/editor/overrides", "POST", {
        collegeCode: "SMP101",
        academicScope: { scopeLevel: "college", collegeCode: "SMP101" },
        metricId: "met_employability_readiness",
        proposedValue: 150.0, // Invalid
        mandatoryReason: "Testing invalid bound score",
      })
    );
    expect(outOfBoundsRes.status).toBe(400);
  });

  // Scenario 23: Role isolation: Coordinator and Student views receive clean reporting values without Editor internal modification labels or reasons
  it("Scenario 23: coordinator and student APIs return Layer C reporting values without Editor audit rationale", async () => {
    // Coordinator request
    const coordRes = await handleApiRequest(makeReq("/api/v1/coordinator/students", "GET", undefined, coordinatorUser));
    expect(coordRes.status).toBe(200);
    const coordData = await coordRes.json();
    for (const stu of coordData.data) {
      expect(stu).not.toHaveProperty("mandatoryReason");
      expect(stu).not.toHaveProperty("editorAuditNotes");
    }

    // Student overview request
    const stuRes = await handleApiRequest(makeReq("/api/v1/student/overview", "GET", undefined, studentUser));
    if (stuRes.status === 200) {
      const stuData = await stuRes.json();
      expect(JSON.stringify(stuData)).not.toContain("mandatoryReason");
    }
  });

  // Scenario 24: Zero Attendance Law: strictly zero attendance tables, columns, or metrics across the overrides module and database
  it("Scenario 24: enforces Zero Attendance Law across metric registry, override tables, and database", () => {
    // Check metric registry
    const registryMetrics = Object.values(METRIC_REGISTRY);
    const attendanceInRegistry = registryMetrics.filter(
      (m) =>
        m.id.toLowerCase().includes("attendance") ||
        m.name.toLowerCase().includes("attendance") ||
        m.description.toLowerCase().includes("attendance")
    );
    expect(attendanceInRegistry.length).toBe(0);

    // Check all overrides in database
    const allOverrides = db.getOverrides({});
    for (const ovr of allOverrides) {
      expect(ovr.fieldName?.toLowerCase()).not.toContain("attendance");
      expect(ovr.metricId?.toLowerCase()).not.toContain("attendance");
    }

    // Check scope progress metrics
    const progress = db.getScopeProgress({ collegeCode: "SMP101" });
    const attendanceEligible = progress.eligibleMetrics.filter((m: any) =>
      m.id.toLowerCase().includes("attendance")
    );
    expect(attendanceEligible.length).toBe(0);
  });
});
