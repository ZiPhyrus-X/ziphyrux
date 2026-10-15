import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle2,
  Clock,
  Layers,
  Lock,
  Plug,
  RefreshCw,
  Server,
  Workflow,
  XCircle,
} from "lucide-react";
import { PageHeader, Panel, fmt } from "@/features/super-admin/page";
import { StatusBadge } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/admin/oversight")({
  head: () => ({
    meta: [
      { title: "Platform Oversight — Ziphyrus X Super Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlatformOversightPage,
});

export function PlatformOversightPage() {
  const [features, setFeatures] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  const fetchOversightData = () => {
    setLoading(true);
    Promise.all([
      api.features.list(),
      api.health.getServices(),
      api.integrations.list(),
      api.jobs.list(),
    ])
      .then(([f, s, i, j]) => {
        setFeatures(f);
        setServices(s);
        setIntegrations(i);
        setJobs(j);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOversightData();
  }, []);

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      const updated = await api.jobs.retry(jobId);
      setJobs(jobs.map((j) => (j.id === jobId ? updated : j)));
      toast.success(`Job ${jobId} queued for retry.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to retry job");
    } finally {
      setRetryingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader
          title="Platform Oversight"
          desc="System health, integration statuses, background queues, and Editor feature gate visibility."
        />
        <Button variant="outline" size="sm" onClick={fetchOversightData} className="gap-2 shrink-0">
          <RefreshCw className="h-4 w-4" /> Refresh Status
        </Button>
      </div>

      <Tabs defaultValue="features" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 sm:w-auto">
          <TabsTrigger value="features" className="gap-2">
            <Layers className="h-4 w-4" /> Feature Gates
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <Server className="h-4 w-4" /> System Health
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Plug className="h-4 w-4" /> Integrations
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-2">
            <Workflow className="h-4 w-4" /> Background Jobs
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Feature Availability (Editor Controlled) */}
        <TabsContent value="features" className="space-y-4">
          <div className="rounded-lg border border-border/80 bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-3">
            <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Role Boundary Invariant:</span> Feature availability is
              controlled strictly by authorized <span className="font-semibold text-foreground">Editors</span>. Super Admin
              has governance visibility into feature state and activation history, but cannot bypass or unilaterally toggle
              Editor-owned gates.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {features.map((flag) => (
              <div key={flag.id} className="rounded-lg border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{flag.key}</span>
                    <Badge variant={flag.isEnabled ? "outline" : "secondary"}>
                      {flag.isEnabled ? "Available" : "Disabled"}
                    </Badge>
                  </div>
                  <h4 className="mt-2 text-base font-medium text-foreground">{flag.name}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{flag.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Controller: <strong className="capitalize text-foreground">{flag.controlledByRole}</strong></span>
                  <span>Updated: {fmt(flag.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: System Health */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((svc) => (
              <div key={svc.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{svc.name}</span>
                  <StatusBadge s={svc.status} />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Roundtrip Latency:</span>
                  <span className="font-mono font-semibold text-foreground">{svc.latency}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Heartbeat Checked:</span>
                  <span>{fmt(svc.checkedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: Integrations */}
        <TabsContent value="integrations" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {integrations.map((int) => (
              <div key={int.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{int.name}</span>
                  <StatusBadge s={int.status} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Capabilities: <span className="text-foreground">{int.capabilities}</span>
                </p>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Last Sync: {fmt(int.lastSync)}</span>
                  <span>Status Note: {int.lastError}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab 4: Background Jobs */}
        <TabsContent value="jobs" className="space-y-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Job Type / Identifier</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Duration</th>
                    <th className="p-3 font-medium">Attempts</th>
                    <th className="p-3 font-medium">Started At</th>
                    <th className="p-3 font-medium">Recovery Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-muted/40">
                      <td className="p-3">
                        <span className="font-mono text-xs font-medium text-foreground">{job.type}</span>
                        <span className="block text-[11px] text-muted-foreground">{job.id}</span>
                      </td>
                      <td className="p-3">
                        <StatusBadge s={job.status} />
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{job.duration}</td>
                      <td className="p-3 font-mono text-xs">{job.attempts}</td>
                      <td className="p-3 text-xs text-muted-foreground">{fmt(job.startedAt)}</td>
                      <td className="p-3">
                        {job.status === "failed" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={retryingJobId === job.id}
                            onClick={() => handleRetryJob(job.id)}
                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
                          >
                            {retryingJobId === job.id ? "Retrying…" : "Retry Job"}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
