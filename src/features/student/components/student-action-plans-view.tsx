import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  User,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Send,
  Check,
  Flame,
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Code2,
  BookOpen,
  GitBranch,
  ShieldCheck,
  Award,
  ListTodo,
  RotateCcw,
  CheckSquare,
  Square,
  ChevronsUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description?: string;
  actionType?: string;
  actionUrl?: string;
  actionText?: string;
  completed: boolean;
}

interface ActionPlan {
  id: string;
  title: string;
  description: string;
  status: "In Progress" | "Completed" | "Blocked" | "Not Started";
  priority: "High" | "Medium" | "Low";
  deadline: string;
  isOverdue?: boolean;
  domain?: string;
  tasksCount: number;
  completedTasksCount: number;
  assignedBy?: string;
  tasks?: Task[];
}

interface StudentActionPlansViewProps {
  initialPlans: ActionPlan[];
  onRefresh?: () => Promise<void>;
}

const EVIDENCE_TEMPLATES: Record<string, string> = {
  "Judge Solution Accepted":
    "Executed and verified optimal solution on Coding Judge. Passed 100% test cases within time limit constraints.",
  "GitHub Commit Synced":
    "Committed modular solution with comprehensive automated tests and synchronized with personal student repository.",
  "Theory Review Completed":
    "Studied foundational algorithmic paradigm, time complexity recurrences, and edge case models.",
  "Diagnostic Passed":
    "Completed targeted module evaluation test scoring above 85% on critical concept competencies.",
  "Peer Code Review":
    "Reviewed code with peer group, audited boundary conditions, and refined memory complexity.",
  "Mentor 1:1 Signoff":
    "Demonstrated solution architecture to faculty mentor and received verified sign-off.",
};

