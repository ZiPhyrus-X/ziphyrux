import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useActiveClassContext } from "../context/active-class-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Layers, Calendar, BookOpen, Clock, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChangeClassDialog() {
  const {
    allocations,
    activeAllocationId,
    setActiveAllocationId,
    isChangeClassOpen,
    setIsChangeClassOpen,
    scope,
  } = useActiveClassContext();

  const handleSelect = (id: string) => {
    setActiveAllocationId(id);
    setIsChangeClassOpen(false);
  };

  return (
    <Dialog open={isChangeClassOpen} onOpenChange={setIsChangeClassOpen}>
      <DialogContent className="max-w-2xl bg-background/90 backdrop-blur-2xl border-border/80 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> Select Active Class Context
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Switch between your assigned classes. Modules, rosters, diagnostics, and telemetry automatically filter to your selection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto pr-1">
          {/* Option: All Assigned Classes */}
          <div
            onClick={() => handleSelect("all")}
            className={cn(
              "group relative flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
              activeAllocationId === "all"
                ? "border-primary/60 bg-primary/10 shadow-sm"
                : "border-border/60 bg-card/40 hover:bg-card/80 hover:border-border"
            )}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-base text-foreground">All Assigned Classes</span>
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                  Aggregated Scope
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                View combined student analytics across all {allocations.length} authorized allocations at {scope?.collegeName || scope?.collegeCode || "your campus"}.
              </p>
            </div>
            {activeAllocationId === "all" && (
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
            )}
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">
            Individual Assigned Classes ({allocations.length})
          </div>

          {allocations.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-border text-muted-foreground text-sm">
              No active class allocations found for your account. Please contact your College Coordinator.
            </div>
          ) : (
            allocations.map((alloc) => {
              const isSelected = activeAllocationId === alloc.id;
              const statusColor =
                alloc.status === "active"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : alloc.status === "upcoming"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  : "bg-muted text-muted-foreground border-border";

              return (
                <div
                  key={alloc.id}
                  onClick={() => handleSelect(alloc.id)}
                  className={cn(
                    "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all cursor-pointer",
                    isSelected
                      ? "border-primary/60 bg-primary/10 shadow-sm"
                      : "border-border/60 bg-card/40 hover:bg-card/80 hover:border-border"
                  )}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground text-sm sm:text-base">
                        {alloc.className || `${alloc.branchCode || alloc.branchName} - Sec ${alloc.sectionName || "A"}`}
                      </span>
                      <Badge variant="outline" className={cn("text-[11px] font-medium capitalize", statusColor)}>
                        {alloc.status}
                      </Badge>
                      {alloc.skillName && (
                        <Badge variant="secondary" className="text-[11px] flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> {alloc.skillName}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground/70" />
                        {alloc.branchName || alloc.branchCode} • Sem {alloc.semesterNumber || 5}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                        {alloc.startDate} to {alloc.endDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    {isSelected ? (
                      <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                        <Check className="h-4 w-4" />
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-xs h-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        Select
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
