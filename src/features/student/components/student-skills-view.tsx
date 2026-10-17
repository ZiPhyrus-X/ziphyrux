import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from "recharts";
import {
  Sparkles,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Code2,
  BookOpen,
  Filter,
  Check,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StudentSkillsViewProps {
  skillsData: any[];
}

export function StudentSkillsView({ skillsData = [] }: StudentSkillsViewProps) {
  const [mounted, setMounted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<"all" | "dsa" | "core" | "aptitude" | "soft">("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Radar 360 Competency Data
  const radarData = useMemo(() => [
    { domain: "Technical Core", score: 84, benchmark: 75, target: 80 },
    { domain: "Coding & DSA", score: 78, benchmark: 60, target: 80 },
    { domain: "Quantitative Aptitude", score: 80, benchmark: 64, target: 75 },
    { domain: "Logical Reasoning", score: 82, benchmark: 66, target: 75 },
    { domain: "Verbal Comms", score: 76, benchmark: 68, target: 75 },
    { domain: "Soft Skills", score: 88, benchmark: 72, target: 80 },
  ], []);

  // 2. Skill Gap Data (Relative to Tier 1 Bar)
  const gapData = useMemo(() => [
    { name: "Technical Core", gap: 4, score: 84, bar: 80, status: "Surplus" },
    { name: "Soft Skills", gap: 8, score: 88, bar: 80, status: "Surplus" },
    { name: "Quant Aptitude", gap: 5, score: 80, bar: 75, status: "Surplus" },
    { name: "Logical Reasoning", gap: 7, score: 82, bar: 75, status: "Surplus" },
    { name: "Coding & DSA", gap: -2, score: 78, bar: 80, status: "Deficit" },
    { name: "Verbal Comms", gap: 1, score: 76, bar: 75, status: "Surplus" },
  ], []);

  // 3. Sub-Topic Detailed Matrix
  const subtopics = useMemo(() => [
    {
      id: "sub-1",
      category: "dsa",
      name: "Dynamic Programming & Memoization",
      mastery: "Proficient",
      score: 74,
      solvedCount: 3,
      totalCount: 5,
      recommendation: "Solve 2 Medium problems on 1D/2D grid memoization",
      actionLink: "/student/judge",
      actionText: "Practice in Judge",
    },
    {
      id: "sub-2",
      category: "dsa",
      name: "Binary Trees & Graph Traversals",
      mastery: "Developing",
      score: 68,
      solvedCount: 2,
      totalCount: 6,
      recommendation: "Review BFS / DFS shortest path patterns",
      actionLink: "/student/judge",
      actionText: "Practice in Judge",
    },
    {
      id: "sub-3",
      category: "dsa",
      name: "Two Pointers & Sliding Window",
      mastery: "Mastered",
      score: 92,
      solvedCount: 5,
      totalCount: 5,
      recommendation: "Optimal O(N) patterns mastered",
      actionLink: "/student/judge",
      actionText: "Review Solutions",
    },
    {
      id: "sub-4",
      category: "core",
      name: "Relational Databases & SQL Optimization",
      mastery: "Mastered",
      score: 88,
      solvedCount: 4,
      totalCount: 4,
      recommendation: "Indexes, transactions, and ACID properties verified",
      actionLink: "/student/learning",
      actionText: "View Course",
    },
    {
      id: "sub-5",
      category: "core",
      name: "Operating Systems & Concurrency",
      mastery: "Proficient",
      score: 80,
      solvedCount: 3,
      totalCount: 4,
      recommendation: "Deadlocks and thread synchronization review",
      actionLink: "/student/learning",
      actionText: "Study Lesson",
    },
    {
      id: "sub-6",
      category: "aptitude",
      name: "Quantitative Math & Probability",
      mastery: "Proficient",
      score: 82,
      solvedCount: 8,
      totalCount: 10,
      recommendation: "Bayes theorem and permutation accuracy high",
      actionLink: "/student/assessments",
      actionText: "Take Practice Test",
    },
    {
      id: "sub-7",
      category: "soft",
      name: "Behavioral & STAR Interview Framing",
      mastery: "Mastered",
      score: 90,
      solvedCount: 4,
      totalCount: 4,
      recommendation: "Strong leadership story formulation",
      actionLink: "/student/learning",
      actionText: "Review Framework",
    },
  ], []);

  const filteredTopics = useMemo(() => {
    if (categoryFilter === "all") return subtopics;
    return subtopics.filter((t) => t.category === categoryFilter);
  }, [categoryFilter, subtopics]);

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
      {/* Page Title & Intelligence Summary */}
      <div className="pb-3 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>360-Degree Skill Intelligence & Gap Analytics</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Holistic capability evaluation benchmarking Technical Core, Coding & Algorithms, Quantitative Aptitude, and Verbal Communication.
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
          Tier 1 Employability Index: 81.2%
        </Badge>
      </div>

      {/* 1. Skill KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Overall Skill Index</span>
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1">81.2%</div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            +1.2% over Tier 1 Bar (80%)
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Core Strengths</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1">5 / 6</div>
          <p className="text-[11px] text-muted-foreground">
            Domains Exceeding Industry Baseline
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Primary Focus Area</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-foreground mt-1.5 truncate">Coding & DSA</div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            Deficit: -2% to Super Dream Bar
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Growth Velocity</span>
            <ArrowUpRight className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1">+8.4%</div>
          <p className="text-[11px] text-muted-foreground">
            Acceleration in past 30 days
          </p>
        </div>
      </div>

      {/* 2. Visual Radar Chart & Hiring Bar Gap Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: 360-Degree Radar Chart */}
        <div className="lg:col-span-7 rounded-xl border border-border/70 bg-card/75 p-5 text-card-foreground shadow-xs backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>360° Engineering Capability Radar</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Multi-axis benchmark comparing your verified scores with Tier 1 industry cutoffs.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-primary font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span>You</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Industry Bar</span>
              </span>
            </div>
          </div>

          <div className="h-[280px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius={95}>
                <PolarGrid stroke="var(--border)" opacity={0.6} />
                <PolarAngleAxis dataKey="domain" stroke="var(--muted-foreground)" fontSize={11} />
                <PolarRadiusAxis domain={[0, 100]} stroke="var(--border)" opacity={0.4} />
                <Radar
                  name="Verified Competency"
                  dataKey="score"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.4}
                />
                <Radar
                  name="Tier-1 Industry Target"
                  dataKey="target"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="transparent"
                />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const diff = d.score - d.target;
                    return (
                      <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1 font-sans">
                        <p className="font-bold text-foreground">{d.domain}</p>
                        <div className="font-mono text-[11px] space-y-0.5">
                          <p className="text-primary font-semibold">Your Score: {d.score}%</p>
                          <p className="text-emerald-600 dark:text-emerald-400">Target Bar: {d.target}%</p>
                          <p className={cn("pt-1 border-t border-border/50 font-sans font-semibold", diff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                            {diff >= 0 ? `+${diff}% Surplus (Qualified)` : `${diff}% Deficit (Focus)`}
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Gap Analysis Bar Chart */}
        <div className="lg:col-span-5 rounded-xl border border-border/70 bg-card/75 p-5 text-card-foreground shadow-xs backdrop-blur-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="pb-2 border-b border-border/50">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                <span>Tier 1 Cutoff Gap Breakdown</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Relative surplus or deficit against the 80% product recruitment benchmark.
              </p>
            </div>

            <div className="h-[210px] w-full pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gapData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis type="number" domain={[-10, 15]} stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`} />
                  <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} width={85} />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-card/95 p-2 text-xs shadow-md font-sans">
                          <p className="font-bold text-foreground">{d.name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            Score: {d.score}% • Bar: {d.bar}%
                          </p>
                          <p className={cn("font-bold font-mono text-[11px]", d.gap >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                            {d.gap >= 0 ? `+${d.gap}% Surplus` : `${d.gap}% Deficit`}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="gap" radius={[0, 4, 4, 0]}>
                    {gapData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.gap >= 0 ? "#10b981" : "#f59e0b"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
            <strong>Key Takeaway:</strong> Solve 4 more Medium/Hard Dynamic Programming & Graph problems to eliminate the -2% Coding deficit.
          </div>
        </div>
      </div>

      {/* 3. Interactive Sub-Topic Competency Matrix */}
      <div className="rounded-xl border border-border/70 bg-card/75 p-5 text-card-foreground shadow-xs backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/50 gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              <span>Sub-Topic Mastery Matrix & Actionable Practice</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Granular topic-level mastery ratings with direct links to coding judge practice and curriculum lessons.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/30 border border-border/50 text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap",
                categoryFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Topics ({subtopics.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("dsa")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap",
                categoryFilter === "dsa" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              DSA & Algorithms
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("core")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap",
                categoryFilter === "core" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Core CS
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("aptitude")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap",
                categoryFilter === "aptitude" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Aptitude
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("soft")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap",
                categoryFilter === "soft" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Soft Skills
            </button>
          </div>
        </div>

        {/* Topic Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredTopics.map((topic) => {
            const isMastered = topic.mastery === "Mastered";
            const isProficient = topic.mastery === "Proficient";
            return (
              <div
                key={topic.id}
                className="p-4 rounded-lg border border-border/60 bg-muted/15 hover:bg-muted/25 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-sm leading-tight">{topic.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-mono px-1.5 py-0",
                        isMastered
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : isProficient
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      )}
                    >
                      {topic.mastery}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted-foreground">Proficiency Score:</span>
                    <span className="font-mono font-bold text-foreground">{topic.score}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isMastered ? "bg-emerald-500" : isProficient ? "bg-blue-500" : "bg-amber-500"
                      )}
                      style={{ width: `${topic.score}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 pt-1">
                    {topic.recommendation}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {topic.solvedCount}/{topic.totalCount} completed
                  </span>

                  <Button size="sm" variant="outline" className="h-7 text-xs border-border/80 gap-1" asChild>
                    <Link to={topic.actionLink}>
                      <span>{topic.actionText}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
