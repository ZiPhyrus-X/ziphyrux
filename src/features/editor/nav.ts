import { Bell, BookOpen, ClipboardList, Eye, FileQuestion, History, LayoutDashboard, ToggleLeft, User } from "lucide-react";
import type { NavItem } from "@/components/workspace/shell";

export const EDITOR_NAV: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, href: "/editor" },
  { label: "Feature Availability", icon: ToggleLeft, href: "/editor/features" },
  { label: "Learning Content", icon: BookOpen, href: "/editor/content" },
  { label: "Question Management", icon: FileQuestion, href: "/editor/questions" },
  { label: "Assessment Content", icon: ClipboardList, href: "/editor/assessments" },
  { label: "Notifications", icon: Bell, href: "/editor/notifications" },
  { label: "Visible-Value Overrides", icon: Eye, href: "/editor/overrides" },
  { label: "Content History", icon: History, href: "/editor/history" },
  { label: "My Account", icon: User, href: "/editor/account" },
];
