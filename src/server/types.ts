/**
 * Server-side API & Authorization Types for Ziphyrus X
 */

export type Role =
  | "super_admin"
  | "student"
  | "trainer"
  | "coordinator"
  | "editor"
  | "placement_officer"
  | "employer";

export interface AuthenticatedUser {
  id: string;
  loginId: string;
  email: string;
  name: string;
  role: Role;
  collegeId?: string | null;
  collegeCode?: string | null;
  isProtected: boolean;
  permissions: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: string;
}
