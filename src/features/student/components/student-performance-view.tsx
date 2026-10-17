import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Award,
  Users,
  Target,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  BarChart3,
  Flame,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StudentPerformanceViewProps {
  data: {
    studentId?: string;
    name?: string;
    collegeCode?: string;
    readinessScore?: number;
    skills?: Record<string, number>;
    coding?: { problemsSolved: number; score: number };
    percentileInBatch?: number;
    rankInDepartment?: number;
    totalInDepartment?: number;
  };
}

export function StudentPerformanceView({ data }: StudentPerformanceViewProps) {
  const [mounted, setMounted] = useState(false);
  const [metricFilter, setMetricFilter] = useState<"all" | "coding" | "aptitude">("all");
  const [sortOrder, setSortOrder] = useState<"score" | "gap" | "name">("score");

  useEffect(() => {
    setMounted(true);
  }, []);

  const readinessScore = data?.readinessScore ?? 82;
  const percentile = data?.percentileInBatch ?? 88;
  const rank = data?.rankInDepartment ?? 4;
  const totalStudents = data?.totalInDepartment ?? 60;

  // 1. Cohort Bell Curve / Distribution Data (60 Students in CSE Department)
  const cohortDistribution = useMemo(() => [
    { score: 35, students: 2, label: "30-40%" },
    { score: 45, students: 5, label: "40-50%" },
    { score: 55, students: 12, label: "50-60%" },
    { score: 62, students: 16, label: "60-65% (Mean)" },
    { score: 70, students: 11, label: "65-75%" },
    { score: 78, students: 7, label: "75-80%" },
    { score: 82, students: 4, label: "80-85% (You: 82%)", isYou: true },
    { score: 90, students: 2, label: "85-95% (Top Tier)" },
    { score: 96, students: 1, label: "95-100%" },
  ], []);

  // 2. 8-Week Multi-metric Trajectory Data
  const weeklyTrajectory = useMemo(() => {
    if (metricFilter === "coding") {
      return [
        { week: "W1", you: 55, batch: 48, top: 72 },
        { week: "W2", you: 60, batch: 50, top: 74 },
        { week: "W3", you: 64, batch: 52, top: 76 },
        { week: "W4", you: 68, batch: 53, top: 78 },
        { week: "W5", you: 71, batch: 55, top: 80 },
        { week: "W6", you: 74, batch: 56, top: 82 },
        { week: "W7", you: 76, batch: 57, top: 84 },
        { week: "W8", you: 78, batch: 58, top: 86 },
      ];
    }
    if (metricFilter === "aptitude") {
      return [
        { week: "W1", you: 65, batch: 58, top: 78 },
        { week: "W2", you: 68, batch: 60, top: 80 },
        { week: "W3", you: 71, batch: 61, top: 82 },
        { week: "W4", you: 73, batch: 62, top: 83 },
        { week: "W5", you: 76, batch: 62, top: 84 },
        { week: "W6", you: 78, batch: 63, top: 85 },
        { week: "W7", you: 79, batch: 64, top: 86 },
        { week: "W8", you: 80, batch: 64, top: 87 },
      ];
    }
    return [
      { week: "W1", you: 62, batch: 54, top: 78 },
      { week: "W2", you: 65, batch: 56, top: 80 },
      { week: "W3", you: 69, batch: 58, top: 81 },
      { week: "W4", you: 71, batch: 60, top: 83 },
      { week: "W5", you: 74, batch: 61, top: 84 },
      { week: "W6", you: 77, batch: 62, top: 85 },
      { week: "W7", you: 80, batch: 63, top: 86 },
      { week: "W8", you: readinessScore, batch: 64, top: 88 },
    ];
  }, [metricFilter, readinessScore]);

  // 3. Domain Comparison Data
  const domainComparison = useMemo(() => {
    const list = [
      { domain: "Technical Core", you: data?.skills?.technical ?? 84, batch: 65, target: 80 },
      { domain: "Coding & DSA", you: data?.coding?.score ?? 78, batch: 58, target: 80 },
      { domain: "Quantitative Aptitude", you: data?.skills?.aptitude ?? 80, batch: 64, target: 75 },
      { domain: "Verbal Communication", you: data?.skills?.verbal ?? 76, batch: 68, target: 75 },
      { domain: "Professional Soft Skills", you: data?.skills?.softSkills ?? 88, batch: 72, target: 80 },
    ];

    if (sortOrder === "score") {
      return [...list].sort((a, b) => b.you - a.you);
    }
    if (sortOrder === "gap") {
      return [...list].sort((a, b) => (b.you - b.batch) - (a.you - a.batch));
    }
    return [...list].sort((a, b) => a.domain.localeCompare(b.domain));
  }, [data, sortOrder]);

  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-lg bg-muted/30" />
        <div className="h-64 rounded-lg bg-muted/20" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Intelligence Badge */}
      <div className="pb-3 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span>Authoritative Performance Analytics</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time Layer C intelligence reporting, cohort percentile ranking, and verified engineering competencies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono bg-primary/10 text-primary border-primary/30">
            Cohort: {data?.collegeCode || "SMP101"} • CSE 2026
          </Badge>
        </div>
      </div>

      {/* 1. Hero KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Readiness Benchmark</span>
            <Target className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1 flex items-baseline gap-1">
            <span>{readinessScore}%</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-sans font-medium">+14% MoM</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Tier 1 Super Dream Qualified
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Batch Percentile</span>
            <Award className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1 flex items-baseline gap-1">
            <span>{percentile}th</span>
            <span className="text-xs text-muted-foreground font-sans font-normal">Percentile</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Ahead of {Math.round((percentile / 100) * totalStudents)} of {totalStudents} cohort peers
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Department Standing</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1 flex items-baseline gap-1">
            <span>#{rank}</span>
            <span className="text-xs text-muted-foreground font-sans font-normal">of {totalStudents}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Top 7% of Academic Division
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Solve Velocity</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1 flex items-baseline gap-1">
            <span>4.2</span>
            <span className="text-xs text-muted-foreground font-sans font-normal">Problems / Wk</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            2.1x Batch Average Pace
          </p>
        </div>
      </div>

      {/* 2. Graphical Cohort Bell Curve / Distribution */}
      <div className="rounded-xl border border-border/70 bg-card/75 p-5 text-card-foreground shadow-xs backdrop-blur-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border/50 gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>Cohort Percentile Distribution Curve (Department Rank #{rank} / {totalStudents})</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Normal distribution curve of composite readiness scores across all {totalStudents} enrolled CSE students.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Mean: 62%</span>
            </span>
            <span className="flex items-center gap-1.5 text-primary font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span>You: 82% (88th %ile)</span>
            </span>
          </div>
        </div>

        <div className="h-[230px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cohortDistribution} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="bellGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
              <XAxis dataKey="score" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(val) => `${val}%`} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                      <p className="font-semibold text-foreground flex items-center justify-between gap-3">
                        <span>Range: {item.label}</span>
                        {item.isYou && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] py-0 px-1 font-mono">
                            YOU
                          </Badge>
                        )}
                      </p>
                      <p className="font-mono text-muted-foreground">
                        Students in bucket: <strong className="text-foreground">{item.students}</strong>
                      </p>
                    </div>
                  );
                }}
              />
              <ReferenceLine x={62} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: "Batch Avg (62%)", position: "top", fill: "#94a3b8", fontSize: 10 }} />
              <ReferenceLine x={80} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Tier 1 Bar (80%)", position: "top", fill: "#10b981", fontSize: 10 }} />
              <ReferenceLine x={82} stroke="var(--primary)" strokeWidth={2} label={{ value: "You (#4)", position: "top", fill: "var(--primary)", fontSize: 11, fontWeight: "bold" }} />
              <Area
                type="monotone"
                dataKey="students"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#bellGradient)"
                name="Student Count"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. 8-Week Score Evolution & Velocity Multi-Line Chart */}
      <div className="rounded-xl border border-border/70 bg-card/75 p-5 text-card-foreground shadow-xs backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border/50 gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>8-Week Learning Velocity & Score Evolution</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Trajectory tracking against batch average and the top 10% academic benchmark.
            </p>
          </div>

          {/* Metric Toggle Filters */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/30 border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setMetricFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium",
                metricFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Overall Composite
            </button>
            <button
              type="button"
              onClick={() => setMetricFilter("coding")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium",
                metricFilter === "coding" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Coding & DSA
            </button>
            <button
              type="button"
              onClick={() => setMetricFilter("aptitude")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium",
                metricFilter === "aptitude" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Aptitude Velocity
            </button>
          </div>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyTrajectory} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
              <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
              <YAxis domain={[40, 100]} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1.5 font-sans">
                      <p className="font-semibold text-foreground">{label} Benchmark</p>
                      <div className="space-y-1 font-mono text-[11px]">
                        {payload.map((p: any) => (
                          <div key={p.dataKey} className="flex items-center justify-between gap-4" style={{ color: p.color }}>
                            <span>{p.name}:</span>
                            <span className="font-bold">{p.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Line
                type="monotone"
                dataKey="top"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="4 4"
                name="Top 10% Benchmark"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="batch"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                name="Batch Average"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="you"
                stroke="var(--primary)"
                strokeWidth={3}
                name="Your Trajectory"
                dot={{ r: 4, fill: "var(--primary)" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Domain Comparative Breakdown Bar Chart */}
      <div className="rounded-xl border border-border/70 bg-card/75 p-5 text-card-foreground shadow-xs backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border/50 gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span>Domain Mastery vs Batch Average</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Head-to-head comparison across core competencies with industry baseline cutoff indicators.
            </p>
          </div>

          {/* Sort Order Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Sort:</span>
            </span>
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border/50">
              <button
                type="button"
                onClick={() => setSortOrder("score")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] transition-colors",
                  sortOrder === "score" ? "bg-background text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                Score
              </button>
              <button
                type="button"
                onClick={() => setSortOrder("gap")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] transition-colors",
                  sortOrder === "gap" ? "bg-background text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                Lead Gap
              </button>
              <button
                type="button"
                onClick={() => setSortOrder("name")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] transition-colors",
                  sortOrder === "name" ? "bg-background text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                Name
              </button>
            </div>
          </div>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={domainComparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
              <XAxis dataKey="domain" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  const lead = item.you - item.batch;
                  return (
                    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1.5 font-sans">
                      <p className="font-semibold text-foreground">{item.domain}</p>
                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex justify-between gap-4 text-primary font-bold">
                          <span>Your Score:</span>
                          <span>{item.you}%</span>
                        </div>
                        <div className="flex justify-between gap-4 text-muted-foreground">
                          <span>Batch Average:</span>
                          <span>{item.batch}%</span>
                        </div>
                        <div className="flex justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                          <span>Target Bar:</span>
                          <span>{item.target}%</span>
                        </div>
                        <div className="pt-1 border-t border-border/50 text-foreground font-sans flex justify-between">
                          <span>Advantage:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">+{lead}% ahead</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Bar dataKey="you" name="Your Score" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="batch" name="Batch Average" fill="#94a3b8" opacity={0.5} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
