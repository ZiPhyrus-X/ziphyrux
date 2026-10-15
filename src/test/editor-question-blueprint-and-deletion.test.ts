import { describe, it, expect, beforeEach } from "vitest";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import { db } from "../server/db";
import type { AuthenticatedUser } from "../server/types";

describe("ZIPHYRUS X — QUESTION MODULE BLUEPRINT CODE VALIDATION & DELETION SUITE", () => {
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

  const studentUser: AuthenticatedUser = {
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

  const coordinatorUser: AuthenticatedUser = {
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

  const makeReq = (path: string, method = "GET", body?: any, user?: AuthenticatedUser) => {
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
  // 1. BLUEPRINT CODE VALIDATIONS ON MODULE CREATION
  // ---------------------------------------------------------------------------
  describe("1. Blueprint Code Linkage & Validations", () => {
    it("Rule 1: Throws error when linked blueprint code does not exist", async () => {
      const res = await handleApiRequest(
        makeReq(
          "/api/v1/editor/modules",
          "POST",
          {
            name: "Autonomous Systems",
            blueprintCode: "ASM-FAKE999",
            domain: "Technical",
            targetDifficulty: "Intermediate",
          },
          editorUser
        )
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("validation_error");
      expect(json.error.message).toBe("Assessment Blueprint with code 'ASM-FAKE999' was not found.");
    });

    it("Rule 2: Throws error when selected domain mismatches Blueprint domain", async () => {
      // ASM-TECH01 has domain: 'Technical'
      const res = await handleApiRequest(
        makeReq(
          "/api/v1/editor/modules",
          "POST",
          {
            name: "Cloud Networking",
            blueprintCode: "ASM-TECH01",
            domain: "Soft Skills",
            targetDifficulty: "Intermediate",
          },
          editorUser
        )
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("validation_error");
      expect(json.error.message).toBe("Domain mismatch: Selected domain 'Soft Skills' must match Blueprint domain 'Technical'.");
    });

    it("Rule 3: Throws error when blueprint is not in published status (e.g. draft)", async () => {
      // ASM-VRB03 has status: 'draft'
      const res = await handleApiRequest(
        makeReq(
          "/api/v1/editor/modules",
          "POST",
          {
            name: "Corporate Communications",
            blueprintCode: "ASM-VRB03",
            domain: "Verbal",
            targetDifficulty: "Beginner",
          },
          editorUser
        )
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("validation_error");
      expect(json.error.message).toBe("Blueprint 'ASM-VRB03' is currently in 'draft' status. Only PUBLISHED blueprints can be linked.");
    });

    it("Rule 4: Throws error when selected targetDifficulty mismatches Blueprint difficulty", async () => {
      // ASM-TECH01 has difficulty: 'Intermediate'
      const res = await handleApiRequest(
        makeReq(
          "/api/v1/editor/modules",
          "POST",
          {
            name: "Embedded Robotics",
            blueprintCode: "ASM-TECH01",
            domain: "Technical",
            targetDifficulty: "Beginner",
          },
          editorUser
        )
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("validation_error");
      expect(json.error.message).toBe("Difficulty mismatch: Module difficulty 'Beginner' must match Blueprint difficulty 'Intermediate'.");
    });

    it("Success: Creates Question Module when blueprint is published, domain and difficulty match", async () => {
      // ASM-TECH01 is published, Technical, Intermediate
      const res = await handleApiRequest(
        makeReq(
          "/api/v1/editor/modules",
          "POST",
          {
            name: "Distributed Systems & Cloud",
            description: "High scalability and distributed consensus",
            blueprintCode: "ASM-TECH01",
            domain: "Technical",
            targetDifficulty: "Intermediate",
            moduleKind: "assessment",
          },
          editorUser
        )
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Distributed Systems & Cloud");
      expect(json.data.blueprintCode).toBe("ASM-TECH01");
      expect(json.data.domain).toBe("Technical");
      expect(json.data.targetDifficulty).toBe("Intermediate");
      expect(json.data.visibilityStatus).toBe("hidden"); // defaults to hidden
    });
  });

  // ---------------------------------------------------------------------------
  // 2. QUESTION MODULE DELETION & CASCADING CLEANUP
  // ---------------------------------------------------------------------------
  describe("2. Question Module Deletion", () => {
    it("Successfully deletes a question module, its college access, and its questions", async () => {
      // 1. Create a module to delete
      const mod = db.createQuestionModule({
        name: "Temporary Module For Deletion",
        description: "Will be removed permanently",
        moduleKind: "assessment",
        blueprintCode: "ASM-APT02",
        domain: "Aptitude",
        targetDifficulty: "Intermediate",
        actor: "editor1@ziphyrus.in",
      });

      // 2. Grant college access to this module
      db.grantModuleCollegeAccess(mod.id, "c0000000-0000-0000-0000-000000000001", "editor1@ziphyrus.in");
      const accessBefore = db.getModuleCollegeAccess(mod.id);
      expect(accessBefore.length).toBeGreaterThan(0);

      // 3. Delete the module via API
      const deleteRes = await handleApiRequest(
        makeReq(`/api/v1/editor/modules/${mod.id}`, "DELETE", undefined, editorUser)
      );

      expect(deleteRes.status).toBe(200);
      const deleteJson = await deleteRes.json();
      expect(deleteJson.success).toBe(true);
      expect(deleteJson.data.id).toBe(mod.id);
      expect(deleteJson.data.name).toBe("Temporary Module For Deletion");

      // 4. Verify module no longer exists
      const getRes = await handleApiRequest(
        makeReq(`/api/v1/editor/modules/${mod.id}`, "GET", undefined, editorUser)
      );
      expect(getRes.status).toBe(404);

      // 5. Verify college access entries are purged
      const accessAfter = db.getModuleCollegeAccess(mod.id);
      expect(accessAfter.length).toBe(0);

      // 6. Verify audit trail has question_module.delete
      const audit = (db as any).auditLogs.find(
        (l: any) => l.action === "question_module.delete" && l.target === mod.id
      );
      expect(audit).toBeDefined();
      expect(audit.severity).toBe("warning");
    });

    it("Fails when trying to delete non-existent module", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/modules/mod-does-not-exist", "DELETE", undefined, editorUser)
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("action_error");
    });

    it("Denies deletion access to students and coordinators", async () => {
      const stuRes = await handleApiRequest(
        makeReq("/api/v1/editor/modules/mod-tech", "DELETE", undefined, studentUser)
      );
      expect(stuRes.status).toBe(403);

      const coordRes = await handleApiRequest(
        makeReq("/api/v1/editor/modules/mod-tech", "DELETE", undefined, coordinatorUser)
      );
      expect(coordRes.status).toBe(403);
    });

    it("Direct database method deleteQuestionModule cleans up and throws appropriately", async () => {
      const mod = db.createQuestionModule({
        name: "Direct DB Deletion Test",
        actor: "editor1@ziphyrus.in",
      });

      const res = await db.deleteQuestionModule(mod.id, "editor1@ziphyrus.in");
      expect(res.success).toBe(true);
      expect(res.id).toBe(mod.id);
      expect(db.getQuestionModule(mod.id)).toBeUndefined();

      await expect(db.deleteQuestionModule(mod.id, "editor1@ziphyrus.in")).rejects.toThrow(
        `Question module '${mod.id}' not found.`
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 3. UPDATE QUESTION MODULE UNIQUE CODE & BLUEPRINT CODE
  // ---------------------------------------------------------------------------
  describe("3. Update Question Module Unique Code & Blueprint Linkage", () => {
    it("Allows changing module unique code and cascades references", async () => {
      const mod = db.createQuestionModule({
        name: "Discrete Mathematics",
        actor: "editor1@ziphyrus.in",
      });
      const initialId = mod.id;

      // Grant college access to initialId
      db.grantModuleCollegeAccess(initialId, "c0000000-0000-0000-0000-000000000001", "editor1@ziphyrus.in");

      // Update module unique code
      const newUniqueCode = `MOD-DMATH-${Date.now().toString(36)}`;
      const res = await handleApiRequest(
        makeReq(
          `/api/v1/editor/modules/${initialId}`,
          "PATCH",
          {
            name: "Discrete Mathematics & Graph Theory",
            code: newUniqueCode,
          },
          editorUser
        )
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(newUniqueCode);
      expect(json.data.name).toBe("Discrete Mathematics & Graph Theory");

      // Verify old ID is gone and new ID is present
      expect(db.getQuestionModule(initialId)).toBeUndefined();
      expect(db.getQuestionModule(newUniqueCode)).toBeDefined();

      // Verify college access cascaded to new code
      const access = db.getModuleCollegeAccess(newUniqueCode);
      expect(access.length).toBeGreaterThan(0);
      expect(access.some((a) => a.collegeId === "c0000000-0000-0000-0000-000000000001")).toBe(true);
    });

    it("Rejects changing module code if another module already has that code", async () => {
      const modA = db.createQuestionModule({
        name: "Module Alpha Unique",
        actor: "editor1@ziphyrus.in",
      });
      const modB = db.createQuestionModule({
        name: "Module Beta Unique",
        actor: "editor1@ziphyrus.in",
      });

      const res = await handleApiRequest(
        makeReq(
          `/api/v1/editor/modules/${modB.id}`,
          "PATCH",
          {
            code: modA.id,
          },
          editorUser
        )
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("validation_error");
      expect(json.error.message).toContain(`Another module with unique code '${modA.id}' already exists.`);
    });

    it("Allows changing linked assessment blueprint code to another published blueprint", async () => {
      const mod = db.createQuestionModule({
        name: "Benchmark Algorithms",
        blueprintCode: "ASM-TECH01",
        domain: "Technical",
        targetDifficulty: "Intermediate",
        actor: "editor1@ziphyrus.in",
      });

      // Update blueprint code to ASM-APT02 (published, Aptitude, Intermediate)
      const res = await handleApiRequest(
        makeReq(
          `/api/v1/editor/modules/${mod.id}`,
          "PATCH",
          {
            blueprintCode: "ASM-APT02",
            domain: "Aptitude",
            targetDifficulty: "Intermediate",
          },
          editorUser
        )
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.blueprintCode).toBe("ASM-APT02");
      expect(json.data.domain).toBe("Aptitude");
    });
  });
});
