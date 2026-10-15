import {
  Activity,
  Boxes,
  Building2,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  LineChart,
  ShieldAlert,
  UserCheck,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export type ModuleSlug = "roles" | "master-data" | "coding" | "questions" | "health" | "integrations" | "jobs" | "audit" | "settings";

export const ADMIN_NAV: { label: string; icon: LucideIcon; to: string; slug?: ModuleSlug }[] = [
  { label: "Overview", icon: LayoutDashboard, to: "/admin" },
  { label: "College Intelligence", icon: LineChart, to: "/admin/intelligence" },
  { label: "Colleges", icon: Building2, to: "/admin/colleges" },
  { label: "Account Governance", icon: UserCog, to: "/admin/accounts" },
  { label: "Platform Oversight", icon: Activity, to: "/admin/oversight" },
  { label: "Audit & Change History", icon: History, to: "/admin/audit" },
  { label: "Visible-Value Oversight", icon: ShieldAlert, to: "/admin/overrides" },
  { label: "Reports & Data", icon: FileSpreadsheet, to: "/admin/reports" },
  { label: "My Account", icon: UserCheck, to: "/admin/account" },
];
export const ModuleIcon = Boxes;

