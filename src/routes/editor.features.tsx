import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, RotateCw, ShieldAlert, Sliders } from "lucide-react";
import { PageHeader, Panel, fmt } from "@/features/editor/page";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/editor/features")({
  head: () => ({
    meta: [
      { title: "Feature Availability — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FeatureAvailabilityPage,
});

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
  updatedAt: string;
}

function FeatureAvailabilityPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChange, setPendingChange] = useState<{ key: string; name: string; newState: boolean } | null>(null);

  const fetchFlags = () => {
    setLoading(true);
    api.editor.features
      .list()
      .then((res) => {
        setFlags(res);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load feature flags");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleToggle = (flag: FeatureFlag) => {
    setPendingChange({
      key: flag.key,
      name: flag.name,
      newState: !flag.isEnabled,
    });
  };

  const confirmToggle = async () => {
    if (!pendingChange) return;
    try {
      const updated = await api.editor.features.toggle(pendingChange.key, pendingChange.newState);
      setFlags((prev) =>
        prev.map((f) => (f.key === updated.key ? { ...f, isEnabled: updated.isEnabled, updatedAt: updated.updatedAt } : f))
      );
      toast.success(
        `Feature "${pendingChange.name}" ${pendingChange.newState ? "enabled" : "disabled"} platform-wide.`
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to toggle feature flag.");
    } finally {
      setPendingChange(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Feature Availability"
        desc="Authoritative control for platform-wide feature availability. In Ziphyrus X architecture, feature availability is separate from role permissions. Super Admin cannot bypass Editor-disabled features."
        actions={
          <Button variant="outline" size="sm" onClick={fetchFlags} disabled={loading}>
            <RotateCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      <div className="mb-6 rounded-md border border-border bg-muted/30 p-4 text-sm">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-foreground">Editor Invariant</p>
            <p className="mt-1 text-xs text-muted-foreground">
              A feature being enabled makes it available to users who hold the appropriate permission. A feature being disabled blocks access for all users, including administrators. Consequential changes are logged immutably in system audit events.
            </p>
          </div>
        </div>
      </div>

      <Panel title="Platform Features and Operational Gates">
        <div className="divide-y divide-border">
          {flags.map((flag) => (
            <div key={flag.key} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">{flag.name}</span>
                  <Badge variant={flag.isEnabled ? "default" : "secondary"} className="text-[10px]">
                    {flag.isEnabled ? "AVAILABLE" : "DISABLED"}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">({flag.key})</span>
                </div>
                <p className="text-xs text-muted-foreground">{flag.description}</p>
                <p className="text-[10px] text-muted-foreground/80">
                  Last updated: {flag.updatedAt ? fmt(flag.updatedAt) : "Initial system configuration"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={flag.isEnabled}
                  onCheckedChange={() => handleToggle(flag)}
                  aria-label={`Toggle ${flag.name}`}
                />
              </div>
            </div>
          ))}
          {flags.length === 0 && !loading && (
            <p className="py-6 text-center text-sm text-muted-foreground">No feature flags configured.</p>
          )}
        </div>
      </Panel>

      <AlertDialog open={!!pendingChange} onOpenChange={(open) => !open && setPendingChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Feature Availability Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {pendingChange?.newState ? "enable" : "disable"} the feature{" "}
              <strong>"{pendingChange?.name}"</strong>?
              <br />
              <br />
              This will update platform availability immediately across all colleges and sessions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
