import {
  Award,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  FileSpreadsheet,
  FileText,
  GitPullRequest,
  History,
  LayoutDashboard,
  Sparkles,
  Target,
  UploadCloud,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type PlacementModuleSlug =
  | "eligibility"
  | "applications"
  | "pipeline"
  | "offers"
  | "intelligence"
  | "preparation"
  | "notifications"
  | "reports"
  | "data"
  | "activity"
  | "account";

export interface PlacementNavItem {
  label: string;
  icon: LucideIcon;
  to: string;
  slug?: PlacementModuleSlug;
  description: string;
}

export const PLACEMENT_NAV: PlacementNavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/placement",
    description: "Placement KPIs, upcoming drives, active hiring pipelines, and conversion funnel",
  },
  {
    label: "Students",
    icon: Users,
    to: "/placement/students",
    description: "College-scoped student directory, placement readiness tiers, and eligibility audit",
  },
  {
    label: "Companies",
    icon: Building2,
    to: "/placement/companies",
    description: "Corporate partners, relationship tier, hiring history, and recruiter contacts",
  },
  {
    label: "Opportunities",
    icon: Briefcase,
    to: "/placement/opportunities",
    description: "Job & internship postings, versioned eligibility criteria, and application links",
  },
  {
    label: "Placement Drives",
    icon: Calendar,
    to: "/placement/drives",
    description: "On-campus & off-campus drives, multi-stage schedules, and venues",
  },
  {
    label: "Eligibility Engine",
    icon: CheckSquare,
    to: "/placement/m/$module",
    slug: "eligibility",
    description: "Authoritative criteria evaluation, branch filtering, backlogs, and simulation",
  },
  {
    label: "Applications",
    icon: FileText,
    to: "/placement/m/$module",
    slug: "applications",
    description: "Application tracking, stage advancement, and recruiter status decisions",
  },
  {
    label: "Recruitment Pipeline",
    icon: GitPullRequest,
    to: "/placement/m/$module",
    slug: "pipeline",
    description: "Visual stage progression, funnel analytics, and candidate shortlists",
  },
  {
    label: "Offers & Verification",
    icon: Award,
    to: "/placement/m/$module",
    slug: "offers",
    description: "Offer letters, distinct student placement verification, and joining outcomes",
  },
  {
    label: "Placement Intelligence",
    icon: Sparkles,
    to: "/placement/m/$module",
    slug: "intelligence",
    description: "Shared Intelligence Engine skill gap breakdown, readiness distribution, and matching",
  },
  {
    label: "Preparation & Training",
    icon: Target,
    to: "/placement/m/$module",
    slug: "preparation",
    description: "Placement preparation cohorts, targeted training action plans, and faculty coordination",
  },
  {
    label: "Notifications",
    icon: Bell,
    to: "/placement/m/$module",
    slug: "notifications",
    description: "Institutional placement announcements, drive alerts, and offer updates",
  },
  {
    label: "Reports & Analytics",
    icon: FileSpreadsheet,
    to: "/placement/m/$module",
    slug: "reports",
    description: "Accreditation analytics, CTC distributions, branch conversion, and unplaced rosters",
  },
  {
    label: "Audit Activity",
    icon: History,
    to: "/placement/m/$module",
    slug: "activity",
    description: "Immutable audit trail of placement operations, status updates, and verifications",
  },
  {
    label: "Officer Profile",
    icon: UserCheck,
    to: "/placement/m/$module",
    slug: "account",
    description: "Placement officer credentials, college jurisdiction, and operational scopes",
  },
];
