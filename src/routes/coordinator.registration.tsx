import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Copy,
  KeyRound,
  Link2,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Ban,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  GraduationCap,
} from "lucide-react";
import { PageHeader, Panel, fmt } from "@/features/coordinator/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api/client";
import { authService } from "@/lib/auth/service";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/coordinator/registration")({
  head: () => ({
    meta: [
      { title: "Student Registration — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentRegistrationPage,
});

interface RegistrationToken {
  id: string;
  token: string;
  collegeCode: string;
  collegeId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  status: "active" | "consumed" | "expired" | "revoked";
  consumedAt?: string;
  consumedByStudentId?: string;
  consumedByStudentName?: string;
  metadata?: {
    department?: string;
    batch?: string;
  };
}

function StudentRegistrationPage() {
  const [tokens, setTokens] = useState<RegistrationToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLink, setActiveLink] = useState<{ url: string; token: string; expiresAt: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Creation metadata
  const [targetDepartment, setTargetDepartment] = useState<string>("all");
  const [targetBatch, setTargetBatch] = useState<string>("all");

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  // Revoke modal
  const [revokeTarget, setRevokeTarget] = useState<RegistrationToken | null>(null);
  const [revoking, setRevoking] = useState(false);

  const session = authService.getSession();
  const collegeCode = session?.user.collegeCode ?? "SMP101";

  // Load registration tokens
  const loadTokens = async () => {
    try {
      setLoading(true);
      const list = await api.coordinator.registration.getLinks();
      setTokens(list || []);
    } catch (err: any) {
      console.error("Failed to load registration tokens:", err);
      toast.error(err?.message ?? "Failed to load registration tokens.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";
      const metadata: { department?: string; batch?: string } = {};
      if (targetDepartment !== "all") metadata.department = targetDepartment;
      if (targetBatch !== "all") metadata.batch = targetBatch;

      const link = await api.coordinator.registration.generateLink({
        origin,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      setActiveLink(link);
      setCopiedId(null);
      toast.success("Single-use tokenized registration link generated (valid 1 hour).");
      await loadTokens();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to generate registration link.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Registration URL copied to clipboard.");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await api.coordinator.registration.revokeLink(revokeTarget.id);
      toast.success(`Registration token ${revokeTarget.token.slice(0, 16)}… revoked.`);
      setRevokeTarget(null);
      await loadTokens();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to revoke registration link.");
    } finally {
      setRevoking(false);
    }
  };

  // Filtered list
  const filteredTokens = useMemo(() => {
    return tokens.filter((t) => {
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchSearch =
        !search ||
        t.token.toLowerCase().includes(search.toLowerCase()) ||
        (t.consumedByStudentName && t.consumedByStudentName.toLowerCase().includes(search.toLowerCase())) ||
        (t.metadata?.department && t.metadata.department.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [tokens, statusFilter, search]);

  // Statistics
  const stats = useMemo(() => {
    const total = tokens.length;
    const active = tokens.filter((t) => t.status === "active").length;
    const consumed = tokens.filter((t) => t.status === "consumed").length;
    const expiredOrRevoked = tokens.filter((t) => t.status === "expired" || t.status === "revoked").length;
    return { total, active, consumed, expiredOrRevoked };
  }, [tokens]);

  const getStatusBadge = (status: RegistrationToken["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active (Valid 1h)
          </Badge>
        );
      case "consumed":
        return (
          <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30 gap-1 font-mono text-[11px]">
            <CheckCircle2 className="w-3 h-3" />
            Enrolled
          </Badge>
        );
      case "revoked":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1 font-mono text-[11px]">
            <Ban className="w-3 h-3" />
            Revoked
          </Badge>
        );
      case "expired":
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 font-mono text-[11px]">
            <Clock className="w-3 h-3" />
            Expired
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Registration"
        desc={`Authoritative 5-step registration onboarding for campus ${collegeCode}. Invitation links are tokenized, college-scoped, and expire automatically after 1 hour.`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadTokens} disabled={loading} title="Refresh Token Ledger">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button size="sm" onClick={handleGenerateLink} disabled={generating}>
              <Link2 className="mr-2 h-4 w-4" /> {generating ? "Generating…" : "Generate Registration Link"}
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="eyebrow text-muted-foreground">Total Generated</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{stats.total}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Authoritative token history</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="eyebrow text-emerald-600 dark:text-emerald-400">Active (Available)</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{stats.active}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Ready for student signup</p>
        </div>
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">
          <p className="eyebrow text-sky-600 dark:text-sky-400">Students Enrolled</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400">{stats.consumed}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Successfully registered</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="eyebrow text-muted-foreground">Expired / Revoked</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{stats.expiredOrRevoked}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Stale or invalid invitations</p>
        </div>
      </div>

      {/* 5-Step Registration Invariant Banner */}
      <div className="rounded-md border border-border bg-card p-5">
        <p className="eyebrow mb-3">Locked 5-Step Registration Sequence</p>
        <div className="grid gap-3 sm:grid-cols-5 text-xs">
          <div className="rounded border border-border p-3 bg-muted/20">
            <span className="font-mono text-primary font-bold">Step 1</span>
            <p className="font-medium text-foreground mt-1">Personal Details</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Full name, official email, phone</p>
          </div>
          <div className="rounded border border-border p-3 bg-muted/20">
            <span className="font-mono text-primary font-bold">Step 2</span>
            <p className="font-medium text-foreground mt-1">College & Academic</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Department, degree program, section</p>
          </div>
          <div className="rounded border border-border p-3 bg-muted/20">
            <span className="font-mono text-primary font-bold">Step 3</span>
            <p className="font-medium text-foreground mt-1">USN Validation</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Authoritative identity verification</p>
          </div>
          <div className="rounded border border-border p-3 bg-muted/20">
            <span className="font-mono text-primary font-bold">Step 4</span>
            <p className="font-medium text-foreground mt-1">Account Credentials</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Secure password creation</p>
          </div>
          <div className="rounded border border-border p-3 bg-muted/20">
            <span className="font-mono text-primary font-bold">Step 5</span>
            <p className="font-medium text-foreground mt-1">Verification</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Final campus enrollment validation</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>Note: LeetCode, GitHub, and professional profiles belong strictly in the post-login student portfolio, never in registration.</span>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Token Generator Panel */}
        <Panel title="Tokenized Link Generator">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Department Tag (Optional)</label>
                <Select value={targetDepartment} onValueChange={setTargetDepartment}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="all">Any / General</SelectItem>
                    <SelectItem value="Computer Science & Engineering">Computer Science & Engineering</SelectItem>
                    <SelectItem value="Information Science">Information Science</SelectItem>
                    <SelectItem value="Electronics & Communication">Electronics & Communication</SelectItem>
                    <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Batch Tag (Optional)</label>
                <Select value={targetBatch} onValueChange={setTargetBatch}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue placeholder="All Batches" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="all">Any / General</SelectItem>
                    <SelectItem value="Batch 2026-CS-A">Batch 2026-CS-A</SelectItem>
                    <SelectItem value="Batch 2026-IS-B">Batch 2026-IS-B</SelectItem>
                    <SelectItem value="Batch 2027-EC-A">Batch 2027-EC-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {activeLink ? (
              <div className="space-y-4 pt-2">
                <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" /> Active Registration Link Generated
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Valid for: <strong>Campus {collegeCode}</strong> · Expires: {fmt(activeLink.expiresAt)} (1 hour)
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Registration URL</label>
                  <div className="flex gap-2">
                    <Input value={activeLink.url} readOnly className="font-mono text-xs bg-muted" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(activeLink.url, "active-top")}
                      className="shrink-0 gap-1"
                    >
                      {copiedId === "active-top" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      {copiedId === "active-top" ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground space-y-1">
                  <p>• Single-use link: automatically invalidated once completed.</p>
                  <p>• Cannot be used to register students for any other college.</p>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground space-y-3">
                <KeyRound className="mx-auto h-7 w-7 text-muted-foreground/40" />
                <p>Generate a secure, expiring tokenized invitation link for prospective student onboarding.</p>
                <Button size="sm" onClick={handleGenerateLink} disabled={generating}>
                  <Link2 className="mr-1.5 h-4 w-4" />
                  {generating ? "Generating…" : "Generate Link Now"}
                </Button>
              </div>
            )}
          </div>
        </Panel>

        {/* Invitation Policies */}
        <Panel title="Invitation Policies">
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Strict 1-Hour Expiration</p>
                <p>Registration tokens expire after 60 minutes to prevent unauthorized, leaked, or stale admissions.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <UserCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Single Student Binding</p>
                <p>Each token is consumed once upon successful 5-step registration and cannot be reused.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Campus Code Scope Locking</p>
                <p>Tokens are cryptographically tied to {collegeCode}. Cross-college enrollment is blocked.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Immutable Audit Recording</p>
                <p>Generation, consumption, and manual revocation events are recorded in the security audit ledger.</p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Registration Tokens Ledger Table */}
      <Panel title="Registration Token Lifecycle & Admission Ledger">
        <div className="space-y-3">
          {/* Controls: Search & Status Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search token, student name, or dept…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-36 font-mono">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="consumed">Enrolled Only</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tokens Table */}
          <div className="rounded border border-border overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium">
                <tr>
                  <th className="py-2.5 px-3">Token String</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Department / Batch</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3">Expires / Valid Until</th>
                  <th className="py-2.5 px-3">Enrolled Student</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {filteredTokens.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground font-sans">
                      {loading ? "Loading registration tokens…" : "No registration tokens found matching filter criteria."}
                    </td>
                  </tr>
                ) : (
                  filteredTokens.map((t) => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";
                    const fullUrl = `${origin}/register?college=${t.collegeCode}&token=${t.token}`;
                    const isExpired = new Date(t.expiresAt).getTime() <= Date.now();

                    return (
                      <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          <span title={t.token}>{t.token.slice(0, 18)}…</span>
                        </td>
                        <td className="py-2.5 px-3">{getStatusBadge(t.status)}</td>
                        <td className="py-2.5 px-3 font-sans text-muted-foreground">
                          {t.metadata?.department || "General"}
                          {t.metadata?.batch && (
                            <span className="block text-[11px] font-mono text-muted-foreground/80">
                              {t.metadata.batch}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">{fmt(t.createdAt)}</td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          {fmt(t.expiresAt)}
                          {t.status === "active" && (
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-sans">
                              (Valid 1 hour)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {t.consumedByStudentName ? (
                            <div>
                              <span className="font-semibold text-foreground">{t.consumedByStudentName}</span>
                              <span className="block text-[11px] font-mono text-muted-foreground">
                                ID: {t.consumedByStudentId?.slice(0, 10)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">— Not claimed yet —</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1 font-sans">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleCopy(fullUrl, t.id)}
                              title="Copy Registration Link"
                            >
                              {copiedId === t.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>

                            {t.status === "active" && !isExpired && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/30"
                                onClick={() => setRevokeTarget(t)}
                                title="Revoke Token"
                              >
                                <Ban className="h-3.5 w-3.5 mr-1" />
                                Revoke
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              Revoke Registration Token
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this registration token?
            </DialogDescription>
          </DialogHeader>

          {revokeTarget && (
            <div className="space-y-3 py-2 text-xs font-mono bg-muted/40 p-3 rounded border border-border">
              <p>
                <strong className="text-muted-foreground font-sans">Token:</strong> {revokeTarget.token}
              </p>
              <p>
                <strong className="text-muted-foreground font-sans">Campus:</strong> {revokeTarget.collegeCode}
              </p>
              <p>
                <strong className="text-muted-foreground font-sans">Expires:</strong> {fmt(revokeTarget.expiresAt)}
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Once revoked, this link will immediately become invalid and cannot be used by any student to enroll.
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setRevokeTarget(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRevokeConfirm} disabled={revoking}>
              {revoking ? "Revoking…" : "Confirm Revocation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
