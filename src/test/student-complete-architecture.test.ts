import { describe, it, expect, beforeEach } from "vitest";
import { db, computeStudentGitHubRepoName } from "../server/db";
import { handleApiRequest } from "../server/api-router";
import { homeForRole } from "../lib/auth/service";
import type { AuthenticatedUser } from "../server/types";
import { formatSourceCode } from "../routes/student.judge";

describe("Ziphyrus X — Complete Student Workspace Architecture & Security", () => {
  const studentUser: AuthenticatedUser = {
    id: "stu-1",
    loginId: "stu-1",
    email: "aarav@smp101.edu",
    name: "Aarav Sharma",
    role: "student",
    collegeCode: "SMP101",
    collegeId: "c0000000-0000-0000-0000-000000000001",
    isProtected: false,
    permissions: ["student.*"],
  };

  const otherStudentUser: AuthenticatedUser = {
    id: "stu-5",
    loginId: "student.meera",
    email: "meera@smp102.edu",
    name: "Meera Patel",
    role: "student",
    collegeCode: "SMP102",
    collegeId: "c0000000-0000-0000-0000-000000000002",
    isProtected: false,
    permissions: ["student.*"],
  };

  // Helper to make simulated API requests
  async function api(path: string, method = "GET", body?: any, user = studentUser) {
    const { createSessionToken } = await import("../server/auth");
    const token = createSessionToken(user);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const req = new Request(`http://localhost:8080${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return handleApiRequest(req);
  }

  // =========================================================================
  // 1. AUTHENTICATION & WORKSPACE ROUTING
  // =========================================================================
  describe("1. Authentication & Workspace Routing", () => {
    it("routes student role to /student upon verified sign-in", () => {
      expect(homeForRole("student")).toBe("/student");
      expect(homeForRole("super_admin")).toBe("/admin");
      expect(homeForRole("coordinator")).toBe("/coordinator");
      expect(homeForRole("editor")).toBe("/editor");
    });

    it("authenticates student via dev alias and returns valid session", async () => {
      const loginReq = new Request("http://localhost:8080/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: "stu-1", password: "any-password" }),
      });
      const res = await handleApiRequest(loginReq);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.user.role).toBe("student");
      expect(data.data.user.collegeCode).toBe("SMP101");
    });
  });

  // =========================================================================
  // 2. REPO NAMING CONVENTION (PART 14)
  // =========================================================================
  describe("2. GitHub Repository Naming Convention (PART 14)", () => {
    it("computes ZiphyrusX-{firstName}-{last3DigitsOfUSN} accurately", () => {
      // Aarav Sharma, USN 1MS22CS001 -> ZiphyrusX-Aarav-001
      expect(computeStudentGitHubRepoName({ name: "Aarav Sharma", usn: "1MS22CS001" })).toBe(
        "ZiphyrusX-Aarav-001"
      );

      // Meera Patel, USN 1DM21CS045 -> ZiphyrusX-Meera-045
      expect(computeStudentGitHubRepoName({ name: "Meera Patel", usn: "1DM21CS045" })).toBe(
        "ZiphyrusX-Meera-045"
      );

      // Kunal Nair, USN 1MS22IS032 -> ZiphyrusX-Kunal-032
      expect(computeStudentGitHubRepoName({ name: "Kunal Nair", usn: "1MS22IS032" })).toBe(
        "ZiphyrusX-Kunal-032"
      );

      // Edge case: USN with 1 digit pads with 00
      expect(computeStudentGitHubRepoName({ name: "Rohan Gupta", usn: "DM7" })).toBe(
        "ZiphyrusX-Rohan-007"
      );
    });
  });

  // =========================================================================
  // 3. STUDENT PROFILE & IMMUTABLE IDENTITY SECURITY
  // =========================================================================
  describe("3. Student Profile & Immutable Fields Security", () => {
    it("retrieves current student profile with target GitHub repository", async () => {
      const res = await api("/api/v1/student/profile", "GET");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Aarav Sharma");
      expect(json.data.collegeCode).toBe("SMP101");
      expect(json.data.targetGitHubRepo).toBe("ZiphyrusX-Aarav-001");
    });

    it("allows updating permitted fields like bio and githubUsername", async () => {
      const res = await api("/api/v1/student/profile", "PATCH", {
        bio: "Updated passionate systems engineer.",
        githubUsername: "aarav-sharma-dev",
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.bio).toBe("Updated passionate systems engineer.");
      expect(json.data.githubUsername).toBe("aarav-sharma-dev");
    });

    it("strictly blocks student from modifying immutable role", async () => {
      const res = await api("/api/v1/student/profile", "PATCH", {
        role: "super_admin",
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("forbidden");
    });

    it("strictly blocks student from modifying immutable collegeCode", async () => {
      const res = await api("/api/v1/student/profile", "PATCH", {
        collegeCode: "SMP999",
      });
      expect(res.status).toBe(403);
    });

    it("strictly blocks student from modifying immutable USN", async () => {
      const res = await api("/api/v1/student/profile", "PATCH", {
        usn: "FORGED-USN-123",
      });
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 4. OVERVIEW DASHBOARD & ZERO ATTENDANCE CONTRIBUTION HEATMAP
  // =========================================================================
  describe("4. Dashboard & Contribution Heatmap (Zero Attendance)", () => {
    it("loads dashboard with verified metrics and recent activities", async () => {
      const res = await api("/api/v1/student/dashboard", "GET");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.metrics.problemsSolved).toBeGreaterThanOrEqual(1);
      expect(json.data.metrics.readinessScore).toBeGreaterThanOrEqual(50);
      expect(json.data.recentSubmissions.length).toBeGreaterThan(0);
    });

    it("generates 365-day contribution heatmap strictly from verified evidence", async () => {
      const res = await api("/api/v1/student/contributions", "GET");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.totalContributions).toBeGreaterThan(0);
      expect(json.data.contributions.length).toBeGreaterThanOrEqual(364);
    });

    it("retrieves verified activity timeline events", async () => {
      const res = await api("/api/v1/student/activity", "GET");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.some((e: any) => e.activityType === "coding_submission")).toBe(true);
    });
  });

  // =========================================================================
  // 5. CODING JUDGE & PROBLEM WORKSPACE
  // =========================================================================
  describe("5. Coding Judge & Problem Privacy", () => {
    it("returns problem list sanitizing reference solutions and private test cases", async () => {
      const res = await api("/api/v1/student/judge/problems", "GET");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);

      // Security check: referenceSolution must be stripped
      json.data.forEach((p: any) => {
        expect(p.referenceSolution).toBeUndefined();
        // Only sample test cases must be exposed
        p.testCases.forEach((tc: any) => {
          expect(tc.isSample).toBe(true);
        });
      });
    });

    it("fetches single problem with sample test cases only", async () => {
      const problem = db.problems[0];
      const res = await api(`/api/v1/student/judge/problems/${problem.id}`, "GET");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe(problem.title);
      expect(json.data.referenceSolution).toBeUndefined();
      expect(json.data.testCases.every((tc: any) => tc.isSample)).toBe(true);
    });

    it("persists and retrieves student solution draft", async () => {
      const problem = db.problems[0];
      const draftCode = "def twoSum(nums, target):\n    # Working draft\n    return []";

      // Save draft
      const saveRes = await api(
        `/api/v1/student/judge/problems/${problem.id}/draft`,
        "POST",
        { language: "python", code: draftCode }
      );
      expect(saveRes.status).toBe(200);

      // Get draft
      const getRes = await api(`/api/v1/student/judge/problems/${problem.id}/draft`, "GET");
      expect(getRes.status).toBe(200);
      const json = await getRes.json();
      expect(json.data.code).toBe(draftCode);
      expect(json.data.language).toBe("python");
    });

    it("runs sample tests returning execution time, memory, and pass status", async () => {
      const problem = db.problems[0];
      const code = "def twoSum(nums, target):\n    return [0, 1]";
      const res = await api(
        `/api/v1/student/judge/problems/${problem.id}/run`,
        "POST",
        { language: "python", sourceCode: code }
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.totalSampleCases).toBeGreaterThan(0);
      expect(json.data.executionTimeMs).toBeGreaterThan(0);
      expect(json.data.memoryUsedMb).toBeGreaterThan(0);
    });

    it("submits solution, records submission, and automatically triggers GitHub sync on Accepted", async () => {
      const problem = db.problems[0];
      // Code containing accepted logic
      const acceptedCode =
        "def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen: return [seen[complement], i]\n        seen[num] = i\n    return []";

      const res = await api(
        `/api/v1/student/judge/problems/${problem.id}/submit`,
        "POST",
        { language: "python", sourceCode: acceptedCode }
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("accepted");
      expect(json.data.score).toBe(100);

      // Verify Automatic GitHub Sync
      expect(json.data.githubSynced).toBe(true);
      expect(json.data.githubCommitSha).toBeDefined();
      expect(json.data.githubRepoName).toBe("ZiphyrusX-Aarav-001");

      // Verify job was persisted in database
      const syncJob = db.githubSyncJobs.find((j) => j.submissionId === json.data.id);
      expect(syncJob).toBeDefined();
      expect(syncJob?.repoName).toBe("ZiphyrusX-Aarav-001");
      expect(syncJob?.status).toBe("synced");
    });

    it("rejects wrong code with wrong_answer verdict and prevents GitHub sync", async () => {
      const problem = db.problems[0];
      const wrongCode = "def twoSum(nums, target):\n    # Completely wrong logic\n    return [999, 999]";

      const res = await api(
        `/api/v1/student/judge/problems/${problem.id}/submit`,
        "POST",
        { language: "python", sourceCode: wrongCode }
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("wrong_answer");
      expect(json.data.score).toBeLessThan(100);
      expect(json.data.githubSynced).toBeFalsy();
    });

    it("detects syntax errors and returns compile_error verdict", async () => {
      const problem = db.problems[0];
      const syntaxErrorCode = "def twoSum(nums, target):\n    seen = { ( [ } \n    return []";

      const res = await api(
        `/api/v1/student/judge/problems/${problem.id}/submit`,
        "POST",
        { language: "python", sourceCode: syntaxErrorCode }
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("compile_error");
      expect(json.data.score).toBe(0);
      expect(json.data.testCasesPassed).toBe(0);
    });

    it("verifies code formatter standardizes indentation and structure", () => {
      const unformattedJava = "class Solution {\npublic int[] twoSum(int[] nums, int target) {\nreturn new int[]{};\n}\n}";
      const formattedJava = formatSourceCode(unformattedJava, "java");
      expect(formattedJava).toContain("    public int[] twoSum");
      expect(formattedJava).toContain("        return new int[]{};");

      const unformattedPy = "class Solution:\n  def twoSum(self, nums, target):\n    return []";
      const formattedPy = formatSourceCode(unformattedPy, "python");
      expect(formattedPy).toContain("    def twoSum");
      expect(formattedPy).toContain("        return []");
    });

    it("enforces student isolation: blocks student from viewing another student's submission", async () => {
      // Find submission belonging to stu-1
      const sub = db.judgeSubmissions.find((s) => s.studentId === "stu-1");
      expect(sub).toBeDefined();

      // otherStudentUser (stu-5) attempts to access stu-1's submission
      const res = await api(
        `/api/v1/student/judge/submissions/${sub!.id}`,
        "GET",
        undefined,
        otherStudentUser
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("forbidden");
    });
  });

  // =========================================================================
  // 6. STUDENT ASSESSMENTS WORKFLOW
  // =========================================================================
  describe("6. Student Assessments Workflow", () => {
    it("lists published assessments available for student", async () => {
      const res = await api("/api/v1/student/assessments", "GET");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });

    it("starts assessment attempt and strips answer keys from returned questions", async () => {
      const asm = db.assessments[0];
      const res = await api(`/api/v1/student/assessments/${asm.id}/start`, "POST");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.attempt.status).toBe("in_progress");
      expect(json.data.questions.length).toBeGreaterThan(0);

      // CRITICAL SECURITY INVARIANT: Correct answers must NEVER be returned!
      json.data.questions.forEach((q: any) => {
        expect(q.correctAnswer).toBeUndefined();
        expect(q.explanation).toBeUndefined();
        expect(q.stem).toBeDefined();
        expect(q.options).toBeDefined();
      });
    });

    it("autosaves answer for question during active attempt", async () => {
      const asm = db.assessments[0];
      const startRes = await api(`/api/v1/student/assessments/${asm.id}/start`, "POST");
      const startJson = await startRes.json();
      const attemptId = startJson.data.attempt.id;
      const questionId = startJson.data.questions[0].id;

      const saveRes = await api(
        `/api/v1/student/assessments/${asm.id}/save-answer`,
        "POST",
        { attemptId, questionId, selectedOption: "Option A" }
      );
      expect(saveRes.status).toBe(200);
      const saveJson = await saveRes.json();
      expect(saveJson.data.isSaved).toBe(true);
      expect(saveJson.data.selectedOption).toBe("Option A");
    });

    it("submits assessment attempt and computes authoritative score snapshot", async () => {
      const asm = db.assessments[0];
      const startRes = await api(`/api/v1/student/assessments/${asm.id}/start`, "POST");
      const startJson = await startRes.json();
      const attemptId = startJson.data.attempt.id;

      const submitRes = await api(
        `/api/v1/student/assessments/${asm.id}/submit`,
        "POST",
        { attemptId }
      );
      expect(submitRes.status).toBe(200);
      const submitJson = await submitRes.json();
      expect(submitJson.data.status).toBe("submitted");
      expect(submitJson.data.score).toBeGreaterThanOrEqual(0);
      expect(submitJson.data.percentage).toBeGreaterThanOrEqual(0);

      // Verify immutable activity event logged
      const ev = db.studentActivityEvents.find((e) => e.referenceId === attemptId);
      expect(ev).toBeDefined();
      expect(ev?.activityType).toBe("assessment_completed");
    });
  });

  // =========================================================================
  // 7. LEARNING CONTENT & FEATURE AVAILABILITY
  // =========================================================================
  describe("7. Learning Content & Feature Flag Enforcement", () => {
    it("respects feature availability: returns empty/blocked when training.courses is disabled", async () => {
      // By default, training.courses feature flag is disabled
      const flag = db.featureFlags.find((f) => f.key === "training.courses");
      if (flag) flag.isEnabled = false;

      const res = await api("/api/v1/student/learning", "GET");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBe(0);
    });

    it("allows course browsing when training.courses is enabled by Editor", async () => {
      // Temporarily enable for test
      const flag = db.featureFlags.find((f) => f.key === "training.courses");
      if (flag) flag.isEnabled = true;

      // Ensure at least one published course has college access
      const course = db.courses.find((c) => c.status === "published");
      if (course && course.learningModuleId) {
        db.learningModuleCollegeAccess.push({
          id: `lmca-${Date.now()}`,
          moduleId: course.learningModuleId,
          collegeId: "c0000000-0000-0000-0000-000000000001",
          collegeCode: "SMP101",
          grantedBy: "editor",
          grantedAt: new Date().toISOString(),
        });
      }

      const res = await api("/api/v1/student/learning", "GET");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 8. INTELLIGENCE, SKILLS, ACTION PLANS & NOTIFICATIONS
  // =========================================================================
  describe("8. Intelligence, Skills, Action Plans & Notifications", () => {
    it("fetches student performance from authoritative intelligence engine", async () => {
      const res = await api("/api/v1/student/performance", "GET");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.readinessScore).toBeGreaterThanOrEqual(70);
      expect(json.data.percentileInBatch).toBeDefined();
    });

    it("fetches student skills analytics across all 5 domains", async () => {
      const res = await api("/api/v1/student/skills", "GET");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(5);
      expect(json.data.some((s: any) => s.domain === "Technical")).toBe(true);
      expect(json.data.some((s: any) => s.domain === "Coding")).toBe(true);
    });

    it("fetches placement readiness report", async () => {
      const res = await api("/api/v1/student/placement-readiness", "GET");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.tier).toContain("Tier");
      expect(json.data.strengths.length).toBeGreaterThan(0);
    });

    it("completes action plan milestone with verified student evidence", async () => {
      const plan = db.actionPlans[0];
      const res = await api(
        `/api/v1/student/action-plans/${plan.id}/milestones/m-1/complete`,
        "POST",
        { evidence: "Completed 5 graph practice problems successfully." }
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify activity event was created
      const ev = db.studentActivityEvents.find((e) => e.activityType === "action_plan_milestone");
      expect(ev).toBeDefined();
    });

    it("fetches notifications scoped to student and college", async () => {
      const res = await api("/api/v1/student/notifications", "GET");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });
  });
});
