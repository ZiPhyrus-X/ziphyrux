import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Calendar, Clock, GraduationCap, MapPin, Network, PlayCircle, Plus, RotateCw, Video } from "lucide-react";
import { PageHeader, Panel } from "@/features/coordinator/page";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { authService } from "@/lib/auth/service";

export const Route = createFileRoute("/coordinator/schedule")({
  head: () => ({
    meta: [
      { title: "Training Schedule — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainingSchedulePage,
});

interface Schedule {
  id: string;
  collegeCode: string;
  allocationId: string;
  courseName: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: "Offline" | "Online" | "Hybrid";
  location: string;
  status: "scheduled" | "completed" | "cancelled";
}

function TrainingSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Form
  const [courseName, setCourseName] = useState("Data Structures & Algorithmic Thinking");
  const [trainerName, setTrainerName] = useState("Rohan Verma");
  const [date, setDate] = useState("2026-10-12");
  const [startTime, setStartTime] = useState("09:30 AM");
  const [endTime, setEndTime] = useState("11:30 AM");
  const [mode, setMode] = useState<Schedule["mode"]>("Offline");
  const [location, setLocation] = useState("Lab 3, CS Block");
  const [submitting, setSubmitting] = useState(false);

  const session = authService.getSession();
  const collegeCode = session?.user.collegeCode ?? "SMP101";

  const fetchSchedules = () => {
    setLoading(true);
    api.coordinator.schedules
      .list()
      .then((res) => {
        setSchedules(res);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load schedule");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim() || !trainerName.trim() || !date.trim()) {
      toast.error("Course, trainer, and date are required.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.coordinator.schedules.create({
        allocationId: "alc-1",
        courseName: courseName.trim(),
        trainerName: trainerName.trim(),
        date,
        startTime,
        endTime,
        mode,
        location: location.trim(),
      });
      setSchedules((prev) => [created, ...prev]);
      toast.success(`Training session scheduled for ${created.date}.`);
      setCreateOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create schedule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Training Schedule"
        desc={`Operational training calendar for campus ${collegeCode}. The schedule determines when training happens. Under Ziphyrus X policy, zero attendance tracking is enforced.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/sessions">
                <PlayCircle className="mr-1.5 h-4 w-4" /> Live Sessions
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/allocations">
                <Network className="mr-1.5 h-4 w-4" /> Class Allocations
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/trainers">
                <GraduationCap className="mr-1.5 h-4 w-4" /> Trainers
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchSchedules} disabled={loading}>
              <RotateCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Schedule Session
            </Button>
          </div>
        }
      />

      {/* Statistical Overview */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Total Scheduled</span>
          <p className="text-2xl font-bold text-foreground mt-1">{schedules.length}</p>
          <span className="text-[11px] text-muted-foreground">Calendar events</span>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Active Sessions</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {schedules.filter((s) => s.status === "scheduled").length}
          </p>
          <span className="text-[11px] text-muted-foreground">Confirmed on schedule</span>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Faculty on Calendar</span>
          <p className="text-2xl font-bold text-primary mt-1">
            {new Set(schedules.map((s) => s.trainerName)).size}
          </p>
          <span className="text-[11px] text-muted-foreground">Assigned trainers</span>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Cohorts Scheduled</span>
          <p className="text-2xl font-bold text-foreground mt-1">
            {new Set(schedules.map((s: any) => s.batch || s.courseName).filter(Boolean)).size}
          </p>
          <span className="text-[11px] text-muted-foreground">Batches in rotation</span>
        </div>
      </div>

      <Panel title={`Upcoming Scheduled Training (${schedules.length})`}>
        <DataTable
          data={schedules}
          emptyMessage="No training sessions scheduled for this campus."
          columns={[
            {
              header: "Date & Time",
              accessor: (s) => (
                <div className="text-xs">
                  <p className="font-semibold text-foreground">{s.date}</p>
                  <p className="text-muted-foreground">{s.startTime} - {s.endTime}</p>
                </div>
              ),
            },
            {
              header: "Course & Curriculum",
              accessor: (s) => (
                <Button asChild variant="link" size="sm" className="h-auto p-0 font-medium text-sm text-foreground hover:text-primary">
                  <Link to="/coordinator/allocations">
                    {s.courseName}
                  </Link>
                </Button>
              ),
            },
            {
              header: "Trainer",
              accessor: (s) => (
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs text-foreground hover:text-primary">
                  <Link to="/coordinator/trainers">
                    {s.trainerName}
                  </Link>
                </Button>
              ),
            },
            {
              header: "Mode & Venue",
              accessor: (s) => (
                <div className="text-xs">
                  <span className="font-medium text-foreground">{s.mode}</span>
                  <span className="text-muted-foreground block text-[11px]">{s.location}</span>
                </div>
              ),
            },
            {
              header: "Status",
              accessor: (s) => <StatusBadge status={s.status} label={s.status.toUpperCase()} />,
            },
            {
              header: "Execution",
              accessor: () => (
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2">
                  <Link to="/coordinator/sessions">Live Sessions &rarr;</Link>
                </Button>
              ),
            },
          ]}
        />
      </Panel>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Training Session</DialogTitle>
            <DialogDescription>
              Add a calendar entry for an authorized class allocation in campus {collegeCode}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div>
              <Label htmlFor="sch-course">Course Name</Label>
              <Input
                id="sch-course"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="sch-trainer">Trainer Name</Label>
              <Input
                id="sch-trainer"
                value={trainerName}
                onChange={(e) => setTrainerName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="sch-date">Date</Label>
                <Input
                  id="sch-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sch-start">Start Time</Label>
                <Input
                  id="sch-start"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sch-end">End Time</Label>
                <Input
                  id="sch-end"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sch-mode">Delivery Mode</Label>
                <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Offline">Offline</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sch-loc">Location / Link</Label>
                <Input
                  id="sch-loc"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Scheduling…" : "Confirm Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
