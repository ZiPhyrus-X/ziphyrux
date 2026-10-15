import {
  AlertTriangle,
  Bell,
  BookOpen,
  BrainCircuit,
  Briefcase,
  Calendar,
  Code2,
  FileCheck2,
  FileSpreadsheet,
  Languages,
  LayoutDashboard,
  Sparkles,
  Target,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type TrainerModuleSlug =
  | "skill-gaps"
  | "learning-progress"
  | "coding-progress"
  | "assessments"
  | "aptitude"
  | "verbal"
  | "soft-skills"
  | "placement"
  | "interventions"
  | "reports"
  | "notifications"
  | "account";

export interface TrainerNavItem {
  label: string;
  icon: LucideIcon;
  to: string;
  slug?: TrainerModuleSlug;
  description: string;
}

export const TRAINER_NAV: TrainerNavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/trainer",
    description: "Today's classes, immediate alerts, and daily schedule",
  },
  {
    label: "Classes & Schedule",
    icon: Calendar,
    to: "/trainer/classes",
    description: "Assigned class allocations, timetables, and schedules",
  },
  {
    label: "Students",
    icon: Users,
    to: "/trainer/students",
    description: "Class-scoped student roster and performance drilldown",
  },
  {
    label: "Skill Gaps",
    icon: Target,
    to: "/trainer/m/$module",
    slug: "skill-gaps",
    description: "Insight -> Evidence -> Action skill distribution analytics",
  },
  {
    label: "Learning Progress",
    icon: BookOpen,
    to: "/trainer/m/$module",
    slug: "learning-progress",
    description: "Topic completion, video hours, and course mastery",
  },
  {
    label: "Coding Progress",
    icon: Code2,
    to: "/trainer/m/$module",
    slug: "coding-progress",
    description: "Coding Judge telemetry, submission verdicts, and language trends",
  },
  {
    label: "Assessments",
    icon: FileCheck2,
    to: "/trainer/m/$module",
    slug: "assessments",
    description: "Assessment cohort analytics and difficulty breakdown",
  },
  {
    label: "Aptitude",
    icon: BrainCircuit,
    to: "/trainer/m/$module",
    slug: "aptitude",
    description: "Quantitative and logical reasoning diagnostic metrics",
  },
  {
    label: "Verbal Ability",
    icon: Languages,
    to: "/trainer/m/$module",
    slug: "verbal",
    description: "Comprehension, grammar, and communication readiness",
  },
  {
    label: "Soft Skills",
    icon: Sparkles,
    to: "/trainer/m/$module",
    slug: "soft-skills",
    description: "Behavioral, interview, and professional readiness indicators",
  },
  {
    label: "Placement Intelligence",
    icon: Briefcase,
    to: "/trainer/m/$module",
    slug: "placement",
    description: "Placement readiness tiers, tier distribution, and company match",
  },
  {
    label: "Interventions & Alerts",
    icon: AlertTriangle,
    to: "/trainer/m/$module",
    slug: "interventions",
    description: "Struggling student warnings, low-engagement flags, and action plans",
  },
  {
    label: "Reports",
    icon: FileSpreadsheet,
    to: "/trainer/m/$module",
    slug: "reports",
    description: "Class summary intelligence, PDF/CSV scoped performance export",
  },
  {
    label: "Notifications",
    icon: Bell,
    to: "/trainer/m/$module",
    slug: "notifications",
    description: "Institutional announcements and class alerts",
  },
  {
    label: "My Account",
    icon: UserCheck,
    to: "/trainer/m/$module",
    slug: "account",
    description: "Trainer profile details, assigned skills, and college scope",
  },
];
