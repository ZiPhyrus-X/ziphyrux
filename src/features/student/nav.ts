import {
  LayoutDashboard,
  Code2,
  FileCheck2,
  BookOpen,
  TrendingUp,
  Sparkles,
  Target,
  Briefcase,
  Bell,
  Settings,
  User,
  GitBranch,
  type LucideIcon,
} from "lucide-react";

export type StudentModuleSlug =
  | "performance"
  | "skills"
  | "action-plans"
  | "placement-readiness"
  | "notifications"
  | "settings"
  | "github";

export interface StudentNavItem {
  label: string;
  icon: LucideIcon;
  to: string;
  slug?: StudentModuleSlug;
  badge?: string | number;
}

export const STUDENT_NAV: StudentNavItem[] = [
  { label: "Overview", icon: LayoutDashboard, to: "/student" },
  { label: "Code", icon: Code2, to: "/student/judge" },
  { label: "Assessments", icon: FileCheck2, to: "/student/assessments" },
  { label: "Learning", icon: BookOpen, to: "/student/learning" },
  { label: "Performance", icon: TrendingUp, to: "/student/m/$module", slug: "performance" },
  { label: "Skills", icon: Sparkles, to: "/student/m/$module", slug: "skills" },
  { label: "Action Plans", icon: Target, to: "/student/m/$module", slug: "action-plans" },
  { label: "Placement Readiness", icon: Briefcase, to: "/student/m/$module", slug: "placement-readiness" },
  { label: "Notifications", icon: Bell, to: "/student/m/$module", slug: "notifications" },
  { label: "Settings", icon: Settings, to: "/student/m/$module", slug: "settings" },
];
