import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Edit2,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  User,
  Users,
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
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";

export const Route = createFileRoute("/placement/companies")({
  head: () => ({
    meta: [
      { title: "Corporate Partners — Ziphyrus X" },
      { name: "description", content: "College corporate relations, recruiters, and hiring partner management" },
    ],
  }),
  component: PlacementCompaniesPage,
});

interface CompanyFormData {
  name: string;
  industry: string;
  tier: "Tier 1" | "Tier 2" | "Tier 3";
  location: string;
  website: string;
  description: string;
  recruiterName: string;
  recruiterDesignation: string;
  recruiterEmail: string;
  recruiterPhone: string;
}

const initialForm: CompanyFormData = {
  name: "",
  industry: "Information Technology",
  tier: "Tier 2",
  location: "Bengaluru",
  website: "",
  description: "",
  recruiterName: "",
  recruiterDesignation: "Campus Recruiter",
  recruiterEmail: "",
  recruiterPhone: "",
};

function PlacementCompaniesPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>(initialForm);

  const queryClient = useQueryClient();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["placement", "companies"],
    queryFn: async () => {
      const res = await api.placement.companies();
      const list = (res as any)?.data || res;
      return (Array.isArray(list) ? list : []) as any[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.placement.createCompany(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placement", "companies"] });
      toast.success("Corporate partner registered successfully!");
      setDialogOpen(false);
      setFormData(initialForm);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to register company.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return api.placement.updateCompany(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placement", "companies"] });
      toast.success("Corporate partner updated successfully!");
      setDialogOpen(false);
      setEditingCompany(null);
      setFormData(initialForm);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update company.");
    },
  });

  const handleOpenCreate = () => {
    setEditingCompany(null);
    setFormData(initialForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (company: any) => {
    setEditingCompany(company);
    const rc = company.recruiterContacts?.[0] || {};
    setFormData({
      name: company.name || "",
      industry: company.industry || "Information Technology",
      tier: company.tier || "Tier 2",
      location: company.location || "",
      website: company.website || "",
      description: company.description || "",
      recruiterName: rc.name || "",
      recruiterDesignation: rc.designation || "Campus Recruiter",
      recruiterEmail: rc.email || "",
      recruiterPhone: rc.phone || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.industry.trim()) {
      toast.error("Company name and industry are required.");
      return;
    }

    const payload: any = {
      name: formData.name.trim(),
      industry: formData.industry.trim(),
      tier: formData.tier,
      location: formData.location.trim() || "India",
      website: formData.website.trim(),
      description: formData.description.trim(),
    };

    if (formData.recruiterName.trim() || formData.recruiterEmail.trim()) {
      payload.recruiterContacts = [
        {
          name: formData.recruiterName.trim() || "Recruiter",
          designation: formData.recruiterDesignation.trim() || "Talent Acquisition",
          email: formData.recruiterEmail.trim() || "recruiter@company.com",
          phone: formData.recruiterPhone.trim(),
        },
      ];
    }

    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PlacementPageHeader
        title="Corporate Partners & Recruiters"
        desc="College-specific employer network. Create and manage corporate partner profiles, recruiter contacts, and institutional hiring tiers."
        actions={
          <Button onClick={handleOpenCreate} className="gap-2 font-medium">
            <Plus className="h-4 w-4" /> Add Company
          </Button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PlacementMetric
          label="Corporate Partners"
          value={companies.length}
          note="Active college relationships"
          icon={Building2}
          variant="primary"
        />
        <PlacementMetric
          label="Tier 1 (Super Dream)"
          value={companies.filter((c) => c.tier === "Tier 1").length}
          note="CTC > 12 LPA"
          icon={Building2}
          variant="default"
        />
        <PlacementMetric
          label="Tier 2 (Dream)"
          value={companies.filter((c) => c.tier === "Tier 2").length}
          note="CTC 6 - 12 LPA"
          icon={Building2}
          variant="default"
        />
        <PlacementMetric
          label="Active Recruiters"
          value={companies.reduce((acc, c) => acc + (c.recruiterContacts?.length || 0), 0)}
          note="Direct talent contacts"
          icon={Users}
          variant="success"
        />
      </div>

      {/* GRAPHICAL VISUALS: CORPORATE NETWORK & HIRING TIERS */}
      {companies.length > 0 && (() => {
        const industryCounts: Record<string, number> = {};
        companies.forEach((c) => {
          const ind = c.industry || "General Tech";
          industryCounts[ind] = (industryCounts[ind] || 0) + 1;
        });
        const INDUSTRY_PALETTE = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];
        const industryData = Object.entries(industryCounts).map(([name, count]) => ({
          name: name.length > 14 ? name.slice(0, 12) + "…" : name,
          fullName: name,
          count,
        }));

        const tier1Count = companies.filter((c) => c.tier === "Tier 1").length;
        const tier2Count = companies.filter((c) => c.tier === "Tier 2").length;
        const tier3Count = companies.filter((c) => c.tier === "Tier 3").length;
        const tierData = [
          { name: "Tier 1 (Super Dream)", count: tier1Count, color: "#10b981" },
          { name: "Tier 2 (Dream)", count: tier2Count, color: "#3b82f6" },
          { name: "Tier 3 (Core)", count: tier3Count, color: "#f59e0b" },
        ];

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-primary" /> Corporate Partners by Industry Sector
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Partner diversification across technical, financial, and product industries
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {companies.length} Partners
                </Badge>
              </div>

              <div className="h-56 w-full my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={industryData} margin={{ top: 10, right: 15, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                    <XAxis
                      dataKey="name"
                      stroke="var(--border)"
                      tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                      tickLine={{ stroke: "var(--border)" }}
                      interval={0}
                    />
                    <YAxis
                      stroke="var(--border)"
                      tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
                      tickLine={{ stroke: "var(--border)" }}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "rgba(125, 125, 125, 0.08)" }}
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                            <p className="font-semibold text-foreground">{d.fullName}</p>
                            <p className="text-muted-foreground flex justify-between gap-3">
                              <span>Corporate Partners:</span>
                              <strong className="text-foreground font-mono">{d.count}</strong>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" name="Companies" radius={[6, 6, 0, 0]}>
                      {industryData.map((_, index) => (
                        <Cell key={`ind-cell-${index}`} fill={INDUSTRY_PALETTE[index % INDUSTRY_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50 text-[11px]">
                {industryData.map((d, i) => (
                  <span key={d.fullName} className="flex items-center gap-1 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INDUSTRY_PALETTE[i % INDUSTRY_PALETTE.length] }} />
                    <span className="truncate max-w-[100px]">{d.fullName}:</span>
                    <strong className="text-foreground">{d.count}</strong>
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <PieChartIcon className="h-4 w-4 text-emerald-500" /> Institutional Hiring Tier Share
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Recruiter classification based on CTC compensation brackets
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Tier Roster
                </Badge>
              </div>

              <div className="h-56 relative my-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tierData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {tierData.map((entry, index) => (
                        <Cell key={`tier-cell-${index}`} fill={entry.color} />
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
                              <span>Recruiters:</span>
                              <strong className="text-foreground font-mono">{d.value} Employers</strong>
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400">
                    {companies.length > 0 ? Math.round((tier1Count / companies.length) * 100) : 0}%
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Super Dream</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border/50 text-xs">
                {tierData.map((s) => (
                  <div key={s.name} className="p-1.5 rounded bg-muted/20">
                    <div className="flex items-center justify-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="font-bold text-foreground font-mono">{s.count}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block truncate">{s.name.split(" ")[0]} {s.name.split(" ")[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search company by name, industry, or domain…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/80"
          />
        </div>
      </div>

      {/* Companies Grid */}
      <PlacementPanel
        title="Institutional Company Roster"
        subtitle={`Managing ${filtered.length} corporate relationships for campus recruitment`}
      >
        {isLoading ? (
          <PlacementLoadingSkeleton />
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((company) => (
              <div
                key={company.id}
                className="rounded-xl border border-border/70 bg-card/50 p-5 space-y-4 hover:border-primary/40 hover:bg-card/80 transition-all shadow-sm backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground text-base">{company.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {company.location || "India"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        company.tier === "Tier 1"
                          ? "bg-purple-500/10 text-purple-600 border-purple-500/30 font-semibold"
                          : "bg-blue-500/10 text-blue-600 border-blue-500/30 font-semibold"
                      }
                    >
                      {company.tier}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEdit(company)}
                      title="Edit Company"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Industry:</span>
                    <span className="font-medium text-foreground">{company.industry}</span>
                  </div>
                  {company.website && (
                    <div className="flex justify-between">
                      <span>Website:</span>
                      <a
                        href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 truncate max-w-[150px]"
                      >
                        <Globe className="h-3 w-3" /> {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  )}
                </div>

                {/* Recruiter Contacts Box */}
                <div className="pt-3 border-t border-border/40 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> Recruiter Contacts ({company.recruiterContacts?.length || 0})
                  </p>
                  {company.recruiterContacts && company.recruiterContacts.length > 0 ? (
                    company.recruiterContacts.slice(0, 2).map((rc: any, idx: number) => (
                      <div key={idx} className="p-2 rounded-lg bg-background/60 border border-border/50 text-xs space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-foreground">{rc.name}</span>
                          <span className="text-[10px] text-muted-foreground">{rc.designation}</span>
                        </div>
                        {rc.email && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Mail className="h-3 w-3" /> {rc.email}
                          </div>
                        )}
                        {rc.phone && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Phone className="h-3 w-3" /> {rc.phone}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">No specific recruiter contacts attached.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <PlacementEmptyState
            title="No Companies Found"
            description="Corporate partners registered by the institution will appear here."
            icon={Building2}
          />
        )}
      </PlacementPanel>

      {/* Add / Edit Company Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Edit Corporate Partner" : "Register Corporate Partner"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Company Name *</label>
                <Input
                  required
                  placeholder="e.g. Google India"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Industry / Sector *</label>
                <Input
                  required
                  placeholder="e.g. Cloud Computing / AI"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Hiring Tier</label>
                <select
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="Tier 1">Tier 1 (Super Dream &gt;12 LPA)</option>
                  <option value="Tier 2">Tier 2 (Dream 6-12 LPA)</option>
                  <option value="Tier 3">Tier 3 (Core/Mass 3.5-6 LPA)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Location</label>
                <Input
                  placeholder="e.g. Bengaluru / Hyderabad"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Website</label>
              <Input
                placeholder="https://company.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>

            {/* Recruiter Details Section */}
            <div className="pt-2 border-t border-border/50 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Primary Recruiter Contact (Optional)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-foreground">Recruiter Name</label>
                  <Input
                    placeholder="e.g. Sarah Jenkins"
                    value={formData.recruiterName}
                    onChange={(e) => setFormData({ ...formData, recruiterName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-foreground">Designation</label>
                  <Input
                    placeholder="e.g. Lead Campus Recruiter"
                    value={formData.recruiterDesignation}
                    onChange={(e) => setFormData({ ...formData, recruiterDesignation: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-foreground">Email</label>
                  <Input
                    type="email"
                    placeholder="recruiter@company.com"
                    value={formData.recruiterEmail}
                    onChange={(e) => setFormData({ ...formData, recruiterEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-foreground">Phone</label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={formData.recruiterPhone}
                    onChange={(e) => setFormData({ ...formData, recruiterPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingCompany
                  ? "Update Company"
                  : "Create Company"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
