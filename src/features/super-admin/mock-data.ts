/**
 * ILLUSTRATIVE development data for the Super Admin workspace.
 * Replace with backend API queries — nothing here reflects real institutions.
 */
import { subDays, subHours, subMinutes } from "date-fns";

const now = new Date();
export type Status = "active" | "inactive" | "pending" | "archived" | "draft" | "published" | "healthy" | "degraded" | "down" | "failed" | "running" | "succeeded" | "queued";

export const COLLEGES = Array.from({ length: 23 }).map((_, i) => ({
  id: `col-${i + 1}`,
  name: ["Sample Institute of Technology", "Demo College of Engineering", "Example University", "Placeholder Polytechnic", "Test Academy of Sciences"][i % 5]! + ` ${Math.floor(i / 5) + 1}`,
  code: `SMP${String(101 + i)}`,
  status: (["active", "active", "hold", "deactive"] as Status[])[i % 4]!,
  campuses: 1 + (i % 3),
  students: 200 + ((i * 137) % 1800),
  trainers: 4 + ((i * 7) % 30),
  createdAt: subDays(now, 30 + i * 9).toISOString(),
}));

const ROLES = ["Student", "Trainer", "Coordinator", "Editor", "Placement Officer", "Employer", "Super Admin"];
export const USERS = Array.from({ length: 64 }).map((_, i) => ({
  id: `usr-${i + 1}`,
  name: ["Asha", "Rohan", "Meera", "Kabir", "Isha", "Dev", "Nila", "Arjun"][i % 8]! + " " + ["Sample", "Demo", "Example", "Preview"][i % 4]!,
  loginId: `user${String(1000 + i)}`,
  email: `user${1000 + i}@example.test`,
  role: ROLES[i % 11 < 6 ? 0 : (i % 7)],
  college: i % 7 === 6 ? "—" : COLLEGES[i % COLLEGES.length]!.code,
  status: (["active", "active", "active", "inactive", "pending"] as Status[])[i % 5]!,
  lastActive: subHours(now, i * 5).toISOString(),
  createdAt: subDays(now, 10 + i * 3).toISOString(),
}));

export const AUDIT = Array.from({ length: 40 }).map((_, i) => ({
  id: `aud-${i + 1}`,
  actor: i % 3 === 0 ? "system" : `user${1000 + (i % 9)}`,
  action: ["college.update", "user.role.assign", "user.deactivate", "problem.publish", "integration.config", "login.failed", "masterdata.create"][i % 7]!,
  target: ["SMP104", "user1012", "user1033", "PRB-0042", "GitHub", "user1020", "Skill: Graphs"][i % 7]!,
  severity: (["info", "info", "warning", "info", "info", "warning", "info"] as const)[i % 7]!,
  at: subMinutes(now, i * 47).toISOString(),
}));

export const JOBS = Array.from({ length: 30 }).map((_, i) => ({
  id: `job-${i + 1}`,
  type: ["recommendation.recompute", "skill.aggregate", "import.questions", "judge.sync", "report.generate"][i % 5]!,
  status: (["succeeded", "succeeded", "running", "failed", "queued", "succeeded"] as Status[])[i % 6]!,
  duration: `${(i * 13) % 240}s`,
  attempts: 1 + (i % 6 === 3 ? 2 : 0),
  startedAt: subMinutes(now, i * 33).toISOString(),
}));

export const SERVICES = [
  { id: "api", name: "Backend API", status: "healthy" as Status, latency: "84 ms" },
  { id: "db", name: "Database", status: "healthy" as Status, latency: "12 ms" },
  { id: "worker", name: "Background workers", status: "degraded" as Status, latency: "—" },
  { id: "judge", name: "Coding judge", status: "healthy" as Status, latency: "310 ms" },
  { id: "storage", name: "Object storage", status: "healthy" as Status, latency: "45 ms" },
  { id: "auth", name: "Authentication provider", status: "healthy" as Status, latency: "61 ms" },
].map((s) => ({ ...s, checkedAt: subMinutes(now, 2).toISOString() }));

