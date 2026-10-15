import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Shield, ShieldCheck, UserCheck } from "lucide-react";
import { PageHeader, fmt } from "@/features/super-admin/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authService, type Session } from "@/lib/auth/service";

export const Route = createFileRoute("/admin/account")({
  head: () => ({
    meta: [
      { title: "My Account — Ziphyrus X Super Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyAccountPage,
});

export function MyAccountPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const s = authService.getSession();
    if (!s || s.user.role !== "super_admin") {
      navigate({ to: "/login", replace: true });
    } else {
      setSession(s);
    }
  }, [navigate]);

  if (!session) return null;

  const handleSignOut = () => {
    authService.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="My Account"
        desc="Authenticated Super Admin session and platform governance identity details."
      />

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="font-display text-2xl font-normal text-foreground">{session.user.name}</h3>
            <p className="font-mono text-sm text-muted-foreground">{session.user.loginId}</p>
          </div>
          <Badge variant="outline" className="border-primary/50 text-primary gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Permanent Super Admin
          </Badge>
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
          <div className="rounded-md border border-border p-3">
            <dt className="text-xs text-muted-foreground">Assigned Role</dt>
            <dd className="mt-1 font-semibold text-foreground">Super Admin</dd>
          </div>
          <div className="rounded-md border border-border p-3">
            <dt className="text-xs text-muted-foreground">Assigned Scope</dt>
            <dd className="mt-1 font-semibold text-foreground">Global Platform (All Colleges)</dd>
          </div>
          <div className="rounded-md border border-border p-3">
            <dt className="text-xs text-muted-foreground">Session Issued</dt>
            <dd className="mt-1 text-xs text-muted-foreground">{new Date(session.issuedAt).toLocaleString()}</dd>
          </div>
          <div className="rounded-md border border-border p-3">
            <dt className="text-xs text-muted-foreground">Authentication Provider</dt>
            <dd className="mt-1 text-xs font-mono text-muted-foreground capitalize">{session.source}</dd>
          </div>
        </dl>

        <div className="rounded-md border border-border/80 bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
          <h5 className="font-semibold text-foreground">Security Safeguard Invariant</h5>
          <p>
            As a permanent platform governance account (<code className="font-mono text-foreground">sAdmin1@ziphyrus.in</code>),
            your account identity cannot be deleted or deactivated. All actions executed under this session are recorded
            in the immutable platform audit log.
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="outline" onClick={handleSignOut} className="gap-2 text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
