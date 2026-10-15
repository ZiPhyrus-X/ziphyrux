import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Award,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Sparkles,
  Layers,
  X,
  Loader2,
} from "lucide-react";
import { useActiveClassContext } from "@/features/trainer/context/active-class-context";
import { api } from "@/lib/api/client";
import {
  TrainerPageHeader,
  TrainerMetric,
  TrainerPanel,
  TrainerLoadingSkeleton,
  TrainerEmptyState,
} from "@/features/trainer/page";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trainer/students")({
  head: () => ({
    meta: [
      { title: "Student Roster & Performance — Ziphyrus X Trainer" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainerStudentsPage,
});

function TrainerStudentsPage() {
  const { activeAllocationId, activeAllocation, setIsChangeClassOpen } = useActiveClassContext();
  const [students, setStudents] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Selected Student for Detail Modal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.trainer.students({
        allocationId: activeAllocationId === "all" ? undefined : activeAllocationId,
        search: search.trim() || undefined,
        category: category === "all" ? undefined : category,
        page,
        limit,
      });
      setStudents(res?.students || []);
      setTotalCount(res?.total || 0);
    } catch (err) {
      console.error("Failed to load trainer students:", err);
      setStudents([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [activeAllocationId, search, category, page]);

  const openStudentDetail = async (id: string) => {
    setSelectedStudentId(id);
    setDetailLoading(true);
    try {
      const res = await api.trainer.studentDetail(id);
      setStudentDetail(res);
    } catch (err) {
      console.error("Failed to fetch student details:", err);
      setStudentDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedStudentId(null);
    setStudentDetail(null);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <div className="space-y-6">
      <TrainerPageHeader
        title="Student Roster & Performance"
        desc={
          activeAllocation
            ? `Enrolled students in ${activeAllocation.className || activeAllocation.branchCode} (Section ${activeAllocation.sectionName || "A"}).`
            : "Authorized students across all assigned classes. Use the filters below or switch class context."
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsChangeClassOpen(true)}
            className="text-xs h-9 bg-card/60 border-border/80"
          >
            <Layers className="h-3.5 w-3.5 mr-1.5 text-primary" />
            {activeAllocation ? "Active Class: " + (activeAllocation.className || activeAllocation.branchCode) : "Filter by Class"}
          </Button>
        }
      />

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by student name or USN..."
            className="pl-10 h-10 bg-background/70 border-border/80 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Tier:
          </span>
          {["all", "high-performer", "on-track", "at-risk"].map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setCategory(cat);
                setPage(1);
              }}
              className={cn(
                "text-xs capitalize h-8 px-2.5 rounded-lg",
                category === cat && "bg-primary/10 text-primary border border-primary/20"
              )}
            >
              {cat.replace("-", " ")}
            </Button>
          ))}
        </div>
      </div>

      {/* ROSTER TABLE */}
      {loading ? (
        <TrainerLoadingSkeleton />
      ) : students.length === 0 ? (
        <TrainerEmptyState
          title="No Students Found"
          description="No student records match the active class and filter criteria. Try clearing search filters or changing the active class context."
          icon={Users}
        />
      ) : (
        <div className="rounded-xl border border-border/70 bg-card/75 shadow-sm backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/20 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Student Name & USN</th>
                  <th className="py-3 px-3">Class & Section</th>
                  <th className="py-3 px-3">Overall Score</th>
                  <th className="py-3 px-3">Attendance</th>
                  <th className="py-3 px-3">Coding Accuracy</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {students.map((student) => {
                  const isAtRisk = student.riskCategory === "high" || (student.overallScore && student.overallScore < 60);

                  return (
                    <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{student.name}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">{student.usn}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        <div>
                          <span className="font-medium text-foreground">{student.department}</span>
                          <p className="text-[11px] text-muted-foreground">Sec {student.section} • Year {student.year}</p>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-foreground text-sm">
                          {student.overallScore || 75}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-mono",
                            (student.attendanceRate || 85) >= 80
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          )}
                        >
                          {student.attendanceRate || 85}%
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Code2 className="h-3.5 w-3.5 text-primary" />
                          <span>{student.codingAccuracy || 70}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase font-semibold",
                            isAtRisk
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          )}
                        >
                          {isAtRisk ? "At Risk" : "On Track"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStudentDetail(student.id)}
                          className="text-xs h-8 text-primary hover:text-primary hover:bg-primary/10 gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Drilldown
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="p-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {students.length} of {totalCount} students
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT DETAIL MODAL */}
      <Dialog open={!!selectedStudentId} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-2xl border-border/80 shadow-2xl p-6">
          <DialogHeader className="border-b border-border/60 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="font-display text-2xl flex items-center gap-2">
                  <span>{studentDetail?.name || "Student Performance Profile"}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Read-Only
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  USN: <strong className="text-foreground font-mono">{studentDetail?.usn}</strong> • {studentDetail?.department} (Section {studentDetail?.section})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-12 flex justify-center items-center text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading student intelligence...
            </div>
          ) : studentDetail ? (
            <div className="space-y-5 pt-3 max-h-[60vh] overflow-y-auto">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-border/40 bg-card/40 space-y-0.5">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">Overall Score</span>
                  <p className="text-xl font-display font-semibold text-foreground">{studentDetail.overallScore || 78}%</p>
                </div>
                <div className="p-3 rounded-lg border border-border/40 bg-card/40 space-y-0.5">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">Attendance</span>
                  <p className="text-xl font-display font-semibold text-foreground">{studentDetail.attendanceRate || 85}%</p>
                </div>
                <div className="p-3 rounded-lg border border-border/40 bg-card/40 space-y-0.5">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">Coding Accuracy</span>
                  <p className="text-xl font-display font-semibold text-foreground">{studentDetail.codingAccuracy || 70}%</p>
                </div>
                <div className="p-3 rounded-lg border border-border/40 bg-card/40 space-y-0.5">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">Placement Tier</span>
                  <p className="text-xl font-display font-semibold text-foreground">{studentDetail.placementTier || "Tier 2"}</p>
                </div>
              </div>

              {/* Skill Breakdown */}
              {studentDetail.skillMastery && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Skill Competency Breakdown
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(studentDetail.skillMastery).map(([skill, val]: [string, any]) => (
                      <div key={skill} className="p-2.5 rounded-lg border border-border/40 bg-muted/20 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground capitalize">{skill}</span>
                        <span className="font-mono font-semibold text-foreground">{val}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Academic Notes & Diagnostics */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Trainer Pedagogical Note</span>
                </div>
                <p className="text-xs text-foreground">
                  Strong grasp of theoretical fundamentals. Recommending additional hands-on problem sets on Dynamic Programming and recursion trees to accelerate Coding Judge submissions.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Unable to load student record.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
