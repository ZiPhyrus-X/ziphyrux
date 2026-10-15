import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  History,
  Layers,
  Percent,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  TrendingDown,
  TrendingUp,
  Undo2,
  UserCheck,
  Users,
} from "lucide-react";
import { PageHeader, Panel, fmt } from "@/features/editor/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CollegeProgressDonutChart } from "@/components/charts/college-progress-donut";
import { api } from "@/lib/api/client";
import { authService } from "@/lib/auth/service";

export const Route = createFileRoute("/editor/overrides")({
  head: () => ({
    meta: [
      { title: "Visible-Value Overrides — Ziphyrus X Editor" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VisibleOverridesPage,
});

interface AcademicScopeDetails {
  scopeLevel: "student" | "section" | "semester" | "branch" | "year" | "college";
  collegeCode: string;
  collegeName?: string;
  year?: string;
  department?: string;
  semester?: string;
  section?: string;
  studentId?: string;
  studentName?: string;
  entityCanonical?: string;
}

interface OverrideItem {
  id: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  metricId?: string;
  actualValue: string;
  visibleValue: string;
  mandatoryReason: string;
  overriddenBy: string;
  editorLogin?: string;
  collegeCode?: string;
  collegeName?: string;
  academicScope?: AcademicScopeDetails;
  effectiveStatus?: "active" | "reverted" | "superseded";
  recalculationStatus?: "completed" | "pending";
  revertedAt?: string;
  revertedBy?: string;
  supersededAt?: string;
  supersededBy?: string;
  calculationVersion?: string;
  createdAt: string;
}

export function VisibleOverridesPage() {
  const session = authService.getSession();
  const currentEditorLogin = session?.user?.loginId || "editor1@ziphyrus.in";

  // Section A State: Overrides History
  const [overrides, setOverrides] = useState<OverrideItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [historyCollegeFilter, setHistoryCollegeFilter] = useState("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [mineOnly, setMineOnly] = useState(true);

  // Modals for Section A
  const [inspectOverride, setInspectOverride] = useState<OverrideItem | null>(null);
  const [revertingOverride, setRevertingOverride] = useState<OverrideItem | null>(null);
  const [reverting, setReverting] = useState(false);

  // Section B State: Cascading Academic Hierarchy
  const [options, setOptions] = useState<{
    colleges: { code: string; name: string }[];
    years: string[];
    departments: string[];
    semesters: string[];
    sections: string[];
    students: { id: string; name: string; usn: string }[];
  }>({
    colleges: [],
    years: [],
    departments: [],
    semesters: [],
    sections: [],
    students: [],
  });

  // Selected Scope Levels (Cascading Order: College -> Year -> Branch -> Semester -> Section -> Student)
  const [selectedCollege, setSelectedCollege] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");

  // Section B Scope Progress & Intelligence Data
  const [scopeProgress, setScopeProgress] = useState<any | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Section B Override Dialog State
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [selectedMetricId, setSelectedMetricId] = useState<string>("met_employability_readiness");
  const [proposedValue, setProposedValue] = useState<string>("");
  const [mandatoryReason, setMandatoryReason] = useState<string>("");
  const [applyingOverride, setApplyingOverride] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ---------------------------------------------------------------------------
  // Load Override History (Section A)
  // ---------------------------------------------------------------------------
  const fetchOverridesHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.editor.overrides.list({
        search: searchQuery || undefined,
        college: historyCollegeFilter !== "all" ? historyCollegeFilter : undefined,
        status: historyStatusFilter !== "all" ? historyStatusFilter : undefined,
        mine: mineOnly,
      });
      setOverrides(res as OverrideItem[]);
    } catch (e: any) {
      toast.error("Failed to load override history: " + (e?.message || "Unknown error"));
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchOverridesHistory();
  }, [searchQuery, historyCollegeFilter, historyStatusFilter, mineOnly]);

  // ---------------------------------------------------------------------------
  // Load Initial College & Scope Options (Section B)
  // ---------------------------------------------------------------------------
  const fetchCascadingOptions = async (
    collegeCode?: string,
    year?: string,
    department?: string,
    semester?: string,
    section?: string
  ) => {
    try {
      const res = await api.editor.overrides.getOptions({
        collegeCode: collegeCode || undefined,
        year: year !== "all" ? year : undefined,
        department: department !== "all" ? department : undefined,
        semester: semester !== "all" ? semester : undefined,
        section: section !== "all" ? section : undefined,
      });
      setOptions(res);
      // Auto-select first college if not selected yet
      if (!selectedCollege && res.colleges.length > 0) {
        setSelectedCollege(res.colleges[0].code);
      }
    } catch (e: any) {
      console.error("Failed to load cascading options", e);
    }
  };

  useEffect(() => {
    fetchCascadingOptions(
      selectedCollege || undefined,
      selectedYear,
      selectedDepartment,
      selectedSemester,
      selectedSection
    );
  }, [selectedCollege, selectedYear, selectedDepartment, selectedSemester, selectedSection]);

  // ---------------------------------------------------------------------------
  // Load Scope Progress (Section B)
  // ---------------------------------------------------------------------------
  const fetchScopeProgress = async () => {
    if (!selectedCollege) {
      setScopeProgress(null);
      return;
    }
    setLoadingProgress(true);
    try {
      const progress = await api.editor.overrides.getScopeProgress({
        collegeCode: selectedCollege,
        year: selectedYear !== "all" ? selectedYear : undefined,
        department: selectedDepartment !== "all" ? selectedDepartment : undefined,
        semester: selectedSemester !== "all" ? selectedSemester : undefined,
        section: selectedSection !== "all" ? selectedSection : undefined,
        studentId: selectedStudent !== "all" ? selectedStudent : undefined,
      });
      setScopeProgress(progress);
    } catch (e: any) {
      toast.error("Failed to load scope progress: " + (e?.message || "Unknown error"));
    } finally {
      setLoadingProgress(false);
    }
  };

  useEffect(() => {
    fetchScopeProgress();
  }, [
    selectedCollege,
    selectedYear,
    selectedDepartment,
    selectedSemester,
    selectedSection,
    selectedStudent,
  ]);

  // ---------------------------------------------------------------------------
  // Cascading Selection Handlers (Order: College -> Year -> Branch -> Semester -> Section -> Student)
  // ---------------------------------------------------------------------------
  const handleCollegeChange = (val: string) => {
    setSelectedCollege(val);
    setSelectedYear("all");
    setSelectedDepartment("all");
    setSelectedSemester("all");
    setSelectedSection("all");
    setSelectedStudent("all");
  };

  const handleYearChange = (val: string) => {
    setSelectedYear(val);
    setSelectedDepartment("all");
    setSelectedSemester("all");
    setSelectedSection("all");
    setSelectedStudent("all");
  };

  const handleDepartmentChange = (val: string) => {
    setSelectedDepartment(val);
    setSelectedSemester("all");
    setSelectedSection("all");
    setSelectedStudent("all");
  };

  const handleSemesterChange = (val: string) => {
    setSelectedSemester(val);
    setSelectedSection("all");
    setSelectedStudent("all");
  };

  const handleSectionChange = (val: string) => {
    setSelectedSection(val);
    setSelectedStudent("all");
  };

  const handleStudentChange = (val: string) => {
    setSelectedStudent(val);
  };

  const resetAllScopeFilters = () => {
    if (options.colleges.length > 0) {
      setSelectedCollege(options.colleges[0].code);
    }
    setSelectedYear("all");
    setSelectedDepartment("all");
    setSelectedSemester("all");
    setSelectedSection("all");
    setSelectedStudent("all");
  };

  // ---------------------------------------------------------------------------
  // Revert Override Handler (Section A)
  // ---------------------------------------------------------------------------
  const handleConfirmRevert = async () => {
    if (!revertingOverride) return;
    setReverting(true);
    try {
      await api.editor.overrides.revert(revertingOverride.id);
      toast.success(
        `Override for ${revertingOverride.entityType} ${revertingOverride.entityId} reverted successfully. Underlying authoritative values restored.`
      );
      setRevertingOverride(null);
      await fetchOverridesHistory();
      await fetchScopeProgress();
    } catch (e: any) {
      toast.error("Failed to revert override: " + (e?.message || "Unknown error"));
    } finally {
      setReverting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Override Dialog & Preview Impact Handlers (Section B)
  // ---------------------------------------------------------------------------
  const openOverrideDialog = () => {
    if (!scopeProgress) return;
    // Set default metric to employability readiness or first eligible metric
    const defaultMet =
      scopeProgress.eligibleMetrics?.find((m: any) => m.id.includes("readiness"))?.id ||
      scopeProgress.eligibleMetrics?.[0]?.id ||
      "met_employability_readiness";
    setSelectedMetricId(defaultMet);

    // Initial proposed value
    const curVal = scopeProgress.displayedReadiness || scopeProgress.authoritativeReadiness || 0;
    setProposedValue(String(Math.round(curVal)));
    setMandatoryReason("");
    setPreviewData(null);
    setOverrideDialogOpen(true);
  };

  // Fetch live preview when proposed value or metric changes
  useEffect(() => {
    if (!overrideDialogOpen || !selectedCollege || !proposedValue) {
      setPreviewData(null);
      return;
    }
    const valNum = parseFloat(proposedValue);
    if (isNaN(valNum) || valNum < 0 || valNum > 100) {
      setPreviewData(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const preview = await api.editor.overrides.preview({
          collegeCode: selectedCollege,
          academicScope: {
            scopeLevel: scopeProgress?.scopeLevel || "college",
            collegeCode: selectedCollege,
            year: selectedYear !== "all" ? selectedYear : undefined,
            department: selectedDepartment !== "all" ? selectedDepartment : undefined,
            semester: selectedSemester !== "all" ? selectedSemester : undefined,
            section: selectedSection !== "all" ? selectedSection : undefined,
            studentId: selectedStudent !== "all" ? selectedStudent : undefined,
          },
          metricId: selectedMetricId,
          proposedValue: valNum,
        });
        setPreviewData(preview);
      } catch (err) {
        setPreviewData(null);
      } finally {
        setLoadingPreview(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [
    overrideDialogOpen,
    selectedMetricId,
    proposedValue,
    selectedCollege,
    selectedYear,
    selectedDepartment,
    selectedSemester,
    selectedSection,
    selectedStudent,
    scopeProgress,
  ]);

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mandatoryReason || mandatoryReason.trim().length < 5) {
      toast.error("A mandatory reason of at least 5 characters is strictly required.");
      return;
    }
    const valNum = parseFloat(proposedValue);
    if (isNaN(valNum) || valNum < 0 || valNum > 100) {
      toast.error("Proposed value must be a valid number between 0 and 100.");
      return;
    }

    setApplyingOverride(true);
    try {
      await api.editor.overrides.createAcademic({
        collegeCode: selectedCollege,
        academicScope: {
          scopeLevel: scopeProgress?.scopeLevel || "college",
          collegeCode: selectedCollege,
          collegeName: scopeProgress?.collegeName,
          year: selectedYear !== "all" ? selectedYear : undefined,
          department: selectedDepartment !== "all" ? selectedDepartment : undefined,
          semester: selectedSemester !== "all" ? selectedSemester : undefined,
          section: selectedSection !== "all" ? selectedSection : undefined,
          studentId: selectedStudent !== "all" ? selectedStudent : undefined,
        },
        metricId: selectedMetricId,
        proposedValue: valNum,
        mandatoryReason: mandatoryReason.trim(),
      });

      toast.success(
        "Visible override recorded successfully. Audit entry created and reporting views recalculated."
      );
      setOverrideDialogOpen(false);
      setProposedValue("");
      setMandatoryReason("");
      await fetchOverridesHistory();
      await fetchScopeProgress();
    } catch (e: any) {
      toast.error("Failed to create override: " + (e?.message || "Unknown error"));
    } finally {
      setApplyingOverride(false);
    }
  };

  // Helper for scope label formatting
  const getReadableScope = (item: OverrideItem) => {
    if (item.academicScope) {
      const { scopeLevel, section, department, year, semester, studentName, studentId } =
        item.academicScope;
      switch (scopeLevel) {
        case "student":
          return `Student: ${studentName || studentId || item.entityId}`;
        case "section":
          return `Section: ${section || item.entityId} (${department || ""})`;
        case "semester":
          return `Semester: ${semester || item.entityId} (${department || ""})`;
        case "branch":
          return `Branch: ${department || item.entityId}`;
        case "year":
          return `Year: ${year || item.entityId}`;
        case "college":
        default:
          return `College: ${item.collegeCode || item.entityId}`;
      }
    }
    return `${item.entityType}: ${item.entityId}`;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Visible-Value Overrides & Intelligence"
        desc="Controlled interface for authorized presentation overrides across institutional scopes. Overrides modify displayed reporting views while strictly preserving underlying authoritative assessments, judge evaluations, and raw telemetry."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchOverridesHistory();
                fetchScopeProgress();
              }}
              disabled={loadingHistory || loadingProgress}
              className="gap-1.5"
            >
              <RefreshCw
                className={`h-4 w-4 ${loadingHistory || loadingProgress ? "animate-spin" : ""}`}
              />
              Refresh Data
            </Button>
          </div>
        }
      />

      {/* Critical Architecture Banner */}
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-foreground flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            Ziphyrus X Architecture & Multi-Layer Data Isolation
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Visible overrides alter displayed presentation values (Layer C) in student, coordinator, and placement
            views. They <strong>never</strong> modify underlying authoritative records (Layer B) or Coding Judge telemetry.
            Every override is permanently captured in the immutable audit trail with actor identification, calculation version{" "}
            <code className="bg-background px-1 py-0.5 rounded text-[11px] font-mono">v2.6-engine</code>, and mandatory rationale.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: OVERRIDE HISTORY & AUDIT TRAIL (PLACED AT TOP OF THE PAGE)     */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                A
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Section A — Override History & Audit Registry
              </h2>
              <Badge variant="secondary" className="font-mono text-xs">
                {overrides.length} records
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Non-deletable audit log of authorized presentation overrides across institutional scopes.
            </p>
          </div>

          {/* Section A Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* My Overrides Switch */}
            <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-md border border-border/60">
              <Switch
                id="mine-filter"
                checked={mineOnly}
                onCheckedChange={setMineOnly}
              />
              <Label htmlFor="mine-filter" className="text-xs cursor-pointer font-medium">
                My Overrides Only
              </Label>
            </div>

            {/* College Filter */}
            <div className="w-44">
              <Select value={historyCollegeFilter} onValueChange={setHistoryCollegeFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Colleges" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Colleges</SelectItem>
                  {options.colleges.map((col) => (
                    <SelectItem key={col.code} value={col.code}>
                      {col.code} — {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-36">
              <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="reverted">Reverted Only</SelectItem>
                  <SelectItem value="superseded">Superseded Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Input */}
            <div className="relative w-48 sm:w-60">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search overrides, actor, reason…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section A Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-muted-foreground font-medium">
                  <th className="py-2.5 px-3">College</th>
                  <th className="py-2.5 px-3">Academic Scope</th>
                  <th className="py-2.5 px-3">Target Metric</th>
                  <th className="py-2.5 px-3 text-right">Original</th>
                  <th className="py-2.5 px-3 text-right">Overridden</th>
                  <th className="py-2.5 px-3 text-center">Delta (Δ)</th>
                  <th className="py-2.5 px-3">Mandatory Reason</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Recalculation</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin inline-block mr-2" />
                      Loading override registry…
                    </td>
                  </tr>
                ) : overrides.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-muted-foreground">
                      No override records found matching the active filters.
                    </td>
                  </tr>
                ) : (
                  overrides.map((ovr) => {
                    const actualNum = parseFloat(ovr.actualValue);
                    const visNum = parseFloat(ovr.visibleValue);
                    const delta =
                      !isNaN(actualNum) && !isNaN(visNum)
                        ? (visNum - actualNum).toFixed(1)
                        : null;
                    const status = ovr.effectiveStatus || "active";
                    const isMine =
                      (ovr.editorLogin || ovr.overriddenBy) === currentEditorLogin;

                    return (
                      <tr
                        key={ovr.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          status === "reverted"
                            ? "opacity-60 bg-muted/10"
                            : status === "superseded"
                            ? "opacity-75 bg-muted/15"
                            : ""
                        }`}
                      >
                        {/* College */}
                        <td className="py-2.5 px-3 font-semibold font-mono whitespace-nowrap">
                          {ovr.collegeCode || "SMP101"}
                        </td>

                        {/* Academic Scope */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase font-mono px-1 py-0"
                            >
                              {ovr.academicScope?.scopeLevel || ovr.entityType}
                            </Badge>
                            <span className="truncate max-w-[150px] font-medium" title={getReadableScope(ovr)}>
                              {getReadableScope(ovr)}
                            </span>
                          </div>
                        </td>

                        {/* Metric */}
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-[11px] text-foreground">
                            {ovr.fieldName || ovr.metricId || "readiness_score"}
                          </span>
                        </td>

                        {/* Original */}
                        <td className="py-2.5 px-3 text-right font-mono line-through text-muted-foreground">
                          {ovr.actualValue}
                        </td>

                        {/* Overridden */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                          {ovr.visibleValue}
                        </td>

                        {/* Delta */}
                        <td className="py-2.5 px-3 text-center">
                          {delta !== null ? (
                            <Badge
                              variant="secondary"
                              className={`text-[10px] font-mono px-1.5 py-0 ${
                                Number(delta) > 0
                                  ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                                  : Number(delta) < 0
                                  ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {Number(delta) > 0 ? `+${delta}%` : `${delta}%`}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Reason */}
                        <td className="py-2.5 px-3 max-w-[180px]">
                          <span
                            className="italic text-muted-foreground truncate block"
                            title={ovr.mandatoryReason}
                          >
                            {ovr.mandatoryReason}
                          </span>
                        </td>

                        {/* Actor */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`font-mono text-[11px] ${
                              isMine ? "text-primary font-semibold" : "text-muted-foreground"
                            }`}
                          >
                            {ovr.editorLogin || ovr.overriddenBy}
                          </span>
                        </td>

                        {/* Effective Status */}
                        <td className="py-2.5 px-3 text-center">
                          {status === "active" ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            >
                              Active
                            </Badge>
                          ) : status === "reverted" ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-slate-500/10 text-slate-500 border-slate-500/30"
                            >
                              Reverted
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30"
                            >
                              Superseded
                            </Badge>
                          )}
                        </td>

                        {/* Recalculation Status */}
                        <td className="py-2.5 px-3 text-center">
                          <Badge
                            variant="secondary"
                            className="text-[10px] gap-1 font-mono px-1 py-0 text-blue-500 bg-blue-500/10 border-blue-500/20"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {ovr.recalculationStatus || "completed"}
                          </Badge>
                        </td>

                        {/* Timestamp */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground text-[11px]">
                          {fmt(ovr.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="View full audit details"
                              onClick={() => setInspectOverride(ovr)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {status === "active" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                title="Revert override"
                                onClick={() => setRevertingOverride(ovr)}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION B: PROGRESS ANALYSIS & OVERRIDE (PLACED BELOW SECTION A)           */}
      {/* ========================================================================= */}
      <section className="space-y-6 pt-4 border-t border-border">
        {/* Section B Heading */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                B
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Section B — Progress Analysis & Academic Scope Overrides
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Progressively narrow the institutional scope to inspect cohort readiness and apply authorized visible overrides.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={resetAllScopeFilters}
            className="text-xs gap-1.5 h-8"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Scope Filters
          </Button>
        </div>

        {/* CASCADING FILTER TOOLBAR (Exact Cascading Order: College -> Year -> Branch -> Semester -> Section -> Student) */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Cascading Academic Hierarchy Filters
            </span>
            <span className="text-[11px] text-muted-foreground">
              Narrowing upstream automatically updates valid downstream options
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. College (Mandatory) */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold flex items-center gap-1">
                1. Select College <span className="text-rose-500">*</span>
              </Label>
              <Select value={selectedCollege} onValueChange={handleCollegeChange}>
                <SelectTrigger className="h-8 text-xs font-medium">
                  <SelectValue placeholder="Select College…" />
                </SelectTrigger>
                <SelectContent>
                  {options.colleges.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Year */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                2. Select Year
              </Label>
              <Select
                value={selectedYear}
                onValueChange={handleYearChange}
                disabled={!selectedCollege}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Academic Years</SelectItem>
                  {options.years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Branch / Department */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                3. Select Branch
              </Label>
              <Select
                value={selectedDepartment}
                onValueChange={handleDepartmentChange}
                disabled={!selectedCollege}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches / Depts</SelectItem>
                  {options.departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Semester */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                4. Select Semester
              </Label>
              <Select
                value={selectedSemester}
                onValueChange={handleSemesterChange}
                disabled={!selectedCollege}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {options.semesters.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 5. Section */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                5. Select Section
              </Label>
              <Select
                value={selectedSection}
                onValueChange={handleSectionChange}
                disabled={!selectedCollege}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {options.sections.map((sec) => (
                    <SelectItem key={sec} value={sec}>
                      {sec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 6. Student */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                6. Select Student
              </Label>
              <Select
                value={selectedStudent}
                onValueChange={handleStudentChange}
                disabled={!selectedCollege}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students in Scope</SelectItem>
                  {options.students.map((stu) => (
                    <SelectItem key={stu.id} value={stu.id}>
                      {stu.name} ({stu.usn})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ACTIVE SCOPE BANNER */}
        {scopeProgress && (
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs uppercase font-mono font-semibold">
                  {scopeProgress.scopeLevel}
                </Badge>
                <h3 className="text-sm font-semibold text-foreground">
                  {scopeProgress.scopeLabel}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Cohort Size:{" "}
                  <strong className="text-foreground font-mono">
                    {scopeProgress.sampleSize} students
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Calculation Engine:{" "}
                  <code className="text-foreground font-mono">
                    {scopeProgress.calculationVersion}
                  </code>
                </span>
                <span>•</span>
                <span>Freshness: {scopeProgress.freshness}</span>
              </div>
            </div>

            {/* Direct Override Alert Badge if Active */}
            {scopeProgress.directOverride ? (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-md text-xs">
                <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-600">Direct Scope Override Active</p>
                  <p className="text-muted-foreground text-[11px]">
                    Visible value set to{" "}
                    <strong className="text-foreground font-mono">
                      {scopeProgress.directOverride.visibleValue}%
                    </strong>{" "}
                    by {scopeProgress.directOverride.editorLogin}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-muted/40 border border-border px-3 py-1.5 rounded-md text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Operating on pure authoritative intelligence</span>
              </div>
            )}
          </div>
        )}

        {/* SECTION B ANALYTICS & OVERRIDE GRID */}
        {loadingProgress ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm">Calculating scope intelligence metrics…</p>
          </div>
        ) : !scopeProgress ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
            <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No institutional scope selected</p>
            <p className="text-xs mt-1">
              Select a College from the cascading filters above to load cohort progress charts and intelligence metrics.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: College Progress Donut Chart */}
            <div className="lg:col-span-5">
              <CollegeProgressDonutChart
                title="Cohort Readiness Distribution"
                scope={scopeProgress.scopeLabel}
                reportingPeriod="Current Academic Cycle"
                data={scopeProgress.donutChartData || []}
                centerLabel={`${Math.round(scopeProgress.displayedReadiness)}%`}
                centerSublabel="Displayed Readiness"
                allowExport={true}
              />
            </div>

            {/* Right 7 Cols: Actual vs Displayed Summary & Competencies */}
            <div className="lg:col-span-7 space-y-4">
              {/* Readiness Comparison Card */}
              <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Readiness Intelligence (Layer B vs Layer C)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Authoritative evaluation vs presentation-adjusted reporting value
                    </p>
                  </div>

                  <Button
                    onClick={openOverrideDialog}
                    className="gap-1.5 text-xs shadow-sm"
                    size="sm"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    Override Values
                  </Button>
                </div>

                {/* Score Tiles */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Authoritative */}
                  <div className="bg-muted/30 border border-border p-3 rounded-md">
                    <span className="text-[11px] font-medium text-muted-foreground block uppercase tracking-wider">
                      Authoritative (Layer B)
                    </span>
                    <span className="text-2xl font-bold font-mono text-foreground mt-1 block">
                      {Math.round(scopeProgress.authoritativeReadiness * 10) / 10}%
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      Judge & test verified
                    </span>
                  </div>

                  {/* Displayed */}
                  <div className="bg-primary/5 border border-primary/20 p-3 rounded-md">
                    <span className="text-[11px] font-medium text-primary block uppercase tracking-wider">
                      Displayed (Layer C)
                    </span>
                    <span className="text-2xl font-bold font-mono text-primary mt-1 block">
                      {Math.round(scopeProgress.displayedReadiness * 10) / 10}%
                    </span>
                    <span className="text-[10px] text-primary/80 block mt-0.5">
                      Visible in student / portal
                    </span>
                  </div>

                  {/* Delta */}
                  <div className="bg-muted/30 border border-border p-3 rounded-md">
                    <span className="text-[11px] font-medium text-muted-foreground block uppercase tracking-wider">
                      Presentation Delta (Δ)
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`text-2xl font-bold font-mono ${
                          scopeProgress.readinessDelta > 0
                            ? "text-emerald-500"
                            : scopeProgress.readinessDelta < 0
                            ? "text-rose-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {scopeProgress.readinessDelta > 0 ? "+" : ""}
                        {Math.round(scopeProgress.readinessDelta * 10) / 10}%
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      {scopeProgress.readinessDelta === 0
                        ? "Zero delta (authentic)"
                        : "Presentation shift applied"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Domain Competency Matrix */}
              <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Domain Competency Breakdown
                  </h4>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    5 Benchmarked Domains
                  </Badge>
                </div>

                <div className="divide-y divide-border/60">
                  {scopeProgress.competencies?.map((c: any) => (
                    <div
                      key={c.key}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-medium text-foreground block">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {c.metricId}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 font-mono">
                        <div className="text-right">
                          <span className="text-muted-foreground text-[11px] block">
                            Auth: {c.actual !== null ? `${Math.round(c.actual)}%` : "N/A"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-primary text-[11px] block">
                            Disp: {c.displayed !== null ? `${Math.round(c.displayed)}%` : "N/A"}
                          </span>
                        </div>
                        <div className="w-14 text-right">
                          {c.delta !== 0 ? (
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1 py-0 ${
                                c.delta > 0
                                  ? "text-emerald-500 bg-emerald-500/10"
                                  : "text-rose-500 bg-rose-500/10"
                              }`}
                            >
                              {c.delta > 0 ? `+${Math.round(c.delta)}%` : `${Math.round(c.delta)}%`}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">0.0%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* DIALOG 1: OVERRIDE VALUES WITH LIVE IMPACT PREVIEW                        */}
      {/* ========================================================================= */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Sliders className="h-4 w-4 text-primary" />
              Configure Presentation Override
            </DialogTitle>
            <DialogDescription className="text-xs">
              Apply an authorized visible-value override for{" "}
              <strong className="text-foreground">{scopeProgress?.scopeLabel}</strong>.
              Underlying authoritative assessments remain intact.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplyOverride} className="space-y-4 py-2">
            {/* Scope Level Context Pill */}
            <div className="bg-muted/40 p-2.5 rounded-md border border-border text-xs flex items-center justify-between">
              <div>
                <span className="text-muted-foreground text-[11px] block">Target Academic Scope</span>
                <span className="font-semibold font-mono text-foreground">
                  {scopeProgress?.canonicalEntityId}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {scopeProgress?.scopeLevel}
              </Badge>
            </div>

            {/* Target Metric Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Target Presentation Metric <span className="text-rose-500">*</span>
              </Label>
              <Select value={selectedMetricId} onValueChange={setSelectedMetricId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Metric…" />
                </SelectTrigger>
                <SelectContent>
                  {scopeProgress?.eligibleMetrics?.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Values: Current vs Proposed */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Current Authoritative Value</Label>
                <div className="h-9 px-3 rounded-md border border-border bg-muted/40 flex items-center font-mono text-xs text-muted-foreground">
                  {Math.round((scopeProgress?.authoritativeReadiness || 0) * 10) / 10}%
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  Proposed Visible Value (0–100) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 78.5"
                  value={proposedValue}
                  onChange={(e) => setProposedValue(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
              </div>
            </div>

            {/* Mandatory Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>
                  Mandatory Explanatory Reason <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] text-muted-foreground">Minimum 5 characters</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Explain the authorized operational reason for this presentation override…"
                value={mandatoryReason}
                onChange={(e) => setMandatoryReason(e.target.value)}
                className="text-xs resize-none"
                required
              />
            </div>

            {/* LIVE OVERRIDE IMPACT PREVIEW */}
            {previewData && (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-primary">
                  <span>Override Impact Preview</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Δ {previewData.proposedDelta > 0 ? `+${previewData.proposedDelta}%` : `${previewData.proposedDelta}%`}
                  </Badge>
                </div>

                <div className="text-muted-foreground space-y-1 text-[11px]">
                  <p>
                    <strong>Affected Propagation Chain:</strong>
                  </p>
                  <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                    {previewData.affectedScopes?.map((sc: string, idx: number) => (
                      <span
                        key={idx}
                        className="bg-background px-1.5 py-0.5 rounded border border-border"
                      >
                        {sc}
                      </span>
                    ))}
                  </div>
                </div>

                {previewData.chartShiftPrediction && (
                  <div className="pt-1 text-[11px] text-muted-foreground border-t border-primary/10 flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>
                      Predicted Shift: High Tier:{" "}
                      <strong>{previewData.chartShiftPrediction.projectedHighTier}</strong> (
                      {previewData.chartShiftPrediction.deltaHighTier > 0 ? "+" : ""}
                      {previewData.chartShiftPrediction.deltaHighTier})
                    </span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOverrideDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={applyingOverride || !mandatoryReason.trim() || mandatoryReason.trim().length < 5}
              >
                {applyingOverride ? "Applying Override…" : "Confirm & Apply Override"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: AUDIT DETAILS MODAL                                             */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(inspectOverride)} onOpenChange={(open) => !open && setInspectOverride(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Override Audit & Provenance Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete audit ledger entry for ID:{" "}
              <code className="font-mono text-foreground">{inspectOverride?.id}</code>
            </DialogDescription>
          </DialogHeader>

          {inspectOverride && (
            <div className="space-y-3 text-xs py-2">
              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-md border border-border">
                <div>
                  <span className="text-[11px] text-muted-foreground block">College</span>
                  <span className="font-semibold text-foreground">
                    {inspectOverride.collegeCode} — {inspectOverride.collegeName || "Sample Institute"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Academic Scope</span>
                  <span className="font-semibold text-foreground">
                    {getReadableScope(inspectOverride)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Target Metric</span>
                  <span className="font-mono text-foreground">
                    {inspectOverride.fieldName || inspectOverride.metricId}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Calculation Engine</span>
                  <span className="font-mono text-foreground">
                    {inspectOverride.calculationVersion || "v2.6-engine"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-md border border-border font-mono">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Authoritative (Layer B)</span>
                  <span className="text-base line-through text-muted-foreground font-bold">
                    {inspectOverride.actualValue}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-primary block">Visible Value (Layer C)</span>
                  <span className="text-base text-primary font-bold">
                    {inspectOverride.visibleValue}
                  </span>
                </div>
              </div>

              <div className="bg-muted/30 p-3 rounded-md border border-border space-y-1">
                <span className="text-[11px] text-muted-foreground block font-medium">
                  Mandatory Explanatory Reason
                </span>
                <p className="italic text-foreground">{inspectOverride.mandatoryReason}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-muted-foreground text-[11px]">
                <div>
                  <span>Created By: </span>
                  <strong className="text-foreground font-mono">
                    {inspectOverride.editorLogin || inspectOverride.overriddenBy}
                  </strong>
                </div>
                <div>
                  <span>Created At: </span>
                  <strong className="text-foreground">{fmt(inspectOverride.createdAt)}</strong>
                </div>
                <div>
                  <span>Effective Status: </span>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {inspectOverride.effectiveStatus || "active"}
                  </Badge>
                </div>
                <div>
                  <span>Recalculation: </span>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono text-blue-500">
                    {inspectOverride.recalculationStatus || "completed"}
                  </Badge>
                </div>
              </div>

              {inspectOverride.revertedAt && (
                <div className="bg-muted/50 p-2.5 rounded-md border border-border text-[11px] text-muted-foreground">
                  <p className="font-semibold text-foreground">Reversion Record</p>
                  <p>
                    Reverted by <strong>{inspectOverride.revertedBy}</strong> at{" "}
                    {fmt(inspectOverride.revertedAt)}.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInspectOverride(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 3: REVERT CONFIRMATION MODAL                                       */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(revertingOverride)} onOpenChange={(open) => !open && setRevertingOverride(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-amber-500">
              <RotateCcw className="h-4 w-4" />
              Revert Presentation Override
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm restoration of underlying authoritative calculations.
            </DialogDescription>
          </DialogHeader>

          {revertingOverride && (
            <div className="space-y-3 py-2 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Reverting this override will immediately restore the authoritative calculated value (or derived child aggregate) for:
              </p>
              <div className="bg-muted/40 p-2.5 rounded border border-border font-mono text-xs">
                <strong>{revertingOverride.entityType}:</strong> {revertingOverride.entityId} (
                {revertingOverride.visibleValue} → {revertingOverride.actualValue})
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                This record will be marked as <code className="bg-background px-1 py-0.5 rounded">reverted</code> in the non-deletable audit log, and downstream dependent aggregates will be recalculated.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRevertingOverride(null)}
              disabled={reverting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmRevert}
              disabled={reverting}
            >
              {reverting ? "Reverting…" : "Confirm Revert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
