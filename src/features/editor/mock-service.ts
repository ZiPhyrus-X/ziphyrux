/**
 * DEVELOPMENT-ONLY Editor service. Illustrative records held in memory so the
 * Editor screens can be previewed. Replace each function with a real API call;
 * never fall back to this when a real request fails.
 * Rule kept here: changes append history — earlier versions/records are never overwritten.
 */
import { mockDelay, nowIso } from "@/lib/api/client";
import type { HistoryEntry } from "@/components/workspace/states";

const BY = "Preview Editor";
let seq = 100;
const nextId = (p: string) => `${p}-${++seq}`;

export interface Feature { id: string; name: string; description: string; enabled: boolean; scope: string; updatedAt: string; updatedBy: string; history: HistoryEntry[] }
export type ContentStatus = "draft" | "review" | "published" | "archived";
export interface Lesson { title: string; activities: string[] }
export interface Module { title: string; topics: { title: string; lessons: Lesson[] }[] }
export interface CourseVersion { version: number; status: ContentStatus; modules: Module[]; createdAt: string }
export interface Course { id: string; title: string; skills: string[]; updatedAt: string; versions: CourseVersion[]; history: HistoryEntry[] }
export type Domain = "Technical" | "Aptitude" | "Verbal" | "Soft Skills";
export type QType = "MCQ" | "Short Answer" | "Long Answer";
export interface Question { id: string; domain: Domain; type: QType; text: string; options?: string[]; correct?: number; answer?: string; explanation?: string; status: ContentStatus; version: number; source: "Manual" | "Duplicate" | "AI-assisted"; updatedAt: string }
export interface AssessmentVersion { version: number; status: ContentStatus; questionIds: string[]; createdAt: string }
export interface Assessment { id: string; title: string; durationMin: number; versions: AssessmentVersion[]; history: HistoryEntry[] }
export interface Notification { id: string; title: string; message: string; target: string; status: "draft" | "pending" | "sent"; updatedAt: string; history: HistoryEntry[] }
export interface Override { id: string; entity: string; field: string; actual: string; visible: string; reason: string; active: boolean; updatedBy: string; updatedAt: string; history: HistoryEntry[] }

const T0 = "2026-09-28T10:00:00.000Z";
const h = (action: string, reason?: string, at = T0): HistoryEntry => ({ at, by: BY, action, reason });

const db = {
  features: [
    { id: "f-courses", name: "Training & Courses", description: "Course delivery to students and trainers.", enabled: false, scope: "Platform", updatedAt: T0, updatedBy: "System", history: [h("Disabled by default (current architecture)")] },
    { id: "f-assess", name: "Assessments", description: "Sample feature — illustrative.", enabled: true, scope: "Platform", updatedAt: T0, updatedBy: BY, history: [h("Enabled")] },
    { id: "f-notify", name: "Notifications", description: "Sample feature — illustrative.", enabled: true, scope: "Platform", updatedAt: T0, updatedBy: BY, history: [h("Enabled")] },
  ] as Feature[],
  courses: [
    { id: "c-1", title: "Sample: Foundations of Programming", skills: ["Problem solving"], updatedAt: T0, history: [h("Version 1 published")],
      versions: [{ version: 1, status: "published", createdAt: T0, modules: [{ title: "Getting started", topics: [{ title: "Variables", lessons: [{ title: "What is a variable", activities: ["Reading", "Practice quiz"] }] }] }] }] },
    { id: "c-2", title: "Sample: Workplace Communication", skills: ["Communication"], updatedAt: T0, history: [h("Draft created")],
      versions: [{ version: 1, status: "draft", createdAt: T0, modules: [{ title: "Email basics", topics: [{ title: "Tone", lessons: [{ title: "Formal vs informal", activities: ["Reading"] }] }] }] }] },
  ] as Course[],
  questions: [
    { id: "q-1", domain: "Aptitude", type: "MCQ", text: "Sample: 15% of 200 is?", options: ["20", "25", "30", "35"], correct: 2, status: "published", version: 1, source: "Manual", updatedAt: T0 },
    { id: "q-2", domain: "Technical", type: "Short Answer", text: "Sample: What does HTTP stand for?", answer: "HyperText Transfer Protocol", status: "draft", version: 1, source: "Manual", updatedAt: T0 },
    { id: "q-3", domain: "Soft Skills", type: "Long Answer", text: "Sample: Describe how you handle conflicting deadlines.", explanation: "Look for prioritisation and communication.", status: "draft", version: 1, source: "AI-assisted", updatedAt: T0 },
  ] as Question[],
  assessments: [
    { id: "a-1", title: "Sample: Aptitude Check", durationMin: 30, history: [h("Version 1 published")], versions: [{ version: 1, status: "published", questionIds: ["q-1"], createdAt: T0 }] },
  ] as Assessment[],
  notifications: [
    { id: "n-1", title: "Sample: Assessment window opens", message: "Illustrative message text.", target: "All students", status: "draft", updatedAt: T0, history: [h("Draft created")] },
  ] as Notification[],
  overrides: [
    { id: "o-1", entity: "Sample college · Placement summary", field: "Displayed label", actual: "Batch 2026 (system)", visible: "Class of 2026", reason: "Naming preferred by the institution", active: true, updatedBy: BY, updatedAt: T0, history: [h("Override created", "Naming preferred by the institution")] },
  ] as Override[],
  audit: [] as (HistoryEntry & { area: string })[],
};

