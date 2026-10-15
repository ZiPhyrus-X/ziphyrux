import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Calendar, GraduationCap, Network, PlayCircle, Plus, RotateCw, ShieldAlert, Target, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { PageHeader, Panel } from "@/features/coordinator/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";

export const Route = createFileRoute("/coordinator/trainers")({
  head: () => ({
    meta: [
      { title: "Trainer Management — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainerManagementPage,
});

interface Trainer {
  id: string;
  name: string;
  loginId: string;
  email: string;
  skills: string[];
  collegeCode: string;
  assignedClassesCount: number;
  status: "active" | "inactive";
}

function TrainerManagementPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [skillsStr, setSkillsStr] = useState("Algorithms, React, System Design");
  const [submitting, setSubmitting] = useState(false);

  const session = authService.getSession();
  const collegeCode = session?.user.collegeCode ?? "SMP101";

  const fetchTrainers = () => {
    setLoading(true);
    api.coordinator.trainers
      .list()
      .then((res) => {
        setTrainers(res);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load trainers");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    const skills = skillsStr.split(",").map((s) => s.trim()).filter(Boolean);
    if (skills.length === 0) {
      toast.error("At least one skill is required.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.coordinator.trainers.create({
        name: name.trim(),
        email: email.trim(),
        skills,
      });
      setTrainers((prev) => [created, ...prev]);
      toast.success(`Trainer account "${created.name}" created with ID ${created.loginId}.`);
      setCreateOpen(false);
      setName("");
      setEmail("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create trainer");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = trainers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.loginId.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Trainer Management"
        desc={`Faculty and trainer accounts assigned to campus ${collegeCode}. Profiles are admin-managed and scoped to authorized training deliveries.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/allocations">
                <Network className="mr-1.5 h-4 w-4" /> Class Allocations
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/schedule">
                <Calendar className="mr-1.5 h-4 w-4" /> Schedule
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/sessions">
                <PlayCircle className="mr-1.5 h-4 w-4" /> Sessions
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchTrainers} disabled={loading}>
              <RotateCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Trainer
            </Button>
          </div>
        }
      />

      {/* Statistical Overview with High-Contrast Theme Colors */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded-xl border border-border/70 bg-card/60 shadow-sm">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-500" /> Faculty Pool
          </span>
          <p className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">{trainers.length}</p>
          <span className="text-[11px] text-muted-foreground">Assigned trainers</span>
        </div>
        <div className="p-4 rounded-xl border border-border/70 bg-card/60 shadow-sm">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active Faculty
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {trainers.filter((t) => t.status === "active").length}
          </p>
          <span className="text-[11px] text-muted-foreground">Authorized instructors</span>
        </div>
        <div className="p-4 rounded-xl border border-border/70 bg-card/60 shadow-sm">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-500" /> Total Classes Allocated
          </span>
          <p className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
            {trainers.reduce((sum, t) => sum + (t.assignedClassesCount || 0), 0)}
          </p>
          <span className="text-[11px] text-muted-foreground">Active teaching allocations</span>
        </div>
        <div className="p-4 rounded-xl border border-border/70 bg-card/60 shadow-sm">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Unique Domain Skills
          </span>
          <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {new Set(trainers.flatMap((t) => t.skills || [])).size}
          </p>
          <span className="text-[11px] text-muted-foreground">Curriculum competencies covered</span>
        </div>
      </div>

      {trainers.length > 0 && (() => {
        const TRAINER_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];
        
        // Skill frequency calculation for donut chart
        const skillFrequency: Record<string, number> = {};
        trainers.forEach((t) => {
          (t.skills || []).forEach((s) => {
            const trimmed = s.trim();
            if (trimmed) {
              skillFrequency[trimmed] = (skillFrequency[trimmed] || 0) + 1;
            }
          });
        });
        const skillEntries = Object.entries(skillFrequency).map(([skill, count], i) => ({
          name: skill,
          count,
          color: TRAINER_COLORS[i % TRAINER_COLORS.length],
        }));

        return (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-primary" /> Faculty Workload & Allocation Distribution
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Number of active academic sections assigned per certified trainer
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono text-purple-600 dark:text-purple-400 border-purple-500/30">
                  {trainers.reduce((sum, t) => sum + (t.assignedClassesCount || 0), 0)} Total Classes
                </Badge>
              </div>

              <div className="h-56 w-full my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={trainers.map((t) => ({
                      name: t.name,
                      assignedClassesCount: t.assignedClassesCount || 0,
                      skills: t.skills.join(", "),
                      loginId: t.loginId,
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
                              <span>Assigned Workload:</span>
                              <strong className="text-foreground font-mono">{d.assignedClassesCount} Classes</strong>
                            </p>
                            {d.skills && (
                              <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                Skills: <span className="text-foreground font-medium">{d.skills}</span>
                              </p>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="assignedClassesCount" name="Assigned Workload" radius={[6, 6, 0, 0]}>
                      {trainers.map((_, index) => (
                        <Cell key={`trainer-cell-${index}`} fill={TRAINER_COLORS[index % TRAINER_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50 text-[11px]">
                {trainers.map((t, i) => (
                  <span key={t.id} className="flex items-center gap-1 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TRAINER_COLORS[i % TRAINER_COLORS.length] }} />
                    <span className="font-medium text-foreground">{t.name}:</span>
                    <strong className="text-foreground font-mono">{t.assignedClassesCount || 0} classes</strong>
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <PieChartIcon className="h-4 w-4 text-emerald-500" /> Faculty Curriculum Skill Specialization
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Curriculum domain coverage across institutional teaching faculty
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  {skillEntries.length} Domains
                </Badge>
              </div>

              <div className="h-56 relative my-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={skillEntries}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={76}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {skillEntries.map((entry, index) => (
                        <Cell key={`skill-cell-${index}`} fill={entry.color} />
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
                              <span>Certified Faculty:</span>
                              <strong className="text-foreground font-mono">{d.value} Trainers</strong>
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400">
                    {skillEntries.length}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Skills</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-border/50 text-xs">
                {skillEntries.map((s) => (
                  <div key={s.name} className="px-2 py-1 rounded bg-muted/20 flex items-center gap-1.5 border border-border/40">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">{s.name}</span>
                    <span className="font-bold text-foreground font-mono text-xs">({s.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="mb-4">
        <Input
          placeholder="Search trainers by name, ID, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Panel title={`Assigned Campus Trainers (${filtered.length})`}>
        <DataTable
          data={filtered}
          emptyMessage="No trainers assigned to this campus."
          columns={[
            {
              header: "Trainer Name",
              accessor: (t) => (
                <div>
                  <p className="font-medium text-sm text-foreground">{t.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{t.loginId}</p>
                </div>
              ),
            },
            {
              header: "Email",
              accessor: (t) => <span className="text-xs">{t.email}</span>,
            },
            {
              header: "Domain Skills",
              accessor: (t) => (
                <div className="flex flex-wrap gap-1">
                  {t.skills.map((s) => (
                    <Badge key={s} variant="secondary" className="text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              ),
            },
            {
              header: "Allocations",
              accessor: (t) => (
                <Button asChild variant="link" size="sm" className="h-auto p-0 font-mono text-xs">
                  <Link to="/coordinator/allocations">
                    {t.assignedClassesCount} classes &rarr;
                  </Link>
                </Button>
              ),
            },
            {
              header: "Status",
              accessor: (t) => <StatusBadge status={t.status} label={t.status.toUpperCase()} />,
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
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2">
                    <Link to="/coordinator/action-plans">Plans</Link>
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
            <DialogTitle>Assign New Trainer Account</DialogTitle>
            <DialogDescription>
              Create an authorized trainer profile scoped to campus {collegeCode}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div>
              <Label htmlFor="trn-name">Full Name</Label>
              <Input
                id="trn-name"
                placeholder="e.g. Dr. Ramesh Kulkarni"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="trn-email">Email Address</Label>
              <Input
                id="trn-email"
                type="email"
                placeholder="e.g. ramesh.k@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="trn-skills">Skills (comma-separated)</Label>
              <Input
                id="trn-skills"
                placeholder="e.g. Data Structures, Python, Machine Learning"
                value={skillsStr}
                onChange={(e) => setSkillsStr(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Assign Trainer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
