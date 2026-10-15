import { useEffect, useState, useCallback, useRef } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  FileSpreadsheet,
  History,
  Layers,
  PieChart as PieChartIcon,
  Plus,
  RotateCw,
  Save,
  Shield,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { PageHeader, Panel } from "@/features/coordinator/page";
import { type CoordinatorModuleSlug, COORDINATOR_NAV } from "@/features/coordinator/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authService } from "@/lib/auth/service";
import { api } from "@/lib/api/client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from "recharts";

const DESC: Record<CoordinatorModuleSlug, string> = {
  classes: "Campus classes and section structures, trainer allocations, and student rosters.",
  training: "Institutional course curriculum and tracks. Feature-flag governed under campus agreement.",
  performance: "Centralized Intelligence Layer C reporting, cohort readiness bands, and domain averages.",
  skills: "Competency benchmarks across technical, aptitude, verbal, and soft skills with real-time gap analysis.",
  "placement-readiness": "Placement tier qualification tracking, readiness velocity, and corporate recruitment drive match.",
  "placement-requirements": "Campus recruitment criteria, academic eligibility cutoffs, and matched student rosters.",
  "imports-exports": "Authorized college-scoped bulk data operations. Enforces 12-step pipeline verification and preview before commit.",
  reports: "Operational reporting on campus enrollments, trainer allocations, session deliveries, and action plans. Zero attendance tracking policy.",
  notifications: "College-scoped announcements and campus operational alerts dispatched via the Targeting Engine.",
  settings: "Campus operational preferences, student self-registration tokens, and academic contacts.",
  activity: "Immutable audit log of coordinator actions, USN corrections, and session completions for this campus.",
  account: "Coordinator account configuration, assigned college jurisdiction, and operational scopes.",
};

