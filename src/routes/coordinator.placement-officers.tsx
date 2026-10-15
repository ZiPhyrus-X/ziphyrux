import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { UserCheck, Plus, RotateCw, ShieldCheck, UserX, Phone, Mail, Building2, Briefcase, Compass, Users } from "lucide-react";
import { PageHeader, Panel } from "@/features/coordinator/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
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

export const Route = createFileRoute("/coordinator/placement-officers")({
  head: () => ({
    meta: [
      { title: "Placement Officer Management — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlacementOfficerManagementPage,
});

interface PlacementOfficer {
  id: string;
  userId: string;
  collegeId: string;
  collegeCode: string;
  name: string;
  email: string;
  phone?: string;
  departmentScope?: string[];
  status: "active" | "inactive";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function PlacementOfficerManagementPage() {
  const [officers, setOfficers] = useState<PlacementOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [deptScopeStr, setDeptScopeStr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const session = authService.getSession();
  const collegeCode = session?.user.collegeCode ?? "SMP101";

  const fetchOfficers = () => {
    setLoading(true);
    api.coordinator.placementOfficers
      .list()
      .then((res) => {
        setOfficers(res);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load placement officers");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOfficers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Full Name and institutional email are required.");
      return;
    }

    const departmentScope = deptScopeStr
      .split(",")
      .map((d) => d.trim().toUpperCase())
      .filter(Boolean);

    setSubmitting(true);
    try {
      const created = await api.coordinator.placementOfficers.create({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        departmentScope: departmentScope.length > 0 ? departmentScope : undefined,
      });
      setOfficers((prev) => [created, ...prev]);
      toast.success(
        `Placement Officer account "${created.name}" provisioned. Default password: Ziphyrus-xPlacement!`
      );
      setCreateOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setDeptScopeStr("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to provision placement officer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (officer: PlacementOfficer) => {
    const nextStatus = officer.status === "active" ? "inactive" : "active";
    setTogglingId(officer.id);
    try {
      const updated = await api.coordinator.placementOfficers.toggleStatus(officer.id, nextStatus);
      setOfficers((prev) => prev.map((o) => (o.id === officer.id ? { ...o, status: updated.status } : o)));
      toast.success(
        `Officer "${officer.name}" status updated to ${nextStatus.toUpperCase()}.`
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to toggle status");
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = officers.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase()) ||
      (o.departmentScope || []).some((d) => d.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Placement Officer Management"
        desc={`Provision, govern, and toggle status for Placement Officers assigned to campus ${collegeCode}. Accounts operate with tenant isolation and strictly read-only student academic access.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="glass-card">
              <Link to="/coordinator/m/$module" params={{ module: "placement-readiness" }}>
                <Compass className="mr-1.5 h-4 w-4" /> Readiness Tiers
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="glass-card">
              <Link to="/coordinator/m/$module" params={{ module: "placement-requirements" }}>
                <Briefcase className="mr-1.5 h-4 w-4" /> Drive Criteria
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="glass-card">
              <Link to="/coordinator/students">
                <Users className="mr-1.5 h-4 w-4" /> Student Roster
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchOfficers} disabled={loading} className="glass-card">
              <RotateCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Provision Placement Officer
            </Button>
          </div>
        }
      />

      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-card/60 backdrop-blur-md p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Officers</p>
              <p className="text-2xl font-bold font-display text-foreground">{officers.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-card/60 backdrop-blur-md p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Credentials</p>
              <p className="text-2xl font-bold font-display text-emerald-500">
                {officers.filter((o) => o.status === "active").length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-card/60 backdrop-blur-md p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-muted text-muted-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Campus Scope</p>
              <p className="text-2xl font-bold font-display text-foreground">{collegeCode}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search officers by name, email, or department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm glass-card"
        />
      </div>

      <Panel title={`Authorized Placement Officers (${filtered.length})`}>
        <DataTable
          data={filtered}
          emptyMessage="No placement officers provisioned for this campus."
          columns={[
            {
              header: "Officer Name & Login",
              accessor: (o) => (
                <div>
                  <p className="font-semibold text-sm text-foreground">{o.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3" /> {o.email}
                  </p>
                </div>
              ),
            },
            {
              header: "Contact Phone",
              accessor: (o) => (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{o.phone || "—"}</span>
                </div>
              ),
            },
            {
              header: "Department Scope",
              accessor: (o) => (
                <div className="flex flex-wrap gap-1">
                  {!o.departmentScope || o.departmentScope.length === 0 ? (
                    <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                      All Campus Departments
                    </Badge>
                  ) : (
                    o.departmentScope.map((d) => (
                      <Badge key={d} variant="secondary" className="text-[10px] font-mono">
                        {d}
                      </Badge>
                    ))
                  )}
                </div>
              ),
            },
            {
              header: "Status",
              accessor: (o) => <StatusBadge status={o.status} label={o.status.toUpperCase()} />,
            },
            {
              header: "Access Governance",
              accessor: (o) => (
                <Button
                  size="sm"
                  variant={o.status === "active" ? "outline" : "default"}
                  className="text-xs h-7 gap-1"
                  disabled={togglingId === o.id}
                  onClick={() => handleToggleStatus(o)}
                >
                  {o.status === "active" ? (
                    <>
                      <UserX className="h-3 w-3 text-destructive" /> Deactivate
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3 w-3" /> Reactivate
                    </>
                  )}
                </Button>
              ),
            },
          ]}
        />
      </Panel>

      {/* Provision Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg glass-card border-white/20">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Provision Placement Officer</DialogTitle>
            <DialogDescription>
              Create an authoritative Placement Officer profile for campus <strong className="text-foreground">{collegeCode}</strong>.
              Default credentials (<code className="text-xs bg-muted px-1.5 py-0.5 rounded">Ziphyrus-xPlacement!</code>) will be provisioned.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div>
              <Label htmlFor="po-name">Full Name *</Label>
              <Input
                id="po-name"
                placeholder="e.g. Dr. Rajesh Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="po-email">Institutional Email *</Label>
              <Input
                id="po-email"
                type="email"
                placeholder="e.g. placement.officer@smp101.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="po-phone">Phone Number (Optional)</Label>
              <Input
                id="po-phone"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="po-dept">Department Scope (Optional, comma-separated)</Label>
              <Input
                id="po-dept"
                placeholder="e.g. CSE, ISE, ECE (leave empty for campus-wide access)"
                value={deptScopeStr}
                onChange={(e) => setDeptScopeStr(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                If omitted, officer can manage opportunities and evaluate eligibility across all departments.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Provisioning…" : "Provision Officer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
