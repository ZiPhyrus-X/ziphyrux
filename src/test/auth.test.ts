import { describe, expect, it } from "vitest";
import { authService, homeForRole } from "@/lib/auth/service";

describe("auth rules", () => {
  it("routes authorized roles to their respective workspaces", () => {
    expect(homeForRole("super_admin")).toBe("/admin");
    expect(homeForRole("editor")).toBe("/editor");
    expect(homeForRole("coordinator")).toBe("/coordinator");
    expect(homeForRole("student")).toBe("/student");
    expect(homeForRole("trainer")).toBe("/trainer");
    expect(homeForRole("placement_officer")).toBe("/placement");
  });
  it("rejects wrong credentials in the dev preview", async () => {
    await expect(authService.signIn("dev.superadmin", "wrong", false)).rejects.toMatchObject({ kind: "invalid_credentials" });
  });
});
