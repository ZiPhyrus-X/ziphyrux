import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  TrendingUp,
  Target,
  Building2,
  Sliders,
  ShieldCheck,
  Zap,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface StudentPlacementReadinessViewProps {
  data: {
    readinessScore?: number;
    tier?: string;
    strengths?: string[];
    improvementAreas?: string[];
    recommendedAction?: string;
  };
}

export function StudentPlacementReadinessView({ data }: StudentPlacementReadinessViewProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTier, setActiveTier] = useState<"tier1" | "tier2" | "tier3">("tier1");
  const [simulatedDsaBoost, setSimulatedDsaBoost] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const baseScore = data?.readinessScore ?? 82;
  const currentDsa = 78 + simulatedDsaBoost;
  const currentScore = Math.min(100, Math.round(baseScore + simulatedDsaBoost * 0.4));

  // 1. Semi-Circle Gauge Data
  const gaugeData = useMemo(() => [
    { name: "Score", value: currentScore, color: "#10b981" },
    { name: "Remaining", value: 100 - currentScore, color: "var(--muted)" },
  ], [currentScore]);

  // 2. Recruitment Funnel Probability Data
  const funnelData = useMemo(() => [
    { round: "1. Resume / ATS", passRate: 95, benchmark: 75, color: "#10b981" },
    { round: "2. Online Coding (OA)", passRate: Math.min(99, 86 + simulatedDsaBoost), benchmark: 65, color: "#3b82f6" },
    { round: "3. Tech Interview 1 (DSA)", passRate: Math.min(99, 82 + simulatedDsaBoost), benchmark: 60, color: "#8b5cf6" },
    { round: "4. Tech Interview 2 (System)", passRate: 78, benchmark: 55, color: "#f59e0b" },
    { round: "5. HR & Culture Fit", passRate: 92, benchmark: 70, color: "#10b981" },
  ], [simulatedDsaBoost]);

  // 3. Company Tier Definitions
  const tiers = useMemo(() => [
    {
      id: "tier1" as const,
      label: "Tier 1: Product & Tech Giants",
      packageRange: "₹14.0 — ₹26.0+ LPA",
      companies: ["Google", "Microsoft", "Amazon", "Atlassian", "Uber", "Adobe"],
      criteria: [
        { name: "DSA & Problem Solving", required: "80%", current: `${currentDsa}%`, met: currentDsa >= 80 },
        { name: "Technical Core (OS, DBMS)", required: "75%", current: "84%", met: true },
        { name: "Aptitude & Logical", required: "70%", current: "80%", met: true },
        { name: "Verbal & Communication", required: "70%", current: "76%", met: true },
      ],
      matchScore: currentDsa >= 80 ? 98 : 92,
      status: currentDsa >= 80 ? "Fully Qualified" : "In Immediate Reach (-2% DSA)",
    },
    {
      id: "tier2" as const,
      label: "Tier 2: High-Growth Fintech & Unicorns",
      packageRange: "₹8.5 — ₹16.0 LPA",
      companies: ["Razorpay", "PhonePe", "Cisco", "Oracle", "Zeta", "Groww"],
      criteria: [
        { name: "DSA & Problem Solving", required: "70%", current: `${currentDsa}%`, met: true },
        { name: "Technical Core", required: "70%", current: "84%", met: true },
        { name: "Aptitude & Logical", required: "65%", current: "80%", met: true },
        { name: "Verbal & Communication", required: "65%", current: "76%", met: true },
      ],
      matchScore: 99,
      status: "Highly Qualified & Cleared",
    },
    {
      id: "tier3" as const,
      label: "Tier 3: IT Services & Digital Consulting",
      packageRange: "₹4.5 — ₹8.0 LPA",
      companies: ["TCS Digital", "Cognizant", "Infosys DSE", "Accenture", "Wipro"],
      criteria: [
        { name: "Overall Composite", required: "60%", current: `${currentScore}%`, met: true },
        { name: "Aptitude & Logic", required: "60%", current: "80%", met: true },
        { name: "Basic Coding", required: "50%", current: `${currentDsa}%`, met: true },
      ],
      matchScore: 100,
      status: "Guaranteed Clearance",
    },
  ], [currentDsa, currentScore]);

  const activeTierDetails = tiers.find((t) => t.id === activeTier) || tiers[0];

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
      {/* Page Header */}
      <div className="pb-3 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <span>Placement Readiness Intelligence & Corporate Fit</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Authoritative employability qualification benchmarks, hiring round clearance odds, and recruiter tier simulator.
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
          Super Dream Qualified • Tier 1
        </Badge>
      </div>

      {/* 1. Hero Readiness Gauge & Compensation Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Semi-Circle Gauge Card */}
        <div className="lg:col-span-5 rounded-xl border border-border/70 bg-card/75 p-5 text-card-foreground shadow-xs backdrop-blur-xl flex flex-col items-center justify-between space-y-2">
          <div className="w-full flex items-center justify-between pb-1 border-b border-border/40 text-xs">
            <span className="font-semibold text-foreground">Composite Readiness Score</span>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
              Top 10% Academic
            </Badge>
          </div>

          {/* Semi Circle Gauge */}
          <div className="relative h-[150px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="90%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={70}
                  outerRadius={95}
                  dataKey="value"
                  stroke="transparent"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="var(--border)" opacity={0.5} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-2 inset-x-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-extrabold font-mono text-foreground leading-none">{currentScore}%</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">Tier 1 Qualified</span>
            </div>
          </div>

          <div className="w-full pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2 rounded bg-muted/20 border border-border/40">
              <span className="text-[11px] text-muted-foreground block">Projected CTC</span>
              <strong className="text-foreground font-mono text-sm">₹12 — ₹18.5 LPA</strong>
            </div>
            <div className="p-2 rounded bg-muted/20 border border-border/40">
              <span className="text-[11px] text-muted-foreground block">Verified Evidence</span>
              <strong className="text-foreground font-mono text-sm">18 Commits / Synced</strong>
            </div>
          </div>
        </div>

        {/* Right: Round-by-Round Clearance Odds Chart */}
        <div className="lg:col-span-7 rounded-xl border border-border/70 bg-card/75 p-5 text-card-foreground shadow-xs backdrop-blur-xl space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span>Recruitment Funnel Clearance Probability</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Predictive clearance probability per interview stage based on your verified performance data.
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">Campus Median: 62%</span>
          </div>

          <div className="h-[170px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="round" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} width={130} />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border bg-card/95 p-2 text-xs shadow-md font-sans">
                        <p className="font-bold text-foreground">{d.round}</p>
                        <p className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[11px]">
                          Your Odds: {d.passRate}%
                        </p>
                        <p className="text-muted-foreground font-mono text-[11px]">
                          Campus Average: {d.benchmark}%
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="passRate" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
            <span>Critical Stage: <strong>Technical Interview 2 (System Design)</strong></span>
            <span className="text-primary font-medium">Clearance Odds: 78%</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Recruiter Tier Eligibility Simulator */}
      <div className="rounded-xl border border-border/70 bg-card/75 p-5 text-card-foreground shadow-xs backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/50 gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Recruiter Tier Eligibility Simulator</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instant match calculation against actual criteria enforced by premier tech recruiters.
            </p>
          </div>

          {/* Tier Switcher Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/30 border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setActiveTier("tier1")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium",
                activeTier === "tier1" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tier 1 (Product 14-25+ LPA)
            </button>
            <button
              type="button"
              onClick={() => setActiveTier("tier2")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium",
                activeTier === "tier2" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tier 2 (Fintech 8-16 LPA)
            </button>
            <button
              type="button"
              onClick={() => setActiveTier("tier3")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium",
                activeTier === "tier3" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tier 3 (IT Services 4.5-8 LPA)
            </button>
          </div>
        </div>

        {/* Selected Tier Intelligence Card */}
        <div className="p-4 rounded-lg bg-muted/15 border border-border/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono text-muted-foreground">{activeTierDetails.packageRange}</span>
              <h4 className="text-base font-bold text-foreground">{activeTierDetails.label}</h4>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {activeTierDetails.companies.map((co) => (
                  <Badge key={co} variant="outline" className="text-[11px] font-mono border-border/60 bg-background/60">
                    {co}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="text-right sm:self-center">
              <span className="text-xs text-muted-foreground block">Recruitment Match</span>
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {activeTierDetails.matchScore}%
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "block text-[10px] mt-0.5",
                  activeTierDetails.matchScore >= 95
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                )}
              >
                {activeTierDetails.status}
              </Badge>
            </div>
          </div>

          {/* Criteria Check Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-border/40 text-xs">
            {activeTierDetails.criteria.map((cr) => (
              <div
                key={cr.name}
                className={cn(
                  "p-2.5 rounded border flex items-center justify-between",
                  cr.met
                    ? "bg-emerald-500/5 border-emerald-500/25 text-foreground"
                    : "bg-amber-500/5 border-amber-500/25 text-foreground"
                )}
              >
                <div>
                  <span className="font-semibold block">{cr.name}</span>
                  <span className="text-[11px] text-muted-foreground">Req: {cr.required} • You: {cr.current}</span>
                </div>
                {cr.met ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 py-0 px-1 font-mono">
                    Focus
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Interactive Simulation Slider */}
          <div className="p-3 rounded-lg bg-background/80 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                <span>Simulate DSA & Coding Practice Effect:</span>
              </span>
              <span className="font-mono text-primary font-bold">
                {simulatedDsaBoost === 0 ? "Current Baseline (78% DSA)" : `+${simulatedDsaBoost}% Boost (${currentDsa}% DSA)`}
              </span>
            </div>

            <Slider
              value={[simulatedDsaBoost]}
              onValueChange={(vals) => setSimulatedDsaBoost(vals[0])}
              min={0}
              max={15}
              step={1}
              className="py-1"
            />

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>0 (Baseline: 12 Solved)</span>
              <span>Solve +3 Med Problems (+5%)</span>
              <span>Solve +6 Hard Problems (+10%)</span>
              <span>Solve +10 Problems (+15%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Strengths & Immediate Action Roadmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Verified Strengths */}
        <div className="rounded-xl border border-border/70 bg-card/75 p-5 text-card-foreground shadow-xs backdrop-blur-xl space-y-3">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Verified Employability Strengths</span>
          </h4>
          <ul className="space-y-2 text-xs">
            {(data?.strengths || ["Data Structures & Algorithms", "Core Computer Science", "Verbal Communication"]).map((s, idx) => (
              <li key={idx} className="p-2.5 rounded bg-muted/20 border border-border/40 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-foreground font-medium">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Prioritized Remediation Roadmap */}
        <div className="rounded-xl border border-border/70 bg-card/75 p-5 text-card-foreground shadow-xs backdrop-blur-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Prioritized Remediation Roadmap</span>
            </h4>
            <div className="p-3 rounded bg-muted/20 border border-border/40 text-xs text-foreground space-y-1.5">
              <p className="font-semibold text-primary">Target: Bridge -2% Coding Gap to Unlock 100% Tier 1 Match</p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {data?.recommendedAction || "Complete the 5 assigned Graph practice problems and mock assessment to qualify for upcoming Super Dream placement drives."}
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-medium" asChild>
              <Link to="/student/judge">
                <span>Go to Coding Judge</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs border-border" asChild>
              <Link to="/student/assessments">
                <span>View Mock Drives</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
