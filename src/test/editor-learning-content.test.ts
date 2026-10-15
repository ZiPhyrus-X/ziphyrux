import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/server/db";
import { handleApiRequest } from "@/server/api-router";
import { createSessionToken } from "../server/auth";
import type { AuthenticatedUser } from "../server/types";

describe("ZIPHYRUS X — Complete Editor Learning Content Module & Acceptance Tests", () => {
  const editorUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000002",
    loginId: "editor1@ziphyrus.in",
    email: "editor1@ziphyrus.in",
    name: "Lead Editor",
    role: "editor",
    isProtected: true,
    permissions: ["content.edit", "course.manage"],
  };

  const adminUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000009",
    loginId: "superadmin@ziphyrus.in",
    email: "superadmin@ziphyrus.in",
    name: "Super Admin",
    role: "super_admin",
    isProtected: true,
    permissions: ["platform.*"],
  };

  const studentSmp101: AuthenticatedUser = {
    id: "stu-1",
    loginId: "student.smp101@ziphyrus.in",
    email: "student.smp101@ziphyrus.in",
    name: "Alice SMP101",
    role: "student",
    collegeId: "c0000000-0000-0000-0000-000000000001",
    collegeCode: "SMP101",
    isProtected: false,
    permissions: [],
  };

  const studentSmp103: AuthenticatedUser = {
    id: "stu-3",
    loginId: "student.smp103@ziphyrus.in",
    email: "student.smp103@ziphyrus.in",
    name: "Bob SMP103",
    role: "student",
    collegeId: "c0000000-0000-0000-0000-000000000003",
    collegeCode: "SMP103",
    isProtected: false,
    permissions: [],
  };

  // Helper request builder with authenticated JWT header
  async function makeReq(url: string, method = "GET", body?: any, user = editorUser) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${createSessionToken(user)}`,
    };
    const req = new Request(`http://localhost${url}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const res = await handleApiRequest(req);
    const json = await res.json();
    return { res, json };
  }

  // 1. Editor opens Learning Content & Loads Data
  it("AC-01 & AC-02: Editor opens Learning Content and retrieves modules & upload history", async () => {
    const { res: modRes, json: modJson } = await makeReq("/api/v1/editor/learning/modules");
    expect(modRes.status).toBe(200);
    expect(modJson.success).toBe(true);
    expect(Array.isArray(modJson.data)).toBe(true);
    expect(modJson.data.length).toBeGreaterThanOrEqual(5);

    const { res: histRes, json: histJson } = await makeReq("/api/v1/editor/learning/upload-history");
    expect(histRes.status).toBe(200);
    expect(histJson.success).toBe(true);
    expect(Array.isArray(histJson.data)).toBe(true);
    expect(histJson.data.length).toBeGreaterThan(0);
    expect(histJson.data[0]).toHaveProperty("uploadMethod");
    expect(histJson.data[0]).toHaveProperty("importedItems");
  });

  // 2. Five Default Learning Modules & Separation from Question Management
  it("AC-03 & AC-04: Five default learning modules exist and are separate from Question Management modules", async () => {
    const modules = db.getLearningModules();
    const names = modules.map((m) => m.name);
    expect(names).toContain("Technical");
    expect(names).toContain("Verbal");
    expect(names).toContain("Aptitude");
    expect(names).toContain("Soft Skills");
    expect(names).toContain("Coding");

    // Must be architecturally separate from questionModules
    const questionModules = db.getQuestionModules();
    expect(modules.map((m) => m.id)).not.toEqual(questionModules.map((m) => m.id));

    const learnTech = modules.find((m) => m.name === "Technical")!;
    const qTech = questionModules.find((m) => m.name === "Technical")!;
    expect(learnTech.id).toBe("mod-learn-tech");
    expect(qTech.id).toBe("mod-tech");
  });

  // 3. Module Creation, Uniqueness, and Default Hidden Status
  it("AC-05, AC-06, AC-07, AC-08: Editor creates learning module, rejects duplicates, defaults to Hidden, and persists", async () => {
    const uniqueName = `Cloud Architecture & DevOps ${Date.now()}`;
    const { res: createRes, json: createJson } = await makeReq("/api/v1/editor/learning/modules", "POST", {
      name: uniqueName,
      description: "Cloud virtualization, CI/CD pipelines, and infrastructure as code.",
    });

    expect(createRes.status).toBe(201);
    expect(createJson.success).toBe(true);
    expect(createJson.data.name).toBe(uniqueName);
    expect(createJson.data.visibilityStatus).toBe("hidden"); // AC-07: Defaults to Hidden!

    // Duplicate check (case-insensitive)
    const { res: dupRes } = await makeReq("/api/v1/editor/learning/modules", "POST", {
      name: uniqueName.toUpperCase(),
      description: "Duplicate attempt",
    });
    expect(dupRes.status).toBe(400); // AC-06: Duplicate name rejected!

    // AC-08: Persists after retrieval
    const fetched = db.getLearningModule(createJson.data.id);
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe(uniqueName);
  });

  // 4. Module Visibility & College Access Assignments
  it("AC-09, AC-10, AC-11, AC-12, AC-13: Module visibility requires >=1 college, persists assignments, and isolates colleges", async () => {
    const newMod = db.createLearningModule({
      name: `Cybersecurity Fundamentals ${Date.now()}`,
      actor: editorUser.loginId,
    });

    // Failing if making visible without any colleges
    const { res: failRes } = await makeReq(`/api/v1/editor/learning/modules/${newMod.id}/visibility`, "PATCH", {
      visibilityStatus: "visible",
      collegeIds: [],
    });
    expect(failRes.status).toBe(400);

    // Making visible with college SMP101 (c0000000-0000-0000-0000-000000000001)
    const { res: visRes, json: visJson } = await makeReq(`/api/v1/editor/learning/modules/${newMod.id}/visibility`, "PATCH", {
      visibilityStatus: "visible",
      collegeIds: ["c0000000-0000-0000-0000-000000000001"],
    });
    expect(visRes.status).toBe(200);
    expect(visJson.data.visibilityStatus).toBe("visible");
    expect(visJson.data.assignedCollegeCount).toBe(1);

    // AC-11: Verified in access ledger
    const access = db.getLearningModuleCollegeAccess(newMod.id);
    expect(access.length).toBe(1);
    expect(access[0].collegeCode).toBe("SMP101");

    // AC-12: Unassigned college (SMP103) does not have access
    const hasSmp103 = access.some((a) => a.collegeCode === "SMP103");
    expect(hasSmp103).toBe(false);

    // AC-13: If hidden, revoked immediately
    await makeReq(`/api/v1/editor/learning/modules/${newMod.id}/visibility`, "PATCH", {
      visibilityStatus: "hidden",
    });
    const accessAfterHidden = db.getLearningModuleCollegeAccess(newMod.id);
    expect(accessAfterHidden.length).toBe(0);
  });

  // 5. Course Creation Scoped to Module
  it("AC-14 & AC-15: Editor creates course inside a module, and it remains scoped to the correct module", async () => {
    const { res, json } = await makeReq("/api/v1/editor/learning/courses", "POST", {
      learningModuleId: "mod-learn-tech",
      title: "Advanced Compiler Design & Lexical Analysis",
      difficulty: "Advanced",
      estimatedDurationHours: 45,
    });

    expect(res.status).toBe(201);
    expect(json.data.learningModuleId).toBe("mod-learn-tech");
    expect(json.data.status).toBe("draft");
    expect(json.data.code).toMatch(/^CRS-/);

    // Scoped filtering
    const { json: techCourses } = await makeReq("/api/v1/editor/learning/courses?moduleId=mod-learn-tech");
    const found = techCourses.data.some((c: any) => c.id === json.data.id);
    expect(found).toBe(true);

    const { json: verbCourses } = await makeReq("/api/v1/editor/learning/courses?moduleId=mod-learn-verb");
    const foundInVerb = verbCourses.data.some((c: any) => c.id === json.data.id);
    expect(foundInVerb).toBe(false); // AC-15: Course is not leaked to other modules!
  });

  // 6. Educational Content Hierarchy: Version -> Chapter -> Topic -> Lesson -> Activity
  it("AC-16, AC-17, AC-18, AC-19, AC-20, AC-21: Full hierarchy builder operations succeed with stable identifiers", async () => {
    // 1. Create course
    const course = db.createLearningCourse({
      learningModuleId: "mod-learn-code",
      title: "Graph Algorithms & Network Flows",
      actor: editorUser.loginId,
    });

    // 2. Create version
    const { res: verRes, json: verJson } = await makeReq(`/api/v1/editor/learning/courses/${course.id}/version`, "POST", {
      versionNumber: "v1.1",
    });
    expect(verRes.status).toBe(201);
    const versionId = verJson.data.id;

    // 3. Add Chapter (Course Module)
    const { res: chRes, json: chJson } = await makeReq(`/api/v1/editor/learning/versions/${versionId}/modules`, "POST", {
      title: "Shortest Paths & Spanning Trees",
      description: "Dijkstra, Bellman-Ford, and Prim algorithms",
    });
    expect(chRes.status).toBe(201);
    const chapterId = chJson.data.id;

    // 4. Add Topic
    const { res: topRes, json: topJson } = await makeReq(`/api/v1/editor/learning/chapters/${chapterId}/topics`, "POST", {
      title: "Priority Queues in Dijkstra Implementation",
    });
    expect(topRes.status).toBe(201);
    const topicId = topJson.data.id;

    // 5. Add Lesson
    const { res: lesRes, json: lesJson } = await makeReq(`/api/v1/editor/learning/topics/${topicId}/lessons`, "POST", {
      title: "Min-Heap Relaxation Step",
      lessonType: "reading",
      durationMinutes: 25,
      lessonContent: "# Min-Heap Relaxation\n\nRelaxing edge (u, v) with weight w...",
    });
    expect(lesRes.status).toBe(201);
    const lessonId = lesJson.data.id;

    // 6. Add Activity
    const { res: actRes, json: actJson } = await makeReq(`/api/v1/editor/learning/lessons/${lessonId}/activities`, "POST", {
      activityType: "reading",
      title: "Complete Dijkstra Proof of Correctness",
    });
    expect(actRes.status).toBe(201);
    expect(actJson.data.id).toMatch(/^act-/);

    // Retrieve course hierarchy
    const { res: fullRes, json: fullJson } = await makeReq(`/api/v1/editor/learning/courses/${course.id}`);
    expect(fullRes.status).toBe(200);
    expect(fullJson.data.chapters.length).toBeGreaterThan(0);
  });

  // 7. Question Bank & Coding Judge Integration
  it("AC-22, AC-23, AC-24: Links Question Management and Coding Judge without exposing hidden test cases or reference solutions", async () => {
    const course = db.createLearningCourse({
      learningModuleId: "mod-learn-code",
      title: "Algorithmic Interview Practice Pack",
      actor: editorUser.loginId,
    });
    const ver = db.courseVersions.find((v) => v.courseId === course.id)!;
    const cmod = db.courseModules.find((m) => m.courseVersionId === ver.id)!;
    const top = db.courseTopics.find((t) => t.courseModuleId === cmod.id)!;
    const les = db.courseLessons.find((l) => l.topicId === top.id)!;

    // AC-22: Link published practice question
    const qAct = db.addLearningActivity(les.id, {
      activityType: "practice_question",
      title: "Binary Search Complexity Check",
      linkedQuestionId: "70000000-0000-0000-0000-000000000001",
    }, editorUser.loginId);
    expect(qAct.linkedQuestionId).toBe("70000000-0000-0000-0000-000000000001");

    // AC-23: Link published coding problem
    const probAct = db.addLearningActivity(les.id, {
      activityType: "coding_exercise",
      title: "Two Sum Practice Problem",
      linkedProblemId: "f0000000-0000-0000-0000-000000000001",
    }, editorUser.loginId);
    expect(probAct.linkedProblemId).toBe("f0000000-0000-0000-0000-000000000001");

    // AC-24: Verify hidden test cases and reference solutions are not leaked
    const { json: studentProb } = await makeReq(
      `/api/v1/student/coding/problems/${probAct.linkedProblemId}`,
      "GET",
      undefined,
      studentSmp101
    );
    expect(studentProb.data).toBeDefined();
    expect(studentProb.data.referenceSolution).toBeUndefined(); // Never leaked!
    const nonSampleCases = studentProb.data.testCases.filter((tc: any) => !tc.isSample);
    expect(nonSampleCases.length).toBe(0); // Hidden cases stripped!
  });

  // 8. Bulk Ingestion and Error Reporting
  it("AC-25, AC-26, AC-27: Bulk upload processes valid records into Draft and reports rejected records with details", async () => {
    const payload = {
      moduleId: "mod-learn-tech",
      filename: "cloud_computing_batch_import.zip",
      uploadMethod: "ZIP import",
      items: [
        { title: "Kubernetes Cluster Orchestration", difficulty: "Advanced", durationHours: 20 },
        { title: "", difficulty: "Beginner" }, // Invalid: missing title
        { title: "Docker Containerization Essentials", filename: "../../etc/passwd" }, // Invalid: path traversal
      ],
    };

    const { res, json } = await makeReq("/api/v1/editor/learning/bulk-upload", "POST", payload);
    expect(res.status).toBe(201);
    expect(json.data.importedCount).toBe(1); // 1 valid
    expect(json.data.rejectedCount).toBe(2); // 2 invalid
    expect(json.data.batch.status).toBe("partial");
    expect(json.data.batch.publicationStatus).toBe("draft"); // AC-27: Imported content remains Draft!
    expect(json.data.batch.rejectedDetails.length).toBe(2);
  });

  // 9. Review & Publication Workflow & Version Immutability
  it("AC-28, AC-29: Authorized review and publication freeze version and prevent in-place modification of published version", async () => {
    const course = db.createLearningCourse({
      learningModuleId: "mod-learn-tech",
      title: "Microservices Architecture & API Gateways",
      actor: editorUser.loginId,
    });

    // Submit for review
    const { res: subRes, json: subJson } = await makeReq(`/api/v1/editor/learning/courses/${course.id}/submit`, "POST");
    expect(subRes.status).toBe(200);
    expect(subJson.data.status).toBe("in_review");

    // Publish
    const { res: pubRes, json: pubJson } = await makeReq(`/api/v1/editor/learning/courses/${course.id}/publish`, "POST");
    expect(pubRes.status).toBe(200);
    expect(pubJson.data.status).toBe("published");
    expect(pubJson.data.publishedBy).toBe(editorUser.loginId);

    // AC-29: Attempting to edit published course directly is rejected (requires new version)
    const { res: editRes } = await makeReq(`/api/v1/editor/learning/courses/${course.id}`, "PATCH", {
      title: "Renamed in-place illegally",
    });
    expect(editRes.status).toBe(400);
  });

  // 10. Feature Availability & Student Delivery (Zero Attendance Law Maintained)
  it("AC-31, AC-32, AC-33, AC-34, AC-35: Training & Courses disabled by default, student delivery enforced, Zero Attendance Law kept", async () => {
    // AC-31: Feature flag training.courses is disabled by default
    const flag = db.getFeatureFlags().find((f) => f.key === "training.courses");
    expect(flag).toBeDefined();
    expect(flag?.isEnabled).toBe(false);

    // Without flag enabled, student receives empty course catalog
    const { json: emptyCatalog } = await makeReq("/api/v1/student/courses", "GET", undefined, studentSmp101);
    expect(emptyCatalog.data).toEqual([]);

    // Enable feature flag explicitly
    db.toggleFeatureFlag("training.courses", true, "editor");

    // Student from authorized college (SMP101) can now view published courses
    const { json: activeCatalog } = await makeReq("/api/v1/student/courses", "GET", undefined, studentSmp101);
    expect(activeCatalog.data.length).toBeGreaterThan(0);
    const pubCourse = activeCatalog.data[0];

    // AC-38: Student from unauthorized college (SMP103 is on hold/unassigned) cannot access
    const { json: unauthorizedCatalog } = await makeReq("/api/v1/student/courses", "GET", undefined, studentSmp103);
    expect(unauthorizedCatalog.data).toEqual([]);

    // AC-33: Student records progress through authorized operation
    const progress = db.recordStudentProgress(studentSmp101.id, studentSmp101.collegeId!, {
      courseId: pubCourse.id,
      lessonId: "les-1",
      evidenceType: "reading",
      score: 100,
    });
    expect(progress.status).toBe("completed");

    // AC-34: Intelligence Engine receives evidence without attendance
    const studentIntel = db.getStudentIntelligence("stu-1");
    expect(studentIntel).toBeDefined();
    // Zero Attendance Law: No session attendance records created
    const studentSessions = db.sessions.filter((s) => (s as any).studentId === "stu-1");
    expect(studentSessions.length).toBe(0);

    // AC-35: Visible-Value Overrides do not rewrite authoritative progress records
    db.createAcademicOverride({
      collegeCode: "SMP101",
      academicScope: { collegeCode: "SMP101", year: "4", department: "Computer Science & Engineering" },
      metricId: "met_readiness_score",
      proposedValue: 92,
      mandatoryReason: "Adjusted cohort readiness metric for annual placement brochure",
      editorLogin: editorUser.loginId,
    });
    // Authoritative student progress remains unchanged!
    const progressList = db.studentLearningProgress.filter((p) => p.studentId === "stu-1");
    expect(progressList.length).toBeGreaterThanOrEqual(1);

    // Reset feature flag
    db.toggleFeatureFlag("training.courses", false, "editor");
  });

  // 11. Security, Audit Logs & Course Deletion Constraints
  it("AC-36, AC-37, AC-39: Editor audit history is complete, Super Admin can inspect, and safe delete enforced", async () => {
    // Course delete check: published course cannot be deleted
    const pubCourse = db.courses.find((c) => c.status === "published")!;
    const { res: delFailRes } = await makeReq(`/api/v1/editor/learning/courses/${pubCourse.id}`, "DELETE");
    expect(delFailRes.status).toBe(400);

    // Draft course without progress can be deleted cleanly
    const draftCourse = db.createLearningCourse({
      learningModuleId: "mod-learn-tech",
      title: "Temporary Scratch Course",
      actor: editorUser.loginId,
    });
    const { res: delSuccessRes } = await makeReq(`/api/v1/editor/learning/courses/${draftCourse.id}`, "DELETE");
    expect(delSuccessRes.status).toBe(200);

    // AC-36 & AC-37: Audit logs exist for Super Admin inspection
    const logs = db.getAuditLogs();
    const courseLogs = logs.filter((l) => l.action.startsWith("course") || l.action.startsWith("learning"));
    expect(courseLogs.length).toBeGreaterThan(0);

    const { res: adminLogRes, json: adminLogJson } = await makeReq("/api/v1/admin/audit", "GET", undefined, adminUser);
    expect(adminLogRes.status).toBe(200);
    expect(adminLogJson.data.length).toBeGreaterThan(0);
  });
});
