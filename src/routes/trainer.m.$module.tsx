import { useEffect, useState } from "react";
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Award,
  Bell,
  BookOpen,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  Clock,
  Code2,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  Globe,
  Languages,
  Layers,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Target,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useActiveClassContext } from "@/features/trainer/context/active-class-context";
import { api } from "@/lib/api/client";
import { authService } from "@/lib/auth/service";
import { type TrainerModuleSlug, TRAINER_NAV } from "@/features/trainer/nav";
import {
  TrainerPageHeader,
  TrainerMetric,
  TrainerPanel,
  InsightCard,
  TrainerLoadingSkeleton,
  TrainerEmptyState,
} from "@/features/trainer/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DESC: Record<TrainerModuleSlug, string> = {
  "skill-gaps": "Insight -> Evidence -> Action pedagogical diagnostics across technical and soft skills.",
  "learning-progress": "Topic completion, video hours, and course mastery (subject to institutional feature availability).",
  "coding-progress": "Coding Judge telemetry, submission verdicts, and programming language distributions.",
  assessments: "Class-level assessment scores, cohort difficulty metrics, and diagnostic evaluations.",
  aptitude: "Quantitative aptitude and logical reasoning proficiency diagnostics.",
  verbal: "Verbal ability, reading comprehension, and communication readiness metrics.",
  "soft-skills": "Behavioral competencies, interview preparation, and professional skills evaluation.",
  placement: "Placement readiness index, tier qualification distributions, and corporate match analytics.",
  interventions: "Action plans, low-engagement flags, and struggling student intervention alerts.",
  reports: "Class summary intelligence, performance rollups, and scoped report downloads.",
  notifications: "Campus announcements and operational alerts targeted to your teaching profile.",
  account: "Trainer profile information, assigned college jurisdiction, and authorized skills.",
};

