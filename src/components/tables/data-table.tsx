import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key?: string;
  label?: string;
  header?: string;
  render?: (row: T) => ReactNode;
  accessor?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  rows,
  data,
  columns = [],
  searchKeys,
  filterKey,
  pageSize = 10,
  onRowClick,
  toolbar,
  emptyMessage = "No records match these filters.",
}: {
  rows?: T[];
  data?: T[];
  columns: Column<T>[];
  searchKeys?: string[];
  filterKey?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
  emptyMessage?: string;
}) {
  const actualRows: T[] = useMemo(() => {
    if (Array.isArray(rows)) return rows;
    if (Array.isArray(data)) return data;
    return [];
  }, [rows, data]);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const normalizedColumns = useMemo(() => {
    return columns.map((c, i) => {
      const colKey = c.key ?? `col_${i}`;
      const colLabel = c.label ?? c.header ?? "";
      const colRender = c.render ?? c.accessor ?? ((r: T) => String(r[colKey] ?? ""));
      return {
        ...c,
        key: colKey,
        label: colLabel,
        render: colRender,
      };
    });
  }, [columns]);

  const options = useMemo(() => {
    if (!filterKey || actualRows.length === 0) return [];
    return Array.from(new Set(actualRows.map((r) => String(r[filterKey] ?? ""))));
  }, [actualRows, filterKey]);

  const filteredData = useMemo(() => {
    let d = actualRows;

    if (q.trim()) {
      const query = q.toLowerCase();
      if (searchKeys && searchKeys.length > 0) {
        d = d.filter((r) =>
          searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(query))
        );
      } else {
        d = d.filter((r) =>
          normalizedColumns.some((col) => {
            const val = r[col.key];
            return val != null && String(val).toLowerCase().includes(query);
          })
        );
      }
    }

    if (filterKey && filter !== "all") {
      d = d.filter((r) => String(r[filterKey] ?? "") === filter);
    }

    if (sort) {
      d = [...d].sort((a, b) => {
        const valA = String(a[sort.key] ?? "");
        const valB = String(b[sort.key] ?? "");
        return valA > valB ? sort.dir : -sort.dir;
      });
    }

    return d;
  }, [actualRows, q, filter, sort, searchKeys, filterKey, normalizedColumns]);

  const pages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const view = filteredData.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="border border-border">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search…"
            className="pl-9"
            aria-label="Search table"
          />
        </div>
        {filterKey && (
          <Select
            value={filter}
            onValueChange={(v) => {
              setFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-44" aria-label="Filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {options.map((o) => (
                <SelectItem key={o} value={o} className="capitalize">
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {toolbar}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {normalizedColumns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-4 py-3 text-left font-mono text-xs font-normal uppercase tracking-wider text-muted-foreground",
                    c.className
                  )}
                >
                  {c.sortable !== false && c.key ? (
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() =>
                        setSort((s) =>
                          s?.key === c.key
                            ? { key: c.key, dir: s.dir === 1 ? -1 : 1 }
                            : { key: c.key, dir: 1 }
                        )
                      }
                    >
                      {c.label}
                      {sort?.key === c.key &&
                        (sort.dir === 1 ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        ))}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r, rowIndex) => (
              <tr
                key={r.id ?? `row_${rowIndex}`}
                onClick={() => onRowClick?.(r)}
                className={cn(
                  "border-b border-border last:border-0",
                  onRowClick && "cursor-pointer hover:bg-muted/60"
                )}
              >
                {normalizedColumns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3", c.className)}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {view.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Inbox className="h-6 w-6" /> <p className="text-sm">{emptyMessage}</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <span>{filteredData.length} records</span>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <span className="font-mono">
            {page + 1} / {pages}
          </span>
          <Button
            size="icon"
            variant="ghost"
            disabled={page >= pages - 1}
            onClick={() => setPage(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

const TONE: Record<string, string> = {
  active: "text-success border-success/40",
  healthy: "text-success border-success/40",
  succeeded: "text-success border-success/40",
  published: "text-success border-success/40",
  completed: "text-success border-success/40",
  info: "text-muted-foreground border-border",
  pending: "text-warning border-warning/40",
  hold: "text-amber-500 border-amber-500/40 bg-amber-500/10",
  deactive: "text-destructive border-destructive/40 bg-destructive/10",
  degraded: "text-warning border-warning/40",
  running: "text-warning border-warning/40",
  queued: "text-muted-foreground border-border",
  draft: "text-muted-foreground border-border",
  warning: "text-warning border-warning/40",
  inactive: "text-muted-foreground border-border",
  archived: "text-muted-foreground border-border",
  failed: "text-destructive border-destructive/40",
  down: "text-destructive border-destructive/40",
};

export function StatusBadge({
  s = "",
  status,
  label,
}: {
  s?: string;
  status?: string;
  label?: string;
}) {
  const effectiveStatus = (status ?? s ?? "").toLowerCase();
  const displayLabel = label ?? status ?? s ?? "";
  const tone = TONE[effectiveStatus] ?? "border-border";

  return (
    <span className={cn("inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[0.7rem] capitalize", tone)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {displayLabel}
    </span>
  );
}
