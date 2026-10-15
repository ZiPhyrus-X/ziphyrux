import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  FolderKanban,
  GraduationCap,
  PieChart as PieIcon,
  PlayCircle,
  Plus,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, Metric, Panel, fmt } from "@/features/coordinator/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { api } from "@/lib/api/client";
import { authService } from "@/lib/auth/service";

export const Route = createFileRoute("/coordinator/")({
  head: () => ({
    meta: [
      { title: "Coordinator Overview — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoordinatorOverviewPage,
});

function CoordinatorOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const session = authService.getSession();
  const collegeCode = session?.user.collegeCode ?? "SMP101";

  useEffect(() => {
    let active = true;
    Promise.all([
      api.coordinator.overview().catch(() => null),
      api.coordinator.performance.get().catch(() => null),
    ]).then(([resOverview, resPerf]) => {
      if (active) {
        if (resOverview) setData(resOverview);
        if (resPerf) setPerformance(resPerf);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const counts = data ?? {
    collegeCode,
    studentsCount: 3,
    trainersCount: 2,
    batchesCount: 2,
    sessionsToday: 2,
    sessionsRequiringAttention: 1,
    pendingActionPlans: 2,
    recentSessions: [],
    activeActionPlans: [],
  };

  return (
    <div>
      <PageHeader
        title={`Campus Operations — ${collegeCode}`}
        desc="College operational headquarters. Scoped strictly to your assigned institution under Ziphyrus X tenant isolation. Zero attendance tracking policy is enforced."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/registration">
                <Plus className="mr-2 h-4 w-4" /> Registration Link
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/coordinator/schedule">
                <Calendar className="mr-2 h-4 w-4" /> Schedule Session
              </Link>
            </Button>
          </div>
        }
      />

      {/* Zero Attendance & Isolation Invariant Banner */}
      <div className="mb-6 rounded-md border border-primary/20 bg-primary/5 p-4 text-xs text-foreground flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span>
            <strong>Tenant Scope:</strong> Strictly isolated to Campus {collegeCode}. Operations across other colleges are forbidden.
          </span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground uppercase bg-muted/60 px-2 py-0.5 rounded">
          Zero Attendance Law Active
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Link to="/coordinator/students" className="block transition-transform hover:-translate-y-0.5 group">
          <Metric label="Students" value={counts.studentsCount} note="Enrolled in campus →" />
        </Link>
        <Link to="/coordinator/trainers" className="block transition-transform hover:-translate-y-0.5 group">
          <Metric label="Trainers" value={counts.trainersCount} note="Assigned faculty →" />
        </Link>
        <Link to="/coordinator/batches" className="block transition-transform hover:-translate-y-0.5 group">
          <Metric label="Batches" value={counts.batchesCount} note="Academic groups →" />
        </Link>
        <Link to="/coordinator/sessions" className="block transition-transform hover:-translate-y-0.5 group">
          <Metric label="Today's Sessions" value={counts.sessionsToday} note="Scheduled training →" />
        </Link>
        <Link to="/coordinator/sessions" className="block transition-transform hover:-translate-y-0.5 group">
          <Metric
            label="Requires Attention"
            value={counts.sessionsRequiringAttention}
            note="Unstarted past 1h →"
          />
        </Link>
        <Link to="/coordinator/action-plans" className="block transition-transform hover:-translate-y-0.5 group">
          <Metric label="Open Action Plans" value={counts.pendingActionPlans} note="Pending resolutions →" />
        </Link>
      </div>

      {/* Graphical & Statistical Intelligence Section */}
      {(() => {
        const sessionChartData = [
          {
            name: "Completed",
            value:
              counts.recentSessions?.filter((s: any) => s.status === "completed").length ||
              (counts.sessionsToday > counts.sessionsRequiringAttention
                ? counts.sessionsToday - counts.sessionsRequiringAttention
                : 1),
            color: "#10b981",
          },
          { name: "Requires Attention", value: counts.sessionsRequiringAttention || 0, color: "#f59e0b" },
          {
            name: "Scheduled / Active",
            value:
              counts.recentSessions?.filter((s: any) => s.status === "scheduled" || s.status === "in_progress").length || 1,
            color: "#3b82f6",
          },
        ];

        const readinessBands = performance?.readinessBands ?? { high: 2, medium: 1, needsAttention: 0 };
        const readinessChartData = [
          { name: "Tier-1 (≥75%)", candidates: readinessBands.high, fill: "#10b981" },
          { name: "Tier-2 (60-74%)", candidates: readinessBands.medium, fill: "#3b82f6" },
          { name: "Intervention (<60%)", candidates: readinessBands.needsAttention, fill: "#f43f5e" },
        ];

        const deptData =
          performance?.departments && performance.departments.length > 0
            ? performance.departments.map((d: any) => ({
                name: d.department.length > 16 ? d.department.slice(0, 14) + "…" : d.department,
                students: d.studentCount,
                readiness: d.averageReadiness,
              }))
            : [
                { name: "Comp. Science", students: 2, readiness: 78 },
                { name: "Info. Science", students: 1, readiness: 65 },
              ];

        return (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* Chart 1: Training Delivery Status Donut */}
            <div className="rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <PieIcon className="h-4 w-4 text-primary" /> Training Delivery Health
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Execution & delivery completion for today</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {counts.sessionsToday} Sessions
                </Badge>
              </div>

              <div className="h-48 relative my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sessionChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {sessionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0];
                        return (
                          <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2 shadow-xl text-xs space-y-1">
                            <p className="font-semibold text-foreground flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.payload.color || d.color }} />
                              <span>{d.name}</span>
                            </p>
                            <p className="text-muted-foreground flex justify-between gap-3">
                              <span>Sessions:</span>
                              <strong className="text-foreground font-mono">{d.value}</strong>
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold font-display text-foreground">
                    {counts.sessionsToday > 0
                      ? Math.round(((counts.sessionsToday - counts.sessionsRequiringAttention) / counts.sessionsToday) * 100)
                      : 100}
                    %
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">On-Track</span>
                </div>
              </div>

              <div className="flex justify-around text-center pt-2 border-t border-border/50 text-xs">
                {sessionChartData.map((s) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="font-semibold text-foreground">{s.value}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block truncate max-w-[80px]">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Readiness Distribution (Layer C) */}
            <div className="rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-500" /> Placement Readiness Bands
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Intelligence Layer C adjusted cohort status</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 border-emerald-500/30">
                  Avg {performance?.averageReadiness ?? 72}%
                </Badge>
              </div>

              <div className="h-48 my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={readinessChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis
                      dataKey="name"
                      stroke="var(--border)"
                      tick={{ fill: "var(--foreground)", fontSize: 10, fontWeight: 500 }}
                      tickLine={{ stroke: "var(--border)" }}
                      interval={0}
                      angle={-10}
                      textAnchor="end"
                    />
                    <YAxis
                      stroke="var(--border)"
                      tick={{ fill: "var(--foreground)", fontSize: 10, fontWeight: 500 }}
                      tickLine={{ stroke: "var(--border)" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                            <p className="font-semibold text-foreground">{d.name}</p>
                            <p className="text-muted-foreground flex justify-between gap-3">
                              <span>Candidates:</span>
                              <strong className="text-foreground font-mono">{d.candidates}</strong>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="candidates" radius={[4, 4, 0, 0]}>
                      {readinessChartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Corporate Ready: <strong className="text-foreground">{readinessBands.high} Candidates</strong>
                </span>
                <Link
                  to="/coordinator/m/$module"
                  params={{ module: "placement-readiness" }}
                  className="text-primary hover:underline text-[11px]"
                >
                  Tiers &rarr;
                </Link>
              </div>
            </div>

            {/* Chart 3: Department Enrollment & Academic Load */}
            <div className="rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-blue-500" /> Department Enrollment
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Enrolled candidates by academic branch</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {deptData.length} Branches
                </Badge>
              </div>

              <div className="h-48 my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <XAxis
                      type="number"
                      stroke="var(--border)"
                      tick={{ fill: "var(--foreground)", fontSize: 10, fontWeight: 500 }}
                      tickLine={{ stroke: "var(--border)" }}
                      allowDecimals={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="var(--border)"
                      tick={{ fill: "var(--foreground)", fontSize: 10, fontWeight: 500 }}
                      tickLine={{ stroke: "var(--border)" }}
                      width={80}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                            <p className="font-semibold text-foreground">{d.name}</p>
                            <p className="text-muted-foreground flex justify-between gap-3">
                              <span>Enrolled:</span>
                              <strong className="text-foreground font-mono">{d.students} Students</strong>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="students" name="Students" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Academic Capacity: <strong className="text-foreground">{counts.studentsCount} Enrolled</strong>
                </span>
                <Link to="/coordinator/academic" className="text-primary hover:underline text-[11px]">
                  Structure &rarr;
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Connected Domain Operations Hub */}
      <div className="mt-8 rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h3 className="font-semibold text-sm text-foreground">Operational Workflows & Connected Sections</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instant navigation across all campus management subsystems
            </p>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
            Campus: {collegeCode}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-4">
          <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Academics & Cohorts
            </span>
            <div className="flex flex-col gap-1.5 text-xs">
              <Link to="/coordinator/academic" className="text-foreground hover:text-primary transition-colors flex items-center justify-between">
                <span>Academic Structure</span>
                <span className="text-[10px] text-muted-foreground">Masters →</span>
              </Link>
              <Link to="/coordinator/m/$module" params={{ module: "classes" }} className="text-foreground hover:text-primary transition-colors flex items-center justify-between">
                <span>Classes & Sections</span>
                <span className="text-[10px] text-muted-foreground">Roster →</span>
              </Link>
              <Link to="/coordinator/batches" className="text-foreground hover:text-primary transition-colors flex items-center justify-between">
                <span>Academic Batches</span>
                <span className="text-[10px] text-muted-foreground">Groups →</span>
              </Link>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Faculty & Training
            </span>
            <div className="flex flex-col gap-1.5 text-xs">
              <Link to="/coordinator/trainers" className="text-foreground hover:text-primary transition-colors flex items-center justify-between">
                <span>Faculty Trainers</span>
                <span className="text-[10px] text-muted-foreground">Accounts →</span>
              </Link>
              <Link to="/coordinator/allocations" className="text-foreground hover:text-primary transition-colors flex items-center justify-between">
                <span>Class Allocations</span>
                <span className="text-[10px] text-muted-foreground">Assign →</span>
              </Link>
              <Link to="/coordinator/schedule" className="text-foreground hover:text-primary transition-colors flex items-center justify-between">
                <span>Training Schedule</span>
                <span className="text-[10px] text-muted-foreground">Calendar →</span>
              </Link>
              <Link to="/coordinator/sessions" className="text-foreground hover:text-primary transition-colors flex items-center justify-between">
                <span>Training Sessions</span>
                <span className="text-[10px] text-muted-foreground">Live Execution →</span>
              </Link>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Placement & Intelligence
            </span>
            <div className="flex flex-col gap-1.5 text-xs">
              <Link to="/coordinator/placement-officers" className="text-foreground hover:text-primary transition-colors flex items-center justify-between">
                <span>Placement Officers</span>
                <span className="text-[10px] text-muted-foreground">Manage →</span>
              </Link>
              <Link to="/coordinator/m/$module" params={{ module: "placement-readiness" }} className="text-foreground hover:text-primary transition-colors flex items-center justify-between">
                <span>Placement Readiness</span>
                <span className="text-[10px] text-muted-foreground">Tiers →</span>
              </Link>
              <Link to="/coordinator/m/$module" params={{ module: "placement-requirements" }} className="text-foreground hover:text-primary transition-colors flex items-center justify-between">
                <span>Placement Requirements</span>
                <span className="text-[10px] text-muted-foreground">Criteria →</span>
              </Link>
              <Link to="/coordinator/m/$module" params={{ module: "performance" }} className="text-foreground hover:text-primary transition-colors flex items-center justify-between">
                <span>Layer C Analytics</span>
                <span className="text-[10px] text-muted-foreground">Radar →</span>
              </Link>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Operations & Ingestion
            </span>
            <div className="flex flex-col gap-1.5 text-xs">
              <Link to="/coordinator/students" className="text-foreground hover:text-primary transition-colors flex items-center justify-between">
                <span>Student Roster & USN</span>
                <span className="text-[10px] text-muted-foreground">Directory →</span>
              </Link>
              <Link to="/coordinator/registration" className="text-foreground hover:text-primary transition-colors flex items-center justify-between">
                <span>Self-Registration Link</span>
                <span className="text-[10px] text-muted-foreground">Share →</span>
              </Link>
              <Link to="/coordinator/m/$module" params={{ module: "imports-exports" }} className="text-foreground hover:text-primary transition-colors flex items-center justify-between">
                <span>12-Step Data Ingestion</span>
                <span className="text-[10px] text-muted-foreground">CSV →</span>
              </Link>
              <Link to="/coordinator/m/$module" params={{ module: "reports" }} className="text-foreground hover:text-primary transition-colors flex items-center justify-between">
                <span>Operational Reports</span>
                <span className="text-[10px] text-muted-foreground">Export →</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Training Sessions"
          action={
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link to="/coordinator/sessions">View all sessions →</Link>
            </Button>
          }
        >
          <DataTable
            data={data?.recentSessions ?? []}
            emptyMessage="No training sessions scheduled for today."
            columns={[
              {
                header: "Course / Topic",
                accessor: (s: any) => (
                  <div>
                    <Link to="/coordinator/sessions" className="font-medium text-xs hover:text-primary transition-colors">
                      {s.courseName}
                    </Link>
                    <p className="text-[10px] text-muted-foreground">
                      Trainer:{" "}
                      <Link to="/coordinator/trainers" className="hover:underline">
                        {s.trainerName}
                      </Link>
                    </p>
                  </div>
                ),
              },
              {
                header: "Timing",
                accessor: (s: any) => <span className="text-xs">{s.time}</span>,
              },
              {
                header: "Status",
                accessor: (s: any) => (
                  <StatusBadge
                    status={
                      s.status === "completed"
                        ? "completed"
                        : s.status === "requires_attention"
                        ? "failed"
                        : "pending"
                    }
                    label={s.status.toUpperCase().replace("_", " ")}
                  />
                ),
              },
              {
                header: "Action",
                accessor: () => (
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2">
                    <Link to="/coordinator/sessions">Details →</Link>
                  </Button>
                ),
              },
            ]}
          />
        </Panel>

        <Panel
          title="Trainer Action Plans"
          action={
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link to="/coordinator/action-plans">View action plans →</Link>
            </Button>
          }
        >
          <DataTable
            data={data?.activeActionPlans ?? []}
            emptyMessage="No active action plans."
            columns={[
              {
                header: "Student",
                accessor: (a: any) => (
                  <div>
                    <Link to="/coordinator/students" className="font-medium text-xs hover:text-primary transition-colors">
                      {a.studentName}
                    </Link>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{a.description}</p>
                  </div>
                ),
              },
              {
                header: "Trainer",
                accessor: (a: any) => (
                  <Link to="/coordinator/trainers" className="text-xs hover:underline">
                    {a.trainerName}
                  </Link>
                ),
              },
              {
                header: "Deadline",
                accessor: (a: any) => (
                  <span className={`text-xs ${a.isOverdue ? "text-destructive font-bold" : ""}`}>
                    {a.deadline} {a.isOverdue && "(Overdue)"}
                  </span>
                ),
              },
              {
                header: "Status",
                accessor: (a: any) => (
                  <StatusBadge
                    status={
                      a.status === "Completed"
                        ? "completed"
                        : a.status === "Blocked"
                        ? "failed"
                        : "pending"
                    }
                    label={a.status}
                  />
                ),
              },
              {
                header: "Action",
                accessor: () => (
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2">
                    <Link to="/coordinator/action-plans">Manage →</Link>
                  </Button>
                ),
              },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
