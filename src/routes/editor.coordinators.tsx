import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  Copy,
  Plus,
  RotateCw,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { PageHeader, Metric, Panel, fmt } from "@/features/editor/page";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/editor/coordinators")({
  head: () => ({
    meta: [
      { title: "Coordinator Accounts — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoordinatorAccountsPage,
});

interface CoordinatorRecord {
  id: string;
  loginId: string;
  email: string;
  name: string;
  role: "coordinator";
  college: string;
  collegeId?: string;
  status: "active" | "inactive";
  isProtected?: boolean;
  createdAt: string;
  lastActive: string;
}

interface CollegeOption {
  id: string;
  code: string;
  name: string;
  status: "active" | "hold" | "deactive";
}

function CoordinatorAccountsPage() {
  const [coordinators, setCoordinators] = useState<CoordinatorRecord[]>([]);
  const [colleges, setColleges] = useState<CollegeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Provision modal state
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coordsRes, collegesRes] = await Promise.all([
        api.editor.coordinators.list(),
        api.editor.colleges.list(),
      ]);
      setCoordinators(coordsRes);
      setColleges(collegesRes);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load coordinator accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Set of college codes that already have an active coordinator
  const assignedActiveCollegeCodes = new Set(
    coordinators.filter((c) => c.status === "active").map((c) => c.college.toUpperCase())
  );

  // Eligible colleges for new coordinator provisioning
  const eligibleColleges = colleges.filter(
    (c) => !assignedActiveCollegeCodes.has(c.code.toUpperCase())
  );

  const handleOpenProvisionModal = () => {
    setName("");
    setEmail("");
    setSelectedCollege(eligibleColleges.length > 0 ? eligibleColleges[0].code : "");
    setProvisionOpen(true);
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Coordinator name is required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("A valid email address is required.");
      return;
    }
    if (!selectedCollege) {
      toast.error("Please select an assigned college.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.editor.coordinators.create({
        name: name.trim(),
        email: email.trim(),
        collegeCode: selectedCollege,
      });
      setCoordinators((prev) => [created, ...prev]);
      toast.success(`Coordinator account for "${created.name}" (${created.college}) provisioned.`);
      setProvisionOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to provision coordinator account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (coord: CoordinatorRecord) => {
    const nextStatus = coord.status === "active" ? "inactive" : "active";
    
    // Invariant check: if activating, ensure no other active coordinator for this college
    if (nextStatus === "active") {
      const existing = coordinators.find(
        (c) => c.id !== coord.id && c.college === coord.college && c.status === "active"
      );
      if (existing) {
        toast.error(
          `Cannot activate: College '${coord.college}' already has an active Coordinator (${existing.email}). Only one active Coordinator per college is permitted.`
        );
        return;
      }
    }

    try {
      const updated = await api.editor.coordinators.updateStatus(coord.id, nextStatus);
      setCoordinators((prev) =>
        prev.map((c) => (c.id === coord.id ? { ...c, status: updated.status } : c))
      );
      toast.success(`Coordinator ${coord.name} marked ${nextStatus}.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update coordinator status");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const filtered = coordinators.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.loginId.toLowerCase().includes(q) ||
      c.college.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCoordinators = coordinators.length;
  const activeCoordinators = coordinators.filter((c) => c.status === "active").length;
  const assignedCollegesCount = assignedActiveCollegeCodes.size;
  const unassignedCollegesCount = Math.max(0, colleges.length - assignedCollegesCount);

  return (
    <div>
      <PageHeader
        title="Coordinator Accounts"
        desc="Provision and govern college coordinators. Invariants: Exactly one active Coordinator per college. Coordinators cannot create other Coordinators."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RotateCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={handleOpenProvisionModal}>
              <Plus className="mr-2 h-4 w-4" /> Provision Coordinator
            </Button>
          </div>
        }
      />

      {/* Governance Invariants Card */}
      <div className="mb-6 rounded-md border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Coordinator Management Architecture</p>
            <p>
              • <strong>One Active Coordinator per College:</strong> Only one active Coordinator account is permitted per college tenant.
            </p>
            <p>
              • <strong>Strict Scope Isolation:</strong> Coordinators are locked to their assigned college code and have no access to cross-college records.
            </p>
            <p>
              • <strong>Provisioning Authority:</strong> Only Editor (or Super Admin) can provision Coordinators. Coordinators cannot create other Coordinators.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Metric
          label="Total Coordinators"
          value={totalCoordinators}
          note="Registered coordinator accounts"
        />
        <Metric
          label="Active Coordinators"
          value={activeCoordinators}
          note={`${totalCoordinators - activeCoordinators} inactive`}
        />
        <Metric
          label="Assigned Colleges"
          value={assignedCollegesCount}
          note="Colleges with active coordinator"
        />
        <Metric
          label="Pending Coverage"
          value={unassignedCollegesCount}
          note="Colleges without active coordinator"
        />
      </div>

      {/* Search and Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or college code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Coordinators Table */}
      <Panel title={`Coordinator Directory (${filtered.length})`}>
        <DataTable
          data={filtered}
          emptyMessage="No coordinator accounts found matching your filter criteria."
          columns={[
            {
              header: "Coordinator Name",
              accessor: (c) => (
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
              ),
            },
            {
              header: "Assigned College",
              accessor: (c) => {
                const col = colleges.find((cl) => cl.code === c.college);
                return (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs font-semibold">
                      {c.college}
                    </Badge>
                    {col && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{col.name}</span>}
                  </div>
                );
              },
            },
            {
              header: "Login Identifier",
              accessor: (c) => (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-muted-foreground">{c.loginId}</span>
                  <button
                    onClick={() => copyToClipboard(c.loginId, "Login ID")}
                    className="text-muted-foreground hover:text-foreground"
                    title="Copy Login Identifier"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              ),
            },
            {
              header: "Status",
              accessor: (c) => (
                <StatusBadge
                  status={c.status}
                  label={c.status.toUpperCase()}
                />
              ),
            },
            {
              header: "Created At",
              accessor: (c) => <span className="text-xs text-muted-foreground">{fmt(c.createdAt)}</span>,
            },
            {
              header: "Last Active",
              accessor: (c) => <span className="text-xs text-muted-foreground">{fmt(c.lastActive)}</span>,
            },
            {
              header: "Actions",
              accessor: (c) => (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => handleToggleStatus(c)}
                  >
                    {c.status === "active" ? (
                      <span className="text-destructive flex items-center gap-1">
                        <UserX className="h-3 w-3" /> Deactivate
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <UserCheck className="h-3 w-3" /> Activate
                      </span>
                    )}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Panel>

      {/* Provision Coordinator Dialog */}
      <Dialog open={provisionOpen} onOpenChange={setProvisionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Provision Coordinator Account</DialogTitle>
            <DialogDescription>
              Create a college coordinator account. The coordinator will have administrative authority restricted strictly to their assigned college.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleProvision} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="coord-name">Full Name</Label>
              <Input
                id="coord-name"
                placeholder="e.g. Dr. Rajesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coord-email">Email Address</Label>
              <Input
                id="coord-email"
                type="email"
                placeholder="e.g. coordinator@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coord-college">Assigned College</Label>
              <Select value={selectedCollege} onValueChange={setSelectedCollege}>
                <SelectTrigger id="coord-college">
                  <SelectValue placeholder="Select a registered college" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((col) => {
                    const isAlreadyAssigned = assignedActiveCollegeCodes.has(col.code.toUpperCase());
                    return (
                      <SelectItem
                        key={col.id}
                        value={col.code}
                        disabled={isAlreadyAssigned}
                      >
                        {col.code} — {col.name} {isAlreadyAssigned ? "(Active Coordinator Exists)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {eligibleColleges.length === 0 && (
                <p className="text-xs text-amber-500 mt-1">
                  All registered colleges currently have an active coordinator.
                </p>
              )}
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Authentication Policy</p>
              <p>
                A secure login token will be generated. The coordinator can sign in via Supabase Auth using this email address. Initial credentials will inherit standard coordinator permissions.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProvisionOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !selectedCollege || assignedActiveCollegeCodes.has(selectedCollege.toUpperCase())}
              >
                {submitting ? "Provisioning…" : "Provision Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
