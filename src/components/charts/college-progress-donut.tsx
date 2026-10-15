import { useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Download, FileSpreadsheet, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ProgressDonutDataPoint {
  name: string;
  value: number;
  color?: string;
  description?: string;
}

export interface CollegeProgressDonutChartProps {
  title: string;
  data: ProgressDonutDataPoint[];
  scope?: string;
  reportingPeriod?: string;
  centerLabel?: string;
  centerSublabel?: string;
  onSliceClick?: (entry: ProgressDonutDataPoint) => void;
  className?: string;
  selectedSlice?: string | null;
  allowExport?: boolean;
}

const DEFAULT_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#ef4444", // rose
  "#64748b", // slate
];

export function CollegeProgressDonutChart({
  title,
  data = [],
  scope = "Platform Scope",
  reportingPeriod = "Academic Session 2026",
  centerLabel,
  centerSublabel = "Total Sample",
  onSliceClick,
  className,
  selectedSlice,
  allowExport = true,
}: CollegeProgressDonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [data]);

  const chartData = useMemo(() => {
    return data.map((item, idx) => ({
      ...item,
      color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));
  }, [data, total]);

  const displayCenterLabel = centerLabel !== undefined ? centerLabel : `${total}`;

  // Export chart data as CSV
  const handleExportCsv = () => {
    const csvContent =
      "Category,Count,Percentage\n" +
      chartData.map((d) => `"${d.name}",${d.value},${d.percentage}%`).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_data.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5 shadow-sm flex flex-col justify-between transition-colors",
        className
      )}
    >
      {/* Header with Scope & Period */}
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
              <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                {scope}
              </Badge>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Period: {reportingPeriod}</p>
          </div>

          {allowExport && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportCsv}
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
              title="Export Chart Data as CSV"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
            </Button>
          )}
        </div>

        {/* Donut Container with Center Label */}
        <div className="relative mt-2 h-52 w-full">
          {total === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No active distribution records available.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded border border-border bg-popover p-2 text-xs shadow-md">
                            <p className="font-semibold text-foreground">{item.name}</p>
                            <p className="text-muted-foreground">
                              Count: <strong className="font-mono text-foreground">{item.value}</strong> (
                              {item.percentage}%)
                            </p>
                            {item.description && (
                              <p className="mt-1 text-[10px] text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={(entry) => onSliceClick && onSliceClick(entry)}
                    cursor={onSliceClick ? "pointer" : "default"}
                    animationDuration={800}
                  >
                    {chartData.map((entry, index) => {
                      const isSelected = selectedSlice === entry.name;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="var(--card)"
                          strokeWidth={isSelected ? 3 : 1}
                          className={cn(
                            "transition-all duration-200 outline-none",
                            onSliceClick && "hover:opacity-85",
                            isSelected && "filter drop-shadow(0 0 4px rgba(0,0,0,0.3))"
                          )}
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Annotation */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-display text-xl font-bold tracking-tight text-foreground">
                  {displayCenterLabel}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {centerSublabel}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Legend & Breakdown with Counts & Percentages */}
      {total > 0 && (
        <div className="mt-3 border-t border-border/60 pt-3">
          <ul className="grid grid-cols-1 gap-2 text-xs">
            {chartData.map((item) => {
              const isSelected = selectedSlice === item.name;
              return (
                <li
                  key={item.name}
                  onClick={() => onSliceClick && onSliceClick(item)}
                  className={cn(
                    "flex items-center justify-between rounded p-1.5 transition-colors",
                    onSliceClick && "cursor-pointer hover:bg-muted/50",
                    isSelected && "bg-muted font-medium"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate text-foreground">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-muted-foreground">{item.value}</span>
                    <span className="font-semibold text-foreground">({item.percentage}%)</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
