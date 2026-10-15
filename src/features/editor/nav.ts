import {
  Award,
  BookOpen,
  Bell,
  Building2,
  Eye,
  FileQuestion,
  History,
  LayoutDashboard,
  Sliders,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export type EditorModuleSlug = "history" | "account";

export const EDITOR_NAV: {
  label: string;
  icon: LucideIcon;
  to: string;
  slug?: EditorModuleSlug;
}[] = [
  { label: "Overview", icon: LayoutDashboard, to: "/editor" },
  { label: "Colleges", icon: Building2, to: "/editor/colleges" },
  { label: "Coordinator Accounts", icon: Users, to: "/editor/coordinators" },
  { label: "Feature Availability", icon: Sliders, to: "/editor/features" },
  { label: "Learning Content", icon: BookOpen, to: "/editor/courses" },
  { label: "Question Management", icon: FileQuestion, to: "/editor/questions" },
  { label: "Assessment Content", icon: Award, to: "/editor/assessments" },
  { label: "Notifications", icon: Bell, to: "/editor/notifications" },
  { label: "Visible Overrides", icon: Eye, to: "/editor/overrides" },
  { label: "Content History", icon: History, to: "/editor/m/$module", slug: "history" },
  { label: "My Account", icon: User, to: "/editor/m/$module", slug: "account" },
];
