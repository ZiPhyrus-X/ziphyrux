import { describe, it, expect } from "vitest";
import { db } from "@/server/db";
import { handleApiRequest } from "@/server/api-router";
import { createSessionToken } from "../server/auth";
import type { AuthenticatedUser } from "../server/types";

describe("ZIPHYRUS X — Assessment Content Modernization & Bidirectional Module Deletion", () => {
  const editorUser: AuthenticatedUser = {
    id: "d0000000-0000-0000-0000-000000000002",
    loginId: "editor1@ziphyrus.in",
    email: "editor1@ziphyrus.in",
    name: "Lead Editor",
    role: "editor",
    isProtected: true,
    permissions: ["content.edit", "course.manage", "assessment.manage"],
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
    const json = await res.json().catch(() => ({}));
    return { res, json };
  }

  // 1. Assessment Modules Listing & Default Modules
  it("TC-01: Retrieves assessment modules and confirms default persistent modules exist", async () => {
    const { res, json } = await makeReq("/api/v1/editor/assessment/modules");
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);

    const defaultDomains = ["Technical", "Aptitude", "Verbal", "Soft Skills", "Coding"];
    for (const domain of defaultDomains) {
      const found = json.data.find((m: any) => m.domain === domain);
      expect(found).toBeDefined();
      expect(found.visibilityStatus).toBe("visible");
      expect(found.status).toBe("active");
    }
  });

  // 2. Create Assessment Module & Unique Constraint
  it("TC-02: Editor creates an assessment module, defaults to hidden, and enforces unique normalized name", async () => {
    const modPayload = {
      name: "Cybersecurity & Cryptography Diagnostic",
      domain: "Technical",
      description: "Network security, public key cryptography, and vulnerability assessment benchmarks.",
    };

    const { res: createRes, json: createJson } = await makeReq(
      "/api/v1/editor/assessment/modules",
      "POST",
      modPayload
    );
    expect(createRes.status).toBe(201);
    expect(createJson.success).toBe(true);
    expect(createJson.data.visibilityStatus).toBe("hidden");
    expect(createJson.data.name).toBe(modPayload.name);

    // Reject duplicate name
    const { res: dupRes, json: dupJson } = await makeReq(
      "/api/v1/editor/assessment/modules",
      "POST",
      modPayload
    );
    expect(dupRes.status).toBe(400);
    expect(dupJson.success).toBe(false);
  });

  // 3. Update Assessment Module Visibility
  it("TC-03: Manages assessment module visibility, requiring >= 1 college and persisting assignments", async () => {
    const newMod = db.createAssessmentModule(
      {
        name: "DevOps & Cloud Architecture",
        domain: "Technical",
        description: "CI/CD pipelines, Kubernetes clustering, and Terraform provisioning.",
      },
      editorUser.loginId
    );

    // Rejects visible with empty colleges
    const { res: emptyRes, json: emptyJson } = await makeReq(
      `/api/v1/editor/assessment/modules/${newMod.id}/visibility`,
      "PATCH",
      { visibilityStatus: "visible", collegeIds: [] }
    );
    expect(emptyRes.status).toBe(400);
    expect(emptyJson.success).toBe(false);

    // Grants access to SMP101 & SMP102
    const { res: okRes, json: okJson } = await makeReq(
      `/api/v1/editor/assessment/modules/${newMod.id}/visibility`,
      "PATCH",
      {
        visibilityStatus: "visible",
        collegeIds: ["c0000000-0000-0000-0000-000000000001", "c0000000-0000-0000-0000-000000000002"],
      }
    );
    expect(okRes.status).toBe(200);
    expect(okJson.success).toBe(true);
    expect(okJson.data.visibilityStatus).toBe("visible");
    expect(okJson.data.assignedCollegeCount).toBe(2);
  });

  // 4. Create and List Assessments Scoped to Module
  it("TC-04: Creates assessment blueprint scoped to assessment module and supports filtering", async () => {
    const techMod = db.assessmentModules.find((m) => m.id === "mod-asm-tech")!;

    const asmPayload = {
      title: "Distributed Consensus Benchmark 2026",
      domain: "Technical",
      moduleId: techMod.id,
      difficulty: "Advanced",
      durationMinutes: 90,
      totalMarks: 100,
      passingMarks: 50,
      questionsCount: 20,
      description: "Evaluating Raft, Paxos, and Byzantine Fault Tolerance understanding.",
    };

    const { res: createRes, json: createJson } = await makeReq(
      "/api/v1/editor/assessments",
      "POST",
      asmPayload
    );
    expect(createRes.status).toBe(201);
    expect(createJson.success).toBe(true);
    expect(createJson.data.moduleId).toBe(techMod.id);
    expect(createJson.data.code).toMatch(/^ASM-\d+$/);

    // List assessments filtered by target module
    const { res: listRes, json: listJson } = await makeReq(
      `/api/v1/editor/assessments?moduleId=${techMod.id}`
    );
    expect(listRes.status).toBe(200);
    expect(listJson.success).toBe(true);
    expect(listJson.data.some((a: any) => a.id === createJson.data.id)).toBe(true);
  });

  // 5. Delete Individual Assessment
  it("TC-05: Deletes individual assessment blueprint and logs audit trail", async () => {
    const createdAsm = db.createAssessment({
      title: "Scratch Throwaway Diagnostic",
      domain: "Aptitude",
      questionsCount: 15,
    });

    const { res: delRes, json: delJson } = await makeReq(
      `/api/v1/editor/assessments/${createdAsm.id}`,
      "DELETE"
    );
    expect(delRes.status).toBe(200);
    expect(delJson.success).toBe(true);

    // Confirm deleted from store
    const checkAsm = db.assessments.find((a) => a.id === createdAsm.id);
    expect(checkAsm).toBeUndefined();

    // Verify audit log
    const auditLogs = db.getAuditLogs();
    const hasLog = auditLogs.some((l) => l.action === "assessment.delete" && l.target === createdAsm.id);
    expect(hasLog).toBe(true);
  });

  // 6. Permanent Assessment Module Deletion (Cascading)
  it("TC-06: Permanently deletes assessment module, cascading to child assessments and college access", async () => {
    // Create an assessment module
    const customMod = db.createAssessmentModule(
      {
        name: "Temporary Quantum Computing Diagnostic",
        domain: "Technical",
        description: "Qubits and quantum gates evaluation.",
      },
      editorUser.loginId
    );

    // Grant visibility
    db.updateAssessmentModuleVisibility(
      customMod.id,
      {
        visibilityStatus: "visible",
        collegeIds: ["c0000000-0000-0000-0000-000000000001"],
        actor: editorUser.loginId,
      }
    );

    // Create child assessment inside it
    const childAsm = db.createAssessment({
      title: "Quantum Superposition & Entanglement Test",
      domain: "Technical",
      moduleId: customMod.id,
      questionsCount: 10,
    });

    // Execute deletion via API
    const { res: delRes, json: delJson } = await makeReq(
      `/api/v1/editor/assessment/modules/${customMod.id}`,
      "DELETE"
    );
    expect(delRes.status).toBe(200);
    expect(delJson.success).toBe(true);
    expect(delJson.data.id).toBe(customMod.id);

    // Verify module is permanently gone
    const modCheck = db.assessmentModules.find((m) => m.id === customMod.id);
    expect(modCheck).toBeUndefined();

    // Verify child assessment was cascaded and removed
    const asmCheck = db.assessments.find((a) => a.id === childAsm.id);
    expect(asmCheck).toBeUndefined();

    // Verify college access entries were removed
    const accessCheck = db.assessmentModuleCollegeAccess.filter((a) => a.moduleId === customMod.id);
    expect(accessCheck.length).toBe(0);

    // Verify audit log
    const auditLogs = db.getAuditLogs();
    const hasLog = auditLogs.some(
      (l) => l.action === "assessment_module.delete" && l.target === customMod.id && l.severity === "warning"
    );
    expect(hasLog).toBe(true);
  });

  // 7. Permanent Learning Module Deletion (Cascading)
  it("TC-07: Permanently deletes learning module, cascading to child courses and college access", async () => {
    // Create a learning module
    const customLearnMod = db.createLearningModule({
      name: "Temporary Mobile App Development Track",
      description: "Flutter and React Native curriculum.",
      actor: editorUser.loginId,
    });

    // Grant visibility
    db.updateLearningModuleVisibility(customLearnMod.id, {
      visibilityStatus: "visible",
      collegeIds: ["c0000000-0000-0000-0000-000000000001"],
      actor: editorUser.loginId,
    });

    // Create child course inside it
    const childCourse = db.createLearningCourse({
      learningModuleId: customLearnMod.id,
      code: "CRS-MOB101",
      title: "Cross-Platform Mobile Foundations",
      difficulty: "Beginner",
      estimatedDurationHours: 20,
      actor: editorUser.loginId,
    });

    // Execute deletion via API
    const { res: delRes, json: delJson } = await makeReq(
      `/api/v1/editor/learning/modules/${customLearnMod.id}`,
      "DELETE"
    );
    expect(delRes.status).toBe(200);
    expect(delJson.success).toBe(true);
    expect(delJson.data.id).toBe(customLearnMod.id);

    // Verify module is permanently gone
    const modCheck = db.learningModules.find((m) => m.id === customLearnMod.id);
    expect(modCheck).toBeUndefined();

    // Verify child course was cascaded and removed
    const courseCheck = db.courses.find((c) => c.id === childCourse.id);
    expect(courseCheck).toBeUndefined();

    // Verify college access entries were removed
    const accessCheck = db.learningModuleCollegeAccess.filter((a) => a.moduleId === customLearnMod.id);
    expect(accessCheck.length).toBe(0);

    // Verify audit log
    const auditLogs = db.getAuditLogs();
    const hasLog = auditLogs.some(
      (l) => l.action === "learning_module.delete" && l.target === customLearnMod.id && l.severity === "warning"
    );
    expect(hasLog).toBe(true);
  });
});
