/**
 * Authentication service boundary. The login UI only talks to `authService`.
 * The real adapter will call the backend API (which verifies credentials via
 * Supabase Auth and returns the server-verified role). The browser never
 * chooses its own role.
 */
export type Role = "super_admin" | "student" | "trainer" | "coordinator" | "editor" | "placement_officer" | "employer";

export interface Session {
  user: { id: string; loginId: string; name: string; role: Role; collegeId?: string; collegeName?: string };
  issuedAt: string;
  source: "dev-mock" | "api";
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

/** Real backend adapter — not yet connected. */
const apiAdapter: AuthAdapter = {
  async signIn() {
    throw new AuthError("not_configured", "Sign-in is not connected to the Ziphyrus X backend yet.");
  },
};

/**
 * DEVELOPMENT-ONLY mock adapter. Lets the interface be previewed. It is
 * labelled everywhere it appears and issues sessions marked "dev-mock".
 */
export const DEV_MOCK_HINT = { loginId: "dev.superadmin", password: "preview-only" };
/** Preview accounts. In api mode the role comes from the backend, never from here. */
export const DEV_MOCK_ACCOUNTS: { loginId: string; name: string; role: Role; collegeId?: string; collegeName?: string }[] = [
  { loginId: "dev.superadmin", name: "Preview Administrator", role: "super_admin" },
  { loginId: "dev.editor", name: "Preview Editor", role: "editor" },
  { loginId: "dev.coordinator", name: "Preview Coordinator", role: "coordinator", collegeId: "col-001", collegeName: "Sample Institute of Technology" },
];
const devMockAdapter: AuthAdapter = {
  async signIn(loginId, password) {
    await new Promise((r) => setTimeout(r, 900));
    if (loginId === "server.error") throw new AuthError("server_error", "The server could not be reached. Please try again.");
    const acct = DEV_MOCK_ACCOUNTS.find((a) => a.loginId === loginId);
    if (!acct || password !== DEV_MOCK_HINT.password)
      throw new AuthError("invalid_credentials", "The login ID or password is incorrect.");
    return {
      user: { id: `dev-${acct.role}`, ...acct },
      issuedAt: new Date().toISOString(),
      source: "dev-mock",
    };
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
export type WorkspaceHome = "/admin" | "/editor" | "/coordinator";
export function homeForRole(role: Role): WorkspaceHome | null {
  if (role === "super_admin") return "/admin";
  if (role === "editor") return "/editor";
  if (role === "coordinator") return "/coordinator";
  return null;
}
