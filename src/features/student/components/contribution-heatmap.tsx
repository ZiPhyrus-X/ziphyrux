import { useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ContributionHeatmapProps {
  data?: { date: string; count: number }[];
  totalContributions?: number;
  className?: string;
}

export function ContributionHeatmap({
  data = [],
  totalContributions = 0,
  className,
}: ContributionHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<{ date: string; count: number } | null>(null);

  // Map dates to counts
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => map.set(d.date, d.count));
    return map;
  }, [data]);

  // Generate 52 weeks (364 days) ending today
  const weeks = useMemo(() => {
    const today = new Date();
    const result: { date: string; count: number; dayOfWeek: number }[][] = [];
    let currentWeek: { date: string; count: number; dayOfWeek: number }[] = [];

    for (let i = 363; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, "yyyy-MM-dd");
      const count = countMap.get(dateStr) || 0;
      const dayOfWeek = d.getDay(); // 0 is Sunday

      currentWeek.push({ date: dateStr, count, dayOfWeek });

      if (dayOfWeek === 6 || i === 0) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }

    return result;
  }, [countMap]);

  const getColorClass = (count: number) => {
    if (count === 0) return "bg-muted/40 hover:border-border";
    if (count === 1) return "bg-emerald-500/25 border-emerald-500/30 hover:border-emerald-500";
    if (count === 2) return "bg-emerald-500/50 border-emerald-500/50 hover:border-emerald-500";
    if (count <= 4) return "bg-emerald-500/75 border-emerald-500/70 hover:border-emerald-500";
    return "bg-emerald-500 border-emerald-600 hover:border-emerald-400";
  };

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className={cn("rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-sm backdrop-blur-xl transition-all", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-border/60 gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>Verified Activity Heatmap</span>
            <span className="text-xs font-normal text-muted-foreground">
              (Zero Attendance — Evidence Only)
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalContributions} verified contributions in the last year
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1 items-center">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-muted/40 border border-border/50" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/25 border border-emerald-500/30" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/50 border border-emerald-500/50" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/75 border border-emerald-500/70" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 border border-emerald-600" />
          </div>
          <span>More</span>
        </div>
      </div>

      <TooltipProvider delayDuration={100}>
        <div className="overflow-x-auto pb-2">
          {/* Month labels */}
          <div className="flex text-[10px] text-muted-foreground/80 mb-1.5 ml-6 pl-1 gap-8">
            {monthLabels.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>

          <div className="flex gap-1">
            {/* Day of week labels */}
            <div className="flex flex-col justify-between text-[9px] text-muted-foreground/70 pr-2 py-0.5 select-none w-5">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            {/* Weeks columns */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px]">
                  {week.map((day) => (
                    <Tooltip key={day.date}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setSelectedDay(day)}
                          className={cn(
                            "w-[11px] h-[11px] rounded-[2px] border border-transparent transition-all focus:outline-none focus:ring-1 focus:ring-ring",
                            getColorClass(day.count)
                          )}
                          aria-label={`${day.count} verified activities on ${day.date}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs font-mono py-1 px-2">
                        <span className="font-semibold text-foreground">
                          {day.count === 0 ? "No" : day.count} contribution{day.count === 1 ? "" : "s"}
                        </span>
                        <span className="text-muted-foreground ml-1.5">on {format(parseISO(day.date), "MMM d, yyyy")}</span>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </TooltipProvider>

      {selectedDay && (
        <div className="mt-3 pt-2 border-t border-border/40 text-xs text-muted-foreground flex items-center justify-between">
          <span>
            Selected: <strong className="text-foreground">{format(parseISO(selectedDay.date), "MMMM d, yyyy")}</strong>
          </span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
            {selectedDay.count} verified action{selectedDay.count === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </div>
  );
}
