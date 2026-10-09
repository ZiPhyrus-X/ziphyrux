/**
 * Central API boundary. Production services will call the Ziphyrus X backend
 * with the verified bearer token. Until endpoints exist, workspaces use the
 * isolated mock services in src/features/<role>/mock-service.ts — never as a
 * silent fallback when a real request fails.
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function describeApiError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "Your session has expired. Please sign in again.";
    if (e.status === 403) return "You don't have permission to do this.";
    return e.message;
  }
  return "Something went wrong. Please try again.";
}

/** Simulated backend latency for development mock services only. */
export const mockDelay = <T,>(value: T, ms = 500) => new Promise<T>((r) => setTimeout(() => r(structuredClone(value)), ms));
export const nowIso = () => new Date().toISOString();
