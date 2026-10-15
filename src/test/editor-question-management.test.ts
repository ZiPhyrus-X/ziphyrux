import { describe, it, expect, beforeEach } from "vitest";
import { handleApiRequest } from "../server/api-router";
import { createSessionToken } from "../server/auth";
import { db } from "../server/db";
import type { AuthenticatedUser } from "../server/types";

describe("ZIPHYRUS X — EDITOR QUESTION MANAGEMENT & QUESTION BANK ARCHITECTURE", () => {
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

  const makeReq = (
    path: string,
    method: string = "GET",
    body?: any,
    user: AuthenticatedUser = editorUser
  ) => {
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

  // =========================================================================
  // 1. QUESTION MODULES MANAGEMENT & INVARIANTS
  // =========================================================================
  describe("1. Question Modules Management & Invariants", () => {
    it("returns seeded question modules with aggregated question counts", async () => {
      const res = await handleApiRequest(makeReq("/api/v1/editor/modules"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThanOrEqual(4);

      const techModule = data.data.find((m: any) => m.normalizedName === "technical");
      expect(techModule).toBeDefined();
      expect(techModule).toHaveProperty("totalQuestions");
      expect(techModule).toHaveProperty("publishedCount");
      expect(techModule).toHaveProperty("draftCount");
      expect(techModule).toHaveProperty("inReviewCount");
      expect(techModule.totalQuestions).toBeGreaterThanOrEqual(1);
    });

    it("allows Editor to create a new question module with valid metadata", async () => {
      const uniqueName = `Cloud Architecture ${Date.now()}`;
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/modules", "POST", {
          name: uniqueName,
          description: "AWS, Azure, and distributed cloud systems evaluation.",
        })
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(uniqueName);
      expect(data.data.status).toBe("active");
      expect(data.data.normalizedName).toBe(uniqueName.toLowerCase());
    });

    it("rejects duplicate module creation under normalized case-insensitive name", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/modules", "POST", {
          name: "tEcHnIcAl",
          description: "Duplicate technical module attempt",
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toMatch(/already exists/i);
    });

    it("allows updating an existing question module's name and description", async () => {
      const createRes = await handleApiRequest(
        makeReq("/api/v1/editor/modules", "POST", {
          name: `DevOps Fundamentals ${Date.now()}`,
          description: "CI/CD and Docker",
        })
      );
      const created = (await createRes.json()).data;

      const patchRes = await handleApiRequest(
        makeReq(`/api/v1/editor/modules/${created.id}`, "PATCH", {
          name: `${created.name} Updated`,
          description: "Updated CI/CD, Kubernetes, and Observability.",
        })
      );
      expect(patchRes.status).toBe(200);
      const patched = (await patchRes.json()).data;
      expect(patched.name).toContain("Updated");
      expect(patched.description).toContain("Kubernetes");
    });

    it("prevents updating a module to a name that conflicts with an existing module", async () => {
      const modules = (await (await handleApiRequest(makeReq("/api/v1/editor/modules"))).json()).data;
      const target = modules[0];
      const conflictName = modules[1].name;

      const patchRes = await handleApiRequest(
        makeReq(`/api/v1/editor/modules/${target.id}`, "PATCH", {
          name: conflictName.toUpperCase(),
        })
      );
      expect(patchRes.status).toBe(400);
      const data = await patchRes.json();
      expect(data.error.message).toMatch(/already exists/i);
    });

    it("prevents archiving a module with active questions deployed in assessments", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/modules/mod-tech/archive", "POST", {})
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toMatch(/deployed in assessments/i);
    });
  });

  // =========================================================================
  // 2. QUESTION DRAFT AUTHORING & STRICT MCQ INVARIANTS
  // =========================================================================
  describe("2. Question Draft Authoring & Strict MCQ Invariants", () => {
    it("creates a valid MCQ question draft with exactly four options and valid answer", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions", "POST", {
          moduleId: "mod-tech",
          stem: "What is the worst-case time complexity of quicksort?",
          type: "MCQ",
          difficulty: "Medium",
          options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"],
          correctAnswer: "O(n^2)",
          explanation: "Worst case occurs with unbalanced partitions (e.g. sorted arrays).",
          tags: ["dsa", "algorithms", "sorting"],
        })
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe("draft");
      expect(data.data.type).toBe("MCQ");
      expect(data.data.options).toHaveLength(4);
      expect(data.data.correctAnswer).toBe("O(n^2)");
      expect(data.data.currentVersion).toBe(1);
    });

    it("strictly rejects MCQ creation if fewer than 4 options are provided", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions", "POST", {
          moduleId: "mod-tech",
          stem: "Which of the following is linear?",
          type: "MCQ",
          difficulty: "Easy",
          options: ["Array", "Linked List", "Tree"], // Only 3 options
          correctAnswer: "Array",
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toMatch(/exactly four/i);
    });

    it("strictly rejects MCQ creation if more than 4 options are provided", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions", "POST", {
          moduleId: "mod-tech",
          stem: "Which of the following is linear?",
          type: "MCQ",
          difficulty: "Easy",
          options: ["Array", "Linked List", "Stack", "Queue", "Tree"], // 5 options
          correctAnswer: "Array",
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toMatch(/exactly four/i);
    });

    it("strictly rejects MCQ creation if an option is blank/whitespace", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions", "POST", {
          moduleId: "mod-tech",
          stem: "Identify the primitive data type.",
          type: "MCQ",
          difficulty: "Easy",
          options: ["int", "boolean", "   ", "char"], // Blank option
          correctAnswer: "int",
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toMatch(/non-empty/i);
    });

    it("strictly rejects MCQ creation if correct answer does not match any of the four options", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions", "POST", {
          moduleId: "mod-tech",
          stem: "What is 2 + 2?",
          type: "MCQ",
          difficulty: "Easy",
          options: ["1", "2", "3", "5"],
          correctAnswer: "4", // Not in options
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toMatch(/must exactly match one of the four options/i);
    });

    it("allows creating valid Short Answer question draft with expectedAnswer", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions", "POST", {
          moduleId: "mod-tech",
          stem: "What is an idempotent REST HTTP method?",
          type: "Short Answer",
          difficulty: "Easy",
          expectedAnswer: "An HTTP method that produces the same server state when executed multiple times (GET, PUT, DELETE).",
        })
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.type).toBe("Short Answer");
      expect(data.data.expectedAnswer).toBeDefined();
      expect(data.data.status).toBe("draft");
    });

    it("allows creating valid Long Answer question draft with scoring rubric", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions", "POST", {
          moduleId: "mod-soft",
          stem: "Describe a situation where you had to negotiate requirements with non-technical stakeholders.",
          type: "Long Answer",
          difficulty: "Medium",
          rubric: "1. Clarity of trade-offs (40%). 2. Empathy and active listening (30%). 3. Structured resolution outcome (30%).",
        })
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.type).toBe("Long Answer");
      expect(data.data.rubric).toBeDefined();
    });

    it("allows creating question directly submitted for review (submitForReview=true)", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions", "POST", {
          moduleId: "mod-apt",
          stem: "If a car travels at 60 km/h for 2.5 hours, how far does it travel?",
          type: "MCQ",
          difficulty: "Easy",
          options: ["120 km", "140 km", "150 km", "160 km"],
          correctAnswer: "150 km",
          submitForReview: true,
        })
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe("in_review");
    });
  });

  // =========================================================================
  // 3. BULK UPLOAD VALIDATION & PRE-IMPORT CHECKS
  // =========================================================================
  describe("3. Bulk Upload Validation & Pre-Import Checks", () => {
    it("validates CSV content and returns structured preview with valid/invalid row counts", async () => {
      const csvData = [
        "question_text,question_type,difficulty,option_a,option_b,option_c,option_d,correct_option,explanation",
        '"What is the base case in recursion?","MCQ","Easy","Termination condition","Loop increment","Stack frame","Return null","Termination condition","Prevents infinite recursion"',
        '"Explain garbage collection.","Long Answer","Medium","","","","","","Automatic memory management reclaiming unreferenced heap objects."',
      ].join("\n");

      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions/upload/validate", "POST", {
          content: csvData,
          format: "csv",
          moduleId: "mod-tech",
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.totalRows).toBe(2);
      expect(data.data.validRows).toBe(2);
      expect(data.data.invalidRows).toBe(0);
      expect(data.data.rows[0].valid).toBe(true);
      expect(data.data.rows[0].data.stem).toBe("What is the base case in recursion?");
    });

    it("validates and detects invalid MCQ rows with missing options and letter-mapped answers", async () => {
      const csvData = [
        "question_text,question_type,difficulty,option_a,option_b,option_c,option_d,correct_option",
        '"Valid with letter option A","MCQ","Easy","First","Second","Third","Fourth","A"',
        '"Invalid MCQ missing option D","MCQ","Easy","Alpha","Beta","Gamma","","Alpha"',
        '"Invalid MCQ mismatched answer","MCQ","Easy","One","Two","Three","Four","Five"',
      ].join("\n");

      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions/upload/validate", "POST", {
          content: csvData,
          format: "csv",
          moduleId: "mod-tech",
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.totalRows).toBe(3);
      expect(data.data.validRows).toBe(1);
      expect(data.data.invalidRows).toBe(2);

      // Check row 2 errors
      const row2 = data.data.rows[1];
      expect(row2.valid).toBe(false);
      expect(row2.errors.some((e: string) => e.includes("exactly four options"))).toBe(true);

      // Check row 3 errors
      const row3 = data.data.rows[2];
      expect(row3.valid).toBe(false);
      expect(row3.errors.some((e: string) => e.includes("does not match any of the four options"))).toBe(true);
    });

    it("detects intra-file duplicate question stems and flags them as duplicates", async () => {
      const csvData = [
        "question_text,question_type,difficulty,option_a,option_b,option_c,option_d,correct_option",
        '"Identical duplicate question stem test","MCQ","Easy","Opt1","Opt2","Opt3","Opt4","Opt1"',
        '"Identical duplicate question stem test","MCQ","Easy","Opt1","Opt2","Opt3","Opt4","Opt1"',
      ].join("\n");

      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions/upload/validate", "POST", {
          content: csvData,
          format: "csv",
          moduleId: "mod-tech",
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.duplicateRows).toBe(1);
      expect(data.data.rows[1].valid).toBe(false);
      expect(data.data.rows[1].errors.some((e: string) => e.includes("Duplicate question stem"))).toBe(true);
    });

    it("validates JSON bulk upload payload structure correctly", async () => {
      const jsonPayload = JSON.stringify([
        {
          question_text: "What is an abstract class in OOP?",
          question_type: "MCQ",
          difficulty: "Easy",
          option_a: "A class that cannot be instantiated directly",
          option_b: "A final class with no subclasses",
          option_c: "A concrete class with private constructor",
          option_d: "An interface with only default methods",
          correct_option: "A class that cannot be instantiated directly",
        },
      ]);

      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions/upload/validate", "POST", {
          content: jsonPayload,
          format: "json",
          moduleId: "mod-tech",
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.validRows).toBe(1);
    });
  });

  // =========================================================================
  // 4. BULK UPLOAD CONFIRMATION & BATCH LEDGER PERSISTENCE
  // =========================================================================
  describe("4. Bulk Upload Confirmation & Batch Ledger Persistence", () => {
    it("confirms validated upload, creates draft questions and records batch ledger", async () => {
      const validatedRows = [
        {
          rowNumber: 1,
          valid: true,
          data: {
            stem: `Unique Imported Batch Question Stem ${Date.now()}-A`,
            type: "MCQ",
            difficulty: "Medium",
            options: ["OptA", "OptB", "OptC", "OptD"],
            correctAnswer: "OptA",
            explanation: "Batch import test explanation.",
          },
          errors: [],
        },
        {
          rowNumber: 2,
          valid: false,
          data: {
            stem: `Corrupted Rejected Question Stem ${Date.now()}-B`,
            type: "MCQ",
            difficulty: "Easy",
          },
          errors: ["MCQ questions must provide exactly four options (found 0)."],
        },
      ];

      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions/upload/confirm", "POST", {
          moduleId: "mod-tech",
          filename: "cs_algorithms_batch_01.csv",
          uploadMethod: "CSV import",
          validatedRows,
        })
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      const batch = data.data.batch;
      expect(batch).toBeDefined();
      expect(batch.filename).toBe("cs_algorithms_batch_01.csv");
      expect(batch.totalRows).toBe(2);
      expect(batch.importedRows).toBe(1);
      expect(batch.rejectedRows).toBe(1);
      expect(batch.status).toBe("partial");
      expect(batch.publicationStatus).toBe("draft");
      expect(batch.rejectedDetails).toHaveLength(1);
      expect(batch.rejectedDetails[0].rowNumber).toBe(2);

      // Verify imported question was created in db with status "draft"
      expect(data.data.importedQuestions).toHaveLength(1);
      expect(data.data.importedQuestions[0].status).toBe("draft");
    });

    it("persists upload batch in history ledger queryable by module and status", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions/upload-history?moduleId=mod-tech")
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThanOrEqual(1);
      for (const batch of data.data) {
        expect(batch.moduleId).toBe("mod-tech");
        expect(batch).toHaveProperty("totalRows");
        expect(batch).toHaveProperty("importedRows");
        expect(batch).toHaveProperty("rejectedRows");
      }
    });

    it("retrieves a single upload batch details with rejected rows breakdown", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions/upload-batches/upb-1")
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe("upb-1");
      expect(data.data.rejectedRows).toBe(1);
      expect(data.data.rejectedDetails).toBeDefined();
      expect(data.data.rejectedDetails.length).toBe(1);
      expect(data.data.rejectedDetails[0].errors).toContain("MCQ questions must provide exactly four options.");
    });
  });

  // =========================================================================
  // 5. REVIEW, PUBLISHING WORKFLOW & VERSIONING
  // =========================================================================
  describe("5. Review, Publishing Workflow & Versioning", () => {
    it("submits a draft question for review", async () => {
      // 1. Create draft
      const draftRes = await handleApiRequest(
        makeReq("/api/v1/editor/questions", "POST", {
          moduleId: "mod-verb",
          stem: "Select the antonym for 'Ephemeral'.",
          type: "MCQ",
          difficulty: "Easy",
          options: ["Transient", "Permanent", "Fleeting", "Short-lived"],
          correctAnswer: "Permanent",
        })
      );
      const draft = (await draftRes.json()).data;
      expect(draft.status).toBe("draft");

      // 2. Submit for review
      const submitRes = await handleApiRequest(
        makeReq(`/api/v1/editor/questions/${draft.id}/submit`, "POST")
      );
      expect(submitRes.status).toBe(200);
      const submitted = (await submitRes.json()).data;
      expect(submitted.status).toBe("in_review");
    });

    it("approves and publishes an in-review question", async () => {
      // 1. Create question in review
      const createRes = await handleApiRequest(
        makeReq("/api/v1/editor/questions", "POST", {
          moduleId: "mod-apt",
          stem: "A pipe can fill a tank in 6 hours. Another pipe empties it in 12 hours. How long if both are open?",
          type: "MCQ",
          difficulty: "Medium",
          options: ["8 hours", "10 hours", "12 hours", "14 hours"],
          correctAnswer: "12 hours",
          submitForReview: true,
        })
      );
      const created = (await createRes.json()).data;
      expect(created.status).toBe("in_review");

      // 2. Approve and publish
      const publishRes = await handleApiRequest(
        makeReq(`/api/v1/editor/questions/${created.id}/review`, "POST", {
          action: "approve_and_publish",
        })
      );
      expect(publishRes.status).toBe(200);
      const published = (await publishRes.json()).data;
      expect(published.status).toBe("published");
      expect(published.publishedAt).toBeDefined();
      expect(published.publishedBy).toBe(editorUser.loginId);
    });

    it("returns an in-review question back to draft status", async () => {
      const createRes = await handleApiRequest(
        makeReq("/api/v1/editor/questions", "POST", {
          moduleId: "mod-tech",
          stem: "Review return test question stem.",
          type: "MCQ",
          difficulty: "Easy",
          options: ["A", "B", "C", "D"],
          correctAnswer: "A",
          submitForReview: true,
        })
      );
      const created = (await createRes.json()).data;

      const returnRes = await handleApiRequest(
        makeReq(`/api/v1/editor/questions/${created.id}/review`, "POST", {
          action: "return_to_draft",
        })
      );
      expect(returnRes.status).toBe(200);
      const returned = (await returnRes.json()).data;
      expect(returned.status).toBe("draft");
    });

    it("prevents direct mutation of a published question (immutability)", async () => {
      // Q-0001 is a published question seeded in db
      const patchRes = await handleApiRequest(
        makeReq("/api/v1/editor/questions/70000000-0000-0000-0000-000000000001", "PATCH", {
          stem: "Attempting to maliciously modify a published assessment question stem!",
        })
      );
      expect(patchRes.status).toBe(400);
      const data = await patchRes.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toMatch(/Published questions cannot be directly modified/i);
    });

    it("creates a new question version (v2) for a published question and sets version to draft", async () => {
      const versionRes = await handleApiRequest(
        makeReq("/api/v1/editor/questions/70000000-0000-0000-0000-000000000001/version", "POST", {
          stem: "What is the average time complexity of binary search on a sorted 1D array?",
          difficulty: "Medium",
          explanation: "Updated explanation for v2 snapshot.",
        })
      );
      expect(versionRes.status).toBe(201);
      const data = await versionRes.json();
      expect(data.success).toBe(true);
      expect(data.data.currentVersion).toBe(2);
      expect(data.data.status).toBe("draft");
      expect(data.data.stem).toContain("sorted 1D array");
    });
  });

  // =========================================================================
  // 6. SCOPED QUESTION BANK FILTERING & SEARCH
  // =========================================================================
  describe("6. Scoped Question Bank Filtering & Search", () => {
    it("filters questions by module ID", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions?moduleId=mod-verb")
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      for (const q of data.data) {
        expect(q.moduleId).toBe("mod-verb");
      }
    });

    it("filters questions by status and type", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions?status=published&type=MCQ")
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      for (const q of data.data) {
        expect(q.status).toBe("published");
        expect(q.type).toBe("MCQ");
      }
    });

    it("searches questions by keyword stem or question code", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions?search=binary%20search")
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.length).toBeGreaterThanOrEqual(1);
      expect(data.data.some((q: any) => q.stem.toLowerCase().includes("binary search"))).toBe(true);
    });
  });

  // =========================================================================
  // 7. ROLE-BASED ACCESS CONTROL & SECURITY ENFORCEMENT
  // =========================================================================
  describe("7. Role-Based Access Control & Security Enforcement", () => {
    it("allows Super Admin full access to question management endpoints", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/modules", "GET", undefined, superAdminUser)
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("strictly blocks College Coordinator from accessing Editor Question Management (403)", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions", "GET", undefined, coordinatorUser)
      );
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("forbidden");
    });

    it("strictly blocks Student from accessing Editor Question Management (403)", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/questions", "GET", undefined, studentUser)
      );
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("forbidden");
    });

    it("strictly blocks unauthorized users from modifying modules or uploading questions", async () => {
      const res = await handleApiRequest(
        makeReq("/api/v1/editor/modules", "POST", { name: "Malicious Module" }, studentUser)
      );
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 8. ZERO ATTENDANCE LAW INVARIANT
  // =========================================================================
  describe("8. Zero Attendance Law Invariant", () => {
    it("verifies zero attendance properties across modules, questions, and upload batches", async () => {
      const modulesRes = await handleApiRequest(makeReq("/api/v1/editor/modules"));
      const modules = (await modulesRes.json()).data;
      for (const m of modules) {
        expect(m).not.toHaveProperty("attendance");
        expect(m).not.toHaveProperty("attendanceRate");
        expect(m).not.toHaveProperty("attendance_rate");
      }

      const questionsRes = await handleApiRequest(makeReq("/api/v1/editor/questions"));
      const questions = (await questionsRes.json()).data;
      for (const q of questions) {
        expect(q).not.toHaveProperty("attendance");
        expect(q).not.toHaveProperty("attendanceScore");
        expect(q).not.toHaveProperty("attendance_score");
      }

      const historyRes = await handleApiRequest(makeReq("/api/v1/editor/questions/upload-history"));
      const batches = (await historyRes.json()).data;
      for (const b of batches) {
        expect(b).not.toHaveProperty("attendance");
        expect(b).not.toHaveProperty("attendanceRows");
      }
    });
  });
});
