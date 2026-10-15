import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PlacementPageHeader,
  PlacementMetric,
  PlacementPanel,
  PlacementLoadingSkeleton,
  PlacementEmptyState,
} from "@/features/placement/page";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/placement/")({
  head: () => ({
    meta: [
      { title: "Placement Operations Dashboard — Ziphyrus X" },
      { name: "description", content: "Campus hiring telemetry, drive schedule, and offer verification" },
    ],
  }),
  component: PlacementDashboardPage,
});

function PlacementDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["placement", "dashboard"],
    queryFn: async () => {
      const res = await api.placement.dashboard();
      return (res?.data || res) as any;
    },
    staleTime: 30000,
  });

  if (isLoading) return <PlacementLoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PlacementPageHeader
          title="Placement Operations Dashboard"
          desc="Live campus hiring operations, verified placement rates, and recruitment funnel"
        />
        <PlacementEmptyState
          title="Failed to Load Placement Telemetry"
          description={(error as Error)?.message || "Ensure your session has verified college-scoped access."}
          icon={AlertTriangle}
        />
        <Button onClick={() => refetch()} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  const { kpis, upcomingDrives, activeSelectionPipelines, companyActivity, placementReadinessDistribution, applicationFunnel, recentOperationalAlerts } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PlacementPageHeader
        title="Placement Operations Dashboard"
        desc={`Campus recruitment command center for ${data.college?.name || data.college?.code || "your institution"}. Real-time tracking of drives, opportunities, verified offers, and readiness.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline" className="border-border/70 bg-card/60 gap-1.5 shadow-sm">
              <Link to="/placement/m/$module" params={{ module: "offers" }}>
                <Award className="h-4 w-4 text-emerald-500" />
                <span>Verify Offers</span>
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-border/70 bg-card/60 gap-1.5 shadow-sm">
              <Link to="/placement/opportunities">
                <Briefcase className="h-4 w-4 text-primary" />
                <span>Post Opportunity</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5 shadow-sm">
              <Link to="/placement/drives">
                <Calendar className="h-4 w-4" />
                <span>Manage Drives</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* 10 Placement Operational KPIs */}
      <section aria-label="Placement Operational Metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <PlacementMetric
          label="Distinct Placed Students"
          value={kpis?.distinctPlacedStudents ?? 0}
          note={`${kpis?.placementPercentage ?? 0}% verified placement rate`}
          icon={UserCheck}
          variant="success"
        />
        <PlacementMetric
          label="Total Offers Received"
          value={kpis?.offersReceived ?? 0}
          note={`${kpis?.offersAccepted ?? 0} accepted by students`}
          icon={Award}
          variant="primary"
        />
        <PlacementMetric
          label="Confirmed Joining"
          value={kpis?.confirmedJoiningOutcomes ?? 0}
          note="Verified campus onboarding"
          icon={CheckCircle2}
          variant="default"
        />
        <PlacementMetric
          label="Placement Ready Pool"
          value={kpis?.placementReadyStudents ?? 0}
          note="Readiness score ≥ 75%"
          icon={Sparkles}
          variant="info"
        />
        <PlacementMetric
          label="Eligible Students"
          value={kpis?.totalEligibleStudents ?? 0}
          note="CGPA ≥ 6.0 with criteria match"
          icon={Users}
          variant="default"
        />
        <PlacementMetric
          label="Active Drives"
          value={kpis?.activePlacementDrives ?? 0}
          note="Currently conducting rounds"
          icon={Calendar}
          variant="primary"
        />
        <PlacementMetric
          label="Upcoming Drives"
          value={kpis?.upcomingDrives ?? 0}
          note="Scheduled for this month"
          icon={Clock}
          variant="default"
        />
        <PlacementMetric
          label="Open Opportunities"
          value={kpis?.openOpportunities ?? 0}
          note="Active student application links"
          icon={Briefcase}
          variant="default"
        />
        <PlacementMetric
          label="Applications Tracked"
          value={kpis?.applicationsSubmitted ?? 0}
          note={`${kpis?.studentsShortlisted ?? 0} shortlisted`}
          icon={FileText}
          variant="default"
        />
        <PlacementMetric
          label="Pending Offer Review"
          value={(kpis?.offersReceived ?? 0) - (kpis?.confirmedJoiningOutcomes ?? 0)}
          note="Verification & joining queue"
          icon={FileCheck}
          variant="warning"
        />
      </section>

      {/* Operational Alerts banner */}
      {recentOperationalAlerts && recentOperationalAlerts.length > 0 && (
        <section aria-label="Operational Notifications" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-2 text-amber-600 font-semibold text-xs tracking-wider uppercase">
            <AlertTriangle className="h-4 w-4" /> Operational Focus Items
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentOperationalAlerts.map((alt: any) => (
              <div key={alt.id} className="rounded-lg bg-card/60 border border-border/60 p-3 text-xs flex items-start gap-2.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">{alt.title}</p>
                  <p className="text-muted-foreground mt-0.5">{alt.message}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2-Column Core Operations Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Panel 1: Upcoming Placement Drives */}
        <PlacementPanel
          title="Upcoming Placement Drives"
          subtitle="Scheduled on-campus and virtual hiring assessments"
          action={
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1">
              <Link to="/placement/drives">
                View all drives <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          }
        >
          {upcomingDrives && upcomingDrives.length > 0 ? (
            <div className="space-y-3">
              {upcomingDrives.map((d: any) => (
                <div
                  key={d.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border/60 bg-card/50 hover:bg-card/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{d.companyName}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {d.driveType?.replace("_", " ")}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-primary/10 text-primary border-primary/20"
                      >
                        {d.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{d.title}</p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(d.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </span>
                      <span>Venue: {d.venue || "Virtual"}</span>
                      <span>Stages: {d.stages?.length || 1}</span>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="text-xs shrink-0 self-end sm:self-center">
                    <Link to="/placement/drives">Manage Stage</Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <PlacementEmptyState
              title="No Upcoming Drives Scheduled"
              description="Configure new hiring drives to initiate stage assessments and interview pipelines."
              icon={Calendar}
            />
          )}
        </PlacementPanel>

        {/* Panel 2: Active Selection Pipelines */}
        <PlacementPanel
          title="Active Candidate Pipelines"
          subtitle="Real-time candidate progression through hiring stages"
          action={
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1">
              <Link to="/placement/m/$module" params={{ module: "pipeline" }}>
                Pipeline view <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          }
        >
          {activeSelectionPipelines && activeSelectionPipelines.length > 0 ? (
            <div className="space-y-3">
              {activeSelectionPipelines.map((p: any) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-lg border border-border/60 bg-card/50 hover:bg-card/80 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{p.companyName}</span>
                    <span className="text-muted-foreground">{p.applicantsCount} Candidates active</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.driveTitle}</p>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40">
                    <span className="text-primary font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Current: {p.currentStage}
                    </span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <PlacementEmptyState
              title="No Active Candidate Pipelines"
              description="Candidate applications will flow here once drives begin running rounds."
              icon={TrendingUp}
            />
          )}
        </PlacementPanel>
      </div>

      {/* 2-Column Analytics & Funnel Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Panel 3: Placement Readiness Tier Distribution */}
        <PlacementPanel
          title="Student Placement Readiness Distribution"
          subtitle="Cognitive, coding, and assessment intelligence tiering"
          action={
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1">
              <Link to="/placement/m/$module" params={{ module: "intelligence" }}>
                Skill intelligence <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          }
        >
          {(() => {
            const TIER_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899"];
            const readinessChartData = (placementReadinessDistribution || []).map((t: any, idx: number) => ({
              name: t.tier,
              count: t.count,
              percentage: t.percentage,
              color: TIER_COLORS[idx % TIER_COLORS.length],
            }));
            const totalCandidates = readinessChartData.reduce((acc: number, t: any) => acc + t.count, 0);

            return (
              <div className="space-y-4">
                <div className="h-56 relative my-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={readinessChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={4}
                        dataKey="count"
                      >
                        {readinessChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0];
                          return (
                            <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                              <p className="font-semibold text-foreground flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.payload.color || d.color }} />
                                <span>{d.name}</span>
                              </p>
                              <p className="text-muted-foreground flex justify-between gap-3">
                                <span>Candidates:</span>
                                <strong className="text-foreground font-mono">{d.value} ({d.payload.percentage}%)</strong>
                              </p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400">
                      {readinessChartData[0]?.percentage ?? 0}%
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Top Tier</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {readinessChartData.map((tier: any) => (
                    <div
                      key={tier.name}
                      className="p-2 rounded-lg border border-border/60 bg-card/60 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                        <span className="font-medium text-foreground truncate text-[11px]">{tier.name}</span>
                      </div>
                      <span className="font-mono font-bold text-foreground text-xs shrink-0">
                        {tier.count} <span className="text-[10px] text-muted-foreground font-normal">({tier.percentage}%)</span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg border border-border/60 bg-muted/20 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary inline mr-1.5" />
                  Synthesized from authoritative coding test submissions, learning milestones, and soft skills intelligence ({totalCandidates} assessed).
                </div>
              </div>
            );
          })()}
        </PlacementPanel>

        {/* Panel 4: Application Conversion Funnel */}
        <PlacementPanel
          title="Application Conversion Funnel"
          subtitle="Cumulative progression from application to joined student"
          action={
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1">
              <Link to="/placement/m/$module" params={{ module: "applications" }}>
                All applications <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          }
        >
          {applicationFunnel ? (
            (() => {
              const funnelData = [
                { stage: "Applied", fullName: "Applications Submitted", count: applicationFunnel.applied || 0, color: "#3b82f6" },
                { stage: "Shortlist", fullName: "Shortlisted for Assessments", count: applicationFunnel.shortlisted || 0, color: "#6366f1" },
                { stage: "Interview", fullName: "Technical / HR Interviews", count: applicationFunnel.interviewed || 0, color: "#8b5cf6" },
                { stage: "Offered", fullName: "Offers Generated", count: applicationFunnel.offered || 0, color: "#f59e0b" },
                { stage: "Accepted", fullName: "Offers Accepted by Students", count: applicationFunnel.accepted || 0, color: "#10b981" },
                { stage: "Joined", fullName: "Verified Campus Onboarding", count: applicationFunnel.joined || 0, color: "#06b6d4" },
              ];

              return (
                <div className="space-y-4">
                  <div className="h-56 w-full my-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelData} margin={{ top: 10, right: 15, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                        <XAxis
                          dataKey="stage"
                          stroke="var(--border)"
                          tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                          tickLine={{ stroke: "var(--border)" }}
                          interval={0}
                        />
                        <YAxis
                          stroke="var(--border)"
                          tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                          tickLine={{ stroke: "var(--border)" }}
                        />
                        <RechartsTooltip
                          cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                                <p className="font-semibold text-foreground flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                                  <span>{d.fullName}</span>
                                </p>
                                <p className="text-muted-foreground flex justify-between gap-3">
                                  <span>Candidates:</span>
                                  <strong className="text-foreground font-mono">{d.count}</strong>
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="count" name="Candidates" radius={[6, 6, 0, 0]}>
                          {funnelData.map((entry, index) => (
                            <Cell key={`funnel-cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                    {funnelData.map((step) => {
                      const max = applicationFunnel.applied || 1;
                      const pct = Math.round((step.count / max) * 100);
                      return (
                        <div key={step.stage} className="p-1.5 rounded-lg border border-border/50 bg-card/60">
                          <div className="flex items-center justify-center gap-1">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: step.color }} />
                            <span className="font-bold text-foreground font-mono">{step.count}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block truncate">{step.stage}</span>
                          <span className="text-[9px] text-muted-foreground/80 font-mono block">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          ) : (
            <PlacementEmptyState
              title="No Funnel Data Available"
              description="Application stats will populate as students apply to opportunities."
              icon={TrendingUp}
            />
          )}
        </PlacementPanel>
      </div>

      {/* Corporate Partner Activity Overview */}
      <PlacementPanel
        title="Active Corporate Partners"
        subtitle="Key recruiting organizations engaged for the current placement cycle"
        action={
          <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1">
            <Link to="/placement/companies">
              Manage companies <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        }
      >
        {companyActivity && companyActivity.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {companyActivity.map((c: any) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-border/70 bg-card/60 hover:bg-card/90 transition-all space-y-2 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">{c.name}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {c.tier || "Tier 1"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{c.industry || "Information Technology"}</p>
                <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40 flex justify-between">
                  <span>Relationship: {c.relationshipStatus || "active"}</span>
                  <span className="text-primary font-medium">{c.contacts?.length || 1} contacts</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <PlacementEmptyState
            title="No Companies Configured"
            description="Add corporate partners to establish campus recruitment relationships."
            icon={Building2}
          />
        )}
      </PlacementPanel>
    </div>
  );
}
