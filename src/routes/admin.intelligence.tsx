import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Code2,
  GraduationCap,
  HelpCircle,
  History,
  Layers,
  LineChart,
  Scale,
  School,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
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
import { PageHeader, Panel } from "@/features/super-admin/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CollegeProgressDonutChart } from "@/components/charts/college-progress-donut";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/admin/intelligence")({
  head: () => ({
    meta: [
      { title: "College Intelligence — Ziphyrus X Super Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CollegeIntelligencePage,
});

export function CollegeIntelligencePage() {
  // Layer / View Mode state: Authoritative (Layer B), Adjusted Reporting (Layer C), or Reconciliation (Layer B vs C)
  const [viewMode, setViewMode] = useState<"authoritative" | "adjusted" | "reconciliation">("authoritative");

  // Drill-down selection states
  const [selectedLevel, setSelectedLevel] = useState<"platform" | "college" | "branch" | "year" | "section">("platform");
  const [selectedCollege, setSelectedCollege] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Available options
  const [collegesList, setCollegesList] = useState<{ code: string; name: string }[]>([]);
  const [branchesList, setBranchesList] = useState<string[]>([]);
  const [yearsList, setYearsList] = useState<string[]>([]);
  const [sectionsList, setSectionsList] = useState<string[]>([]);

  // Fetched data state
  const [loading, setLoading] = useState(true);
  const [platformData, setPlatformData] = useState<any>(null);
  const [levelData, setLevelData] = useState<any>(null);
  const [studentDetail, setStudentDetail] = useState<any>(null);
  const [reconciliationData, setReconciliationData] = useState<any>(null);
  const [provenanceLedger, setProvenanceLedger] = useState<any[]>([]);
  const [metricRegistry, setMetricRegistry] = useState<any[]>([]);

  // Fetch data function parameterized by scope and current view mode
  const fetchCurrentScopeData = async (
    level = selectedLevel,
    colCode = selectedCollege,
    branch = selectedBranch,
    year = selectedYear,
    section = selectedSection,
    view = viewMode
  ) => {
    setLoading(true);
    const viewOpt = view === "reconciliation" ? "adjusted" : view;

    try {
      if (level === "platform") {
        const plat = await api.intelligence.getPlatform({ view: viewOpt });
        setPlatformData(plat);
        setLevelData(null);
      } else if (level === "college") {
        const data = await api.intelligence.getCollege(colCode, { view: viewOpt });
        setLevelData(data);
        if (data?.departments) {
          setBranchesList(data.departments.map((d: any) => d.department));
        }
      } else if (level === "branch") {
        const data = await api.intelligence.getBranch(colCode, branch, { view: viewOpt });
        setLevelData(data);
        if (data?.years) {
          setYearsList(data.years.map((y: any) => y.year));
        }
      } else if (level === "year") {
        const data = await api.intelligence.getYear(colCode, branch, year, { view: viewOpt });
        setLevelData(data);
        if (data?.sections) {
          setSectionsList(data.sections.map((s: any) => s.section));
        }
      } else if (level === "section") {
        const data = await api.intelligence.getSection(colCode, branch, year, section, { view: viewOpt });
        setLevelData(data);
      }

      // If in reconciliation mode, also fetch reconciliation comparison and provenance
      if (view === "reconciliation") {
        const recon = await api.intelligence.getReconciliation({
          scope: level,
          collegeCode: colCode || undefined,
          department: branch || undefined,
          year: year || undefined,
          section: section || undefined,
        });
        setReconciliationData(recon);
      }
    } catch {
      // Handle error gracefully
    } finally {
      setLoading(false);
    }
  };

  // Initial load: Platform data, list of colleges, metric registry, and provenance ledger
  useEffect(() => {
    let active = true;
    Promise.all([
      api.intelligence.getPlatform({ view: "authoritative" }),
      api.colleges.list(),
      api.intelligence.getMetrics(),
      api.intelligence.getProvenance(),
    ])
      .then(([plat, cols, metrics, prov]) => {
        if (active) {
          setPlatformData(plat);
          if (Array.isArray(cols)) {
            setCollegesList(cols.map((c: any) => ({ code: c.code, name: c.name })));
          }
          if (Array.isArray(metrics)) {
            setMetricRegistry(metrics);
          }
          if (Array.isArray(prov)) {
            setProvenanceLedger(prov);
          }
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

  // When view mode changes, reload current scope
  const handleViewModeChange = (newMode: "authoritative" | "adjusted" | "reconciliation") => {
    setViewMode(newMode);
    fetchCurrentScopeData(selectedLevel, selectedCollege, selectedBranch, selectedYear, selectedSection, newMode);
  };

  // When college changes, fetch college intelligence and update available branches
  const handleCollegeChange = async (collegeCode: string) => {
    if (!collegeCode || collegeCode === "platform") {
      setSelectedLevel("platform");
      setSelectedCollege("");
      setSelectedBranch("");
      setSelectedYear("");
      setSelectedSection("");
      fetchCurrentScopeData("platform", "", "", "", "", viewMode);
      return;
    }

    setSelectedCollege(collegeCode);
    setSelectedLevel("college");
    setSelectedBranch("");
    setSelectedYear("");
    setSelectedSection("");
    fetchCurrentScopeData("college", collegeCode, "", "", "", viewMode);
  };

  // When branch/department changes
  const handleBranchChange = async (dept: string) => {
    if (!dept) return;
    setSelectedBranch(dept);
    setSelectedLevel("branch");
    setSelectedYear("");
    setSelectedSection("");
    fetchCurrentScopeData("branch", selectedCollege, dept, "", "", viewMode);
  };

  // When academic year changes
  const handleYearChange = async (year: string) => {
    if (!year) return;
    setSelectedYear(year);
    setSelectedLevel("year");
    setSelectedSection("");
    fetchCurrentScopeData("year", selectedCollege, selectedBranch, year, "", viewMode);
  };

  // When section changes
  const handleSectionChange = async (sec: string) => {
    if (!sec) return;
    setSelectedSection(sec);
    setSelectedLevel("section");
    fetchCurrentScopeData("section", selectedCollege, selectedBranch, selectedYear, sec, viewMode);
  };

  // View individual student profile
  const handleViewStudent = async (studentId: string) => {
    setSelectedStudentId(studentId);
    try {
      const detail = await api.intelligence.getStudent(studentId, {
        view: viewMode === "reconciliation" ? "adjusted" : viewMode,
      });
      setStudentDetail(detail);
    } catch {
      // fallback
    }
  };

  // Active metrics to display
  const currentMetrics = selectedLevel === "platform" ? platformData : levelData;

  const radarData = [
    { subject: "Technical", score: currentMetrics?.technicalAvg ?? 0, fullMark: 100 },
    { subject: "Aptitude", score: currentMetrics?.aptitudeAvg ?? 0, fullMark: 100 },
    { subject: "Verbal", score: currentMetrics?.verbalAvg ?? 0, fullMark: 100 },
    { subject: "Soft Skills", score: currentMetrics?.softSkillsAvg ?? 0, fullMark: 100 },
    { subject: "Coding", score: currentMetrics?.codingAvg ?? 0, fullMark: 100 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="College Intelligence & Employability Analytics"
        desc="Authoritative intelligence drill-down across Platform → College → Branch → Year → Section → Student. Strictly computed by the Intelligence Engine."
      />

      {/* Source of Truth Layer & View Switcher */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Data Layer & Intelligence Perspective</h3>
            <p className="text-xs text-muted-foreground">Select between immutable authoritative evidence, adjusted reporting, or comparative reconciliation</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={viewMode === "authoritative" ? "default" : "outline"}
            onClick={() => handleViewModeChange("authoritative")}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Layer B: Authoritative
          </Button>

          <Button
            size="sm"
            variant={viewMode === "adjusted" ? "default" : "outline"}
            onClick={() => handleViewModeChange("adjusted")}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Layer C: Adjusted Reporting
          </Button>

          <Button
            size="sm"
            variant={viewMode === "reconciliation" ? "default" : "outline"}
            onClick={() => handleViewModeChange("reconciliation")}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Scale className="h-3.5 w-3.5" />
            Side-by-Side Reconciliation
          </Button>
        </div>
      </div>

      {/* Engine Status & Active Layer Sub-Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px]">
            Engine: v2.6-engine
          </Badge>
          <Badge variant="outline" className="text-[11px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            ● Fresh Snapshot
          </Badge>
          {viewMode === "adjusted" && (
            <Badge variant="secondary" className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              ⚡ Adjusted Presentation Active
            </Badge>
          )}
          {viewMode === "reconciliation" && (
            <Badge variant="secondary" className="text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              ⚖️ Delta Audit Active
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground text-[11px]">
          Scope: <span className="font-mono font-medium text-foreground capitalize">{selectedLevel}</span>
          {selectedCollege ? ` (${selectedCollege})` : ""}
          {selectedBranch ? ` / ${selectedBranch}` : ""}
          {selectedYear ? ` / ${selectedYear}` : ""}
          {selectedSection ? ` / ${selectedSection}` : ""}
        </div>
      </div>

      {/* Side-by-Side Reconciliation View (Super Admin Layer B vs Layer C) */}
      {viewMode === "reconciliation" && (
        <div className="space-y-6">
          <Panel
            title="Layer B vs Layer C — Side-by-Side Intelligence Reconciliation"
            desc={`Comparing authoritative evidence against adjusted reporting totals for ${selectedLevel.toUpperCase()} scope (${reconciliationData?.scopeId ?? "platform"}).`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground bg-muted/30">
                    <th className="p-3 font-medium">Employability Metric</th>
                    <th className="p-3 font-medium">Layer B: Authoritative</th>
                    <th className="p-3 font-medium">Layer C: Adjusted Reporting</th>
                    <th className="p-3 font-medium">Delta (Δ)</th>
                    <th className="p-3 font-medium">Calculation State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {reconciliationData?.comparison ? (
                    Object.entries(reconciliationData.comparison).map(([metricKey, item]: [string, any]) => {
                      const regMetric = metricRegistry.find(
                        (m) => m.metric_id === metricKey || m.name.toLowerCase().includes(metricKey.toLowerCase())
                      );
                      const metricTitle = regMetric ? regMetric.name : metricKey.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                      const hasDelta = item.delta !== null && Math.abs(item.delta) > 0.01;
                      return (
                        <tr key={metricKey} className="hover:bg-muted/40">
                          <td className="p-3 font-medium text-foreground">
                            {metricTitle}
                            <span className="block font-mono text-[11px] text-muted-foreground">{metricKey}</span>
                          </td>
                          <td className="p-3 font-mono font-semibold text-foreground">
                            {item.authoritative !== null ? `${item.authoritative}%` : "—"}
                          </td>
                          <td className="p-3 font-mono font-semibold text-foreground">
                            {item.adjusted !== null ? `${item.adjusted}%` : "—"}
                          </td>
                          <td className="p-3">
                            {hasDelta ? (
                              <Badge
                                variant="outline"
                                className={`font-mono text-xs ${
                                  item.delta > 0
                                    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                    : "border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                                }`}
                              >
                                {item.delta > 0 ? `+${item.delta}%` : `${item.delta}%`}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground font-mono">0.0% (Matched)</span>
                            )}
                          </td>
                          <td className="p-3 text-xs">
                            {item.hasOverride ? (
                              <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                Recalculated from Overrides
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                Raw Authoritative
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-xs text-muted-foreground">
                        Loading reconciliation delta models...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Active Overrides & Recalculation Provenance */}
          <Panel
            title="Active Overrides & Recalculation Provenance Ledger"
            desc="Complete traceability of who initiated display modifications, required justification reasons, and affected scope branches."
          >
            {reconciliationData?.activeOverrides && reconciliationData.activeOverrides.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground bg-muted/30">
                      <th className="p-3 font-medium">Target Entity</th>
                      <th className="p-3 font-medium">Scope</th>
                      <th className="p-3 font-medium">Original → Adjusted</th>
                      <th className="p-3 font-medium">Actor</th>
                      <th className="p-3 font-medium">Mandatory Justification</th>
                      <th className="p-3 font-medium">Propagation Chain</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {reconciliationData.activeOverrides.map((prov: any) => (
                      <tr key={prov.id} className="hover:bg-muted/40">
                        <td className="p-3">
                          <span className="font-mono text-xs font-semibold">{prov.targetId}</span>
                          <span className="block text-[11px] text-muted-foreground capitalize">{prov.targetType}</span>
                        </td>
                        <td className="p-3 font-mono text-xs">{prov.metricKey}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <span className="text-muted-foreground line-through">{prov.originalValue}%</span>
                            <span>→</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">{prov.adjustedValue}%</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">
                          {prov.editorLogin}
                        </td>
                        <td className="p-3 text-xs max-w-xs text-foreground">
                          {prov.mandatoryReason}
                        </td>
                        <td className="p-3 text-[11px] text-muted-foreground">
                          <div className="flex flex-wrap gap-1">
                            {prov.affectedScopes.map((sc: string) => (
                              <Badge key={sc} variant="outline" className="text-[10px] capitalize">
                                {sc}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No active overrides currently affecting this scope. Values strictly reflect authoritative Layer B calculations.
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* Hierarchy Drill-Down Selector Bar */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-foreground">Hierarchy Scope:</span>

          {/* 1. College Selector */}
          <Select
            value={selectedCollege || "platform"}
            onValueChange={handleCollegeChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Platform Overview" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="platform">🌐 Platform Overview</SelectItem>
              {collegesList.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 2. Branch Selector (Enabled when College is picked) */}
          {selectedCollege && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedBranch} onValueChange={handleBranchChange}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {branchesList.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {/* 3. Year Selector (Enabled when Branch is picked) */}
          {selectedBranch && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearsList.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {/* 4. Section Selector (Enabled when Year is picked) */}
          {selectedYear && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedSection} onValueChange={handleSectionChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent>
                  {sectionsList.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {selectedLevel !== "platform" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCollegeChange("platform")}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              Reset to Platform
            </Button>
          )}
        </div>
      </div>

      {/* Intelligence KPI Summary Grid */}
      <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
        <div className="bg-card p-4">
          <p className="text-xs text-muted-foreground">Employability Readiness</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold">
              {currentMetrics?.averageReadiness ?? 0}%
            </span>
            <Badge
              variant={
                (currentMetrics?.averageReadiness ?? 0) >= 75
                  ? "outline"
                  : (currentMetrics?.averageReadiness ?? 0) >= 60
                  ? "secondary"
                  : "destructive"
              }
              className="text-[10px]"
            >
              {(currentMetrics?.averageReadiness ?? 0) >= 75
                ? "High Readiness"
                : (currentMetrics?.averageReadiness ?? 0) >= 60
                ? "Moderate"
                : "Needs Attention"}
            </Badge>
          </div>
        </div>

        <div className="bg-card p-4">
          <p className="text-xs text-muted-foreground">Technical Benchmark</p>
          <p className="mt-1 font-display text-2xl font-semibold text-chart-1">
            {currentMetrics?.technicalAvg ?? "—"}%
          </p>
        </div>

        <div className="bg-card p-4">
          <p className="text-xs text-muted-foreground">Aptitude & Logic</p>
          <p className="mt-1 font-display text-2xl font-semibold text-chart-2">
            {currentMetrics?.aptitudeAvg ?? "—"}%
          </p>
        </div>

        <div className="bg-card p-4">
          <p className="text-xs text-muted-foreground">Verbal & Communication</p>
          <p className="mt-1 font-display text-2xl font-semibold text-chart-3">
            {currentMetrics?.verbalAvg ?? "—"}%
          </p>
        </div>

        <div className="bg-card p-4">
          <p className="text-xs text-muted-foreground">Soft Skills</p>
          <p className="mt-1 font-display text-2xl font-semibold text-chart-4">
            {currentMetrics?.softSkillsAvg ?? "—"}%
          </p>
        </div>

        <div className="bg-card p-4">
          <p className="text-xs text-muted-foreground">Coding Competency</p>
          <p className="mt-1 font-display text-2xl font-semibold text-chart-5">
            {currentMetrics?.codingAvg ?? "—"}%
          </p>
        </div>
      </div>

      {/* Visual Intelligence & Interactive Donut Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <CollegeProgressDonutChart
          title="Employability Readiness Distribution"
          scope={selectedCollege ? `${selectedCollege} Cohort` : "Platform Scope"}
          centerLabel={`${currentMetrics?.averageReadiness ?? 76}%`}
          centerSublabel="Avg Readiness"
          data={[
            {
              name: "High Readiness (>=75%)",
              value: currentMetrics?.readinessBands?.high ?? 0,
              color: "#10b981",
              description: "Job-ready and cleared core CS diagnostics",
            },
            {
              name: "Moderate Readiness (60-74%)",
              value: currentMetrics?.readinessBands?.medium ?? 0,
              color: "#f59e0b",
              description: "Requires targeted aptitude & coding review",
            },
            {
              name: "Intervention Required (<60%)",
              value: currentMetrics?.readinessBands?.needsAttention ?? 0,
              color: "#ef4444",
              description: "Trainer action plan mandatory",
            },
          ]}
        />

        <CollegeProgressDonutChart
          title="Assessment & Diagnostic Progress"
          scope={selectedCollege ? `${selectedCollege} Assessments` : "Platform Assessments"}
          centerLabel={`${(currentMetrics?.readinessBands?.high ?? 0) + (currentMetrics?.readinessBands?.medium ?? 0) + (currentMetrics?.readinessBands?.needsAttention ?? 0)}`}
          centerSublabel="Assessed Cohort"
          data={[
            {
              name: "Diagnostics Cleared",
              value: Math.max(1, currentMetrics?.readinessBands?.high ?? 0),
              color: "#10b981",
              description: "Cleared multiple domain diagnostic benchmarks",
            },
            {
              name: "In Progress / Single Test",
              value: Math.max(1, currentMetrics?.readinessBands?.medium ?? 0),
              color: "#3b82f6",
              description: "Active diagnostic evaluation underway",
            },
            {
              name: "Pending Assessment",
              value: currentMetrics?.readinessBands?.needsAttention ?? 0,
              color: "#94a3b8",
              description: "Awaiting diagnostic completion",
            },
          ]}
        />

        <Panel title="Skill Domain Spider / Radar Benchmark">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" stroke="var(--muted-foreground)" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--border)" fontSize={10} />
                <Radar
                  name="Skill Score"
                  dataKey="score"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Level-Specific Detail Tables */}
      {selectedLevel === "platform" && platformData?.colleges && (
        <Panel title="Cross-College Employability Rankings">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-3 font-medium">College Name</th>
                  <th className="pb-3 font-medium">Code</th>
                  <th className="pb-3 font-medium">Students</th>
                  <th className="pb-3 font-medium">Average Readiness</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {platformData.colleges.map((col: any) => (
                  <tr key={col.collegeCode} className="hover:bg-muted/50">
                    <td className="py-3 font-medium text-foreground">{col.collegeName}</td>
                    <td className="py-3 font-mono text-xs">{col.collegeCode}</td>
                    <td className="py-3 text-muted-foreground">{col.studentsCount}</td>
                    <td className="py-3">
                      {col.averageReadiness !== null ? (
                        <span className="font-semibold text-foreground">{col.averageReadiness}%</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending assessment</span>
                      )}
                    </td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCollegeChange(col.collegeCode)}
                        className="h-7 text-xs text-accent hover:underline"
                      >
                        Drill Down →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {selectedLevel === "college" && levelData?.departments && (
        <Panel title={`Departmental Breakdown — ${levelData.collegeName}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-3 font-medium">Department</th>
                  <th className="pb-3 font-medium">Students Sampled</th>
                  <th className="pb-3 font-medium">Avg Readiness</th>
                  <th className="pb-3 font-medium">Coding Avg</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {levelData.departments.map((dept: any) => (
                  <tr key={dept.department} className="hover:bg-muted/50">
                    <td className="py-3 font-medium text-foreground">{dept.department}</td>
                    <td className="py-3 text-muted-foreground">{dept.studentCount}</td>
                    <td className="py-3 font-semibold text-foreground">{dept.averageReadiness}%</td>
                    <td className="py-3 text-muted-foreground">{dept.codingAvg}%</td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBranchChange(dept.department)}
                        className="h-7 text-xs text-accent hover:underline"
                      >
                        Inspect Branch →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {selectedLevel === "branch" && levelData?.years && (
        <Panel title={`Academic Year Breakdown — ${levelData.department}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-3 font-medium">Academic Year</th>
                  <th className="pb-3 font-medium">Students</th>
                  <th className="pb-3 font-medium">Avg Readiness</th>
                  <th className="pb-3 font-medium">Coding Benchmark</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {levelData.years.map((yr: any) => (
                  <tr key={yr.year} className="hover:bg-muted/50">
                    <td className="py-3 font-medium text-foreground">{yr.year}</td>
                    <td className="py-3 text-muted-foreground">{yr.studentCount}</td>
                    <td className="py-3 font-semibold text-foreground">{yr.averageReadiness}%</td>
                    <td className="py-3 text-muted-foreground">{yr.codingAvg}%</td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleYearChange(yr.year)}
                        className="h-7 text-xs text-accent hover:underline"
                      >
                        Inspect Year →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {selectedLevel === "year" && levelData?.sections && (
        <Panel title={`Section Breakdown — ${levelData.year}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-3 font-medium">Section</th>
                  <th className="pb-3 font-medium">Students</th>
                  <th className="pb-3 font-medium">Avg Readiness</th>
                  <th className="pb-3 font-medium">Coding Avg</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {levelData.sections.map((sec: any) => (
                  <tr key={sec.section} className="hover:bg-muted/50">
                    <td className="py-3 font-medium text-foreground">{sec.section}</td>
                    <td className="py-3 text-muted-foreground">{sec.studentCount}</td>
                    <td className="py-3 font-semibold text-foreground">{sec.averageReadiness}%</td>
                    <td className="py-3 text-muted-foreground">{sec.codingAvg}%</td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSectionChange(sec.section)}
                        className="h-7 text-xs text-accent hover:underline"
                      >
                        Inspect Section →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {selectedLevel === "section" && levelData?.students && (
        <Panel title={`Student Roster — ${levelData.section}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-3 font-medium">USN</th>
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Readiness Score</th>
                  <th className="pb-3 font-medium">Coding Solved</th>
                  <th className="pb-3 font-medium">Interventions</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {levelData.students.map((stu: any) => (
                  <tr key={stu.studentId} className="hover:bg-muted/50">
                    <td className="py-3 font-mono text-xs">{stu.usn}</td>
                    <td className="py-3 font-medium text-foreground">{stu.name}</td>
                    <td className="py-3">
                      <Badge
                        variant={
                          stu.readinessBand === "High"
                            ? "outline"
                            : stu.readinessBand === "Medium"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {stu.readinessScore}% ({stu.readinessBand})
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">{stu.problemsSolved} problems</td>
                    <td className="py-3 text-muted-foreground">
                      {stu.interventionsCount > 0 ? (
                        <span className="font-medium text-amber-500">{stu.interventionsCount} active</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewStudent(stu.studentId)}
                        className="h-7 text-xs text-accent hover:underline"
                      >
                        View Full Profile →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Individual Student Profile Drawer */}
      <Sheet open={!!selectedStudentId} onOpenChange={(open) => !open && setSelectedStudentId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {studentDetail && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="font-display text-2xl font-normal">
                  {studentDetail.name}
                </SheetTitle>
                <SheetDescription>
                  USN: <span className="font-mono text-foreground">{studentDetail.usn}</span> · {studentDetail.collegeName}
                </SheetDescription>
              </SheetHeader>

              {/* Readiness Status Card */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Employability Readiness</span>
                  <Badge
                    variant={
                      studentDetail.readinessBand === "High"
                        ? "outline"
                        : studentDetail.readinessBand === "Medium"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {studentDetail.readinessScore}% ({studentDetail.readinessBand})
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded bg-muted/40 p-2">
                    <span className="text-muted-foreground">Department:</span>
                    <p className="font-medium">{studentDetail.department}</p>
                  </div>
                  <div className="rounded bg-muted/40 p-2">
                    <span className="text-muted-foreground">Academic Year:</span>
                    <p className="font-medium">{studentDetail.year} ({studentDetail.section})</p>
                  </div>
                </div>
              </div>

              {/* Skills Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Authoritative Skill Breakdown
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-border p-2">
                    <span className="text-muted-foreground">Technical:</span>
                    <p className="font-mono font-semibold">{studentDetail.skills.technical !== null ? `${studentDetail.skills.technical}%` : "Not Assessed"}</p>
                  </div>
                  <div className="rounded border border-border p-2">
                    <span className="text-muted-foreground">Aptitude:</span>
                    <p className="font-mono font-semibold">{studentDetail.skills.aptitude !== null ? `${studentDetail.skills.aptitude}%` : "Not Assessed"}</p>
                  </div>
                  <div className="rounded border border-border p-2">
                    <span className="text-muted-foreground">Verbal:</span>
                    <p className="font-mono font-semibold">{studentDetail.skills.verbal !== null ? `${studentDetail.skills.verbal}%` : "Not Assessed"}</p>
                  </div>
                  <div className="rounded border border-border p-2">
                    <span className="text-muted-foreground">Soft Skills:</span>
                    <p className="font-mono font-semibold">{studentDetail.skills.softSkills !== null ? `${studentDetail.skills.softSkills}%` : "Not Assessed"}</p>
                  </div>
                </div>
              </div>

              {/* Coding Judge Statistics */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Coding Engine & Judge Verdicts
                </h4>
                <div className="rounded-lg border border-border bg-card p-3 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Problems Solved:</span>
                    <span className="font-mono font-semibold">{studentDetail.coding.problemsSolved}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Judge Score:</span>
                    <span className="font-mono font-semibold">{studentDetail.coding.score}/100</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
                    <span className="text-emerald-500 font-medium">{studentDetail.coding.verdicts.accepted} Accepted</span>
                    <span className="text-rose-500 font-medium">{studentDetail.coding.verdicts.wrongAnswer} Wrong Answer</span>
                    <span className="text-amber-500 font-medium">{studentDetail.coding.verdicts.timeLimit} TLE</span>
                  </div>
                </div>
              </div>

              {/* Assessment History */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Diagnostic History
                </h4>
                {studentDetail.assessmentHistory.length > 0 ? (
                  <ul className="space-y-2 text-xs">
                    {studentDetail.assessmentHistory.map((asm: any, idx: number) => (
                      <li key={idx} className="flex items-center justify-between rounded border border-border p-2">
                        <div>
                          <p className="font-medium">{asm.assessmentTitle}</p>
                          <span className="text-muted-foreground">{asm.domain}</span>
                        </div>
                        <span className="font-mono font-semibold">{asm.score}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No diagnostics completed yet.</p>
                )}
              </div>

              {/* Action Plan Interventions */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Interventions
                </h4>
                {studentDetail.interventions.length > 0 ? (
                  <ul className="space-y-2 text-xs">
                    {studentDetail.interventions.map((int: any) => (
                      <li key={int.id} className="rounded border border-amber-500/40 bg-amber-500/5 p-3">
                        <p className="font-medium text-foreground">{int.title}</p>
                        <div className="mt-1 flex justify-between text-muted-foreground text-[11px]">
                          <span>Assigned: {int.trainerName}</span>
                          <span className="font-semibold text-amber-500">{int.status}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No active interventions required.</p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
