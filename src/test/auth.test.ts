import { describe, expect, it } from "vitest";
import { authService, homeForRole } from "@/lib/auth/service";

describe("auth rules", () => {
  it("only the super admin role has a workspace today", () => {
    expect(homeForRole("super_admin")).toBe("/admin");
    expect(homeForRole("editor")).toBe("/editor");
    expect(homeForRole("coordinator")).toBe("/coordinator");
    expect(homeForRole("student")).toBeNull();
    expect(homeForRole("trainer")).toBeNull();
  });
  it("rejects wrong credentials in the dev preview", async () => {
    await expect(authService.signIn("dev.superadmin", "wrong", false)).rejects.toMatchObject({ kind: "invalid_credentials" });
  });
});
