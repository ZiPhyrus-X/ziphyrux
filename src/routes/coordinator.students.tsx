import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Edit2, ExternalLink, Eye, Filter, FolderKanban, Plus, RotateCw, ShieldAlert, Upload, User, Users } from "lucide-react";
import { PageHeader, Panel, fmt } from "@/features/coordinator/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
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
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip as RechartsTooltip,
} from "recharts";
import { api } from "@/lib/api/client";
import { authService } from "@/lib/auth/service";

export const Route = createFileRoute("/coordinator/students")({
  head: () => ({
    meta: [
      { title: "Student Roster — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentManagementPage,
});

interface Student {
  id: string;
  collegeCode: string;
  name: string;
  usn: string;
  email: string;
  department: string;
  year: string;
  section: string;
  batch: string;
  status: "active" | "inactive";
  lastCorrection?: {
    previousUsn: string;
    newUsn: string;
    reason: string;
    correctedAt: string;
  };
}

function StudentManagementPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");

  // Correction Modal
  const [correctionTarget, setCorrectionTarget] = useState<Student | null>(null);
  const [proposedUsn, setProposedUsn] = useState("");
  const [mandatoryReason, setMandatoryReason] = useState("");
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Profile Details Modal
  const [selectedDetails, setSelectedDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const session = authService.getSession();
  const collegeCode = session?.user.collegeCode ?? "SMP101";

  const handleViewDetails = (student: Student) => {
    setLoadingDetails(true);
    setSelectedDetails({ student });
    api.coordinator.students
      .getDetails(student.id)
      .then((data) => setSelectedDetails(data))
      .catch(() => toast.error("Failed to load student details"))
      .finally(() => setLoadingDetails(false));
  };

  const fetchStudents = () => {
    setLoading(true);
    api.coordinator.students
      .list({
        search: search || undefined,
        department: departmentFilter !== "all" ? departmentFilter : undefined,
        batch: batchFilter !== "all" ? batchFilter : undefined,
      })
      .then((res) => {
        setStudents(res);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load students");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStudents();
  }, [departmentFilter, batchFilter]);

  const handleOpenCorrection = (student: Student) => {
    setCorrectionTarget(student);
    setProposedUsn(student.usn);
    setMandatoryReason("");
  };

  const handleApplyCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget) return;

    if (!proposedUsn.trim() || proposedUsn.trim().toUpperCase() === correctionTarget.usn) {
      toast.error("Please provide a new USN/Roll number different from current.");
      return;
    }

    if (!mandatoryReason || mandatoryReason.trim().length < 5) {
      toast.error("A mandatory reason of at least 5 characters is required.");
      return;
    }

    setSubmittingCorrection(true);
    try {
      const updated = await api.coordinator.students.updateUsn(
        correctionTarget.id,
        proposedUsn.trim().toUpperCase(),
        mandatoryReason.trim()
      );
      setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success(
        `USN for ${updated.name} updated to ${updated.usn}. Correction recorded in audit log.`
      );
      setCorrectionTarget(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update USN");
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const departments = Array.from(new Set(students.map((s) => s.department)));
  const batches = Array.from(new Set(students.map((s) => s.batch)));

  return (
    <div>
      <PageHeader
        title="Student Management"
        desc={`Student records strictly scoped to campus ${collegeCode}. Student login identities are derived from registered USN/Roll numbers. Corrections require mandatory explanation.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/registration">
                <Plus className="mr-1.5 h-4 w-4" /> Registration Link
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/m/$module" params={{ module: "imports-exports" }}>
                <Upload className="mr-1.5 h-4 w-4" /> Bulk Import
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/batches">
                <FolderKanban className="mr-1.5 h-4 w-4" /> Batches
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchStudents} disabled={loading}>
              <RotateCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      />

      <div className="mb-6 rounded-md border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-foreground flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">USN Correction Policy</p>
          <p className="mt-1 text-muted-foreground">
            Students cannot modify their own USN. Coordinators hold permission to apply verified corrections. Every correction requires an audit reason (≥ 5 characters) and preserves historical submissions and records.
          </p>
        </div>
      </div>

      {/* Roster Statistical Overview */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Total Enrolled</span>
          <p className="text-2xl font-bold text-foreground mt-1">{students.length}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>{students.filter((s) => s.status === "active").length} Active</span>
            {students.filter((s) => s.status !== "active").length > 0 && (
              <span className="text-amber-500">· {students.filter((s) => s.status !== "active").length} Inactive</span>
            )}
          </div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Departments Represented</span>
          <p className="text-2xl font-bold text-primary mt-1">{new Set(students.map((s) => s.department)).size}</p>
          <span className="text-[11px] text-muted-foreground">Campus academic branches</span>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Cohort Batches</span>
          <p className="text-2xl font-bold text-foreground mt-1">{new Set(students.map((s) => s.batch)).size}</p>
          <span className="text-[11px] text-muted-foreground">Active organizational sections</span>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">USN Corrections Audited</span>
          <p className="text-2xl font-bold text-amber-500 mt-1">
            {students.filter((s) => s.lastCorrection).length}
          </p>
          <span className="text-[11px] text-muted-foreground">Official registrar updates</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by student name, USN, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchStudents()}
          className="max-w-xs"
        />

        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={batchFilter} onValueChange={setBatchFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {batches.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="secondary" size="sm" onClick={fetchStudents}>
          Filter
        </Button>
      </div>

      <Panel title={`Campus Students (${students.length})`}>
        <DataTable
          data={students}
          emptyMessage="No students found matching the selected filters."
          columns={[
            {
              header: "USN / Roll",
              accessor: (s) => (
                <div>
                  <span className="font-mono text-xs font-bold text-primary">{s.usn}</span>
                  {s.lastCorrection && (
                    <span className="block text-[10px] text-muted-foreground italic" title={`Corrected: ${s.lastCorrection.reason}`}>
                      (Was: {s.lastCorrection.previousUsn})
                    </span>
                  )}
                </div>
              ),
            },
            {
              header: "Student Name",
              accessor: (s) => (
                <div>
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.email}</p>
                </div>
              ),
            },
            {
              header: "Academic Class",
              accessor: (s) => (
                <div className="text-xs">
                  <p className="font-medium">{s.department}</p>
                  <p className="text-muted-foreground">{s.year} · Sec {s.section}</p>
                </div>
              ),
            },
            {
              header: "Batch",
              accessor: (s) => (
                <Link to="/coordinator/batches" className="font-mono text-xs hover:text-primary hover:underline transition-colors">
                  {s.batch}
                </Link>
              ),
            },
            {
              header: "Status",
              accessor: (s) => <StatusBadge status={s.status} label={s.status.toUpperCase()} />,
            },
            {
              header: "Actions",
              accessor: (s) => (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(s)}
                    className="text-xs gap-1 h-7 px-2"
                  >
                    <Eye className="h-3 w-3" /> Profile
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenCorrection(s)}
                    className="text-xs gap-1 h-7 px-2"
                  >
                    <Edit2 className="h-3 w-3" /> Correct USN
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 h-7 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Link to="/coordinator/action-plans">
                      Plans &rarr;
                    </Link>
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Panel>

      {/* Dedicated USN Correction Dialog */}
      <Dialog open={!!correctionTarget} onOpenChange={(open) => !open && setCorrectionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correct Student USN / Roll Number</DialogTitle>
            <DialogDescription>
              Submit an authorized correction for <strong>{correctionTarget?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplyCorrection} className="space-y-4 py-2">
            <div>
              <Label>Current Registered USN</Label>
              <Input value={correctionTarget?.usn ?? ""} disabled className="font-mono bg-muted" />
            </div>

            <div>
              <Label htmlFor="proposed-usn">Proposed New USN / Roll</Label>
              <Input
                id="proposed-usn"
                value={proposedUsn}
                onChange={(e) => setProposedUsn(e.target.value)}
                placeholder="e.g. 1MS23CS042"
                required
                className="font-mono uppercase"
              />
            </div>

            <div>
              <Label htmlFor="mandatory-reason">
                Mandatory Explanatory Reason (Min 5 chars)
              </Label>
              <Textarea
                id="mandatory-reason"
                rows={3}
                value={mandatoryReason}
                onChange={(e) => setMandatoryReason(e.target.value)}
                placeholder="Explain justification (e.g. University registrar official notification correction)…"
                required
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                This reason will be permanently recorded in the immutable audit log under your login identity.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCorrectionTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingCorrection}>
                {submittingCorrection ? "Submitting…" : "Apply Correction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student Intelligence Profile Modal (Layer C Adjusted) */}
      <Dialog open={!!selectedDetails} onOpenChange={(open) => !open && setSelectedDetails(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedDetails?.student?.name}</span>
              <Badge variant="outline" className="font-mono text-[10px]">
                {selectedDetails?.student?.usn}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedDetails?.student?.department} · {selectedDetails?.student?.year} · Sec {selectedDetails?.student?.section}
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading Intelligence Profile...</div>
          ) : (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 border border-border rounded bg-muted/20 flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground text-[11px]">Official Readiness Score (Layer C)</span>
                  <p className="text-2xl font-bold text-primary mt-0.5">
                    {selectedDetails?.metrics?.readinessScore ?? "—"}%
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    (selectedDetails?.metrics?.readinessScore ?? 0) >= 75
                      ? "text-emerald-600 border-emerald-500/30"
                      : "text-amber-500 border-amber-500/30"
                  }
                >
                  {(selectedDetails?.metrics?.readinessScore ?? 0) >= 75
                    ? "Tier-1 Ready"
                    : (selectedDetails?.metrics?.readinessScore ?? 0) >= 60
                    ? "Tier-2 Candidate"
                    : "Needs Intervention"}
                </Badge>
              </div>

              {selectedDetails?.metrics?.skills && (
                <div className="p-3 border border-border rounded bg-card/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-xs">Competency Radar (Layer C)</span>
                    <span className="text-[10px] text-muted-foreground font-mono">Normalized (0-100%)</span>
                  </div>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        data={[
                          { domain: "Technical", score: selectedDetails.metrics.skills.technical ?? 0 },
                          { domain: "Aptitude", score: selectedDetails.metrics.skills.aptitude ?? 0 },
                          { domain: "Verbal", score: selectedDetails.metrics.skills.verbal ?? 0 },
                          { domain: "Soft Skills", score: selectedDetails.metrics.skills.softSkills ?? 0 },
                          { domain: "Coding", score: selectedDetails.metrics.coding?.score ?? 0 },
                        ]}
                        margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
                      >
                        <PolarGrid stroke="var(--border)" opacity={0.4} />
                        <PolarAngleAxis dataKey="domain" tick={{ fill: "var(--foreground)", fontSize: 10, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--border)" opacity={0.4} tick={{ fontSize: 9, fill: "var(--foreground)" }} />
                        <Radar name="Student Proficiency" dataKey="score" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.35} dot={{ r: 3, fill: "#a78bfa" }} />
                        <RechartsTooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                                <p className="font-semibold text-foreground border-b border-border/50 pb-1">{d.domain}</p>
                                <p className="text-muted-foreground flex justify-between gap-3">
                                  <span>Proficiency:</span>
                                  <strong className="text-purple-600 dark:text-purple-400 font-mono font-bold">{d.score}%</strong>
                                </p>
                              </div>
                            );
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div>
                <h5 className="font-semibold text-foreground mb-2">Competency Domains</h5>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 border border-border rounded flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Technical</span>
                      <strong className="text-foreground">{selectedDetails?.metrics?.skills?.technical ?? "—"}%</strong>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${selectedDetails?.metrics?.skills?.technical ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-2 border border-border rounded flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Aptitude</span>
                      <strong className="text-foreground">{selectedDetails?.metrics?.skills?.aptitude ?? "—"}%</strong>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${selectedDetails?.metrics?.skills?.aptitude ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-2 border border-border rounded flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Verbal</span>
                      <strong className="text-foreground">{selectedDetails?.metrics?.skills?.verbal ?? "—"}%</strong>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${selectedDetails?.metrics?.skills?.verbal ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-2 border border-border rounded flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Soft Skills</span>
                      <strong className="text-foreground">{selectedDetails?.metrics?.skills?.softSkills ?? "—"}%</strong>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${selectedDetails?.metrics?.skills?.softSkills ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-2 border border-border rounded col-span-2 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Coding Judge Evidence</span>
                      <strong className="text-primary font-mono">
                        {selectedDetails?.metrics?.coding?.score ?? 0}% ({selectedDetails?.metrics?.coding?.problemsSolved ?? 0} Solved)
                      </strong>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${selectedDetails?.metrics?.coding?.score ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {selectedDetails?.actionPlans?.length > 0 && (
                <div>
                  <h5 className="font-semibold text-foreground mb-1.5">Assigned Action Plans</h5>
                  <div className="space-y-1.5">
                    {selectedDetails.actionPlans.map((ap: any) => (
                      <div key={ap.id} className="p-2 border border-border rounded space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-foreground">{ap.description}</span>
                          <Badge variant="outline" className="text-[9px]">{ap.status}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Trainer: {ap.trainerName} · Deadline: {ap.deadline}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-wrap items-center justify-between gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/coordinator/action-plans">
                  Action Plans &rarr;
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/coordinator/m/$module" params={{ module: "placement-readiness" }}>
                  Placement Readiness &rarr;
                </Link>
              </Button>
            </div>
            <Button size="sm" onClick={() => setSelectedDetails(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
