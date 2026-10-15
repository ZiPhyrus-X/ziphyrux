import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  Layers,
  MapPin,
  Plus,
  Search,
  Sparkles,
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

export const Route = createFileRoute("/placement/drives")({
  head: () => ({
    meta: [
      { title: "Placement Drives — Ziphyrus X" },
      { name: "description", content: "Campus placement drive operations, multi-stage scheduling, and candidate rounds" },
    ],
  }),
  component: PlacementDrivesPage,
});

interface DriveFormData {
  title: string;
  companyId: string;
  mode: "on_campus" | "pooled_campus" | "virtual";
  venue: string;
  driveDate: string;
  status: "draft" | "scheduled" | "registration_open" | "in_progress" | "completed" | "cancelled";
  coordinatorNotes: string;
}

const initialForm: DriveFormData = {
  title: "",
  companyId: "",
  mode: "on_campus",
  venue: "Auditorium Hall 1",
  driveDate: "",
  status: "scheduled",
  coordinatorNotes: "",
};

function PlacementDrivesPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDrive, setEditingDrive] = useState<any | null>(null);
  const [formData, setFormData] = useState<DriveFormData>(initialForm);

  const queryClient = useQueryClient();

  const { data: drives = [], isLoading } = useQuery({
    queryKey: ["placement", "drives"],
    queryFn: async () => {
      const res = await api.placement.getDrives();
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
      return api.placement.createDrive(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placement", "drives"] });
      toast.success("Placement drive scheduled successfully!");
      setDialogOpen(false);
      setFormData(initialForm);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to schedule drive.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return api.placement.updateDrive(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placement", "drives"] });
      toast.success("Placement drive updated successfully!");
      setDialogOpen(false);
      setEditingDrive(null);
      setFormData(initialForm);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update drive.");
    },
  });

  const handleOpenSchedule = () => {
    setEditingDrive(null);
    setFormData({
      ...initialForm,
      companyId: companies[0]?.id || "",
      driveDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (drive: any) => {
    setEditingDrive(drive);
    setFormData({
      title: drive.title || "",
      companyId: drive.companyId || companies[0]?.id || "",
      mode: drive.mode || "on_campus",
      venue: drive.venue || "",
      driveDate: drive.driveDate ? drive.driveDate.split("T")[0] : "",
      status: drive.status || "scheduled",
      coordinatorNotes: drive.coordinatorNotes || "",
    });
    setDialogOpen(true);
  };

  const handleQuickStatusChange = (driveId: string, status: string) => {
    updateMutation.mutate({ id: driveId, payload: { status } });
  };

  const handleExportRecruiterPacket = async (driveId?: string, driveTitle?: string) => {
    try {
      toast.loading("Generating Recruiter Packet...", { id: "packet-export" });
      const res = await api.placement.exportRecruiterPacket(driveId);
      if (!res || !res.csv) throw new Error("No candidate data available for this drive.");
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = res.filename || `recruiter-packet-${(driveTitle || "drive").toLowerCase().replace(/\s+/g, "-")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Recruiter Packet downloaded successfully!", { id: "packet-export" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to export recruiter packet.", { id: "packet-export" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || (!editingDrive && !formData.companyId) || !formData.driveDate) {
      toast.error("Drive title, partner company, and drive date are required.");
      return;
    }

    const payload: any = {
      title: formData.title.trim(),
      mode: formData.mode,
      venue: formData.venue.trim() || "Main Auditorium",
      driveDate: new Date(formData.driveDate).toISOString(),
      status: formData.status,
      coordinatorNotes: formData.coordinatorNotes.trim(),
    };

    if (!editingDrive) {
      payload.companyId = formData.companyId;
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: editingDrive.id, payload });
    }
  };

  const filtered = drives.filter(
    (d) =>
      (d.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.companyName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PlacementPageHeader
        title="Campus Placement Drives"
        desc="Schedule, organize, and manage on-campus, pooled, and virtual recruitment drives with multi-stage assessment pipelines."
        actions={
          <Button onClick={handleOpenSchedule} className="gap-2 font-medium">
            <Plus className="h-4 w-4" /> Schedule Drive
          </Button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PlacementMetric
          label="Total Drives"
          value={drives.length}
          note="Full academic season"
          icon={Calendar}
          variant="default"
        />
        <PlacementMetric
          label="Active Drives"
          value={drives.filter((d) => d.status === "in_progress" || d.status === "registration_open").length}
          note="Currently in progress"
          icon={Sparkles}
          variant="primary"
        />
        <PlacementMetric
          label="Upcoming Drives"
          value={drives.filter((d) => d.status === "scheduled" || d.status === "draft").length}
          note="Scheduled this month"
          icon={Clock}
          variant="info"
        />
        <PlacementMetric
          label="Completed Drives"
          value={drives.filter((d) => d.status === "completed").length}
          note="Offers concluded"
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* GRAPHICAL VISUALS: DRIVE VENUES & STATUS PIPELINE */}
      {drives.length > 0 && (() => {
        const onCampusCount = drives.filter((d) => d.mode === "on_campus").length;
        const pooledCount = drives.filter((d) => d.mode === "pooled_campus").length;
        const virtualCount = drives.filter((d) => d.mode === "virtual").length;
        const modeData = [
          { name: "On-Campus Drive", count: Math.max(onCampusCount, 1), color: "#3b82f6" },
          { name: "Pooled Campus", count: pooledCount, color: "#8b5cf6" },
          { name: "Virtual / Remote", count: virtualCount, color: "#10b981" },
        ].filter((m) => m.count > 0);

        const statusCounts: Record<string, number> = {
          Scheduled: drives.filter((d) => d.status === "scheduled" || d.status === "draft").length,
          "Reg. Open": drives.filter((d) => d.status === "registration_open").length,
          "In Progress": drives.filter((d) => d.status === "in_progress").length,
          Concluded: drives.filter((d) => d.status === "completed").length,
        };

        const statusColors = ["#3b82f6", "#f59e0b", "#8b5cf6", "#10b981"];
        const statusData = Object.entries(statusCounts).map(([status, count], i) => ({
          status,
          count,
          color: statusColors[i % statusColors.length],
        }));

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <PieChartIcon className="h-4 w-4 text-primary" /> Recruitment Assessment Delivery Modes
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Drive operational breakdown across on-campus, pooled, and virtual setups
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {drives.length} Drives
                </Badge>
              </div>

              <div className="h-56 relative my-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {modeData.map((entry, index) => (
                        <Cell key={`mode-cell-${index}`} fill={entry.color} />
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
                              <span>Scheduled Drives:</span>
                              <strong className="text-foreground font-mono">{d.value} Drives</strong>
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold font-display text-primary">
                    {drives.length}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Scheduled</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border/50 text-xs">
                {modeData.map((s) => (
                  <div key={s.name} className="p-1.5 rounded bg-muted/20">
                    <div className="flex items-center justify-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="font-bold text-foreground font-mono">{s.count}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block truncate">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-emerald-500" /> Placement Drive Operational Velocity
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Hiring events distribution across active execution and concluding stages
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Stage Flow
                </Badge>
              </div>

              <div className="h-56 w-full my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} margin={{ top: 10, right: 15, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                    <XAxis
                      dataKey="status"
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
                            <p className="font-semibold text-foreground flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                              <span>{d.status} Stage</span>
                            </p>
                            <p className="text-muted-foreground flex justify-between gap-3">
                              <span>Drives:</span>
                              <strong className="text-foreground font-mono">{d.count}</strong>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" name="Drives" radius={[6, 6, 0, 0]}>
                      {statusData.map((entry, index) => (
                        <Cell key={`status-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-around text-center pt-2 border-t border-border/50 text-xs">
                {statusData.map((s) => (
                  <div key={s.status}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="font-bold text-foreground font-mono">{s.count}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block">{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search drives by name or company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/80"
          />
        </div>
      </div>

      {/* Drives List */}
      <PlacementPanel
        title="Institutional Hiring Drives"
        subtitle={`Managing ${filtered.length} scheduled recruitment drives`}
      >
        {isLoading ? (
          <PlacementLoadingSkeleton />
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((drive) => (
              <div
                key={drive.id}
                className="rounded-xl border border-border/70 bg-card/50 p-5 space-y-4 hover:border-border transition-all shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground text-base">{drive.title}</h3>
                      <Badge
                        variant="outline"
                        className={
                          drive.status === "in_progress"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : drive.status === "registration_open"
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                            : drive.status === "completed"
                            ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {drive.status?.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {drive.mode?.replace("_", " ")}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(drive)}
                        title="Update Drive"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="font-medium text-foreground">{drive.companyName}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {drive.venue}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />{" "}
                        {drive.driveDate
                          ? new Date(drive.driveDate).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "TBD"}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground">Status:</span>
                    <select
                      value={drive.status}
                      onChange={(e) => handleQuickStatusChange(drive.id, e.target.value)}
                      className="h-7 text-xs rounded border border-border bg-background px-2 py-0.5"
                    >
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="registration_open">Registration Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleOpenEdit(drive)}
                    >
                      <Edit2 className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                      onClick={() => handleExportRecruiterPacket(drive.id, drive.title)}
                      title="Download candidate packet for visiting recruiters"
                    >
                      <Download className="h-3 w-3" /> Export Recruiter Packet (.csv)
                    </Button>
                  </div>
                </div>

                {/* Multi-stage pipeline track */}
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Selection Stages Pipeline ({drive.stages?.length || 0} Stages)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    {drive.stages?.map((stage: any) => (
                      <div
                        key={stage.id}
                        className="rounded-lg border border-border/60 bg-background/60 p-2.5 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            Stage 0{stage.stageNumber}
                          </span>
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              stage.status === "completed"
                                ? "bg-emerald-500"
                                : stage.status === "in_progress"
                                ? "bg-amber-500"
                                : "bg-muted-foreground/40"
                            }`}
                          />
                        </div>
                        <p className="font-semibold text-foreground truncate">{stage.title}</p>
                        <span className="text-[10px] text-muted-foreground capitalize block truncate">
                          {stage.stageType?.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {drive.coordinatorNotes && (
                  <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40">
                    <span className="font-semibold text-foreground">Operational Notes:</span> {drive.coordinatorNotes}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <PlacementEmptyState
            title="No Hiring Drives Scheduled"
            description="Recruitment drives scheduled by the institution will appear here."
            icon={Calendar}
          />
        )}
      </PlacementPanel>

      {/* Schedule / Update Drive Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDrive ? "Update Placement Drive" : "Schedule Campus Placement Drive"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Drive Title *</label>
              <Input
                required
                placeholder="e.g. Cisco Campus Hiring 2026"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {!editingDrive && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Corporate Partner *</label>
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
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Drive Mode</label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="on_campus">On Campus</option>
                  <option value="pooled_campus">Pooled Campus</option>
                  <option value="virtual">Virtual</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Drive Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="registration_open">Registration Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Drive Date *</label>
                <Input
                  required
                  type="date"
                  value={formData.driveDate}
                  onChange={(e) => setFormData({ ...formData, driveDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Venue / Link</label>
                <Input
                  placeholder="e.g. Auditorium Hall 1 / MS Teams"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Operational Notes / Instructions</label>
              <Input
                placeholder="e.g. Students must carry resume copies and student ID."
                value={formData.coordinatorNotes}
                onChange={(e) => setFormData({ ...formData, coordinatorNotes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingDrive
                  ? "Update Drive"
                  : "Schedule Drive"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
