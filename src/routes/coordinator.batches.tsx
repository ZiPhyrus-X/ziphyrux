import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Calendar, FolderKanban, Layers, Network, Plus, RotateCw, Users, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { PageHeader, Panel } from "@/features/coordinator/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api/client";
import { authService } from "@/lib/auth/service";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/coordinator/batches")({
  head: () => ({
    meta: [
      { title: "Batch Management — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BatchManagementPage,
});

interface Batch {
  id: string;
  name: string;
  department: string;
  year: string;
  section: string;
  studentsCount: number;
  collegeCode: string;
  status: "active" | "archived";
}

function BatchManagementPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [year, setYear] = useState("3rd Year");
  const [section, setSection] = useState("A");
  const [submitting, setSubmitting] = useState(false);

  const session = authService.getSession();
  const collegeCode = session?.user.collegeCode ?? "SMP101";

  const fetchBatches = () => {
    setLoading(true);
    api.coordinator.batches
      .list()
      .then((res) => {
        setBatches(res);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load batches");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Batch name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.coordinator.batches.create({
        name: name.trim(),
        department,
        year,
        section,
      });
      setBatches((prev) => [created, ...prev]);
      toast.success(`Batch "${created.name}" created successfully.`);
      setCreateOpen(false);
      setName("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create batch");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Batch Management"
        desc={`Academic cohorts and groupings for campus ${collegeCode}. A batch is strictly an academic organizational group, never an attendance tracking sheet.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/students">
                <Users className="mr-1.5 h-4 w-4" /> Student Roster
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/allocations">
                <Network className="mr-1.5 h-4 w-4" /> Class Allocations
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/m/$module" params={{ module: "classes" }}>
                <Layers className="mr-1.5 h-4 w-4" /> Classes & Sections
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchBatches} disabled={loading}>
              <RotateCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Create Batch
            </Button>
          </div>
        }
      />

      {/* Statistical Overview with High-Contrast Theme Colors */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded-xl border border-border/70 bg-card/60 shadow-sm">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-500" /> Total Batches
          </span>
          <p className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">{batches.length}</p>
          <span className="text-[11px] text-muted-foreground">Academic cohorts</span>
        </div>
        <div className="p-4 rounded-xl border border-border/70 bg-card/60 shadow-sm">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-500" /> Enrolled Students
          </span>
          <p className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
            {batches.reduce((sum, b) => sum + (b.studentsCount || 0), 0)}
          </p>
          <span className="text-[11px] text-muted-foreground">Across all campus batches</span>
        </div>
        <div className="p-4 rounded-xl border border-border/70 bg-card/60 shadow-sm">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Average Batch Sizing
          </span>
          <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {batches.length > 0
              ? Math.round(batches.reduce((sum, b) => sum + (b.studentsCount || 0), 0) / batches.length)
              : 0}
          </p>
          <span className="text-[11px] text-muted-foreground">Students per cohort</span>
        </div>
        <div className="p-4 rounded-xl border border-border/70 bg-card/60 shadow-sm">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active Cohorts
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {batches.filter((b) => b.status === "active").length}
          </p>
          <span className="text-[11px] text-muted-foreground">Active academic tracks</span>
        </div>
      </div>

      {batches.length > 0 && (() => {
        const BATCH_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

        // Group by department for donut share
        const deptMap: Record<string, number> = {};
        batches.forEach((b) => {
          const dept = b.department || "General";
          deptMap[dept] = (deptMap[dept] || 0) + (b.studentsCount || 0);
        });
        const deptEntries = Object.entries(deptMap).map(([dept, count], i) => ({
          name: dept,
          students: count,
          color: BATCH_COLORS[i % BATCH_COLORS.length],
        }));

        const totalEnrolled = batches.reduce((sum, b) => sum + (b.studentsCount || 0), 0);

        return (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-sky-500" /> Cohort Sizing & Balance Distribution
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Enrolled student density across institutional academic cohorts
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono text-sky-600 dark:text-sky-400 border-sky-500/30">
                  {batches.length} Cohorts
                </Badge>
              </div>

              <div className="h-56 w-full my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={batches.map((b) => ({
                      name: b.name,
                      studentsCount: b.studentsCount,
                      department: b.department,
                      details: `${b.year} · Sec ${b.section}`,
                    }))}
                    margin={{ top: 10, right: 15, left: -15, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                    <XAxis
                      dataKey="name"
                      stroke="var(--border)"
                      tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                      tickLine={{ stroke: "var(--border)" }}
                      interval={0}
                    />
                    <YAxis
                      stroke="var(--border)"
                      tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                      tickLine={{ stroke: "var(--border)" }}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1.5 min-w-[220px]">
                            <p className="font-semibold text-foreground text-sm border-b border-border/50 pb-1">{label || d.name}</p>
                            <p className="text-muted-foreground flex items-center justify-between gap-2">
                              <span>Enrolled Students:</span>
                              <strong className="text-foreground font-mono">{d.studentsCount} Candidates</strong>
                            </p>
                            <div className="pt-1 border-t border-border/40 text-[11px] text-muted-foreground space-y-0.5">
                              <p className="flex justify-between">
                                <span>Branch:</span>
                                <span className="text-foreground font-medium">{d.department}</span>
                              </p>
                              <p className="flex justify-between">
                                <span>Class Section:</span>
                                <span className="text-foreground font-mono">{d.details}</span>
                              </p>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="studentsCount" name="Enrolled Students" radius={[6, 6, 0, 0]}>
                      {batches.map((_, index) => (
                        <Cell key={`batch-cell-${index}`} fill={BATCH_COLORS[index % BATCH_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50 text-[11px]">
                {batches.map((b, i) => (
                  <span key={b.id} className="flex items-center gap-1 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BATCH_COLORS[i % BATCH_COLORS.length] }} />
                    <span className="font-medium text-foreground">{b.name}:</span>
                    <strong className="text-foreground font-mono">{b.studentsCount || 0} enrolled</strong>
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <PieChartIcon className="h-4 w-4 text-purple-500" /> Department Student Cohort Share
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Distribution of enrolled students across campus engineering branches
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono text-purple-600 dark:text-purple-400 border-purple-500/30">
                  {deptEntries.length} Depts
                </Badge>
              </div>

              <div className="h-56 relative my-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptEntries}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={76}
                      paddingAngle={4}
                      dataKey="students"
                    >
                      {deptEntries.map((entry, index) => (
                        <Cell key={`dept-cell-${index}`} fill={entry.color} />
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
                              <span>Enrolled Share:</span>
                              <strong className="text-foreground font-mono">{d.value} Students</strong>
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold font-display text-purple-600 dark:text-purple-400">
                    {totalEnrolled}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Students</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-border/50 text-xs">
                {deptEntries.map((d) => (
                  <div key={d.name} className="px-2 py-1 rounded bg-muted/20 flex items-center gap-1.5 border border-border/40">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-[11px] text-muted-foreground truncate max-w-[130px]">{d.name}</span>
                    <span className="font-bold text-foreground font-mono text-xs">({d.students})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      <Panel title={`Campus Batches (${batches.length})`}>
        <DataTable
          data={batches}
          emptyMessage="No batches found for this campus."
          columns={[
            {
              header: "Batch Name",
              accessor: (b) => <span className="font-semibold text-sm text-foreground">{b.name}</span>,
            },
            {
              header: "Department",
              accessor: (b) => <span className="text-xs">{b.department}</span>,
            },
            {
              header: "Academic Class",
              accessor: (b) => (
                <span className="text-xs text-muted-foreground">
                  {b.year} · Section {b.section}
                </span>
              ),
            },
            {
              header: "Members",
              accessor: (b) => (
                <Button asChild variant="link" size="sm" className="h-auto p-0 font-mono text-xs">
                  <Link to="/coordinator/students">
                    {b.studentsCount} students &rarr;
                  </Link>
                </Button>
              ),
            },
            {
              header: "Status",
              accessor: (b) => <StatusBadge status={b.status} label={b.status.toUpperCase()} />,
            },
            {
              header: "Connected Actions",
              accessor: () => (
                <div className="flex items-center gap-1.5">
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2">
                    <Link to="/coordinator/allocations">Allocate</Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2">
                    <Link to="/coordinator/schedule">Schedule</Link>
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Panel>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Academic Batch</DialogTitle>
            <DialogDescription>
              Define academic grouping for curriculum allocations in campus {collegeCode}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div>
              <Label htmlFor="btc-name">Batch Name</Label>
              <Input
                id="btc-name"
                placeholder="e.g. CSE-2026-Alpha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="btc-dept">Department</Label>
              <Input
                id="btc-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="btc-year">Year</Label>
                <Input
                  id="btc-year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="btc-sec">Section</Label>
                <Input
                  id="btc-sec"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create Batch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
