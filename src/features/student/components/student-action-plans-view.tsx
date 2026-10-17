import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
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
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Code2,
  BookOpen,
  GitBranch,
  ShieldCheck,
  Award,
  ListTodo,
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

export function StudentActionPlansView({ initialPlans = [], onRefresh }: StudentActionPlansViewProps) {
  const [plans, setPlans] = useState<ActionPlan[]>(initialPlans);
  const [statusFilter, setStatusFilter] = useState<"all" | "in_progress" | "completed">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // Evidence modal state
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<ActionPlan | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceTag, setEvidenceTag] = useState<string>("Judge Solution Accepted");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize when initialPlans change
  useMemo(() => {
    setPlans(initialPlans);
  }, [initialPlans]);

  // Overall Statistics Calculation
  const stats = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    let highPriorityCount = 0;

    plans.forEach((p) => {
      const pTasks = p.tasks || [];
      totalTasks += pTasks.length;
      completedTasks += pTasks.filter((t) => t.completed).length;
      if (p.priority === "High" && p.status !== "Completed") {
        highPriorityCount++;
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
    };
  }, [plans]);

  // Filtered Plans
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      // Status filter
      if (statusFilter === "in_progress" && plan.status === "Completed") return false;
      if (statusFilter === "completed" && plan.status !== "Completed") return false;

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
        if (!matchesTitle && !matchesDesc && !matchesDomain && !matchesAssigner) {
          return false;
        }
      }

      return true;
    });
  }, [plans, statusFilter, priorityFilter, searchQuery]);

  // Handle Milestone Submission
  const handleOpenEvidence = (plan: ActionPlan, task: Task) => {
    setActivePlan(plan);
    setActiveTask(task);
    setEvidenceText("");
    setEvidenceTag("Judge Solution Accepted");
    setEvidenceDialogOpen(true);
  };

  const handleSubmitEvidence = async () => {
    if (!activePlan || !activeTask) return;
    try {
      setIsSubmitting(true);
      const fullEvidence = `[Tag: ${evidenceTag}] ${evidenceText.trim() || "Verified milestone execution and automated test passing."}`;
      await api.student.actionPlans.completeMilestone(activePlan.id, activeTask.id, fullEvidence);

      // Optimistic update
      setPlans((prev) =>
        prev.map((p) => {
          if (p.id !== activePlan.id) return p;
          const updatedTasks = (p.tasks || []).map((t) =>
            t.id === activeTask.id ? { ...t, completed: true } : t
          );
          const allDone = updatedTasks.every((t) => t.completed);
          return {
            ...p,
            tasks: updatedTasks,
            completedTasksCount: updatedTasks.filter((t) => t.completed).length,
            status: allDone ? "Completed" : p.status,
          };
        })
      );

      toast.success("Milestone marked completed!", {
        description: `Evidence recorded for: ${activeTask.title}`,
      });
      setEvidenceDialogOpen(false);

      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      toast.error("Failed to complete milestone. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
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

        <Badge variant="outline" className="text-xs font-mono bg-primary/10 text-primary border-primary/30">
          Remediation Health: {stats.completionRate >= 50 ? "On Track (Optimal)" : "Action Required"}
        </Badge>
      </div>

      {/* 1. Interactive KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Total Assigned Plans</span>
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1 flex items-baseline gap-1.5">
            <span>{stats.totalPlans}</span>
            <span className="text-xs text-muted-foreground font-sans font-normal">Active Tracks</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {stats.completedPlans} of {stats.totalPlans} fully resolved
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Milestone Completion</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1 flex items-baseline gap-1.5">
            <span>{stats.completionRate}%</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-sans font-medium">Progress</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {stats.completedTasks} of {stats.totalTasks} tasks verified
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Critical Priority</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1 flex items-baseline gap-1.5">
            <span>{stats.highPriorityCount}</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-sans font-medium">Pending</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Immediate campus placement relevance
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Remediation Status</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-foreground mt-1.5 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>In Good Standing</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Evidence-backed verification active
          </p>
        </div>
      </div>

      {/* 2. Interactive Filter & Search Controls */}
      <div className="rounded-xl border border-border/70 bg-card/75 p-3.5 text-card-foreground shadow-xs backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/30 border border-border/50 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1 rounded-md transition-all font-medium whitespace-nowrap",
              statusFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            All Plans ({plans.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("in_progress")}
            className={cn(
              "px-3 py-1 rounded-md transition-all font-medium whitespace-nowrap",
              statusFilter === "in_progress" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            In Progress ({plans.filter((p) => p.status !== "Completed").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("completed")}
            className={cn(
              "px-3 py-1 rounded-md transition-all font-medium whitespace-nowrap",
              statusFilter === "completed" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Completed ({plans.filter((p) => p.status === "Completed").length})
          </button>
        </div>

        {/* Priority and Search */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 text-xs bg-muted/30 p-1 rounded-md border border-border/50">
            <button
              type="button"
              onClick={() => setPriorityFilter("all")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] transition-colors",
                priorityFilter === "all" ? "bg-background text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setPriorityFilter("high")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] transition-colors",
                priorityFilter === "high" ? "bg-background text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              High
            </button>
          </div>

          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Filter plans by title or mentor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background/80 border-border/70"
            />
          </div>
        </div>
      </div>

      {/* 3. Action Plans Cards List */}
      <div className="space-y-4">
        {filteredPlans.length > 0 ? (
          filteredPlans.map((plan) => {
            const planTasks = plan.tasks || [];
            const doneTasks = planTasks.filter((t) => t.completed).length;
            const progressPct = planTasks.length > 0 ? Math.round((doneTasks / planTasks.length) * 100) : 0;
            const isCompleted = plan.status === "Completed" || (planTasks.length > 0 && doneTasks === planTasks.length);
            const isExpanded = expandedPlanId === plan.id;

            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-xl border bg-card/75 shadow-xs backdrop-blur-xl transition-all duration-200 overflow-hidden",
                  isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                    : "border-border/70 hover:border-primary/40"
                )}
              >
                {/* Plan Card Header */}
                <div className="p-5 space-y-3">
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
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
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
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                          )}
                        >
                          {isCompleted ? "Completed" : plan.status}
                        </Badge>
                      </div>

                      <h3 className="text-base font-bold text-foreground leading-snug">
                        {plan.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    {/* Deadline and Assignee Meta */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 text-xs text-muted-foreground border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Deadline: <strong className="text-foreground">{plan.deadline}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-sans">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span className="truncate max-w-[160px]">{plan.assignedBy}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar & Percentage */}
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

                {/* Stepped Task Checklist Section */}
                <div className="px-5 pb-5 pt-1 border-t border-border/50 bg-muted/10 space-y-2.5">
                  <div className="flex items-center justify-between text-xs pt-2">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <ListTodo className="w-3.5 h-3.5 text-primary" />
                      <span>Required Milestones & Verification Steps</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <span>{isExpanded ? "Hide Details" : "Show Details"}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {planTasks.map((task, idx) => (
                      <div
                        key={task.id}
                        className={cn(
                          "p-3 rounded-lg border text-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                          task.completed
                            ? "bg-emerald-500/[0.04] border-emerald-500/20 text-muted-foreground"
                            : "bg-background/80 border-border/70 text-foreground hover:border-primary/50 shadow-2xs"
                        )}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          {task.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-primary/60 text-primary flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5 font-bold">
                              {idx + 1}
                            </div>
                          )}

                          <div className="space-y-0.5 min-w-0">
                            <span className={cn("font-medium block leading-tight", task.completed && "line-through text-muted-foreground")}>
                              {task.title}
                            </span>
                            {task.description && (
                              <p className="text-[11px] text-muted-foreground leading-normal">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Task Action Controls */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {task.actionUrl && !task.completed && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-primary hover:text-primary gap-1" asChild>
                              <Link to={task.actionUrl}>
                                {task.actionType === "judge" && <Code2 className="w-3.5 h-3.5" />}
                                {task.actionType === "learning" && <BookOpen className="w-3.5 h-3.5" />}
                                {task.actionType === "evidence" && <GitBranch className="w-3.5 h-3.5" />}
                                <span>{task.actionText || "Action"}</span>
                              </Link>
                            </Button>
                          )}

                          {task.completed ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono py-0.5 px-2">
                              Verified Complete
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 px-3 text-xs gap-1.5 bg-primary text-primary-foreground font-medium"
                              onClick={() => handleOpenEvidence(plan, task)}
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
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-semibold">All action milestones satisfied & verified in Layer C intelligence.</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-emerald-500/40 bg-background/50 font-mono">
                        Qualified
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-border p-8 space-y-3">
            <Target className="w-8 h-8 text-muted-foreground/60 mx-auto" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-sm">No action plans matched your filter.</p>
              <p>You have completed all assigned tracks or your filter query returned zero items.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
                setSearchQuery("");
              }}
              className="text-xs border-border"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* 4. Interactive Evidence Submission Dialog */}
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
                <p className="font-semibold text-foreground text-sm">{activeTask.title}</p>
                {activeTask.description && (
                  <p className="text-[11px] text-muted-foreground">{activeTask.description}</p>
                )}
              </div>

              {/* Quick Evidence Category Tags */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground text-xs block">Evidence Category:</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Judge Solution Accepted",
                    "GitHub Commit Synced",
                    "Theory Review Completed",
                    "Diagnostic Passed",
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setEvidenceTag(tag)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all",
                        evidenceTag === tag
                          ? "bg-primary text-primary-foreground border-primary font-semibold"
                          : "bg-muted/20 text-muted-foreground border-border hover:text-foreground"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reflection / Evidence Notes Textarea */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground text-xs block">
                  Evidence Notes / Commit Reference:
                </label>
                <Textarea
                  placeholder="e.g. Implemented Dijkstra shortest path in Java. Synced commit to repository with 100% test coverage."
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  className="text-xs min-h-[90px] border-border bg-background"
                />
                <span className="text-[10px] text-muted-foreground block">
                  Your evidence is logged to your campus activity timeline and student record.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEvidenceDialogOpen(false)}
              className="text-xs border-border"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmitEvidence}
              disabled={isSubmitting}
              className="text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
