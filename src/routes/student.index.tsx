import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Code2,
  FileCheck2,
  BookOpen,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  GitBranch,
  Terminal,
  ArrowRight,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api/client";
import { StudentProfileCard } from "@/features/student/components/profile-card";
import { ContributionHeatmap } from "@/features/student/components/contribution-heatmap";
import { StudentAnalyticsCharts } from "@/features/student/components/student-analytics-charts";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentDashboardPage,
});

function StudentDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [contributions, setContributions] = useState<{ totalContributions: number; contributions: { date: string; count: number }[] }>({
    totalContributions: 0,
    contributions: [],
  });

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [dashRes, contribRes] = await Promise.all([
          api.student.dashboard(),
          api.student.contributions(),
        ]);
        if (mounted) {
          setDashboard(dashRes);
          setContributions(contribRes);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 rounded-md bg-muted/40 border border-border" />
        <div className="h-48 rounded-md bg-muted/40 border border-border" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 rounded-md bg-muted/40 border border-border" />
          <div className="h-64 rounded-md bg-muted/40 border border-border" />
        </div>
      </div>
    );
  }

  const student = dashboard?.student || {
    id: "stu-1",
    name: "Aarav Sharma",
    usn: "1MS22CS001",
    email: "aarav@smp101.edu",
    collegeCode: "SMP101",
    department: "Computer Science & Engineering",
    program: "B.Tech Computer Science",
    year: "3rd Year",
    semester: "Semester 6",
    section: "Section A",
    batch: "Batch 2026-CS-A",
    targetGitHubRepo: "ZiphyrusX-Aarav-001",
    stats: { solvedProblems: 12, completedAssessments: 2, readinessScore: 82 },
  };

  const metrics = dashboard?.metrics || {
    problemsSolved: 12,
    totalSubmissions: 16,
    acceptanceRate: 75,
    readinessScore: 82,
    activeActionPlans: 1,
    verifiedStreakDays: 4,
  };

  return (
    <div className="space-y-6">
      {/* 1. Student Profile Header Card */}
      <StudentProfileCard student={student} />

      {/* 2. Interactive Key Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Link
          to="/student/judge"
          className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl hover:border-primary/50 hover:shadow-md transition-all group block"
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="group-hover:text-foreground transition-colors">Problems Solved</span>
            <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1.5 flex items-baseline gap-1.5">
            <span>{metrics.problemsSolved}</span>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono py-0 px-1">
              {metrics.acceptanceRate}% Acc
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
            <span>{metrics.totalSubmissions || 16} total attempts</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
          </p>
        </Link>

        <Link
          to="/student/m/$module"
          params={{ module: "performance" }}
          className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl hover:border-primary/50 hover:shadow-md transition-all group block"
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="group-hover:text-foreground transition-colors">Composite Readiness</span>
            <TrendingUp className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1.5 flex items-baseline gap-1.5">
            <span>{metrics.readinessScore}%</span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-mono py-0 px-1">
              Tier 1
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
            <span>88th Percentile in Batch</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
          </p>
        </Link>

        <Link
          to="/student/m/$module"
          params={{ module: "github" }}
          className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl hover:border-primary/50 hover:shadow-md transition-all group block"
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="group-hover:text-foreground transition-colors">Verified Streak</span>
            <Flame className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1.5 flex items-baseline gap-1.5">
            <span>{metrics.verifiedStreakDays}</span>
            <span className="text-xs font-sans text-muted-foreground font-normal">Days Active</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
            <span>Continuous Evidence</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
          </p>
        </Link>

        <Link
          to="/student/m/$module"
          params={{ module: "action-plans" }}
          className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl hover:border-primary/50 hover:shadow-md transition-all group block"
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="group-hover:text-foreground transition-colors">Active Interventions</span>
            <CheckCircle2 className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1.5 flex items-baseline gap-1.5">
            <span>{metrics.activeActionPlans}</span>
            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-mono py-0 px-1">
              In Progress
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
            <span>Action Plans Assigned</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
          </p>
        </Link>
      </div>

      {/* 3. Interactive Graphical Telemetry & Analytics Charts */}
      <StudentAnalyticsCharts
        metrics={metrics}
        skills={dashboard?.student?.skills || { technical: 84, coding: 78, aptitude: 80, verbal: 76, softSkills: 88 }}
        recentSubmissions={dashboard?.recentSubmissions || []}
      />

      {/* 4. Verified Activity Contribution Heatmap (GitHub-style) */}
      <ContributionHeatmap
        data={contributions.contributions}
        totalContributions={contributions.totalContributions}
      />

      {/* 4. Two-Column Workspace Panels: Recent Coding & Upcoming Assessments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Coding Submissions */}
        <div className="rounded-md border border-border bg-card p-4 text-card-foreground flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              <span>Recent Coding Submissions</span>
            </h3>
            <Button size="sm" variant="ghost" asChild className="h-7 text-xs text-muted-foreground hover:text-foreground">
              <Link to="/student/judge">
                <span>View Judge</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="divide-y divide-border/40 flex-1">
            {dashboard?.recentSubmissions?.length ? (
              dashboard.recentSubmissions.map((sub: any) => (
                <div key={sub.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-foreground truncate">{sub.problemTitle}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="font-mono uppercase">{sub.language}</span>
                      <span>•</span>
                      <span>{sub.executionTimeMs}ms</span>
                      {sub.githubSynced && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            Synced
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      sub.status === "accepted"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px]"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[11px]"
                    }
                  >
                    {sub.status === "accepted" ? "Accepted" : "Wrong Answer"}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent submissions. Head over to the Coding Judge to solve problems!
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Assessments */}
        <div className="rounded-md border border-border bg-card p-4 text-card-foreground flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-primary" />
              <span>Upcoming Assessments</span>
            </h3>
            <Button size="sm" variant="ghost" asChild className="h-7 text-xs text-muted-foreground hover:text-foreground">
              <Link to="/student/assessments">
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="divide-y divide-border/40 flex-1">
            {dashboard?.upcomingAssessments?.length ? (
              dashboard.upcomingAssessments.map((asm: any) => (
                <div key={asm.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-foreground truncate">{asm.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <Badge variant="outline" className="text-[10px] py-0 px-1 border-border">
                        {asm.domain}
                      </Badge>
                      <span>•</span>
                      <span>{asm.durationMinutes} mins</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs border-border" asChild>
                    <Link to="/student/assessments">Take Test</Link>
                  </Button>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No upcoming assessments scheduled at this time.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
