import {
  Activity, Boxes, Building2, Code2, Database, FileQuestion, LayoutDashboard, Plug, ScrollText, Settings, ShieldCheck, Users, Workflow,
  type LucideIcon,
} from "lucide-react";

export type ModuleSlug = "roles" | "master-data" | "coding" | "questions" | "health" | "integrations" | "jobs" | "audit" | "settings";

export const ADMIN_NAV: { label: string; icon: LucideIcon; to: string; slug?: ModuleSlug }[] = [
  { label: "Overview", icon: LayoutDashboard, to: "/admin" },
  { label: "Colleges", icon: Building2, to: "/admin/colleges" },
  { label: "Users & Accounts", icon: Users, to: "/admin/users" },
  { label: "Roles & Permissions", icon: ShieldCheck, to: "/admin/m/$module", slug: "roles" },
  { label: "Master Data", icon: Database, to: "/admin/m/$module", slug: "master-data" },
  { label: "Coding Problems", icon: Code2, to: "/admin/m/$module", slug: "coding" },
  { label: "Question Management", icon: FileQuestion, to: "/admin/m/$module", slug: "questions" },
  { label: "Platform Health", icon: Activity, to: "/admin/m/$module", slug: "health" },
  { label: "Integrations", icon: Plug, to: "/admin/m/$module", slug: "integrations" },
  { label: "Background Jobs", icon: Workflow, to: "/admin/m/$module", slug: "jobs" },
  { label: "Audit Logs", icon: ScrollText, to: "/admin/m/$module", slug: "audit" },
  { label: "Settings", icon: Settings, to: "/admin/m/$module", slug: "settings" },
];
export const ModuleIcon = Boxes;
