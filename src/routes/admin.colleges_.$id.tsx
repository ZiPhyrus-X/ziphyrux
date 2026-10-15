import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  GraduationCap,
  History,
  Layers,
  PauseCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AUDIT, COLLEGES, USERS } from "@/features/super-admin/mock-data";
import { Metric, PageHeader, Panel, fmt } from "@/features/super-admin/page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CollegeProgressDonutChart } from "@/components/charts/college-progress-donut";
import {
  CollegeStatusBadge,
  CollegeStatusChangeDialog,
  CollegeStatusHistoryTable,
  CollegeCodeHistoryTable,
  type CollegeLifecycleStatus,
} from "@/components/colleges/college-status-components";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/admin/colleges_/$id")({
  loader: async ({ params }) => {
    try {
      const live = await api.colleges.get(params.id);
      if (live) return live;
    } catch {
      // fallback
    }
    const c = COLLEGES.find((x) => x.id === params.id || x.code === params.id);
    if (!c) throw notFound();
    return c;
  },
  head: () => ({
    meta: [
      { title: "College Detail — Ziphyrus X Super Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => (
    <p className="text-muted-foreground">
      College not found.{" "}
      <Link to="/admin/colleges" className="text-accent">
        Back to colleges
      </Link>
    </p>
  ),
  component: CollegeDetail,
});

export function CollegeDetail() {
  const initialData = Route.useLoaderData();
  const [collegeData, setCollegeData] = useState(initialData);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusHistory, setStatusHistory] = useState<any[]>(initialData.statusHistory || []);
  const [codeHistory, setCodeHistory] = useState<any[]>(initialData.codeHistory || []);

  const users = USERS.filter((u) => u.college === collegeData.code);

  const [chartsData, setChartsData] = useState<any>(null);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  const refreshCollege = () => {
    api.colleges
      .get(collegeData.id || collegeData.code)
      .then((data) => {
        if (data) {
          setCollegeData(data);
          if (data.statusHistory) setStatusHistory(data.statusHistory);
          if (data.codeHistory) setCodeHistory(data.codeHistory);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    let active = true;
    api.intelligence
      .getCharts(collegeData.code)
      .then((data) => {
        if (active) {
          setChartsData(data);
          setLoadingCharts(false);
        }
      })
      .catch(() => {
        if (active) setLoadingCharts(false);
      });

    Promise.all([
      api.colleges.getStatusHistory(collegeData.id).catch(() => []),
      api.colleges.getCodeHistory(collegeData.id).catch(() => []),
    ]).then(([sh, ch]) => {
      if (active) {
        if (Array.isArray(sh) && sh.length > 0) setStatusHistory(sh);
        if (Array.isArray(ch) && ch.length > 0) setCodeHistory(ch);
      }
    });

    return () => {
      active = false;
    };
  }, [collegeData.code, collegeData.id]);

  const handleCollegeReport = async (policy: "standard_progress" | "intelligence" | "audit") => {
    setDownloadingReport(policy);
    try {
      const res = await api.reports.generate({
        reportType: `College Progress Report — ${collegeData.code}`,
        collegeCode: collegeData.code,
        policy,
        format: "csv",
      });

      const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${collegeData.code}_${policy}_report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Generated & downloaded clean report for ${collegeData.name} (${policy} policy).`);
    } catch (e: any) {
      toast.error(e?.message ?? "Report generation failed.");
    } finally {
      setDownloadingReport(null);
    }
  };

  const departments = [
    { code: "CSE", name: "Computer Science & Engineering", students: 480, sections: 4, hod: "Dr. A. Sharma" },
    { code: "ISE", name: "Information Science & Engineering", students: 340, sections: 3, hod: "Dr. P. Hegde" },
    { code: "ECE", name: "Electronics & Communication", students: 290, sections: 3, hod: "Dr. K. Raman" },
    { code: "AIDS", name: "Artificial Intelligence & Data Science", students: 180, sections: 2, hod: "Dr. S. Nair" },
  ];

  const collegeAudit = AUDIT.filter(
    (a) => a.target === collegeData.code || a.target.startsWith(collegeData.code) || a.target.startsWith("SMP")
  ).slice(0, 8);

  const collegeFeatures = [
    { key: "ai_diagnostics", label: "AI Diagnostic Engine & Automated Grading", status: true, description: "Automated analysis of student coding submissions and benchmark testing." },
    { key: "coding_sandbox", label: "Online Coding Evaluation Sandbox", status: true, description: "Multi-language in-browser execution with real-time verdicts." },
    { key: "live_proctoring", label: "Automated Assessment Proctoring", status: true, description: "Tab-switch detection, browser lockdown, and diagnostic integrity enforcement." },
    { key: "pathway_engine", label: "Dynamic Career Pathway Recommendations", status: true, description: "Curated learning paths tailored to identified employability skill gaps." },
    { key: "placement_portal", label: "Placement Drive & Recruiter Integration", status: false, description: "Direct recruiter access to student verified employability dossiers." },
  ];

  return (
    <div className="space-y-6">
      <Link
        to="/admin/colleges"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Colleges Directory
      </Link>

      <PageHeader
        title={collegeData.name}
        desc={`Institutional Code: ${collegeData.code} · Registered ${fmt(collegeData.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <CollegeStatusBadge status={collegeData.status} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusDialogOpen(true)}
              className="gap-1.5 text-xs"
            >
              <PauseCircle className="h-3.5 w-3.5 text-primary" /> Update Status
            </Button>
            <Button asChild variant="default" size="sm" className="gap-1.5 text-xs">
              <Link to="/admin/intelligence">
                <Sparkles className="h-3.5 w-3.5" /> View Intelligence Drill-Down
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-7 w-full h-10">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="intelligence" className="text-xs">Intelligence</TabsTrigger>
          <TabsTrigger value="structure" className="text-xs">Academic Structure</TabsTrigger>
          <TabsTrigger value="accounts" className="text-xs">Accounts</TabsTrigger>
          <TabsTrigger value="features" className="text-xs">Feature Availability</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">Activity & History</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs">Reports & Exports</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-4">
            <Metric label="Campuses" value={collegeData.campuses} />
            <Metric label="Total Students" value={collegeData.students} />
            <Metric label="Certified Trainers" value={collegeData.trainers} />
            <Metric label="Academic Batches" value="12 Active" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Institutional Governance & Lifecycle">
              <dl className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <dt className="text-muted-foreground">College Name</dt>
                  <dd className="font-medium text-foreground mt-0.5">{collegeData.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Institution Code</dt>
                  <dd className="font-mono font-medium text-foreground mt-0.5">{collegeData.code}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Current Lifecycle Status</dt>
                  <dd className="mt-0.5">
                    <CollegeStatusBadge status={collegeData.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Onboarding Date</dt>
                  <dd className="font-medium text-foreground mt-0.5">{fmt(collegeData.createdAt)}</dd>
                </div>
                <div className="col-span-2 border-t border-border pt-3">
                  <dt className="text-muted-foreground">Last Status Changed</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {collegeData.statusChangedAt ? fmt(collegeData.statusChangedAt) : "Initial"} · by {collegeData.statusChangedBy || "System"}
                  </dd>
                </div>
                {collegeData.statusReason && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Status Reason / Rationale</dt>
                    <dd className="text-foreground mt-0.5 italic bg-muted/40 p-2 rounded text-[11px]">
                      "{collegeData.statusReason}"
                    </dd>
                  </div>
                )}
                {collegeData.previousCodes && collegeData.previousCodes.length > 0 && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Previous Historical Codes</dt>
                    <dd className="font-mono text-muted-foreground mt-0.5 text-xs">
                      {collegeData.previousCodes.join(", ")}
                    </dd>
                  </div>
                )}
              </dl>
            </Panel>

            <Panel title="Operational Health & Engagement Policy">
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-muted-foreground">Data Ingestion Status</span>
                  {collegeData.status === "active" && (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Live Ingestion Active</span>
                  )}
                  {collegeData.status === "hold" && (
                    <span className="font-semibold text-amber-600 dark:text-amber-400">Ingestion Paused / Buffered</span>
                  )}
                  {collegeData.status === "deactive" && (
                    <span className="font-semibold text-rose-600 dark:text-rose-400">Ingestion Disabled</span>
                  )}
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-muted-foreground">Active Skill Diagnostics</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">4 Assessments Running</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">System Audit Health</span>
                  <span className="font-semibold text-foreground">Synchronized</span>
                </div>
              </div>
            </Panel>
          </div>
        </TabsContent>

        {/* Tab 2: Intelligence */}
        <TabsContent value="intelligence" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Institutional Employability & Diagnostic Intelligence</h3>
              <p className="text-xs text-muted-foreground">
                Authoritative multi-tiered skill assessment partitions computed by the Ziphyrus Intelligence Engine.
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
              <Link to="/admin/intelligence">
                <ExternalLink className="h-3.5 w-3.5" /> Open Full 6-Level Drill-Down
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <CollegeProgressDonutChart
              title={`Overall Progress — ${collegeData.code}`}
              subtitle="Distribution of cohort milestone completion"
              centerLabel="Students"
              centerSublabel="Cohorts"
              data={chartsData?.overallProgress || [
                { name: "On Track", value: 45, color: "#10b981" },
                { name: "Behind", value: 25, color: "#f59e0b" },
                { name: "Advanced", value: 20, color: "#3b82f6" },
                { name: "At Risk", value: 10, color: "#ef4444" },
              ]}
            />

            <CollegeProgressDonutChart
              title={`Readiness Bands — ${collegeData.code}`}
              subtitle="Employability benchmark classification"
              centerLabel="Evaluated"
              centerSublabel="Candidates"
              data={chartsData?.readinessBands || [
                { name: "High Readiness", value: 38, color: "#10b981" },
                { name: "Medium Readiness", value: 42, color: "#3b82f6" },
                { name: "Needs Attention", value: 20, color: "#f59e0b" },
              ]}
            />
          </div>
        </TabsContent>

        {/* Tab 3: Academic Structure */}
        <TabsContent value="structure" className="space-y-6">
          <Panel title="Configured Academic Departments & Branches">
            <div className="divide-y divide-border">
              {departments.map((dept) => (
                <div key={dept.code} className="flex items-center justify-between py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground">{dept.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">{dept.code}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Head of Department: {dept.hod}</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-medium text-foreground">{dept.students} Students</span>
                    <p className="text-[10px] text-muted-foreground">{dept.sections} Active Sections</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </TabsContent>

        {/* Tab 4: Relevant Accounts */}
        <TabsContent value="accounts" className="space-y-6">
          <Panel title={`Institutional Accounts Roster (${users.length} sample accounts)`}>
            <ul className="divide-y divide-border text-xs">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="font-medium text-foreground">{u.name}</span>
                    <p className="text-[11px] text-muted-foreground font-mono">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px] capitalize">{u.role}</Badge>
                    <CollegeStatusBadge status={u.status} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        {/* Tab 5: Feature Availability */}
        <TabsContent value="features" className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4 text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> Feature Governance Architectural Invariant
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Super Admin retains full visibility across platform features, while Editor maintains role authority over feature enablement toggles.
            </p>
          </div>

          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {collegeFeatures.map((feat) => (
              <div key={feat.key} className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs text-foreground">{feat.label}</span>
                    <Badge variant={feat.status ? "secondary" : "outline"} className="text-[10px]">
                      {feat.status ? "Enabled for Campus" : "Editor Disabled"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{feat.description}</p>
                </div>
                <div>
                  {feat.status ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="h-4 w-4" /> Active
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Inactive</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab 6: Activity History & Changes */}
        <TabsContent value="activity" className="space-y-6">
          <Panel title="College Lifecycle Status Transitions History">
            <CollegeStatusHistoryTable history={statusHistory} />
          </Panel>

          {codeHistory.length > 0 && (
            <Panel title="College Code Modifications History">
              <CollegeCodeHistoryTable history={codeHistory} />
            </Panel>
          )}

          <Panel title="Recent Platform Audit Logs for Institution">
            <ul className="divide-y divide-border text-xs">
              {collegeAudit.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5">
                  <div className="space-y-0.5">
                    <span className="font-mono text-xs font-semibold text-foreground">{a.action}</span>
                    <p className="text-[11px] text-muted-foreground">
                      Actor: <span className="font-medium text-foreground">{a.actor}</span> · Target: {a.target}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground">{fmt(a.at)}</span>
                    <div className="mt-0.5">
                      <Badge variant="outline" className="text-[10px] capitalize">{a.severity}</Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        {/* Tab 7: Reports & Exports */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between">
              <div>
                <Badge variant="outline" className="text-[10px]">Clean Standard</Badge>
                <h4 className="mt-2 font-semibold text-xs text-foreground">Standard Progress Report</h4>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Clean presentation export without internal editor override flags. Ready for academic partners.
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                disabled={downloadingReport === "standard_progress"}
                onClick={() => handleCollegeReport("standard_progress")}
                className="mt-4 h-8 gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" /> Export Clean CSV
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between">
              <div>
                <Badge variant="secondary" className="text-[10px]">Intelligence</Badge>
                <h4 className="mt-2 font-semibold text-xs text-foreground">Diagnostic Intelligence Report</h4>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Official diagnostic test scores, coding problems solved, and calculated skill benchmarks.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={downloadingReport === "intelligence"}
                onClick={() => handleCollegeReport("intelligence")}
                className="mt-4 h-8 gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" /> Export Intelligence CSV
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between">
              <div>
                <Badge variant="destructive" className="text-[10px]">Audit</Badge>
                <h4 className="mt-2 font-semibold text-xs text-foreground">Modification & Provenance Audit</h4>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Complete history of authorized Editor changes, before/after diffs, and mandatory justifications.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={downloadingReport === "audit"}
                onClick={() => handleCollegeReport("audit")}
                className="mt-4 h-8 gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" /> Export Audit CSV
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <CollegeStatusChangeDialog
        college={collegeData}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onSuccess={(updated) => {
          setCollegeData({ ...collegeData, ...updated });
          refreshCollege();
        }}
        isEditor={false}
      />
    </div>
  );
}
