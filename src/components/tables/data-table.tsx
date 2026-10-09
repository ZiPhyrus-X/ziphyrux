import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: keyof T & string;
  label: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  rows, columns, searchKeys, filterKey, pageSize = 10, onRowClick, toolbar,
}: {
  rows: T[];
  columns: Column<T>[];
  searchKeys: (keyof T & string)[];
  filterKey?: keyof T & string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const options = useMemo(() => (filterKey ? Array.from(new Set(rows.map((r) => String(r[filterKey])))) : []), [rows, filterKey]);
  const data = useMemo(() => {
    let d = rows.filter((r) => searchKeys.some((k) => String(r[k]).toLowerCase().includes(q.toLowerCase())));
    if (filterKey && filter !== "all") d = d.filter((r) => String(r[filterKey]) === filter);
    if (sort) d = [...d].sort((a, b) => (String((a as never)[sort.key]) > String((b as never)[sort.key]) ? sort.dir : -sort.dir));
    return d;
  }, [rows, q, filter, sort, searchKeys, filterKey]);
  const pages = Math.max(1, Math.ceil(data.length / pageSize));
  const view = data.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="border border-border">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search…" className="pl-9" aria-label="Search table" />
        </div>
        {filterKey && (
          <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(0); }}>
            <SelectTrigger className="w-44" aria-label="Filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {options.map((o) => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {toolbar}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-3 text-left font-mono text-xs font-normal uppercase tracking-wider text-muted-foreground", c.className)}>
                  {c.sortable !== false ? (
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))}>
                      {c.label}
                      {sort?.key === c.key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={r.id} onClick={() => onRowClick?.(r)} className={cn("border-b border-border last:border-0", onRowClick && "cursor-pointer hover:bg-muted/60")}>
                {columns.map((c) => <td key={c.key} className={cn("px-4 py-3", c.className)}>{c.render ? c.render(r) : String(r[c.key])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {view.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Inbox className="h-6 w-6" /> <p className="text-sm">No records match these filters.</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <span>{data.length} records</span>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft /></Button>
          <span className="font-mono">{page + 1} / {pages}</span>
          <Button size="icon" variant="ghost" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight /></Button>
        </div>
      </div>
    </div>
  );
}

const TONE: Record<string, string> = {
  active: "text-success border-success/40", healthy: "text-success border-success/40", succeeded: "text-success border-success/40", published: "text-success border-success/40", info: "text-muted-foreground border-border",
  pending: "text-warning border-warning/40", degraded: "text-warning border-warning/40", running: "text-warning border-warning/40", queued: "text-muted-foreground border-border", draft: "text-muted-foreground border-border", warning: "text-warning border-warning/40",
  inactive: "text-muted-foreground border-border", archived: "text-muted-foreground border-border", failed: "text-destructive border-destructive/40", down: "text-destructive border-destructive/40",
};
export function StatusBadge({ s }: { s: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[0.7rem] capitalize", TONE[s] ?? "border-border")}><span className="h-1.5 w-1.5 rounded-full bg-current" />{s}</span>;
}
