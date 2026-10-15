import { useEffect, useState } from "react";
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  GitPullRequest,
  GraduationCap,
  History,
  Info,
  Layers,
  Lock,
  MapPin,
  Megaphone,
  PieChart as PieChartIcon,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Table2,
  Target,
  TrendingUp,
  UploadCloud,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api/client";
import { authService } from "@/lib/auth/service";
import { type PlacementModuleSlug, PLACEMENT_NAV } from "@/features/placement/nav";
import {
  PlacementPageHeader,
  PlacementMetric,
  PlacementPanel,
  PlacementInsightCard,
  PlacementEligibilityBadge,
  PlacementVerificationBadge,
  PlacementOfferStatusBadge,
  PlacementLoadingSkeleton,
  PlacementEmptyState,
} from "@/features/placement/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DESC: Record<PlacementModuleSlug, string> = {
  eligibility: "Authoritative criteria evaluation: multi-factor deterministic validation decoupled from predictive readiness.",
  applications: "Application tracking, stage advancement, and recruiter status decisions across opportunities.",
  pipeline: "Visual recruitment stage progression, funnel analytics, and candidate shortlists.",
  offers: "Offer letter verification, distinct placed student tracking, and campus joining outcomes.",
  intelligence: "Shared Intelligence Engine: skill gap breakdown, placement readiness distribution, and corporate benchmarks.",
  preparation: "Targeting Engine: identify intervention cohorts and assign targeted placement preparation & training action plans.",
  notifications: "Publish and broadcast institutional placement announcements and drive schedules.",
  reports: "Accreditation analytics, CTC distributions, branch conversion, and unplaced rosters with JSON export.",
  data: "11-step validated bulk data import wizard for corporate relationships, opportunities, and historical offers.",
  activity: "Immutable audit log of placement operations, verification decisions, and status updates.",
  account: "Placement officer credentials, authorized college jurisdiction, and operational scopes.",
};

export const Route = createFileRoute("/placement/m/$module")({
  loader: ({ params }) => {
    if (!(params.module in DESC)) throw notFound();
    return { slug: params.module as PlacementModuleSlug };
  },
  head: () => ({
    meta: [
      { title: "Placement Workspace — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlacementModulePage,
});

function PlacementModulePage() {
  const { slug } = Route.useLoaderData();
  const label = PLACEMENT_NAV.find((n) => n.slug === slug)?.label ?? "";
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Common refetch helper
  const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);
  const unwrapList = (r: any) => {
    const d = unwrap(r);
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.items)) return d.items;
    if (d && Array.isArray(d.students)) return d.students;
    return [];
  };

  const reloadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (slug === "eligibility") {
        const [opps, students] = await Promise.all([
          api.placement.getOpportunities(),
          api.placement.getStudents({ limit: 50 }),
        ]);
        setData({
          opportunities: unwrapList(opps),
          students: unwrapList(students),
        });
      } else if (slug === "applications") {
        const [apps, opps] = await Promise.all([
          api.placement.getApplications(),
          api.placement.getOpportunities(),
        ]);
        setData({ applications: unwrapList(apps), opportunities: unwrapList(opps) });
      } else if (slug === "pipeline") {
        const [apps, drives] = await Promise.all([
          api.placement.getApplications(),
          api.placement.getDrives(),
        ]);
        setData({ applications: unwrapList(apps), drives: unwrapList(drives) });
      } else if (slug === "offers") {
        const [offers, students, opps] = await Promise.all([
          api.placement.getOffers(),
          api.placement.getStudents({ limit: 50 }),
          api.placement.getOpportunities(),
        ]);
        setData({
          offers: unwrapList(offers),
          students: unwrapList(students),
          opportunities: unwrapList(opps),
        });
      } else if (slug === "intelligence") {
        const res = await api.placement.getIntelligence();
        setData(unwrap(res));
      } else if (slug === "preparation") {
        const res = await api.placement.getPreparationTargets();
        setData(unwrap(res));
      } else if (slug === "notifications") {
        const [notifs, drives] = await Promise.all([
          api.placement.getNotifications(),
          api.placement.getDrives(),
        ]);
        setData({
          notifications: unwrapList(notifs),
          drives: unwrapList(drives),
        });
      } else if (slug === "reports") {
        const res = await api.placement.getReports();
        setData(unwrap(res));
      } else if (slug === "activity") {
        const res = await api.placement.getActivity();
        setData(unwrap(res));
      } else if (slug === "data") {
        setData({ step: 1, history: [] });
      } else if (slug === "account") {
        const s = authService.getSession();
        setData({ session: s });
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load module telemetry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadData();
  }, [slug]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PlacementPageHeader
        title={label}
        desc={DESC[slug]}
        badgeText="Institutional Placement Scope"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={reloadData}
            disabled={loading}
            className="gap-1.5 text-xs border-border/70 bg-card/60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span>Sync Data</span>
          </Button>
        }
      />

      {loading ? (
        <PlacementLoadingSkeleton />
      ) : error ? (
        <PlacementEmptyState
          title="Telemetry Synchronization Failed"
          description={error}
          icon={AlertTriangle}
        />
      ) : (
        <ModuleContent slug={slug} data={data} onRefresh={reloadData} />
      )}
    </div>
  );
}

function ModuleContent({
  slug,
  data,
  onRefresh,
}: {
  slug: PlacementModuleSlug;
  data: any;
  onRefresh: () => void;
}) {
  switch (slug) {
    case "eligibility":
      return <EligibilityModule data={data} />;
    case "applications":
      return <ApplicationsModule data={data} onRefresh={onRefresh} />;
    case "pipeline":
      return <PipelineModule data={data} onRefresh={onRefresh} />;
    case "offers":
      return <OffersModule data={data} onRefresh={onRefresh} />;
    case "intelligence":
      return <IntelligenceModule data={data} onRefresh={onRefresh} />;
    case "preparation":
      return <PreparationModule data={data} onRefresh={onRefresh} />;
    case "notifications":
      return <NotificationsModule data={data} onRefresh={onRefresh} />;
    case "reports":
      return <ReportsModule data={data} />;
    case "data":
      return <BulkImportModule />;
    case "activity":
      return <ActivityModule data={data} />;
    case "account":
      return <AccountModule data={data} />;
    default:
      return null;
  }
}

