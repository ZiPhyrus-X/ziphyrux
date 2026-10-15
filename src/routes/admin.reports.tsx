import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Info,
  Layers,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Table as TableIcon,
} from "lucide-react";
import { PageHeader, Panel } from "@/features/super-admin/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Data — Ziphyrus X Super Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsAndDataPage,
});

interface GeneratedReportResult {
  reportId: string;
  reportType: string;
  policy: "standard_progress" | "intelligence" | "audit";
  format: "csv" | "json" | "xlsx";
  recordsCount: number;
  generatedAt: string;
  headers: string[];
  rows: Record<string, any>[];
  csvContent: string;
}

const REPORT_TYPES = [
  { id: "rep-1", title: "Overall College Progress Report", domain: "Progress", defaultPolicy: "standard_progress", description: "Comprehensive breakdown of cohort milestone completion across participating institutions." },
  { id: "rep-2", title: "Branch-wise Progress Report", domain: "Academic", defaultPolicy: "standard_progress", description: "Departmental performance benchmarks across disciplines." },
  { id: "rep-3", title: "Year-wise Academic Progress Report", domain: "Academic", defaultPolicy: "standard_progress", description: "Cohort advancement across 1st to 4th year tiers." },
  { id: "rep-4", title: "Section-wise Progress Report", domain: "Academic", defaultPolicy: "standard_progress", description: "Granular section metrics and batch progress comparison." },
  { id: "rep-5", title: "Student-Level Progress Report", domain: "Students", defaultPolicy: "standard_progress", description: "Individual learner readiness score and skill benchmarks." },
  { id: "rep-6", title: "Skill Development & Competency Report", domain: "Skills", defaultPolicy: "standard_progress", description: "Multi-domain technical, verbal, and soft skills matrix." },
  { id: "rep-7", title: "Assessment Participation & Diagnostic Report", domain: "Assessments", defaultPolicy: "standard_progress", description: "Diagnostic clearance and benchmark pass rates." },
  { id: "rep-8", title: "Employability Readiness Evaluation Report", domain: "Employability", defaultPolicy: "standard_progress", description: "Official Intelligence Engine placement readiness." },
  { id: "rep-9", title: "Cross-College Comparative Benchmark Report", domain: "Governance", defaultPolicy: "standard_progress", description: "Multi-tenant platform institutional comparison." },
  { id: "rep-10", title: "Editor Modification & Provenance Audit Report", domain: "Audit", defaultPolicy: "audit", description: "Separate permission-controlled modification audit history with before/after diffs." },
];

