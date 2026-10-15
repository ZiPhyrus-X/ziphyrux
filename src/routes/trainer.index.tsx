import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Code2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles,
  Layers,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";
import { useActiveClassContext } from "@/features/trainer/context/active-class-context";
import { api } from "@/lib/api/client";
import {
  TrainerPageHeader,
  TrainerMetric,
  TrainerPanel,
  InsightCard,
  TrainerLoadingSkeleton,
  TrainerEmptyState,
} from "@/features/trainer/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trainer/")({
  head: () => ({
    meta: [
      { title: "Trainer Dashboard — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainerDashboardPage,
});

function TrainerDashboardPage() {
  const { activeAllocationId, activeAllocation, setIsSearchModalOpen, setIsChangeClassOpen } =
    useActiveClassContext();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async (isRefetch = false) => {
    if (isRefetch) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.trainer.dashboard(
        activeAllocationId === "all" ? undefined : activeAllocationId
      );
      setData(res);
    } catch (err) {
      console.error("Failed to load trainer dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [activeAllocationId]);

  if (loading) {
    return <TrainerLoadingSkeleton />;
  }

  const metrics = data?.metrics || {
    totalStudents: 0,
    totalClasses: 0,
    avgAttendance: 0,
    codingAccuracy: 0,
    avgSkillScore: 0,
    atRiskStudentsCount: 0,
  };

  const todaysClasses = data?.todaysClasses || [];
  const skillDist = data?.skillDistribution || [];
  const recentVerdicts = data?.recentVerdicts || [];
  const interventions = data?.immediateInterventions || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <TrainerPageHeader
        title="Trainer Dashboard"
        desc={
          activeAllocation
            ? `Teaching performance overview for ${activeAllocation.className || activeAllocation.branchCode} (${activeAllocation.skillName || "All Skills"}).`
            : "Aggregated teaching intelligence and today's schedule across all authorized allocations."
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsChangeClassOpen(true)}
              className="text-xs h-9 bg-card/60 border-border/80"
            >
              <Layers className="h-3.5 w-3.5 mr-1.5 text-primary" />
              {activeAllocationId === "all" ? "Filter by Class" : "Change Class"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Refresh telemetry"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin text-primary")} />
            </Button>
          </div>
        }
      />

      {/* PRIMARY SECTION: Today's Classes */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                Today's Classes & Sessions
              </h2>
              <p className="text-xs text-muted-foreground">
                Authoritative schedule and live classroom telemetry for today
              </p>
            </div>
          </div>
          <Link
            to="/trainer/classes"
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
          >
            View full schedule <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {todaysClasses.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-border/70 bg-card/20 text-center backdrop-blur-sm">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-foreground">No classes scheduled for today.</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Check your weekly allocations or prepare for upcoming training sessions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysClasses.map((cls: any) => (
              <div
                key={cls.id}
                className="group relative rounded-xl border border-border/70 bg-card/60 hover:bg-card/90 hover:border-primary/40 p-5 shadow-sm backdrop-blur-xl transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="text-[10px] font-mono uppercase bg-primary/5 text-primary border-primary/20 mb-1.5">
                        {cls.status || "Scheduled"}
                      </Badge>
                      <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                        {cls.subject}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium">
                        {cls.className || `${cls.branch} - Sec ${cls.section}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1 justify-end">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {cls.startTime} - {cls.endTime}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                        <MapPin className="h-3 w-3" /> {cls.room || "Lab 204"}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-background/50 border border-border/50 text-xs">
                    <span className="text-[11px] font-semibold text-muted-foreground block">Session Topic:</span>
                    <p className="text-foreground font-medium truncate">{cls.topic || "Core Data Structures & Optimization"}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      Enrolled: <strong className="text-foreground">{cls.totalEnrolled || 60}</strong>
                    </span>
                  </div>
                  <Link
                    to="/trainer/students"
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    View Roster <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* KPI METRICS GRID */}
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <TrainerMetric
          label="Authorized Students"
          value={metrics.totalStudents}
          note="In scoped classes"
          icon={Users}
        />
        <TrainerMetric
          label="Assigned Classes"
          value={metrics.totalClasses}
          note="Active allocations"
          icon={Layers}
        />
        <TrainerMetric
          label="Avg Attendance"
          value={`${metrics.avgAttendance}%`}
          note="Past 30 days"
          icon={CheckCircle2}
          variant={metrics.avgAttendance >= 80 ? "success" : "warning"}
        />
        <TrainerMetric
          label="Judge Accuracy"
          value={`${metrics.codingAccuracy}%`}
          note="Code submissions"
          icon={Code2}
          variant="primary"
        />
        <TrainerMetric
          label="Avg Skill Score"
          value={`${metrics.avgSkillScore}%`}
          note="Class benchmark"
          icon={Award}
        />
        <TrainerMetric
          label="At-Risk Alerts"
          value={metrics.atRiskStudentsCount}
          note="Need pedagogical intervention"
          icon={AlertTriangle}
          variant={metrics.atRiskStudentsCount > 0 ? "danger" : "default"}
        />
      </section>

      {/* TWO-COLUMN ANALYTICS & INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Skill Gaps & Judge Telemetry */}
        <div className="lg:col-span-2 space-y-6">
          {/* Skill Distribution Panel */}
          <TrainerPanel
            title="Skill Proficiency Distribution"
            subtitle="Categorized across Beginner, Intermediate, and Advanced tiers"
            action={
              <Link to="/trainer/m/$module" params={{ module: "skill-gaps" }} className="text-xs text-primary hover:underline flex items-center gap-1">
                Deep Dive <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {skillDist.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No skill evaluation records available yet.</p>
            ) : (
              <div className="space-y-3">
                {skillDist.map((item: any) => {
                  const total = (item.beginner || 0) + (item.intermediate || 0) + (item.advanced || 0) || 1;
                  const pctBeg = Math.round(((item.beginner || 0) / total) * 100);
                  const pctInt = Math.round(((item.intermediate || 0) / total) * 100);
                  const pctAdv = Math.round(((item.advanced || 0) / total) * 100);

                  return (
                    <div key={item.skill} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground capitalize">{item.skill}</span>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="text-rose-500 font-medium">Beg: {pctBeg}%</span>
                          <span className="text-amber-500 font-medium">Int: {pctInt}%</span>
                          <span className="text-emerald-500 font-medium">Adv: {pctAdv}%</span>
                        </div>
                      </div>
                      {/* Segmented Progress Bar */}
                      <div className="h-2.5 w-full rounded-full bg-muted/40 overflow-hidden flex">
                        <div style={{ width: `${pctBeg}%` }} className="bg-rose-500/80 transition-all" title={`Beginner: ${pctBeg}%`} />
                        <div style={{ width: `${pctInt}%` }} className="bg-amber-500/80 transition-all" title={`Intermediate: ${pctInt}%`} />
                        <div style={{ width: `${pctAdv}%` }} className="bg-emerald-500/80 transition-all" title={`Advanced: ${pctAdv}%`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TrainerPanel>

          {/* Coding Judge Submission Verdicts */}
          <TrainerPanel
            title="Coding Judge Telemetry"
            subtitle="Cohort submission breakdown across automated judge test verdicts"
            action={
              <Link to="/trainer/m/$module" params={{ module: "coding-progress" }} className="text-xs text-primary hover:underline flex items-center gap-1">
                View Judge Telemetry <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recentVerdicts.map((v: any) => {
                const isAccept = v.status.toLowerCase().includes("accepted");
                return (
                  <div
                    key={v.status}
                    className={cn(
                      "p-3.5 rounded-xl border backdrop-blur-sm space-y-1",
                      isAccept ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/60 bg-card/40"
                    )}
                  >
                    <span className="text-[11px] font-semibold text-muted-foreground block truncate">
                      {v.status}
                    </span>
                    <p className="text-2xl font-semibold font-display text-foreground">{v.count}</p>
                    <span className="text-[11px] text-muted-foreground">{v.percentage}% of submissions</span>
                  </div>
                );
              })}
            </div>
          </TrainerPanel>
        </div>

        {/* Right 1 col: Shared Intelligence Recommendations & Quick Interventions */}
        <div className="space-y-6">
          <TrainerPanel
            title="Immediate Pedagogical Interventions"
            subtitle="Students flagged by diagnostic intelligence for immediate attention"
            action={
              <Link to="/trainer/m/$module" params={{ module: "interventions" }} className="text-xs text-primary hover:underline">
                All Alerts
              </Link>
            }
          >
            {interventions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No critical student alerts at this time.</p>
            ) : (
              <div className="space-y-3">
                {interventions.slice(0, 3).map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-sm space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">{item.studentName}</span>
                      <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30">
                        {item.priority || "High Priority"}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground font-medium">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">{item.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </TrainerPanel>

          <InsightCard
            insight="Array Manipulation & Dynamic Programming show highest variance in Section A."
            evidence="62% error rate on recursive subproblem memoization across 48 automated test executions."
            action="Allocate 20 minutes in next lab session for visual recursion tree walkthrough."
            severity="warning"
            skill="Data Structures"
          />
        </div>
      </div>
    </div>
  );
}
