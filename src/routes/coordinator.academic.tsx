import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Building, FolderKanban, Layers, Network, RotateCw, ShieldCheck, Users } from "lucide-react";
import { PageHeader, Panel } from "@/features/coordinator/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api/client";
import { authService } from "@/lib/auth/service";

export const Route = createFileRoute("/coordinator/academic")({
  head: () => ({
    meta: [
      { title: "Academic Structure — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcademicStructurePage,
});

interface AcademicStructure {
  departments: string[];
  programs: string[];
  sessions: string[];
  years: string[];
  semesters: string[];
  sections: string[];
}

function AcademicStructurePage() {
  const [data, setData] = useState<AcademicStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const session = authService.getSession();
  const collegeCode = session?.user.collegeCode ?? "SMP101";

  const fetchStructure = () => {
    setLoading(true);
    api.coordinator
      .academic()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load academic structure");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStructure();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Structure"
        desc={`Authoritative academic masters for campus ${collegeCode}. These structures define the relational bounds for batches, student enrollments, and class allocations.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/m/$module" params={{ module: "classes" }}>
                <Layers className="mr-1.5 h-4 w-4" /> Classes & Sections
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/batches">
                <FolderKanban className="mr-1.5 h-4 w-4" /> Batches
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coordinator/allocations">
                <Network className="mr-1.5 h-4 w-4" /> Allocations
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchStructure} disabled={loading}>
              <RotateCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      />

      {/* Relational Flow Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-foreground flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span>
            <strong>Authoritative Academic Hierarchy:</strong> Department &rarr; Degree &rarr; Session &rarr; Year &rarr; Semester &rarr; Section. Every student and batch must resolve cleanly to this master schema.
          </span>
        </div>
        <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
          <Link to="/coordinator/students">View Enrolled Students &rarr;</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Panel
          title={`Departments (${data?.departments?.length ?? 0})`}
          action={
            <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
              <Link to="/coordinator/students">Filter Roster &rarr;</Link>
            </Button>
          }
        >
          <div className="flex flex-wrap gap-2">
            {data?.departments?.map((dept) => (
              <Link key={dept} to="/coordinator/students" className="group">
                <Badge variant="outline" className="text-xs py-1 px-2.5 group-hover:border-primary group-hover:text-primary transition-colors cursor-pointer">
                  {dept}
                </Badge>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Click any department to inspect enrolled students.</p>
        </Panel>

        <Panel title={`Programs / Degrees (${data?.programs?.length ?? 0})`}>
          <div className="flex flex-wrap gap-2">
            {data?.programs?.map((prog) => (
              <Badge key={prog} variant="outline" className="text-xs py-1 px-2.5">
                {prog}
              </Badge>
            ))}
          </div>
        </Panel>

        <Panel title={`Academic Sessions (${data?.sessions?.length ?? 0})`}>
          <div className="flex flex-wrap gap-2">
            {data?.sessions?.map((sess) => (
              <Badge key={sess} variant="secondary" className="text-xs py-1 px-2.5 font-mono">
                {sess}
              </Badge>
            ))}
          </div>
        </Panel>

        <Panel title={`Years (${data?.years?.length ?? 0})`}>
          <div className="flex flex-wrap gap-2">
            {data?.years?.map((yr) => (
              <Badge key={yr} variant="outline" className="text-xs py-1 px-2.5">
                {yr}
              </Badge>
            ))}
          </div>
        </Panel>

        <Panel title={`Semesters (${data?.semesters?.length ?? 0})`}>
          <div className="flex flex-wrap gap-2">
            {data?.semesters?.map((sem) => (
              <Badge key={sem} variant="outline" className="text-xs py-1 px-2.5">
                {sem}
              </Badge>
            ))}
          </div>
        </Panel>

        <Panel
          title={`Sections (${data?.sections?.length ?? 0})`}
          action={
            <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
              <Link to="/coordinator/m/$module" params={{ module: "classes" }}>View Classes &rarr;</Link>
            </Button>
          }
        >
          <div className="flex flex-wrap gap-2">
            {data?.sections?.map((sec) => (
              <Link key={sec} to="/coordinator/m/$module" params={{ module: "classes" }}>
                <Badge variant="outline" className="text-xs py-1 px-2.5 hover:border-primary hover:text-primary transition-colors cursor-pointer">
                  Section {sec}
                </Badge>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Sections map directly to class cohorts and timetables.</p>
        </Panel>
      </div>

      {/* Downstream Connected Workflows */}
      <Panel title="Downstream Dependent Workflows">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <Link
            to="/coordinator/batches"
            className="p-3.5 rounded border border-border bg-card/50 hover:border-primary/50 transition-colors space-y-1 block group"
          >
            <div className="flex items-center justify-between">
              <strong className="text-foreground group-hover:text-primary">1. Batches & Cohorts</strong>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-muted-foreground text-[11px]">Group students by department, year, and section for training curricula.</p>
          </Link>

          <Link
            to="/coordinator/allocations"
            className="p-3.5 rounded border border-border bg-card/50 hover:border-primary/50 transition-colors space-y-1 block group"
          >
            <div className="flex items-center justify-between">
              <strong className="text-foreground group-hover:text-primary">2. Class Allocations</strong>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-muted-foreground text-[11px]">Assign faculty trainers to target sections and skills.</p>
          </Link>

          <Link
            to="/coordinator/schedule"
            className="p-3.5 rounded border border-border bg-card/50 hover:border-primary/50 transition-colors space-y-1 block group"
          >
            <div className="flex items-center justify-between">
              <strong className="text-foreground group-hover:text-primary">3. Training Schedule</strong>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-muted-foreground text-[11px]">Calendar training sessions across labs, lecture halls, or virtual rooms.</p>
          </Link>

          <Link
            to="/coordinator/m/$module"
            params={{ module: "imports-exports" }}
            className="p-3.5 rounded border border-border bg-card/50 hover:border-primary/50 transition-colors space-y-1 block group"
          >
            <div className="flex items-center justify-between">
              <strong className="text-foreground group-hover:text-primary">4. Bulk Data Ingestion</strong>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-muted-foreground text-[11px]">Verify CSV student uploads against this authoritative academic master.</p>
          </Link>
        </div>
      </Panel>
    </div>
  );
}
