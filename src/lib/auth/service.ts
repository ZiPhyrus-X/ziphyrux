/**
 * Authentication service boundary. The login UI only talks to `authService`.
 * The real adapter will call the backend API (which verifies credentials via
 * Supabase Auth and returns the server-verified role). The browser never
 * chooses its own role.
 */
export type Role = "super_admin" | "student" | "trainer" | "coordinator" | "editor" | "placement_officer" | "employer";

export interface Session {
  user: { id: string; loginId: string; name: string; role: Role };
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
const devMockAdapter: AuthAdapter = {
  async signIn(loginId, password) {
    await new Promise((r) => setTimeout(r, 900));
    if (loginId === "server.error") throw new AuthError("server_error", "The server could not be reached. Please try again.");
    if (loginId !== DEV_MOCK_HINT.loginId || password !== DEV_MOCK_HINT.password)
      throw new AuthError("invalid_credentials", "The login ID or password is incorrect.");
    return {
      user: { id: "dev-0001", loginId, name: "Preview Administrator", role: "super_admin" },
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
export function homeForRole(role: Role): "/admin" | null {
  return role === "super_admin" ? "/admin" : null;
}