export const Route = createFileRoute("/coordinator/m/$module")({
  loader: ({ params }) => {
    if (!(params.module in DESC)) throw notFound();
    return { slug: params.module as CoordinatorModuleSlug };
  },
  head: () => ({
    meta: [
      { title: "Coordinator Workspace — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoordinatorModulePage,
});

function CoordinatorModulePage() {
  const { slug } = Route.useLoaderData();
  const label = COORDINATOR_NAV.find((n) => n.slug === slug)?.label ?? "";
  const session = authService.getSession();
  const collegeCode = session?.user.collegeCode ?? "SMP101";

  return (
    <div className="space-y-6">
      <PageHeader title={label} desc={DESC[slug]} />

      {slug === "classes" && <CoordinatorClassesView />}
      {slug === "training" && <CoordinatorTrainingView />}
      {slug === "performance" && <CoordinatorPerformanceView />}
      {slug === "skills" && <CoordinatorSkillsView />}
      {slug === "placement-readiness" && <CoordinatorPlacementReadinessView />}
      {slug === "placement-requirements" && <CoordinatorPlacementRequirementsView />}
      {slug === "imports-exports" && <CoordinatorImportsExportsView collegeCode={collegeCode} />}
      {slug === "reports" && <CoordinatorReportsView collegeCode={collegeCode} />}
      {slug === "notifications" && <CoordinatorNotificationsView collegeCode={collegeCode} />}
      {slug === "settings" && <CoordinatorSettingsView />}
      {slug === "activity" && <CoordinatorActivityView />}
      {slug === "account" && <CoordinatorAccountView session={session} collegeCode={collegeCode} />}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 1. Classes & Sections View
// -----------------------------------------------------------------------------
function CoordinatorClassesView() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [academicStructure, setAcademicStructure] = useState<any>(null);

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [branch, setBranch] = useState("Computer Science & Engineering");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [semester, setSemester] = useState("Semester 5");
  const [section, setSection] = useState("Section A");
  const [studentsCount, setStudentsCount] = useState("40");
  const [trainersCount, setTrainersCount] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchClasses = () => {
    setLoading(true);
    api.coordinator.classes
      .list()
      .then((data) => setClasses(data || []))
      .catch(() => toast.error("Failed to load classes"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClasses();
    api.coordinator
      .academic()
      .then((res) => {
        setAcademicStructure(res);
        if (res?.departments?.[0]) setBranch(res.departments[0]);
        if (res?.sessions?.[0]) setAcademicYear(res.sessions[0]);
      })
      .catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch.trim() || !section.trim() || !semester.trim()) {
      toast.error("Branch, semester, and section are required.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.coordinator.classes.create({
        branch: branch.trim(),
        academicYear: academicYear.trim(),
        semester: semester.trim(),
        section: section.trim(),
        studentsCount: parseInt(studentsCount, 10) || 0,
        trainersCount: parseInt(trainersCount, 10) || 0,
      });
      setClasses((prev) => [created, ...prev]);
      toast.success(`Class "${created.branch} - ${created.section}" created successfully.`);
      setCreateOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create class");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await api.coordinator.classes.delete(id);
      setClasses((prev) => prev.filter((c) => c.id !== id));
      toast.success(`Class ${name} deleted successfully.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete class");
    } finally {
      setDeletingId(null);
    }
  };

  // Branch and search filtering
  const filtered = classes.filter((cls) => {
    const matchesSearch =
      (cls.branch || "").toLowerCase().includes(search.toLowerCase()) ||
      (cls.section || "").toLowerCase().includes(search.toLowerCase()) ||
      (cls.semester || "").toLowerCase().includes(search.toLowerCase()) ||
      (cls.academicYear || "").toLowerCase().includes(search.toLowerCase());
    const matchesBranch = branchFilter === "all" || cls.branch === branchFilter;
    return matchesSearch && matchesBranch;
  });

  const branchData = classes.reduce((acc: any[], cls: any) => {
    const branchName = cls.branch || "General";
    const existing = acc.find((b) => b.branch === branchName);
    if (existing) {
      existing.students += Number(cls.studentsCount || 0);
      existing.trainers += Number(cls.trainersCount || 0);
      existing.sections += 1;
    } else {
      acc.push({
        branch: branchName,
        students: Number(cls.studentsCount || 0),
        trainers: Number(cls.trainersCount || 0),
        sections: 1,
      });
    }
    return acc;
  }, []);

  const totalCampusStudents = classes.reduce((sum, c) => sum + Number(c.studentsCount || 0), 0);
  const totalTrainers = classes.reduce((sum, c) => sum + Number(c.trainersCount || 0), 0);
  const uniqueBranches = Array.from(new Set(classes.map((c) => c.branch).filter(Boolean)));

  const colors = [
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#8b5cf6", // Purple
    "#f59e0b", // Amber
    "#ec4899", // Pink
    "#06b6d4", // Cyan
  ];

  return (
    <div className="space-y-6">
      <Panel
        title={`Campus Classes & Sections (${classes.length})`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5" /> Add Class & Section
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
              <Link to="/coordinator/academic">Academic Structure</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
              <Link to="/coordinator/batches">Batches</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
              <Link to="/coordinator/allocations">Allocations</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchClasses} disabled={loading} className="gap-1.5 text-xs">
              <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      >
        {/* Statistical Metric Overview */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 rounded-xl border border-border/70 bg-card/60 shadow-sm">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" /> Active Sections
            </span>
            <p className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">{classes.length}</p>
            <span className="text-[11px] text-muted-foreground">Class cohorts configured</span>
          </div>
          <div className="p-4 rounded-xl border border-border/70 bg-card/60 shadow-sm">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Enrolled Students
            </span>
            <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {totalCampusStudents}
            </p>
            <span className="text-[11px] text-muted-foreground">Total roster capacity</span>
          </div>
          <div className="p-4 rounded-xl border border-border/70 bg-card/60 shadow-sm">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" /> Academic Branches
            </span>
            <p className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
              {uniqueBranches.length}
            </p>
            <span className="text-[11px] text-muted-foreground">Departments represented</span>
          </div>
          <div className="p-4 rounded-xl border border-border/70 bg-card/60 shadow-sm">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Faculty Allocations
            </span>
            <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
              {totalTrainers}
            </p>
            <span className="text-[11px] text-muted-foreground">Assigned teaching faculty</span>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Loading classes...</div>
        ) : classes.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-3">
            <p className="text-sm font-semibold text-foreground">No classes defined for this campus yet.</p>
            <p className="max-w-md mx-auto text-muted-foreground">
              Configure class sections to establish student rosters, trainer allocations, and curricula.
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 mt-2 bg-primary text-primary-foreground">
              <Plus className="h-4 w-4" /> Add Your First Class & Section
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Colorful Statistical Charts: Branch Enrollment & Student Share */}
            {branchData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 rounded border border-border bg-card/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-foreground flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" /> Branch Student Enrollment & Capacity
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {totalCampusStudents} Enrolled Students
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Distribution of actively enrolled students across academic branches.
                  </p>
                  <div className="h-60 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={branchData} margin={{ top: 10, right: 15, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                        <XAxis
                          dataKey="branch"
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
                        <RechartsTooltip
                          cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                          content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1.5 min-w-[200px]">
                                  <p className="font-semibold text-foreground text-sm border-b border-border/50 pb-1">{d.branch}</p>
                                  <p className="text-muted-foreground flex justify-between">
                                    <span>Enrolled Students:</span>
                                    <strong className="text-foreground font-mono">{d.students}</strong>
                                  </p>
                                  <div className="pt-1 border-t border-border/40 text-[11px] text-muted-foreground flex justify-between">
                                    <span>Sections: <strong className="text-foreground">{d.sections}</strong></span>
                                    <span>Trainers: <strong className="text-foreground">{d.trainers}</strong></span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="students" radius={[6, 6, 0, 0]}>
                          {branchData.map((_, index) => (
                            <Cell key={`branch-cell-${index}`} fill={colors[index % colors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded border border-border bg-card/60 p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-xs text-foreground flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4 text-emerald-500" /> Department Student Share
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Proportional share of total enrolled cohort by department.
                    </p>
                  </div>
                  <div className="h-52 w-full relative">
                    {totalCampusStudents > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={branchData.map((b, i) => ({
                              name: b.branch,
                              value: b.students,
                              color: colors[i % colors.length],
                            }))}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={4}
                          >
                            {branchData.map((_, index) => (
                              <Cell key={`pie-cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            content={({ active, payload }: any) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0];
                              return (
                                <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.payload.color || d.color }} />
                                    <span>{d.name}</span>
                                  </p>
                                  <p className="text-muted-foreground flex items-center justify-between gap-3">
                                    <span>Enrolled:</span>
                                    <strong className="text-foreground font-mono">{d.value} Students</strong>
                                  </p>
                                </div>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                        No students enrolled yet
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 pt-2 border-t border-border/50 text-[11px]">
                    {branchData.map((b, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                          <span className="truncate">{b.branch}</span>
                        </span>
                        <span className="font-semibold text-foreground">{b.students} students</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Search and Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                <Input
                  placeholder="Search by branch, semester, or section..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs h-8 text-xs"
                />
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Branches ({classes.length})</SelectItem>
                    {uniqueBranches.map((b) => (
                      <SelectItem key={b} value={b} className="text-xs">
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                Showing {filtered.length} of {classes.length} classes
              </span>
            </div>

            {/* Class Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((cls) => (
                <div key={cls.id} className="p-4 rounded-xl border border-border bg-card/60 space-y-2.5 hover:border-primary/50 transition-colors shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{cls.branch}</h4>
                      <p className="text-xs text-muted-foreground font-mono">
                        {cls.semester} · {cls.section}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {cls.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(cls.id, `${cls.branch} (${cls.section})`)}
                        disabled={deletingId === cls.id}
                        title="Delete class"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border/60 flex justify-between text-xs text-muted-foreground">
                    <span>Academic Year: <strong className="text-foreground">{cls.academicYear}</strong></span>
                    <span>Students: <strong className="text-foreground">{cls.studentsCount}</strong></span>
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>Allocated Trainers: <strong className="text-foreground">{cls.trainersCount}</strong></span>
                    <span className="text-[10px] font-mono text-muted-foreground/60">{cls.id}</span>
                  </div>
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                    <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                      <Link to="/coordinator/students">View Students &rarr;</Link>
                    </Button>
                    <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                      <Link to="/coordinator/allocations">Allocations &rarr;</Link>
                    </Button>
                    <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                      <Link to="/coordinator/batches">Batches &rarr;</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>

      {/* Add Class & Section Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Class & Section</DialogTitle>
            <DialogDescription>
              Define a new academic branch section and student cohort in this campus.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Academic Branch / Department</Label>
              {academicStructure?.departments?.length > 0 ? (
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicStructure.departments.map((d: string) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  required
                  className="h-8 text-xs"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Semester</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"].map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Section</Label>
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Section A", "Section B", "Section C", "Section D", "Section E"].map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Academic Year</Label>
                <Input
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2026-2027"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Student Capacity</Label>
                <Input
                  type="number"
                  min="0"
                  value={studentsCount}
                  onChange={(e) => setStudentsCount(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Allocated Trainers Count</Label>
              <Input
                type="number"
                min="0"
                value={trainersCount}
                onChange={(e) => setTrainersCount(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Creating..." : "Save Class & Section"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 2. Training & Courses View (Feature Gated)
// -----------------------------------------------------------------------------
function CoordinatorTrainingView() {
  const [courses, setCourses] = useState<any[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.coordinator.training
      .list()
      .then((data) => {
        setCourses(data || []);
        setDisabled(false);
      })
      .catch((err) => {
        if (err?.status === 403 || err?.message?.includes("disabled")) {
          setDisabled(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (disabled) {
    return (
      <Panel title="Training & Courses Module Status">
        <div className="p-8 text-center space-y-3 max-w-lg mx-auto">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <BookOpen className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-base text-foreground">Module Inactive by Platform Policy</h3>
          <p className="text-xs text-muted-foreground">
            Under Ziphyrus X platform defaults, the Training & Courses curriculum module is disabled for college
            coordinators unless explicitly provisioned in your campus institutional service plan.
          </p>
          <div className="pt-2">
            <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">
              Feature Flag: training_courses (Disabled)
            </Badge>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title={`Campus Training Tracks (${courses.length})`}>
      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">Loading training tracks...</div>
      ) : courses.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">No active training courses assigned.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((c) => (
            <div key={c.id} className="p-4 rounded border border-border bg-card space-y-2">
              <h4 className="font-semibold text-sm text-foreground">{c.title}</h4>
              <p className="text-xs text-muted-foreground">{c.description || "Course track active for students."}</p>
              <div className="flex gap-2 pt-2">
                <Badge variant="secondary" className="text-[10px]">{c.domain || "Technical"}</Badge>
                <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// -----------------------------------------------------------------------------
// 3. Performance Analytics View (Intelligence Layer C)
// -----------------------------------------------------------------------------
function CoordinatorPerformanceView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.coordinator.performance
      .get()
      .then(setData)
      .catch(() => toast.error("Failed to load performance metrics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="py-12 text-center text-xs text-muted-foreground">Loading Intelligence Layer C analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
        <span className="text-xs text-foreground">
          <strong>Intelligence Layer C Workflows:</strong> View student individual profiles, remediate skill gaps with action plans, or inspect corporate drive readiness.
        </span>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
            <Link to="/coordinator/students">Student Directory &rarr;</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
            <Link to="/coordinator/action-plans">Action Plans &rarr;</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
            <Link to="/coordinator/m/$module" params={{ module: "placement-readiness" }}>Placement Readiness &rarr;</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded border border-border bg-card">
          <span className="text-xs text-muted-foreground">Campus Average Readiness</span>
          <p className="text-2xl font-bold text-primary mt-1">{data.averageReadiness}%</p>
          <span className="text-[11px] text-muted-foreground">Intelligence Layer C Adjusted</span>
        </div>
        <div className="p-4 rounded border border-border bg-card">
          <span className="text-xs text-muted-foreground">High Readiness Band (&ge; 75%)</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {data.readinessBands?.high ?? 0}
          </p>
          <span className="text-[11px] text-muted-foreground">Ready for placement drives</span>
        </div>
        <div className="p-4 rounded border border-border bg-card">
          <span className="text-xs text-muted-foreground">Medium Band (60 - 74%)</span>
          <p className="text-2xl font-bold text-amber-500 mt-1">{data.readinessBands?.medium ?? 0}</p>
          <span className="text-[11px] text-muted-foreground">Progression track</span>
        </div>
        <div className="p-4 rounded border border-border bg-card">
          <span className="text-xs text-muted-foreground">Needs Attention (&lt; 60%)</span>
          <p className="text-2xl font-bold text-rose-500 mt-1">{data.readinessBands?.needsAttention ?? 0}</p>
          <span className="text-[11px] text-muted-foreground">Priority intervention candidates</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Competency Domain Radar & Scores">
          <div className="space-y-4">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={[
                    { domain: "Technical", score: data.skills?.technical ?? 0, benchmark: 75 },
                    { domain: "Aptitude", score: data.skills?.aptitude ?? 0, benchmark: 70 },
                    { domain: "Verbal", score: data.skills?.verbal ?? 0, benchmark: 72 },
                    { domain: "Soft Skills", score: data.skills?.softSkills ?? 0, benchmark: 80 },
                    { domain: "Coding Judge", score: data.skills?.coding ?? 0, benchmark: 65 },
                  ]}
                  margin={{ top: 12, right: 30, bottom: 12, left: 30 }}
                >
                  <PolarGrid stroke="#8b5cf6" strokeOpacity={0.25} />
                  <PolarAngleAxis
                    dataKey="domain"
                    tick={(props: any) => {
                      const { x, y, payload, textAnchor } = props;
                      const colors: Record<string, string> = {
                        Technical: "#0284c7",
                        Aptitude: "#059669",
                        Verbal: "#db2777",
                        "Soft Skills": "#d97706",
                        "Coding Judge": "#7c3aed",
                      };
                      const fill = colors[payload.value] || "#0284c7";
                      return (
                        <text
                          x={x}
                          y={y}
                          fill={fill}
                          fontSize={11}
                          fontWeight="700"
                          textAnchor={textAnchor}
                          className="drop-shadow-sm"
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
                    dot={{ r: 4, fill: "#c084fc", stroke: "#7e22ce", strokeWidth: 1.5 }}
                  />
                  <Radar
                    name="Industry Benchmark"
                    dataKey="benchmark"
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="#06b6d4"
                    fillOpacity={0.12}
                    dot={{ r: 3, fill: "#67e8f9" }}
                  />
                  <RechartsTooltip
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

            <div className="flex items-center justify-center gap-6 text-xs pb-1">
              <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shadow-sm" /> Campus Cohort Score
              </span>
              <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 shadow-sm" /> Industry Benchmark
              </span>
            </div>

            <div className="space-y-2.5 text-xs border-t border-border/70 pt-3">
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="flex items-center gap-2 font-medium text-sky-600 dark:text-sky-400">
                  <span className="h-2 w-2 rounded-full bg-sky-500" /> Technical Competency
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-20 sm:w-28 h-1.5 rounded-full bg-sky-500/20 overflow-hidden hidden sm:block">
                    <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${data.skills?.technical ?? 0}%` }} />
                  </div>
                  <strong className="text-sky-600 dark:text-sky-400 font-mono font-bold text-sm">{data.skills?.technical ?? "Unassessed"}%</strong>
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Aptitude & Reasoning
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-20 sm:w-28 h-1.5 rounded-full bg-emerald-500/20 overflow-hidden hidden sm:block">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${data.skills?.aptitude ?? 0}%` }} />
                  </div>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm">{data.skills?.aptitude ?? "Unassessed"}%</strong>
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="flex items-center gap-2 font-medium text-pink-600 dark:text-pink-400">
                  <span className="h-2 w-2 rounded-full bg-pink-500" /> Verbal Communication
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-20 sm:w-28 h-1.5 rounded-full bg-pink-500/20 overflow-hidden hidden sm:block">
                    <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${data.skills?.verbal ?? 0}%` }} />
                  </div>
                  <strong className="text-pink-600 dark:text-pink-400 font-mono font-bold text-sm">{data.skills?.verbal ?? "Unassessed"}%</strong>
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Soft Skills & Professionalism
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-20 sm:w-28 h-1.5 rounded-full bg-amber-500/20 overflow-hidden hidden sm:block">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${data.skills?.softSkills ?? 0}%` }} />
                  </div>
                  <strong className="text-amber-600 dark:text-amber-400 font-mono font-bold text-sm">{data.skills?.softSkills ?? "Unassessed"}%</strong>
                </div>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="flex items-center gap-2 font-medium text-purple-600 dark:text-purple-400">
                  <span className="h-2 w-2 rounded-full bg-purple-500" /> Coding Judge Evidence Score
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-20 sm:w-28 h-1.5 rounded-full bg-purple-500/20 overflow-hidden hidden sm:block">
                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${data.skills?.coding ?? 0}%` }} />
                  </div>
                  <strong className="text-purple-600 dark:text-purple-400 font-mono font-bold text-sm">{data.skills?.coding ?? 0}%</strong>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Placement Readiness Bands Distribution">
          <div className="space-y-4">
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Tier-1 Ready (≥75%)", value: data.readinessBands?.high ?? 0, color: "#10b981" },
                      { name: "Tier-2 Candidate (60-74%)", value: data.readinessBands?.medium ?? 0, color: "#f59e0b" },
                      { name: "Needs Attention (<60%)", value: data.readinessBands?.needsAttention ?? 0, color: "#f43f5e" },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {[
                      { name: "Tier-1 Ready (≥75%)", value: data.readinessBands?.high ?? 0, color: "#10b981" },
                      { name: "Tier-2 Candidate (60-74%)", value: data.readinessBands?.medium ?? 0, color: "#f59e0b" },
                      { name: "Needs Attention (<60%)", value: data.readinessBands?.needsAttention ?? 0, color: "#f43f5e" },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0];
                      return (
                        <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.payload.color || d.color }} />
                            <span>{d.name}</span>
                          </p>
                          <p className="text-muted-foreground flex items-center justify-between gap-3">
                            <span>Students:</span>
                            <strong className="text-foreground font-mono">{d.value} Candidates</strong>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-border pt-3">
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block">Tier-1 Ready</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {data.readinessBands?.high ?? 0}
                </span>
              </div>
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium block">Tier-2 Cand.</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
                  {data.readinessBands?.medium ?? 0}
                </span>
              </div>
              <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20">
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium block">Attention</span>
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono">
                  {data.readinessBands?.needsAttention ?? 0}
                </span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Department Performance & Average Readiness Breakdown">
        <div className="space-y-4">
          {data.departments?.length > 0 && (
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.departments.map((d: any) => ({
                    shortDept: d.department.length > 18 ? d.department.substring(0, 16) + "…" : d.department,
                    department: d.department,
                    averageReadiness: d.averageReadiness,
                    studentCount: d.studentCount,
                  }))}
                  margin={{ top: 10, right: 20, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                  <XAxis
                    dataKey="shortDept"
                    stroke="var(--border)"
                    tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                    tickLine={{ stroke: "var(--border)" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="var(--border)"
                    tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                    tickLine={{ stroke: "var(--border)" }}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1 min-w-[200px]">
                          <p className="font-semibold text-foreground text-sm border-b border-border/50 pb-1">{d.department}</p>
                          <p className="text-muted-foreground flex items-center justify-between gap-2">
                            <span>Average Readiness:</span>
                            <strong className="text-primary font-mono">{d.averageReadiness}%</strong>
                          </p>
                          <p className="text-muted-foreground flex items-center justify-between gap-2 text-[11px]">
                            <span>Enrolled Pool:</span>
                            <strong className="text-foreground font-mono">{d.studentCount} Students</strong>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="averageReadiness"
                    name="Average Readiness"
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs pt-2">
            {data.departments?.map((dept: any) => (
              <div key={dept.department} className="p-2.5 rounded border border-border flex justify-between items-center bg-card">
                <div>
                  <p className="font-semibold text-foreground truncate max-w-[170px]" title={dept.department}>{dept.department}</p>
                  <p className="text-[11px] text-muted-foreground">{dept.studentCount} students enrolled</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-primary">{dept.averageReadiness}%</span>
                  <p className="text-[10px] text-muted-foreground">Readiness</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 4. Skill Analytics View
// -----------------------------------------------------------------------------
function CoordinatorSkillsView() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.coordinator.skills
      .get()
      .then(setAnalytics)
      .catch(() => toast.error("Failed to load skill analytics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !analytics) {
    return <div className="py-12 text-center text-xs text-muted-foreground">Loading Skill Analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <Panel title="Domain Competency Benchmarks & Industry Comparison">
        <div className="space-y-6">
          {analytics.domainAverages?.length > 0 && (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.domainAverages.map((d: any) => ({
                    domain: d.domain,
                    average: d.average,
                    benchmark: d.benchmark,
                  }))}
                  margin={{ top: 10, right: 20, left: -10, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                  <XAxis
                    dataKey="domain"
                    stroke="var(--border)"
                    tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                    tickLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                    stroke="var(--border)"
                    tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                    tickLine={{ stroke: "var(--border)" }}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1.5 min-w-[200px]">
                          <p className="font-semibold text-foreground text-sm border-b border-border/50 pb-1">{label} Domain</p>
                          {payload.map((entry: any, i: number) => (
                            <p key={i} className="flex items-center justify-between gap-3 text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                                <span>{entry.name}:</span>
                              </span>
                              <strong className="text-foreground font-mono">{entry.value}%</strong>
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    formatter={(value) => (value === "average" ? "Campus Average" : "Industry Benchmark")}
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  />
                  <Bar dataKey="average" name="Campus Average" radius={[4, 4, 0, 0]}>
                    {analytics.domainAverages.map((_: any, index: number) => {
                      const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4"];
                      return <Cell key={`domain-cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                  <Bar dataKey="benchmark" name="Industry Benchmark" fill="#94a3b8" radius={[4, 4, 0, 0]} opacity={0.45} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {analytics.domainAverages?.map((d: any, idx: number) => {
              const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4"];
              const color = colors[idx % colors.length];
              return (
                <div key={d.domain} className="p-3.5 border border-border rounded bg-card space-y-1.5 hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-medium text-foreground truncate">{d.domain}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold font-mono" style={{ color }}>{d.average}%</span>
                    <span className="text-xs text-muted-foreground font-mono">/ Benchmark {d.benchmark}%</span>
                  </div>
                  <Badge
                    variant={d.status === "On Track" ? "secondary" : "outline"}
                    className={`text-[10px] ${d.status === "On Track" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}
                  >
                    {d.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Identified Skill Gaps & Focus Areas">
          <div className="space-y-3 text-xs">
            {/* Visual Skill Gap Impact Bar */}
            {analytics.skillGaps?.length > 0 && (
              <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-2">
                <span className="text-[11px] font-medium text-foreground block">Remediation Gap Distribution</span>
                <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted">
                  {analytics.skillGaps.map((g: any, i: number) => {
                    const colors = ["#f43f5e", "#f59e0b", "#8b5cf6", "#3b82f6"];
                    const total = analytics.skillGaps.reduce((acc: number, curr: any) => acc + curr.affectedStudents, 0) || 1;
                    const pct = Math.round((g.affectedStudents / total) * 100);
                    return (
                      <div
                        key={g.skill}
                        style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }}
                        title={`${g.skill}: ${g.affectedStudents} students (${pct}%)`}
                        className="h-full transition-all"
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {analytics.skillGaps.map((g: any, i: number) => {
                    const colors = ["#f43f5e", "#f59e0b", "#8b5cf6", "#3b82f6"];
                    return (
                      <span key={g.skill} className="flex items-center gap-1 text-muted-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                        <span className="truncate max-w-[100px]">{g.skill}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {analytics.skillGaps?.map((g: any) => (
              <div key={g.skill} className="p-3 border border-border rounded space-y-1">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-foreground">{g.skill}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      g.priority === "High" ? "border-rose-500 text-rose-500" : "border-amber-500 text-amber-500"
                    }`}
                  >
                    {g.priority} Priority
                  </Badge>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Domain: {g.domain}</span>
                  <span>Affected Students: <strong className="text-foreground">{g.affectedStudents}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Curriculum Milestones & Target Dates">
          <div className="space-y-3 text-xs">
            {analytics.curriculumProgress?.map((p: any) => (
              <div key={p.module} className="p-3 border border-border rounded space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">{p.module}</span>
                  <span className="font-mono text-muted-foreground">Target: {p.targetDate}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${p.completionRate}%` }} />
                </div>
                <span className="text-[11px] text-muted-foreground">{p.completionRate}% syllabus completed</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 5. Placement Readiness View
// -----------------------------------------------------------------------------
function CoordinatorPlacementReadinessView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.coordinator.placementReadiness
      .get()
      .then(setData)
      .catch(() => toast.error("Failed to load placement readiness"))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="py-12 text-center text-xs text-muted-foreground">Loading Placement Readiness...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
        <span className="text-xs text-foreground">
          <strong>Corporate Recruitment Workflows:</strong> Provision placement officer credentials, configure recruitment criteria, and inspect eligible students.
        </span>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
            <Link to="/coordinator/placement-officers">Placement Officers &rarr;</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
            <Link to="/coordinator/m/$module" params={{ module: "placement-requirements" }}>Drive Criteria &rarr;</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
            <Link to="/coordinator/students">Student Roster &rarr;</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded border border-border bg-card">
          <span className="text-xs text-muted-foreground">Total Assessed</span>
          <p className="text-2xl font-bold text-foreground mt-1">{data.totalStudents}</p>
          <span className="text-[11px] text-muted-foreground">Registered candidates</span>
        </div>
        <div className="p-4 rounded border border-border bg-card">
          <span className="text-xs text-muted-foreground">Tier-1 Qualified (&ge; 80%)</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{data.tier1Eligible}</p>
          <span className="text-[11px] text-muted-foreground">High-package drives</span>
        </div>
        <div className="p-4 rounded border border-border bg-card">
          <span className="text-xs text-muted-foreground">Tier-2 Qualified (65 - 79%)</span>
          <p className="text-2xl font-bold text-primary mt-1">{data.tier2Eligible}</p>
          <span className="text-[11px] text-muted-foreground">Standard recruitment</span>
        </div>
        <div className="p-4 rounded border border-border bg-card">
          <span className="text-xs text-muted-foreground">Overall Readiness Rate</span>
          <p className="text-2xl font-bold text-foreground mt-1">{data.readinessRate}%</p>
          <span className="text-[11px] text-muted-foreground">Campus eligibility</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Placement Qualification Tier Distribution">
          <div className="space-y-4">
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Tier-1 (≥80%)", value: data.tier1Eligible, color: "#10b981" },
                      { name: "Tier-2 (65-79%)", value: data.tier2Eligible, color: "#6366f1" },
                      {
                        name: "In Upskilling (<65%)",
                        value: Math.max(0, data.totalStudents - (data.tier1Eligible + data.tier2Eligible)),
                        color: "#f59e0b",
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {[
                      { name: "Tier-1 (≥80%)", color: "#10b981" },
                      { name: "Tier-2 (65-79%)", color: "#6366f1" },
                      { name: "In Upskilling (<65%)", color: "#f59e0b" },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0];
                      return (
                        <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.payload.color || d.color }} />
                            <span>{d.name}</span>
                          </p>
                          <p className="text-muted-foreground flex items-center justify-between gap-3">
                            <span>Students:</span>
                            <strong className="text-foreground font-mono">{d.value} Candidates</strong>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-border pt-3">
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block">Tier-1 Ready</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{data.tier1Eligible}</span>
              </div>
              <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20">
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium block">Tier-2 Ready</span>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono">{data.tier2Eligible}</span>
              </div>
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium block">In Upskilling</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
                  {Math.max(0, data.totalStudents - (data.tier1Eligible + data.tier2Eligible))}
                </span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Recruitment Drive Candidate Pool">
          <div className="space-y-4">
            {data.topDrives?.length > 0 && (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topDrives}
                    margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                    <XAxis
                      dataKey="company"
                      stroke="var(--border)"
                      tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                      tickLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      stroke="var(--border)"
                      tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                      tickLine={{ stroke: "var(--border)" }}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1 min-w-[200px]">
                            <p className="font-semibold text-foreground text-sm border-b border-border/50 pb-1">{d.company}</p>
                            <p className="text-muted-foreground flex items-center justify-between gap-2">
                              <span>Eligible Pool:</span>
                              <strong className="text-foreground font-mono">{d.eligibleCount} Students</strong>
                            </p>
                            <p className="text-muted-foreground flex items-center justify-between gap-2 text-[11px]">
                              <span>Min Cutoff:</span>
                              <strong className="text-primary font-mono">{d.minScore}%</strong>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="eligibleCount"
                      name="Eligible Pool"
                      radius={[4, 4, 0, 0]}
                    >
                      {data.topDrives.map((_: any, index: number) => {
                        const DRIVE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"];
                        return <Cell key={`drive-cell-${index}`} fill={DRIVE_COLORS[index % DRIVE_COLORS.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground text-center border-t border-border pt-2">
              Based on active institutional cutoff criteria and Intelligence Layer C composite scores.
            </p>
          </div>
        </Panel>
      </div>

      <Panel title="Corporate Recruitment Drive Trackers">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.topDrives?.map((drive: any, idx: number) => {
            const DRIVE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"];
            const color = DRIVE_COLORS[idx % DRIVE_COLORS.length];
            return (
              <div key={drive.company} className="p-3.5 border border-border rounded bg-card space-y-1.5 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-semibold text-sm text-foreground truncate">{drive.company}</span>
                </div>
                <p className="text-xs text-muted-foreground">Min Cutoff: {drive.minScore}%</p>
                <div className="pt-2 border-t border-border flex justify-between items-center text-xs">
                  <span>Eligible:</span>
                  <span className="font-bold font-mono" style={{ color }}>
                    {drive.eligibleCount} Candidates
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 6. Placement Requirements View
// -----------------------------------------------------------------------------
function CoordinatorPlacementRequirementsView() {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    roleTitle: "",
    minCgpa: "7.0",
    eligibleBranches: "Computer Science & Engineering, Information Science",
    requiredSkills: "Data Structures, Python, SQL",
    deadline: "2026-11-30",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchReqs = () => {
    setLoading(true);
    api.coordinator.placementRequirements
      .list()
      .then(setRequirements)
      .catch(() => toast.error("Failed to load placement requirements"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReqs();
  }, []);

  const handleCreate = async () => {
    if (!form.companyName.trim() || !form.roleTitle.trim()) {
      toast.error("Company name and role title are required.");
      return;
    }
    setSubmitting(true);
    try {
      await api.coordinator.placementRequirements.create({
        companyName: form.companyName.trim(),
        roleTitle: form.roleTitle.trim(),
        minCgpa: parseFloat(form.minCgpa) || 7.0,
        eligibleBranches: form.eligibleBranches.split(",").map((s) => s.trim()).filter(Boolean),
        requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        deadline: form.deadline,
      });
      toast.success("Placement requirement created successfully.");
      setOpenModal(false);
      setForm({
        companyName: "",
        roleTitle: "",
        minCgpa: "7.0",
        eligibleBranches: "Computer Science & Engineering, Information Science",
        requiredSkills: "Data Structures, Python, SQL",
        deadline: "2026-11-30",
      });
      fetchReqs();
    } catch (err: any) {
      toast.error(err?.message ?? "Error creating requirement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel
      title={`Campus Placement Criteria (${requirements.length})`}
      action={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
            <Link to="/coordinator/placement-officers">Placement Officers</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
            <Link to="/coordinator/m/$module" params={{ module: "placement-readiness" }}>Readiness Tiers</Link>
          </Button>
          <Button size="sm" onClick={() => setOpenModal(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> New Requirement
          </Button>
          <Button variant="outline" size="sm" onClick={fetchReqs} disabled={loading} className="gap-1.5 text-xs">
            <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">Loading requirements...</div>
      ) : requirements.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">No placement requirements defined.</div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const REQ_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];
            const matchedData = requirements.map((r: any, idx: number) => ({
              name: r.companyName.length > 12 ? r.companyName.slice(0, 10) + "…" : r.companyName,
              fullName: `${r.companyName} (${r.roleTitle})`,
              matched: r.matchedStudentsCount || 0,
              color: REQ_COLORS[idx % REQ_COLORS.length],
            }));

            const cgpaBrackets = [
              { name: "CGPA < 7.0", count: requirements.filter((r) => r.minCgpa < 7.0).length, color: "#10b981" },
              { name: "CGPA 7.0 - 7.9", count: requirements.filter((r) => r.minCgpa >= 7.0 && r.minCgpa < 8.0).length, color: "#3b82f6" },
              { name: "CGPA ≥ 8.0", count: requirements.filter((r) => r.minCgpa >= 8.0).length, color: "#8b5cf6" },
            ].filter((b) => b.count > 0);

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-primary" /> Matched Candidates per Opportunity
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {requirements.reduce((acc, r) => acc + (r.matchedStudentsCount || 0), 0)} Matched
                    </Badge>
                  </div>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={matchedData} margin={{ top: 8, right: 10, left: -15, bottom: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                        <XAxis
                          dataKey="name"
                          stroke="var(--border)"
                          tick={{ fill: "var(--foreground)", fontSize: 10, fontWeight: 500 }}
                          tickLine={{ stroke: "var(--border)" }}
                          interval={0}
                        />
                        <YAxis
                          stroke="var(--border)"
                          tick={{ fill: "var(--foreground)", fontSize: 10, fontWeight: 500 }}
                          tickLine={{ stroke: "var(--border)" }}
                          allowDecimals={false}
                        />
                        <RechartsTooltip
                          cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null;
                            const item = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                                <p className="font-semibold text-foreground">{item.fullName}</p>
                                <p className="text-muted-foreground flex justify-between gap-3">
                                  <span>Matched Students:</span>
                                  <strong className="text-foreground font-mono">{item.matched}</strong>
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="matched" name="Matched" radius={[4, 4, 0, 0]}>
                          {matchedData.map((entry: any, index: number) => (
                            <Cell key={`req-cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-emerald-500" /> Academic CGPA Cutoff Bands
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Criteria Tiers
                    </Badge>
                  </div>
                  <div className="h-44 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={cgpaBrackets}
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={58}
                          paddingAngle={4}
                          dataKey="count"
                        >
                          {cgpaBrackets.map((entry, index) => (
                            <Cell key={`cgpa-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0];
                            return (
                              <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2 shadow-xl text-xs space-y-1">
                                <p className="font-semibold text-foreground flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.payload.color || d.color }} />
                                  <span>{d.name}</span>
                                </p>
                                <p className="text-muted-foreground flex justify-between gap-2">
                                  <span>Drives:</span>
                                  <strong className="text-foreground font-mono">{d.value}</strong>
                                </p>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-lg font-bold font-display text-primary">
                        {requirements.length}
                      </span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Criteria</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="space-y-3 pt-1">
          {requirements.map((r) => (
            <div key={r.id} className="p-4 border border-border rounded bg-card flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-foreground">{r.companyName}</h4>
                  <Badge variant="secondary" className="text-[10px]">{r.roleTitle}</Badge>
                  <Badge variant="outline" className="text-[10px] uppercase">{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Min CGPA: <strong className="text-foreground">{r.minCgpa}</strong> · Cutoff Deadline: {r.deadline}
                </p>
                <div className="flex gap-1 flex-wrap pt-1">
                  {r.requiredSkills?.map((s: string) => (
                    <Badge key={s} variant="outline" className="text-[9px] font-mono">{s}</Badge>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {r.matchedStudentsCount ?? 0}
                </span>
                <p className="text-[11px] text-muted-foreground">Matched Students</p>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Campus Placement Criteria</DialogTitle>
            <DialogDescription>
              Configure recruitment drive qualifications to automatically filter eligible students.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Company Name</Label>
              <Input
                placeholder="e.g. Amazon AWS"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Role Title</Label>
              <Input
                placeholder="e.g. Graduate Software Engineer"
                value={form.roleTitle}
                onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min CGPA</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.minCgpa}
                  onChange={(e) => setForm({ ...form, minCgpa: e.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Application Deadline</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Eligible Branches (comma-separated)</Label>
              <Input
                value={form.eligibleBranches}
                onChange={(e) => setForm({ ...form, eligibleBranches: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Required Skills (comma-separated)</Label>
              <Input
                value={form.requiredSkills}
                onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={submitting}>
              {submitting ? "Saving..." : "Create Requirement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

// -----------------------------------------------------------------------------
// 7. Bulk Data Import & Exports View (12-Step Pipeline)
// -----------------------------------------------------------------------------
function parseStudentCsv(text: string): any[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(",")
    .map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase());

  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let insideQuotes = false;
    let cur = "";
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        values.push(cur.trim().replace(/^["']|["']$/g, ""));
        cur = "";
      } else {
        cur += char;
      }
    }
    values.push(cur.trim().replace(/^["']|["']$/g, ""));

    const rowObj: any = {};
    headers.forEach((h, colIdx) => {
      const val = values[colIdx] || "";
      if (h.includes("name")) rowObj.name = val;
      else if (h.includes("usn") || h.includes("roll")) rowObj.usn = val;
      else if (h.includes("email")) rowObj.email = val;
      else if (h.includes("dept") || h.includes("department")) rowObj.department = val;
      else if (h.includes("prog") || h.includes("program")) rowObj.program = val;
      else if (h.includes("year")) rowObj.year = val;
      else if (h.includes("sem") || h.includes("semester")) rowObj.semester = val;
      else if (h.includes("sec") || h.includes("section")) rowObj.section = val;
      else rowObj[h] = val;
    });

    if (rowObj.name || rowObj.usn) {
      rows.push(rowObj);
    }
  }
  return rows;
}

function CoordinatorImportsExportsView({ collegeCode }: { collegeCode: string }) {
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeFileName, setActiveFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDownloadTemplate = () => {
    const templateCsv = `name,usn,email,department,program,year,semester,section
Aarav Sharma,1SI23CS101,aarav.sharma@institution.edu,Computer Science & Engineering,B.Tech,3rd Year,Semester 5,Section A
Diya Nair,1SI23IS102,diya.nair@institution.edu,Information Science,B.Tech,3rd Year,Semester 5,Section B
Vikram Malhotra,1SI23EC103,vikram.m@institution.edu,Electronics & Communication,B.Tech,3rd Year,Semester 5,Section A
Ananya Rao,1SI23CS104,ananya.rao@institution.edu,Computer Science & Engineering,B.Tech,3rd Year,Semester 5,Section B`;

    const blob = new Blob([templateCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `student_roster_template_${collegeCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded blank student roster CSV template.");
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a standard CSV spreadsheet file (.csv).");
      return;
    }
    setActiveFileName(file.name);
    setValidating(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsedRows = parseStudentCsv(text);
        if (parsedRows.length === 0) {
          toast.error("CSV file contains no readable student data rows.");
          setValidating(false);
          return;
        }
        const res = await api.coordinator.dataImport.validate(file.name, parsedRows);
        setValidationResult(res);
        if (res.validRows > 0) {
          toast.success(`12-step validation complete: ${res.validRows} valid rows ready for ingestion.`);
        } else {
          toast.error(`12-step validation failed: ${res.rejectedRows} rows rejected.`);
        }
      } catch (err: any) {
        toast.error(err?.message ?? "Validation failed");
      } finally {
        setValidating(false);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read the selected CSV file.");
      setValidating(false);
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleConfirmCommit = async () => {
    if (!validationResult?.id) return;
    setCommitting(true);
    try {
      const res = await api.coordinator.dataImport.confirm(validationResult.id);
      toast.success(`Successfully ingested ${res.confirmedCount} students to campus roster!`);
      setValidationResult(null);
      setActiveFileName("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to commit import");
    } finally {
      setCommitting(false);
    }
  };

  const handleExport = async (type: string) => {
    try {
      const report = await api.coordinator.reports.export({ reportType: type, format: "csv" });
      const blob = new Blob([report.csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${type}_${collegeCode}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${type} (.csv) successfully.`);
    } catch {
      toast.error("Export generation failed.");
    }
  };

  return (
    <div className="space-y-6">
      <Panel
        title="12-Step Bulk Student Ingestion Pipeline"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> Sample CSV Template
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link to="/coordinator/students">Student Directory</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link to="/coordinator/academic">Academic Masters</Link>
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-muted-foreground">
            Ziphyrus X verifies student records through a strict 12-step validation check covering headers, USN format, email syntax, campus scope, file-level uniqueness, database collision checks, and academic structure validity.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* Interactive Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-primary bg-primary/10 scale-[1.01]"
                : "border-border hover:border-primary/50 bg-muted/10 hover:bg-muted/20"
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <h4 className="font-semibold text-sm text-foreground">
                {validating ? "Running 12-Step Ingestion Checks..." : "Drag and drop student roster CSV here"}
              </h4>
              <p className="text-muted-foreground text-xs max-w-sm">
                Supports CSV spreadsheets with columns: <span className="font-mono text-[11px]">name, usn, email, department, program, year, semester, section</span>
              </p>
              <div className="pt-2 flex items-center gap-2">
                <Button size="sm" type="button" disabled={validating} className="gap-1.5">
                  <FileSpreadsheet className="h-4 w-4" /> Browse CSV File
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadTemplate();
                  }}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> Template
                </Button>
              </div>
            </div>
          </div>

          {validationResult && (
            <div className="p-4 border border-border rounded-xl space-y-4 bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="space-y-0.5">
                  <span className="font-semibold text-sm text-foreground">Import Preview: {validationResult.filename || activeFileName}</span>
                  <p className="text-[11px] text-muted-foreground">Tenant scoped to campus {collegeCode}</p>
                </div>
                <Badge variant={validationResult.validRows > 0 ? "secondary" : "destructive"}>
                  {validationResult.status.toUpperCase()}
                </Badge>
              </div>

              {/* Visual Validation Telemetry */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center p-3 rounded-lg border border-border/70 bg-muted/10">
                <div className="h-28 relative col-span-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Valid Records", value: validationResult.validRows, color: "#10b981" },
                          { name: "Rejected Records", value: validationResult.rejectedRows, color: "#f43f5e" },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={45}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f43f5e" />
                      </Pie>
                      <RechartsTooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0];
                          return (
                            <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2 shadow-xl text-xs space-y-1">
                              <p className="font-semibold text-foreground flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.payload.color || d.color }} />
                                <span>{d.name}</span>
                              </p>
                              <p className="text-muted-foreground flex justify-between gap-2">
                                <span>Rows:</span>
                                <strong className="text-foreground font-mono">{d.value}</strong>
                              </p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {validationResult.totalRows > 0
                        ? Math.round((validationResult.validRows / validationResult.totalRows) * 100)
                        : 0}%
                    </span>
                    <span className="text-[8px] text-muted-foreground uppercase">Passed</span>
                  </div>
                </div>

                <div className="col-span-2 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Valid Records
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {validationResult.validRows} / {validationResult.totalRows}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{
                        width: `${
                          validationResult.totalRows > 0
                            ? (validationResult.validRows / validationResult.totalRows) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-rose-500" /> Rejected Records
                    </span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                      {validationResult.rejectedRows} / {validationResult.totalRows}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 border border-border rounded-lg bg-card/60">
                  <span className="text-muted-foreground block text-[11px]">Total Rows Parsed</span>
                  <p className="font-bold text-xl text-foreground mt-0.5">{validationResult.totalRows}</p>
                </div>
                <div className="p-3 border border-emerald-500/30 bg-emerald-500/5 rounded-lg">
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[11px] font-medium">Valid Records</span>
                  <p className="font-bold text-xl text-emerald-600 dark:text-emerald-400 mt-0.5">{validationResult.validRows}</p>
                </div>
                <div className="p-3 border border-rose-500/30 bg-rose-500/5 rounded-lg">
                  <span className="text-rose-600 dark:text-rose-400 block text-[11px] font-medium">Rejected Records</span>
                  <p className="font-bold text-xl text-rose-600 dark:text-rose-400 mt-0.5">{validationResult.rejectedRows}</p>
                </div>
              </div>

              {/* Specific 12-Step Failure Messages */}
              {validationResult.errors?.length > 0 && (
                <div className="p-3 border border-rose-500/30 bg-rose-500/5 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Specific Step Failures ({validationResult.errors.length} validation errors)</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-[11px]">
                    {validationResult.errors.map((err: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
                        <span className="font-mono font-bold shrink-0">Row {err.row}:</span>
                        <span>
                          [{err.field}] {err.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Staged Valid Records Preview */}
              {validationResult.previewData?.length > 0 && (
                <div>
                  <p className="font-semibold text-foreground text-xs mb-1.5">Staged Valid Records ({validationResult.previewData.length}):</p>
                  <div className="max-h-52 overflow-y-auto space-y-1.5">
                    {validationResult.previewData.map((row: any, idx: number) => (
                      <div key={idx} className="p-2.5 border border-border rounded flex justify-between items-center text-xs bg-muted/20">
                        <div>
                          <span className="font-semibold text-foreground">{row.name}</span>
                          <span className="font-mono text-muted-foreground ml-2 text-[11px]">({row.usn})</span>
                        </div>
                        <div className="text-right text-[11px] text-muted-foreground">
                          <span>{row.department}</span>
                          <span className="ml-2 font-mono">Sec {row.section}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => { setValidationResult(null); setActiveFileName(""); }}>
                  Discard
                </Button>
                <Button size="sm" onClick={handleConfirmCommit} disabled={committing || validationResult.validRows === 0}>
                  {committing ? "Ingesting to Campus..." : `Confirm & Commit (${validationResult.validRows} Records)`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Authorized College Exports">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => handleExport("students_roster")}>
            <Download className="mr-2 h-4 w-4" /> Export Students (.csv)
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("readiness_summary")}>
            <Download className="mr-2 h-4 w-4" /> Export Readiness Report (.csv)
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("placement_eligibility")}>
            <Download className="mr-2 h-4 w-4" /> Export Placement Eligibility (.csv)
          </Button>
        </div>
      </Panel>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 8. Reports View
// -----------------------------------------------------------------------------
function CoordinatorReportsView({ collegeCode }: { collegeCode: string }) {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    api.coordinator.reports
      .list()
      .then((res) => setReports(res?.availableReports || []))
      .catch(() => {});
  }, []);

  const handleDownload = async (reportId: string, title: string) => {
    try {
      const res = await api.coordinator.reports.export({ reportType: reportId, format: "csv" });
      const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${reportId}_${collegeCode}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloaded ${title} (.csv)`);
    } catch {
      toast.error("Report download failed.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Graphical Telemetry: Institutional Operational Data Completeness */}
      {(() => {
        const coverageData = [
          { domain: "Student Roster", coverage: 100, color: "#10b981", desc: "Authoritative USN Records" },
          { domain: "Intelligence C", coverage: 94, color: "#3b82f6", desc: "Composite Readiness Evaluated" },
          { domain: "Drive Criteria", coverage: 88, color: "#8b5cf6", desc: "Institutional Cutoffs Matched" },
          { domain: "Action Plans", coverage: 82, color: "#f59e0b", desc: "Faculty Remediation Progress" },
          { domain: "Tenant Guard", coverage: 100, color: "#06b6d4", desc: "College Scoped Immutability" },
        ];

        return (
          <Panel title="Campus Operational Data Health & Accreditation Completeness">
            <div className="space-y-4">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coverageData} margin={{ top: 10, right: 15, left: -10, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                    <XAxis
                      dataKey="domain"
                      stroke="var(--border)"
                      tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                      tickLine={{ stroke: "var(--border)" }}
                      interval={0}
                    />
                    <YAxis
                      domain={[0, 100]}
                      unit="%"
                      stroke="var(--border)"
                      tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                      tickLine={{ stroke: "var(--border)" }}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                            <p className="font-semibold text-foreground flex items-center justify-between gap-3">
                              <span>{d.domain}:</span>
                              <strong className="text-foreground font-mono">{d.coverage}%</strong>
                            </p>
                            <p className="text-[11px] text-muted-foreground">{d.desc}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="coverage" name="Coverage" radius={[4, 4, 0, 0]}>
                      {coverageData.map((entry, index) => (
                        <Cell key={`cov-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs border-t border-border/50 pt-3">
                {coverageData.map((c) => (
                  <div key={c.domain} className="p-2 rounded bg-card/60 border border-border/50">
                    <div className="flex items-center justify-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="font-bold text-foreground font-mono">{c.coverage}%</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block truncate">{c.domain}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        );
      })()}

      <Panel
        title="Campus Operational & Academic Reports"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
              <Link to="/coordinator/students">Students</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
              <Link to="/coordinator/sessions">Sessions</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
              <Link to="/coordinator/action-plans">Action Plans</Link>
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {reports.map((rep) => (
            <div key={rep.id} className="p-4 border border-border rounded bg-card flex flex-col justify-between gap-3">
              <div>
                <h4 className="font-semibold text-sm text-foreground">{rep.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{rep.desc}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleDownload(rep.id, rep.title)} className="w-full gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Download (.CSV)
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Compliance & Non-Fabrication Law">
        <p className="text-xs text-muted-foreground">
          Under Ziphyrus X policy, operational reports reflect authoritative transactional records only. Attendance reports do not exist. Derived intelligence and candidate placement readouts remain strictly managed by their authoritative origin domains.
        </p>
      </Panel>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 9. College Settings View
// -----------------------------------------------------------------------------
function CoordinatorSettingsView() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.coordinator.settings
      .get()
      .then(setSettings)
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.coordinator.settings.update(settings);
      toast.success("College operational settings saved successfully.");
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="py-12 text-center text-xs text-muted-foreground">Loading college settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Panel title="Student Self-Registration Controls">
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Auto-approve Campus Domain Email</p>
              <p className="text-muted-foreground">Automatically activate students registering with @institution domain</p>
            </div>
            <input
              type="checkbox"
              checked={settings.allowedRegistrationSettings?.autoApproveDomain ?? true}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  allowedRegistrationSettings: {
                    ...settings.allowedRegistrationSettings,
                    autoApproveDomain: e.target.checked,
                  },
                })
              }
              className="h-4 w-4"
            />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div>
              <p className="font-medium text-foreground">Require USN Pre-verification</p>
              <p className="text-muted-foreground">Match submitted USN against uploaded master roster</p>
            </div>
            <input
              type="checkbox"
              checked={settings.allowedRegistrationSettings?.requireUsnVerification ?? true}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  allowedRegistrationSettings: {
                    ...settings.allowedRegistrationSettings,
                    requireUsnVerification: e.target.checked,
                  },
                })
              }
              className="h-4 w-4"
            />
          </div>
        </div>
      </Panel>

      <Panel title="Section Defaults">
        <div className="space-y-3 text-xs">
          <div>
            <Label className="text-xs">Max Students Per Section</Label>
            <Input
              type="number"
              value={settings.sectionDefaults?.maxStudentsPerSection ?? 60}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  sectionDefaults: {
                    ...settings.sectionDefaults,
                    maxStudentsPerSection: parseInt(e.target.value) || 60,
                  },
                })
              }
              className="mt-1 h-8 text-xs max-w-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Default Academic Year</Label>
            <Input
              value={settings.sectionDefaults?.defaultAcademicYear ?? "2026-2027"}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  sectionDefaults: {
                    ...settings.sectionDefaults,
                    defaultAcademicYear: e.target.value,
                  },
                })
              }
              className="mt-1 h-8 text-xs max-w-xs"
            />
          </div>
        </div>
      </Panel>

      <Panel title="Campus Operational Contacts">
        <div className="space-y-3 text-xs">
          <div>
            <Label className="text-xs">Nodal Officer Name</Label>
            <Input
              value={settings.operationalContacts?.nodalOfficerName ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  operationalContacts: {
                    ...settings.operationalContacts,
                    nodalOfficerName: e.target.value,
                  },
                })
              }
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Placement Cell Email</Label>
            <Input
              value={settings.operationalContacts?.placementCellEmail ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  operationalContacts: {
                    ...settings.operationalContacts,
                    placementCellEmail: e.target.value,
                  },
                })
              }
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" /> {saving ? "Saving Changes..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 10. Notifications View (With Delete Button)
// -----------------------------------------------------------------------------
function CoordinatorNotificationsView({ collegeCode }: { collegeCode: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New campus announcement modal state
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState("All Campus");
  const [lifetimeDays, setLifetimeDays] = useState("7");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.coordinator.notifications.list();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      toast.error("Please enter both an announcement title and message body.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.coordinator.notifications.create({
        title: announcementTitle.trim(),
        message: announcementMessage.trim(),
        targetRole: targetAudience,
        durationDays: parseInt(lifetimeDays, 10) || 7,
      });

      toast.success("Campus announcement broadcasted successfully.");
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      setTargetAudience("All Campus");
      setLifetimeDays("7");
      setOpenCreateModal(false);
      fetchNotifs();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to publish announcement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This will permanently remove the announcement.`)) return;
    setDeletingId(id);
    try {
      await api.coordinator.notifications.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success(`Notification "${title}" deleted.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete notification");
    } finally {
      setDeletingId(null);
    }
  };

  const getDaysRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <>
      <Panel
        title={`Campus Announcements (${notifications.length})`}
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setOpenCreateModal(true)}
              className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> New Campus Announcement
            </Button>
            <Button variant="outline" size="sm" onClick={fetchNotifs} disabled={loading} className="h-8 gap-1.5 text-xs">
              <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      >
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">No active announcements for Campus {collegeCode}</p>
            <p className="text-[11px]">Expired and deleted announcements are automatically purged.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const daysLeft = getDaysRemaining(n.expiresAt);
              return (
                <div
                  key={n.id}
                  className="flex items-start justify-between gap-3 p-3.5 border border-border rounded bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{n.title}</span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                        Campus {collegeCode}
                      </span>
                      {n.targetRole && (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                          Audience: {n.targetRole}
                        </span>
                      )}
                      {n.durationDays && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                          <Clock className="h-3 w-3" /> {n.durationDays}d lifetime
                        </span>
                      )}
                      {daysLeft !== null && (
                        <span
                          className={`text-[11px] font-medium ${
                            daysLeft <= 1 ? "text-amber-500 font-bold" : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {daysLeft === 0 ? "Expiring today" : `Expires in ${daysLeft}d`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                    {n.sentAt && (
                      <p className="text-[10px] text-muted-foreground/70">
                        Dispatched: {new Date(n.sentAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive gap-1.5 shrink-0"
                    onClick={() => handleDelete(n.id, n.title)}
                    disabled={deletingId === n.id}
                    title="Delete notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Delete</span>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Bell className="h-4 w-4 text-primary" />
              New Campus Announcement
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Broadcast an official operational notice to students and faculty within Campus {collegeCode}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAnnouncement} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="announcement-title" className="text-xs font-medium">
                Announcement Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="announcement-title"
                placeholder="e.g. Schedule Revision for Semester 6 Lab Sessions"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="announcement-message" className="text-xs font-medium">
                Message Body <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="announcement-message"
                rows={4}
                placeholder="Enter detailed notice content, schedule revisions, or instructions..."
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                required
                className="text-xs resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Target Audience</Label>
                <Select value={targetAudience} onValueChange={setTargetAudience}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Campus" className="text-xs">All Campus</SelectItem>
                    <SelectItem value="Students Only" className="text-xs">Students Only</SelectItem>
                    <SelectItem value="Faculty / Trainers Only" className="text-xs">Faculty / Trainers Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Expiration Lifetime</Label>
                <Select value={lifetimeDays} onValueChange={setLifetimeDays}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3" className="text-xs">3 Days</SelectItem>
                    <SelectItem value="7" className="text-xs">7 Days</SelectItem>
                    <SelectItem value="14" className="text-xs">14 Days</SelectItem>
                    <SelectItem value="30" className="text-xs">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenCreateModal(false)}
                disabled={isSubmitting}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="h-3.5 w-3.5 animate-spin" /> Publishing...
                  </>
                ) : (
                  <>
                    <Bell className="h-3.5 w-3.5" /> Dispatch Announcement
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// -----------------------------------------------------------------------------
// 11. Activity History View
// -----------------------------------------------------------------------------
function CoordinatorActivityView() {
  return (
    <Panel title="Campus Audit Activity Log">
      <div className="space-y-3 py-2 text-xs">
        <div className="p-3 border border-border rounded">
          <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
            <span>student.usn_correction</span>
            <span>Audit Verified</span>
          </div>
          <p className="mt-1 font-medium text-foreground">
            USN updated for student Aarav Sharma with verified justification.
          </p>
        </div>
        <div className="p-3 border border-border rounded">
          <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
            <span>session.complete</span>
            <span>Audit Verified</span>
          </div>
          <p className="mt-1 font-medium text-foreground">
            Training session finalized with explanatory note.
          </p>
        </div>
      </div>
    </Panel>
  );
}

// -----------------------------------------------------------------------------
// 12. Account & Scope View
// -----------------------------------------------------------------------------
function CoordinatorAccountView({ session, collegeCode }: { session: any; collegeCode: string }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel title="Coordinator Principal Details">
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Name:</span>
            <p className="font-medium">{session?.user.name ?? "College Coordinator"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Login Identifier:</span>
            <p className="font-mono">{session?.user.loginId}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Assigned Role:</span>
            <p className="font-semibold text-primary uppercase">{session?.user.role}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Assigned Campus Code:</span>
            <p className="font-bold font-mono text-foreground">{collegeCode}</p>
          </div>
        </div>
      </Panel>

      <Panel title="Campus Scope & Invariants">
        <div className="space-y-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p>
              <strong className="text-foreground">College Isolation:</strong> Operations are strictly confined to campus {collegeCode}. You cannot inspect or modify records belonging to other institutions.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p>
              <strong className="text-foreground">Zero Attendance Law:</strong> No attendance registers, percentages, or headcounts exist in Ziphyrus X.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p>
              <strong className="text-foreground">Audited Corrections:</strong> USN corrections and manual session closures are permanently recorded in the immutable audit trail.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
