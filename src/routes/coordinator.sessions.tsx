import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertCircle, Calendar, CheckCircle, Clock, GraduationCap, Network, Play, RotateCw, ShieldAlert, Target, XCircle } from "lucide-react";
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

export const Route = createFileRoute("/coordinator/sessions")({
  head: () => ({
    meta: [
      { title: "Training Sessions — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainingSessionsPage,
});

interface Session {
  id: string;
  collegeCode: string;
  scheduleId: string;
  courseName: string;
  trainerName: string;
  date: string;
  time: string;
  status: "scheduled" | "in_progress" | "completed" | "requires_attention";
  startedAt?: string;
  completedAt?: string;
  completionReason?: string;
}

function TrainingSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Complete Dialog
  const [completeTarget, setCompleteTarget] = useState<Session | null>(null);
  const [mandatoryReason, setMandatoryReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const authUserSession = authService.getSession();
  const collegeCode = authUserSession?.user.collegeCode ?? "SMP101";

  const fetchSessions = () => {
    setLoading(true);
    api.coordinator.sessions
      .list()
      .then((res) => {
        setSessions(res);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load training sessions");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleStart = async (s: Session) => {
    try {
      const updated = await api.coordinator.sessions.start(s.id);
      setSessions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(`Training session started at ${updated.startedAt}.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to start session");
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeTarget) return;

    if (!mandatoryReason || mandatoryReason.trim().length < 5) {
      toast.error("A mandatory completion reason of at least 5 characters is required.");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await api.coordinator.sessions.complete(completeTarget.id, mandatoryReason.trim());
      setSessions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(`Session marked complete. Reason logged to immutable audit records.`);
      setCompleteTarget(null);
      setMandatoryReason("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to complete session");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Training Sessions"
        desc={`Live session execution tracking for campus ${collegeCode}. Sessions commence when trainer triggers Start. Unstarted sessions past 1h can be completed by Coordinator with mandatory reason.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/schedule">
                <Calendar className="mr-1.5 h-4 w-4" /> Training Schedule
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/allocations">
                <Network className="mr-1.5 h-4 w-4" /> Class Allocations
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/action-plans">
                <Target className="mr-1.5 h-4 w-4" /> Action Plans
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/trainers">
                <GraduationCap className="mr-1.5 h-4 w-4" /> Faculty Trainers
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading}>
              <RotateCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      />

      <div className="mb-6 rounded-md border border-primary/20 bg-primary/5 p-4 text-xs text-foreground flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
          <span>
            <strong>Zero Attendance Invariant:</strong> Ziphyrus X does not track student attendance percentages, sheets, or headcounts. Sessions measure delivery completion only.
          </span>
        </div>
      </div>

      {/* Statistical Overview */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Total Sessions</span>
          <p className="text-2xl font-bold text-foreground mt-1">{sessions.length}</p>
          <span className="text-[11px] text-muted-foreground">Scheduled & delivered</span>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Completed Deliveries</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {sessions.filter((s) => s.status === "completed").length}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {sessions.length > 0
              ? `${Math.round((sessions.filter((s) => s.status === "completed").length / sessions.length) * 100)}% completion rate`
              : "No sessions"}
          </span>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">In Progress</span>
          <p className="text-2xl font-bold text-sky-500 mt-1">
            {sessions.filter((s) => s.status === "in_progress").length}
          </p>
          <span className="text-[11px] text-muted-foreground">Currently conducting</span>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Requires Attention</span>
          <p className="text-2xl font-bold text-rose-500 mt-1">
            {sessions.filter((s) => s.status === "requires_attention").length}
          </p>
          <span className="text-[11px] text-muted-foreground">Past schedule / unconfirmed</span>
        </div>
      </div>

      {sessions.length > 0 && (() => {
        const sessionPieData = [
          {
            name: "Completed",
            value: sessions.filter((s) => s.status === "completed").length,
            color: "#10b981",
          },
          {
            name: "In Progress",
            value: sessions.filter((s) => s.status === "in_progress").length,
            color: "#0ea5e9",
          },
          {
            name: "Scheduled",
            value: sessions.filter((s) => s.status === "scheduled").length,
            color: "#64748b",
          },
          {
            name: "Requires Attention",
            value: sessions.filter((s) => s.status === "requires_attention").length,
            color: "#f43f5e",
          },
        ].filter((d) => d.value > 0);

        return (
          <div className="mb-6">
            <Panel title="Session Delivery Execution Health">
              <div className="grid gap-6 md:grid-cols-2 items-center">
                <div className="h-56 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sessionPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {sessionPieData.map((entry, index) => (
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
                              <span>Sessions:</span>
                              <strong className="text-foreground font-mono">{d.value} Sessions</strong>
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
                  <span className="font-semibold text-foreground">Delivery Execution Rate</span>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{
                        width: `${
                          sessions.length > 0
                            ? Math.round(
                                (sessions.filter((s) => s.status === "completed").length / sessions.length) * 100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    {sessions.filter((s) => s.status === "completed").length} of {sessions.length} sessions fully verified and delivered.
                  </p>
                </div>

                <div className="p-3 rounded border border-border bg-card text-[11px] text-muted-foreground">
                  <p>
                    Coordinators can mark unstarted sessions as Complete if they exceed the 1-hour window with mandatory logged reason.
                  </p>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      );
    })()}

      <Panel title={`Campus Training Sessions (${sessions.length})`}>
        <DataTable
          data={sessions}
          emptyMessage="No training sessions found for this campus."
          columns={[
            {
              header: "Course & Curriculum",
              accessor: (s) => (
                <div>
                  <Button asChild variant="link" size="sm" className="h-auto p-0 font-semibold text-sm text-foreground hover:text-primary">
                    <Link to="/coordinator/allocations">
                      {s.courseName}
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Trainer:{" "}
                    <Link to="/coordinator/trainers" className="text-primary hover:underline">
                      {s.trainerName}
                    </Link>
                  </p>
                  {s.completionReason && (
                    <p className="text-[10px] text-muted-foreground italic mt-0.5">
                      Note: {s.completionReason}
                    </p>
                  )}
                </div>
              ),
            },
            {
              header: "Scheduled Window",
              accessor: (s) => (
                <div className="text-xs">
                  <p className="font-medium text-foreground">{s.date}</p>
                  <p className="text-muted-foreground">{s.time}</p>
                </div>
              ),
            },
            {
              header: "Actual Timestamps",
              accessor: (s) => (
                <div className="text-xs text-muted-foreground">
                  <p>Started: {s.startedAt ?? "Not started"}</p>
                  <p>Completed: {s.completedAt ?? "—"}</p>
                </div>
              ),
            },
            {
              header: "Status",
              accessor: (s) => (
                <StatusBadge
                  status={
                    s.status === "completed"
                      ? "completed"
                      : s.status === "requires_attention"
                      ? "failed"
                      : s.status === "in_progress"
                      ? "active"
                      : "pending"
                  }
                  label={s.status.toUpperCase().replace("_", " ")}
                />
              ),
            },
            {
              header: "Actions",
              accessor: (s) => (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {s.status === "scheduled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStart(s)}
                      className="text-xs gap-1 h-7 px-2"
                    >
                      <Play className="h-3 w-3 text-emerald-500" /> Start
                    </Button>
                  )}
                  {s.status === "in_progress" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCompleteTarget(s);
                        setMandatoryReason("Session completed normally");
                      }}
                      className="text-xs gap-1 h-7 px-2"
                    >
                      <CheckCircle className="h-3 w-3 text-emerald-500" /> Complete
                    </Button>
                  )}
                  {s.status === "requires_attention" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCompleteTarget(s);
                        setMandatoryReason("");
                      }}
                      className="text-xs gap-1 h-7 px-2 border-amber-500/50 text-amber-600 dark:text-amber-400"
                    >
                      <AlertCircle className="h-3 w-3" /> Complete (Attention)
                    </Button>
                  )}
                  {s.status === "completed" && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Finalized
                    </span>
                  )}
                  <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground">
                    <Link to="/coordinator/action-plans">Plans &rarr;</Link>
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Panel>

      {/* Complete Session Dialog with Mandatory Reason */}
      <Dialog open={!!completeTarget} onOpenChange={(open) => !open && setCompleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Session Complete</DialogTitle>
            <DialogDescription>
              Finalizing training delivery for <strong>{completeTarget?.courseName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCompleteSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="ses-reason">Mandatory Completion Reason (Min 5 chars)</Label>
              <Textarea
                id="ses-reason"
                rows={3}
                placeholder="Explain session conclusion or reason for coordinator intervention…"
                value={mandatoryReason}
                onChange={(e) => setMandatoryReason(e.target.value)}
                required
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Under zero-attendance architecture, coordinator session completions are permanently logged to platform audit history.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCompleteTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Finalizing…" : "Complete Session"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