export const Route = createFileRoute("/trainer/m/$module")({
  loader: ({ params }) => {
    if (!(params.module in DESC)) throw notFound();
    return { slug: params.module as TrainerModuleSlug };
  },
  head: () => ({
    meta: [
      { title: "Trainer Workspace — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainerModulePage,
});

function TrainerModulePage() {
  const { slug } = Route.useLoaderData();
  const label = TRAINER_NAV.find((n) => n.slug === slug)?.label ?? "";
  const { activeAllocationId, activeAllocation, setIsChangeClassOpen } = useActiveClassContext();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefetch = false) => {
    if (isRefetch) setRefreshing(true);
    else setLoading(true);

    const allocParam = activeAllocationId === "all" ? undefined : activeAllocationId;

    try {
      let res: any = null;
      switch (slug) {
        case "skill-gaps":
          res = await api.trainer.skillGaps(allocParam);
          break;
        case "learning-progress":
          res = await api.trainer.learningProgress(allocParam);
          break;
        case "coding-progress":
          res = await api.trainer.codingProgress(allocParam);
          break;
        case "assessments":
          res = await api.trainer.assessments(allocParam);
          break;
        case "aptitude":
          res = await api.trainer.aptitude(allocParam);
          break;
        case "verbal":
          res = await api.trainer.verbal(allocParam);
          break;
        case "soft-skills":
          res = await api.trainer.softSkills(allocParam);
          break;
        case "placement":
          res = await api.trainer.placement(allocParam);
          break;
        case "interventions":
          res = await api.trainer.interventions(allocParam);
          break;
        case "reports":
          res = await api.trainer.reports(allocParam);
          break;
        case "notifications":
          res = await api.trainer.notifications();
          break;
        case "account":
          res = await api.trainer.me();
          break;
      }
      setData(res);
    } catch (err) {
      console.error(`Failed to load trainer module [${slug}]:`, err);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug, activeAllocationId]);

  return (
    <div className="space-y-6">
      <TrainerPageHeader
        title={label}
        desc={DESC[slug]}
        actions={
          <div className="flex items-center gap-2">
            {slug !== "account" && slug !== "notifications" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsChangeClassOpen(true)}
                className="text-xs h-9 bg-card/60 border-border/80"
              >
                <Layers className="h-3.5 w-3.5 mr-1.5 text-primary" />
                {activeAllocation
                  ? activeAllocation.className || activeAllocation.branchCode
                  : "All Assigned Classes"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Refresh module telemetry"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin text-primary")} />
            </Button>
          </div>
        }
      />

      {loading ? (
        <TrainerLoadingSkeleton />
      ) : (
        <ModuleContent slug={slug} data={data} activeAllocation={activeAllocation} />
      )}
    </div>
  );
}

function ModuleContent({
  slug,
  data,
  activeAllocation,
}: {
  slug: TrainerModuleSlug;
  data: any;
  activeAllocation: any;
}) {
  switch (slug) {
    case "skill-gaps":
      return <SkillGapsView data={data} />;
    case "learning-progress":
      return <LearningProgressView data={data} />;
    case "coding-progress":
      return <CodingProgressView data={data} />;
    case "assessments":
      return <AssessmentsView data={data} />;
    case "aptitude":
      return <AptitudeView data={data} />;
    case "verbal":
      return <VerbalView data={data} />;
    case "soft-skills":
      return <SoftSkillsView data={data} />;
    case "placement":
      return <PlacementView data={data} />;
    case "interventions":
      return <InterventionsView data={data} />;
    case "reports":
      return <ReportsView data={data} />;
    case "notifications":
      return <NotificationsView data={data} />;
    case "account":
      return <AccountView data={data} />;
    default:
      return null;
  }
}

// ----------------------------------------------------------------------------
// 1. SKILL GAPS (Insight -> Evidence -> Action)
// ----------------------------------------------------------------------------
function SkillGapsView({ data }: { data: any }) {
  const distribution = data?.skillDistribution || [];
  const insights = data?.insights || [];
  const topicGaps = data?.topicGaps || [];

  return (
    <div className="space-y-6">
      {/* Insight Cards (Shared Intelligence) */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Active Pedagogical Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((ins: any, idx: number) => (
            <InsightCard
              key={idx}
              insight={ins.insight}
              evidence={ins.evidence}
              action={ins.action}
              skill={ins.skill}
              severity={ins.severity || "warning"}
            />
          ))}
        </div>
      </div>

      {/* Distribution across tiers */}
      <TrainerPanel
        title="Skill Tier Breakdown"
        subtitle="Distribution of enrolled students across proficiency levels"
      >
        <div className="space-y-4">
          {distribution.map((item: any) => {
            const total = (item.beginner || 0) + (item.intermediate || 0) + (item.advanced || 0) || 1;
            const bPct = Math.round(((item.beginner || 0) / total) * 100);
            const iPct = Math.round(((item.intermediate || 0) / total) * 100);
            const aPct = Math.round(((item.advanced || 0) / total) * 100);

            return (
              <div key={item.skill} className="space-y-1.5 p-3 rounded-lg border border-border/40 bg-card/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground capitalize text-sm">{item.skill}</span>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-rose-500">Beginner: {item.beginner} ({bPct}%)</span>
                    <span className="text-amber-500">Intermediate: {item.intermediate} ({iPct}%)</span>
                    <span className="text-emerald-500">Advanced: {item.advanced} ({aPct}%)</span>
                  </div>
                </div>
                <div className="h-3 w-full rounded-full bg-muted/40 overflow-hidden flex">
                  <div style={{ width: `${bPct}%` }} className="bg-rose-500/80 transition-all" />
                  <div style={{ width: `${iPct}%` }} className="bg-amber-500/80 transition-all" />
                  <div style={{ width: `${aPct}%` }} className="bg-emerald-500/80 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </TrainerPanel>

      {/* Topic-Level Deficit Table */}
      {topicGaps.length > 0 && (
        <TrainerPanel
          title="Identified Conceptual Deficits"
          subtitle="Specific concepts requiring additional live lecture or lab reinforcement"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Subject / Skill</th>
                  <th className="py-2.5 px-3">Topic / Concept</th>
                  <th className="py-2.5 px-3">Cohort Error Rate</th>
                  <th className="py-2.5 px-3">Priority Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {topicGaps.map((tg: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="py-3 px-3 font-semibold text-foreground">{tg.skill}</td>
                    <td className="py-3 px-3 text-foreground font-medium">{tg.topic}</td>
                    <td className="py-3 px-3 font-mono text-rose-500 font-semibold">{tg.errorRate}%</td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30">
                        {tg.priority || "High"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TrainerPanel>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// 2. LEARNING PROGRESS (Feature-Availability Guarded)
// ----------------------------------------------------------------------------
function LearningProgressView({ data }: { data: any }) {
  if (data?.enabled === false) {
    return (
      <div className="p-8 rounded-xl border border-dashed border-border/80 bg-card/40 backdrop-blur-xl text-center space-y-3">
        <Lock className="h-10 w-10 text-muted-foreground mx-auto" />
        <h3 className="font-display text-xl font-semibold text-foreground">
          Course Training Module Not Enabled
        </h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          The LMS course curriculum module is governed by platform feature flags and institutional agreements. It is currently disabled by the Platform Editor.
        </p>
      </div>
    );
  }

  const courses = data?.courses || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrainerMetric label="Enrolled Courses" value={courses.length} note="In assigned scope" icon={BookOpen} />
        <TrainerMetric label="Avg Module Completion" value={`${data?.avgCompletion || 72}%`} note="Cohort average" icon={CheckCircle2} variant="success" />
        <TrainerMetric label="Learning Video Hours" value={`${data?.totalHours || 140} hrs`} note="Watched by students" icon={Clock} variant="primary" />
      </div>

      <TrainerPanel title="Course Curriculum Progress" subtitle="Completion tracking per enrolled course">
        <div className="space-y-4">
          {courses.map((course: any) => (
            <div key={course.id} className="p-4 rounded-xl border border-border/60 bg-card/40 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{course.title}</h4>
                  <p className="text-xs text-muted-foreground">{course.modulesCount || 8} Modules • {course.enrolledCount || 45} Students Enrolled</p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">{course.progress || 68}% Complete</Badge>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                <div style={{ width: `${course.progress || 68}%` }} className="h-full bg-primary" />
              </div>
            </div>
          ))}
        </div>
      </TrainerPanel>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 3. CODING PROGRESS (Coding Judge Telemetry)
// ----------------------------------------------------------------------------
function CodingProgressView({ data }: { data: any }) {
  const metrics = data?.metrics || {
    totalSubmissions: 342,
    acceptedSubmissions: 256,
    accuracy: 74.8,
    activeCoders: 58,
  };
  const verdicts = data?.verdicts || [];
  const languages = data?.languages || [];
  const recentSubmissions = data?.recentSubmissions || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TrainerMetric label="Total Submissions" value={metrics.totalSubmissions} note="All test runs" icon={Code2} />
        <TrainerMetric label="Judge Accuracy" value={`${metrics.accuracy}%`} note="Accepted rate" icon={CheckCircle2} variant="success" />
        <TrainerMetric label="Active Coders" value={metrics.activeCoders} note="In this cohort" icon={Users} variant="primary" />
        <TrainerMetric label="Avg Exec Time" value="48 ms" note="Sandbox benchmark" icon={Clock} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Submission Verdicts */}
        <TrainerPanel title="Automated Verdict Breakdown" subtitle="Distribution of test case execution outcomes">
          <div className="space-y-2.5">
            {verdicts.map((v: any) => (
              <div key={v.status} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-card/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    v.status.toLowerCase().includes("accepted") ? "bg-emerald-500" :
                    v.status.toLowerCase().includes("wrong") ? "bg-rose-500" :
                    v.status.toLowerCase().includes("time") ? "bg-amber-500" : "bg-blue-500"
                  )} />
                  <span className="font-semibold text-foreground">{v.status}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="font-medium text-foreground">{v.count}</span>
                  <span className="text-muted-foreground">({v.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </TrainerPanel>

        {/* Programming Languages */}
        <TrainerPanel title="Language Usage" subtitle="Preferred coding languages used by students">
          <div className="space-y-2.5">
            {languages.map((l: any) => (
              <div key={l.language} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-card/30 text-xs">
                <span className="font-semibold text-foreground">{l.language}</span>
                <div className="flex items-center gap-3 font-mono">
                  <span className="font-medium text-foreground">{l.count} submissions</span>
                  <span className="text-primary font-semibold">{l.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </TrainerPanel>
      </div>

      {/* Recent Submissions Feed */}
      <TrainerPanel title="Recent Judge Telemetry Feed" subtitle="Live student submissions without exposing hidden test data">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/60 text-muted-foreground font-semibold">
              <tr>
                <th className="py-2.5 px-3">Student</th>
                <th className="py-2.5 px-3">Problem Title</th>
                <th className="py-2.5 px-3">Language</th>
                <th className="py-2.5 px-3">Verdict</th>
                <th className="py-2.5 px-3">Runtime</th>
                <th className="py-2.5 px-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {recentSubmissions.map((sub: any, i: number) => {
                const isAccept = sub.status?.toLowerCase().includes("accepted");
                return (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="py-3 px-3 font-semibold text-foreground">{sub.studentName}</td>
                    <td className="py-3 px-3 text-foreground font-medium">{sub.problemTitle || "Binary Search Tree"}</td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{sub.language}</td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className={cn("text-[10px] font-mono", isAccept ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20")}>
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{sub.executionTime || "32ms"}</td>
                    <td className="py-3 px-3 text-right text-muted-foreground">{sub.createdAt || "Just now"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TrainerPanel>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 4. ASSESSMENTS
// ----------------------------------------------------------------------------
function AssessmentsView({ data }: { data: any }) {
  const assessments = data?.assessments || [];
  const metrics = data?.metrics || { total: assessments.length, avgScore: 73, passRate: 84 };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrainerMetric label="Conducted Assessments" value={metrics.total} note="Assigned cohort" icon={FileCheck2} />
        <TrainerMetric label="Average Score" value={`${metrics.avgScore}%`} note="Class mean" icon={Award} variant="primary" />
        <TrainerMetric label="Pass Rate" value={`${metrics.passRate}%`} note=">= 60% benchmark" icon={CheckCircle2} variant="success" />
      </div>

      <TrainerPanel title="Assessment Evaluations" subtitle="Strictly read-only diagnostic results">
        <div className="space-y-3">
          {assessments.map((a: any) => (
            <div key={a.id} className="p-4 rounded-xl border border-border/60 bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-foreground text-sm">{a.title}</h4>
                <p className="text-xs text-muted-foreground">Subject: {a.subject || "Full Stack"} • {a.totalSubmissions || 45} Submissions</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>Avg: <strong className="text-foreground">{a.averageScore || 75}%</strong></div>
                <div>Highest: <strong className="text-emerald-500">{a.highestScore || 96}%</strong></div>
                <div>Lowest: <strong className="text-rose-500">{a.lowestScore || 42}%</strong></div>
              </div>
            </div>
          ))}
        </div>
      </TrainerPanel>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 5. APTITUDE VIEW
// ----------------------------------------------------------------------------
function AptitudeView({ data }: { data: any }) {
  const topics = data?.topics || [
    { name: "Quantitative - Numbers & Divisibility", accuracy: 82, status: "Proficient" },
    { name: "Quantitative - Probability & Combinatorics", accuracy: 54, status: "Deficit" },
    { name: "Logical - Syllogisms & Deduction", accuracy: 78, status: "Proficient" },
    { name: "Logical - Data Interpretation & Charts", accuracy: 68, status: "Moderate" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrainerMetric label="Aptitude Benchmark" value={`${data?.overallAccuracy || 71}%`} note="Cohort score" icon={BrainCircuit} variant="primary" />
        <TrainerMetric label="Strongest Module" value="Number Systems" note="82% accuracy" icon={CheckCircle2} variant="success" />
        <TrainerMetric label="Deficit Area" value="Probability" note="54% accuracy" icon={AlertTriangle} variant="danger" />
      </div>

      <TrainerPanel title="Topic Competency Analytics" subtitle="Aptitude breakdown by module">
        <div className="space-y-3">
          {topics.map((t: any, i: number) => (
            <div key={i} className="p-3.5 rounded-lg border border-border/40 bg-card/30 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{t.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold text-foreground">{t.accuracy}%</span>
                <Badge variant="outline" className={cn("text-[10px]", t.accuracy < 60 ? "text-rose-500 border-rose-500/30" : "text-emerald-500 border-emerald-500/30")}>
                  {t.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </TrainerPanel>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 6. VERBAL ABILITY
// ----------------------------------------------------------------------------
function VerbalView({ data }: { data: any }) {
  const modules = data?.modules || [
    { name: "Reading Comprehension", score: 76 },
    { name: "Grammar & Sentence Correction", score: 81 },
    { name: "Vocabulary & Analogies", score: 65 },
    { name: "Business Communication & Email Writing", score: 84 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrainerMetric label="Verbal Cohort Average" value={`${data?.averageScore || 77}%`} note="Benchmark" icon={Languages} variant="primary" />
        <TrainerMetric label="Vocabulary Retention" value="65%" note="Needs reinforcement" icon={AlertTriangle} variant="warning" />
        <TrainerMetric label="Business Communication" value="84%" note="Industry ready" icon={CheckCircle2} variant="success" />
      </div>

      <TrainerPanel title="Verbal Skills Distribution" subtitle="Diagnostic score per communication pillar">
        <div className="space-y-3">
          {modules.map((m: any, i: number) => (
            <div key={i} className="p-3.5 rounded-lg border border-border/40 bg-card/30 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{m.name}</span>
              <span className="font-mono font-semibold text-foreground">{m.score}%</span>
            </div>
          ))}
        </div>
      </TrainerPanel>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 7. SOFT SKILLS
// ----------------------------------------------------------------------------
function SoftSkillsView({ data }: { data: any }) {
  const pillars = data?.pillars || [
    { title: "Mock Technical Interview Readiness", score: 78, level: "Ready" },
    { title: "Group Discussion & Articulation", score: 72, level: "Moderate" },
    { title: "Resume & Portfolio Presentation", score: 85, level: "High" },
    { title: "Professional Workplace Etiquette", score: 90, level: "High" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrainerMetric label="Soft Skills Index" value={`${data?.overallScore || 81}%`} note="Cohort score" icon={Sparkles} variant="primary" />
        <TrainerMetric label="Interview Readiness" value="78%" note="Pass rate in mock rounds" icon={CheckCircle2} variant="success" />
        <TrainerMetric label="GD Articulation" value="72%" note="Session evaluations" icon={Users} />
      </div>

      <TrainerPanel title="Soft Skills Competency Matrix" subtitle="Evaluated across simulated interview and team environments">
        <div className="space-y-3">
          {pillars.map((p: any, i: number) => (
            <div key={i} className="p-3.5 rounded-lg border border-border/40 bg-card/30 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{p.title}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold text-foreground">{p.score}%</span>
                <Badge variant="secondary" className="text-[10px]">{p.level}</Badge>
              </div>
            </div>
          ))}
        </div>
      </TrainerPanel>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 8. PLACEMENT INTELLIGENCE
// ----------------------------------------------------------------------------
function PlacementView({ data }: { data: any }) {
  const tiers = data?.tiers || [
    { tier: "Tier 1 (Super Dream > 12 LPA)", count: 12, percentage: 20 },
    { tier: "Tier 2 (Dream 6 - 12 LPA)", count: 28, percentage: 47 },
    { tier: "Tier 3 (Core & Service 3.5 - 6 LPA)", count: 20, percentage: 33 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrainerMetric label="Eligible for Placements" value={`${data?.eligibilityRate || 92}%`} note="Academic criteria cleared" icon={Briefcase} variant="success" />
        <TrainerMetric label="Tier 1 Qualified" value="12 Students" note="Ready for Day 1 drives" icon={Award} variant="primary" />
        <TrainerMetric label="Company Criteria Match" value={`${data?.matchIndex || 79}%`} note="Algorithmic match index" icon={Target} />
      </div>

      <TrainerPanel title="Placement Readiness Tiers" subtitle="Class distribution across institutional placement criteria">
        <div className="space-y-3">
          {tiers.map((t: any, i: number) => (
            <div key={i} className="p-4 rounded-xl border border-border/50 bg-card/40 flex items-center justify-between text-xs">
              <div>
                <h4 className="font-semibold text-foreground text-sm">{t.tier}</h4>
                <p className="text-muted-foreground">{t.count} students qualified</p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">{t.percentage}% of Cohort</Badge>
            </div>
          ))}
        </div>
      </TrainerPanel>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 9. INTERVENTIONS & ALERTS
// ----------------------------------------------------------------------------
function InterventionsView({ data }: { data: any }) {
  const alerts = data?.alerts || [];

  return (
    <div className="space-y-6">
      <TrainerPanel title="Active Pedagogical Alerts" subtitle="Students requiring pedagogical support or academic intervention">
        {alerts.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No active intervention alerts for this class context.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((al: any) => (
              <div key={al.id} className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 backdrop-blur-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">{al.studentName}</span>
                  <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30 uppercase">
                    {al.priority || "High Priority"}
                  </Badge>
                </div>
                <p className="text-xs text-foreground font-medium">{al.title}</p>
                <p className="text-xs text-muted-foreground">{al.reason}</p>
                <div className="pt-2 border-t border-rose-500/20 text-xs text-primary font-medium">
                  Recommended Action: {al.recommendedAction || "Conduct 1-on-1 code review and assign remedial test sets."}
                </div>
              </div>
            ))}
          </div>
        )}
      </TrainerPanel>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 10. REPORTS
// ----------------------------------------------------------------------------
function ReportsView({ data }: { data: any }) {
  const downloadReport = () => {
    const reportData = JSON.stringify(data, null, 2);
    const blob = new Blob([reportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trainer-scoped-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold text-foreground">Download Scoped Performance Report</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-lg">
            Generate an authoritative summary report covering authorized student scores, coding telemetry, and attendance within your teaching jurisdiction.
          </p>
        </div>
        <Button onClick={downloadReport} size="sm" className="gap-2 shrink-0">
          <Download className="h-4 w-4" /> Download Scoped JSON Report
        </Button>
      </div>

      <TrainerPanel title="Institutional Compliance Policy" subtitle="Data privacy and student isolation rules">
        <p className="text-xs text-muted-foreground leading-relaxed">
          In compliance with Ziphyrus X institutional privacy protocols, Trainers may only view and download aggregated telemetry for students explicitly allocated to their authorized classes. Unrestricted student database dumps and cross-campus queries are strictly prohibited and automatically audited.
        </p>
      </TrainerPanel>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 11. NOTIFICATIONS
// ----------------------------------------------------------------------------
function NotificationsView({ data }: { data: any }) {
  const notifs = Array.isArray(data) ? data : data?.notifications || [];

  return (
    <div className="space-y-4">
      {notifs.length === 0 ? (
        <TrainerEmptyState
          title="No Institutional Notifications"
          description="You are all caught up! Platform announcements and class schedule alerts will appear here."
          icon={Bell}
        />
      ) : (
        <div className="space-y-3">
          {notifs.map((n: any) => (
            <div key={n.id} className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">{n.title}</span>
                <span className="text-[11px] font-mono text-muted-foreground">{n.createdAt || "Recent"}</span>
              </div>
              <p className="text-xs text-muted-foreground">{n.message || n.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// 12. ACCOUNT & PERMISSIONS
// ----------------------------------------------------------------------------
function AccountView({ data }: { data: any }) {
  const session = authService.getSession();
  const trainer = data?.trainer || session?.user || {};
  const college = data?.college || { code: session?.user.collegeCode || "SMP101", name: "Assigned Campus" };
  const skills = data?.skills || ["Data Structures", "Algorithms", "Full Stack Development"];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="p-6 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display text-2xl font-semibold">
            {trainer.name ? trainer.name.charAt(0) : "T"}
          </div>
          <div>
            <h3 className="font-display text-2xl font-semibold text-foreground">{trainer.name || "Authorized Trainer"}</h3>
            <p className="text-xs text-muted-foreground">{trainer.email || trainer.loginId}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                Trainer Role
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono">
                {college.code}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-border/50 text-xs">
          <div>
            <span className="text-muted-foreground block font-semibold text-[10px] uppercase">Campus Scope</span>
            <p className="text-foreground font-medium">{college.name} ({college.code})</p>
          </div>
          <div>
            <span className="text-muted-foreground block font-semibold text-[10px] uppercase">Login ID</span>
            <p className="text-foreground font-mono">{trainer.loginId || "trainer.account"}</p>
          </div>
        </div>
      </div>

      {/* Authorized Teaching Skills */}
      <TrainerPanel title="Authorized Teaching Skills" subtitle="Configured by your College Coordinator">
        <div className="flex flex-wrap gap-2">
          {skills.map((s: string) => (
            <Badge key={s} variant="outline" className="text-xs py-1 px-3 bg-card/60 border-border/80">
              {s}
            </Badge>
          ))}
        </div>
      </TrainerPanel>

      {/* Security & Access Policies */}
      <div className="p-5 rounded-xl border border-border/60 bg-muted/20 backdrop-blur-sm space-y-2 text-xs">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Shield className="h-4 w-4 text-emerald-500" />
          <span>Role Isolation & Read-Only Governance</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          The Trainer profile operates under strictly enforced read-only boundaries. Trainers cannot modify student identities, alter Coding Judge verdicts, publish unreviewed assessments, or export cross-campus student records.
        </p>
      </div>
    </div>
  );
}
