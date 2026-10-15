import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PlacementPageHeader,
  PlacementMetric,
  PlacementPanel,
  PlacementLoadingSkeleton,
  PlacementEmptyState,
  PlacementOfferStatusBadge,
} from "@/features/placement/page";

export const Route = createFileRoute("/placement/students")({
  head: () => ({
    meta: [
      { title: "Student Directory & Readiness — Ziphyrus X" },
      { name: "description", content: "College-scoped placement student roster, readiness analytics, and eligibility" },
    ],
  }),
  component: PlacementStudentsPage,
});

function PlacementStudentsPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["placement", "students", { search, department }],
    queryFn: async () => {
      const res = await api.placement.getStudents({
        search: search || undefined,
        department: department !== "all" ? department : undefined,
      });
      return (res as any)?.data || res;
    },
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["placement", "student-detail", selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return null;
      const res = await api.placement.getStudentDetail(selectedStudentId);
      return (res as any)?.data || res;
    },
    enabled: !!selectedStudentId,
  });

  const students = Array.isArray(data) ? data : (data?.students || data?.items || []);
  const total = data?.total || students.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PlacementPageHeader
        title="Student Placement Directory"
        desc="College-scoped roster of candidate students. Academic identity and assessment metrics are strictly synchronized and read-only."
        actions={
          <Badge variant="outline" className="text-xs bg-muted/30 border-border/70 py-1.5 px-3">
            <Lock className="h-3 w-3 mr-1 text-muted-foreground" /> Academic Integrity Protected
          </Badge>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PlacementMetric
          label="College Students"
          value={total}
          note="Total in campus directory"
          icon={Users}
          variant="default"
        />
        <PlacementMetric
          label="Placement Ready (≥75%)"
          value={students.filter((s: any) => s.readinessScore >= 75).length}
          note="Qualified for Tier 1 & 2 drives"
          icon={Sparkles}
          variant="info"
        />
        <PlacementMetric
          label="Placed Students"
          value={students.filter((s: any) => s.hasAcceptedOffer || s.offersCount > 0).length}
          note="Active offers secured"
          icon={Award}
          variant="success"
        />
        <PlacementMetric
          label="Zero Backlogs"
          value={students.filter((s: any) => (s.activeBacklogs || 0) === 0).length}
          note="Clean academic track"
          icon={CheckCircle2}
          variant="primary"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student name, USN, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/80"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Information Science">Information Science</option>
            <option value="Electronics & Communication">Electronics & Comm.</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <PlacementPanel
        title="Candidate Roster"
        subtitle={`Showing ${students.length} students enrolled at your college`}
      >
        {isLoading ? (
          <PlacementLoadingSkeleton />
        ) : students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">CGPA / Backlogs</th>
                  <th className="py-3 px-4 text-center">Readiness Score</th>
                  <th className="py-3 px-4 text-center">Readiness Tier</th>
                  <th className="py-3 px-4 text-center">Placement Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {students.map((student: any) => (
                  <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-foreground">{student.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{student.usn}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{student.department}</span>
                      <span className="block text-[11px]">Sem {student.semester || 7} • Sec {student.section || "A"}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-foreground">{student.cgpa.toFixed(2)}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {student.activeBacklogs === 0 ? (
                          <span className="text-emerald-500 font-medium">0 Backlogs</span>
                        ) : (
                          <span className="text-rose-500 font-medium">{student.activeBacklogs} Backlogs</span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex flex-col items-center gap-1 w-24">
                        <span className="text-xs font-semibold text-foreground">{student.readinessScore}%</span>
                        <Progress value={student.readinessScore} className="h-1.5 w-full" />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="outline"
                        className={
                          student.readinessTier === "Tier 1"
                            ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                            : student.readinessTier === "Tier 2"
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                            : "bg-zinc-500/10 text-zinc-600 border-zinc-500/30"
                        }
                      >
                        {student.readinessTier}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {student.hasAcceptedOffer ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-[11px]">
                          <CheckCircle2 className="h-3 w-3" /> Placed
                        </Badge>
                      ) : student.offersCount > 0 ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1 text-[11px]">
                          <Award className="h-3 w-3" /> Offer Received
                        </Badge>
                      ) : student.applicationCount > 0 ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1 text-[11px]">
                          <Clock className="h-3 w-3" /> In Process ({student.applicationCount})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground text-[11px]">
                          Unplaced
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedStudentId(student.id)}
                        className="h-8 gap-1 text-xs hover:bg-primary/10 hover:text-primary"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Intelligence</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PlacementEmptyState
            title="No Students Found"
            description="Adjust your search query or department filter to view student records."
            icon={Users}
          />
        )}
      </PlacementPanel>

      {/* Student Detail Modal */}
      <Dialog open={!!selectedStudentId} onOpenChange={(open) => !open && setSelectedStudentId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-card/95 backdrop-blur-2xl border-border/80">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle className="font-display text-xl sm:text-2xl text-foreground">
                {detailData?.student?.name || "Student Placement Intelligence"}
              </DialogTitle>
              <Badge variant="outline" className="text-xs font-mono">
                {detailData?.student?.usn}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Institutional academic profile, readiness breakdown, applied drives, and verified offers.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <PlacementLoadingSkeleton />
          ) : detailData ? (
            <div className="space-y-6 pt-2">
              {/* Academic Integrity Notice */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>
                  Official CGPA ({detailData.cgpa}), Department ({detailData.student.department}), and Backlogs ({detailData.activeBacklogs}) are synchronized from institutional ERP. Placement officers hold read-only operational authority.
                </span>
              </div>

              {/* Cognitive & Coding Readiness Breakdown */}
              <div className="rounded-xl border border-border/70 bg-card/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" /> Shared Intelligence Engine Assessment
                  </h4>
                  <Badge variant="outline" className="text-xs font-mono">
                    Composite: {detailData.readinessScore}%
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="rounded-lg bg-background/60 p-3 border border-border/60 text-center">
                    <span className="text-[11px] text-muted-foreground uppercase font-medium">Coding & DSA</span>
                    <p className="font-display text-xl font-semibold text-foreground mt-1">
                      {detailData.skills?.coding || detailData.skills?.technical || 80}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-background/60 p-3 border border-border/60 text-center">
                    <span className="text-[11px] text-muted-foreground uppercase font-medium">Aptitude</span>
                    <p className="font-display text-xl font-semibold text-foreground mt-1">
                      {detailData.skills?.aptitude || 75}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-background/60 p-3 border border-border/60 text-center">
                    <span className="text-[11px] text-muted-foreground uppercase font-medium">Verbal Ability</span>
                    <p className="font-display text-xl font-semibold text-foreground mt-1">
                      {detailData.skills?.verbal || 78}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-background/60 p-3 border border-border/60 text-center">
                    <span className="text-[11px] text-muted-foreground uppercase font-medium">Soft Skills</span>
                    <p className="font-display text-xl font-semibold text-foreground mt-1">
                      {detailData.skills?.softSkills || 85}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Offers Section */}
              <div className="rounded-xl border border-border/70 bg-card/50 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-500" /> Recorded Placement Offers ({detailData.offers?.length || 0})
                </h4>
                {detailData.offers && detailData.offers.length > 0 ? (
                  <div className="space-y-2">
                    {detailData.offers.map((offer: any) => (
                      <div
                        key={offer.id}
                        className="p-3 rounded-lg border border-border/60 bg-card/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{offer.companyName}</p>
                          <p className="text-muted-foreground">
                            {offer.opportunityTitle} • Package: {offer.offeredPackage} {offer.compensationUnit}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <PlacementOfferStatusBadge status={offer.status} />
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {offer.verificationStatus?.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No offers recorded yet for this student.</p>
                )}
              </div>

              {/* Applications & Drive History */}
              <div className="rounded-xl border border-border/70 bg-card/50 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-blue-500" /> Applied Placement Drives ({detailData.applications?.length || 0})
                </h4>
                {detailData.applications && detailData.applications.length > 0 ? (
                  <div className="space-y-2">
                    {detailData.applications.map((app: any) => (
                      <div
                        key={app.id}
                        className="p-3 rounded-lg border border-border/60 bg-card/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{app.companyName}</p>
                          <p className="text-muted-foreground">{app.opportunityTitle}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {app.status}
                          </Badge>
                          <span className="block text-[10px] text-muted-foreground mt-0.5">
                            Stage: {app.currentStageName || "Application Review"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No applications submitted yet.</p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
