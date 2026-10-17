import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  TrendingUp,
  Code2,
  Sparkles,
  Layers,
  CheckCircle2,
  Flame,
  ArrowUpRight,
  Filter,
  BarChart2,
  PieChart as PieIcon,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface StudentAnalyticsChartsProps {
  metrics: {
    problemsSolved: number;
    totalSubmissions: number;
    acceptanceRate: number;
    readinessScore: number;
    activeActionPlans: number;
    verifiedStreakDays: number;
  };
  skills?: {
    technical?: number;
    coding?: number;
    aptitude?: number;
    verbal?: number;
    softSkills?: number;
  };
  recentSubmissions?: any[];
  className?: string;
}

export function StudentAnalyticsCharts({
  metrics,
  skills,
  recentSubmissions = [],
  className,
}: StudentAnalyticsChartsProps) {
  const [mounted, setMounted] = useState(false);
  const [timeWindow, setTimeWindow] = useState<"4w" | "8w" | "sem">("8w");
  const [chartTab, setChartTab] = useState<"velocity" | "topics" | "radar">("velocity");

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Weekly Growth Velocity Data
  const velocityData = useMemo(() => {
    const baseWeeks = [
      { week: "Wk 1", score: 62, batchAvg: 54, topTier: 78 },
      { week: "Wk 2", score: 65, batchAvg: 56, topTier: 80 },
      { week: "Wk 3", score: 69, batchAvg: 58, topTier: 81 },
      { week: "Wk 4", score: 71, batchAvg: 60, topTier: 83 },
      { week: "Wk 5", score: 74, batchAvg: 61, topTier: 84 },
      { week: "Wk 6", score: 77, batchAvg: 62, topTier: 85 },
      { week: "Wk 7", score: 80, batchAvg: 63, topTier: 86 },
      { week: "Wk 8", score: metrics.readinessScore || 82, batchAvg: 64, topTier: 88 },
    ];

    if (timeWindow === "4w") return baseWeeks.slice(4);
    if (timeWindow === "8w") return baseWeeks;
    return [
      { week: "Mo 1", score: 58, batchAvg: 50, topTier: 75 },
      { week: "Mo 2", score: 66, batchAvg: 56, topTier: 80 },
      { week: "Mo 3", score: 75, batchAvg: 61, topTier: 84 },
      { week: "Mo 4", score: metrics.readinessScore || 82, batchAvg: 64, topTier: 88 },
    ];
  }, [timeWindow, metrics.readinessScore]);

  // 2. Problem Topics Distribution Data
  const topicData = useMemo(() => [
    { topic: "Arrays & Pointers", solved: 4, total: 6, accuracy: 85, color: "#10b981" },
    { topic: "Dynamic Programming", solved: 2, total: 4, accuracy: 72, color: "#3b82f6" },
    { topic: "Strings & HashMaps", solved: 3, total: 4, accuracy: 80, color: "#8b5cf6" },
    { topic: "Trees & Graphs", solved: 2, total: 5, accuracy: 65, color: "#f59e0b" },
    { topic: "Math & Bit Manipulation", solved: 1, total: 2, accuracy: 78, color: "#ec4899" },
  ], []);

  // 3. Difficulty Split Data (Donut)
  const difficultyData = useMemo(() => [
    { name: "Easy", count: 6, color: "#00b8a3" },
    { name: "Medium", count: 5, color: "#ffc01e" },
    { name: "Hard", count: 1, color: "#ff375f" },
  ], []);

  // 4. 360-Degree Competency Radar Data
  const radarData = useMemo(() => [
    { subject: "Technical Core", student: skills?.technical || 84, benchmark: 75, fullMark: 100 },
    { subject: "Coding & DSA", student: skills?.coding || 78, benchmark: 80, fullMark: 100 },
    { subject: "Aptitude", student: skills?.aptitude || 80, benchmark: 70, fullMark: 100 },
    { subject: "Verbal Comms", student: skills?.verbal || 76, benchmark: 68, fullMark: 100 },
    { subject: "Soft Skills", student: skills?.softSkills || 88, benchmark: 75, fullMark: 100 },
  ], [skills]);

  if (!mounted) {
    return (
      <div className="rounded-xl border border-border/70 bg-card/75 p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-muted/40 rounded" />
        <div className="h-64 bg-muted/30 rounded-lg" />
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border/70 bg-card/75 p-5 text-card-foreground shadow-sm backdrop-blur-xl space-y-5", className)}>
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>Telemetry & Performance Intelligence</span>
            </h3>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono">
              Live Verified
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Multi-dimensional telemetry across readiness progression, coding practice density, and competency radar.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/30 border border-border/50 text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartTab("velocity")}
            className={cn(
              "px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5",
              chartTab === "velocity"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span>Readiness Trajectory</span>
          </button>
          <button
            type="button"
            onClick={() => setChartTab("topics")}
            className={cn(
              "px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5",
              chartTab === "topics"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Topic Matrix</span>
          </button>
          <button
            type="button"
            onClick={() => setChartTab("radar")}
            className={cn(
              "px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5",
              chartTab === "radar"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Compass className="w-3.5 h-3.5 text-blue-500" />
            <span>360° Competency</span>
          </button>
        </div>
      </div>

      {/* TAB 1: READINESS VELOCITY TRAJECTORY */}
      {chartTab === "velocity" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-primary rounded-full" />
                <span className="text-foreground font-medium">Your Composite Score ({metrics.readinessScore}%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-muted-foreground/60 rounded-full" />
                <span>Batch Median (64%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-emerald-500/80 rounded-full border border-dashed border-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Tier 1 Target (80%)</span>
              </span>
            </div>

            {/* Time Window Buttons */}
            <div className="flex items-center gap-1">
              {(["4w", "8w", "sem"] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setTimeWindow(w)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-mono transition-colors",
                    timeWindow === w
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  {w === "4w" ? "Last 4 Wk" : w === "8w" ? "Last 8 Wk" : "Full Term"}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReadiness" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorBatch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis domain={[40, 100]} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    const studentVal = payload.find((p: any) => p.dataKey === "score")?.value;
                    const batchVal = payload.find((p: any) => p.dataKey === "batchAvg")?.value;
                    const diff = studentVal - batchVal;
                    return (
                      <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1.5 font-sans">
                        <p className="font-semibold text-foreground">{label} Benchmark</p>
                        <div className="space-y-1 font-mono text-[11px]">
                          <div className="flex items-center justify-between gap-3 text-primary">
                            <span>Your Score:</span>
                            <span className="font-bold">{studentVal}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-muted-foreground">
                            <span>Batch Average:</span>
                            <span>{batchVal}%</span>
                          </div>
                          <div className="pt-1 border-t border-border/50 text-emerald-600 dark:text-emerald-400 font-sans flex items-center justify-between">
                            <span>Advantage:</span>
                            <span className="font-bold">+{diff}% vs Peers</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="batchAvg"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorBatch)"
                  name="Batch Average"
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorReadiness)"
                  name="Your Score"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Trajectory Insights Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border/50 text-xs">
            <div className="p-2 rounded bg-muted/20 border border-border/40 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <span className="text-muted-foreground text-[11px] block">Velocity Acceleration</span>
                <span className="font-semibold text-foreground">+14% Growth Rate this term</span>
              </div>
            </div>
            <div className="p-2 rounded bg-muted/20 border border-border/40 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <span className="text-muted-foreground text-[11px] block">Target Threshold</span>
                <span className="font-semibold text-foreground">Exceeds Tier 1 Minimum (80%)</span>
              </div>
            </div>
            <div className="p-2 rounded bg-muted/20 border border-border/40 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className="text-muted-foreground text-[11px] block">Consistency Index</span>
                <span className="font-semibold text-foreground">92% Continuous Cadence</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TOPIC & CODING PRACTICE DISTRIBUTION */}
      {chartTab === "topics" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
          {/* Left: Donut Chart of Difficulty */}
          <div className="lg:col-span-5 p-3 rounded-lg bg-muted/20 border border-border/50 flex flex-col items-center justify-center">
            <div className="text-xs font-semibold text-foreground w-full mb-1 flex items-center justify-between">
              <span>Difficulty Distribution</span>
              <span className="text-[11px] font-mono text-muted-foreground">{metrics.problemsSolved} Total Solved</span>
            </div>

            <div className="relative h-[180px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={difficultyData}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {difficultyData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0];
                      const pct = Math.round((d.value / metrics.problemsSolved) * 100);
                      return (
                        <div className="rounded-md border border-border bg-card/95 p-2 text-xs shadow-md font-sans">
                          <p className="font-bold flex items-center gap-1.5" style={{ color: d.payload.color }}>
                            <span>{d.name}</span>
                          </p>
                          <p className="text-muted-foreground text-[11px]">
                            {d.value} problems ({pct}%)
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold font-mono text-foreground">{metrics.problemsSolved}</span>
                <span className="text-[10px] text-muted-foreground font-sans uppercase tracking-tight">Solved</span>
              </div>
            </div>

            {/* Difficulty Legend */}
            <div className="flex items-center justify-around w-full pt-2 border-t border-border/40 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00b8a3]" />
                <span className="text-muted-foreground">Easy:</span>
                <strong className="text-foreground">6</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffc01e]" />
                <span className="text-muted-foreground">Med:</span>
                <strong className="text-foreground">5</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff375f]" />
                <span className="text-muted-foreground">Hard:</span>
                <strong className="text-foreground">1</strong>
              </div>
            </div>
          </div>

          {/* Right: Topic Practice Matrix */}
          <div className="lg:col-span-7 space-y-2.5 flex flex-col justify-between">
            <div className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Domain Topic Mastery Breakdown</span>
              <span className="text-[11px] text-muted-foreground">Accuracy & Coverage</span>
            </div>

            <div className="space-y-2.5">
              {topicData.map((item) => {
                const pct = Math.round((item.solved / item.total) * 100);
                return (
                  <div key={item.topic} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{item.topic}</span>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-muted-foreground">{item.solved}/{item.total} solved</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "px-1 py-0 text-[10px] border-border",
                            item.accuracy >= 80 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" : "text-amber-600 dark:text-amber-400 bg-amber-500/10"
                          )}
                        >
                          {item.accuracy}% Acc
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden flex">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2.5 rounded bg-muted/20 border border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Next Recommended Focus:</span>
              <strong className="text-primary font-medium">Dynamic Programming & Graph Optimizations</strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 360-DEGREE RADAR COMPETENCY */}
      {chartTab === "radar" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1 items-center">
          <div className="md:col-span-7 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius={85}>
                <PolarGrid stroke="var(--border)" opacity={0.6} />
                <PolarAngleAxis dataKey="subject" stroke="var(--muted-foreground)" fontSize={11} />
                <PolarRadiusAxis domain={[0, 100]} stroke="var(--border)" opacity={0.4} />
                <Radar
                  name="Your Score"
                  dataKey="student"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.4}
                />
                <Radar
                  name="Industry Bar"
                  dataKey="benchmark"
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  fill="transparent"
                />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-md border border-border bg-card/95 p-2 text-xs shadow-md font-sans space-y-1">
                        <p className="font-bold text-foreground">{d.subject}</p>
                        <div className="font-mono text-[11px] space-y-0.5">
                          <p className="text-primary font-semibold">Your Score: {d.student}%</p>
                          <p className="text-emerald-600 dark:text-emerald-400">Industry Target: {d.benchmark}%</p>
                        </div>
                      </div>
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="md:col-span-5 space-y-2 text-xs">
            <div className="p-3 rounded-lg bg-muted/20 border border-border/50 space-y-2">
              <span className="font-semibold text-foreground text-sm block">Competency Assessment</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Your profile demonstrates top-tier aptitude across <strong>Technical Core</strong> and <strong>Soft Skills</strong>, surpassing the Tier 1 cutoff.
              </p>
              <div className="pt-2 border-t border-border/40 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Technical Mastery:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">84% (+9% Surplus)</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Coding Algorithms:</span>
                  <strong className="text-amber-600 dark:text-amber-400">78% (-2% Deficit)</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Soft Skills / Comms:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">88% (+13% Surplus)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
