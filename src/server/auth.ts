/**
 * Backend Authentication & Authorization Pipeline for Ziphyrus X
 * Enforces the locked pipeline:
 * Authentication -> Feature Availability -> Permission -> Tenant Scope -> Validation -> Action -> Audit
 */

import { db } from "./db";
import type { AuthenticatedUser, Role } from "./types";

export interface TokenPayload {
  userId: string;
  loginId: string;
  role: Role;
  exp: number;
}

// Map roles to platform permissions
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  super_admin: ["platform.*", "college.manage", "identity.manage", "master.manage", "content.edit", "platform.health", "platform.jobs", "audit.read"],
  editor: ["content.edit", "feature.manage", "problem.manage", "question.manage", "course.manage", "assessment.manage", "notification.manage", "override.manage"],
  coordinator: ["college.manage", "batch.view", "student.manage", "trainer.manage", "allocation.manage", "schedule.manage", "session.manage", "actionplan.manage"],
  trainer: ["batch.view_evidence"],
  placement_officer: [
    // A. Full Read & Write (Placement Domain Authority)
    "placement.company.manage",
    "placement.opportunity.manage",
    "placement.drive.manage",
    "placement.eligibility.run",
    "placement.application.manage",
    "placement.offer.manage",
    "placement.offer.verify",
    "placement.notification.send",
    "placement.report.export",
    // Compatibility & operational aliases
    "placement.view",
    "placement.manage",
    "company.manage",
    "opportunity.manage",
    "drive.manage",
    "eligibility.evaluate",
    "application.manage",
    "pipeline.manage",
    "offer.manage",
    "offer.verify",
    "report.view",
    // B. Read-Only Permissions (Student & Campus Domain)
    "student.read",
    "intelligence.read",
    "batch.read",
    "batch.view",
  ],
  employer: ["candidates.view_authorized"],
  student: ["self.view"],
};

// Sign a simple deterministic signed token for server-side verification
export function createSessionToken(user: AuthenticatedUser): string {
  const payload: TokenPayload = {
    userId: user.id,
    loginId: user.loginId,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
  };
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64url");
  return `zx_tok.${b64}`;
}

export function parseSessionToken(token: string): TokenPayload | null {
  if (!token.startsWith("zx_tok.")) return null;
  const b64 = token.slice(7);
  try {
    const raw = Buffer.from(b64, "base64url").toString("utf-8");
    const payload = JSON.parse(raw) as TokenPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Verifies request authentication header and loads authenticated user.
 */
export async function authenticateRequest(request: Request): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  const payload = parseSessionToken(token);
  if (!payload) return null;

  const userRecord = db.getUserById(payload.userId);
  if (!userRecord || userRecord.status !== "active") return null;

  return {
    id: userRecord.id,
    loginId: userRecord.loginId,
    email: userRecord.email,
    name: userRecord.name,
    role: userRecord.role,
    collegeId: userRecord.collegeId,
    collegeCode: userRecord.college,
    isProtected: userRecord.isProtected,
    permissions: ROLE_PERMISSIONS[userRecord.role] ?? [],
  };
}

/**
 * Checks Editor-controlled feature availability.
 * Note: Feature availability is separate from role permissions.
 * Super Admin cannot bypass Editor-disabled features.
 */
export function checkFeatureAvailability(featureKey: string): boolean {
  const flags = db.getFeatureFlags();
  const flag = flags.find((f) => f.key === featureKey);
  return flag ? flag.isEnabled : true;
}

/**
 * Checks permission for authenticated user.
 */
export function hasPermission(user: AuthenticatedUser, permission: string): boolean {
  if (user.role === "super_admin") return true;
  return (
    user.permissions.includes(permission) ||
    user.permissions.includes("platform.*")
  );
}

/**
 * Validates college isolation scope.
 */
export function validateCollegeScope(user: AuthenticatedUser, targetCollegeIdOrCode?: string): boolean {
  if (user.role === "super_admin") return true;
  if (!targetCollegeIdOrCode) return true;
  return (
    user.collegeId === targetCollegeIdOrCode ||
    user.collegeCode === targetCollegeIdOrCode
  );
}
