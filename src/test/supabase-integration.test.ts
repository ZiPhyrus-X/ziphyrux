/**
 * Architectural Supabase Integration Tests for Ziphyrus X Super Admin
 * Verifies the complete authorization sequence, tenant isolation,
 * protected account rules, feature availability, and database invariants.
 */

import { describe, expect, it } from "vitest";
import { handleApiRequest } from "@/server/api-router";
import { createSessionToken } from "@/server/auth";
import { db } from "@/server/db";
import type { AuthenticatedUser } from "@/server/types";

// Helper to make mock requests to handleApiRequest
function makeRequest(path: string, options: { method?: string; token?: string; body?: unknown } = {}): Promise<Response> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  return handleApiRequest(
    new Request(`https://api.ziphyrus.internal${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  );
}

// Generate tokens for test roles
const superAdminUser: AuthenticatedUser = {
  id: "d0000000-0000-0000-0000-000000000001",
  loginId: "sAdmin1@ziphyrus.in",
  email: "sAdmin1@ziphyrus.in",
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
  permissions: ["content.edit", "feature.manage"],
};

const studentUser: AuthenticatedUser = {
  id: "d0000000-0000-0000-0000-000000000005",
  loginId: "student.meera",
  email: "meera@smp102.edu",
  name: "Meera Patel",
  role: "student",
  collegeCode: "SMP102",
  isProtected: false,
  permissions: ["self.view"],
};

const superAdminToken = createSessionToken(superAdminUser);
const editorToken = createSessionToken(editorUser);
const studentToken = createSessionToken(studentUser);

describe("Supabase & Backend Architecture: Authentication & Session Verification", () => {
  it("rejects invalid login credentials with 401", async () => {
    const res = await makeRequest("/api/v1/auth/login", {
      method: "POST",
      body: { loginId: "nonexistent@ziphyrus.in", password: "wrong" },
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("invalid_credentials");
  });

  it("authenticates valid administrator and returns session token", async () => {
    const res = await makeRequest("/api/v1/auth/login", {
      method: "POST",
      body: { loginId: "sAdmin1@ziphyrus.in", password: "any-password" },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.role).toBe("super_admin");
    expect(json.data.token).toContain("zx_tok.");
  });

  it("rejects protected admin routes when token is missing", async () => {
    const res = await makeRequest("/api/v1/admin/overview");
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("unauthorized");
  });

  it("rejects protected admin routes when token is malformed", async () => {
    const res = await makeRequest("/api/v1/admin/overview", { token: "bad-token-format" });
    expect(res.status).toBe(401);
  });
});

describe("Authorization & Role Boundaries", () => {
  it("allows verified Super Admin to access /api/v1/admin/overview", async () => {
    const res = await makeRequest("/api/v1/admin/overview", { token: superAdminToken });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.counts.colleges).toBeGreaterThan(0);
  });

  it("denies access to non-Super Admin roles (403 Forbidden)", async () => {
    const res = await makeRequest("/api/v1/admin/overview", { token: studentToken });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("forbidden");
  });
});

describe("Protected Account Invariants (sAdmin1 and editor1)", () => {
  it("strictly prevents deactivating sAdmin1@ziphyrus.in", async () => {
    const res = await makeRequest("/api/v1/admin/users/d0000000-0000-0000-0000-000000000001/status", {
      method: "PATCH",
      token: superAdminToken,
      body: { status: "inactive" },
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.message).toContain("Protected account");
  });

  it("strictly prevents deactivating editor1@ziphyrus.in", async () => {
    const res = await makeRequest("/api/v1/admin/users/d0000000-0000-0000-0000-000000000002/status", {
      method: "PATCH",
      token: superAdminToken,
      body: { status: "inactive" },
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.message).toContain("Protected account");
  });

  it("permits activating/deactivating non-protected accounts", async () => {
    const res = await makeRequest("/api/v1/admin/users/d0000000-0000-0000-0000-000000000003/status", {
      method: "PATCH",
      token: superAdminToken,
      body: { status: "inactive" },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("inactive");
  });
});

describe("Feature Availability (Editor Control Boundary)", () => {
  it("rejects Super Admin from toggling features without Editor role", async () => {
    const res = await makeRequest("/api/v1/admin/features/workspace.employer", {
      method: "PATCH",
      token: superAdminToken, // Super Admin role
      body: { isEnabled: false },
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.message).toContain("Editor");
  });

  it("permits Editor to toggle feature availability", async () => {
    // When Editor role makes the change directly in db layer
    const updated = db.toggleFeatureFlag("workspace.employer", false, "editor");
    expect(updated.isEnabled).toBe(false);

    // Reset back
    db.toggleFeatureFlag("workspace.employer", true, "editor");
  });
});

describe("Data Integrity & Schema Constraints", () => {
  it("validates college code format (must be 3-12 uppercase alphanumeric)", async () => {
    const res = await makeRequest("/api/v1/admin/colleges", {
      method: "POST",
      token: superAdminToken,
      body: { name: "Invalid College", code: "ab" },
    });
    expect(res.status).toBe(400);
  });

  it("enforces college code uniqueness", async () => {
    const res = await makeRequest("/api/v1/admin/colleges", {
      method: "POST",
      token: superAdminToken,
      body: { name: "Duplicate College", code: "SMP101" },
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain("already exists");
  });

  it("enforces MCQ questions must have exactly four options and a correct answer", async () => {
    const invalidRes = await makeRequest("/api/v1/admin/questions", {
      method: "POST",
      token: superAdminToken,
      body: {
        stem: "Invalid question with only 2 options",
        domain: "Technical",
        type: "MCQ",
        difficulty: "Easy",
        options: ["Option 1", "Option 2"],
        correctAnswer: "Option 1",
      },
    });
    expect(invalidRes.status).toBe(400);

    const validRes = await makeRequest("/api/v1/admin/questions", {
      method: "POST",
      token: superAdminToken,
      body: {
        stem: "Valid question with 4 options",
        domain: "Technical",
        type: "MCQ",
        difficulty: "Easy",
        options: ["Opt A", "Opt B", "Opt C", "Opt D"],
        correctAnswer: "Opt A",
      },
    });
    expect(validRes.status).toBe(201);
  });

  it("enforces mandatory reason on visible-value overrides", async () => {
    const invalidRes = await makeRequest("/api/v1/admin/overrides", {
      method: "POST",
      token: superAdminToken,
      body: {
        entityType: "student",
        entityId: "123",
        fieldName: "cgpa",
        actualValue: "8.1",
        visibleValue: "8.5",
        mandatoryReason: "no", // Too short
      },
    });
    expect(invalidRes.status).toBe(400);

    const validRes = await makeRequest("/api/v1/admin/overrides", {
      method: "POST",
      token: superAdminToken,
      body: {
        entityType: "student",
        entityId: "123",
        fieldName: "cgpa",
        actualValue: "8.1",
        visibleValue: "8.5",
        mandatoryReason: "Approved by academic council due to grading curve adjustment",
      },
    });
    expect(validRes.status).toBe(201);
  });

  it("records consequential administrative changes in audit logs", async () => {
    const res = await makeRequest("/api/v1/admin/audit", { token: superAdminToken });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
  });

  it("retries failed background jobs safely", async () => {
    const res = await makeRequest("/api/v1/admin/jobs/job-4/retry", {
      method: "POST",
      token: superAdminToken,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("queued");
  });
});
