import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PlacementPageHeader,
  PlacementMetric,
  PlacementPanel,
  PlacementLoadingSkeleton,
  PlacementEmptyState,
} from "@/features/placement/page";

export const Route = createFileRoute("/placement/opportunities")({
  head: () => ({
    meta: [
      { title: "Placement Opportunities — Ziphyrus X" },
      { name: "description", content: "Campus job and internship postings with versioned eligibility rules" },
    ],
  }),
  component: PlacementOpportunitiesPage,
});

interface OpportunityFormData {
  title: string;
  companyId: string;
  employmentType: "full_time" | "internship" | "internship_to_full_time";
  workLocation: string;
  compensationPackage: string;
  compensationUnit: string;
  minCgpa: string;
  maxBacklogs: string;
  eligibleBranches: string;
  graduationYear: string;
  applicationDeadline: string;
  status: "draft" | "published" | "closed";
  description: string;
}

const initialForm: OpportunityFormData = {
  title: "",
  companyId: "",
  employmentType: "full_time",
  workLocation: "Bengaluru / Hybrid",
  compensationPackage: "12",
  compensationUnit: "LPA",
  minCgpa: "7.0",
  maxBacklogs: "0",
  eligibleBranches: "CSE, ISE, ECE",
  graduationYear: "2026",
  applicationDeadline: "",
  status: "published",
  description: "Core software engineering and systems development role.",
};

function PlacementOpportunitiesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<any | null>(null);
  const [formData, setFormData] = useState<OpportunityFormData>(initialForm);

  const queryClient = useQueryClient();

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["placement", "opportunities", statusFilter],
    queryFn: async () => {
      const res = await api.placement.getOpportunities({
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      const list = (res as any)?.data || res;
      return (Array.isArray(list) ? list : []) as any[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["placement", "companies"],
    queryFn: async () => {
      const res = await api.placement.companies();
      const list = (res as any)?.data || res;
      return (Array.isArray(list) ? list : []) as any[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.placement.createOpportunity(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placement", "opportunities"] });
      toast.success("Opportunity posted successfully!");
      setDialogOpen(false);
      setFormData(initialForm);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to post opportunity.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return api.placement.updateOpportunity(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placement", "opportunities"] });
      toast.success("Opportunity updated successfully!");
      setDialogOpen(false);
      setEditingOpp(null);
      setFormData(initialForm);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update opportunity.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.placement.updateOpportunityStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placement", "opportunities"] });
      toast.success("Opportunity status updated!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to change status.");
    },
  });

  const handleOpenCreate = () => {
    setEditingOpp(null);
    setFormData({
      ...initialForm,
      companyId: companies[0]?.id || "",
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (opp: any) => {
    setEditingOpp(opp);
    setFormData({
      title: opp.title || "",
      companyId: opp.companyId || companies[0]?.id || "",
      employmentType: opp.employmentType || "full_time",
      workLocation: opp.workLocation || "Bengaluru / Hybrid",
      compensationPackage: String(opp.compensationPackage || 12),
      compensationUnit: opp.compensationUnit || "LPA",
      minCgpa: String(opp.minCgpa ?? 7.0),
      maxBacklogs: String(opp.maxBacklogs ?? 0),
      eligibleBranches: Array.isArray(opp.eligibleBranches) ? opp.eligibleBranches.join(", ") : opp.eligibleBranches || "CSE, ISE, ECE",
      graduationYear: String(opp.graduationYear || 2026),
      applicationDeadline: opp.applicationDeadline ? opp.applicationDeadline.split("T")[0] : "",
      status: opp.status || "published",
      description: opp.description || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.companyId || !formData.compensationPackage) {
      toast.error("Role title, partner company, and compensation package are required.");
      return;
    }

    const branches = formData.eligibleBranches
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);

    const payload: any = {
      title: formData.title.trim(),
      companyId: formData.companyId,
      employmentType: formData.employmentType,
      workLocation: formData.workLocation.trim(),
      compensationPackage: Number(formData.compensationPackage),
      compensationUnit: formData.compensationUnit,
      minCgpa: Number(formData.minCgpa),
      maxBacklogs: Number(formData.maxBacklogs),
      eligibleBranches: branches.length > 0 ? branches : ["CSE", "ISE", "ECE"],
      graduationYear: Number(formData.graduationYear),
      applicationDeadline: formData.applicationDeadline ? new Date(formData.applicationDeadline).toISOString() : undefined,
      status: formData.status,
      description: formData.description.trim(),
    };

    if (editingOpp) {
      updateMutation.mutate({ id: editingOpp.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filtered = opportunities.filter(
    (o) =>
      (o.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.companyName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PlacementPageHeader
        title="Job & Internship Opportunities"
        desc="Campus placement openings with versioned eligibility criteria. Create and manage institutional opportunities and corporate vacancies."
        actions={
          <Button onClick={handleOpenCreate} className="gap-2 font-medium">
            <Plus className="h-4 w-4" /> Post Opportunity
          </Button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PlacementMetric
          label="Total Postings"
          value={opportunities.length}
          note="Active & archived"
          icon={Briefcase}
          variant="default"
        />
        <PlacementMetric
          label="Published Openings"
          value={opportunities.filter((o) => o.status === "published").length}
          note="Accepting student applications"
          icon={CheckCircle2}
          variant="primary"
        />
        <PlacementMetric
          label="Draft Openings"
          value={opportunities.filter((o) => o.status === "draft").length}
          note="Pending corporate signoff"
          icon={Clock}
          variant="default"
        />
        <PlacementMetric
          label="Highest CTC Offered"
          value={
            opportunities.length > 0
              ? `${Math.max(...opportunities.map((o) => o.compensationPackage || 0))} LPA`
              : "0 LPA"
          }
          note="Campus high package"
          icon={Briefcase}
          variant="success"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by role title or company name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/80"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Opportunities List */}
      <PlacementPanel
        title="Open Postings & Eligibility Configurations"
        subtitle={`Showing ${filtered.length} postings configured for your institution`}
      >
        {isLoading ? (
          <PlacementLoadingSkeleton />
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((opp) => (
              <div
                key={opp.id}
                className="rounded-xl border border-border/70 bg-card/50 p-5 space-y-4 hover:border-border transition-all shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground text-base">{opp.title}</h3>
                      <Badge
                        variant="outline"
                        className={
                          opp.status === "published"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-medium"
                            : opp.status === "draft"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/30 font-medium"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {opp.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Criteria v{opp.criteriaVersion || 1}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(opp)}
                        title="Edit Opportunity"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="font-medium text-foreground">{opp.companyName}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {opp.workLocation || "Hybrid"}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{opp.employmentType?.replace("_", " ")}</span>
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <p className="font-display text-2xl font-semibold text-foreground">
                      {opp.compensationPackage} {opp.compensationUnit || "LPA"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Offered Package</p>
                  </div>
                </div>

                {/* Structured Eligibility Rules Display */}
                <div className="rounded-lg bg-background/60 border border-border/50 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Min CGPA</span>
                    <span className="font-medium text-foreground">{opp.minCgpa ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Max Backlogs</span>
                    <span className="font-medium text-foreground">{opp.maxBacklogs ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Branches</span>
                    <span className="font-medium text-foreground">
                      {opp.eligibleBranches && opp.eligibleBranches.length > 0
                        ? opp.eligibleBranches.join(", ")
                        : "All Branches"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Batch Year</span>
                    <span className="font-medium text-foreground">{opp.graduationYear || 2026}</span>
                  </div>
                </div>

                {/* Info Bar & Quick Status Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      Deadline:{" "}
                      {opp.applicationDeadline
                        ? new Date(opp.applicationDeadline).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Open"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground">Status:</span>
                    <select
                      value={opp.status}
                      onChange={(e) => statusMutation.mutate({ id: opp.id, status: e.target.value })}
                      className="h-7 text-xs rounded border border-border bg-background px-2 py-0.5"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <PlacementEmptyState
            title="No Opportunities Found"
            description="Placement opportunities published for your institution will appear here."
            icon={Briefcase}
          />
        )}
      </PlacementPanel>

      {/* Post / Edit Opportunity Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOpp ? "Edit Placement Opportunity" : "Post Placement Opportunity"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">Role Title *</label>
                <Input
                  required
                  placeholder="e.g. Software Development Engineer - I"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Hiring Company *</label>
                <select
                  required
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="" disabled>Select a corporate partner</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.tier})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Employment Type</label>
                <select
                  value={formData.employmentType}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="full_time">Full Time</option>
                  <option value="internship">Internship</option>
                  <option value="internship_to_full_time">Internship to PPO</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Package (CTC) *</label>
                <Input
                  required
                  type="number"
                  step="0.1"
                  placeholder="12.5"
                  value={formData.compensationPackage}
                  onChange={(e) => setFormData({ ...formData, compensationPackage: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Unit</label>
                <Input
                  placeholder="LPA"
                  value={formData.compensationUnit}
                  onChange={(e) => setFormData({ ...formData, compensationUnit: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Work Location</label>
                <Input
                  placeholder="Bengaluru / Hybrid"
                  value={formData.workLocation}
                  onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                />
              </div>
            </div>

            {/* Eligibility Criteria Sub-Form */}
            <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Eligibility Invariants
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground font-medium">Min CGPA</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.minCgpa}
                    onChange={(e) => setFormData({ ...formData, minCgpa: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground font-medium">Max Backlogs</label>
                  <Input
                    type="number"
                    value={formData.maxBacklogs}
                    onChange={(e) => setFormData({ ...formData, maxBacklogs: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground font-medium">Batch Year</label>
                  <Input
                    type="number"
                    value={formData.graduationYear}
                    onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground font-medium">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-medium">
                  Eligible Branches (comma-separated)
                </label>
                <Input
                  placeholder="CSE, ISE, ECE, EEE"
                  value={formData.eligibleBranches}
                  onChange={(e) => setFormData({ ...formData, eligibleBranches: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Application Deadline</label>
                <Input
                  type="date"
                  value={formData.applicationDeadline}
                  onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Job Description / Scope</label>
                <Input
                  placeholder="Brief role responsibilities..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingOpp
                  ? "Update Opportunity"
                  : "Post Opportunity"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