export function StudentActionPlansView({ initialPlans = [], onRefresh }: StudentActionPlansViewProps) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<ActionPlan[]>(initialPlans);
  const [statusFilter, setStatusFilter] = useState<"all" | "in_progress" | "completed" | "critical">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Map of expanded plan IDs. By default, all plans are expanded.
  const [expandedPlanIds, setExpandedPlanIds] = useState<Record<string, boolean>>({});

  // Evidence modal state
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<ActionPlan | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceTag, setEvidenceTag] = useState<string>("Judge Solution Accepted");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize plans when initialPlans prop changes
  useEffect(() => {
    if (initialPlans && Array.isArray(initialPlans)) {
      setPlans(initialPlans);
    }
  }, [initialPlans]);

  // Overall Statistics Calculation
  const stats = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    let highPriorityCount = 0;
    let criticalOverdueCount = 0;

    plans.forEach((p) => {
      const pTasks = p.tasks || [];
      totalTasks += pTasks.length;
      completedTasks += pTasks.filter((t) => t.completed).length;
      if (p.priority === "High" && p.status !== "Completed") {
        highPriorityCount++;
      }
      if (p.isOverdue || p.status === "Blocked") {
        criticalOverdueCount++;
      }
    });

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const completedPlansCount = plans.filter((p) => p.status === "Completed").length;

    return {
      totalPlans: plans.length,
      completedPlans: completedPlansCount,
      totalTasks,
      completedTasks,
      completionRate,
      highPriorityCount,
      criticalOverdueCount,
    };
  }, [plans]);

  // Filtered Plans
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      // Status filter
      if (statusFilter === "in_progress" && plan.status === "Completed") return false;
      if (statusFilter === "completed" && plan.status !== "Completed") return false;
      if (statusFilter === "critical" && !plan.isOverdue && plan.status !== "Blocked" && plan.priority !== "High") {
        return false;
      }

      // Priority filter
      if (priorityFilter === "high" && plan.priority !== "High") return false;
      if (priorityFilter === "medium" && plan.priority !== "Medium") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = plan.title?.toLowerCase().includes(q);
        const matchesDesc = plan.description?.toLowerCase().includes(q);
        const matchesDomain = plan.domain?.toLowerCase().includes(q);
        const matchesAssigner = plan.assignedBy?.toLowerCase().includes(q);
        const matchesTasks = (plan.tasks || []).some((t) =>
          t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
        );
        if (!matchesTitle && !matchesDesc && !matchesDomain && !matchesAssigner && !matchesTasks) {
          return false;
        }
      }

      return true;
    });
  }, [plans, statusFilter, priorityFilter, searchQuery]);

  // Helper to check if a specific plan card is expanded (defaults to true)
  const isPlanExpanded = (planId: string) => {
    return expandedPlanIds[planId] !== false;
  };

  // Toggle single plan expansion
  const togglePlanExpanded = (planId: string) => {
    setExpandedPlanIds((prev) => ({
      ...prev,
      [planId]: prev[planId] === false ? true : false,
    }));
  };

  // Toggle all plans expansion
  const areAllExpanded = useMemo(() => {
    if (!filteredPlans.length) return true;
    return filteredPlans.every((p) => isPlanExpanded(p.id));
  }, [filteredPlans, expandedPlanIds]);

  const toggleAllExpanded = () => {
    const nextState = !areAllExpanded;
    const nextMap: Record<string, boolean> = {};
    plans.forEach((p) => {
      nextMap[p.id] = nextState;
    });
    setExpandedPlanIds(nextMap);
  };

  // Safe navigation handler for all action URLs
  const handleActionNavigate = (e: React.MouseEvent, url?: string) => {
    e.stopPropagation();
    if (!url) return;
    if (url.startsWith("/student/m/")) {
      const slug = url.replace("/student/m/", "") as any;
      navigate({ to: "/student/m/$module", params: { module: slug } });
    } else {
      navigate({ to: url as any });
    }
  };

  // 1-Click Milestone Quick Toggle (Checkbox click)
  const handleQuickToggle = async (plan: ActionPlan, task: Task) => {
    const nextCompleted = !task.completed;

    // Optimistic UI update
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== plan.id) return p;
        const updatedTasks = (p.tasks || []).map((t) =>
          t.id === task.id ? { ...t, completed: nextCompleted } : t
        );
        const allDone = updatedTasks.every((t) => t.completed);
        return {
          ...p,
          tasks: updatedTasks,
          completedTasksCount: updatedTasks.filter((t) => t.completed).length,
          status: allDone ? "Completed" : p.status === "Completed" ? "In Progress" : p.status,
        };
      })
    );

    try {
      if (nextCompleted) {
        await api.student.actionPlans.completeMilestone(
          plan.id,
          task.id,
          "Quick-verified by student in workspace checklist"
        );
        toast.success("Milestone marked completed!", {
          description: task.title,
        });
      } else {
        await api.student.actionPlans.completeMilestone(
          plan.id,
          task.id,
          "Reopen milestone for further practice"
        );
        toast.info("Milestone re-opened", {
          description: task.title,
        });
      }

      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error("Toggle error:", err);
      toast.error("Network issue updating milestone. Please retry.");
      if (onRefresh) {
        await onRefresh();
      }
    }
  };

  // Open Evidence Dialog Modal
  const handleOpenEvidence = (plan: ActionPlan, task: Task) => {
    setActivePlan(plan);
    setActiveTask(task);
    const defaultTag = "Judge Solution Accepted";
    setEvidenceTag(defaultTag);
    setEvidenceText(EVIDENCE_TEMPLATES[defaultTag] || "");
    setEvidenceDialogOpen(true);
  };

  // Category Tag Selection in Dialog
  const handleSelectTag = (tag: string) => {
    setEvidenceTag(tag);
    if (!evidenceText.trim() || Object.values(EVIDENCE_TEMPLATES).includes(evidenceText.trim())) {
      setEvidenceText(EVIDENCE_TEMPLATES[tag] || "");
    }
  };

  // Submit Evidence in Dialog
  const handleSubmitEvidence = async (isReopen = false) => {
    if (!activePlan || !activeTask) return;
    try {
      setIsSubmitting(true);
      const fullEvidence = isReopen
        ? "Reopen milestone for review."
        : `[Tag: ${evidenceTag}] ${evidenceText.trim() || EVIDENCE_TEMPLATES[evidenceTag] || "Verified execution."}`;

      await api.student.actionPlans.completeMilestone(activePlan.id, activeTask.id, fullEvidence);

      // Optimistic update
      const nextCompleted = !isReopen;
      setPlans((prev) =>
        prev.map((p) => {
          if (p.id !== activePlan.id) return p;
          const updatedTasks = (p.tasks || []).map((t) =>
            t.id === activeTask.id ? { ...t, completed: nextCompleted } : t
          );
          const allDone = updatedTasks.every((t) => t.completed);
          return {
            ...p,
            tasks: updatedTasks,
            completedTasksCount: updatedTasks.filter((t) => t.completed).length,
            status: allDone ? "Completed" : p.status === "Completed" && !nextCompleted ? "In Progress" : p.status,
          };
        })
      );

      if (isReopen) {
        toast.info("Milestone reopened for revision", {
          description: activeTask.title,
        });
      } else {
        toast.success("Verified evidence recorded!", {
          description: `${activeTask.title} (${evidenceTag})`,
        });
      }

      setEvidenceDialogOpen(false);

      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error("Evidence submission error:", err);
      toast.error("Failed to submit evidence. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="pb-3 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <span>Assigned Action Plans & Remediation Tracks</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Personalized academic interventions, targeted algorithmic milestones, and evidence-verified skill roadmaps.
          </p>
        </div>

        <Badge
          variant="outline"
          className="text-xs font-mono bg-primary/10 text-primary border-primary/30 w-fit cursor-default"
        >
          Remediation Health: {stats.completionRate >= 50 ? "On Track (Optimal)" : "Action Required"}
        </Badge>
      </div>

      {/* 2. Interactive Telemetry KPI Cards (Click to Filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Assigned Plans */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("all");
            setPriorityFilter("all");
          }}
          className={cn(
            "rounded-xl border p-4 text-left transition-all duration-150 backdrop-blur-xl space-y-1 group cursor-pointer",
            statusFilter === "all" && priorityFilter === "all"
              ? "border-primary/60 bg-primary/5 ring-1 ring-primary/40 shadow-xs"
              : "border-border/70 bg-card/75 hover:border-primary/40 hover:bg-muted/30"
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium group-hover:text-foreground">Total Assigned Plans</span>
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1 flex items-baseline gap-1.5">
            <span>{stats.totalPlans}</span>
            <span className="text-xs text-muted-foreground font-sans font-normal">Active Tracks</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>{stats.completedPlans} of {stats.totalPlans} completed</span>
            <span className="text-[10px] text-primary underline underline-offset-2">Click to view all</span>
          </div>
        </button>

        {/* Milestone Completion Rate */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("completed");
            setPriorityFilter("all");
          }}
          className={cn(
            "rounded-xl border p-4 text-left transition-all duration-150 backdrop-blur-xl space-y-1 group cursor-pointer",
            statusFilter === "completed"
              ? "border-emerald-500/60 bg-emerald-500/5 ring-1 ring-emerald-500/40 shadow-xs"
              : "border-border/70 bg-card/75 hover:border-emerald-500/40 hover:bg-muted/30"
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium group-hover:text-foreground">Milestone Progress</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1 flex items-baseline gap-1.5">
            <span>{stats.completionRate}%</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-sans font-medium">Completed</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>{stats.completedTasks} of {stats.totalTasks} verified</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 underline underline-offset-2">Filter done</span>
          </div>
        </button>

        {/* Critical Priority Pending */}
        <button
          type="button"
          onClick={() => {
            setPriorityFilter("high");
            setStatusFilter("in_progress");
          }}
          className={cn(
            "rounded-xl border p-4 text-left transition-all duration-150 backdrop-blur-xl space-y-1 group cursor-pointer",
            priorityFilter === "high" && statusFilter === "in_progress"
              ? "border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/40 shadow-xs"
              : "border-border/70 bg-card/75 hover:border-amber-500/40 hover:bg-muted/30"
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium group-hover:text-foreground">Critical Priority</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1 flex items-baseline gap-1.5">
            <span>{stats.highPriorityCount}</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-sans font-medium">Pending</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>High campus relevance</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 underline underline-offset-2">Focus list</span>
          </div>
        </button>

        {/* In Progress Tracks */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("in_progress");
            setPriorityFilter("all");
          }}
          className={cn(
            "rounded-xl border p-4 text-left transition-all duration-150 backdrop-blur-xl space-y-1 group cursor-pointer",
            statusFilter === "in_progress" && priorityFilter === "all"
              ? "border-blue-500/60 bg-blue-500/5 ring-1 ring-blue-500/40 shadow-xs"
              : "border-border/70 bg-card/75 hover:border-blue-500/40 hover:bg-muted/30"
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium group-hover:text-foreground">In Progress Tracks</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1 flex items-baseline gap-1.5">
            <span>{plans.filter((p) => p.status !== "Completed").length}</span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-sans font-medium">Active</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>Evidence sync active</span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 underline underline-offset-2">Filter active</span>
          </div>
        </button>
      </div>

      {/* 3. Interactive Filter, Search & Expand Toolbar */}
      <div className="rounded-xl border border-border/70 bg-card/75 p-3 text-card-foreground shadow-xs backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/30 border border-border/50 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1 rounded-md transition-all font-medium whitespace-nowrap cursor-pointer",
              statusFilter === "all"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All Plans ({plans.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("in_progress")}
            className={cn(
              "px-3 py-1 rounded-md transition-all font-medium whitespace-nowrap cursor-pointer",
              statusFilter === "in_progress"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            In Progress ({plans.filter((p) => p.status !== "Completed").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("completed")}
            className={cn(
              "px-3 py-1 rounded-md transition-all font-medium whitespace-nowrap cursor-pointer",
              statusFilter === "completed"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Completed ({plans.filter((p) => p.status === "Completed").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("critical")}
            className={cn(
              "px-3 py-1 rounded-md transition-all font-medium whitespace-nowrap cursor-pointer",
              statusFilter === "critical"
                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Critical / Blocked ({plans.filter((p) => p.isOverdue || p.status === "Blocked" || p.priority === "High").length})
          </button>
        </div>

        {/* Priority, Global Expand, and Search Input */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority toggles */}
          <div className="flex items-center gap-1 text-xs bg-muted/30 p-1 rounded-md border border-border/50">
            <button
              type="button"
              onClick={() => setPriorityFilter("all")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer",
                priorityFilter === "all" ? "bg-background text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setPriorityFilter("high")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer",
                priorityFilter === "high" ? "bg-background text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              High
            </button>
            <button
              type="button"
              onClick={() => setPriorityFilter("medium")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer",
                priorityFilter === "medium" ? "bg-background text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Medium
            </button>
          </div>

          {/* Expand / Collapse All Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleAllExpanded}
            className="h-8 text-xs border-border/70 hover:bg-muted/40 gap-1.5 cursor-pointer"
            title={areAllExpanded ? "Collapse all action plan cards" : "Expand all action plan cards"}
          >
            <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{areAllExpanded ? "Collapse All" : "Expand All"}</span>
          </Button>

          {/* Search Input with Clear Button */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search plans, mentors, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 h-8 text-xs bg-background/80 border-border/70"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Action Plans Cards List */}
      <div className="space-y-4">
        {filteredPlans.length > 0 ? (
          filteredPlans.map((plan) => {
            const planTasks = plan.tasks || [];
            const doneTasks = planTasks.filter((t) => t.completed).length;
            const progressPct = planTasks.length > 0 ? Math.round((doneTasks / planTasks.length) * 100) : 0;
            const isCompleted = plan.status === "Completed" || (planTasks.length > 0 && doneTasks === planTasks.length);
            const expanded = isPlanExpanded(plan.id);

            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-xl border bg-card/75 shadow-xs backdrop-blur-xl transition-all duration-200 overflow-hidden",
                  isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                    : plan.isOverdue || plan.status === "Blocked"
                    ? "border-amber-500/40 bg-amber-500/[0.02]"
                    : "border-border/70 hover:border-primary/40"
                )}
              >
                {/* Clickable Plan Card Header */}
                <div
                  onClick={() => togglePlanExpanded(plan.id)}
                  className="p-5 space-y-3 cursor-pointer hover:bg-muted/15 transition-colors select-none"
                  title="Click to expand or collapse plan details"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground font-semibold">#{plan.id.toUpperCase()}</span>
                        {plan.domain && (
                          <Badge variant="outline" className="text-[10px] font-mono border-border/60 bg-muted/20">
                            {plan.domain}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-mono",
                            plan.priority === "High"
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 font-semibold"
                              : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                          )}
                        >
                          {plan.priority} Priority
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-mono",
                            isCompleted
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                              : plan.isOverdue
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-semibold"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                          )}
                        >
                          {isCompleted ? "Completed" : plan.isOverdue ? "Overdue" : plan.status}
                        </Badge>
                      </div>

                      <h3 className="text-base font-bold text-foreground leading-snug flex items-center gap-2">
                        <span>{plan.title}</span>
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {plan.description}
                      </p>
                    </div>

                    {/* Deadline, Mentor & Accordion Chevron */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2.5 shrink-0 text-xs text-muted-foreground border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Deadline: <strong className="text-foreground">{plan.deadline}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-sans">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span className="truncate max-w-[160px]">{plan.assignedBy}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-sans text-primary font-medium mt-1">
                        <span>{expanded ? "Hide Milestones" : "Show Milestones"}</span>
                        {expanded ? (
                          <ChevronUp className="w-3.5 h-3.5 transition-transform" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 transition-transform" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar & Summary */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Milestones Progress:</span>
                      <span className="font-mono font-bold text-foreground">
                        {doneTasks} of {planTasks.length} Completed ({progressPct}%)
                      </span>
                    </div>

                    <div className="h-2 rounded-full bg-muted/50 overflow-hidden flex">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isCompleted ? "bg-emerald-500" : "bg-primary"
                        )}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Collapsible Stepped Task Checklist Section */}
                {expanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-border/50 bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <ListTodo className="w-3.5 h-3.5 text-primary" />
                        <span>Required Milestones & Verification Steps</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Click step circle to 1-click verify, or submit custom evidence notes
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {planTasks.map((task, idx) => (
                        <div
                          key={task.id}
                          className={cn(
                            "p-3 rounded-lg border text-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                            task.completed
                              ? "bg-emerald-500/[0.04] border-emerald-500/25 text-muted-foreground"
                              : "bg-background/80 border-border/70 text-foreground hover:border-primary/50 shadow-2xs"
                          )}
                        >
                          {/* Left: Step Circle and Title/Description */}
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Interactive Step Button: Click to toggle completed */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickToggle(plan, task);
                              }}
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer font-mono text-[11px] font-bold",
                                task.completed
                                  ? "bg-emerald-500 text-white shadow-xs hover:bg-emerald-600"
                                  : "border-2 border-primary/50 text-primary hover:border-primary hover:bg-primary/10"
                              )}
                              title={
                                task.completed
                                  ? "Milestone completed (Click to re-open)"
                                  : "Click to 1-click verify milestone"
                              }
                            >
                              {task.completed ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : idx + 1}
                            </button>

                            <div className="space-y-0.5 min-w-0 flex-1">
                              <span
                                className={cn(
                                  "font-medium block leading-tight",
                                  task.completed && "line-through text-muted-foreground"
                                )}
                              >
                                {task.title}
                              </span>
                              {task.description && (
                                <p className="text-[11px] text-muted-foreground leading-normal">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right: Action Shortcuts & Evidence Buttons */}
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {/* Direct Action Link (Judge, Learning, GitHub) - ALWAYS CLICKABLE */}
                            {task.actionUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-primary border-primary/30 hover:bg-primary/10 hover:text-primary gap-1.5 cursor-pointer"
                                onClick={(e) => handleActionNavigate(e, task.actionUrl)}
                                title={`Navigate to ${task.actionText || "action workspace"}`}
                              >
                                {task.actionType === "judge" && <Code2 className="w-3.5 h-3.5" />}
                                {task.actionType === "learning" && <BookOpen className="w-3.5 h-3.5" />}
                                {task.actionType === "evidence" && <GitBranch className="w-3.5 h-3.5" />}
                                <span>{task.actionText || "Open"}</span>
                              </Button>
                            )}

                            {/* Evidence / Completion Controls */}
                            {task.completed ? (
                              <div className="flex items-center gap-1.5">
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono py-0.5 px-2">
                                  Verified
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEvidence(plan, task);
                                  }}
                                  title="View or modify submitted evidence notes"
                                >
                                  <span>Evidence</span>
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                className="h-7 px-3 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold cursor-pointer shadow-xs hover:bg-primary/90"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEvidence(plan, task);
                                }}
                              >
                                <Send className="w-3 h-3" />
                                <span>Submit Evidence</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Celebration Banner when Plan Complete */}
                    {isCompleted && (
                      <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="font-semibold">
                            All action milestones satisfied & verified in Layer C intelligence.
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 cursor-pointer w-fit self-end sm:self-auto"
                          onClick={() => navigate({ to: "/student/assessments" as any })}
                        >
                          <span>Take Readiness Diagnostic →</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-border p-8 space-y-3">
            <Target className="w-8 h-8 text-muted-foreground/60 mx-auto" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-sm">No action plans matched your current filter.</p>
              <p>Try resetting filters or searching with a different keyword.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
                setSearchQuery("");
              }}
              className="text-xs border-border cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              <span>Reset All Filters</span>
            </Button>
          </div>
        )}
      </div>

      {/* 5. Interactive Evidence Submission Dialog */}
      <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-border text-foreground font-sans">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>Submit Verified Milestone Evidence</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide verifiable proof or reflection for mentor sign-off in the Layer C engine.
            </DialogDescription>
          </DialogHeader>

          {activeTask && activePlan && (
            <div className="space-y-4 py-2 text-xs">
              {/* Context Summary Box */}
              <div className="p-3 rounded-lg bg-muted/20 border border-border/50 space-y-1">
                <span className="text-[11px] text-muted-foreground font-mono">Plan: {activePlan.title}</span>
                <p className="font-semibold text-foreground text-sm flex items-center justify-between">
                  <span>{activeTask.title}</span>
                  {activeTask.completed && (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                      Currently Verified
                    </Badge>
                  )}
                </p>
                {activeTask.description && (
                  <p className="text-[11px] text-muted-foreground">{activeTask.description}</p>
                )}
              </div>

              {/* Quick Evidence Category Tags */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground text-xs block">
                  Select Evidence Category (Click to autofill suggested note):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Judge Solution Accepted",
                    "GitHub Commit Synced",
                    "Theory Review Completed",
                    "Diagnostic Passed",
                    "Peer Code Review",
                    "Mentor 1:1 Signoff",
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleSelectTag(tag)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all cursor-pointer",
                        evidenceTag === tag
                          ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                          : "bg-muted/20 text-muted-foreground border-border hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reflection / Evidence Notes Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-foreground text-xs block">
                    Evidence Notes / Commit Reference:
                  </label>
                  <button
                    type="button"
                    onClick={() => setEvidenceText(EVIDENCE_TEMPLATES[evidenceTag] || "")}
                    className="text-[11px] text-primary hover:underline cursor-pointer"
                  >
                    Reset template
                  </button>
                </div>
                <Textarea
                  placeholder="e.g. Implemented Dijkstra shortest path in Java. Synced commit to repository with 100% test coverage."
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  className="text-xs min-h-[95px] border-border bg-background"
                />
                <span className="text-[10px] text-muted-foreground block">
                  Evidence will be registered on your permanent activity timeline and verified in Layer C placement intelligence.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40 flex-col sm:flex-row justify-between">
            {activeTask?.completed ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleSubmitEvidence(true)}
                disabled={isSubmitting}
                className="text-xs gap-1 cursor-pointer mr-auto"
              >
                <span>Re-open Milestone</span>
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEvidenceDialogOpen(false)}
                className="text-xs border-border cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSubmitEvidence(false)}
                disabled={isSubmitting}
                className="text-xs gap-1.5 bg-primary text-primary-foreground font-semibold cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <span>Recording…</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Verify & Complete Milestone</span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
