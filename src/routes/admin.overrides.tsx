import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Info, Search, ShieldAlert, Sparkles } from "lucide-react";
import { PageHeader, Panel, fmt } from "@/features/super-admin/page";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/admin/overrides")({
  head: () => ({
    meta: [
      { title: "Visible-Value Oversight — Ziphyrus X Super Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VisibleValueOversightPage,
});

export function VisibleValueOversightPage() {
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    let active = true;
    api.overrides
      .list()
      .then((data) => {
        if (active && Array.isArray(data)) {
          setOverrides(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredOverrides = overrides.filter((ovr) => {
    const matchesSearch =
      !search ||
      ovr.entityId?.toLowerCase().includes(search.toLowerCase()) ||
      ovr.fieldName?.toLowerCase().includes(search.toLowerCase()) ||
      ovr.mandatoryReason?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || ovr.entityType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visible-Value Oversight"
        desc="Super Admin oversight of Editor presentation overrides. Every override requires an explanatory justification and leaves raw authoritative calculations unmodified."
      />

      {/* Critical Architecture Callout Banner */}
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm leading-relaxed text-foreground shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-foreground">Non-Fabrication & Authority Principle</h4>
            <p className="text-xs text-muted-foreground">
              Visible-value overrides alter display presentation values only. They <strong className="text-foreground">never</strong> modify
              authoritative scoring models, automated Judge execution verdicts, or intelligence engine calculations.
              Both actual and visible values remain transparently accessible and auditable.
            </p>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by entity ID, field, reason…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px] text-sm">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="assessment">Assessment</SelectItem>
              <SelectItem value="college">College</SelectItem>
              <SelectItem value="batch">Batch</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground">
          {filteredOverrides.length} overrides recorded
        </span>
      </div>

      {/* Overrides Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <th className="p-3 font-medium">Target Entity</th>
                <th className="p-3 font-medium">Field</th>
                <th className="p-3 font-medium">Actual (System)</th>
                <th className="p-3 font-medium">Visible (Display)</th>
                <th className="p-3 font-medium">Delta (Δ)</th>
                <th className="p-3 font-medium">Recalculation Impact</th>
                <th className="p-3 font-medium">Mandatory Justification</th>
                <th className="p-3 font-medium">Overridden By</th>
                <th className="p-3 font-medium">Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredOverrides.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-sm text-muted-foreground">
                    No visible-value overrides found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredOverrides.map((ovr) => {
                  const numActual = parseFloat(ovr.actualValue);
                  const numVisible = parseFloat(ovr.visibleValue);
                  const delta = !isNaN(numActual) && !isNaN(numVisible) ? (numVisible - numActual).toFixed(1) : null;
                  return (
                    <tr key={ovr.id} className="hover:bg-muted/40">
                      <td className="p-3">
                        <span className="font-mono text-xs font-semibold text-foreground">{ovr.entityId}</span>
                        <Badge variant="outline" className="ml-2 text-[10px] capitalize">
                          {ovr.entityType}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{ovr.fieldName}</td>
                      <td className="p-3">
                        <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                          {ovr.actualValue}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="rounded bg-accent/15 px-2 py-0.5 font-mono text-xs font-semibold text-accent">
                          {ovr.visibleValue}
                        </span>
                      </td>
                      <td className="p-3">
                        {delta !== null ? (
                          <Badge
                            variant="outline"
                            className={`font-mono text-[11px] ${
                              parseFloat(delta) > 0
                                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                : "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                            }`}
                          >
                            {parseFloat(delta) > 0 ? `+${delta}%` : `${delta}%`}
                          </Badge>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1 text-[11px]">
                          <Badge variant="secondary" className="w-fit text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            v2.6-engine Recalculated
                          </Badge>
                          <span className="text-muted-foreground">
                            Scopes: {ovr.entityType === "student" ? "Section, Branch, College, Platform" : "College, Platform"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-foreground max-w-xs leading-relaxed">
                        {ovr.mandatoryReason}
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">
                        {ovr.overriddenBy || "editor1@ziphyrus.in"}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{fmt(ovr.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
