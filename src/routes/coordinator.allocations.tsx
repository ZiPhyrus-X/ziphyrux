import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Calendar, FolderKanban, GraduationCap, Layers, Network, PlayCircle, Plus, RotateCw } from "lucide-react";
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
import { api } from "@/lib/api/client";
import { authService } from "@/lib/auth/service";

export const Route = createFileRoute("/coordinator/allocations")({
  head: () => ({
    meta: [
      { title: "Class Allocation — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClassAllocationPage,
});

interface Allocation {
  id: string;
  collegeCode: string;
  department: string;
  year: string;
  semester: string;
  section: string;
  batch: string;
  skill: string;
  courseName: string;
  trainerName: string;
  trainerId: string;
  startDate: string;
  endDate: string;
  status: "active" | "completed";
}

function ClassAllocationPage() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Form
  const [courseName, setCourseName] = useState("Data Structures & Algorithmic Thinking");
  const [trainerName, setTrainerName] = useState("Rohan Verma");
  const [trainerId, setTrainerId] = useState("trn-1");
  const [skill, setSkill] = useState("Problem Solving");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [year, setYear] = useState("3rd Year");
  const [semester, setSemester] = useState("Semester 5");
  const [section, setSection] = useState("A");
  const [batch, setBatch] = useState("Batch-A1");
  const [startDate, setStartDate] = useState("2026-10-15");
  const [endDate, setEndDate] = useState("2026-12-15");
  const [submitting, setSubmitting] = useState(false);

  const session = authService.getSession();
  const collegeCode = session?.user.collegeCode ?? "SMP101";

  const fetchAllocations = () => {
    setLoading(true);
    api.coordinator.allocations
      .list()
      .then((res) => {
        setAllocations(res);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load allocations");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim() || !trainerName.trim()) {
      toast.error("Course and trainer are required.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.coordinator.allocations.create({
        courseName: courseName.trim(),
        trainerName: trainerName.trim(),
        trainerId,
        skill,
        department,
        year,
        semester,
        section,
        batch,
        startDate,
        endDate,
      });
      setAllocations((prev) => [created, ...prev]);
      toast.success(`Allocation created: ${created.trainerName} assigned to ${created.courseName}.`);
      setCreateOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create allocation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Class Allocation"
        desc={`Class assignment mapping for campus ${collegeCode}. The allocation defines who teaches what across departments, batches, and curricula.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/schedule">
                <Calendar className="mr-1.5 h-4 w-4" /> Schedule Session
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/sessions">
                <PlayCircle className="mr-1.5 h-4 w-4" /> Live Sessions
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/trainers">
                <GraduationCap className="mr-1.5 h-4 w-4" /> Faculty Trainers
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/batches">
                <FolderKanban className="mr-1.5 h-4 w-4" /> Batches
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchAllocations} disabled={loading}>
              <RotateCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New Allocation
            </Button>
          </div>
        }
      />

      {/* Statistical Overview */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Total Allocations</span>
          <p className="text-2xl font-bold text-foreground mt-1">{allocations.length}</p>
          <span className="text-[11px] text-muted-foreground">Class-to-faculty mappings</span>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Active Tracks</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {allocations.filter((a) => a.status === "active").length}
          </p>
          <span className="text-[11px] text-muted-foreground">Ongoing teaching cycles</span>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Faculty Allocated</span>
          <p className="text-2xl font-bold text-primary mt-1">
            {new Set(allocations.map((a) => a.trainerId)).size}
          </p>
          <span className="text-[11px] text-muted-foreground">Unique instructors teaching</span>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">Courses in Track</span>
          <p className="text-2xl font-bold text-foreground mt-1">
            {new Set(allocations.map((a) => a.courseName)).size}
          </p>
          <span className="text-[11px] text-muted-foreground">Curriculum subjects mapped</span>
        </div>
      </div>

      <Panel title={`Class Allocations (${allocations.length})`}>
        <DataTable
          data={allocations}
          emptyMessage="No class allocations configured for this campus."
          columns={[
            {
              header: "Course & Curriculum",
              accessor: (a) => (
                <div>
                  <p className="font-semibold text-sm text-foreground">{a.courseName}</p>
                  <p className="text-xs text-muted-foreground">Skill: {a.skill}</p>
                </div>
              ),
            },
            {
              header: "Assigned Trainer",
              accessor: (a) => (
                <div>
                  <Button asChild variant="link" size="sm" className="h-auto p-0 font-medium text-sm text-foreground hover:text-primary">
                    <Link to="/coordinator/trainers">
                      {a.trainerName}
                    </Link>
                  </Button>
                  <p className="font-mono text-[11px] text-muted-foreground">{a.trainerId}</p>
                </div>
              ),
            },
            {
              header: "Target Class / Batch",
              accessor: (a) => (
                <div className="text-xs">
                  <p className="font-medium text-foreground">{a.department}</p>
                  <p className="text-muted-foreground">
                    {a.year} · Sec {a.section} (
                    <Link to="/coordinator/batches" className="text-primary hover:underline font-mono">
                      {a.batch}
                    </Link>
                    )
                  </p>
                </div>
              ),
            },
            {
              header: "Dates",
              accessor: (a) => (
                <span className="text-xs text-muted-foreground">
                  {a.startDate} to {a.endDate}
                </span>
              ),
            },
            {
              header: "Status",
              accessor: (a) => <StatusBadge status={a.status} label={a.status.toUpperCase()} />,
            },
            {
              header: "Connected Actions",
              accessor: () => (
                <div className="flex items-center gap-1.5">
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2">
                    <Link to="/coordinator/schedule">Schedule &rarr;</Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2">
                    <Link to="/coordinator/sessions">Sessions &rarr;</Link>
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Panel>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Class Allocation</DialogTitle>
            <DialogDescription>
              Map an authorized trainer to a curriculum and academic batch in {collegeCode}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div>
              <Label htmlFor="alc-course">Course Name</Label>
              <Input
                id="alc-course"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="alc-trainer">Trainer Name</Label>
                <Input
                  id="alc-trainer"
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="alc-skill">Target Skill</Label>
                <Input
                  id="alc-skill"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="alc-dept">Department</Label>
                <Input
                  id="alc-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="alc-batch">Batch</Label>
                <Input
                  id="alc-batch"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="alc-start">Start Date</Label>
                <Input
                  id="alc-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="alc-end">End Date</Label>
                <Input
                  id="alc-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save Allocation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
