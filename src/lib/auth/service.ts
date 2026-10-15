/**
 * Authentication service boundary. The login UI only talks to `authService`.
 * The real adapter will call the backend API (which verifies credentials via
 * Supabase Auth and returns the server-verified role). The browser never
 * chooses its own role.
 */
export type Role = "super_admin" | "student" | "trainer" | "coordinator" | "editor" | "placement_officer" | "employer";

export interface Session {
  user: { id: string; loginId: string; name: string; role: Role; collegeCode?: string; email?: string };
  issuedAt: string;
  source: "dev-mock" | "api";
  token?: string;
}

export class AuthError extends Error {
  constructor(public kind: "invalid_credentials" | "server_error" | "not_configured", message: string) {
    super(message);
  }
}

export interface AuthAdapter {
  signIn(loginId: string, password: string): Promise<Session>;
}

const KEY = "zx-session";

/** Real backend adapter connected to /api/v1/auth/login */
const apiAdapter: AuthAdapter = {
  async signIn(loginId: string, password: string): Promise<Session> {
    try {
      const origin = typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null"
        ? window.location.origin
        : "http://localhost:8080";
      const res = await fetch(`${origin}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { user: Session["user"]; token: string; issuedAt: string };
        error?: { code: string; message: string };
      };
      if (!res.ok || !data.success || !data.data) {
        if (res.status === 401 || data.error?.code === "invalid_credentials") {
          throw new AuthError("invalid_credentials", data.error?.message ?? "The login ID or password is incorrect.");
        }
        if (res.status === 403) {
          throw new AuthError("invalid_credentials", data.error?.message ?? "This account is inactive.");
        }
        throw new AuthError("server_error", data.error?.message ?? "The server could not be reached. Please try again.");
      }
      return {
        user: data.data.user,
        issuedAt: data.data.issuedAt ?? new Date().toISOString(),
        source: "api",
        token: data.data.token,
      };
    } catch (e) {
      if (e instanceof AuthError) throw e;
      if (loginId !== "sAdmin1@ziphyrus.in" && loginId !== "superadmin@ziphyrus.in") {
        throw new AuthError("invalid_credentials", "The login ID or password is incorrect.");
      }
      throw new AuthError("server_error", e instanceof Error ? e.message : "Connection failed.");
    }
  },
};

/**
 * DEVELOPMENT-ONLY mock adapter. Lets the interface be previewed. It is
 * labelled everywhere it appears and issues sessions marked "dev-mock".
 */
export const DEV_MOCK_HINT = { loginId: "dev.superadmin", password: "preview-only" };
const devMockAdapter: AuthAdapter = {
  async signIn(loginId, password) {
    try {
      return await apiAdapter.signIn(loginId, password);
    } catch (e) {
      if (e instanceof AuthError && e.kind === "invalid_credentials") {
        throw e;
      }
      if (loginId === DEV_MOCK_HINT.loginId && password === DEV_MOCK_HINT.password) {
        return {
          user: { id: "dev-0001", loginId, name: "Preview Administrator", role: "super_admin" },
          issuedAt: new Date().toISOString(),
          source: "dev-mock",
        };
      }
      if (loginId === "dev.trainer" && password === "preview-only") {
        return {
          user: { id: "d0000000-0000-0000-0000-000000000004", loginId: "dev.trainer", name: "Rohan Deshmukh", role: "trainer", collegeCode: "SMP101", email: "rohan@smp101.edu" },
          issuedAt: new Date().toISOString(),
          source: "dev-mock",
        };
      }
      if (loginId === "dev.placement" && password === "preview-only") {
        return {
          user: { id: "d0000000-0000-0000-0000-000000000011", loginId: "dev.placement", name: "Vikram Malhotra", role: "placement_officer", collegeCode: "SMP101", email: "placement@smp101.edu" },
          issuedAt: new Date().toISOString(),
          source: "dev-mock",
        };
      }
      throw e;
    }
  },
};

export const AUTH_MODE: "dev-mock" | "api" = import.meta.env["VITE_AUTH_MODE"] === "api" ? "api" : "dev-mock";
const adapter = AUTH_MODE === "api" ? apiAdapter : devMockAdapter;

export const authService = {
  async signIn(loginId: string, password: string, remember: boolean) {
    const s = await adapter.signIn(loginId.trim(), password);
    (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(s));
    return s;
  },
  getSession(): Session | null {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
    try {
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },
  signOut() {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  },
};

/** Where a verified role lands after sign-in. Unbuilt workspaces return null. */
export function homeForRole(role: Role): "/admin" | "/editor" | "/coordinator" | "/student" | "/trainer" | "/placement" | null {
  if (role === "super_admin") return "/admin";
  if (role === "editor") return "/editor";
  if (role === "coordinator") return "/coordinator";
  if (role === "student") return "/student";
  if (role === "trainer") return "/trainer";
  if (role === "placement_officer") return "/placement";
  return null;
}
