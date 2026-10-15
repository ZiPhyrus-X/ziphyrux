import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileQuestion,
  FileText,
  Filter,
  History,
  Layers,
  ScrollText,
  Search,
  ShieldAlert,
  Sliders,
} from "lucide-react";
import { PageHeader, Panel, fmt } from "@/features/super-admin/page";
import { StatusBadge } from "@/components/tables/data-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit & Change History — Ziphyrus X Super Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuditAndHistoryPage,
});

export function AuditAndHistoryPage() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [editorChanges, setEditorChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for Audit Log
  const [auditSearch, setAuditSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  // Filters for Editor Changes
  const [editorSearch, setEditorSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  useEffect(() => {
    let active = true;
    Promise.all([api.audit.list(), api.editorChanges.list()])
      .then(([logs, changes]) => {
        if (active) {
          if (Array.isArray(logs)) setAuditLogs(logs);
          if (Array.isArray(changes)) setEditorChanges(changes);
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

  // Filtered audit logs
  const filteredAudit = auditLogs.filter((log) => {
    const matchesSearch =
      !auditSearch ||
      log.actor?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.target?.toLowerCase().includes(auditSearch.toLowerCase());
    const matchesSeverity = severityFilter === "all" || log.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  // Filtered editor changes
  const filteredEditorChanges = editorChanges.filter((chg) => {
    const matchesSearch =
      !editorSearch ||
      chg.entityTitle?.toLowerCase().includes(editorSearch.toLowerCase()) ||
      chg.editorLogin?.toLowerCase().includes(editorSearch.toLowerCase()) ||
      chg.action?.toLowerCase().includes(editorSearch.toLowerCase());
    const matchesEntity = entityFilter === "all" || chg.entityType === entityFilter;
    return matchesSearch && matchesEntity;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit & Change History"
        desc="Immutable platform governance logs and detailed Editor change inspection with before/after state diffs."
      />

      <Tabs defaultValue="editor-changes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="editor-changes" className="gap-2">
            <Sliders className="h-4 w-4" /> Editor Data Changes
          </TabsTrigger>
          <TabsTrigger value="platform-audit" className="gap-2">
            <ScrollText className="h-4 w-4" /> Platform Audit Trail
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Editor Data Changes with Diffs */}
        <TabsContent value="editor-changes" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search changes by title, editor, action…"
                  value={editorSearch}
                  onChange={(e) => setEditorSearch(e.target.value)}
                  className="pl-8 text-sm"
                />
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[160px] text-sm">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="course">Courses</SelectItem>
                  <SelectItem value="question">Questions</SelectItem>
                  <SelectItem value="assessment">Assessments</SelectItem>
                  <SelectItem value="feature_flag">Feature Flags</SelectItem>
                  <SelectItem value="override">Overrides</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredEditorChanges.length} changes inspected
            </span>
          </div>

          <div className="space-y-3">
            {filteredEditorChanges.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No matching editor change records found.
              </div>
            ) : (
              filteredEditorChanges.map((change) => (
                <div
                  key={change.id}
                  className="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-border/80"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {change.entityType?.replace("_", " ")}
                      </Badge>
                      <h4 className="font-medium text-foreground text-sm">{change.entityTitle}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>By <strong className="font-mono text-foreground">{change.editorLogin}</strong></span>
                      <span>•</span>
                      <span>{fmt(change.timestamp)}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                        Action:
                      </span>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {change.action}
                      </Badge>
                    </div>

                    {/* Before and After State Diff */}
                    <div className="flex items-center gap-2 font-mono text-xs">
                      {change.previousValue && (
                        <>
                          <span className="rounded bg-rose-500/10 px-2 py-0.5 text-rose-500 line-through">
                            {change.previousValue}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </>
                      )}
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-500 font-semibold">
                        {change.newValue || "Applied"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Platform Audit Trail */}
        <TabsContent value="platform-audit" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search actor, action, target…"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="pl-8 text-sm"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[140px] text-sm">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredAudit.length} audit records
            </span>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Actor</th>
                    <th className="p-3 font-medium">Action</th>
                    <th className="p-3 font-medium">Target</th>
                    <th className="p-3 font-medium">Severity</th>
                    <th className="p-3 font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredAudit.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/40">
                      <td className="p-3 font-mono text-xs font-medium text-foreground">{log.actor}</td>
                      <td className="p-3 font-mono text-xs">{log.action}</td>
                      <td className="p-3 text-xs text-muted-foreground">{log.target}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            log.severity === "critical"
                              ? "destructive"
                              : log.severity === "warning"
                              ? "secondary"
                              : "outline"
                          }
                          className="capitalize text-[10px]"
                        >
                          {log.severity}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{fmt(log.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