export function ReportsAndDataPage() {
  const [reports, setReports] = useState<any[]>(REPORT_TYPES);
  const [colleges, setColleges] = useState<{ code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>(REPORT_TYPES[0].title);
  const [selectedCollege, setSelectedCollege] = useState<string>("all");
  const [selectedPolicy, setSelectedPolicy] = useState<"standard_progress" | "intelligence" | "audit">("standard_progress");
  const [selectedFormat, setSelectedFormat] = useState<"csv" | "json" | "xlsx">("csv");
  const [generating, setGenerating] = useState(false);

  // Preview State
  const [generatedResult, setGeneratedResult] = useState<GeneratedReportResult | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.reports.list().catch(() => REPORT_TYPES),
      api.colleges.list().catch(() => []),
    ]).then(([reps, cols]) => {
      if (active) {
        if (Array.isArray(reps) && reps.length > 0) setReports(reps);
        if (Array.isArray(cols)) setColleges(cols);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async (options?: {
    reportType?: string;
    collegeCode?: string;
    policy?: "standard_progress" | "intelligence" | "audit";
    format?: "csv" | "json" | "xlsx";
  }) => {
    const repType = options?.reportType || selectedReportType;
    const colCode = options?.collegeCode || selectedCollege;
    const pol = options?.policy || selectedPolicy;
    const fmt = options?.format || selectedFormat;

    setGenerating(true);
    try {
      const res = await api.reports.generate({
        reportType: repType,
        collegeCode: colCode === "all" ? undefined : colCode,
        policy: pol,
        format: fmt,
      });

      setGeneratedResult(res);
      setGeneratorOpen(true);
      toast.success(`Report generated: ${res.recordsCount} records compiled under ${pol} policy.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Report generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleQuickDownloadCSV = (result: GeneratedReportResult) => {
    const filename = `${result.reportType.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${result.policy}_${Date.now()}.csv`;
    downloadFile(result.csvContent, filename, "text/csv;charset=utf-8;");
    toast.success(`Downloaded ${filename}`);
  };

  const handleQuickDownloadJSON = (result: GeneratedReportResult) => {
    const filename = `${result.reportType.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${result.policy}_${Date.now()}.json`;
    downloadFile(JSON.stringify(result.rows, null, 2), filename, "application/json");
    toast.success(`Downloaded ${filename}`);
  };

  const openGeneratorForReport = (reportTitle: string, defaultPolicy: string) => {
    setSelectedReportType(reportTitle);
    setSelectedPolicy((defaultPolicy as any) || "standard_progress");
    setGeneratedResult(null);
    setGeneratorOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Platform Data Governance"
        desc="Authoritative intelligence reports, benchmark exports, and auditable system data dumps with strict Clean Standard Export Policy enforcement."
        actions={
          <Button
            onClick={() => {
              setGeneratedResult(null);
              setGeneratorOpen(true);
            }}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" /> Generate Custom Report
          </Button>
        }
      />

      {/* Clean Export Policy Architectural Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">Clean Standard-Report Export Policy (Section 11 Invariant)</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Standard academic progress reports strictly omit internal operational markers such as{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">"Edited"</code>,{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">"Manipulated"</code>, or{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">"Override Applied"</code>. External partners and academic councils receive clean, presentation-ready records. All manual Editor modifications and provenance history are preserved exclusively within the dedicated <span className="font-semibold text-foreground">Provenance Audit Policy</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Supported Reports Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((rep) => (
          <div
            key={rep.id}
            className="rounded-lg border border-border bg-card p-5 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold">
                  {rep.domain}
                </Badge>
                <Badge
                  variant={rep.defaultPolicy === "audit" ? "destructive" : "secondary"}
                  className="text-[10px] font-normal"
                >
                  {rep.defaultPolicy === "audit" ? "Audit Policy" : "Standard Policy"}
                </Badge>
              </div>

              <h4 className="mt-3 font-semibold text-foreground text-base">{rep.title}</h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {rep.description || "Contains verified multi-tenant analytics computed across participating colleges, departments, and skill bands."}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Generated: {rep.generatedAt || "Dynamic"}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openGeneratorForReport(rep.title, rep.defaultPolicy)}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Filter className="h-3.5 w-3.5" /> Configure
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    handleGenerate({
                      reportType: rep.title,
                      policy: rep.defaultPolicy as any,
                      format: "csv",
                    })
                  }
                  className="h-8 gap-1.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Run & Preview
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Report Generator & Preview Dialog */}
      <Dialog open={generatorOpen} onOpenChange={setGeneratorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" /> Report Generator & Live Data Preview
            </DialogTitle>
            <DialogDescription>
              Configure report parameters, enforce export policies, and preview generated rows before downloading.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Report Type</label>
              <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reports.map((r) => (
                    <SelectItem key={r.id} value={r.title} className="text-xs">
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Institution / Scope</label>
              <Select value={selectedCollege} onValueChange={setSelectedCollege}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Colleges (Platform Aggregate)
                  </SelectItem>
                  {colleges.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-xs">
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Export Policy</label>
              <Select
                value={selectedPolicy}
                onValueChange={(val: any) => setSelectedPolicy(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard_progress" className="text-xs">
                    Standard Progress (Clean Presentation)
                  </SelectItem>
                  <SelectItem value="intelligence" className="text-xs">
                    Authoritative Diagnostic Intelligence
                  </SelectItem>
                  <SelectItem value="audit" className="text-xs">
                    Provenance & Modification Audit
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pb-2">
            <div className="text-xs text-muted-foreground">
              {selectedPolicy === "standard_progress" && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" /> Clean Policy Active: Internal override tags are omitted from output.
                </span>
              )}
              {selectedPolicy === "intelligence" && (
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Info className="h-4 w-4" /> Official Raw Diagnostic Scores computed by Intelligence Engine.
                </span>
              )}
              {selectedPolicy === "audit" && (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-4 w-4" /> Full Provenance Mode: Includes actors, diffs, and justification logs.
                </span>
              )}
            </div>

            <Button
              size="sm"
              onClick={() => handleGenerate()}
              disabled={generating}
              className="gap-1.5"
            >
              {generating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {generating ? "Generating..." : "Generate & Preview"}
            </Button>
          </div>

          {/* Generated Result Preview */}
          {generatedResult && (
            <div className="mt-4 border-t border-border pt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/50 p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{generatedResult.reportType}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {generatedResult.recordsCount} Records
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {generatedResult.policy}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    ID: {generatedResult.reportId} · Generated: {new Date(generatedResult.generatedAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickDownloadCSV(generatedResult)}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Download CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickDownloadJSON(generatedResult)}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Download JSON
                  </Button>
                </div>
              </div>

              {/* Data Table Preview */}
              <div className="rounded-md border border-border overflow-x-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {generatedResult.headers.map((h, i) => (
                        <TableHead key={i} className="text-xs whitespace-nowrap font-semibold">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedResult.rows.map((row, rIdx) => (
                      <TableRow key={rIdx}>
                        {generatedResult.headers.map((h, cIdx) => (
                          <TableCell key={cIdx} className="text-xs whitespace-nowrap">
                            {row[h] !== null && row[h] !== undefined ? String(row[h]) : "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {generatedResult.rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={generatedResult.headers.length} className="text-center py-6 text-xs text-muted-foreground">
                          No matching records found for this scope.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setGeneratorOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
