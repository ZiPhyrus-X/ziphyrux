import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Clock, GraduationCap, Plus, RotateCw, Target, TrendingUp, Users } from "lucide-react";
import { PageHeader, Panel } from "@/features/coordinator/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { api } from "@/lib/api/client";
import { authService } from "@/lib/auth/service";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

export const Route = createFileRoute("/coordinator/action-plans")({
  head: () => ({
    meta: [
      { title: "Trainer Action Plans — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ActionPlansPage,
});

interface ActionPlan {
  id: string;
  collegeCode: string;
  studentName: string;
  studentId: string;
  description: string;
  trainerName: string;
  trainerId: string;
  deadline: string;
  status: "Not Started" | "In Progress" | "Blocked" | "Completed";
  isOverdue: boolean;
  history: string[];
}

function ActionPlansPage() {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Status Change Dialog
  const [statusTarget, setStatusTarget] = useState<ActionPlan | null>(null);
  const [targetStatus, setTargetStatus] = useState<ActionPlan["status"]>("In Progress");

  // Create Form
  const [studentName, setStudentName] = useState("Aarav Sharma");
  const [studentId, setStudentId] = useState("stu-1");
  const [description, setDescription] = useState("");
  const [trainerName, setTrainerName] = useState("Rohan Verma");
  const [trainerId, setTrainerId] = useState("trn-1");
  const [deadline, setDeadline] = useState("2026-10-20");
  const [submitting, setSubmitting] = useState(false);

  const session = authService.getSession();
  const collegeCode = session?.user.collegeCode ?? "SMP101";

  const fetchPlans = () => {
    setLoading(true);
    api.coordinator.actionPlans
      .list()
      .then((res) => {
        setPlans(res);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load action plans");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Action plan description is required.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.coordinator.actionPlans.create({
        studentName,
        studentId,
        description: description.trim(),
        trainerName,
        trainerId,
        deadline,
      });
      setPlans((prev) => [created, ...prev]);
      toast.success(`Action plan created for ${created.studentName}.`);
      setCreateOpen(false);
      setDescription("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create action plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusTarget) return;
    try {
      const updated = await api.coordinator.actionPlans.updateStatus(statusTarget.id, targetStatus);
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(`Action plan status updated to ${targetStatus}.`);
      setStatusTarget(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update action plan status");
    }
  };

  return (
    <div>
      <PageHeader
        title="Trainer Action Plans"
        desc={`Intervention action plans for campus ${collegeCode}. Action plans manage execution and remediation based on trainer feedback.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/students">
                <Users className="mr-1.5 h-4 w-4" /> Student Roster
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/trainers">
                <GraduationCap className="mr-1.5 h-4 w-4" /> Trainers
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/m/$module" params={{ module: "performance" }}>
                <TrendingUp className="mr-1.5 h-4 w-4" /> Layer C Analytics
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchPlans} disabled={loading}>
              <RotateCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New Action Plan
            </Button>
          </div>
        }
      />

      {/* Statistical Overview */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Total Action Plans</span>
          <p className="text-2xl font-bold text-foreground mt-1">{plans.length}</p>
          <span className="text-[11px] text-muted-foreground">Student remediation tracks</span>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Completed Plans</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {plans.filter((p) => p.status === "Completed").length}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {plans.length > 0
              ? `${Math.round((plans.filter((p) => p.status === "Completed").length / plans.length) * 100)}% resolution rate`
              : "No plans"}
          </span>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">In Progress</span>
          <p className="text-2xl font-bold text-sky-500 mt-1">
            {plans.filter((p) => p.status === "In Progress").length}
          </p>
          <span className="text-[11px] text-muted-foreground">Active faculty mentoring</span>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Overdue / Blocked</span>
          <p className="text-2xl font-bold text-rose-500 mt-1">
            {plans.filter((p) => p.status === "Blocked" || p.isOverdue).length}
          </p>
          <span className="text-[11px] text-muted-foreground">Requires coordinator review</span>
        </div>
      </div>

      {plans.length > 0 && (() => {
        const plansPieData = [
          {
            name: "Completed",
            value: plans.filter((p) => p.status === "Completed").length,
            color: "#10b981",
          },
          {
            name: "In Progress",
            value: plans.filter((p) => p.status === "In Progress").length,
            color: "#0ea5e9",
          },
          {
            name: "Blocked",
            value: plans.filter((p) => p.status === "Blocked").length,
            color: "#f43f5e",
          },
          {
            name: "Not Started",
            value: plans.filter((p) => p.status === "Not Started").length,
            color: "#64748b",
          },
        ].filter((d) => d.value > 0);

        return (
          <div className="mb-6">
            <Panel title="Remediation Plan Status Distribution">
              <div className="grid gap-6 md:grid-cols-2 items-center">
                <div className="h-56 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={plansPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {plansPieData.map((entry, index) => (
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
                            <p className="text-muted-foreground flex justify-between gap-3">
                              <span>Action Plans:</span>
                              <strong className="text-foreground font-mono">{d.value} Plans</strong>
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

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded border border-border bg-card space-y-1">
                  <span className="font-semibold text-foreground">Remediation Resolution Progress</span>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{
                        width: `${
                          plans.length > 0
                            ? Math.round(
                                (plans.filter((p) => p.status === "Completed").length / plans.length) * 100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    {plans.filter((p) => p.status === "Completed").length} of {plans.length} action plans resolved.
                  </p>
                </div>

                {plans.some((p) => p.isOverdue) && (
                  <div className="p-3 rounded border border-rose-500/30 bg-rose-500/5 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      {plans.filter((p) => p.isOverdue).length} action plan(s) have passed their assigned deadlines.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </div>
      );
    })()}

      <Panel title={`Campus Action Plans (${plans.length})`}>
        <DataTable
          data={plans}
          emptyMessage="No action plans logged for this campus."
          columns={[
            {
              header: "Target Student",
              accessor: (p) => (
                <div>
                  <Button asChild variant="link" size="sm" className="h-auto p-0 font-semibold text-sm text-foreground hover:text-primary">
                    <Link to="/coordinator/students">
                      {p.studentName}
                    </Link>
                  </Button>
                  <p className="font-mono text-[10px] text-muted-foreground">{p.studentId}</p>
                </div>
              ),
            },
            {
              header: "Task / Description",
              accessor: (p) => (
                <div className="max-w-md">
                  <p className="text-xs text-foreground font-medium">{p.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Assigned by:{" "}
                    <Link to="/coordinator/trainers" className="text-primary hover:underline">
                      {p.trainerName}
                    </Link>
                  </p>
                </div>
              ),
            },
            {
              header: "Deadline",
              accessor: (p) => (
                <div className="text-xs">
                  <span className={p.isOverdue ? "font-bold text-destructive" : ""}>
                    {p.deadline}
                  </span>
                  {p.isOverdue && (
                    <span className="block text-[10px] text-destructive font-semibold">
                      OVERDUE
                    </span>
                  )}
                </div>
              ),
            },
            {
              header: "Workflow Status",
              accessor: (p) => (
                <StatusBadge
                  status={
                    p.status === "Completed"
                      ? "completed"
                      : p.status === "Blocked"
                      ? "failed"
                      : "pending"
                  }
                  label={p.status}
                />
              ),
            },
            {
              header: "Actions",
              accessor: (p) => (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusTarget(p);
                    setTargetStatus(p.status);
                  }}
                  className="text-xs"
                >
                  Update Status
                </Button>
              ),
            },
          ]}
        />
      </Panel>

      {/* Update Status Dialog */}
      <Dialog open={!!statusTarget} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Action Plan Status</DialogTitle>
            <DialogDescription>
              Modify progress state for student <strong>{statusTarget?.studentName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Workflow Status</Label>
              <Select value={targetStatus} onValueChange={(v: any) => setTargetStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded border border-border p-3 text-xs bg-muted/20">
              <p className="font-semibold text-foreground mb-1">Execution Audit Trail</p>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                {statusTarget?.history?.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusTarget(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStatus}>Save Status</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Trainer Action Plan</DialogTitle>
            <DialogDescription>
              Assign a concrete targeted remediation task in campus {collegeCode}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="act-student">Student Name</Label>
                <Input
                  id="act-student"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="act-trainer">Responsible Trainer</Label>
                <Input
                  id="act-trainer"
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="act-desc">Remediation Description</Label>
              <Textarea
                id="act-desc"
                rows={3}
                placeholder="Specific objective (e.g. solve 10 shortest-path graph problems)…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="act-deadline">Deadline Date</Label>
              <Input
                id="act-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create Action Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