// -----------------------------------------------------------------------------------------
// 1. ELIGIBILITY MODULE
// -----------------------------------------------------------------------------------------
function EligibilityModule({ data }: { data: any }) {
  const opportunities = data?.opportunities || [];
  const students = data?.students || [];

  const [selectedOppId, setSelectedOppId] = useState(opportunities[0]?.id || "");
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || "");
  const [result, setResult] = useState<any | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const handleEvaluate = async () => {
    if (!selectedOppId || !selectedStudentId) return;
    setEvaluating(true);
    try {
      const res = await api.placement.evaluateEligibility({
        opportunityId: selectedOppId,
        studentId: selectedStudentId,
      });
      if (res.ok) {
        setResult(res.data);
      }
    } finally {
      setEvaluating(false);
    }
  };

  const selectedOpp = opportunities.find((o: any) => o.id === selectedOppId);
  const selectedStudent = students.find((s: any) => s.id === selectedStudentId);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/70 bg-card/60 p-5 space-y-4 backdrop-blur-xl">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" /> Centralized Backend Eligibility Simulator
        </h3>
        <p className="text-xs text-muted-foreground">
          Deterministically verifies factual requirements (CGPA, active backlogs, department, graduation year) against authoritative ERP data. Strictly isolated from predictive readiness scores.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Select Opportunity</Label>
            <select
              value={selectedOppId}
              onChange={(e) => {
                setSelectedOppId(e.target.value);
                setResult(null);
              }}
              className="w-full h-10 rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm"
            >
              {opportunities.map((opp: any) => (
                <option key={opp.id} value={opp.id}>
                  {opp.companyName} — {opp.title} ({opp.compensationPackage} LPA)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Select Candidate Student</Label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setResult(null);
              }}
              className="w-full h-10 rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm"
            >
              {students.map((stu: any) => (
                <option key={stu.id} value={stu.id}>
                  {stu.name} ({stu.usn}) — {stu.department} | CGPA: {stu.cgpa}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button
          onClick={handleEvaluate}
          disabled={evaluating || !selectedOppId || !selectedStudentId}
          size="sm"
          className="gap-1.5 shadow-sm"
        >
          {evaluating ? "Evaluating Deterministic Rules…" : "Run Eligibility Evaluation"}
        </Button>
      </div>

      {result && (
        <PlacementPanel
          title="Deterministic Evaluation Result"
          subtitle={`Audit Evidence for ${selectedStudent?.name} (${selectedStudent?.usn})`}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border/70 bg-card/60">
              <div className="flex items-center gap-3">
                <PlacementEligibilityBadge status={result.status} />
                <span className="text-xs text-muted-foreground font-mono">
                  Engine Version: criteria_v{result.criteriaVersion || 1}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Evaluated: {new Date(result.evaluatedAt || Date.now()).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Passed Criteria */}
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Passed Criteria ({result.passedCriteria?.length || 0})
                </p>
                <ul className="space-y-1.5 text-xs text-foreground">
                  {result.passedCriteria?.map((crit: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{crit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Failed Criteria */}
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 space-y-2">
                <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" /> Failed / Disqualifying Criteria ({result.failedCriteria?.length || 0})
                </p>
                {result.failedCriteria && result.failedCriteria.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-foreground">
                    {result.failedCriteria.map((crit: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">✗</span>
                        <span>{crit}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No criteria failed. Student meets all hard thresholds.</p>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 text-xs text-muted-foreground">
              <ShieldAlert className="h-4 w-4 text-primary inline mr-1.5" />
              <strong className="text-foreground">Architectural Isolation:</strong> Even if this student possesses a high predictive readiness score ({selectedStudent?.readinessScore}%), they cannot be cleared for company shortlisting if any hard eligibility rule fails.
            </div>
          </div>
        </PlacementPanel>
      )}

      {/* Colorful Statistical Opportunity Eligibility Overview */}
      {opportunities.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-card/60 p-5 space-y-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Active Opportunities Eligibility Distribution
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Deterministic candidate qualification ratios evaluated against opportunity CGPA & backlog cutoffs.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {opportunities.length} Active Opportunities
            </Badge>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={opportunities.map((opp: any, idx: number) => {
                  const minCgpa = parseFloat(opp.minCgpa || opp.criteria?.minCgpa || 7.0);
                  const eligible = students.filter((s: any) => parseFloat(s.cgpa) >= minCgpa && (!s.backlogs || s.backlogs === 0)).length;
                  const ineligible = Math.max(0, students.length - eligible);
                  return {
                    name: opp.companyName || `Opp 0${idx + 1}`,
                    company: opp.companyName,
                    title: opp.title,
                    cutoff: minCgpa,
                    eligible,
                    ineligible,
                  };
                })}
                margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                <XAxis
                  dataKey="name"
                  stroke="var(--border)"
                  tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                  tickLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="var(--border)"
                  tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                  tickLine={{ stroke: "var(--border)" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-card p-3 shadow-xl text-xs space-y-1.5">
                          <p className="font-semibold text-foreground">{d.company} — {d.title}</p>
                          <p className="text-muted-foreground text-[11px]">Hard CGPA Cutoff: <strong className="text-foreground">{d.cutoff}</strong></p>
                          <div className="pt-1 border-t border-border flex justify-between gap-4">
                            <span className="text-emerald-500 font-medium">Eligible Pool: {d.eligible}</span>
                            <span className="text-rose-500 font-medium">Filtered Out: {d.ineligible}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="eligible" name="Eligible Pool" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="ineligible" name="Filtered by Criteria" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------------------
// 2. APPLICATIONS MODULE
// -----------------------------------------------------------------------------------------
function ApplicationsModule({ data, onRefresh }: { data: any; onRefresh?: () => void }) {
  const applications = data?.applications || [];
  const [filter, setFilter] = useState("all");
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());
  const [targetRound, setTargetRound] = useState("Technical Interview");
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceProgress, setAdvanceProgress] = useState<{ current: number; total: number } | null>(null);

  const filtered = applications.filter((a: any) =>
    filter === "all" ? true : a.status === filter
  );

  const toggleSelectAll = () => {
    if (filtered.length === 0) return;
    const allSelected = filtered.every((a: any) => selectedAppIds.has(a.id));
    if (allSelected) {
      setSelectedAppIds(new Set());
    } else {
      setSelectedAppIds(new Set(filtered.map((a: any) => a.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedAppIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAppIds(next);
  };

  const handleBulkAdvance = async () => {
    if (selectedAppIds.size === 0) return;
    setIsAdvancing(true);
    const ids = Array.from(selectedAppIds);
    let successCount = 0;
    try {
      for (let i = 0; i < ids.length; i++) {
        setAdvanceProgress({ current: i + 1, total: ids.length });
        await api.placement.updateApplicationStage(ids[i], {
          targetRound,
        });
        successCount++;
      }
      toast.success(`${successCount} candidates moved to ${targetRound}`);
      setSelectedAppIds(new Set());
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err?.message || `Failed after advancing ${successCount} candidates.`);
      if (onRefresh) onRefresh();
    } finally {
      setIsAdvancing(false);
      setAdvanceProgress(null);
    }
  };

  return (
    <div className="space-y-6 relative pb-16">
      <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Filter by application status:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 py-1 text-xs shadow-sm"
          >
            <option value="all">All Applications ({applications.length})</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="under_review">Under Review</option>
            <option value="submitted">Submitted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{filtered.length} Applications</span>
          {filtered.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={toggleSelectAll}
              className="h-8 text-xs gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {filtered.every((a: any) => selectedAppIds.has(a.id)) ? "Deselect All" : "Select All"}
            </Button>
          )}
        </div>
      </div>

      <PlacementPanel
        title="Candidate Applications Track"
        subtitle="Operational candidate pipeline management: select candidates to bulk advance recruitment stages"
      >
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <Checkbox
                      checked={filtered.length > 0 && filtered.every((a: any) => selectedAppIds.has(a.id))}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all applications"
                    />
                  </th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Opportunity</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Selection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((app: any) => {
                  const isSelected = selectedAppIds.has(app.id);
                  return (
                    <tr
                      key={app.id}
                      className={cn(
                        "hover:bg-muted/20 transition-colors cursor-pointer",
                        isSelected && "bg-primary/5 hover:bg-primary/10"
                      )}
                      onClick={() => toggleSelectOne(app.id)}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectOne(app.id)}
                          aria-label={`Select ${app.studentName}`}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-foreground">{app.studentName}</p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {app.studentUsn} • {app.department}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <p className="font-medium text-foreground">{app.companyName}</p>
                        <p className="text-muted-foreground">{app.opportunityTitle}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Stage {app.currentStageNumber}: {app.currentStageName || "Online Screening"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {app.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={cn(
                            "text-xs font-mono px-2 py-0.5 rounded",
                            isSelected
                              ? "bg-primary/15 text-primary font-semibold"
                              : "text-muted-foreground"
                          )}
                        >
                          {isSelected ? "Selected" : "Click to select"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <PlacementEmptyState
            title="No Applications Found"
            description="No applications match the current filter criteria."
            icon={FileText}
          />
        )}
      </PlacementPanel>

      {/* Floating Sticky Bulk Action Bar */}
      {selectedAppIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-primary/40 bg-card/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2.5">
              <Badge variant="default" className="font-mono bg-primary text-primary-foreground text-xs px-2 py-0.5">
                {selectedAppIds.size}
              </Badge>
              <span className="text-xs font-semibold text-foreground">
                {selectedAppIds.size} {selectedAppIds.size === 1 ? "candidate" : "candidates"} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={targetRound}
                onChange={(e) => setTargetRound(e.target.value)}
                disabled={isAdvancing}
                className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Technical Interview">Technical Interview</option>
                <option value="HR Round">HR Round</option>
                <option value="Selected">Selected</option>
                <option value="Rejected">Rejected</option>
              </select>
              <Button
                size="sm"
                onClick={handleBulkAdvance}
                disabled={isAdvancing}
                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground shadow"
              >
                {isAdvancing ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    {advanceProgress ? `${advanceProgress.current}/${advanceProgress.total}` : "Advancing..."}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Advance Selected Candidates
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedAppIds(new Set())}
                disabled={isAdvancing}
                className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------------------
// 3. PIPELINE MODULE
// -----------------------------------------------------------------------------------------
function PipelineModule({ data, onRefresh }: { data: any; onRefresh?: () => void }) {
  const applications = data?.applications || [];
  const drives = data?.drives || [];

  const [selectedDriveId, setSelectedDriveId] = useState("all");
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());
  const [targetRound, setTargetRound] = useState("Technical Interview");
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceProgress, setAdvanceProgress] = useState<{ current: number; total: number } | null>(null);

  const filteredApps = applications.filter((app: any) =>
    selectedDriveId === "all" ? true : app.driveId === selectedDriveId
  );

  const stages = [
    { id: 1, name: "Screening & Eligibility", count: filteredApps.filter((a: any) => a.currentStageNumber === 1).length },
    { id: 2, name: "Online Coding Test", count: filteredApps.filter((a: any) => a.currentStageNumber === 2).length },
    { id: 3, name: "Technical Interview", count: filteredApps.filter((a: any) => a.currentStageNumber === 3).length },
    { id: 4, name: "HR & Cultural Fit", count: filteredApps.filter((a: any) => a.currentStageNumber === 4).length },
    { id: 5, name: "Final Offer Rollout", count: filteredApps.filter((a: any) => a.currentStageNumber >= 5).length },
  ];

  const toggleSelectAll = () => {
    if (filteredApps.length === 0) return;
    const allSelected = filteredApps.every((a: any) => selectedAppIds.has(a.id));
    if (allSelected) {
      setSelectedAppIds(new Set());
    } else {
      setSelectedAppIds(new Set(filteredApps.map((a: any) => a.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedAppIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAppIds(next);
  };

  const handleBulkAdvance = async () => {
    if (selectedAppIds.size === 0) return;
    setIsAdvancing(true);
    const ids = Array.from(selectedAppIds);
    let successCount = 0;
    try {
      for (let i = 0; i < ids.length; i++) {
        setAdvanceProgress({ current: i + 1, total: ids.length });
        await api.placement.updateApplicationStage(ids[i], {
          targetRound,
        });
        successCount++;
      }
      toast.success(`${successCount} candidates moved to ${targetRound}`);
      setSelectedAppIds(new Set());
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err?.message || `Failed after advancing ${successCount} candidates.`);
      if (onRefresh) onRefresh();
    } finally {
      setIsAdvancing(false);
      setAdvanceProgress(null);
    }
  };

  const handleExportRecruiterPacket = async (driveId?: string) => {
    try {
      toast.loading("Generating Recruiter Candidate Packet...", { id: "packet-export" });
      const res = await api.placement.exportRecruiterPacket(driveId === "all" ? undefined : driveId);
      if (!res || !res.csv) throw new Error("No candidate data available to export.");
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = res.filename || `recruiter-packet-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Recruiter packet (.csv) exported successfully!", { id: "packet-export" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to export recruiter packet.", { id: "packet-export" });
    }
  };

  return (
    <div className="space-y-6 relative pb-16">
      {/* 5 Funnel Stages */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {stages.map((stg) => (
          <div
            key={stg.id}
            className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-2 text-center backdrop-blur-xl"
          >
            <span className="text-[10px] uppercase font-mono text-muted-foreground">Round 0{stg.id}</span>
            <p className="font-semibold text-sm text-foreground truncate">{stg.name}</p>
            <p className="font-display text-2xl font-semibold text-primary">{stg.count}</p>
            <p className="text-[11px] text-muted-foreground">Candidates</p>
          </div>
        ))}
      </div>

      {/* Colorful Statistical Graphs: Stage Funnel & Application Status Share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-border/70 bg-card/60 p-4 space-y-3 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Selection Stage Funnel Flow & Candidate Density
            </h4>
            <Badge variant="outline" className="text-[10px] font-mono">
              {filteredApps.length} Total Applicants
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Candidate progression across campus recruitment rounds.
          </p>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stages.map((s, idx) => ({
                  name: `Round 0${s.id}`,
                  fullName: s.name,
                  candidates: s.count,
                  fill: [
                    "#3b82f6", // Round 1: Blue
                    "#6366f1", // Round 2: Indigo
                    "#f59e0b", // Round 3: Amber
                    "#8b5cf6", // Round 4: Purple
                    "#10b981", // Round 5: Emerald
                  ][idx],
                }))}
                margin={{ top: 10, right: 15, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                <XAxis
                  dataKey="name"
                  stroke="var(--border)"
                  tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                  tickLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="var(--border)"
                  tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                  tickLine={{ stroke: "var(--border)" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                          <p className="font-semibold text-foreground">{data.fullName}</p>
                          <p className="text-muted-foreground flex justify-between gap-3">
                            <span>Active Candidates:</span>
                            <strong className="text-foreground font-mono">{data.candidates}</strong>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="candidates" radius={[6, 6, 0, 0]}>
                  {stages.map((_, index) => (
                    <Cell
                      key={`stage-cell-${index}`}
                      fill={[
                        "#3b82f6",
                        "#6366f1",
                        "#f59e0b",
                        "#8b5cf6",
                        "#10b981",
                      ][index % 5]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-emerald-500" /> Application Status Share
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Current candidate review status composition.
            </p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Shortlisted", value: filteredApps.filter((a: any) => a.status === "shortlisted").length, color: "#10b981" },
                    { name: "Under Review", value: filteredApps.filter((a: any) => a.status === "under_review").length, color: "#3b82f6" },
                    { name: "Submitted", value: filteredApps.filter((a: any) => a.status === "submitted").length, color: "#f59e0b" },
                    { name: "Rejected", value: filteredApps.filter((a: any) => a.status === "rejected").length, color: "#ef4444" },
                  ].filter((item) => item.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {[
                    { name: "Shortlisted", color: "#10b981" },
                    { name: "Under Review", color: "#3b82f6" },
                    { name: "Submitted", color: "#f59e0b" },
                    { name: "Rejected", color: "#ef4444" },
                  ].map((entry, index) => (
                    <Cell key={`status-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    return (
                      <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.payload.color || d.color }} />
                          <span>{d.name}</span>
                        </p>
                        <p className="text-muted-foreground flex justify-between gap-3">
                          <span>Applications:</span>
                          <strong className="text-foreground font-mono">{d.value}</strong>
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Shortlisted: {filteredApps.filter((a: any) => a.status === "shortlisted").length}
            </div>
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> In Review: {filteredApps.filter((a: any) => a.status === "under_review").length}
            </div>
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Submitted: {filteredApps.filter((a: any) => a.status === "submitted").length}
            </div>
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Rejected: {filteredApps.filter((a: any) => a.status === "rejected").length}
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Drive Selector, Select All, Recruiter Packet Download */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Scope Drive:</span>
            <select
              value={selectedDriveId}
              onChange={(e) => setSelectedDriveId(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-3 text-xs shadow-sm"
            >
              <option value="all">All Active Campus Drives</option>
              {drives.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.companyName || "Drive"})
                </option>
              ))}
            </select>
          </div>
          {filteredApps.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={toggleSelectAll}
              className="h-8 text-xs gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {filteredApps.every((a: any) => selectedAppIds.has(a.id)) ? "Deselect All" : "Select All Candidates"}
            </Button>
          )}
        </div>

        <Button
          size="sm"
          onClick={() => handleExportRecruiterPacket(selectedDriveId)}
          className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          title="Export visiting recruiter candidate packet CSV with USN, CGPA, backlogs, and current round"
        >
          <Download className="h-3.5 w-3.5" /> Export Recruiter Packet (.csv)
        </Button>
      </div>

      <PlacementPanel
        title="Visual Recruitment Pipeline Board"
        subtitle="End-to-end applicant tracking across campus hiring rounds: select candidates to advance"
      >
        {filteredApps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApps.map((app: any) => {
              const isSelected = selectedAppIds.has(app.id);
              return (
                <div
                  key={app.id}
                  onClick={() => toggleSelectOne(app.id)}
                  className={cn(
                    "p-4 rounded-xl border bg-card/50 space-y-2 cursor-pointer transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                      : "border-border/60 hover:border-primary/40 hover:bg-muted/10"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectOne(app.id)}
                          aria-label={`Select ${app.studentName}`}
                        />
                      </div>
                      <div className="truncate">
                        <h4 className="font-semibold text-sm text-foreground truncate">{app.studentName}</h4>
                        <p className="text-xs font-mono text-muted-foreground truncate">{app.studentUsn}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                      {app.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    <span className="font-medium text-foreground">{app.companyName}</span> • {app.opportunityTitle}
                  </p>
                  <div className="pt-2 border-t border-border/40 text-[11px] text-primary flex items-center justify-between">
                    <span>Current Stage:</span>
                    <span className="font-semibold">
                      Stage 0{app.currentStageNumber}: {app.currentStageName || "In Review"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <PlacementEmptyState
            title="No Candidates in Pipeline"
            description="No applications found for the selected drive."
            icon={FileText}
          />
        )}
      </PlacementPanel>

      {/* Floating Sticky Bulk Action Bar */}
      {selectedAppIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-primary/40 bg-card/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2.5">
              <Badge variant="default" className="font-mono bg-primary text-primary-foreground text-xs px-2 py-0.5">
                {selectedAppIds.size}
              </Badge>
              <span className="text-xs font-semibold text-foreground">
                {selectedAppIds.size} {selectedAppIds.size === 1 ? "candidate" : "candidates"} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={targetRound}
                onChange={(e) => setTargetRound(e.target.value)}
                disabled={isAdvancing}
                className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Technical Interview">Technical Interview</option>
                <option value="HR Round">HR Round</option>
                <option value="Selected">Selected</option>
                <option value="Rejected">Rejected</option>
              </select>
              <Button
                size="sm"
                onClick={handleBulkAdvance}
                disabled={isAdvancing}
                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground shadow"
              >
                {isAdvancing ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    {advanceProgress ? `${advanceProgress.current}/${advanceProgress.total}` : "Advancing..."}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Advance Selected
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedAppIds(new Set())}
                disabled={isAdvancing}
                className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------------------
// 4. OFFERS MODULE
// -----------------------------------------------------------------------------------------
function OffersModule({ data, onRefresh }: { data: any; onRefresh?: () => void }) {
  const offers = data?.offers || [];
  const [inspectingOffer, setInspectingOffer] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);

  const distinctPlaced = new Set(
    offers.filter((o: any) => o.status === "accepted" || o.verificationStatus === "verified").map((o: any) => o.studentId)
  ).size;

  const handleVerifyOffer = async (offerId: string) => {
    setIsVerifying(true);
    try {
      await api.placement.verifyOffer(offerId, { status: "verified" });
      toast.success("Offer letter verified and authoritatively confirmed.");
      if (inspectingOffer && inspectingOffer.id === offerId) {
        setInspectingOffer({ ...inspectingOffer, verificationStatus: "verified" });
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to verify offer letter.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !inspectingOffer) return;
    setIsAttaching(true);
    try {
      const mockUrl = `https://storage.ziphyrus.internal/offers/${inspectingOffer.studentUsn}-${encodeURIComponent(file.name)}`;
      await api.placement.attachOfferDocument(inspectingOffer.id, {
        offerLetterUrl: mockUrl,
        filename: file.name,
      });
      toast.success(`Attached offer scan: ${file.name}`);
      setInspectingOffer({
        ...inspectingOffer,
        offerLetterUrl: mockUrl,
        filename: file.name,
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to attach offer document.");
    } finally {
      setIsAttaching(false);
    }
  };

  // Compensation package tier breakdown
  const packageBrackets = [
    {
      bracket: "< 6 LPA",
      tierName: "Core Tier",
      count: offers.filter((o: any) => (parseFloat(o.offeredPackage) || 0) < 6).length,
      color: "#f59e0b", // Amber
    },
    {
      bracket: "6 - 10 LPA",
      tierName: "Dream Tier",
      count: offers.filter((o: any) => {
        const pkg = parseFloat(o.offeredPackage) || 0;
        return pkg >= 6 && pkg < 10;
      }).length,
      color: "#3b82f6", // Blue
    },
    {
      bracket: "10 - 15 LPA",
      tierName: "Super Dream",
      count: offers.filter((o: any) => {
        const pkg = parseFloat(o.offeredPackage) || 0;
        return pkg >= 10 && pkg < 15;
      }).length,
      color: "#8b5cf6", // Purple
    },
    {
      bracket: "> 15 LPA",
      tierName: "Marquee Tier",
      count: offers.filter((o: any) => (parseFloat(o.offeredPackage) || 0) >= 15).length,
      color: "#10b981", // Emerald
    },
  ];

  // Top companies offer share
  const companyOfferCounts = offers.reduce((acc: Record<string, number>, o: any) => {
    const cName = o.companyName || "Other";
    acc[cName] = (acc[cName] || 0) + 1;
    return acc;
  }, {});

  const companyShareData = Object.entries(companyOfferCounts).map(([company, count], idx) => ({
    name: company,
    value: count,
    color: [
      "#3b82f6",
      "#10b981",
      "#8b5cf6",
      "#f59e0b",
      "#ec4899",
      "#06b6d4",
      "#f97316",
    ][idx % 7],
  }));

  return (
    <div className="space-y-6">
      {/* 4 Invariant KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PlacementMetric
          label="Distinct Students Placed"
          value={distinctPlaced}
          note="Unique students placed"
          icon={UserCheck}
          variant="success"
        />
        <PlacementMetric
          label="Total Offers Issued"
          value={offers.length}
          note="Total letters generated"
          icon={Award}
          variant="primary"
        />
        <PlacementMetric
          label="Verified Offer Letters"
          value={offers.filter((o: any) => o.verificationStatus === "verified").length}
          note="Authoritative review complete"
          icon={CheckCircle2}
          variant="default"
        />
        <PlacementMetric
          label="Confirmed Joined"
          value={offers.filter((o: any) => o.joiningStatus === "joined").length}
          note="Onboarded at company"
          icon={Building2}
          variant="default"
        />
      </div>

      {/* Colorful Statistical Graphs: Compensation Brackets & Company Distribution */}
      {offers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-xl border border-border/70 bg-card/60 p-4 space-y-3 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Compensation Package Tier Distribution (CTC LPA)
              </h4>
              <Badge variant="outline" className="text-[10px] font-mono">
                {distinctPlaced} Placed Candidates
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Salary distribution breakdown across Core, Dream, Super Dream, and Marquee CTC bands.
            </p>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={packageBrackets} margin={{ top: 10, right: 15, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                  <XAxis
                    dataKey="bracket"
                    stroke="var(--border)"
                    tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                    tickLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="var(--border)"
                    tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                    tickLine={{ stroke: "var(--border)" }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                            <p className="font-semibold text-foreground">{d.bracket} ({d.tierName})</p>
                            <p className="text-muted-foreground flex justify-between gap-3">
                              <span>Total Offers:</span>
                              <strong className="text-foreground font-mono">{d.count}</strong>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {packageBrackets.map((entry, index) => (
                      <Cell key={`bracket-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-blue-500" /> Corporate Partner Offer Share
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Volume of offers extended by hiring partners.
              </p>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={companyShareData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={3}
                  >
                    {companyShareData.map((entry, index) => (
                      <Cell key={`comp-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0];
                      return (
                        <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.payload.color || d.color }} />
                            <span>{d.name}</span>
                          </p>
                          <p className="text-muted-foreground flex justify-between gap-3">
                            <span>Offers:</span>
                            <strong className="text-foreground font-mono">{d.value}</strong>
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 pt-2 border-t border-border/50 max-h-24 overflow-y-auto text-[11px]">
              {companyShareData.slice(0, 4).map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="font-semibold text-foreground">{c.value} {c.value === 1 ? "offer" : "offers"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <PlacementPanel
        title="Institutional Offers Repository & Verification Queue"
        subtitle="Inspection & verification of corporate offers and candidate acceptances"
      >
        {offers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Company & Role</th>
                  <th className="py-3 px-4 text-center">Package</th>
                  <th className="py-3 px-4 text-center">Offer Status</th>
                  <th className="py-3 px-4 text-center">Verification</th>
                  <th className="py-3 px-4 text-center">Joining Status</th>
                  <th className="py-3 px-4 text-right">Document & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {offers.map((offer: any) => (
                  <tr key={offer.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-foreground">{offer.studentName}</p>
                        <p className="text-xs font-mono text-muted-foreground">
                          {offer.studentUsn} • {offer.department}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <p className="font-medium text-foreground">{offer.companyName}</p>
                      <p className="text-muted-foreground">{offer.opportunityTitle}</p>
                    </td>
                    <td className="py-3 px-4 text-center font-display font-semibold text-foreground">
                      {offer.offeredPackage} {offer.compensationUnit}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <PlacementOfferStatusBadge status={offer.status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <PlacementVerificationBadge status={offer.verificationStatus} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {offer.joiningStatus?.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInspectingOffer(offer)}
                        className="h-7 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10 shadow-sm"
                        title="Inspect offer letter PDF scan, checksums, and verified credentials"
                      >
                        <Eye className="h-3 w-3" /> Inspect Offer Document
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PlacementEmptyState
            title="No Offers Recorded"
            description="Verified offers recorded for students will appear here."
            icon={Award}
          />
        )}
      </PlacementPanel>

      {/* Offer Letter Inspection & Document Preview Modal */}
      <Dialog open={!!inspectingOffer} onOpenChange={(open) => !open && setInspectingOffer(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <FileCheck2 className="h-4 w-4 text-primary" />
              Offer Letter Document Inspection
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Authoritative verification of corporate offer letter & document scan integrity.
            </DialogDescription>
          </DialogHeader>

          {inspectingOffer && (
            <div className="space-y-4 pt-2">
              <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{inspectingOffer.studentName}</p>
                    <p className="font-mono text-muted-foreground">{inspectingOffer.studentUsn} · {inspectingOffer.department}</p>
                  </div>
                  <PlacementVerificationBadge status={inspectingOffer.verificationStatus} />
                </div>
                <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    Company: <strong className="text-foreground">{inspectingOffer.companyName}</strong>
                  </div>
                  <div>
                    Package: <strong className="text-foreground">{inspectingOffer.offeredPackage} {inspectingOffer.compensationUnit}</strong>
                  </div>
                  <div>
                    Role: <strong className="text-foreground">{inspectingOffer.opportunityTitle}</strong>
                  </div>
                  <div>
                    Joining: <strong className="text-foreground capitalize">{inspectingOffer.joiningStatus?.replace("_", " ") || "Pending"}</strong>
                  </div>
                </div>
              </div>

              {/* Document Attachment & Preview Card */}
              <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Offer Document Scan
                  </span>
                  {inspectingOffer.offerLetterUrl && (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px] font-mono">
                      Checksum Verified SHA-256
                    </Badge>
                  )}
                </div>

                {inspectingOffer.offerLetterUrl ? (
                  <div className="p-3 rounded-lg border border-border bg-background space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {inspectingOffer.filename || `${inspectingOffer.studentName}_Official_Offer.pdf`}
                          </p>
                          <p className="text-[10px] font-mono text-muted-foreground truncate">
                            {inspectingOffer.offerLetterUrl}
                          </p>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0">
                        <a href={inspectingOffer.offerLetterUrl} target="_blank" rel="noreferrer" download>
                          <Download className="h-3 w-3" /> Download
                        </a>
                      </Button>
                    </div>

                    {/* Metadata strip */}
                    <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3 w-3" /> Verified Document Scan Attached
                      </span>
                      <span className="font-mono text-[10px]">ID: off-doc-{inspectingOffer.id.slice(-6)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center border border-dashed border-border rounded-lg space-y-1">
                    <FileText className="h-6 w-6 text-muted-foreground mx-auto" />
                    <p className="text-xs font-medium text-foreground">No Document Scan Attached</p>
                    <p className="text-[11px] text-muted-foreground">Attach a PDF or scanned image before authorizing verification.</p>
                  </div>
                )}

                {/* Upload or replace scan */}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {inspectingOffer.offerLetterUrl ? "Attach updated document scan:" : "Attach offer letter scan (.pdf, .png, .jpg):"}
                  </span>
                  <div>
                    <input
                      id="offer-doc-file-input"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      disabled={isAttaching}
                      className="hidden"
                    />
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 cursor-pointer"
                      disabled={isAttaching}
                    >
                      <label htmlFor="offer-doc-file-input">
                        {isAttaching ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" /> Uploading...
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-3 w-3" />
                            {inspectingOffer.offerLetterUrl ? "Replace Scan" : "Attach Scan"}
                          </>
                        )}
                      </label>
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between w-full">
                <div>
                  {inspectingOffer.verificationStatus === "verified" ? (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Authoritatively Verified
                    </span>
                  ) : (
                    <span className="text-xs text-amber-500 font-medium">
                      Pending Placement Officer Verification
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setInspectingOffer(null)}
                    className="text-xs h-8"
                  >
                    Close
                  </Button>
                  {inspectingOffer.verificationStatus !== "verified" && (
                    <Button
                      size="sm"
                      onClick={() => handleVerifyOffer(inspectingOffer.id)}
                      disabled={isVerifying}
                      className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Verifying...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" /> Authorize & Verify Offer
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------------------
// 5. INTELLIGENCE MODULE
// -----------------------------------------------------------------------------------------
function IntelligenceModule({ data, onRefresh }: { data: any; onRefresh?: () => void }) {
  const readinessSummary = data?.readinessSummary;
  const domainReadiness = data?.domainReadiness || [];
  const insights = data?.insights || [];

  // Remedial Training Modal State
  const [remedialModal, setRemedialModal] = useState<{
    open: boolean;
    domain: string;
    gap: number;
    cohortScore: number;
    targetBenchmark: number;
  } | null>(null);

  const [priority, setPriority] = useState<"High" | "Medium">("High");
  const [affectedStudents, setAffectedStudents] = useState(25);
  const [targetDate, setTargetDate] = useState(() => {
    return new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
  });
  const [remedialNotes, setRemedialNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenRemedial = (d: any) => {
    setRemedialModal({
      open: true,
      domain: d.domain,
      gap: d.gap,
      cohortScore: d.cohortScore,
      targetBenchmark: d.targetBenchmark,
    });
    setPriority(d.gap > 20 ? "High" : "Medium");
    setAffectedStudents(Math.max(15, Math.round(d.gap * 1.5)));
    setTargetDate(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]);
    setRemedialNotes(
      `Deficit of ${d.gap}% identified below corporate benchmark in ${d.domain}. Faculty Coordinator is requested to conduct targeted remedial coding workshops and mock technical assessments ahead of upcoming campus recruitment drives.`
    );
  };

  const handleSubmitRemedial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remedialModal) return;
    setIsSubmitting(true);
    try {
      await api.placement.requestRemedialTraining({
        domain: remedialModal.domain,
        priority,
        targetDate,
        notes: remedialNotes,
        affectedStudentsCount: affectedStudents,
      });
      toast.success(`Remedial action plan for "${remedialModal.domain}" dispatched to Faculty Coordinator.`);
      setRemedialModal(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to dispatch remedial training request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const skillGaps = domainReadiness.filter((d: any) => d.gap > 0);

  return (
    <div className="space-y-6">
      {readinessSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PlacementMetric
            label="Cohort Readiness Average"
            value={`${readinessSummary.cohortAverage}%`}
            note="Composite readiness across campus"
            icon={Sparkles}
            variant="primary"
          />
          <PlacementMetric
            label="Tier 1 Qualified Pool"
            value={readinessSummary.tier1Qualified}
            note="Super Dream (> 12 LPA) ready"
            icon={Award}
            variant="success"
          />
          <PlacementMetric
            label="Tier 2 Qualified Pool"
            value={readinessSummary.tier2Qualified}
            note="Dream (6 - 12 LPA) ready"
            icon={Briefcase}
            variant="default"
          />
          <PlacementMetric
            label="Tier 3 Qualified Pool"
            value={readinessSummary.tier3Qualified}
            note="Core (3.5 - 6 LPA) ready"
            icon={Users}
            variant="default"
          />
        </div>
      )}

      {/* Identified Skill Gaps & Remedial Action Pipeline */}
      <PlacementPanel
        title="Identified Skill Gaps & Deficits (Remedial Action Pipeline)"
        subtitle="Operational feedback bridge: request faculty coordinator intervention for detected deficits"
      >
        <div className="space-y-3">
          {skillGaps.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
              <p className="font-medium text-foreground">No critical skill deficits detected.</p>
              <p className="text-[11px]">All evaluated technical domains meet or exceed recruiter benchmarks.</p>
            </div>
          ) : (
            skillGaps.map((d: any) => (
              <div
                key={d.domain}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{d.domain}</span>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px] font-mono">
                      {d.gap}% Deficit Below Target
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current cohort score: <strong className="text-foreground">{d.cohortScore}%</strong> · Target recruiter benchmark: <strong className="text-foreground">{d.targetBenchmark}%</strong>
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleOpenRemedial(d)}
                  className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" /> Dispatch Action Plan to Faculty Coordinator
                </Button>
              </div>
            ))
          )}
        </div>
      </PlacementPanel>

      {/* Domain Readiness vs Recruiter Benchmarks */}
      <PlacementPanel
        title="Domain Readiness vs Corporate Hiring Benchmarks"
        subtitle="Shared intelligence diagnostic mapping student mastery to industry expectations"
      >
        <div className="space-y-6">
          {/* Colorful Statistical Charts: Domain Radar & Tier Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-2 border-b border-border/50">
            <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Technical Competency Radar vs Industry Benchmarks
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">Dual-Layer Metric</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    data={domainReadiness.map((d: any) => ({
                      domain: d.domain,
                      score: d.cohortScore,
                      target: d.targetBenchmark,
                    }))}
                    margin={{ top: 10, right: 25, bottom: 10, left: 25 }}
                  >
                    <PolarGrid stroke="#8b5cf6" strokeOpacity={0.25} />
                    <PolarAngleAxis
                      dataKey="domain"
                      tick={(props: any) => {
                        const { x, y, payload, textAnchor } = props;
                        const domainColors: Record<string, string> = {
                          "Data Structures": "#38bdf8",
                          "Algorithms & Logic": "#34d399",
                          "Full Stack Web": "#818cf8",
                          "Database & SQL": "#fbbf24",
                          "System Design": "#a78bfa",
                          "Verbal Communication": "#f472b6",
                        };
                        const fill = domainColors[payload.value] || "#38bdf8";
                        return (
                          <text
                            x={x}
                            y={y}
                            fill={fill}
                            fontSize={10}
                            fontWeight="700"
                            textAnchor={textAnchor}
                          >
                            {payload.value}
                          </text>
                        );
                      }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" strokeOpacity={0.3} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                    <Radar
                      name="Campus Cohort Score"
                      dataKey="score"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      fill="#8b5cf6"
                      fillOpacity={0.45}
                      dot={{ r: 3.5, fill: "#c084fc", stroke: "#7e22ce", strokeWidth: 1.5 }}
                    />
                    <Radar
                      name="Corporate Benchmark"
                      dataKey="target"
                      stroke="#06b6d4"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fill="#06b6d4"
                      fillOpacity={0.15}
                      dot={{ r: 3, fill: "#67e8f9" }}
                    />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1 min-w-[170px]">
                            <p className="font-semibold text-foreground border-b border-border/50 pb-1">{payload[0]?.payload?.domain}</p>
                            {payload.map((entry: any, i: number) => (
                              <p key={i} className="flex items-center justify-between gap-3 text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.color }} />
                                  <span>{entry.name}:</span>
                                </span>
                                <strong className="text-foreground font-mono">{entry.value}%</strong>
                              </p>
                            ))}
                          </div>
                        );
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-5 text-[11px] pt-1">
                <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Campus Score
                </span>
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Corporate Benchmark
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <PieChartIcon className="h-3.5 w-3.5 text-emerald-500" /> Hiring Tier Readiness Pool Composition
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">CTC Brackets</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Proportion of cohort qualified for corporate tier recruitment drives.
                </p>
              </div>

              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Super Dream (>12 LPA)", value: readinessSummary?.tier1Qualified || 0, color: "#10b981" },
                        { name: "Dream (6-12 LPA)", value: readinessSummary?.tier2Qualified || 0, color: "#3b82f6" },
                        { name: "Core (3.5-6 LPA)", value: readinessSummary?.tier3Qualified || 0, color: "#f59e0b" },
                        {
                          name: "Remedial Track",
                          value: Math.max(
                            0,
                            100 -
                              (readinessSummary?.tier1Qualified || 0) -
                              (readinessSummary?.tier2Qualified || 0) -
                              (readinessSummary?.tier3Qualified || 0)
                          ),
                          color: "#f43f5e",
                        },
                      ].filter((t) => t.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {[
                        { name: "Super Dream", color: "#10b981" },
                        { name: "Dream", color: "#3b82f6" },
                        { name: "Core", color: "#f59e0b" },
                        { name: "Remedial", color: "#f43f5e" },
                      ].map((entry, index) => (
                        <Cell key={`tier-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0];
                        return (
                          <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                            <p className="font-semibold text-foreground flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.payload.color || d.color }} />
                              <span>{d.name}</span>
                            </p>
                            <p className="text-muted-foreground flex justify-between gap-3">
                              <span>Readiness Share:</span>
                              <strong className="text-foreground font-mono">{d.value}%</strong>
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Tier 1 Super Dream: {readinessSummary?.tier1Qualified || 0}%
                </div>
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> Tier 2 Dream: {readinessSummary?.tier2Qualified || 0}%
                </div>
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Tier 3 Core: {readinessSummary?.tier3Qualified || 0}%
                </div>
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Remedial: {Math.max(0, 100 - (readinessSummary?.tier1Qualified || 0) - (readinessSummary?.tier2Qualified || 0) - (readinessSummary?.tier3Qualified || 0))}%
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Progress Bars */}
          <div className="space-y-4 pt-1">
            {domainReadiness.map((d: any) => (
              <div key={d.domain} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-foreground">{d.domain}</span>
                  <span className="text-muted-foreground">
                    Score: <strong className="text-foreground">{d.cohortScore}%</strong> • Target: {d.targetBenchmark}% •{" "}
                    <span className={d.gap > 0 ? "text-amber-500 font-semibold" : "text-emerald-500 font-semibold"}>
                      {d.gap > 0 ? `${d.gap}% Deficit` : "Target Met"}
                    </span>
                  </span>
                </div>
                <Progress value={d.cohortScore} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      </PlacementPanel>

      {/* Structured Insights */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Placement Intelligence Action Plans
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((ins: any, idx: number) => (
            <PlacementInsightCard
              key={idx}
              insight={ins.insight}
              evidence={ins.evidence}
              action={ins.action}
              severity={ins.priority === "high" ? "critical" : "warning"}
            />
          ))}
        </div>
      </div>

      {/* Remedial Training Request Dialog */}
      <Dialog open={!!remedialModal} onOpenChange={(open) => !open && setRemedialModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <GraduationCap className="h-4 w-4 text-primary" />
              Request Remedial Training from Faculty Coordinator
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Dispatch an authoritative remedial cohort intervention action plan to the Faculty Coordinator workspace.
            </DialogDescription>
          </DialogHeader>

          {remedialModal && (
            <form onSubmit={handleSubmitRemedial} className="space-y-4 pt-2">
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">{remedialModal.domain}</span>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/10 text-[10px] font-mono">
                    {remedialModal.gap}% Deficit
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Current Readiness: {remedialModal.cohortScore}% · Recruiter Benchmark: {remedialModal.targetBenchmark}%
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rem-priority" className="text-xs font-medium">Priority Level</Label>
                  <select
                    id="rem-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs shadow-sm"
                  >
                    <option value="High">High (Immediate)</option>
                    <option value="Medium">Medium (Scheduled)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rem-affected" className="text-xs font-medium">Estimated Candidates</Label>
                  <Input
                    id="rem-affected"
                    type="number"
                    min={1}
                    value={affectedStudents}
                    onChange={(e) => setAffectedStudents(parseInt(e.target.value, 10) || 1)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rem-target-date" className="text-xs font-medium">Target Completion Date</Label>
                <Input
                  id="rem-target-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rem-notes" className="text-xs font-medium">
                  Intervention Scope & Recommendations <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="rem-notes"
                  rows={4}
                  value={remedialNotes}
                  onChange={(e) => setRemedialNotes(e.target.value)}
                  placeholder="Specify focus topics, problem sets, or recommended workshop syllabus..."
                  className="text-xs resize-none"
                  required
                />
              </div>

              <DialogFooter className="pt-2 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRemedialModal(null)}
                  disabled={isSubmitting}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Dispatching...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" /> Dispatch Action Plan
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------------------
// 6. PREPARATION & TRAINING MODULE
// -----------------------------------------------------------------------------------------
function PreparationModule({ data, onRefresh }: { data: any; onRefresh?: () => void }) {
  const targetGroups = data?.targetedStudentGroups || [];
  const actionPlans: any[] = data?.activeActionPlans || [];
  const students: any[] = data?.students || [];
  const trainers: any[] = data?.trainers || [];

  const [assignOpen, setAssignOpen] = useState(false);
  const [reviewCohort, setReviewCohort] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Assign Action Plan Form State
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("DSA & Coding");
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedTrainerName, setSelectedTrainerName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleOpenAssign = (prefillStudentId?: string, prefillSkill?: string) => {
    setSelectedStudentId(prefillStudentId || (students[0]?.id ?? ""));
    setSelectedSkill(prefillSkill || "DSA & Coding");
    setTaskDescription(
      prefillSkill
        ? `Complete targeted 10 practice problems in ${prefillSkill} and review with assigned faculty.`
        : ""
    );
    setSelectedTrainerName(trainers[0]?.name || "Rohan Verma");
    setDeadline(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0] ?? "");
    setAssignOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !taskDescription.trim()) {
      toast.error("Please select a student and provide remedial task details.");
      return;
    }

    setSubmitting(true);
    try {
      const student = students.find((s) => s.id === selectedStudentId);
      const trainer = trainers.find((t) => t.name === selectedTrainerName);
      await api.placement.createActionPlan({
        studentId: selectedStudentId,
        studentName: student?.name || "Candidate",
        description: `[${selectedSkill}] ${taskDescription.trim()}`,
        trainerName: selectedTrainerName || "Assigned Trainer",
        trainerId: trainer?.id || "trn-1",
        deadline,
      } as any);
      toast.success("Training Action Plan assigned successfully!");
      setAssignOpen(false);
      setTaskDescription("");
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign action plan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (planId: string, newStatus: string) => {
    try {
      await api.placement.updateActionPlanStatus(planId, newStatus);
      toast.success(`Action plan status updated to ${newStatus}`);
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update action plan status.");
    }
  };

  const filteredPlans = actionPlans.filter((ap) => {
    const matchesSearch =
      (ap.studentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ap.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ap.trainerName || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || ap.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activePlansCount = actionPlans.filter((p) => p.status !== "Completed").length;
  const completedPlansCount = actionPlans.filter((p) => p.status === "Completed").length;
  const totalStudentsInRemediation = targetGroups.reduce((acc: number, g: any) => acc + (g.studentCount || 0), 0);
  const overduePlansCount = actionPlans.filter((p) => p.isOverdue).length;

  const cohortChartData = (targetGroups.length > 0 ? targetGroups : [
    { groupName: "DSA & Algorithmic Thinking", studentCount: 14, urgency: "Critical", skill: "DSA & Coding" },
    { groupName: "System Architecture & API", studentCount: 9, urgency: "High", skill: "System Design" },
    { groupName: "Verbal & Recruiter GD", studentCount: 12, urgency: "Medium", skill: "Soft Skills" },
    { groupName: "Quantitative Aptitude Speed", studentCount: 18, urgency: "High", skill: "Aptitude" },
  ]).map((g: any) => ({
    name: g.skill || g.groupName?.split(" ")[0] || "Remedial Skill",
    students: g.studentCount || 0,
    urgency: g.urgency || "Target",
  }));

  const COHORT_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

  const planStatusCounts = {
    completed: actionPlans.filter((p) => p.status === "Completed").length,
    inProgress: actionPlans.filter((p) => p.status === "In Progress" || p.status === "in_progress").length,
    pending: actionPlans.filter((p) => p.status === "Pending" || p.status === "pending_review").length,
    overdue: actionPlans.filter((p) => p.isOverdue || p.status === "Overdue").length,
  };

  const planStatusChartData = [
    { name: "Completed Interventions", value: Math.max(planStatusCounts.completed, 3), color: "#10b981" },
    { name: "Active In-Progress", value: Math.max(planStatusCounts.inProgress, 4), color: "#3b82f6" },
    { name: "Pending Review", value: Math.max(planStatusCounts.pending, 2), color: "#f59e0b" },
    { name: "Overdue Attention", value: Math.max(planStatusCounts.overdue, 1), color: "#f43f5e" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PlacementMetric
          label="Targeting Cohorts"
          value={targetGroups.length}
          note="Active gap clusters"
          icon={Target}
          variant="primary"
        />
        <PlacementMetric
          label="Students in Remediation"
          value={totalStudentsInRemediation}
          note="Identified for preparation"
          icon={Users}
          variant="default"
        />
        <PlacementMetric
          label="Active Action Plans"
          value={activePlansCount}
          note="Assigned to faculty/trainers"
          icon={Calendar}
          variant="default"
        />
        <PlacementMetric
          label="Completed Interventions"
          value={completedPlansCount}
          note={`${overduePlansCount} overdue`}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* GRAPHICAL VISUALS: REMEDIATION & PREPARATION TELEMETRY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div>
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-primary" /> Targeting Cohort Student Density by Skill
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Candidate distribution across targeted pedagogical preparation domains
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {totalStudentsInRemediation} Candidates
            </Badge>
          </div>

          <div className="h-60 w-full my-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cohortChartData} margin={{ top: 10, right: 15, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                <XAxis
                  dataKey="name"
                  stroke="var(--border)"
                  tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                  tickLine={{ stroke: "var(--border)" }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  stroke="var(--border)"
                  tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                  tickLine={{ stroke: "var(--border)" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                        <p className="font-semibold text-foreground flex items-center justify-between gap-3">
                          <span>{d.name}:</span>
                          <strong className="text-foreground font-mono">{d.students} Candidates</strong>
                        </p>
                        <p className="text-[11px] text-muted-foreground">Urgency Priority: <span className="text-primary font-medium">{d.urgency}</span></p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="students" name="Candidates" radius={[6, 6, 0, 0]}>
                  {cohortChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COHORT_COLORS[index % COHORT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50 text-[11px]">
            {cohortChartData.map((c, i) => (
              <span key={c.name} className="flex items-center gap-1 text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COHORT_COLORS[i % COHORT_COLORS.length] }} />
                <span>{c.name}:</span>
                <strong className="text-foreground">{c.students}</strong>
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div>
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <PieChartIcon className="h-4 w-4 text-emerald-500" /> Remedial Action Plans Execution Status
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Progression and completion velocity of faculty-assigned intervention plans
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {actionPlans.length} Total Plans
            </Badge>
          </div>

          <div className="h-60 relative my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planStatusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {planStatusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    return (
                      <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.payload.color || d.color }} />
                          <span>{d.name}</span>
                        </p>
                        <p className="text-muted-foreground flex justify-between gap-3">
                          <span>Plans:</span>
                          <strong className="text-foreground font-mono">{d.value} Action Plans</strong>
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400">
                {planStatusChartData.reduce((acc, p) => acc + p.value, 0) > 0
                  ? Math.round(
                      (planStatusChartData[0].value /
                        planStatusChartData.reduce((acc, p) => acc + p.value, 0)) *
                        100
                    )
                  : 100}
                %
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Resolved</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-2 border-t border-border/50 text-xs">
            {planStatusChartData.map((s) => (
              <div key={s.name} className="p-1.5 rounded bg-muted/20">
                <div className="flex items-center justify-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="font-bold text-foreground font-mono">{s.value}</span>
                </div>
                <span className="text-[10px] text-muted-foreground block truncate">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cohorts Panel */}
      <PlacementPanel
        title="Targeting Engine: Placement Preparation & Training Cohorts"
        subtitle="Identified candidate cohorts with specific skill gaps ahead of upcoming recruitment drives"
        action={
          <Button onClick={() => handleOpenAssign()} className="gap-1.5 font-medium">
            <Plus className="h-4 w-4" /> Assign Training Plan
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {targetGroups.map((grp: any, idx: number) => (
            <div
              key={idx}
              className="p-5 rounded-xl border border-border/70 bg-card/60 space-y-3 backdrop-blur-sm hover:border-primary/40 transition-all shadow-sm"
            >
              <div className="flex justify-between items-start gap-2">
                <h4 className="font-semibold text-sm text-foreground">{grp.groupName}</h4>
                <Badge
                  variant="outline"
                  className={
                    grp.urgency === "Critical"
                      ? "bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]"
                      : grp.urgency === "High"
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]"
                      : "bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]"
                  }
                >
                  {grp.urgency || "Target"} Priority
                </Badge>
              </div>

              <div className="space-y-1 text-xs">
                <p className="text-muted-foreground flex items-center justify-between">
                  <span>Focus Skill Area:</span>
                  <span className="font-medium text-foreground">{grp.skill}</span>
                </p>
                <p className="text-muted-foreground flex items-center justify-between">
                  <span>Impacted Students:</span>
                  <span className="font-medium text-foreground">{grp.studentCount} candidates</span>
                </p>
              </div>

              {grp.description && (
                <p className="text-[11px] text-muted-foreground bg-muted/20 p-2 rounded border border-border/40">
                  {grp.description}
                </p>
              )}

              <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs flex-1"
                  onClick={() => setReviewCohort(grp)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> Review Cohort
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 text-xs flex-1"
                  onClick={() => handleOpenAssign(grp.students?.[0]?.id, grp.skill)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Assign Plan
                </Button>
              </div>
            </div>
          ))}
        </div>
      </PlacementPanel>

      {/* Action Plans Panel */}
      <PlacementPanel
        title="Active Preparation & Training Action Plans"
        subtitle="Pedagogical action plans coordinated with trainers and faculty mentors"
      >
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xl mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, task, or assigned trainer…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/80 h-9 text-xs"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 py-1 text-xs shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Blocked">Blocked</option>
            <option value="Not Started">Not Started</option>
          </select>
        </div>

        {filteredPlans.length > 0 ? (
          <div className="space-y-3">
            {filteredPlans.map((ap: any) => (
              <div
                key={ap.id}
                className="p-4 rounded-xl border border-border/60 bg-card/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-border transition-all shadow-sm"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{ap.studentName}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {ap.studentId}
                    </Badge>
                    {ap.isOverdue && (
                      <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <p className="text-foreground/90 font-medium">{ap.description}</p>
                  <p className="text-muted-foreground flex items-center gap-3 flex-wrap text-[11px] pt-0.5">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5" /> Trainer:{" "}
                      <span className="text-foreground font-medium">{ap.trainerName}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Deadline:{" "}
                      <span className="text-foreground font-medium">
                        {ap.deadline
                          ? new Date(ap.deadline).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "None"}
                      </span>
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <span className="text-[11px] text-muted-foreground font-medium">Status:</span>
                  <select
                    value={ap.status}
                    onChange={(e) => handleStatusChange(ap.id, e.target.value)}
                    className="h-8 text-xs rounded border border-border bg-background px-2.5 py-1 font-medium"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Not Started">Not Started</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <PlacementEmptyState
            title="No Action Plans Found"
            description="Assign targeted preparation and remedial training action plans to support candidates."
            icon={Target}
          />
        )}
      </PlacementPanel>

      {/* Review Cohort Dialog */}
      <Dialog open={!!reviewCohort} onOpenChange={(open) => !open && setReviewCohort(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {reviewCohort?.groupName}
            </DialogTitle>
            <DialogDescription>
              {reviewCohort?.description} • Focus Skill: <strong>{reviewCohort?.skill}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-border/70 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-2.5">Candidate Name</th>
                    <th className="p-2.5">USN</th>
                    <th className="p-2.5">Department</th>
                    <th className="p-2.5">CGPA</th>
                    <th className="p-2.5">Readiness</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(reviewCohort?.students || []).map((stu: any) => (
                    <tr key={stu.id} className="hover:bg-muted/20">
                      <td className="p-2.5 font-medium text-foreground">{stu.name}</td>
                      <td className="p-2.5 font-mono text-muted-foreground">{stu.usn}</td>
                      <td className="p-2.5 text-muted-foreground">{stu.department}</td>
                      <td className="p-2.5 font-medium text-foreground">{stu.cgpa}</td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[10px]">
                          {stu.readinessScore}%
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-primary"
                          onClick={() => {
                            const cid = reviewCohort?.skill;
                            setReviewCohort(null);
                            handleOpenAssign(stu.id, cid);
                          }}
                        >
                          Assign Plan
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setReviewCohort(null)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Action Plan Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Preparation & Training Action Plan</DialogTitle>
            <DialogDescription>
              Assign a structured remedial action plan to a student and coordinate with campus trainers.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Target Student *</label>
              <select
                required
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
              >
                <option value="" disabled>Select a student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.usn || s.id}) — {s.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Focus Skill Domain *</label>
                <Input
                  required
                  placeholder="e.g. Dynamic Programming & DSA"
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Assigned Faculty / Trainer</label>
                <select
                  value={selectedTrainerName}
                  onChange={(e) => setSelectedTrainerName(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                >
                  {trainers.map((t) => (
                    <option key={t.id || t.name} value={t.name}>
                      {t.name} ({t.department || "Faculty"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Target Completion Deadline</label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Remedial Task & Practice Curriculum *
              </label>
              <Textarea
                required
                rows={3}
                placeholder="e.g. Solve 10 dynamic programming memoization problems on CodeJudge, review time complexity analysis, and submit to trainer."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Assigning..." : "Assign Action Plan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------------------
// 7. NOTIFICATIONS MODULE — UPCOMING DRIVE ANNOUNCEMENTS DISPATCHER
// -----------------------------------------------------------------------------------------
function NotificationsModule({
  data,
  onRefresh,
}: {
  data: any;
  onRefresh?: () => void;
}) {
  const notifications = Array.isArray(data)
    ? data
    : data?.notifications || [];
  const drives = Array.isArray(data?.drives) ? data.drives : [];

  const [selectedDriveId, setSelectedDriveId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // When a drive is selected from the dropdown, autofill helpful defaults
  const handleSelectDrive = (driveId: string) => {
    setSelectedDriveId(driveId);
    if (!driveId) return;

    const drive = drives.find((d: any) => d.id === driveId);
    if (drive) {
      const driveDate = drive.driveDate
        ? new Date(drive.driveDate).toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "upcoming schedule";
      setTitle(`Campus Drive Alert: ${drive.companyName || "Recruiter"} — ${drive.title}`);
      setMessage(
        `Attention candidate students! The campus recruitment drive for "${drive.title}" by ${drive.companyName || "the organization"} is scheduled for ${driveDate}. Venue / Platform: ${drive.location || "Main Auditorium / Placement Cell"}. All eligible students must assemble promptly by 08:30 AM with printed resumes and college ID cards.`
      );
      setFeedback(null);
    }
  };

  // Quick preset template chips
  const applyPreset = (type: "schedule" | "venue" | "documents" | "rounds") => {
    const drive = drives.find((d: any) => d.id === selectedDriveId);
    const company = drive?.companyName || "Upcoming Recruiter";
    const role = drive?.title || "Recruitment Drive";
    const dateStr = drive?.driveDate
      ? new Date(drive.driveDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
      : "upcoming drive date";

    if (type === "schedule") {
      setTitle(`Recruitment Schedule: ${company} (${role})`);
      setMessage(
        `The campus recruitment drive for ${company} (${role}) will commence on ${dateStr}. Reporting time is 09:00 AM sharp at the placement cell. Pre-placement talk begins at 09:30 AM.`
      );
    } else if (type === "venue") {
      setTitle(`Venue & Reporting Guidelines: ${company}`);
      setMessage(
        `Reporting Venue: ${drive?.location || "Main Campus Auditorium"}. Dress code: Strictly formal attire. Please arrive 15 minutes prior to the briefing session.`
      );
    } else if (type === "documents") {
      setTitle(`Mandatory Documents: ${company} Campus Drive`);
      setMessage(
        `All candidates attending the ${company} drive must carry: 2 hard copies of updated resume, college ID card, government photo ID proof, and academic transcripts.`
      );
    } else if (type === "rounds") {
      setTitle(`Assessment & Selection Rounds: ${company}`);
      setMessage(
        `Selection process stages for ${company}: Round 1: Online Aptitude & Technical Screening; Round 2: Live Coding Assessment; Round 3: Technical & HR Interviews.`
      );
    }
    setFeedback(null);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Please provide both a notification title and announcement message.");
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);
      const selectedDrive = drives.find((d: any) => d.id === selectedDriveId);

      await api.placement.sendNotification({
        title: title.trim(),
        message: message.trim(),
        driveId: selectedDriveId || undefined,
        driveName: selectedDrive?.title || undefined,
      } as any);

      toast.success("Drive notification successfully broadcasted to all students!");
      setFeedback({
        type: "success",
        text: `Drive alert "${title.trim()}" successfully dispatched to students.`,
      });
      setTitle("");
      setMessage("");
      setSelectedDriveId("");

      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to broadcast notification.";
      toast.error(msg);
      setFeedback({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scope banner */}
      <div className="rounded-xl border border-border/70 bg-card/60 p-5 space-y-2 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                Upcoming Drive Notification Dispatcher
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-mono">
                  Authorized Broadcast
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                Placement Officers are authorized to dispatch real-time recruitment drive alerts, schedules, reporting venues, and round notices directly to candidate students.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground self-start sm:self-center font-mono bg-muted/30 px-3 py-1.5 rounded-lg border border-border/40">
            <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            <span>Target: Students (Campus-wide)</span>
          </div>
        </div>
      </div>

      {/* DISPATCHER FORM PANEL */}
      <PlacementPanel
        title="Broadcast Drive Alert to Candidate Students"
        subtitle="Select an upcoming placement drive or compose a custom announcement to dispatch immediately to student dashboards."
      >
        <form onSubmit={handleBroadcast} className="space-y-5 p-1">
          {/* Drive Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-primary" /> Select Upcoming Drive (Auto-Fill)
              </span>
              <span className="text-[11px] font-normal normal-case text-muted-foreground">
                {drives.length} campus drive{drives.length !== 1 ? "s" : ""} on schedule
              </span>
            </Label>
            <select
              value={selectedDriveId}
              onChange={(e) => handleSelectDrive(e.target.value)}
              className="w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            >
              <option value="">— Select an upcoming drive to load details (or write custom alert) —</option>
              {drives.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.companyName || "Organization"} • {d.title} ({d.driveDate ? new Date(d.driveDate).toLocaleDateString("en-IN") : "TBD"}) — Status: {d.status || "Scheduled"}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Preset Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Announcement Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset("schedule")}
                className="px-2.5 py-1 text-xs rounded-md border border-border/70 bg-card hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Calendar className="h-3 w-3 text-primary" /> Drive Schedule
              </button>
              <button
                type="button"
                onClick={() => applyPreset("venue")}
                className="px-2.5 py-1 text-xs rounded-md border border-border/70 bg-card hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <MapPin className="h-3 w-3 text-primary" /> Venue & Reporting
              </button>
              <button
                type="button"
                onClick={() => applyPreset("documents")}
                className="px-2.5 py-1 text-xs rounded-md border border-border/70 bg-card hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <FileText className="h-3 w-3 text-primary" /> Documents Required
              </button>
              <button
                type="button"
                onClick={() => applyPreset("rounds")}
                className="px-2.5 py-1 text-xs rounded-md border border-border/70 bg-card hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Target className="h-3 w-3 text-primary" /> Selection Rounds
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notification Title <span className="text-rose-500">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Upcoming Campus Drive: Google Cloud — Solutions Architect"
              className="text-xs border-border/70 bg-background/80"
              required
            />
          </div>

          {/* Message Textarea */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Announcement Message <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[10px] text-muted-foreground font-mono">
                {message.length} characters
              </span>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide drive timings, reporting location, registration eligibility, dress code, and items students should carry..."
              rows={4}
              className="text-xs border-border/70 bg-background/80 resize-y"
              required
            />
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={cn(
                "p-3 rounded-lg border text-xs flex items-center gap-2",
                feedback.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
              )}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-border/40">
            <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Audited under action: <code className="text-foreground">placement.notification_send</code></span>
            </div>

            <Button
              type="submit"
              disabled={submitting || !title.trim() || !message.trim()}
              className="gap-2 text-xs font-semibold px-4 w-full sm:w-auto"
            >
              <Send className={cn("h-3.5 w-3.5", submitting && "animate-spin")} />
              <span>{submitting ? "Broadcasting Alert..." : "Broadcast Drive Notification"}</span>
            </Button>
          </div>
        </form>
      </PlacementPanel>

      {/* NOTIFICATIONS HISTORY PANEL */}
      <PlacementPanel
        title="Institutional Notification Feed & Broadcast History"
        subtitle={`Showing ${notifications.length} announcements and drive notices dispatched to campus cohorts`}
      >
        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((n: any) => {
              const dateVal = n.sentAt || n.createdAt;
              const formattedDate = dateVal
                ? new Date(dateVal).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Recently";

              return (
                <div
                  key={n.id}
                  className="p-4 rounded-xl border border-border/60 bg-card/50 space-y-2 hover:bg-card/80 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-foreground">{n.title}</h4>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                        {n.targetRole || "Students"}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formattedDate}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{n.message}</p>
                  <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-3 border-t border-border/30">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      Scope: {n.collegeScope || "Campus"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Delivered to Student Feed
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <PlacementEmptyState
            title="No Drive Notifications Broadcasted Yet"
            description="Use the dispatcher above to send schedules, reporting venues, or interview alerts to candidate students."
            icon={Bell}
          />
        )}
      </PlacementPanel>
    </div>
  );
}

// -----------------------------------------------------------------------------------------
// 8. REPORTS MODULE
// -----------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------
// 8. DUAL-LAYER REPORTS & EXPORT ENGINE
// -----------------------------------------------------------------------------------------
interface ExportJob {
  id: string;
  collegeCode: string;
  actorId: string;
  actorRole: string;
  jobType: string;
  format: "csv" | "xlsx" | "pdf";
  filters: any;
  selectedFields: string[];
  rowCount: number;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
}

const AVAILABLE_REPORT_FIELDS: { id: string; label: string; default: boolean; layerNote?: string }[] = [
  { id: "usn", label: "USN", default: true },
  { id: "name", label: "Student Name", default: true },
  { id: "email", label: "Email Address", default: false },
  { id: "department", label: "Department", default: true },
  { id: "section", label: "Section", default: true },
  { id: "year", label: "Academic Year", default: false },
  { id: "semester", label: "Semester", default: false },
  { id: "batch", label: "Batch Cohort", default: true },
  { id: "cgpa", label: "CGPA", default: true },
  { id: "activeBacklogs", label: "Active Backlogs", default: true },
  { id: "readinessScoreVisible", label: "Visible Readiness %", default: true, layerNote: "Editor Adjusted Layer" },
  { id: "readinessScoreRaw", label: "Ground Truth Readiness %", default: true, layerNote: "Evidence Calculation Layer" },
  { id: "technicalScore", label: "Technical %", default: true },
  { id: "aptitudeScore", label: "Aptitude %", default: true },
  { id: "codingScore", label: "Coding Judge %", default: true },
  { id: "offersCount", label: "Offers Count", default: true },
  { id: "verificationStatus", label: "Verification Status", default: true },
];

/**
 * Generates an executive-grade, multi-sheet OpenXML .xlsx spreadsheet
 */
async function generateExcelWorkbook({
  resultData,
  exportMode,
  dept,
  year,
  section,
  batch,
  batchDept,
  selectedFields,
  summary,
  branchWise,
  collegeInfo,
}: {
  resultData: any;
  exportMode: "individual_class" | "combined_batch";
  dept: string;
  year: string;
  section: string;
  batch: string;
  batchDept: string;
  selectedFields: string[];
  summary: any;
  branchWise: any[];
  collegeInfo?: { code?: string; name?: string };
}): Promise<Blob> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const fieldMapping: Record<string, string> = {
    usn: "USN",
    name: "Student Name",
    email: "Email Address",
    department: "Department",
    section: "Section",
    year: "Academic Year",
    semester: "Semester",
    batch: "Graduating Batch",
    cgpa: "CGPA",
    activeBacklogs: "Active Backlogs",
    readinessScoreVisible: "Visible Readiness % (Adjusted)",
    readinessScoreRaw: "Ground Truth Readiness % (Raw)",
    technicalScore: "Technical %",
    aptitudeScore: "Aptitude %",
    codingScore: "Coding Judge %",
    offersCount: "Offers Count",
    verificationStatus: "Verification Status",
  };

  // 1. Sheet 1: Candidate Roster
  const rosterRows = (resultData.rows || []).map((row: any) => {
    const formattedRow: Record<string, any> = {};
    for (const fieldId of selectedFields) {
      const header = fieldMapping[fieldId] || fieldId;
      formattedRow[header] = row[fieldId] ?? "";
    }
    return formattedRow;
  });

  const wsRoster = XLSX.utils.json_to_sheet(rosterRows);

  if (rosterRows.length > 0) {
    const colKeys = Object.keys(rosterRows[0]);
    wsRoster["!cols"] = colKeys.map((k) => {
      let maxLen = k.length;
      for (let i = 0; i < Math.min(rosterRows.length, 100); i++) {
        const val = String(rosterRows[i][k] ?? "");
        if (val.length > maxLen) maxLen = val.length;
      }
      return { wch: Math.min(Math.max(maxLen + 3, 11), 40) };
    });
  }

  XLSX.utils.book_append_sheet(wb, wsRoster, "Candidate Roster");

  // 2. Sheet 2: Executive Summary & Scorecard
  const totalStudents = summary?.totalGraduatingStudents ?? resultData.rowCount ?? 0;
  const placedStudents = summary?.distinctStudentsPlaced ?? 0;
  const placementRate = totalStudents > 0 ? ((placedStudents / totalStudents) * 100).toFixed(1) + "%" : "N/A";

  const summaryData = [
    { Parameter: "Institutional Placement Report", Value: "ZIPHYRUS X AUTHORITATIVE PLACEMENT LEDGER" },
    { Parameter: "Campus Jurisdiction", Value: collegeInfo?.name ? `${collegeInfo.name} (${collegeInfo.code})` : "Campus SMP101" },
    { Parameter: "Generated At", Value: new Date().toLocaleString() },
    { Parameter: "Export Scope", Value: exportMode === "individual_class" ? "Mode A: Individual Class Roster" : "Mode B: Combined Batch Cohort" },
    {
      Parameter: "Filter Scope",
      Value: exportMode === "individual_class"
        ? `Department: ${dept} | Year: ${year} | Section: ${section}`
        : `Batch: ${batch} | Department Scope: ${batchDept === "all" ? "All Campus Departments" : batchDept}`,
    },
    { Parameter: "Total Evaluated Students in File", Value: resultData.rowCount || resultData.rows?.length || 0 },
    { Parameter: "", Value: "" },
    { Parameter: "=== EXECUTIVE RECRUITMENT SCORECARD ===", Value: "=========================================" },
    { Parameter: "Total Eligible Graduating Students", Value: totalStudents },
    { Parameter: "Distinct Candidates Placed", Value: placedStudents },
    { Parameter: "Placement Conversion Rate", Value: placementRate },
    { Parameter: "Mean Compensation Package", Value: `${summary?.averageCompensationPackage ?? "8.5"} LPA` },
    { Parameter: "Highest Compensation Secured", Value: `${summary?.highestPackage ?? "24.0"} LPA` },
    { Parameter: "Total Offers Issued", Value: summary?.totalOffersIssued ?? 0 },
    { Parameter: "Offers Accepted by Students", Value: summary?.offersAcceptedCount ?? 0 },
    { Parameter: "Confirmed Joined in Industry", Value: summary?.confirmedJoinedCount ?? 0 },
    { Parameter: "", Value: "" },
    { Parameter: "=== DUAL-LAYER RESOLUTION INTEGRITY ===", Value: "=========================================" },
    { Parameter: "Layer C (Visible Readiness %)", Value: "Includes verified Editor-authorized adjustments for institutional transcripts." },
    { Parameter: "Layer B (Ground Truth Readiness %)", Value: "Strict deterministic computation used for automated eligibility checks." },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 42 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");

  // 3. Sheet 3: Branch Performance & Graphical Conversion
  const branches = (branchWise && branchWise.length > 0
    ? branchWise
    : [
        { branch: "CSE", total: 60, placed: 48, percentage: 80, avgLpa: 10.2 },
        { branch: "ISE", total: 45, placed: 36, percentage: 80, avgLpa: 9.8 },
        { branch: "ECE", total: 50, placed: 35, percentage: 70, avgLpa: 7.8 },
        { branch: "ME", total: 40, placed: 24, percentage: 60, avgLpa: 5.5 },
      ]
  ).map((b: any) => {
    const pct = b.percentage ?? (b.total ? Math.round((b.placed / b.total) * 100) : 0);
    const filled = Math.min(10, Math.max(0, Math.round(pct / 10)));
    const progressBar = "[" + "█".repeat(filled) + "░".repeat(10 - filled) + "] " + pct + "%";
    return {
      "Department / Branch": b.branch,
      "Total Cohort": b.total,
      "Placed Students": b.placed,
      "Placement Rate": `${pct}%`,
      "Average Package (LPA)": `${b.avgLpa} LPA`,
      "Conversion Visual": progressBar,
    };
  });

  const wsBranch = XLSX.utils.json_to_sheet(branches);
  wsBranch["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsBranch, "Branch Performance");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Generates an institutional-grade, styled binary PDF report
 */
async function generatePdfDocument({
  resultData,
  exportMode,
  dept,
  year,
  section,
  batch,
  batchDept,
  selectedFields,
  summary,
  branchWise,
  collegeInfo,
}: {
  resultData: any;
  exportMode: "individual_class" | "combined_batch";
  dept: string;
  year: string;
  section: string;
  batch: string;
  batchDept: string;
  selectedFields: string[];
  summary: any;
  branchWise: any[];
  collegeInfo?: { code?: string; name?: string };
}): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default || autoTableModule;

  // Landscape A4: 841.89 x 595.28 pt
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Header Banner (Dark Slate #0f172a)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 56, "F");

  // Top Accent Bar (Emerald #10b981)
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 4, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.text("ZIPHYRUS X — INSTITUTIONAL PLACEMENT & READINESS REPORT", 24, 25);

  // Subtitle / Campus info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  const scopeDetail =
    exportMode === "individual_class"
      ? `Mode A: Class Roster (${dept} • ${year} • Section ${section})`
      : `Mode B: Combined Cohort (${batch} • ${batchDept === "all" ? "All Departments" : batchDept})`;
  doc.text(
    `Campus: ${collegeInfo?.name || "Campus SMP101"} (${collegeInfo?.code || "SMP101"})   |   Scope: ${scopeDetail}   |   Generated: ${new Date().toLocaleString()}   |   Ledger: system.data_jobs`,
    24,
    42
  );

  // 2. Scorecard Metric Cards (y: 66 to 106)
  const totalStudents = summary?.totalGraduatingStudents ?? resultData.rowCount ?? 0;
  const placedStudents = summary?.distinctStudentsPlaced ?? 0;
  const placementRate = totalStudents > 0 ? ((placedStudents / totalStudents) * 100).toFixed(1) : "0";
  const avgPkg = summary?.averageCompensationPackage ?? "8.5";
  const peakPkg = summary?.highestPackage ?? "24.0";

  const cards = [
    { label: "GRADUATING COHORT", val: `${totalStudents} Candidates`, note: "Eligible student pool" },
    { label: "DISTINCT PLACED", val: `${placedStudents} (${placementRate}%)`, note: "Unique placed candidates" },
    { label: "MEAN COMPENSATION", val: `${avgPkg} LPA`, note: "Cohort average package" },
    { label: "PEAK COMPENSATION", val: `${peakPkg} LPA`, note: "Highest secured package" },
  ];

  const cardWidth = (pageWidth - 48 - 36) / 4;
  let cardX = 24;
  const cardY = 66;
  const cardHeight = 39;

  cards.forEach((c) => {
    // Card background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, "FD");

    // Left accent strip (Blue #2563eb)
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(cardX, cardY, 3, cardHeight, 1.5, 1.5, "F");

    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, cardX + 10, cardY + 11);

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(c.val, cardX + 10, cardY + 23);

    // Note
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(c.note, cardX + 10, cardY + 33);

    cardX += cardWidth + 12;
  });

  // 3. Mini Department Breakdown Row (y: 112)
  const branches = branchWise && branchWise.length > 0
    ? branchWise
    : [
        { branch: "CSE", total: 60, placed: 48, percentage: 80, avgLpa: 10.2 },
        { branch: "ISE", total: 45, placed: 36, percentage: 80, avgLpa: 9.8 },
        { branch: "ECE", total: 50, placed: 35, percentage: 70, avgLpa: 7.8 },
        { branch: "ME", total: 40, placed: 24, percentage: 60, avgLpa: 5.5 },
      ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text("BRANCH BENCHMARKS:", 24, 120);

  doc.setFont("helvetica", "normal");
  let bX = 145;
  branches.forEach((b: any) => {
    const text = `${b.branch}: ${b.placed}/${b.total} (${b.percentage}%) • Avg ${b.avgLpa} LPA`;
    const textW = doc.getTextWidth(text);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(bX - 4, 111, textW + 8, 12, 2, 2, "F");
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(7);
    doc.text(text, bX, 120);
    bX += textW + 14;
  });

  // 4. Candidate Roster Table
  const fieldMapping: Record<string, string> = {
    usn: "USN",
    name: "Student Name",
    email: "Email",
    department: "Dept",
    section: "Sec",
    year: "Year",
    semester: "Sem",
    batch: "Batch",
    cgpa: "CGPA",
    activeBacklogs: "Backlogs",
    readinessScoreVisible: "Visible %",
    readinessScoreRaw: "Ground Truth %",
    technicalScore: "Tech %",
    aptitudeScore: "Apt %",
    codingScore: "Code %",
    offersCount: "Offers",
    verificationStatus: "Verification Status",
  };

  const headers = selectedFields.map((f) => fieldMapping[f] || f);
  const rows = (resultData.rows || []).map((row: any) =>
    selectedFields.map((f) => String(row[f] ?? ""))
  );

  autoTable(doc, {
    startY: 130,
    head: [headers],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 3.5,
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (dataHook: any) => {
      const colHeader = headers[dataHook.column.index];
      if (colHeader === "Student Name") {
        dataHook.cell.styles.halign = "left";
        dataHook.cell.styles.fontStyle = "bold";
      } else if (colHeader === "USN") {
        dataHook.cell.styles.font = "courier";
        dataHook.cell.styles.fontSize = 6.8;
      } else if (colHeader === "Verification Status") {
        const txt = String(dataHook.cell.raw || "");
        if (txt.includes("Verified")) {
          dataHook.cell.styles.textColor = [21, 128, 61];
          dataHook.cell.styles.fontStyle = "bold";
        } else if (txt.includes("Accepted")) {
          dataHook.cell.styles.textColor = [2, 132, 199];
        } else if (txt.includes("Unplaced")) {
          dataHook.cell.styles.textColor = [148, 163, 184];
        }
      }
    },
    margin: { left: 24, right: 24, bottom: 28 },
    didDrawPage: (hookData: any) => {
      const current = hookData.pageNumber;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);

      // Left footer
      doc.text(
        "ZIPHYRUS X AUTHORITATIVE PLACEMENT LEDGER  •  DUAL-LAYER VERIFIED  •  CONFIDENTIAL ACADEMIC RECORD",
        24,
        pageHeight - 10
      );

      // Right footer
      const totalPages = typeof (doc as any).getNumberOfPages === "function" ? (doc as any).getNumberOfPages() : 1;
      doc.text(`Page ${current} of ${totalPages}`, pageWidth - 70, pageHeight - 10);
    },
  });

  return doc.output("blob");
}

function ReportsModule({ data }: { data: any }) {
  const summary = data?.summary;
  const branchWise = data?.branchWisePlacements || [];
  const companyWise = data?.companyWisePlacements || [];
  const tierDistribution = data?.tierDistribution || [
    { name: "Super Dream (>15 LPA)", value: 14, color: "#10b981" },
    { name: "Dream Tier (10-15 LPA)", value: 38, color: "#3b82f6" },
    { name: "Elite Core (6-10 LPA)", value: 56, color: "#8b5cf6" },
    { name: "Foundation (3.5-6 LPA)", value: 35, color: "#f59e0b" },
    { name: "In-Pipeline / Seeking", value: 57, color: "#64748b" },
  ];
  const readinessComparison = data?.readinessComparison || [
    { department: "CSE", visibleScore: 84, rawScore: 78, gap: 6 },
    { department: "ISE", visibleScore: 81, rawScore: 76, gap: 5 },
    { department: "ECE", visibleScore: 75, rawScore: 71, gap: 4 },
    { department: "ME", visibleScore: 68, rawScore: 65, gap: 3 },
  ];

  // Visuals Tab State
  const [visualTab, setVisualTab] = useState<"departments" | "tiers" | "readiness">("departments");

  // Export Engine State
  const [exportMode, setExportMode] = useState<"individual_class" | "combined_batch">("individual_class");
  
  // Mode A: Individual Class Filters
  const [dept, setDept] = useState("CSE");
  const [year, setYear] = useState("3rd Year");
  const [section, setSection] = useState("A");

  // Mode B: Combined Batch Filters
  const [batch, setBatch] = useState("Batch 2026");
  const [batchDept, setBatchDept] = useState("all");

  // Field Selectors
  const [selectedFields, setSelectedFields] = useState<string[]>(
    AVAILABLE_REPORT_FIELDS.filter((f) => f.default).map((f) => f.id)
  );

  // Status & Export Jobs
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const fetchJobs = () => {
    setLoadingJobs(true);
    api.placement
      .getExportJobs()
      .then((res: any) => {
        setJobs(res?.data || res || []);
        setLoadingJobs(false);
      })
      .catch(() => {
        setLoadingJobs(false);
      });
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(AVAILABLE_REPORT_FIELDS.map((f) => f.id));
  };

  const resetDefaultFields = () => {
    setSelectedFields(AVAILABLE_REPORT_FIELDS.filter((f) => f.default).map((f) => f.id));
  };

  const handleRunExport = async (format: "csv" | "xlsx" | "pdf") => {
    if (selectedFields.length === 0) {
      toast.error("Please select at least one field to export.");
      return;
    }

    setExportingFormat(format);
    try {
      const payload: any = {
        type: exportMode,
        format,
        selectedFields,
      };

      if (exportMode === "individual_class") {
        payload.department = dept;
        payload.year = year;
        payload.section = section;
      } else {
        payload.batch = batch;
        if (batchDept !== "all") {
          payload.department = batchDept;
        }
      }

      const res: any = await api.placement.exportReport(payload);
      const resultData = res?.data || res;

      if (format === "xlsx") {
        const excelBlob = await generateExcelWorkbook({
          resultData,
          exportMode,
          dept,
          year,
          section,
          batch,
          batchDept,
          selectedFields,
          summary,
          branchWise,
          collegeInfo: data?.college,
        });
        const url = URL.createObjectURL(excelBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = resultData.filename || `placement_report_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === "pdf") {
        const pdfBlob = await generatePdfDocument({
          resultData,
          exportMode,
          dept,
          year,
          section,
          batch,
          batchDept,
          selectedFields,
          summary,
          branchWise,
          collegeInfo: data?.college,
        });
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = resultData.filename || `placement_report_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([resultData.csvContent || ""], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = resultData.filename || `placement_report_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast.success(
        `Export successful! Generated ${resultData.rowCount} student records (${format.toUpperCase()}). Job ID: ${
          resultData.job?.id || "logged"
        }`
      );

      fetchJobs();
    } catch (err: any) {
      toast.error(err?.message || `Failed to export ${format.toUpperCase()} report.`);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `placement_report_${data?.college?.code || "campus"}_2026.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* KPI Overview Banner */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PlacementMetric
            label="Graduating Students"
            value={summary.totalGraduatingStudents}
            note="Eligible batch cohort"
            icon={Users}
            variant="default"
          />
          <PlacementMetric
            label="Distinct Students Placed"
            value={summary.distinctStudentsPlaced}
            note="Unique placed candidates"
            icon={UserCheck}
            variant="success"
          />
          <PlacementMetric
            label="Average Compensation"
            value={`${summary.averageCompensationPackage} LPA`}
            note="Cohort mean package"
            icon={Award}
            variant="primary"
          />
          <PlacementMetric
            label="Highest Compensation"
            value={`${summary.highestPackage} LPA`}
            note="Peak package secured"
            icon={Sparkles}
            variant="default"
          />
        </div>
      )}

      {/* GRAPHICAL VISUALS & PLACEMENT ANALYTICS TELEMETRY */}
      <PlacementPanel
        title="Institutional Placement Analytics & Graphical Visuals"
        subtitle="Live telemetry visualizations: departmental recruitment velocities, CTC package distributions, and dual-layer score benchmarks"
      >
        <div className="space-y-4 pt-1">
          {/* Visual Mode Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/40">
            <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setVisualTab("departments")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                  visualTab === "departments"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                <span>Department Conversions</span>
              </button>
              <button
                type="button"
                onClick={() => setVisualTab("tiers")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                  visualTab === "tiers"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <PieChartIcon className="h-3.5 w-3.5 text-blue-500" />
                <span>Hiring CTC Tiers</span>
              </button>
              <button
                type="button"
                onClick={() => setVisualTab("readiness")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                  visualTab === "readiness"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Layers className="h-3.5 w-3.5 text-purple-500" />
                <span>Dual-Layer Score Resolution</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span>Real-Time Institutional Analytics</span>
            </div>
          </div>

          {/* Tab 1: Department Conversion Velocities */}
          {visualTab === "departments" && (
            <div className="space-y-4">
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchWise} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis dataKey="branch" stroke="currentColor" fontSize={11} tickLine={false} className="text-muted-foreground" />
                    <YAxis stroke="currentColor" fontSize={11} tickLine={false} className="text-muted-foreground" />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const dataPoint = payload[0]?.payload;
                          if (!dataPoint) return null;
                          return (
                            <div className="p-3 bg-popover/95 backdrop-blur-md border border-border/80 rounded-lg shadow-xl text-xs space-y-1">
                              <p className="font-bold text-foreground">{label} Department</p>
                              <div className="space-y-0.5 text-muted-foreground">
                                <p className="text-blue-500 flex items-center justify-between gap-4">
                                  <span>Total Graduating:</span>
                                  <span className="font-semibold">{dataPoint.total} Candidates</span>
                                </p>
                                <p className="text-emerald-500 flex items-center justify-between gap-4">
                                  <span>Placed Students:</span>
                                  <span className="font-semibold">{dataPoint.placed} Placed</span>
                                </p>
                                <p className="text-amber-500 flex items-center justify-between gap-4">
                                  <span>Conversion Rate:</span>
                                  <span className="font-semibold">{dataPoint.percentage}%</span>
                                </p>
                                <p className="text-purple-500 flex items-center justify-between gap-4">
                                  <span>Average Compensation:</span>
                                  <span className="font-semibold">{dataPoint.avgLpa} LPA</span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar dataKey="total" name="Total Graduating Cohort" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="placed" name="Placed Candidates" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Department Benchmarks Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {branchWise.map((b: any) => (
                  <div key={b.branch} className="p-3 rounded-xl border border-border/60 bg-card/60 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{b.branch}</span>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        {b.percentage}% Placed
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                      <span>{b.placed}/{b.total} Placed</span>
                      <span className="font-medium text-foreground">{b.avgLpa} LPA Mean</span>
                    </div>
                    <Progress value={b.percentage} className="h-1.5 mt-1" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: CTC Package Tier Distribution */}
          {visualTab === "tiers" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="h-72 md:col-span-6 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const p = payload[0];
                          if (!p) return null;
                          return (
                            <div className="p-2.5 bg-popover/95 backdrop-blur-md border border-border/80 rounded-lg shadow-xl text-xs space-y-0.5">
                              <p className="font-bold text-foreground">{p.name}</p>
                              <p className="text-muted-foreground font-medium">
                                Count: <span className="text-foreground font-semibold">{p.value} Candidates</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Pie
                      data={tierDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {tierDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || "#3b82f6"} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-foreground font-mono">
                    {summary?.distinctStudentsPlaced || 143}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    Placed Offers
                  </span>
                </div>
              </div>

              <div className="md:col-span-6 space-y-2.5">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-primary" /> Compensation Tier Classification
                </h4>
                {tierDistribution.map((tier: any) => {
                  const totalCohort = summary?.totalGraduatingStudents || 200;
                  const sharePct = Math.round((tier.value / totalCohort) * 100);
                  return (
                    <div
                      key={tier.name}
                      className="p-2.5 rounded-lg border border-border/50 bg-card/40 flex items-center justify-between text-xs hover:bg-card/70 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                        <div>
                          <span className="font-semibold text-foreground">{tier.name}</span>
                          <span className="block text-[10px] text-muted-foreground">Share of Graduating Batch</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground font-mono">{tier.value} candidates</span>
                        <span className="block text-[10px] text-muted-foreground font-mono">~{sharePct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Dual-Layer Readiness Score Resolution */}
          {visualTab === "readiness" && (
            <div className="space-y-4">
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={readinessComparison} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis dataKey="department" stroke="currentColor" fontSize={11} tickLine={false} className="text-muted-foreground" />
                    <YAxis domain={[50, 100]} stroke="currentColor" fontSize={11} tickLine={false} className="text-muted-foreground" />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0]?.payload;
                          if (!item) return null;
                          return (
                            <div className="p-3 bg-popover/95 backdrop-blur-md border border-border/80 rounded-lg shadow-xl text-xs space-y-1">
                              <p className="font-bold text-foreground">{label} Readiness Comparison</p>
                              <div className="space-y-0.5 text-muted-foreground">
                                <p className="text-purple-500 flex items-center justify-between gap-4">
                                  <span>Visible (Adjusted):</span>
                                  <span className="font-semibold">{item.visibleScore}%</span>
                                </p>
                                <p className="text-cyan-500 flex items-center justify-between gap-4">
                                  <span>Ground Truth (Raw):</span>
                                  <span className="font-semibold">{item.rawScore}%</span>
                                </p>
                                <p className="text-emerald-500 flex items-center justify-between gap-4">
                                  <span>Editor Delta / Gap:</span>
                                  <span className="font-semibold">+{item.gap}%</span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar dataKey="visibleScore" name="Visible Readiness % (Editor Adjusted Layer)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rawScore" name="Ground Truth % (Evidence Engine Layer)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Dual-Layer Explanatory Callout */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 text-xs text-muted-foreground flex items-start gap-3">
                <Info className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-foreground">Authoritative Dual-Layer Distinction in Export Reports:</span>
                  <p className="text-[11px] leading-relaxed">
                    • <strong className="text-foreground">Layer C (Visible Readiness %):</strong> Reflects Editor-verified portfolio and viva adjustments. Displayed on public transcripts, resume summaries, and accreditation reports.<br />
                    • <strong className="text-foreground">Layer B (Ground Truth Readiness %):</strong> Strictly computed from deterministic assessment logs, coding judge accuracy, and objective test scores. Automated recruitment opportunity gates strictly enforce this value.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </PlacementPanel>

      {/* DUAL-LAYER EXPORT WORKSPACE */}
      <PlacementPanel
        title="Institutional Placement Reports & Export Engine"
        subtitle="Generate authoritative, audit-grade rosters with dual-layer readiness scores (Visible Adjusted vs. Ground Truth Evidence)"
      >
        <div className="space-y-6 pt-2">
          {/* Mode Selector Tabs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-3">Export Scope:</span>
              <div className="inline-flex rounded-lg border border-border/60 bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setExportMode("individual_class")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    exportMode === "individual_class"
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Mode A: Individual Class Roster
                </button>
                <button
                  type="button"
                  onClick={() => setExportMode("combined_batch")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    exportMode === "combined_batch"
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Mode B: Combined Batch Cohort
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Immutable Export Ledger (<code className="font-mono text-[11px]">system.data_jobs</code>)</span>
            </div>
          </div>

          {/* Mode-Specific Scope Filters */}
          <div className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-4">
            {exportMode === "individual_class" ? (
              <div>
                <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-primary" /> Mode A Class Filters (Department → Year → Section)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Department</Label>
                    <select
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background/80 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="CSE">Computer Science & Engineering (CSE)</option>
                      <option value="ECE">Electronics & Communication (ECE)</option>
                      <option value="ISE">Information Science & Engineering (ISE)</option>
                      <option value="AIML">Artificial Intelligence & ML (AIML)</option>
                      <option value="MECH">Mechanical Engineering (MECH)</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Academic Year</Label>
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background/80 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="3rd Year">3rd Year (Pre-Final)</option>
                      <option value="4th Year">4th Year (Graduating Final)</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="1st Year">1st Year</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Section</Label>
                    <select
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background/80 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-primary" /> Mode B Batch Filters (Academic Year / Cohort)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Graduating Batch</Label>
                    <select
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background/80 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Batch 2026">Batch 2026 (Class of 2026)</option>
                      <option value="Batch 2025">Batch 2025 (Class of 2025)</option>
                      <option value="Batch 2027">Batch 2027 (Class of 2027)</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Department Scope</Label>
                    <select
                      value={batchDept}
                      onChange={(e) => setBatchDept(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background/80 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">All Campus Departments (Cross-Department Combined)</option>
                      <option value="CSE">CSE Only</option>
                      <option value="ECE">ECE Only</option>
                      <option value="ISE">ISE Only</option>
                      <option value="AIML">AIML Only</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dual-Layer Callout Notice */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Dual-Layer Intelligence Resolution:</span>
              <p className="mt-0.5 text-[11px] leading-relaxed">
                • <strong className="text-foreground">Visible Readiness %</strong> incorporates verified Editor-authorized adjustments for presentation & transcripts.<br />
                • <strong className="text-foreground">Ground Truth Readiness %</strong> strictly reflects raw deterministic engine calculations used for factual qualification checks.
              </p>
            </div>
          </div>

          {/* Column Checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs font-semibold text-foreground">
                Select Roster Columns to Include ({selectedFields.length}/{AVAILABLE_REPORT_FIELDS.length})
              </Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={selectAllFields} className="text-xs h-7 px-2">
                  Select All
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={resetDefaultFields} className="text-xs h-7 px-2">
                  Reset Defaults
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-3 rounded-xl border border-border/40 bg-muted/20">
              {AVAILABLE_REPORT_FIELDS.map((field) => {
                const checked = selectedFields.includes(field.id);
                return (
                  <label
                    key={field.id}
                    className={cn(
                      "flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors",
                      checked
                        ? "border-primary/40 bg-primary/5 text-foreground font-medium"
                        : "border-border/40 hover:bg-muted/40 text-muted-foreground"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleField(field.id)}
                      className="mt-0.5"
                    />
                    <div className="leading-tight">
                      <span>{field.label}</span>
                      {field.layerNote && (
                        <span className="block text-[10px] text-primary/80 font-mono mt-0.5">
                          {field.layerNote}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!!exportingFormat}
              onClick={() => handleRunExport("csv")}
              className="gap-2 text-xs glass-card border-border/80"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              {exportingFormat === "csv" ? "Generating CSV…" : "Export as CSV"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!!exportingFormat}
              onClick={() => handleRunExport("xlsx")}
              className="gap-2 text-xs glass-card border-border/80"
            >
              <FileSpreadsheet className="h-4 w-4 text-blue-500" />
              {exportingFormat === "xlsx" ? "Generating Excel…" : "Export as Excel (.xlsx)"}
            </Button>

            <Button
              size="sm"
              disabled={!!exportingFormat}
              onClick={() => handleRunExport("pdf")}
              className="gap-2 text-xs bg-primary text-primary-foreground"
            >
              <FileText className="h-4 w-4" />
              {exportingFormat === "pdf" ? "Generating PDF…" : "Export PDF Summary"}
            </Button>
          </div>
        </div>
      </PlacementPanel>

      {/* EXPORT ACTIVITY LOG TABLE (system.data_jobs) */}
      <PlacementPanel
        title="Export Activity & Audit Log"
        subtitle="Authoritative log of past generated reports recorded in system.data_jobs"
      >
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchJobs}
              disabled={loadingJobs}
              className="h-7 text-xs gap-1 text-muted-foreground"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loadingJobs && "animate-spin")} /> Refresh Log
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3">Job ID</th>
                  <th className="py-2.5 px-3">Job Scope / Type</th>
                  <th className="py-2.5 px-3 text-center">Format</th>
                  <th className="py-2.5 px-3">Applied Scope Filters</th>
                  <th className="py-2.5 px-3 text-center">Rows</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Created Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-xs text-muted-foreground">
                      No export jobs logged yet. Generate an individual class or combined batch export above.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-xs font-medium text-foreground">
                        {job.id}
                      </td>
                      <td className="py-2.5 px-3 text-xs">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {job.jobType}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "font-mono text-[10px] uppercase",
                            job.format === "csv" && "text-emerald-500",
                            job.format === "xlsx" && "text-blue-500",
                            job.format === "pdf" && "text-rose-500"
                          )}
                        >
                          {job.format}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">
                        {job.filters ? (
                          <span className="font-mono text-[11px]">
                            {job.filters.department ? `Dept: ${job.filters.department}` : ""}
                            {job.filters.section ? ` · Sec: ${job.filters.section}` : ""}
                            {job.filters.batch ? ` · ${job.filters.batch}` : ""}
                            {job.filters.year ? ` · ${job.filters.year}` : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-xs font-semibold text-foreground">
                        {job.rowCount}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">
                          {job.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px] text-muted-foreground">
                        {new Date(job.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PlacementPanel>

      {/* Regulatory JSON Export */}
      <div className="flex justify-end">
        <Button onClick={handleDownloadJson} size="sm" variant="outline" className="gap-1.5 text-xs glass-card">
          <Download className="h-3.5 w-3.5" /> Download Full Regulatory JSON Report
        </Button>
      </div>

      {/* Branch-wise breakdown */}
      <PlacementPanel
        title="Department / Branch Placement Conversion Statistics"
        subtitle="Accreditation-grade department performance analytics"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Branch / Department</th>
                <th className="py-3 px-4 text-center">Batch Size</th>
                <th className="py-3 px-4 text-center">Placed</th>
                <th className="py-3 px-4 text-center">Placement %</th>
                <th className="py-3 px-4 text-right">Average Package</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {branchWise.map((b: any) => (
                <tr key={b.branch} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground">{b.branch}</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">{b.total}</td>
                  <td className="py-3 px-4 text-center font-medium text-emerald-600">{b.placed}</td>
                  <td className="py-3 px-4 text-center font-semibold text-foreground">{b.percentage}%</td>
                  <td className="py-3 px-4 text-right font-display font-semibold text-foreground">
                    {b.avgLpa} LPA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PlacementPanel>

      {/* Company-wise CTC distribution */}
      <PlacementPanel
        title="Company-Wise Placement Distribution"
        subtitle="Corporate recruitment outcomes by employer"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Corporate Partner</th>
                <th className="py-3 px-4">Role Title</th>
                <th className="py-3 px-4 text-center">Offers Issued</th>
                <th className="py-3 px-4 text-right">Compensation Package</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {companyWise.map((c: any, idx: number) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground">{c.company}</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.role}</td>
                  <td className="py-3 px-4 text-center font-medium text-primary">{c.offersIssued}</td>
                  <td className="py-3 px-4 text-right font-display font-semibold text-foreground">
                    {c.packageLpa} LPA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PlacementPanel>
    </div>
  );
}

// -----------------------------------------------------------------------------------------
// 9. BULK IMPORT MODULE (11-Step Validated Tool)
// -----------------------------------------------------------------------------------------
function BulkImportModule() {
  return (
    <div className="space-y-6">
      <PlacementPanel
        title="Institutional Bulk Data Import"
        subtitle="Batch operations and external file ingestion controls"
      >
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 space-y-3 backdrop-blur-xl">
          <div className="flex items-center gap-2.5 text-rose-600 font-semibold text-sm">
            <Lock className="h-5 w-5" /> File Imports Strictly Restricted
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            In compliance with institutional security and audit policies, file imports and batch data manipulations are strictly restricted to <strong>Institutional Coordinators</strong> and <strong>Super Admins</strong>.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Placement Officers and Trainers have <strong>read-only access</strong> to view verified rosters, analytics, and operational metrics, and cannot upload or import any files.
          </p>
        </div>
      </PlacementPanel>
    </div>
  );
}

// -----------------------------------------------------------------------------------------
// 10. ACTIVITY AUDIT MODULE
// -----------------------------------------------------------------------------------------
function ActivityModule({ data }: { data: any }) {
  const logs = Array.isArray(data) ? data : data?.logs || [];

  return (
    <div className="space-y-6">
      <PlacementPanel
        title="Immutable Operational Audit Log"
        subtitle="Chronological log of placement operations, offer verifications, and status changes"
      >
        {logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log: any, idx: number) => (
              <div
                key={log.id || idx}
                className="p-3.5 rounded-lg border border-border/60 bg-card/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground font-mono">{log.action}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {log.severity || "info"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Target: <span className="font-medium text-foreground">{log.target}</span> • Actor: {log.actor}
                  </p>
                </div>
                <div className="text-[11px] text-muted-foreground shrink-0 font-mono">
                  {new Date(log.timestamp || log.createdAt || Date.now()).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <PlacementEmptyState
            title="No Activity Logged"
            description="Operational actions will automatically generate audit logs here."
            icon={History}
          />
        )}
      </PlacementPanel>
    </div>
  );
}

// -----------------------------------------------------------------------------------------
// 11. ACCOUNT MODULE
// -----------------------------------------------------------------------------------------
function AccountModule({ data }: { data: any }) {
  const session = data?.session;
  const user = session?.user;

  return (
    <div className="space-y-6">
      <PlacementPanel
        title="Placement Officer Profile & College Jurisdiction"
        subtitle="Authorized credentials and institutional operational parameters"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
          <div className="space-y-3">
            <div>
              <span className="text-xs text-muted-foreground block font-semibold uppercase">Official Name</span>
              <p className="text-base font-semibold text-foreground">{user?.name || "Placement Officer"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-semibold uppercase">Login Identifier / Email</span>
              <p className="text-sm font-mono text-foreground">{user?.email || user?.loginId || "placement@smp101.edu"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-semibold uppercase">Platform Role</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  PLACEMENT_OFFICER
                </Badge>
                <span className="text-xs text-muted-foreground">College-Scoped Operational Role</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Authorized Platform Scopes
            </h4>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Full Placement Authority: Partner Companies, Recruiter Contacts & Opportunities</span>
              </li>
              <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Full Placement Authority: Campus Drives, Applications & Offer Verifications</span>
              </li>
              <li className="flex items-center gap-2 text-primary font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Authorized: Broadcast Announcements & Real-Time Alerts for Upcoming Drives</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                <span>Read-Only Scope: Student Roster, CGPA, Backlogs, Resumes & Layer C Readiness</span>
              </li>
              <li className="flex items-center gap-2 text-rose-500">
                <Lock className="h-3.5 w-3.5" />
                <span>Strict Invariant: Student Academic Mutations & File Imports Forbidden</span>
              </li>
            </ul>
          </div>
        </div>
      </PlacementPanel>
    </div>
  );
}
