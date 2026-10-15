import { useEffect, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  TrendingUp,
  Sparkles,
  Target,
  Briefcase,
  Bell,
  Settings,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RotateCw,
  ExternalLink,
  Shield,
  Trash2,
  Send,
  Save,
  Clock,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { type StudentModuleSlug } from "@/features/student/nav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student/m/$module")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.module.toUpperCase()} — Student Workspace — Ziphyrus X` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentModulePage,
});

function StudentModulePage() {
  const { module } = Route.useParams();
  const slug = module as StudentModuleSlug;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Editable settings state
  const [settingsForm, setSettingsForm] = useState({
    bio: "",
    githubUsername: "",
    phone: "",
    tabSize: 4,
  });

  // Action plan evidence modal/input
  const [evidenceText, setEvidenceText] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchModuleData() {
      try {
        setLoading(true);
        let res: any = null;

        if (slug === "performance") {
          res = await api.student.performance();
        } else if (slug === "skills") {
          res = await api.student.skills();
        } else if (slug === "placement-readiness") {
          res = await api.student.placementReadiness();
        } else if (slug === "action-plans") {
          res = await api.student.actionPlans.list();
        } else if (slug === "notifications") {
          res = await api.student.notifications.list();
        } else if (slug === "github") {
          res = await api.student.github.status();
        } else if (slug === "settings") {
          const profile = await api.student.profile();
          res = profile;
          if (mounted && profile) {
            setSettingsForm({
              bio: profile.bio || "",
              githubUsername: profile.githubUsername || "",
              phone: profile.phone || "",
              tabSize: profile.editorPreferences?.tabSize || 4,
            });
          }
        }

        if (mounted) {
          setData(res);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading student module:", err);
        if (mounted) setLoading(false);
      }
    }

    fetchModuleData();
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
        Loading module content…
      </div>
    );
  }

  // =========================================================================
  // 1. PERFORMANCE ANALYTICS (PART 16 & PART 26)
  // =========================================================================
  if (slug === "performance") {
    return (
      <div className="space-y-6">
        <div className="pb-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span>Authoritative Performance Analytics</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Layer C intelligence reporting, cohort ranking, and verified engineering competencies.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-md border border-border bg-card p-4 text-center">
            <span className="text-xs text-muted-foreground">Readiness Benchmark</span>
            <div className="text-3xl font-bold font-mono text-foreground mt-2">
              {data?.readinessScore}%
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">Tier 1 Qualified</p>
          </div>

          <div className="rounded-md border border-border bg-card p-4 text-center">
            <span className="text-xs text-muted-foreground">Batch Percentile</span>
            <div className="text-3xl font-bold font-mono text-foreground mt-2">
              {data?.percentileInBatch ?? 88}th
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Top 15% of academic cohort</p>
          </div>

          <div className="rounded-md border border-border bg-card p-4 text-center">
            <span className="text-xs text-muted-foreground">Department Rank</span>
            <div className="text-3xl font-bold font-mono text-foreground mt-2">
              #{data?.rankInDepartment ?? 4}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">of {data?.totalInDepartment ?? 60} students</p>
          </div>
        </div>

        {/* Domain Competency Table */}
        <div className="rounded-md border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Competency Breakdown</h3>
          <div className="space-y-3 text-xs">
            {data?.skills &&
              Object.entries(data.skills).map(([domain, val]: any) => (
                <div key={domain} className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span className="capitalize text-foreground">{domain}</span>
                    <span className="font-mono text-muted-foreground">{val}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. SKILL ANALYTICS (PART 17)
  // =========================================================================
  if (slug === "skills") {
    return (
      <div className="space-y-6">
        <div className="pb-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>Skill Analytics & Gap Analysis</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Standardized evaluation across Technical, Coding, Aptitude, Verbal, and Soft Skills.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.isArray(data) &&
            data.map((sk: any) => (
              <div key={sk.domain} className="rounded-md border border-border bg-card p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-sm">{sk.domain}</span>
                  <Badge variant="outline" className="border-border text-[10px]">
                    {sk.status}
                  </Badge>
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">{sk.score}%</div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                  <span>Growth Velocity:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{sk.trend}</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. PLACEMENT READINESS (PART 19)
  // =========================================================================
  if (slug === "placement-readiness") {
    return (
      <div className="space-y-6">
        <div className="pb-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <span>Placement Readiness Intelligence</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Employability qualification benchmarks and corporate recruitment drive matching.
          </p>
        </div>

        <div className="rounded-md border border-border bg-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-muted-foreground">Overall Employability Status</span>
              <h3 className="text-xl font-bold text-foreground mt-0.5">{data?.tier}</h3>
            </div>
            <div className="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {data?.readinessScore}%
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-semibold text-foreground block mb-2">Verified Strengths:</span>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {data?.strengths?.map((s: string, idx: number) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-semibold text-foreground block mb-2">Recommended Focus Areas:</span>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {data?.improvementAreas?.map((area: string, idx: number) => (
                  <li key={idx}>{area}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-3 rounded bg-muted/30 border border-border text-xs text-foreground">
            <strong>Recommended Action:</strong> {data?.recommendedAction}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. ACTION PLANS (GITHUB ISSUES STYLE) (PART 18)
  // =========================================================================
  if (slug === "action-plans") {
    const handleMilestoneComplete = async (planId: string, milestoneId: string) => {
      try {
        await api.student.actionPlans.completeMilestone(planId, milestoneId, evidenceText || "Verified execution");
        toast.success("Milestone marked completed with evidence.");
        setEvidenceText("");
        setSelectedPlanId(null);
        // Refresh
        const updated = await api.student.actionPlans.list();
        setData(updated);
      } catch (err) {
        toast.error("Failed to complete milestone.");
      }
    };

    return (
      <div className="space-y-6">
        <div className="pb-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <span>Assigned Action Plans & Interventions</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            GitHub Issues-inspired personalized learning milestones and verified practice tracks.
          </p>
        </div>

        <div className="space-y-4">
          {Array.isArray(data) && data.length ? (
            data.map((plan: any) => (
              <div key={plan.id} className="rounded-md border border-border bg-card p-4 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm">{plan.title}</span>
                    <Badge variant="outline" className="text-[10px] border-border">
                      {plan.status}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Due: {plan.deadline}
                  </span>
                </div>

                {/* Sub-tasks */}
                <div className="space-y-1.5 pt-2">
                  {plan.tasks?.map((task: any) => (
                    <div
                      key={task.id}
                      className="p-2.5 rounded border border-border/40 bg-background/50 flex items-center justify-between text-xs"
                    >
                      <span className={task.completed ? "line-through text-muted-foreground" : "text-foreground font-medium"}>
                        {task.title}
                      </span>
                      {task.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px] border-border"
                          onClick={() => handleMilestoneComplete(plan.id, task.id)}
                        >
                          Submit Evidence
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground rounded-md border border-dashed border-border p-6">
              No active action plans assigned at this time.
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. NOTIFICATIONS INBOX (PART 20)
  // =========================================================================
  if (slug === "notifications") {
    const handleDelete = async (id: string) => {
      try {
        await api.notifications.delete(id);
        setData((prev: any[]) => prev.filter((n) => n.id !== id));
        toast.success("Notification deleted.");
      } catch (err) {
        toast.error("Error deleting notification.");
      }
    };

    return (
      <div className="space-y-6">
        <div className="pb-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <span>Student Notifications Inbox</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Campus announcements, assessment deadlines, and coding challenges.
          </p>
        </div>

        <div className="divide-y divide-border/60 rounded-md border border-border bg-card">
          {Array.isArray(data) && data.length ? (
            data.map((notif: any) => (
              <div key={notif.id} className="p-4 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{notif.title}</span>
                    <Badge variant="outline" className="text-[10px] border-border">
                      {notif.targetRole || "All"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">{notif.message}</p>
                  <span className="text-[11px] text-muted-foreground font-mono block">
                    Expires in: {notif.durationDays ?? 7} days
                  </span>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(notif.id)}
                  title="Delete notification"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No notifications in your inbox.
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 6. GITHUB REPOSITORY SYNC (PART 14)
  // =========================================================================
  if (slug === "github") {
    const handleRetry = async () => {
      try {
        await api.student.github.retrySync();
        toast.success("GitHub sync jobs re-triggered.");
      } catch (err) {
        toast.error("Retry failed.");
      }
    };

    return (
      <div className="space-y-6">
        <div className="pb-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            <span>Automatic GitHub Synchronization</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Accepted Coding Judge solutions are automatically synchronized to your dedicated repository.
          </p>
        </div>

        <div className="rounded-md border border-border bg-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60 text-xs">
            <div>
              <span className="text-muted-foreground text-[11px] uppercase tracking-wider block">
                Target Repository Naming Convention
              </span>
              <span className="font-mono text-sm font-bold text-foreground">
                {data?.targetRepo || "ZiphyrusX-Student-001"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs border-border" onClick={handleRetry}>
                <RotateCw className="w-3 h-3 mr-1" />
                <span>Retry Pending</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <span className="font-semibold text-foreground">Recent Synchronized Commits:</span>
            {data?.recentSyncs?.length ? (
              data.recentSyncs.map((sync: any) => (
                <div key={sync.id} className="p-2.5 rounded bg-muted/30 border border-border/40 flex items-center justify-between text-xs font-mono">
                  <div className="min-w-0 pr-2">
                    <span className="text-foreground truncate block">{sync.commitMessage}</span>
                    <span className="text-[11px] text-muted-foreground">{sync.filePath}</span>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                    {sync.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No solutions synchronized yet. Solve problems in the Coding Judge to trigger automatic commits!
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 7. STUDENT SETTINGS & SECURITY (PART 21)
  // =========================================================================
  if (slug === "settings") {
    const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await api.student.updateProfile({
          bio: settingsForm.bio,
          githubUsername: settingsForm.githubUsername,
          phone: settingsForm.phone,
          editorPreferences: { tabSize: settingsForm.tabSize, theme: "github-dark", keymap: "standard" },
        });
        toast.success("Settings saved successfully.");
      } catch (err: any) {
        toast.error(err?.message || "Failed to save settings.");
      }
    };

    return (
      <div className="space-y-6 max-w-2xl">
        <div className="pb-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <span>Student Profile & Editor Preferences</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure bio, GitHub username, and coding workspace settings.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4 rounded-md border border-border bg-card p-5 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Student Bio</label>
            <Input
              value={settingsForm.bio}
              onChange={(e) => setSettingsForm({ ...settingsForm, bio: e.target.value })}
              className="text-xs border-border bg-background"
              placeholder="Tell others about your technical interests..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">GitHub Username</label>
            <Input
              value={settingsForm.githubUsername}
              onChange={(e) => setSettingsForm({ ...settingsForm, githubUsername: e.target.value })}
              className="text-xs border-border bg-background"
              placeholder="e.g. aarav-sharma-zx"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Phone Number</label>
            <Input
              value={settingsForm.phone}
              onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
              className="text-xs border-border bg-background"
              placeholder="+91..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Editor Tab Size</label>
            <select
              value={settingsForm.tabSize}
              onChange={(e) => setSettingsForm({ ...settingsForm, tabSize: Number(e.target.value) })}
              className="h-8 w-full text-xs rounded border border-border bg-background px-2 font-mono"
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={8}>8 spaces</option>
            </select>
          </div>

          <div className="pt-3 border-t border-border/60 flex justify-end">
            <Button type="submit" size="sm" className="text-xs">
              <Save className="w-3.5 h-3.5 mr-1" />
              <span>Save Preferences</span>
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return notFound();
}
