import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building,
  Calendar,
  Compass,
  FolderKanban,
  GraduationCap,
  History,
  LayoutDashboard,
  Layers,
  Network,
  PlayCircle,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  UploadCloud,
  User,
  UserCheck,
  UserPlus,
  Users,
  Bell,
  type LucideIcon,
} from "lucide-react";

export type CoordinatorModuleSlug =
  | "classes"
  | "training"
  | "performance"
  | "skills"
  | "placement-readiness"
  | "placement-requirements"
  | "imports-exports"
  | "reports"
  | "notifications"
  | "settings"
  | "activity"
  | "account";

export const COORDINATOR_NAV: {
  label: string;
  icon: LucideIcon;
  to: string;
  slug?: CoordinatorModuleSlug;
}[] = [
  { label: "Overview", icon: LayoutDashboard, to: "/coordinator" },
  { label: "Academic Structure", icon: Building, to: "/coordinator/academic" },
  { label: "Classes & Sections", icon: Layers, to: "/coordinator/m/$module", slug: "classes" },
  { label: "Students", icon: Users, to: "/coordinator/students" },
  { label: "Student Registration", icon: UserPlus, to: "/coordinator/registration" },
  { label: "Trainers", icon: GraduationCap, to: "/coordinator/trainers" },
  { label: "Placement Officers", icon: UserCheck, to: "/coordinator/placement-officers" },
  { label: "Batches", icon: FolderKanban, to: "/coordinator/batches" },
  { label: "Class Allocation", icon: Network, to: "/coordinator/allocations" },
  { label: "Training Schedule", icon: Calendar, to: "/coordinator/schedule" },
  { label: "Training Sessions", icon: PlayCircle, to: "/coordinator/sessions" },
  { label: "Action Plans", icon: Target, to: "/coordinator/action-plans" },
  { label: "Training & Courses", icon: BookOpen, to: "/coordinator/m/$module", slug: "training" },
  { label: "Performance Analytics", icon: TrendingUp, to: "/coordinator/m/$module", slug: "performance" },
  { label: "Skill Analytics", icon: Sparkles, to: "/coordinator/m/$module", slug: "skills" },
  { label: "Placement Readiness", icon: Compass, to: "/coordinator/m/$module", slug: "placement-readiness" },
  { label: "Placement Requirements", icon: Briefcase, to: "/coordinator/m/$module", slug: "placement-requirements" },
  { label: "Imports & Exports", icon: UploadCloud, to: "/coordinator/m/$module", slug: "imports-exports" },
  { label: "Reports", icon: BarChart3, to: "/coordinator/m/$module", slug: "reports" },
  { label: "Notifications", icon: Bell, to: "/coordinator/m/$module", slug: "notifications" },
  { label: "College Settings", icon: Settings, to: "/coordinator/m/$module", slug: "settings" },
  { label: "Activity History", icon: History, to: "/coordinator/m/$module", slug: "activity" },
  { label: "My Account", icon: User, to: "/coordinator/m/$module", slug: "account" },
];
