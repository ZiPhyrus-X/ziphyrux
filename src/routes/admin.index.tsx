import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  LineChart,
  School,
  ShieldAlert,
  Sliders,
  TrendingUp,
} from "lucide-react";
import { COLLEGES, SIGNUPS, USERS } from "@/features/super-admin/mock-data";
import { Metric, PageHeader, Panel } from "@/features/super-admin/page";
import { StatusBadge } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollegeProgressDonutChart } from "@/components/charts/college-progress-donut";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Overview — Ziphyrus X Super Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const [data, setData] = useState<any>(null);
  const [intelligence, setIntelligence] = useState<any>(null);
  const [editorChanges, setEditorChanges] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.overview.get(),
      api.intelligence.getPlatform().catch(() => null),
      api.editorChanges.list().catch(() => []),
      api.overrides.list().catch(() => []),
    ])
      .then(([overviewRes, intelRes, changesRes, ovrRes]) => {
        if (active) {
          setData(overviewRes);
          setIntelligence(intelRes);
          if (Array.isArray(changesRes)) setEditorChanges(changesRes.slice(0, 5));
          if (Array.isArray(ovrRes)) setOverrides(ovrRes.slice(0, 4));
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const counts = data?.counts ?? {
    colleges: COLLEGES.length,
    activeColleges: COLLEGES.filter((c) => c.status === "active").length,
    students: USERS.filter((u) => u.role === "Student").length,
    trainers: USERS.filter((u) => u.role === "Trainer").length,
    coordinators: USERS.filter((u) => u.role === "Coordinator").length,
    failedJobs: 1,
  };

  const services = data?.services ?? [];
  const jobs = data?.jobs ?? [];
  const audit = data?.audit ?? [];
  const failed = counts.failedJobs;

  return (
    <>
      <PageHeader
        title="Super Admin Workspace Overview"
        desc="Global governance view across multi-tenant colleges, intelligence calculations, Editor lifecycle changes, and service health."
      />

      {/* Top Level Metric KPIs */}
      <div className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-6">
        <Metric
          label="Registered Colleges"
          value={counts.colleges}
          note={`${counts.activeColleges} active campuses`}
        />
        <Metric label="Student Accounts" value={counts.students} />
        <Metric label="Trainer Accounts" value={counts.trainers} />
        <Metric label="Coordinators" value={counts.coordinators} />
        <Metric
          label="Platform Readiness"
          value={`${intelligence?.averageReadiness ?? 76}%`}
          note="Intelligence engine benchmark"
        />
        <Metric
          label="Failed Jobs (24h)"
          value={<span className={failed ? "text-destructive font-semibold" : ""}>{failed}</span>}
        />
      </div>

      {/* Interactive College Progress Analytics Showcase (Section 7 & 9) */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Interactive College Progress & Readiness Analytics</h3>
            <p className="text-xs text-muted-foreground">Authoritative multi-tenant cohort partitioning computed by the Intelligence Engine.</p>
          </div>
          <Link to="/admin/intelligence" className="text-xs text-accent hover:underline flex items-center gap-1">
            Open Full Intelligence Hierarchy <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <CollegeProgressDonutChart
            title="Overall College Progress"
            scope="Platform Progress"
            centerLabel={`${intelligence?.totalStudents ?? 6}`}
            centerSublabel="Total Students"
            data={[
              { name: "Completed Diagnostics", value: intelligence?.readinessBands?.high ?? 3, color: "#10b981", description: "Cleared core CS diagnostics" },
              { name: "In Progress", value: intelligence?.readinessBands?.medium ?? 2, color: "#3b82f6", description: "Active coursework & assessments" },
              { name: "Requires Intervention", value: intelligence?.readinessBands?.needsAttention ?? 1, color: "#ef4444", description: "Action plan mandatory" },
            ]}
          />

          <CollegeProgressDonutChart
            title="Employability Readiness Bands"
            scope="Placement Readiness"
            centerLabel={`${intelligence?.averageReadiness ?? 76}%`}
            centerSublabel="Avg Readiness"
            data={[
              { name: "High Readiness (>=75%)", value: intelligence?.readinessBands?.high ?? 3, color: "#10b981", description: "Interview ready" },
              { name: "Moderate (60-74%)", value: intelligence?.readinessBands?.medium ?? 2, color: "#f59e0b", description: "Minor skill gap closure" },
              { name: "Intervention Required (<60%)", value: intelligence?.readinessBands?.needsAttention ?? 1, color: "#ef4444", description: "Under trainer intervention" },
            ]}
          />

          <CollegeProgressDonutChart
            title="Skill Competency Distribution"
            scope="Domain Benchmarks"
            centerLabel={`${intelligence?.technicalAvg ?? 79}%`}
            centerSublabel="Core Technical"
            data={[
              { name: "Technical Core", value: intelligence?.technicalAvg ?? 79, color: "#6366f1", description: "Data structures, algorithms & architecture" },
              { name: "Aptitude & Logic", value: intelligence?.aptitudeAvg ?? 72, color: "#8b5cf6", description: "Quantitative & logical problem solving" },
              { name: "Verbal & Communication", value: intelligence?.verbalAvg ?? 75, color: "#ec4899", description: "Professional communicative readiness" },
              { name: "Soft Skills", value: intelligence?.softSkillsAvg ?? 80, color: "#14b8a6", description: "Interpersonal & teamwork collaboration" },
              { name: "Coding Competency", value: intelligence?.codingAvg ?? 75, color: "#f97316", description: "Judge-verified algorithmic code execution" },
            ]}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Account Growth Area Chart */}
        <div className="xl:col-span-2">
          <Panel title="Account registration and cohort growth, last 12 months">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SIGNUPS}>
                  <CartesianGrid strokeDasharray="2 6" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Area dataKey="students" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={1.5} />
                  <Area dataKey="staff" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.08} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        {/* College Intelligence Snapshot */}
        <Panel
          title="Intelligence Highlights"
          action={
            <Link to="/admin/intelligence" className="text-xs text-accent hover:underline flex items-center gap-1">
              Full Drill-down <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Technical Skill Avg:</span>
              <span className="font-mono font-semibold text-chart-1">{intelligence?.technicalAvg ?? 79}%</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Aptitude & Logic Avg:</span>
              <span className="font-mono font-semibold text-chart-2">{intelligence?.aptitudeAvg ?? 72}%</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Coding Competency Avg:</span>
              <span className="font-mono font-semibold text-chart-5">{intelligence?.codingAvg ?? 75}%</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground">High Readiness Cohort:</span>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 text-xs font-mono">
                {intelligence?.readinessBands?.high ?? 3} students
              </Badge>
            </div>
          </div>
        </Panel>

        {/* Recent Editor Changes Stream */}
        <div className="xl:col-span-2">
          <Panel
            title="Recent Editor Modifications & Lifecycle Changes"
            action={
              <Link to="/admin/audit" className="text-xs text-accent hover:underline flex items-center gap-1">
                All Changes <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            {editorChanges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent editor modifications recorded.</p>
            ) : (
              <ul className="space-y-3">
                {editorChanges.map((chg) => (
                  <li
                    key={chg.id}
                    className="flex flex-col gap-1 rounded-md border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {chg.entityType?.replace("_", " ")}
                        </Badge>
                        <span className="font-medium text-foreground">{chg.entityTitle}</span>
                      </div>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        Action: <strong className="capitalize text-foreground">{chg.action}</strong> by{" "}
                        <span className="font-mono">{chg.editorLogin}</span>
                      </span>
                    </div>
                    <span className="shrink-0 text-muted-foreground font-mono text-[11px]">
                      {formatDistanceToNow(new Date(chg.timestamp))} ago
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Visible-Value Overrides Snapshot */}
        <Panel
          title="Visible-Value Overrides"
          action={
            <Link to="/admin/overrides" className="text-xs text-accent hover:underline flex items-center gap-1">
              Oversight <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active visible overrides.</p>
          ) : (
            <ul className="space-y-3 text-xs">
              {overrides.map((ovr) => (
                <li key={ovr.id} className="rounded border border-border/60 p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold">{ovr.entityId}</span>
                    <Badge variant="outline" className="text-[9px] capitalize">{ovr.fieldName}</Badge>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-muted-foreground">{ovr.actualValue}</span>
                    <span>→</span>
                    <span className="font-semibold text-accent">{ovr.visibleValue}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                    "{ovr.mandatoryReason}"
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Platform Health */}
        <Panel
          title="System Health"
          action={
            <Link to="/admin/oversight" className="text-xs text-accent hover:underline">
              Oversight details
            </Link>
          }
        >
          <ul className="space-y-3 text-sm">
            {services.map((s: any) => (
              <li key={s.id} className="flex items-center justify-between">
                <span>{s.name}</span>
                <StatusBadge s={s.status} />
              </li>
            ))}
          </ul>
        </Panel>

        {/* Background Jobs */}
        <Panel
          title="Background Jobs"
          action={
            <Link to="/admin/oversight" className="text-xs text-accent hover:underline">
              All jobs
            </Link>
          }
        >
          <ul className="space-y-3 text-sm">
            {jobs.slice(0, 5).map((j: any) => (
              <li key={j.id} className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-xs">{j.type}</span>
                <StatusBadge s={j.status} />
              </li>
            ))}
          </ul>
        </Panel>

        {/* Recent Platform Activity */}
        <Panel
          title="Recent Platform Activity"
          action={
            <Link to="/admin/audit" className="text-xs text-accent hover:underline">
              Full audit log
            </Link>
          }
        >
          <ul className="space-y-3 text-sm">
            {audit.slice(0, 5).map((a: any) => (
              <li key={a.id} className="flex justify-between gap-3 text-xs">
                <span>
                  <span className="font-mono font-medium">{a.action}</span>{" "}
                  <span className="text-muted-foreground">· {a.target}</span>
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {formatDistanceToNow(new Date(a.at))} ago
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
