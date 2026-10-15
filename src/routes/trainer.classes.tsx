import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  BookOpen,
  Building2,
  Check,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useActiveClassContext } from "@/features/trainer/context/active-class-context";
import { api } from "@/lib/api/client";
import {
  TrainerPageHeader,
  TrainerMetric,
  TrainerPanel,
  TrainerLoadingSkeleton,
  TrainerEmptyState,
} from "@/features/trainer/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trainer/classes")({
  head: () => ({
    meta: [
      { title: "Classes & Schedule — Ziphyrus X Trainer" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrainerClassesPage,
});

function TrainerClassesPage() {
  const { activeAllocationId, setActiveAllocationId, scope } = useActiveClassContext();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.trainer
      .classes()
      .then((res) => {
        if (active) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load trainer classes:", err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <TrainerLoadingSkeleton />;
  }

  const allocations = data?.allocations || [];
  const schedule = data?.schedule || [];
  const summary = data?.summary || {
    totalAllocations: allocations.length,
    activeAllocations: allocations.filter((a: any) => a.status === "active").length,
    totalWeeklyHours: 18,
  };

  return (
    <div className="space-y-8">
      <TrainerPageHeader
        title="Classes & Schedules"
        desc="Authoritative view of all authorized class allocations and weekly training timetables provisioned by your College Coordinator."
        badgeText="Authorized Allocations"
      />

      {/* METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TrainerMetric
          label="Total Class Allocations"
          value={summary.totalAllocations}
          note="Assigned to your profile"
          icon={Layers}
        />
        <TrainerMetric
          label="Active Running Classes"
          value={summary.activeAllocations}
          note="Currently in session"
          icon={Calendar}
          variant="success"
        />
        <TrainerMetric
          label="Weekly Scheduled Hours"
          value={`${summary.totalWeeklyHours} hrs`}
          note="Timetable load"
          icon={Clock}
          variant="primary"
        />
      </div>

      {/* ASSIGNED ALLOCATIONS LIST */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Assigned Class Allocations
            </h2>
            <p className="text-xs text-muted-foreground">
              Select any class below to switch the application-wide Active Class Context
            </p>
          </div>
        </div>

        {allocations.length === 0 ? (
          <TrainerEmptyState
            title="No Class Allocations Found"
            description="You do not have any active class allocations. Please contact your College Coordinator to receive class assignments."
            icon={Layers}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allocations.map((alloc: any) => {
              const isSelected = activeAllocationId === alloc.id;
              const statusColor =
                alloc.status === "active"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-muted text-muted-foreground border-border";

              return (
                <div
                  key={alloc.id}
                  className={cn(
                    "rounded-xl border p-5 backdrop-blur-xl transition-all flex flex-col justify-between space-y-4",
                    isSelected
                      ? "border-primary/60 bg-primary/10 shadow-md"
                      : "border-border/70 bg-card/60 hover:bg-card/90 hover:border-border"
                  )}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={cn("text-[11px] capitalize", statusColor)}>
                            {alloc.status}
                          </Badge>
                          {isSelected && (
                            <Badge variant="secondary" className="text-[11px] bg-primary/20 text-primary">
                              Active Context
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-display text-xl font-semibold text-foreground">
                          {alloc.className || `${alloc.branchCode} - Sec ${alloc.sectionName || "A"}`}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {alloc.branchName || alloc.branchCode} • Sem {alloc.semesterNumber || 5}
                        </p>
                      </div>

                      {alloc.skillName && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1.5 py-1 px-2.5">
                          <BookOpen className="h-3 w-3 text-primary" /> {alloc.skillName}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2.5 rounded-lg bg-background/50 border border-border/50">
                        <span className="text-[10px] text-muted-foreground block font-semibold">VALID PERIOD</span>
                        <span className="font-medium text-foreground">{alloc.startDate} → {alloc.endDate}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-background/50 border border-border/50">
                        <span className="text-[10px] text-muted-foreground block font-semibold">CAMPUS SCOPE</span>
                        <span className="font-medium text-foreground">{alloc.collegeCode || scope?.collegeCode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      ID: <code className="font-mono text-[11px]">{alloc.id}</code>
                    </span>
                    {isSelected ? (
                      <span className="text-xs font-semibold text-primary flex items-center gap-1">
                        <Check className="h-4 w-4" /> Currently Active
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveAllocationId(alloc.id)}
                        className="text-xs h-8 bg-card/60"
                      >
                        Set as Active Class Context
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* TIMETABLE & SCHEDULE */}
      <TrainerPanel
        title="Weekly Training Timetable"
        subtitle="Live session timetable synced from Coordinator scheduling"
      >
        {schedule.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No weekly timetable slots found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Day / Time</th>
                  <th className="py-2.5 px-3">Subject / Skill</th>
                  <th className="py-2.5 px-3">Class & Section</th>
                  <th className="py-2.5 px-3">Venue / Room</th>
                  <th className="py-2.5 px-3">Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {schedule.map((slot: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-3 font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{slot.day || "Monday"}, {slot.startTime} - {slot.endTime}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-foreground">
                      {slot.subject || "Full Stack Web Development"}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {slot.className || "CSE - 5A"}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {slot.room || "Lab 3"}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {slot.enrolled || 60} students
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TrainerPanel>
    </div>
  );
}