export const INTEGRATIONS = [
  { id: "supabase-auth", name: "Supabase Auth", status: "active" as Status, capabilities: "Identity, sessions", lastSync: subMinutes(now, 3).toISOString(), lastError: "—" },
  { id: "github", name: "GitHub", status: "active" as Status, capabilities: "Repository linking", lastSync: subHours(now, 2).toISOString(), lastError: "—" },
  { id: "judge", name: "Coding Judge", status: "active" as Status, capabilities: "Code execution, verdicts", lastSync: subMinutes(now, 9).toISOString(), lastError: "—" },
  { id: "storage", name: "File/object storage", status: "active" as Status, capabilities: "Uploads, exports", lastSync: subMinutes(now, 15).toISOString(), lastError: "—" },
  { id: "email", name: "Email delivery", status: "inactive" as Status, capabilities: "Notifications", lastSync: subDays(now, 4).toISOString(), lastError: "Not configured" },
];

export const PROBLEMS = Array.from({ length: 28 }).map((_, i) => ({
  id: `PRB-${String(i + 1).padStart(4, "0")}`,
  title: ["Two Sum Variant", "Shortest Path in Grid", "Balanced Brackets", "LRU Cache", "Merge Intervals", "Topological Order", "Longest Palindrome"][i % 7]! + (i > 6 ? ` ${Math.ceil(i / 7)}` : ""),
  difficulty: ["Easy", "Medium", "Hard"][i % 3]!,
  topic: ["Arrays", "Graphs", "Stacks", "Design", "Sorting", "Graphs", "Strings"][i % 7]!,
  version: `v${1 + (i % 3)}`,
  status: (["published", "draft", "published", "archived"] as Status[])[i % 4]!,
}));

export const QUESTIONS = Array.from({ length: 36 }).map((_, i) => ({
  id: `Q-${String(i + 1).padStart(4, "0")}`,
  stem: ["Time complexity of binary search", "Choose the synonym", "Ratio and proportion", "Explain normalization", "Handling team conflict", "Output of the snippet"][i % 6]!,
  domain: ["Technical", "Verbal", "Aptitude", "Technical", "Soft Skills", "Technical"][i % 6]!,
  type: ["MCQ", "MCQ", "MCQ", "Long Answer", "Short Answer", "MCQ"][i % 6]!,
  difficulty: ["Easy", "Medium", "Hard"][i % 3]!,
  status: (["published", "draft", "published"] as Status[])[i % 3]!,
}));

export const PERMISSIONS = [
  { id: "p1", role: "Super Admin", permission: "platform.*", scope: "Platform", description: "Full platform governance" },
  { id: "p2", role: "Coordinator", permission: "college.manage", scope: "Own college", description: "Manage college operations and structure" },
  { id: "p3", role: "Trainer", permission: "batch.view_evidence", scope: "Assigned batches", description: "Inspect student evidence for assigned batches" },
  { id: "p4", role: "Editor", permission: "content.edit", scope: "Platform content", description: "Author problems and questions" },
  { id: "p5", role: "Placement Officer", permission: "placement.review", scope: "Own college", description: "Review authorized readiness and applications" },
  { id: "p6", role: "Employer", permission: "candidates.view_authorized", scope: "Authorized candidates", description: "View candidates who granted access" },
  { id: "p7", role: "Student", permission: "self.view", scope: "Self", description: "View own evidence and recommendations" },
];

export const MASTER = [
  "Campuses", "Departments", "Programs & degrees", "Academic sessions", "Years", "Semesters", "Sections",
  "Student backgrounds", "Skills", "Skill relationships", "Course types", "Training types", "Question types", "Difficulties",
].map((k, i) => ({ id: `md-${i}`, entity: k, records: 4 + ((i * 11) % 60), status: "active" as Status, updatedAt: subDays(now, i).toISOString() }));

export const SIGNUPS = Array.from({ length: 12 }).map((_, i) => ({
  m: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"][i],
  students: 300 + ((i * 173) % 500) + i * 40,
  staff: 20 + ((i * 7) % 30),
}));