function log(area: string, action: string, reason?: string) {
  const e = { at: nowIso(), by: BY, action, reason };
  db.audit.unshift({ ...e, area });
  return e;
}
const find = <T extends { id: string }>(list: T[], id: string) => {
  const x = list.find((i) => i.id === id);
  if (!x) throw new Error("Record not found.");
  return x;
};
export const latest = <V extends { version: number }>(v: V[]): V => v[v.length - 1]!;

/** MCQ rule: exactly four non-empty options and one correct answer. */
export function validateQuestion(q: Pick<Question, "type" | "text" | "options" | "correct" | "answer" | "explanation" | "domain">): string[] {
  const e: string[] = [];
  if (!q.text?.trim()) e.push("Question text is required.");
  if (q.type === "MCQ") {
    if (!q.options || q.options.length !== 4 || q.options.some((o) => !o.trim())) e.push("MCQ needs exactly four filled options.");
    if (q.correct === undefined || q.correct < 0 || q.correct > 3) e.push("Pick one correct answer.");
  } else {
    const explanationOnly = q.domain === "Verbal" || q.domain === "Soft Skills";
    if (explanationOnly ? !q.explanation?.trim() : !q.answer?.trim()) e.push(explanationOnly ? "An explanation is required." : "A model answer is required.");
  }
  return e;
}

