import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Building2,
  CheckCircle,
  FileQuestion,
  Layers,
  Plus,
  Sliders,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader, Metric, Panel, fmt } from "@/features/editor/page";
import { Button } from "@/components/ui/button";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { CollegeStatusBadge } from "@/components/colleges/college-status-components";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/editor/")({
  head: () => ({
    meta: [
      { title: "Editor Overview — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditorOverviewPage,
});

function EditorOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.editor
      .overview()
      .then((res) => {
        if (active) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load editor overview", err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const counts = data?.counts ?? {
    courses: 2,
    publishedCourses: 1,
    draftCourses: 1,
    questions: 4,
    mcqQuestions: 2,
    assessments: 2,
    featureFlags: 5,
    activeFeatures: 3,
    overrides: 1,
    colleges: 4,
    activeColleges: 2,
    holdColleges: 1,
    deactiveColleges: 1,
    coordinators: 1,
    activeCoordinators: 1,
  };

  return (
    <div>
      <PageHeader
        title="Editor Workspace"
        desc="Authoritative control for platform feature availability, learning content hierarchy, question banks, assessment blueprints, college lifecycle, and coordinator accounts."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/editor/colleges">
                <Building2 className="mr-2 h-4 w-4" /> Colleges
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/editor/coordinators">
                <Users className="mr-2 h-4 w-4" /> Coordinators
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/editor/features">
                <Sliders className="mr-2 h-4 w-4" /> Feature Flags
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/editor/courses">
                <Plus className="mr-2 h-4 w-4" /> New Course
              </Link>
            </Button>
          </div>
        }
      />

      {/* Primary Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric
          label="Colleges Directory"
          value={counts.colleges ?? 4}
          note={`${counts.activeColleges ?? 2} active · ${counts.holdColleges ?? 1} hold · ${counts.deactiveColleges ?? 1} deactive`}
        />
        <Metric
          label="Coordinators"
          value={counts.coordinators ?? 1}
          note={`${counts.activeCoordinators ?? 1} active · 1 per college rule`}
        />
        <Metric
          label="Learning Courses"
          value={counts.courses}
          note={`${counts.publishedCourses} published · ${counts.draftCourses} draft`}
        />
        <Metric
          label="Question Bank"
          value={counts.questions}
          note={`${counts.mcqQuestions} MCQ · ${counts.questions - counts.mcqQuestions} Subjective`}
        />
        <Metric
          label="Assessments"
          value={counts.assessments}
          note="Active testing blueprints"
        />
        <Metric
          label="Feature Gates"
          value={`${counts.activeFeatures} / ${counts.featureFlags}`}
          note="Editor-controlled availability"
        />
      </div>

      {/* Content & Governance Grids */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Colleges Lifecycle Status"
          action={
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link to="/editor/colleges">Manage colleges →</Link>
            </Button>
          }
        >
          <DataTable
            data={data?.recentColleges ?? []}
            emptyMessage="No colleges found."
            columns={[
              {
                header: "Code",
                accessor: (c: any) => <span className="font-mono text-xs font-semibold">{c.code}</span>,
              },
              {
                header: "College Name",
                accessor: (c: any) => <span className="font-medium text-xs truncate max-w-[180px] block">{c.name}</span>,
              },
              {
                header: "Students",
                accessor: (c: any) => <span className="text-xs">{c.students} enrolled</span>,
              },
              {
                header: "Status",
                accessor: (c: any) => <CollegeStatusBadge status={c.status} />,
              },
            ]}
          />
        </Panel>

        <Panel
          title="Recent Learning Content"
          action={
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link to="/editor/courses">View all courses →</Link>
            </Button>
          }
        >
          <DataTable
            data={data?.recentCourses ?? []}
            emptyMessage="No learning courses found."
            columns={[
              { header: "Code", accessor: (c: any) => <span className="font-mono text-xs font-semibold">{c.code}</span> },
              { header: "Course Title", accessor: (c: any) => <span className="font-medium text-xs">{c.title}</span> },
              { header: "Modules", accessor: (c: any) => <span className="text-xs">{c.modulesCount} modules</span> },
              {
                header: "Status",
                accessor: (c: any) => (
                  <StatusBadge status={c.status} label={c.status.toUpperCase()} />
                ),
              },
            ]}
          />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Recent Assessment Blueprints"
          action={
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link to="/editor/assessments">View assessments →</Link>
            </Button>
          }
        >
          <DataTable
            data={data?.recentAssessments ?? []}
            emptyMessage="No assessment blueprints configured."
            columns={[
              { header: "Code", accessor: (a: any) => <span className="font-mono text-xs font-semibold">{a.code}</span> },
              { header: "Title", accessor: (a: any) => <span className="font-medium text-xs">{a.title}</span> },
              { header: "Domain", accessor: (a: any) => <span className="text-xs">{a.domain}</span> },
              { header: "Questions", accessor: (a: any) => <span className="text-xs font-mono">{a.questionsCount} items</span> },
              {
                header: "Status",
                accessor: (a: any) => (
                  <StatusBadge status={a.status} label={a.status.toUpperCase()} />
                ),
              },
            ]}
          />
        </Panel>

        <Panel
          title="Coordinator Accounts Coverage"
          action={
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link to="/editor/coordinators">View coordinators →</Link>
            </Button>
          }
        >
          <DataTable
            data={data?.recentCoordinators ?? []}
            emptyMessage="No coordinator accounts provisioned."
            columns={[
              {
                header: "Coordinator",
                accessor: (c: any) => (
                  <div>
                    <p className="font-medium text-xs">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.email}</p>
                  </div>
                ),
              },
              {
                header: "Assigned College",
                accessor: (c: any) => (
                  <span className="font-mono text-xs font-semibold bg-muted px-2 py-0.5 rounded">
                    {c.college}
                  </span>
                ),
              },
              {
                header: "Status",
                accessor: (c: any) => (
                  <StatusBadge status={c.status} label={c.status.toUpperCase()} />
                ),
              },
            ]}
          />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title="Active Visible-Value Overrides"
          action={
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link to="/editor/overrides">Manage overrides →</Link>
            </Button>
          }
        >
          <p className="text-xs text-muted-foreground mb-4">
            Visible overrides alter frontend presentation only. Under Ziphyrus X policy, overrides do not modify authoritative records or derived intelligence models.
          </p>
          <DataTable
            data={data?.recentOverrides ?? []}
            emptyMessage="No active overrides."
            columns={[
              { header: "Entity", accessor: (o: any) => <span className="font-mono text-xs">{o.entityType}:{o.entityId}</span> },
              { header: "Field", accessor: (o: any) => <span className="font-mono text-xs">{o.fieldName}</span> },
              { header: "Actual Value", accessor: (o: any) => <span className="text-xs line-through text-muted-foreground">{o.actualValue}</span> },
              { header: "Visible Value", accessor: (o: any) => <span className="text-xs font-semibold text-primary">{o.visibleValue}</span> },
              { header: "Mandatory Reason", accessor: (o: any) => <span className="text-xs italic text-muted-foreground truncate max-w-xs block">{o.mandatoryReason}</span> },
              { header: "Updated", accessor: (o: any) => <span className="text-xs">{fmt(o.createdAt)}</span> },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
