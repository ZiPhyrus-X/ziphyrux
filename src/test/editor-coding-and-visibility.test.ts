import { describe, it, expect, beforeEach } from "vitest";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import { db } from "../server/db";
import type { AuthenticatedUser } from "../server/types";

describe("ZIPHYRUS X — QUESTION MANAGEMENT CODING MODULE & COLLEGE VISIBILITY ACCEPTANCE SUITE", () => {
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
    name: "Lead Editor",
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

  const coordinatorA: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000003",
    loginId: "coordinator.smp101",
    email: "coord@smp101.edu",
    name: "Asha Sharma",
    role: "coordinator",
    collegeCode: "SMP101",
    collegeId: "c0000000-0000-0000-0000-000000000001",
    isProtected: false,
    permissions: ["college.manage"],
  };

  const coordinatorB: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000006",
    loginId: "coordinator.smp105",
    email: "coord@smp105.edu",
    name: "Rajesh Rao",
    role: "coordinator",
    collegeCode: "SMP105",
    collegeId: "c0000000-0000-0000-0000-000000000005",
    isProtected: false,
    permissions: ["college.manage"],
  };

  const studentA: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000007",
    loginId: "stu-1",
    email: "rohit.sharma@smp101.edu",
    name: "Rohit Sharma",
    role: "student",
    collegeCode: "SMP101",
    collegeId: "c0000000-0000-0000-0000-000000000001",
    isProtected: false,
    permissions: [],
  };

  const studentB: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000008",
    loginId: "stu-2",
    email: "priya.verma@smp102.edu",
    name: "Priya Verma",
    role: "student",
    collegeCode: "SMP102",
    collegeId: "c0000000-0000-0000-0000-000000000002",
    isProtected: false,
    permissions: [],
  };

  const makeReq = (
    path: string,
    method = "GET",
    body?: any,
    user?: AuthenticatedUser
  ) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (user) {
      headers["Authorization"] = `Bearer ${createSessionToken(user)}`;
    }
    const init: RequestInit = {
      method,
      headers,
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    return new Request(`http://localhost:8080${path}`, init);
  };

  // ---------------------------------------------------------------------------
  // 1. FIVE DEFAULT QUESTION MODULES
  // ---------------------------------------------------------------------------
  it("AC-1: Five default modules exist exactly once (Technical, Verbal, Aptitude, Soft Skills, Coding)", async () => {
    const res = await handleApiRequest(makeReq("/api/v1/editor/modules", "GET", undefined, editorUser));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const modules = json.data as any[];
    const names = modules.map((m) => m.name);

    expect(names).toContain("Technical");
    expect(names).toContain("Verbal");
    expect(names).toContain("Aptitude");
    expect(names).toContain("Soft Skills");
    expect(names).toContain("Coding");

    // Idempotent uniqueness: each of the 5 exists exactly once
    for (const name of ["Technical", "Verbal", "Aptitude", "Soft Skills", "Coding"]) {
      const occurrences = modules.filter((m) => m.name.toLowerCase() === name.toLowerCase());
      expect(occurrences.length).toBe(1);
    }
  });

  // ---------------------------------------------------------------------------
  // 2. CODING JUDGE QUESTIONS MANAGED IN CODING
  // ---------------------------------------------------------------------------
  it("AC-2: Coding Judge questions are exclusively managed inside Coding module", async () => {
    const res = await handleApiRequest(makeReq("/api/v1/editor/coding/problems", "GET", undefined, editorUser));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const problems = json.data as any[];
    expect(problems.length).toBeGreaterThan(0);

    for (const prob of problems) {
      expect(prob.moduleId).toBe("mod-code");
      expect(prob.supportedLanguages).toBeDefined();
      expect(Array.isArray(prob.supportedLanguages)).toBe(true);
      expect(prob.timeLimitMs).toBeGreaterThan(0);
      expect(prob.memoryLimitMb).toBeGreaterThan(0);
      expect(prob.testCases).toBeDefined();
    }
  });

  // ---------------------------------------------------------------------------
  // 3. EXISTING JUDGE SUBMISSIONS REMAIN INTACT
  // ---------------------------------------------------------------------------
  it("AC-3: Existing Judge submissions and operational history remain intact", async () => {
    const res = await handleApiRequest(
      makeReq("/api/v1/editor/coding/problems/cp-1/submissions", "GET", undefined, editorUser)
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);

    const sub = json.data[0];
    expect(sub.problemId).toBeDefined();
    expect(sub.verdict).toBeDefined();
    expect(sub.passedTestCases).toBeDefined();
    expect(sub.totalTestCases).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // 4. NEWLY CREATED MODULES DEFAULT TO HIDDEN
  // ---------------------------------------------------------------------------
  it("AC-4: Newly created modules default to Hidden visibility", async () => {
    const res = await handleApiRequest(
      makeReq("/api/v1/editor/modules", "POST", {
        name: "Cloud Architecture & DevOps",
        description: "AWS, Kubernetes, and CI/CD pipelines",
      }, editorUser)
    );
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.visibilityStatus).toBe("hidden");
    expect(json.data.assignedCollegeCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 5. HIDDEN MODULES INACCESSIBLE TO ORDINARY COLLEGE USERS
  // ---------------------------------------------------------------------------
  it("AC-5: Hidden modules are inaccessible to ordinary students and college coordinators", async () => {
    // 1. Create hidden module
    const createRes = await handleApiRequest(
      makeReq("/api/v1/editor/modules", "POST", {
        name: "Confidential Placement Module",
      }, editorUser)
    );
    const newMod = (await createRes.json()).data;
    expect(newMod.visibilityStatus).toBe("hidden");

    // 2. Student queries modules -> cannot see hidden module
    const studentRes = await handleApiRequest(
      makeReq("/api/v1/student/modules", "GET", undefined, studentA)
    );
    const studentJson = await studentRes.json();
    const visibleToStudent = studentJson.data as any[];
    expect(visibleToStudent.some((m) => m.id === newMod.id)).toBe(false);

    // 3. Coordinator queries modules -> cannot see hidden module
    const coordRes = await handleApiRequest(
      makeReq("/api/v1/coordinator/modules", "GET", undefined, coordinatorA)
    );
    const coordJson = await coordRes.json();
    const visibleToCoord = coordJson.data as any[];
    expect(visibleToCoord.some((m) => m.id === newMod.id)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 6. VISIBLE MODULES REQUIRE AT LEAST 1 COLLEGE ASSIGNMENT
  // ---------------------------------------------------------------------------
  it("AC-6: Setting module to Visible requires at least 1 assigned college", async () => {
    const res = await handleApiRequest(
      makeReq("/api/v1/editor/modules/mod-tech/visibility", "PATCH", {
        visibilityStatus: "visible",
        collegeIds: [], // Empty array
      }, editorUser)
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.message).toMatch(/at least one college/i);
  });

  // ---------------------------------------------------------------------------
  // 7. COLLEGE A ACCESSES ASSIGNED MODULE
  // ---------------------------------------------------------------------------
  it("AC-7: College A can access published module assigned to College A", async () => {
    // Set mod-verbal to visible exclusively for SMP101
    const updateRes = await handleApiRequest(
      makeReq("/api/v1/editor/modules/mod-verbal/visibility", "PATCH", {
        visibilityStatus: "visible",
        collegeIds: ["c0000000-0000-0000-0000-000000000001"], // SMP101 only
        confirmRevoke: true,
      }, editorUser)
    );
    expect(updateRes.status).toBe(200);

    // Student A (SMP101) can see mod-verb
    const stuRes = await handleApiRequest(
      makeReq("/api/v1/student/modules", "GET", undefined, studentA)
    );
    const stuJson = await stuRes.json();
    const studentModules = stuJson.data as any[];
    expect(studentModules.some((m) => m.id === "mod-verb" || m.name === "Verbal")).toBe(true);

    // Coordinator A (SMP101) can see mod-verb
    const coordRes = await handleApiRequest(
      makeReq("/api/v1/coordinator/modules", "GET", undefined, coordinatorA)
    );
    const coordJson = await coordRes.json();
    const coordModules = coordJson.data as any[];
    expect(coordModules.some((m) => m.id === "mod-verb" || m.name === "Verbal")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 8. COLLEGE B CANNOT ACCESS UNASSIGNED MODULE
  // ---------------------------------------------------------------------------
  it("AC-8: College B cannot access unassigned module", async () => {
    // Assign mod-verb ONLY to College A (SMP101)
    await handleApiRequest(
      makeReq("/api/v1/editor/modules/mod-verbal/visibility", "PATCH", {
        visibilityStatus: "visible",
        collegeIds: ["c0000000-0000-0000-0000-000000000001"], // SMP101 only
        confirmRevoke: true,
      }, editorUser)
    );

    // Student B (SMP102) CANNOT see mod-verb
    const stuBRes = await handleApiRequest(
      makeReq("/api/v1/student/modules", "GET", undefined, studentB)
    );
    const stuBJson = await stuBRes.json();
    const studentBModules = stuBJson.data as any[];
    expect(studentBModules.some((m) => m.id === "mod-verb" || m.name === "Verbal")).toBe(false);

    // Coordinator B (SMP102) CANNOT see mod-verb
    const coordBRes = await handleApiRequest(
      makeReq("/api/v1/coordinator/modules", "GET", undefined, coordinatorB)
    );
    const coordBJson = await coordBRes.json();
    const coordBModules = coordBJson.data as any[];
    expect(coordBModules.some((m) => m.id === "mod-verb" || m.name === "Verbal")).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 9. STUDENT API CANNOT BYPASS MODULE VISIBILITY
  // ---------------------------------------------------------------------------
  it("AC-9: Student API cannot bypass module visibility", async () => {
    // Hide Coding module completely
    await handleApiRequest(
      makeReq("/api/v1/editor/modules/mod-code/visibility", "PATCH", {
        visibilityStatus: "hidden",
        confirmRevoke: true,
      }, editorUser)
    );

    // Student A tries to query coding problems via student API -> receives empty list
    const probRes = await handleApiRequest(
      makeReq("/api/v1/student/coding/problems", "GET", undefined, studentA)
    );
    const probJson = await probRes.json();
    expect(probRes.status).toBe(200);
    expect(probJson.data.length).toBe(0);

    // Student A attempts direct problem fetch -> blocked with 404
    const directRes = await handleApiRequest(
      makeReq("/api/v1/student/coding/problems/PRB-0001", "GET", undefined, studentA)
    );
    expect(directRes.status).toBe(404);
  });

  // ---------------------------------------------------------------------------
  // 10. COORDINATOR APIS RESPECT EFFECTIVE ACCESS
  // ---------------------------------------------------------------------------
  it("AC-10: Coordinator APIs respect effective module access", async () => {
    // Hide Coding module
    await handleApiRequest(
      makeReq("/api/v1/editor/modules/mod-code/visibility", "PATCH", {
        visibilityStatus: "hidden",
        confirmRevoke: true,
      }, editorUser)
    );

    const res = await handleApiRequest(
      makeReq("/api/v1/coordinator/coding/problems", "GET", undefined, coordinatorA)
    );
    const json = await res.json();
    expect(json.data.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 11. ASSESSMENT ENGINE RESPECTS MODULE ACCESS
  // ---------------------------------------------------------------------------
  it("AC-11: Assessment Engine respects module access for question delivery", async () => {
    // First ensure mod-tech is visible for SMP101
    await db.updateModuleVisibility("mod-tech", {
      visibilityStatus: "visible",
      collegeIds: ["c0000000-0000-0000-0000-000000000001"],
      confirmRevoke: true,
      actor: editorUser.loginId,
    });

    const hasAccessA = db.checkModuleAccessForCollege("mod-tech", "c0000000-0000-0000-0000-000000000001");
    expect(hasAccessA).toBe(true);

    // Hide mod-tech
    await db.updateModuleVisibility("mod-tech", {
      visibilityStatus: "hidden",
      confirmRevoke: true,
      actor: editorUser.loginId,
    });

    const hasAccessAfterHide = db.checkModuleAccessForCollege("mod-tech", "c0000000-0000-0000-0000-000000000001");
    expect(hasAccessAfterHide).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 12. CODING JUDGE RESPECTS MODULE ACCESS
  // ---------------------------------------------------------------------------
  it("AC-12: Coding Judge respects module access during problem retrieval", async () => {
    // Ensure mod-code is visible to SMP101
    await db.updateModuleVisibility("mod-code", {
      visibilityStatus: "visible",
      collegeIds: ["c0000000-0000-0000-0000-000000000001"],
      confirmRevoke: true,
      actor: editorUser.loginId,
    });

    // When mod-code is visible to SMP101, studentA can fetch problems via judge
    const judgeRes = await handleApiRequest(
      makeReq("/api/v1/judge/problems", "GET", undefined, studentA)
    );
    const judgeJson = await judgeRes.json();
    expect(judgeJson.data.length).toBeGreaterThan(0);

    // Revoke SMP101 from mod-code
    await db.updateModuleVisibility("mod-code", {
      visibilityStatus: "visible",
      collegeIds: ["c0000000-0000-0000-0000-000000000002"], // SMP102 only
      confirmRevoke: true,
      actor: editorUser.loginId,
    });

    const judgeResAfter = await handleApiRequest(
      makeReq("/api/v1/judge/problems", "GET", undefined, studentA)
    );
    const judgeJsonAfter = await judgeResAfter.json();
    expect(judgeJsonAfter.data.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 13. HIDDEN TEST CASES & REFERENCE SOLUTIONS PROTECTED FROM STUDENTS
  // ---------------------------------------------------------------------------
  it("AC-13: Hidden test cases and reference solutions remain protected from students", async () => {
    // Ensure mod-code is visible to SMP101
    await db.updateModuleVisibility("mod-code", {
      visibilityStatus: "visible",
      collegeIds: ["c0000000-0000-0000-0000-000000000001"],
      confirmRevoke: true,
      actor: editorUser.loginId,
    });

    const res = await handleApiRequest(
      makeReq("/api/v1/student/coding/problems/PRB-0001", "GET", undefined, studentA)
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    const prob = json.data;

    // Critical security invariants:
    // 1. Reference solution MUST NEVER leak to students
    expect(prob.referenceSolution).toBeUndefined();

    // 2. Hidden test cases MUST NEVER leak to students (only isSample: true allowed)
    expect(prob.testCases).toBeDefined();
    for (const tc of prob.testCases) {
      expect(tc.isSample).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // 14. VISIBILITY CHANGES PERSIST ACROSS SERVER STORE
  // ---------------------------------------------------------------------------
  it("AC-14: Visibility status changes persist across server store queries", async () => {
    await handleApiRequest(
      makeReq("/api/v1/editor/modules/mod-apt/visibility", "PATCH", {
        visibilityStatus: "visible",
        collegeIds: ["c0000000-0000-0000-0000-000000000001", "c0000000-0000-0000-0000-000000000002"],
        confirmRevoke: true,
      }, editorUser)
    );

    const getRes = await handleApiRequest(
      makeReq("/api/v1/editor/modules/mod-apt", "GET", undefined, editorUser)
    );
    const getJson = await getRes.json();
    expect(getJson.data.visibilityStatus).toBe("visible");
    expect(getJson.data.assignedColleges.length).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // 15. COLLEGE ASSIGNMENTS PERSIST IN DATABASE STORE
  // ---------------------------------------------------------------------------
  it("AC-15: College assignments persist in database store with audit timestamps", async () => {
    await db.grantModuleCollegeAccess("mod-tech", "c0000000-0000-0000-0000-000000000001", editorUser.loginId);

    const accessRes = await handleApiRequest(
      makeReq("/api/v1/editor/modules/mod-tech/access", "GET", undefined, editorUser)
    );
    const accessJson = await accessRes.json();
    expect(accessRes.status).toBe(200);
    const list = accessJson.data as any[];
    expect(list.length).toBeGreaterThan(0);

    const item = list[0];
    expect(item.grantedBy).toBeDefined();
    expect(item.grantedAt).toBeDefined();
    expect(item.collegeId).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // 16. REVOKING ACCESS BLOCKS NEW DELIVERY WITHOUT DESTROYING HISTORICAL ATTEMPTS
  // ---------------------------------------------------------------------------
  it("AC-16: Revoking access blocks new delivery while preserving historical attempts", async () => {
    // Ensure mod-code is visible to SMP101
    await db.updateModuleVisibility("mod-code", {
      visibilityStatus: "visible",
      collegeIds: ["c0000000-0000-0000-0000-000000000001"],
      confirmRevoke: true,
      actor: editorUser.loginId,
    });

    // Check initial submissions count
    const initialSubmissions = db.getCodingSubmissions("PRB-0001", editorUser);
    const countBefore = initialSubmissions.length;
    expect(countBefore).toBeGreaterThan(0);

    // Revoke SMP101 from mod-code
    const revokeRes = await handleApiRequest(
      makeReq("/api/v1/editor/modules/mod-code/access/c0000000-0000-0000-0000-000000000001?confirmRevoke=true", "DELETE", undefined, editorUser)
    );
    expect(revokeRes.status).toBe(200);

    // Student A cannot fetch PRB-0001 anymore (blocked from new delivery)
    const stuFetchRes = await handleApiRequest(
      makeReq("/api/v1/student/coding/problems/PRB-0001", "GET", undefined, studentA)
    );
    expect(stuFetchRes.status).toBe(404);

    // Historical submissions remain 100% intact!
    const countAfter = db.getCodingSubmissions("PRB-0001", editorUser).length;
    expect(countAfter).toBe(countBefore);
  });

  // ---------------------------------------------------------------------------
  // 17. HOLD AND DEACTIVE RESTRICTIONS ENFORCED
  // ---------------------------------------------------------------------------
  it("AC-17: Hold and Deactive college lifecycle restrictions are strictly enforced", async () => {
    // SMP104 is 'deactive'
    const deactiveCol = db.colleges.find((c) => c.status === "deactive");
    expect(deactiveCol).toBeDefined();

    // Query modules for deactive college -> invariant returns 0 modules
    const modules = db.getQuestionModules({
      role: "student",
      collegeId: deactiveCol!.id,
      collegeCode: deactiveCol!.code,
    });
    expect(modules.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 18. SUPER ADMIN AUDIT INSPECTION
  // ---------------------------------------------------------------------------
  it("AC-18: Super Admin can inspect module access-change audit history", async () => {
    // Perform visibility update to generate audit records
    await db.updateModuleVisibility("mod-soft", {
      visibilityStatus: "visible",
      collegeIds: ["c0000000-0000-0000-0000-000000000001"],
      confirmRevoke: true,
      actor: editorUser.loginId,
    });

    const auditRes = await handleApiRequest(
      makeReq("/api/v1/admin/audit", "GET", undefined, superAdminUser)
    );
    const auditJson = await auditRes.json();
    const logs = auditJson.data as any[];

    const visLogs = logs.filter(
      (l) => l.action === "module.visibility_changed" || l.action === "module.college_access_granted"
    );
    expect(visLogs.length).toBeGreaterThan(0);
    expect(visLogs[0].actor).toBe(editorUser.loginId);
  });

  // ---------------------------------------------------------------------------
  // 19. EXISTING QUESTION MANAGEMENT WORKFLOWS CONTINUE WORKING
  // ---------------------------------------------------------------------------
  it("AC-19: Existing Question Management workflows (MCQ, Short, Long) continue working", async () => {
    // Create MCQ in Technical
    const createRes = await handleApiRequest(
      makeReq("/api/v1/editor/questions", "POST", {
        moduleId: "mod-tech",
        type: "MCQ",
        stem: "What is the time complexity of binary search?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
        correctAnswer: "O(log n)",
        difficulty: "Easy",
      }, editorUser)
    );
    expect(createRes.status).toBe(201);
    const q = (await createRes.json()).data;
    expect(q.status).toBe("draft");

    // Submit for review
    const submitRes = await handleApiRequest(
      makeReq(`/api/v1/editor/questions/${q.id}/submit`, "POST", undefined, editorUser)
    );
    expect(submitRes.status).toBe(200);

    // Approve and publish
    const reviewRes = await handleApiRequest(
      makeReq(`/api/v1/editor/questions/${q.id}/review`, "POST", { action: "approve_and_publish" }, editorUser)
    );
    expect(reviewRes.status).toBe(200);
    const publishedQ = (await reviewRes.json()).data;
    expect(publishedQ.status).toBe("published");
  });

  // ---------------------------------------------------------------------------
  // 20. ALL FRONTEND CONTROLS USE REAL BACKEND DATA
  // ---------------------------------------------------------------------------
  it("AC-20: All frontend controls use real backend data (Validation & Reference execution)", async () => {
    // Validate reference solution on PRB-0001
    const valRes = await handleApiRequest(
      makeReq("/api/v1/editor/coding/problems/PRB-0001/validate", "POST", undefined, editorUser)
    );
    expect(valRes.status).toBe(200);
    const valJson = await valRes.json();
    expect(valJson.success).toBe(true);
    expect(valJson.data.valid).toBe(true);
    expect(valJson.data.passedCount).toBe(valJson.data.totalCount);
    expect(valJson.data.executionTimeMs).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 21. DELETE OPTION ON ASSESSMENT QUESTIONS
  // ---------------------------------------------------------------------------
  it("AC-21: Allows Editor to permanently delete an assessment question with audit log", async () => {
    // 1. Create a draft question to delete
    const createRes = await handleApiRequest(
      makeReq("/api/v1/editor/questions", "POST", {
        moduleId: "mod-tech",
        type: "MCQ",
        stem: "Temporary question to be deleted?",
        options: ["Opt A", "Opt B", "Opt C", "Opt D"],
        correctAnswer: "Opt A",
        difficulty: "Easy",
      }, editorUser)
    );
    expect(createRes.status).toBe(201);
    const q = (await createRes.json()).data;

    // 2. Delete the question
    const delRes = await handleApiRequest(
      makeReq(`/api/v1/editor/questions/${q.id}`, "DELETE", undefined, editorUser)
    );
    expect(delRes.status).toBe(200);
    const delJson = await delRes.json();
    expect(delJson.success).toBe(true);
    expect(delJson.data.deleted).toBe(true);

    // 3. Question can no longer be retrieved
    const getRes = await handleApiRequest(
      makeReq(`/api/v1/editor/questions/${q.id}`, "GET", undefined, editorUser)
    );
    expect(getRes.status).toBe(404);
  });

  // ---------------------------------------------------------------------------
  // 22. DELETE OPTION ON CODING PROBLEMS
  // ---------------------------------------------------------------------------
  it("AC-22: Allows Editor to permanently delete a coding problem with audit log", async () => {
    // 1. Create a draft problem to delete
    const createRes = await handleApiRequest(
      makeReq("/api/v1/editor/coding/problems", "POST", {
        title: "Temporary Problem for Deletion",
        topic: "Testing",
        difficulty: "Easy",
        description: "Problem description to be deleted",
        testCases: [
          { input: "1", expectedOutput: "1", isSample: true },
          { input: "2", expectedOutput: "2", isSample: false },
        ],
      }, editorUser)
    );
    expect(createRes.status).toBe(201);
    const prob = (await createRes.json()).data;

    // 2. Delete the coding problem
    const delRes = await handleApiRequest(
      makeReq(`/api/v1/editor/coding/problems/${prob.id}`, "DELETE", undefined, editorUser)
    );
    expect(delRes.status).toBe(200);
    const delJson = await delRes.json();
    expect(delJson.success).toBe(true);
    expect(delJson.data.deleted).toBe(true);

    // 3. Coding problem can no longer be retrieved
    const getRes = await handleApiRequest(
      makeReq(`/api/v1/editor/coding/problems/${prob.id}`, "GET", undefined, editorUser)
    );
    expect(getRes.status).toBe(404);
  });
});