export const editorService = {
  features: () => mockDelay(db.features),
  setFeature: async (id: string, enabled: boolean, reason: string) => {
    const f = find(db.features, id);
    f.enabled = enabled; f.updatedAt = nowIso(); f.updatedBy = BY;
    f.history.unshift(log("Feature availability", `${f.name} ${enabled ? "enabled" : "disabled"}`, reason));
    return mockDelay(f);
  },
  courses: () => mockDelay(db.courses),
  /** Published versions are frozen; edits start a new draft version. */
  newCourseVersion: async (id: string, reason: string) => {
    const c = find(db.courses, id); const v = latest(c.versions);
    c.versions.push({ version: v.version + 1, status: "draft", modules: structuredClone(v.modules), createdAt: nowIso() });
    c.updatedAt = nowIso(); c.history.unshift(log("Learning content", `${c.title}: draft v${v.version + 1} created`, reason));
    return mockDelay(c);
  },
  setCourseStatus: async (id: string, status: ContentStatus, reason: string) => {
    const c = find(db.courses, id); const v = latest(c.versions);
    if (status === "published") c.versions.forEach((x) => { if (x !== v && x.status === "published") x.status = "archived"; });
    v.status = status; c.updatedAt = nowIso(); c.history.unshift(log("Learning content", `${c.title}: v${v.version} → ${status}`, reason));
    return mockDelay(c);
  },
  addModule: async (id: string, title: string) => {
    const c = find(db.courses, id); const v = latest(c.versions);
    if (v.status !== "draft") throw new Error("Only a draft version can be edited. Create a new draft version first.");
    v.modules.push({ title, topics: [] }); c.history.unshift(log("Learning content", `${c.title}: module "${title}" added`));
    return mockDelay(c);
  },
  createCourse: async (title: string) => {
    const c: Course = { id: nextId("c"), title, skills: [], updatedAt: nowIso(), versions: [{ version: 1, status: "draft", modules: [], createdAt: nowIso() }], history: [] };
    c.history.unshift(log("Learning content", `${title}: draft created`)); db.courses.unshift(c);
    return mockDelay(c);
  },
  questions: () => mockDelay(db.questions),
  saveQuestion: async (q: Omit<Question, "id" | "status" | "version" | "updatedAt">) => {
    const errs = validateQuestion(q); if (errs.length) throw new Error(errs.join(" "));
    if (db.questions.some((x) => x.text.trim().toLowerCase() === q.text.trim().toLowerCase())) throw new Error("A question with the same text already exists.");
    const n: Question = { ...q, id: nextId("q"), status: "draft", version: 1, updatedAt: nowIso() };
    db.questions.unshift(n); log("Questions", `Question created (${q.domain}, ${q.type})`);
    return mockDelay(n);
  },
  setQuestionStatus: async (id: string, status: ContentStatus, reason: string) => {
    const q = find(db.questions, id); q.status = status; q.updatedAt = nowIso(); log("Questions", `Question ${id} → ${status}`, reason);
    return mockDelay(q);
  },
  assessments: () => mockDelay(db.assessments),
  createAssessment: async (title: string, durationMin: number, questionIds: string[]) => {
    if (!questionIds.length) throw new Error("Select at least one question.");
    const a: Assessment = { id: nextId("a"), title, durationMin, history: [], versions: [{ version: 1, status: "draft", questionIds, createdAt: nowIso() }] };
    a.history.unshift(log("Assessments", `${title}: draft created`)); db.assessments.unshift(a);
    return mockDelay(a);
  },
  newAssessmentVersion: async (id: string, questionIds: string[], reason: string) => {
    const a = find(db.assessments, id); const v = latest(a.versions);
    if (!questionIds.length) throw new Error("Select at least one question.");
    a.versions.push({ version: v.version + 1, status: "draft", questionIds, createdAt: nowIso() });
    a.history.unshift(log("Assessments", `${a.title}: draft v${v.version + 1} created`, reason));
    return mockDelay(a);
  },
  publishAssessment: async (id: string, reason: string) => {
    const a = find(db.assessments, id); const v = latest(a.versions);
    a.versions.forEach((x) => { if (x !== v && x.status === "published") x.status = "archived"; });
    v.status = "published"; a.history.unshift(log("Assessments", `${a.title}: v${v.version} published`, reason));
    return mockDelay(a);
  },
  notifications: () => mockDelay(db.notifications),
  saveNotification: async (n: { id?: string; title: string; message: string; target: string }) => {
    if (!n.title.trim() || !n.message.trim()) throw new Error("Title and message are required.");
    if (n.id) {
      const x = find(db.notifications, n.id);
      if (x.status !== "draft") throw new Error("Only drafts can be edited.");
      Object.assign(x, { title: n.title, message: n.message, target: n.target, updatedAt: nowIso() });
      x.history.unshift(log("Notifications", `"${n.title}" updated`)); return mockDelay(x);
    }
    const x: Notification = { id: nextId("n"), title: n.title, message: n.message, target: n.target, status: "draft", updatedAt: nowIso(), history: [] };
    x.history.unshift(log("Notifications", `"${n.title}" draft created`)); db.notifications.unshift(x);
    return mockDelay(x);
  },
  overrides: () => mockDelay(db.overrides),
  setOverride: async (id: string, visible: string, active: boolean, reason: string) => {
    const o = find(db.overrides, id);
    o.history.unshift(log("Visible-value overrides", `${o.field}: "${o.visible}" → "${visible}"${active ? "" : " (deactivated)"}`, reason));
    Object.assign(o, { visible, active, reason, updatedBy: BY, updatedAt: nowIso() });
    return mockDelay(o);
  },
  audit: () => mockDelay(db.audit),
};
