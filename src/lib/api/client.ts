/**
 * Typed Backend API Client for Ziphyrus X Super Admin
 * Sends authenticated requests to /api/v1/*
 */

import { authService } from "../auth/service";

export interface ApiClientError extends Error {
  code?: string;
  status?: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = authService.getSession();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  // Include verified token if available
  if (session && "token" in session && typeof (session as { token?: string }).token === "string") {
    headers.set("Authorization", `Bearer ${(session as { token?: string }).token}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.success === false) {
    const err = new Error(json?.error?.message ?? `Request failed with status ${res.status}`) as ApiClientError;
    err.code = json?.error?.code ?? "unknown_error";
    err.status = res.status;
    throw err;
  }

  return (json.data ?? json) as T;
}

export function wrapResponse<T>(val: T): T & { ok: boolean; data: T } {
  if (val && typeof val === "object") {
    try {
      (val as any).ok = true;
      (val as any).data = (val as any).data ?? val;
    } catch {}
  }
  return val as any;
}

export const api = {
  overview: {
    get: () => request<any>("/api/v1/admin/overview"),
  },
  colleges: {
    list: (searchOrParams?: string | { search?: string; status?: string }, statusParam?: string) => {
      const q = new URLSearchParams();
      if (typeof searchOrParams === "object" && searchOrParams !== null) {
        if (searchOrParams.search) q.set("search", searchOrParams.search);
        if (searchOrParams.status && searchOrParams.status !== "all") q.set("status", searchOrParams.status);
      } else {
        if (searchOrParams) q.set("search", searchOrParams);
        if (statusParam && statusParam !== "all") q.set("status", statusParam);
      }
      const qs = q.toString();
      return request<any[]>(`/api/v1/admin/colleges${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<any>(`/api/v1/admin/colleges/${id}`),
    create: (data: { name: string; code: string; status?: string }) =>
      request<any>("/api/v1/admin/colleges", { method: "POST", body: JSON.stringify(data) }),
    updateStatus: (id: string, data: { status: "active" | "hold" | "deactive"; reason: string }) =>
      request<any>(`/api/v1/admin/colleges/${id}/status`, { method: "PATCH", body: JSON.stringify(data) }),
    updateCode: (id: string, data: { newCode: string; reason: string }) =>
      request<any>(`/api/v1/admin/colleges/${id}/code`, { method: "PATCH", body: JSON.stringify(data) }),
    getStatusHistory: (id: string) => request<any[]>(`/api/v1/admin/colleges/${id}/status-history`),
    getCodeHistory: (id: string) => request<any[]>(`/api/v1/admin/colleges/${id}/code-history`),
  },
  users: {
    list: (search?: string, role?: string, status?: string) => {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (role && role !== "all") q.set("role", role);
      if (status && status !== "all") q.set("status", status);
      const qs = q.toString();
      return request<any[]>(`/api/v1/admin/users${qs ? `?${qs}` : ""}`);
    },
    updateStatus: (id: string, status: "active" | "inactive") =>
      request<any>(`/api/v1/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  },
  roles: {
    list: () => request<any[]>("/api/v1/admin/roles"),
  },
  masterData: {
    list: () => request<any[]>("/api/v1/admin/master-data"),
  },
  coding: {
    listProblems: () => request<any[]>("/api/v1/admin/coding/problems"),
    createProblem: (data: { title: string; difficulty: "Easy" | "Medium" | "Hard"; topic: string }) =>
      request<any>("/api/v1/admin/coding/problems", { method: "POST", body: JSON.stringify(data) }),
  },
  questions: {
    list: () => request<any[]>("/api/v1/admin/questions"),
    create: (data: {
      stem: string;
      domain: "Technical" | "Verbal" | "Aptitude" | "Soft Skills";
      type: "MCQ" | "Long Answer" | "Short Answer";
      difficulty: "Easy" | "Medium" | "Hard";
      options?: string[];
      correctAnswer?: string;
    }) => request<any>("/api/v1/admin/questions", { method: "POST", body: JSON.stringify(data) }),
  },
  health: {
    getServices: () => request<any[]>("/api/v1/admin/health"),
  },
  integrations: {
    list: () => request<any[]>("/api/v1/admin/integrations"),
  },
  jobs: {
    list: () => request<any[]>("/api/v1/admin/jobs"),
    retry: (id: string) => request<any>(`/api/v1/admin/jobs/${id}/retry`, { method: "POST" }),
  },
  audit: {
    list: () => request<any[]>("/api/v1/admin/audit"),
  },
  features: {
    list: () => request<any[]>("/api/v1/admin/features"),
    toggle: (key: string, isEnabled: boolean) =>
      request<any>(`/api/v1/admin/features/${key}`, { method: "PATCH", body: JSON.stringify({ isEnabled }) }),
  },
  overrides: {
    list: () => request<any[]>("/api/v1/admin/overrides"),
    create: (data: {
      entityType: string;
      entityId: string;
      fieldName: string;
      actualValue: string;
      visibleValue: string;
      mandatoryReason: string;
    }) => request<any>("/api/v1/admin/overrides", { method: "POST", body: JSON.stringify(data) }),
  },
  editors: {
    create: (data: { name: string; email: string }) =>
      request<any>("/api/v1/admin/editors", { method: "POST", body: JSON.stringify(data) }),
  },
  editorChanges: {
    list: (entityType?: string, search?: string) => {
      const q = new URLSearchParams();
      if (entityType && entityType !== "all") q.set("entityType", entityType);
      if (search) q.set("search", search);
      const qs = q.toString();
      return request<any[]>(`/api/v1/admin/editor-changes${qs ? `?${qs}` : ""}`);
    },
  },
  intelligence: {
    getMetrics: () => request<Record<string, any>>("/api/v1/admin/intelligence/metrics"),
    getProvenance: () => request<any[]>("/api/v1/admin/intelligence/provenance"),
    getReconciliation: (scope = "platform", params?: Record<string, string>) => {
      const q = new URLSearchParams({ scope, ...(params || {}) });
      return request<any>(`/api/v1/admin/intelligence/reconciliation?${q.toString()}`);
    },
    getPlatform: (view?: "authoritative" | "adjusted") => {
      const q = view ? `?view=${view}` : "";
      return request<any>(`/api/v1/admin/intelligence/platform${q}`);
    },
    getCollege: (collegeCode: string, view?: "authoritative" | "adjusted") => {
      const q = view ? `?view=${view}` : "";
      return request<any>(`/api/v1/admin/intelligence/college/${collegeCode}${q}`);
    },
    getBranch: (collegeCode: string, department: string, view?: "authoritative" | "adjusted") => {
      const q = new URLSearchParams({ collegeCode, department });
      if (view) q.set("view", view);
      return request<any>(`/api/v1/admin/intelligence/branch?${q.toString()}`);
    },
    getYear: (collegeCode: string, department: string, year: string, view?: "authoritative" | "adjusted") => {
      const q = new URLSearchParams({ collegeCode, department, year });
      if (view) q.set("view", view);
      return request<any>(`/api/v1/admin/intelligence/year?${q.toString()}`);
    },
    getSection: (collegeCode: string, department: string, year: string, section: string, view?: "authoritative" | "adjusted") => {
      const q = new URLSearchParams({ collegeCode, department, year, section });
      if (view) q.set("view", view);
      return request<any>(`/api/v1/admin/intelligence/section?${q.toString()}`);
    },
    getStudent: (studentId: string, view?: "authoritative" | "adjusted") => {
      const q = view ? `?view=${view}` : "";
      return request<any>(`/api/v1/admin/intelligence/student/${studentId}${q}`);
    },
    getCharts: (collegeCode?: string, status?: string, view?: "authoritative" | "adjusted") => {
      const q = new URLSearchParams();
      if (collegeCode) q.set("collegeCode", collegeCode);
      if (status && status !== "all") q.set("status", status);
      if (view) q.set("view", view);
      const qs = q.toString();
      return request<any>(`/api/v1/admin/intelligence/charts${qs ? `?${qs}` : ""}`);
    },
  },
  reports: {
    list: () => request<any[]>("/api/v1/admin/reports"),
    generate: (data: {
      reportType: string;
      collegeCode?: string;
      policy?: "standard_progress" | "intelligence" | "audit";
      format?: "csv" | "json" | "xlsx";
    }) => request<any>("/api/v1/admin/reports/generate", { method: "POST", body: JSON.stringify(data) }),
    export: (reportId?: string, format: "csv" | "json" = "csv") =>
      request<any>("/api/v1/admin/reports/export", { method: "POST", body: JSON.stringify({ reportId, format }) }),
  },
  ingestion: {
    record: (data: { collegeCode: string; payload?: Record<string, unknown> }) =>
      request<any>("/api/v1/ingestion/record", { method: "POST", body: JSON.stringify(data) }),
  },
  editor: {
    overview: () => request<any>("/api/v1/editor/overview"),
    colleges: {
      list: (searchOrParams?: string | { search?: string; status?: string }, statusParam?: string) => {
        const q = new URLSearchParams();
        if (typeof searchOrParams === "object" && searchOrParams !== null) {
          if (searchOrParams.search) q.set("search", searchOrParams.search);
          if (searchOrParams.status && searchOrParams.status !== "all") q.set("status", searchOrParams.status);
        } else {
          if (searchOrParams) q.set("search", searchOrParams);
          if (statusParam && statusParam !== "all") q.set("status", statusParam);
        }
        const qs = q.toString();
        return request<any[]>(`/api/v1/editor/colleges${qs ? `?${qs}` : ""}`);
      },
      get: (id: string) => request<any>(`/api/v1/editor/colleges/${id}`),
      updateStatus: (id: string, data: { status: "active" | "hold" | "deactive"; reason: string }) =>
        request<any>(`/api/v1/editor/colleges/${id}/status`, { method: "PATCH", body: JSON.stringify(data) }),
      updateCode: (id: string, data: { newCode: string; reason: string }) =>
        request<any>(`/api/v1/editor/colleges/${id}/code`, { method: "PATCH", body: JSON.stringify(data) }),
      getStatusHistory: (id: string) => request<any[]>(`/api/v1/editor/colleges/${id}/status-history`),
      getCodeHistory: (id: string) => request<any[]>(`/api/v1/editor/colleges/${id}/code-history`),
    },
    courses: {
      list: (params?: { moduleId?: string; status?: string; difficulty?: string; search?: string }) => {
        const q = new URLSearchParams();
        if (params?.moduleId && params.moduleId !== "all") q.set("moduleId", params.moduleId);
        if (params?.status && params.status !== "all") q.set("status", params.status);
        if (params?.difficulty && params.difficulty !== "all") q.set("difficulty", params.difficulty);
        if (params?.search) q.set("search", params.search);
        const qs = q.toString();
        return request<any[]>(`/api/v1/editor/learning/courses${qs ? `?${qs}` : ""}`);
      },
      get: (id: string) => request<any>(`/api/v1/editor/learning/courses/${id}`),
      create: (data: { title: string; modulesCount?: number; lessonsCount?: number; learningModuleId?: string; difficulty?: string; description?: string }) =>
        request<any>("/api/v1/editor/courses", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: any) =>
        request<any>(`/api/v1/editor/learning/courses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      updateStatus: (id: string, status: "draft" | "published" | "archived") =>
        request<any>(`/api/v1/editor/courses/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
      delete: (id: string) =>
        request<any>(`/api/v1/editor/courses/${id}`, { method: "DELETE" }),
      createVersion: (id: string, data?: any) =>
        request<any>(`/api/v1/editor/learning/courses/${id}/version`, { method: "POST", body: JSON.stringify(data || {}) }),
      submitForReview: (id: string) =>
        request<any>(`/api/v1/editor/learning/courses/${id}/submit`, { method: "POST" }),
      publish: (id: string) =>
        request<any>(`/api/v1/editor/learning/courses/${id}/publish`, { method: "POST" }),
      archive: (id: string) =>
        request<any>(`/api/v1/editor/learning/courses/${id}/archive`, { method: "POST" }),
      addModule: (versionId: string, data: { title: string; description?: string }) =>
        request<any>(`/api/v1/editor/learning/versions/${versionId}/modules`, { method: "POST", body: JSON.stringify(data) }),
      addTopic: (chapterId: string, data: { title: string; description?: string }) =>
        request<any>(`/api/v1/editor/learning/chapters/${chapterId}/topics`, { method: "POST", body: JSON.stringify(data) }),
      addLesson: (topicId: string, data: { title: string; lessonType?: string; lessonContent?: string; durationMinutes?: number }) =>
        request<any>(`/api/v1/editor/learning/topics/${topicId}/lessons`, { method: "POST", body: JSON.stringify(data) }),
      addActivity: (lessonId: string, data: { activityType: string; title: string; linkedQuestionId?: string; linkedProblemId?: string }) =>
        request<any>(`/api/v1/editor/learning/lessons/${lessonId}/activities`, { method: "POST", body: JSON.stringify(data) }),
      deleteActivity: (activityId: string) =>
        request<any>(`/api/v1/editor/learning/activities/${activityId}`, { method: "DELETE" }),
    },
    learning: {
      modules: {
        list: () => request<any[]>("/api/v1/editor/learning/modules"),
        get: (id: string) => request<any>(`/api/v1/editor/learning/modules/${id}`),
        create: (data: { name: string; description?: string }) =>
          request<any>("/api/v1/editor/learning/modules", { method: "POST", body: JSON.stringify(data) }),
        update: (id: string, data: { name?: string; description?: string }) =>
          request<any>(`/api/v1/editor/learning/modules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
        updateVisibility: (id: string, data: { visibilityStatus: "hidden" | "visible"; collegeIds?: string[]; confirmRevoke?: boolean }) =>
          request<any>(`/api/v1/editor/learning/modules/${id}/visibility`, { method: "PATCH", body: JSON.stringify(data) }),
        getAccess: (id: string) => request<any[]>(`/api/v1/editor/learning/modules/${id}/access`),
        grantAccess: (id: string, collegeId: string) =>
          request<any>(`/api/v1/editor/learning/modules/${id}/access`, { method: "POST", body: JSON.stringify({ collegeId }) }),
        revokeAccess: (id: string, collegeId: string, confirmRevoke?: boolean) =>
          request<any>(`/api/v1/editor/learning/modules/${id}/access/${collegeId}${confirmRevoke ? "?confirmRevoke=true" : ""}`, { method: "DELETE" }),
        archive: (id: string) =>
          request<any>(`/api/v1/editor/learning/modules/${id}/archive`, { method: "POST" }),
        delete: (id: string) =>
          request<any>(`/api/v1/editor/learning/modules/${id}`, { method: "DELETE" }),
      },
      uploadHistory: {
        list: (params?: { moduleId?: string; uploadMethod?: string; status?: string; search?: string }) => {
          const q = new URLSearchParams();
          if (params?.moduleId && params.moduleId !== "all") q.set("moduleId", params.moduleId);
          if (params?.uploadMethod && params.uploadMethod !== "all") q.set("uploadMethod", params.uploadMethod);
          if (params?.status && params.status !== "all") q.set("status", params.status);
          if (params?.search) q.set("search", params.search);
          const qs = q.toString();
          return request<any[]>(`/api/v1/editor/learning/upload-history${qs ? `?${qs}` : ""}`);
        },
        get: (id: string) => request<any>(`/api/v1/editor/learning/upload-history/${id}`),
        bulkUpload: (data: { moduleId: string; filename: string; uploadMethod?: string; items: any[] }) =>
          request<any>("/api/v1/editor/learning/bulk-upload", { method: "POST", body: JSON.stringify(data) }),
      },
    },
    modules: {
      list: () => request<any[]>("/api/v1/editor/modules"),
      get: (id: string) => request<any>(`/api/v1/editor/modules/${id}`),
      create: (data: {
        name: string;
        description?: string;
        moduleKind?: "assessment" | "coding";
        blueprintCode?: string;
        targetDifficulty?: "Beginner" | "Intermediate" | "Advanced";
        domain?: "Technical" | "Aptitude" | "Verbal" | "Soft Skills" | "Coding" | "Core Engineering";
      }) =>
        request<any>("/api/v1/editor/modules", { method: "POST", body: JSON.stringify(data) }),
      delete: (id: string) =>
        request<any>(`/api/v1/editor/modules/${id}`, { method: "DELETE" }),
      update: (
        id: string,
        data: {
          name?: string;
          description?: string;
          code?: string;
          blueprintCode?: string;
          domain?: "Technical" | "Aptitude" | "Verbal" | "Soft Skills" | "Coding" | "Core Engineering";
          targetDifficulty?: "Beginner" | "Intermediate" | "Advanced";
        }
      ) =>
        request<any>(`/api/v1/editor/modules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      updateVisibility: (id: string, data: { visibilityStatus: "hidden" | "visible"; collegeIds?: string[]; confirmRevoke?: boolean }) =>
        request<any>(`/api/v1/editor/modules/${id}/visibility`, { method: "PATCH", body: JSON.stringify(data) }),
      getAccess: (id: string) => request<any[]>(`/api/v1/editor/modules/${id}/access`),
      grantAccess: (id: string, collegeId: string) =>
        request<any>(`/api/v1/editor/modules/${id}/access`, { method: "POST", body: JSON.stringify({ collegeId }) }),
      revokeAccess: (id: string, collegeId: string, confirmRevoke?: boolean) =>
        request<any>(`/api/v1/editor/modules/${id}/access/${collegeId}${confirmRevoke ? "?confirmRevoke=true" : ""}`, { method: "DELETE" }),
      archive: (id: string) =>
        request<any>(`/api/v1/editor/modules/${id}/archive`, { method: "POST" }),
    },
    coding: {
      listProblems: (params?: { status?: string; topic?: string; difficulty?: string; search?: string }) => {
        const q = new URLSearchParams();
        if (params?.status && params.status !== "all") q.set("status", params.status);
        if (params?.topic && params.topic !== "all") q.set("topic", params.topic);
        if (params?.difficulty && params.difficulty !== "all") q.set("difficulty", params.difficulty);
        if (params?.search) q.set("search", params.search);
        const qs = q.toString();
        return request<any[]>(`/api/v1/editor/coding/problems${qs ? `?${qs}` : ""}`);
      },
      getProblem: (id: string) => request<any>(`/api/v1/editor/coding/problems/${id}`),
      createProblem: (data: any) =>
        request<any>("/api/v1/editor/coding/problems", { method: "POST", body: JSON.stringify(data) }),
      updateProblem: (id: string, data: any) =>
        request<any>(`/api/v1/editor/coding/problems/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      createVersion: (id: string, data: any) =>
        request<any>(`/api/v1/editor/coding/problems/${id}/version`, { method: "POST", body: JSON.stringify(data) }),
      validateReferenceSolution: (id: string) =>
        request<any>(`/api/v1/editor/coding/problems/${id}/validate`, { method: "POST" }),
      submit: (id: string) =>
        request<any>(`/api/v1/editor/coding/problems/${id}/submit`, { method: "POST" }),
      review: (id: string, action: "return_to_draft" | "approve_and_publish" | "archive") =>
        request<any>(`/api/v1/editor/coding/problems/${id}/review`, { method: "POST", body: JSON.stringify({ action }) }),
      getSubmissions: (id: string) =>
        request<any[]>(`/api/v1/editor/coding/problems/${id}/submissions`),
      bulkImport: (data: { moduleId?: string; problems: any[] }) =>
        request<any>("/api/v1/editor/coding/problems/bulk-import", { method: "POST", body: JSON.stringify(data) }),
      deleteProblem: (id: string) =>
        request<any>(`/api/v1/editor/coding/problems/${id}`, { method: "DELETE" }),
    },
    questions: {
      list: (params?: { moduleId?: string; status?: string; type?: string; difficulty?: string; search?: string }) => {
        const q = new URLSearchParams();
        if (params?.moduleId && params.moduleId !== "all") q.set("moduleId", params.moduleId);
        if (params?.status && params.status !== "all") q.set("status", params.status);
        if (params?.type && params.type !== "all") q.set("type", params.type);
        if (params?.difficulty && params.difficulty !== "all") q.set("difficulty", params.difficulty);
        if (params?.search) q.set("search", params.search);
        const qs = q.toString();
        return request<any[]>(`/api/v1/editor/questions${qs ? `?${qs}` : ""}`);
      },
      get: (id: string) => request<any>(`/api/v1/editor/questions/${id}`),
      create: (data: {
        moduleId: string;
        stem: string;
        domain?: string;
        type: "MCQ" | "Long Answer" | "Short Answer";
        difficulty: "Easy" | "Medium" | "Hard";
        options?: string[];
        correctAnswer?: string;
        expectedAnswer?: string;
        rubric?: string;
        explanation?: string;
        tags?: string[];
        submitForReview?: boolean;
      }) => request<any>("/api/v1/editor/questions", { method: "POST", body: JSON.stringify(data) }),
      updateDraft: (id: string, data: any) =>
        request<any>(`/api/v1/editor/questions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      createVersion: (id: string, data: any) =>
        request<any>(`/api/v1/editor/questions/${id}/version`, { method: "POST", body: JSON.stringify(data) }),
      submit: (id: string) =>
        request<any>(`/api/v1/editor/questions/${id}/submit`, { method: "POST" }),
      review: (id: string, action: "return_to_draft" | "approve_and_publish" | "archive") =>
        request<any>(`/api/v1/editor/questions/${id}/review`, { method: "POST", body: JSON.stringify({ action }) }),
      archive: (id: string) =>
        request<any>(`/api/v1/editor/questions/${id}/archive`, { method: "POST" }),
      delete: (id: string) =>
        request<any>(`/api/v1/editor/questions/${id}`, { method: "DELETE" }),
      getUploadHistory: (params?: { moduleId?: string; search?: string; uploadMethod?: string; status?: string }) => {
        const q = new URLSearchParams();
        if (params?.moduleId && params.moduleId !== "all") q.set("moduleId", params.moduleId);
        if (params?.search) q.set("search", params.search);
        if (params?.uploadMethod && params.uploadMethod !== "all") q.set("uploadMethod", params.uploadMethod);
        if (params?.status && params.status !== "all") q.set("status", params.status);
        const qs = q.toString();
        return request<any[]>(`/api/v1/editor/questions/upload-history${qs ? `?${qs}` : ""}`);
      },
      getUploadBatch: (batchId: string) =>
        request<any>(`/api/v1/editor/questions/upload-batches/${batchId}`),
      validateUpload: (data: { content: string; format: "csv" | "json" | "xlsx"; moduleId: string }) =>
        request<{
          totalRows: number;
          validRows: number;
          invalidRows: number;
          duplicateRows: number;
          warnings: string[];
          rows: { rowNumber: number; valid: boolean; data: any; errors: string[] }[];
        }>("/api/v1/editor/questions/upload/validate", { method: "POST", body: JSON.stringify(data) }),
      confirmUpload: (data: {
        moduleId: string;
        filename: string;
        uploadMethod: string;
        validatedRows: any[];
      }) => request<any>("/api/v1/editor/questions/upload/confirm", { method: "POST", body: JSON.stringify(data) }),
    },
    assessment: {
      modules: {
        list: (params?: { search?: string; domain?: string }) => {
          const q = new URLSearchParams();
          if (params?.search) q.set("search", params.search);
          if (params?.domain && params.domain !== "all") q.set("domain", params.domain);
          const qs = q.toString();
          return request<any[]>(`/api/v1/editor/assessment/modules${qs ? `?${qs}` : ""}`);
        },
        get: (id: string) => request<any>(`/api/v1/editor/assessment/modules/${id}`),
        create: (data: { name: string; domain?: string; description?: string }) =>
          request<any>("/api/v1/editor/assessment/modules", { method: "POST", body: JSON.stringify(data) }),
        update: (id: string, data: any) =>
          request<any>(`/api/v1/editor/assessment/modules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
        updateVisibility: (id: string, data: { visibilityStatus: "visible" | "hidden"; collegeIds?: string[] }) =>
          request<any>(`/api/v1/editor/assessment/modules/${id}/visibility`, { method: "PATCH", body: JSON.stringify(data) }),
        delete: (id: string) =>
          request<any>(`/api/v1/editor/assessment/modules/${id}`, { method: "DELETE" }),
      },
      list: (params?: { moduleId?: string; search?: string }) => {
        const q = new URLSearchParams();
        if (params?.moduleId && params.moduleId !== "all") q.set("moduleId", params.moduleId);
        if (params?.search) q.set("search", params.search);
        const qs = q.toString();
        return request<any[]>(`/api/v1/editor/assessments${qs ? `?${qs}` : ""}`);
      },
      create: (data: any) => request<any>("/api/v1/editor/assessments", { method: "POST", body: JSON.stringify(data) }),
      delete: (id: string) => request<any>(`/api/v1/editor/assessments/${id}`, { method: "DELETE" }),
    },
    assessments: {
      list: (params?: { moduleId?: string; search?: string }) => {
        const q = new URLSearchParams();
        if (params?.moduleId && params.moduleId !== "all") q.set("moduleId", params.moduleId);
        if (params?.search) q.set("search", params.search);
        const qs = q.toString();
        return request<any[]>(`/api/v1/editor/assessments${qs ? `?${qs}` : ""}`);
      },
      create: (data: {
        title: string;
        domain?: "Technical" | "Aptitude" | "Core Engineering" | "Soft Skills" | "Verbal" | "Coding";
        moduleId?: string;
        questionsCount?: number;
      }) => request<any>("/api/v1/editor/assessments", { method: "POST", body: JSON.stringify(data) }),
      delete: (id: string) => request<any>(`/api/v1/editor/assessments/${id}`, { method: "DELETE" }),
    },
    notifications: {
      list: () => request<any[]>("/api/v1/editor/notifications"),
      create: (data: {
        title: string;
        message: string;
        targetRole: "all" | "student" | "trainer" | "coordinator" | string;
        collegeScope?: string;
        durationDays?: number;
      }) => request<any>("/api/v1/editor/notifications", { method: "POST", body: JSON.stringify(data) }),
      delete: (id: string) => request<{ success: boolean; id: string }>(`/api/v1/editor/notifications/${id}`, { method: "DELETE" }),
    },
    features: {
      list: () => request<any[]>("/api/v1/editor/features"),
      toggle: (key: string, isEnabled: boolean) =>
        request<any>(`/api/v1/editor/features/${key}`, { method: "PATCH", body: JSON.stringify({ isEnabled }) }),
    },
    overrides: {
      list: (params?: { search?: string; college?: string; status?: string; mine?: boolean }) => {
        const q = new URLSearchParams();
        if (params?.search) q.set("search", params.search);
        if (params?.college && params.college !== "all") q.set("college", params.college);
        if (params?.status && params.status !== "all") q.set("status", params.status);
        if (params?.mine) q.set("mine", "true");
        const qs = q.toString();
        return request<any[]>(`/api/v1/editor/overrides${qs ? `?${qs}` : ""}`);
      },
      create: (data: {
        entityType: string;
        entityId: string;
        fieldName: string;
        actualValue: string;
        visibleValue: string;
        mandatoryReason: string;
      }) => request<any>("/api/v1/editor/overrides", { method: "POST", body: JSON.stringify(data) }),
      getOptions: (params?: {
        collegeCode?: string;
        year?: string;
        department?: string;
        semester?: string;
        section?: string;
      }) => {
        const q = new URLSearchParams();
        if (params?.collegeCode) q.set("collegeCode", params.collegeCode);
        if (params?.year && params.year !== "all") q.set("year", params.year);
        if (params?.department && params.department !== "all") q.set("department", params.department);
        if (params?.semester && params.semester !== "all") q.set("semester", params.semester);
        if (params?.section && params.section !== "all") q.set("section", params.section);
        const qs = q.toString();
        return request<{
          colleges: { code: string; name: string }[];
          years: string[];
          departments: string[];
          semesters: string[];
          sections: string[];
          students: { id: string; name: string; usn: string }[];
        }>(`/api/v1/editor/overrides/options${qs ? `?${qs}` : ""}`);
      },
      getScopeProgress: (params: {
        collegeCode: string;
        year?: string;
        department?: string;
        semester?: string;
        section?: string;
        studentId?: string;
      }) => {
        const q = new URLSearchParams();
        q.set("collegeCode", params.collegeCode);
        if (params.year && params.year !== "all") q.set("year", params.year);
        if (params.department && params.department !== "all") q.set("department", params.department);
        if (params.semester && params.semester !== "all") q.set("semester", params.semester);
        if (params.section && params.section !== "all") q.set("section", params.section);
        if (params.studentId && params.studentId !== "all") q.set("studentId", params.studentId);
        return request<any>(`/api/v1/editor/overrides/scope-progress?${q.toString()}`);
      },
      preview: (data: {
        collegeCode: string;
        academicScope: any;
        metricId: string;
        proposedValue: number | string;
      }) => request<any>("/api/v1/editor/overrides/preview", { method: "POST", body: JSON.stringify(data) }),
      createAcademic: (data: {
        collegeCode: string;
        academicScope: any;
        metricId: string;
        proposedValue: number | string;
        mandatoryReason: string;
      }) => request<any>("/api/v1/editor/overrides", { method: "POST", body: JSON.stringify(data) }),
      revert: (overrideId: string) =>
        request<any>(`/api/v1/editor/overrides/${overrideId}/revert`, { method: "POST" }),
      getMetrics: (scope?: string) =>
        request<any[]>(`/api/v1/editor/overrides/metrics${scope ? `?scope=${scope}` : ""}`),
    },
    coordinators: {
      list: (params?: { search?: string; status?: string }) => {
        const q = new URLSearchParams();
        if (params?.search) q.set("search", params.search);
        if (params?.status && params.status !== "all") q.set("status", params.status);
        const qs = q.toString();
        return request<any[]>(`/api/v1/editor/coordinators${qs ? `?${qs}` : ""}`);
      },
      create: (data: { name: string; email: string; collegeCode: string }) =>
        request<any>("/api/v1/editor/coordinators", { method: "POST", body: JSON.stringify(data) }),
      updateStatus: (id: string, status: "active" | "inactive") =>
        request<any>(`/api/v1/editor/coordinators/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    },
  },
  coordinator: {
    me: () => request<any>("/api/v1/coordinator/me"),
    overview: () => request<any>("/api/v1/coordinator/overview"),
    academic: () => request<any>("/api/v1/coordinator/academic"),
    classes: {
      list: () => request<any[]>("/api/v1/coordinator/classes"),
      create: (data: {
        branch: string;
        semester: string;
        section: string;
        academicYear?: string;
        studentsCount?: number;
        trainersCount?: number;
      }) =>
        request<any>("/api/v1/coordinator/classes", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        request<{ success: boolean; message?: string }>(
          `/api/v1/coordinator/classes/${encodeURIComponent(id)}`,
          { method: "DELETE" }
        ),
    },
    students: {
      list: (query?: { search?: string; department?: string; batch?: string }) => {
        const q = new URLSearchParams();
        if (query?.search) q.set("search", query.search);
        if (query?.department && query.department !== "all") q.set("department", query.department);
        if (query?.batch && query.batch !== "all") q.set("batch", query.batch);
        const qs = q.toString();
        return request<any[]>(`/api/v1/coordinator/students${qs ? `?${qs}` : ""}`);
      },
      getDetails: (studentId: string) => request<any>(`/api/v1/coordinator/students/${studentId}`),
      updateUsn: (studentId: string, proposedUsn: string, mandatoryReason: string) =>
        request<any>(`/api/v1/coordinator/students/${studentId}/usn`, {
          method: "PATCH",
          body: JSON.stringify({ proposedUsn, mandatoryReason }),
        }),
    },
    registration: {
      getLinks: () => request<any[]>("/api/v1/coordinator/registration-links"),
      generateLink: (data?: { metadata?: { department?: string; batch?: string }; origin?: string }) =>
        request<{ url: string; token: string; expiresAt: string; id: string; status: string }>(
          "/api/v1/coordinator/registration-links",
          {
            method: "POST",
            body: data ? JSON.stringify(data) : undefined,
          }
        ),
      revokeLink: (id: string) =>
        request<any>(`/api/v1/coordinator/registration-links/${id}/revoke`, { method: "POST" }),
    },
    trainers: {
      list: () => request<any[]>("/api/v1/coordinator/trainers"),
      create: (data: { name: string; email: string; skills: string[] }) =>
        request<any>("/api/v1/coordinator/trainers", { method: "POST", body: JSON.stringify(data) }),
    },
    placementOfficers: {
      list: () => request<any[]>("/api/v1/coordinator/placement-officers"),
      create: (data: { name: string; email: string; phone?: string; departmentScope?: string[] }) =>
        request<any>("/api/v1/coordinator/placement-officers", { method: "POST", body: JSON.stringify(data) }),
      toggleStatus: (id: string, status: "active" | "inactive") =>
        request<any>(`/api/v1/coordinator/placement-officers/${encodeURIComponent(id)}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }),
    },
    batches: {
      list: () => request<any[]>("/api/v1/coordinator/batches"),
      create: (data: { name: string; department: string; year: string; section: string }) =>
        request<any>("/api/v1/coordinator/batches", { method: "POST", body: JSON.stringify(data) }),
    },
    allocations: {
      list: () => request<any[]>("/api/v1/coordinator/allocations"),
      create: (data: {
        department: string;
        year: string;
        semester: string;
        section: string;
        batch: string;
        skill: string;
        courseName: string;
        trainerName: string;
        trainerId: string;
        startDate: string;
        endDate: string;
      }) => request<any>("/api/v1/coordinator/allocations", { method: "POST", body: JSON.stringify(data) }),
    },
    schedules: {
      list: () => request<any[]>("/api/v1/coordinator/schedule"),
      create: (data: {
        allocationId: string;
        courseName: string;
        trainerName: string;
        date: string;
        startTime: string;
        endTime: string;
        mode: "Offline" | "Online" | "Hybrid";
        location: string;
      }) => request<any>("/api/v1/coordinator/schedule", { method: "POST", body: JSON.stringify(data) }),
    },
    sessions: {
      list: () => request<any[]>("/api/v1/coordinator/sessions"),
      start: (sessionId: string) =>
        request<any>(`/api/v1/coordinator/sessions/${sessionId}/start`, { method: "POST" }),
      complete: (sessionId: string, mandatoryReason: string) =>
        request<any>(`/api/v1/coordinator/sessions/${sessionId}/complete`, {
          method: "POST",
          body: JSON.stringify({ mandatoryReason }),
        }),
    },
    actionPlans: {
      list: () => request<any[]>("/api/v1/coordinator/action-plans"),
      create: (data: {
        studentName: string;
        studentId: string;
        description: string;
        trainerName: string;
        trainerId: string;
        deadline: string;
      }) => request<any>("/api/v1/coordinator/action-plans", { method: "POST", body: JSON.stringify(data) }),
      updateStatus: (planId: string, status: "Not Started" | "In Progress" | "Blocked" | "Completed") =>
        request<any>(`/api/v1/coordinator/action-plans/${planId}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }),
    },
    performance: {
      get: () => request<any>("/api/v1/coordinator/performance"),
    },
    skills: {
      get: () => request<any>("/api/v1/coordinator/skills"),
    },
    placementReadiness: {
      get: () => request<any>("/api/v1/coordinator/placement-readiness"),
    },
    placementRequirements: {
      list: () => request<any[]>("/api/v1/coordinator/placement-requirements"),
      create: (data: {
        companyName: string;
        roleTitle: string;
        minCgpa: number;
        eligibleBranches: string[];
        requiredSkills: string[];
        deadline: string;
      }) =>
        request<any>("/api/v1/coordinator/placement-requirements", {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
    reports: {
      list: () => request<any>("/api/v1/coordinator/reports"),
      export: (data: { reportType: string; format?: "csv" | "json"; filter?: any }) =>
        request<any>("/api/v1/coordinator/reports/export", {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
    dataImport: {
      validate: (filename: string, rows: any[]) =>
        request<any>("/api/v1/coordinator/data/import/validate", {
          method: "POST",
          body: JSON.stringify({ filename, rows }),
        }),
      confirm: (importId: string) =>
        request<any>("/api/v1/coordinator/data/import/confirm", {
          method: "POST",
          body: JSON.stringify({ importId }),
        }),
    },
    settings: {
      get: () => request<any>("/api/v1/coordinator/settings"),
      update: (settings: any) =>
        request<any>("/api/v1/coordinator/settings", {
          method: "PATCH",
          body: JSON.stringify(settings),
        }),
    },
    training: {
      list: () => request<any[]>("/api/v1/coordinator/training"),
    },
    notifications: {
      list: () => request<any[]>("/api/v1/coordinator/notifications"),
      create: (data: { title: string; message: string; targetRole?: string; durationDays?: number }) =>
        request<any>("/api/v1/coordinator/notifications", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      delete: (id: string) => request<{ success: boolean; id: string }>(`/api/v1/coordinator/notifications/${id}`, { method: "DELETE" }),
    },
  },
  notifications: {
    list: (params?: { collegeScope?: string; role?: string }) => {
      const q = new URLSearchParams();
      if (params?.collegeScope) q.set("collegeScope", params.collegeScope);
      if (params?.role) q.set("role", params.role);
      const qs = q.toString();
      return request<any[]>(`/api/v1/notifications${qs ? `?${qs}` : ""}`);
    },
    delete: (id: string) => request<{ success: boolean; id: string }>(`/api/v1/notifications/${id}`, { method: "DELETE" }),
  },
  student: {
    me: () => request<any>("/api/v1/student/me"),
    profile: () => request<any>("/api/v1/student/profile"),
    updateProfile: (data: { bio?: string; githubUsername?: string; avatarUrl?: string; phone?: string; editorPreferences?: any }) =>
      request<any>("/api/v1/student/profile", { method: "PATCH", body: JSON.stringify(data) }),
    dashboard: () => request<any>("/api/v1/student/dashboard"),
    contributions: () => request<{ totalContributions: number; contributions: { date: string; count: number }[]; range: { startDate: string; endDate: string } }>("/api/v1/student/contributions"),
    activity: () => request<any[]>("/api/v1/student/activity"),
    courses: () => request<any[]>("/api/v1/student/courses"),
    getCourse: (id: string) => request<any>(`/api/v1/student/courses/${id}`),
    recordProgress: (data: { courseId: string; lessonId: string; activityId?: string; evidenceType: string; score?: number }) =>
      request<any>("/api/v1/student/progress", { method: "POST", body: JSON.stringify(data) }),
    
    judge: {
      problems: (query?: { difficulty?: string; topic?: string; status?: string; search?: string }) => {
        const q = new URLSearchParams();
        if (query?.difficulty && query.difficulty !== "all") q.set("difficulty", query.difficulty);
        if (query?.topic && query.topic !== "all") q.set("topic", query.topic);
        if (query?.status && query.status !== "all") q.set("status", query.status);
        if (query?.search) q.set("search", query.search);
        const qs = q.toString();
        return request<any[]>(`/api/v1/student/judge/problems${qs ? `?${qs}` : ""}`);
      },
      getProblem: (id: string) => request<any>(`/api/v1/student/judge/problems/${id}`),
      getDraft: (problemId: string) => request<any>(`/api/v1/student/judge/problems/${problemId}/draft`),
      saveDraft: (problemId: string, language: string, code: string) =>
        request<any>(`/api/v1/student/judge/problems/${problemId}/draft`, {
          method: "POST",
          body: JSON.stringify({ language, code }),
        }),
      runSample: (problemId: string, language: string, sourceCode: string) =>
        request<any>(`/api/v1/student/judge/problems/${problemId}/run`, {
          method: "POST",
          body: JSON.stringify({ language, sourceCode }),
        }),
      submit: (problemId: string, language: string, sourceCode: string) =>
        request<any>(`/api/v1/student/judge/problems/${problemId}/submit`, {
          method: "POST",
          body: JSON.stringify({ language, sourceCode }),
        }),
      submissions: (problemId?: string) => {
        const qs = problemId ? `?problemId=${problemId}` : "";
        return request<any[]>(`/api/v1/student/judge/submissions${qs}`);
      },
      getSubmission: (id: string) => request<any>(`/api/v1/student/judge/submissions/${id}`),
    },

    assessments: {
      list: () => request<any[]>("/api/v1/student/assessments"),
      get: (id: string) => request<any>(`/api/v1/student/assessments/${id}`),
      start: (id: string) => request<any>(`/api/v1/student/assessments/${id}/start`, { method: "POST" }),
      saveAnswer: (assessmentId: string, attemptId: string, questionId: string, selectedOption?: string, answerText?: string) =>
        request<any>(`/api/v1/student/assessments/${assessmentId}/save-answer`, {
          method: "POST",
          body: JSON.stringify({ attemptId, questionId, selectedOption, answerText }),
        }),
      submit: (assessmentId: string, attemptId: string) =>
        request<any>(`/api/v1/student/assessments/${assessmentId}/submit`, {
          method: "POST",
          body: JSON.stringify({ attemptId }),
        }),
    },

    learning: {
      courses: () => request<any[]>("/api/v1/student/learning"),
      getCourse: (courseId: string) => request<any>(`/api/v1/student/learning/${courseId}`),
      getLesson: (courseId: string, lessonId: string) =>
        request<any>(`/api/v1/student/learning/${courseId}/lessons/${lessonId}`),
      complete: (courseId: string, lessonId: string, activityId?: string, evidenceType: string = "reading") =>
        request<any>("/api/v1/student/learning/complete", {
          method: "POST",
          body: JSON.stringify({ courseId, lessonId, activityId, evidenceType }),
        }),
    },

    performance: () => request<any>("/api/v1/student/performance"),
    skills: () => request<any[]>("/api/v1/student/skills"),
    placementReadiness: () => request<any>("/api/v1/student/placement-readiness"),

    actionPlans: {
      list: () => request<any[]>("/api/v1/student/action-plans"),
      completeMilestone: (planId: string, milestoneId: string, evidence?: string) =>
        request<any>(`/api/v1/student/action-plans/${planId}/milestones/${milestoneId}/complete`, {
          method: "POST",
          body: JSON.stringify({ evidence }),
        }),
    },

    github: {
      status: () => request<any>("/api/v1/student/github/status"),
      connect: (githubUsername: string) =>
        request<any>("/api/v1/student/github/connect", {
          method: "POST",
          body: JSON.stringify({ githubUsername }),
        }),
      disconnect: () => request<any>("/api/v1/student/github/disconnect", { method: "POST" }),
      retrySync: () => request<any>("/api/v1/student/github/retry-sync", { method: "POST" }),
    },

    notifications: {
      list: () => request<any[]>("/api/v1/student/notifications"),
    },

    placement: {
      opportunities: () => request<any[]>("/api/v1/student/placement/opportunities"),
      applications: () => request<any[]>("/api/v1/student/placement/applications"),
      apply: (payload: { opportunityId: string; resumeVersion?: string }) =>
        request<any>("/api/v1/student/placement/apply", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      offers: () => request<any[]>("/api/v1/student/placement/offers"),
    },
  },

  registration: {
    verifyCollege: (code: string) => {
      const q = new URLSearchParams({ code });
      return request<{
        valid: boolean;
        college?: { code: string; name: string; id: string; status: string; campuses?: number };
        error?: string;
      }>(`/api/v1/registration/verify-college?${q.toString()}`);
    },
    verify: (token: string, college?: string) => {
      const q = new URLSearchParams({ token });
      if (college) q.set("college", college);
      return request<{
        valid: boolean;
        token?: any;
        college?: { code: string; name: string; id: string };
        error?: string;
      }>(`/api/v1/registration/verify?${q.toString()}`);
    },
    complete: (payload: {
      token?: string;
      collegeCode?: string;
      student: {
        name: string;
        email: string;
        phone?: string;
        department: string;
        degreeProgram?: string;
        section: string;
        year?: string;
        usn: string;
      };
    }) =>
      request<{
        success: boolean;
        student: any;
        token?: any;
        generatedPassword: string;
        loginId: string;
      }>("/api/v1/registration/complete", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  students: {
    search: (params?: { q?: string; collegeCode?: string; department?: string; batch?: string }) => {
      const q = new URLSearchParams();
      if (params?.q) q.set("q", params.q);
      if (params?.collegeCode) q.set("collegeCode", params.collegeCode);
      if (params?.department) q.set("department", params.department);
      if (params?.batch) q.set("batch", params.batch);
      const queryStr = q.toString();
      return request<any[]>(`/api/v1/students/search${queryStr ? `?${queryStr}` : ""}`);
    },
    getById: (id: string) => request<any>(`/api/v1/students/${encodeURIComponent(id)}`),
  },

  trainer: {
    me: () => request<any>("/api/v1/trainer/me"),
    scope: () => request<any>("/api/v1/trainer/scope"),
    dashboard: (allocationId?: string) => {
      const q = allocationId ? `?allocationId=${encodeURIComponent(allocationId)}` : "";
      return request<any>(`/api/v1/trainer/dashboard${q}`);
    },
    classes: () => request<any>("/api/v1/trainer/classes"),
    students: (params?: {
      allocationId?: string;
      search?: string;
      department?: string;
      year?: string;
      semester?: string;
      section?: string;
      skill?: string;
      category?: string;
      page?: number;
      limit?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.allocationId) q.set("allocationId", params.allocationId);
      if (params?.search) q.set("search", params.search);
      if (params?.department) q.set("department", params.department);
      if (params?.year) q.set("year", params.year);
      if (params?.semester) q.set("semester", params.semester);
      if (params?.section) q.set("section", params.section);
      if (params?.skill) q.set("skill", params.skill);
      if (params?.category) q.set("category", params.category);
      if (params?.page) q.set("page", params.page.toString());
      if (params?.limit) q.set("limit", params.limit.toString());
      const qs = q.toString();
      return request<any>(`/api/v1/trainer/students${qs ? `?${qs}` : ""}`);
    },
    studentDetail: (studentId: string) =>
      request<any>(`/api/v1/trainer/students/${encodeURIComponent(studentId)}`),
    skillGaps: (allocationId?: string) => {
      const q = allocationId ? `?allocationId=${encodeURIComponent(allocationId)}` : "";
      return request<any>(`/api/v1/trainer/skill-gaps${q}`);
    },
    learningProgress: (allocationId?: string) => {
      const q = allocationId ? `?allocationId=${encodeURIComponent(allocationId)}` : "";
      return request<any>(`/api/v1/trainer/learning-progress${q}`);
    },
    codingProgress: (allocationId?: string) => {
      const q = allocationId ? `?allocationId=${encodeURIComponent(allocationId)}` : "";
      return request<any>(`/api/v1/trainer/coding-progress${q}`);
    },
    assessments: (allocationId?: string) => {
      const q = allocationId ? `?allocationId=${encodeURIComponent(allocationId)}` : "";
      return request<any>(`/api/v1/trainer/assessments${q}`);
    },
    aptitude: (allocationId?: string) => {
      const q = allocationId ? `?allocationId=${encodeURIComponent(allocationId)}` : "";
      return request<any>(`/api/v1/trainer/aptitude${q}`);
    },
    verbal: (allocationId?: string) => {
      const q = allocationId ? `?allocationId=${encodeURIComponent(allocationId)}` : "";
      return request<any>(`/api/v1/trainer/verbal${q}`);
    },
    softSkills: (allocationId?: string) => {
      const q = allocationId ? `?allocationId=${encodeURIComponent(allocationId)}` : "";
      return request<any>(`/api/v1/trainer/soft-skills${q}`);
    },
    placement: (allocationId?: string) => {
      const q = allocationId ? `?allocationId=${encodeURIComponent(allocationId)}` : "";
      return request<any>(`/api/v1/trainer/placement${q}`);
    },
    interventions: (allocationId?: string) => {
      const q = allocationId ? `?allocationId=${encodeURIComponent(allocationId)}` : "";
      return request<any>(`/api/v1/trainer/interventions${q}`);
    },
    reports: (allocationId?: string) => {
      const q = allocationId ? `?allocationId=${encodeURIComponent(allocationId)}` : "";
      return request<any>(`/api/v1/trainer/reports${q}`);
    },
    notifications: () => request<any>("/api/v1/trainer/notifications"),
  },

  placement: {
    me: async () => wrapResponse(await request<any>("/api/v1/placement/me")),
    dashboard: async () => wrapResponse(await request<any>("/api/v1/placement/dashboard")),
    getDashboard: async () => wrapResponse(await request<any>("/api/v1/placement/dashboard")),

    students: async (params?: {
      search?: string;
      department?: string;
      year?: string;
      section?: string;
      eligibility?: string;
      readinessBand?: string;
      offerStatus?: string;
      page?: number;
      limit?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set("search", params.search);
      if (params?.department && params.department !== "all") q.set("department", params.department);
      if (params?.year && params.year !== "all") q.set("year", params.year);
      if (params?.section && params.section !== "all") q.set("section", params.section);
      if (params?.eligibility) q.set("eligibility", params.eligibility);
      if (params?.readinessBand) q.set("readinessBand", params.readinessBand);
      if (params?.offerStatus) q.set("offerStatus", params.offerStatus);
      if (params?.page) q.set("page", params.page.toString());
      if (params?.limit) q.set("limit", params.limit.toString());
      const qs = q.toString();
      return wrapResponse(await request<any>(`/api/v1/placement/students${qs ? `?${qs}` : ""}`));
    },
    getStudents: async (params?: any) => {
      const q = new URLSearchParams();
      if (params?.search) q.set("search", params.search);
      if (params?.department && params.department !== "all") q.set("department", params.department);
      if (params?.year && params.year !== "all") q.set("year", params.year);
      if (params?.section && params.section !== "all") q.set("section", params.section);
      if (params?.eligibility) q.set("eligibility", params.eligibility);
      if (params?.readinessBand) q.set("readinessBand", params.readinessBand);
      if (params?.offerStatus) q.set("offerStatus", params.offerStatus);
      if (params?.page) q.set("page", params.page.toString());
      if (params?.limit) q.set("limit", params.limit.toString());
      const qs = q.toString();
      return wrapResponse(await request<any>(`/api/v1/placement/students${qs ? `?${qs}` : ""}`));
    },

    studentDetail: async (studentId: string) =>
      wrapResponse(await request<any>(`/api/v1/placement/students/${encodeURIComponent(studentId)}`)),
    getStudentDetail: async (studentId: string) =>
      wrapResponse(await request<any>(`/api/v1/placement/students/${encodeURIComponent(studentId)}`)),

    companies: async () => wrapResponse(await request<any[]>("/api/v1/placement/companies")),
    getCompanies: async () => wrapResponse(await request<any[]>("/api/v1/placement/companies")),
    createCompany: (data: any) =>
      request<any>("/api/v1/placement/companies", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateCompany: (id: string, data: any) =>
      request<any>(`/api/v1/placement/companies/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deleteCompany: (id: string) =>
      request<any>(`/api/v1/placement/companies/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),

    opportunities: async (paramsOrStatus?: string | { status?: string }) => {
      const status = typeof paramsOrStatus === "object" ? paramsOrStatus?.status : paramsOrStatus;
      const qs = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
      return wrapResponse(await request<any[]>(`/api/v1/placement/opportunities${qs}`));
    },
    getOpportunities: async (paramsOrStatus?: string | { status?: string }) => {
      const status = typeof paramsOrStatus === "object" ? paramsOrStatus?.status : paramsOrStatus;
      const qs = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
      return wrapResponse(await request<any[]>(`/api/v1/placement/opportunities${qs}`));
    },
    createOpportunity: (data: any) =>
      request<any>("/api/v1/placement/opportunities", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateOpportunity: (id: string, data: any) =>
      request<any>(`/api/v1/placement/opportunities/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    updateOpportunityStatus: (id: string, status: string) =>
      request<any>(`/api/v1/placement/opportunities/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    deleteOpportunity: (id: string) =>
      request<any>(`/api/v1/placement/opportunities/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),

    drives: async () => wrapResponse(await request<any[]>("/api/v1/placement/drives")),
    getDrives: async () => wrapResponse(await request<any[]>("/api/v1/placement/drives")),
    createDrive: (data: any) =>
      request<any>("/api/v1/placement/drives", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateDrive: (id: string, data: any) =>
      request<any>(`/api/v1/placement/drives/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deleteDrive: (id: string) =>
      request<any>(`/api/v1/placement/drives/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),

    evaluateEligibility: async (opportunityIdOrParams: string | { opportunityId: string; studentId: string }, maybeStudentId?: string) => {
      const oppId = typeof opportunityIdOrParams === "object" ? opportunityIdOrParams.opportunityId : opportunityIdOrParams;
      const stuId = typeof opportunityIdOrParams === "object" ? opportunityIdOrParams.studentId : maybeStudentId || "";
      const q = new URLSearchParams({ opportunityId: oppId, studentId: stuId });
      return wrapResponse(await request<any>(`/api/v1/placement/eligibility?${q.toString()}`));
    },

    applications: async (params?: { opportunityId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.opportunityId && params.opportunityId !== "all") q.set("opportunityId", params.opportunityId);
      if (params?.status && params.status !== "all") q.set("status", params.status);
      const qs = q.toString();
      return wrapResponse(await request<any[]>(`/api/v1/placement/applications${qs ? `?${qs}` : ""}`));
    },
    getApplications: async (params?: { opportunityId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.opportunityId && params.opportunityId !== "all") q.set("opportunityId", params.opportunityId);
      if (params?.status && params.status !== "all") q.set("status", params.status);
      const qs = q.toString();
      return wrapResponse(await request<any[]>(`/api/v1/placement/applications${qs ? `?${qs}` : ""}`));
    },
    updateApplicationStage: (applicationId: string, data: any) =>
      request<any>(`/api/v1/placement/applications/${encodeURIComponent(applicationId)}/stage`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    offers: async () => wrapResponse(await request<any[]>("/api/v1/placement/offers")),
    getOffers: async () => wrapResponse(await request<any[]>("/api/v1/placement/offers")),
    createOffer: (data: any) =>
      request<any>("/api/v1/placement/offers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    verifyOffer: (offerId: string, data: { status: "verified" | "rejected"; notes?: string }) =>
      request<any>(`/api/v1/placement/offers/${encodeURIComponent(offerId)}/verify`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    updateJoiningOutcome: (offerId: string, data: { joiningStatus: "joined" | "did_not_join" | "deferred"; actualJoiningDate?: string }) =>
      request<any>(`/api/v1/placement/offers/${encodeURIComponent(offerId)}/joining`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    attachOfferDocument: (offerId: string, data: { offerLetterUrl: string; filename?: string }) =>
      request<any>(`/api/v1/placement/offers/${encodeURIComponent(offerId)}/document`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    exportRecruiterPacket: async (driveId?: string) => {
      const qs = driveId && driveId !== "all" ? `?driveId=${encodeURIComponent(driveId)}` : "";
      return wrapResponse(await request<{ filename: string; csvContent: string; rowCount: number }>(`/api/v1/placement/recruiter-packet${qs}`));
    },

    intelligence: async () => wrapResponse(await request<any>("/api/v1/placement/intelligence")),
    getIntelligence: async () => wrapResponse(await request<any>("/api/v1/placement/intelligence")),

    preparation: async () => wrapResponse(await request<any>("/api/v1/placement/preparation")),
    getPreparationTargets: async () => wrapResponse(await request<any>("/api/v1/placement/preparation")),
    createActionPlan: (data: { studentId: string; description: string; trainerName?: string; trainerId?: string; deadline?: string }) =>
      request<any>("/api/v1/placement/action-plans", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    requestRemedialTraining: (data: { domain: string; priority: "High" | "Medium"; targetDate: string; notes?: string; affectedStudentsCount?: number }) =>
      request<any>("/api/v1/placement/remediation/request", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateActionPlanStatus: (planId: string, status: string) =>
      request<any>(`/api/v1/placement/action-plans/${encodeURIComponent(planId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),

    notifications: async () => wrapResponse(await request<any[]>("/api/v1/placement/notifications")),
    getNotifications: async () => wrapResponse(await request<any[]>("/api/v1/placement/notifications")),
    sendNotification: (data: { title: string; message: string; driveId?: string; driveName?: string }) =>
      request<any>("/api/v1/placement/notifications", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    reports: async (type?: string) => {
      const qs = type ? `?type=${encodeURIComponent(type)}` : "";
      return wrapResponse(await request<any>(`/api/v1/placement/reports${qs}`));
    },
    getReports: async (type?: string) => {
      const qs = type ? `?type=${encodeURIComponent(type)}` : "";
      return wrapResponse(await request<any>(`/api/v1/placement/reports${qs}`));
    },

    exportReport: (data: {
      type: "individual_class" | "combined_batch";
      department?: string;
      year?: string;
      section?: string;
      batch?: string;
      format: "csv" | "xlsx" | "pdf";
      selectedFields?: string[];
    }) =>
      request<{
        job: any;
        rowCount: number;
        rows: any[];
        csvContent: string;
        filename: string;
      }>("/api/v1/placement/reports/export", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getExportJobs: async () => wrapResponse(await request<any[]>("/api/v1/placement/reports/jobs")),

    activity: async () => wrapResponse(await request<any[]>("/api/v1/placement/activity")),
    getActivity: async () => wrapResponse(await request<any[]>("/api/v1/placement/activity")),

    importData: (data: { records: any[]; entityType: string }) =>
      request<any>("/api/v1/placement/data/import", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};

