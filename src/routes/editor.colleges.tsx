import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Edit3,
  History,
  Info,
  PauseCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader, Panel, fmt } from "@/features/super-admin/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CollegeStatusBadge,
  CollegeStatusChangeDialog,
  CollegeCodeEditDialog,
  CollegeStatusHistoryTable,
  CollegeCodeHistoryTable,
} from "@/components/colleges/college-status-components";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/editor/colleges")({
  head: () => ({
    meta: [
      { title: "Colleges Management — Ziphyrus X Editor" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditorCollegesPage,
});

export function EditorCollegesPage() {
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog States
  const [targetCollegeForStatus, setTargetCollegeForStatus] = useState<any | null>(null);
  const [targetCollegeForCode, setTargetCollegeForCode] = useState<any | null>(null);
  const [inspectingCollege, setInspectingCollege] = useState<any | null>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [codeHistory, setCodeHistory] = useState<any[]>([]);

  const fetchColleges = () => {
    setLoading(true);
    api.editor.colleges
      .list(undefined, statusFilter === "all" ? undefined : statusFilter)
      .then((data) => {
        if (Array.isArray(data)) {
          setColleges(data);
        }
        setLoading(false);
      })
      .catch(() => {
        // Fallback to general list if needed
        api.colleges
          .list(undefined, statusFilter === "all" ? undefined : statusFilter)
          .then((data) => {
            if (Array.isArray(data)) setColleges(data);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  };

  useEffect(() => {
    fetchColleges();
  }, [statusFilter]);

  const openInspector = async (col: any) => {
    setInspectingCollege(col);
    try {
      const [sh, ch] = await Promise.all([
        api.editor.colleges.getStatusHistory(col.id).catch(() => []),
        api.editor.colleges.getCodeHistory(col.id).catch(() => []),
      ]);
      setStatusHistory(Array.isArray(sh) ? sh : []);
      setCodeHistory(Array.isArray(ch) ? ch : []);
    } catch {
      setStatusHistory([]);
      setCodeHistory([]);
    }
  };

  const filtered = colleges.filter((c) => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || c.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Colleges Operational Directory"
        desc="Manage authorized institutional lifecycle status (Active, Hold, Deactive) and perform audited college code corrections."
      />

      {/* Role Authority Notice Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-foreground">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-sm">Editor Authority & Scope Policy (Section 3)</span>
            <p className="text-muted-foreground leading-relaxed">
              Editors have role authority to transition existing college lifecycle statuses (Active, Hold, Deactive) and perform authorized college code corrections with mandatory justifications.{" "}
              <span className="font-semibold text-foreground">
                College creation is restricted to Super Admin.
              </span>{" "}
              All modifications generate permanent audit logs visible to platform administration.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by college name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Status:</span>
            {[
              { id: "all", label: "All" },
              { id: "active", label: "Active" },
              { id: "hold", label: "Hold" },
              { id: "deactive", label: "Deactive" },
            ].map((f) => (
              <Button
                key={f.id}
                variant={statusFilter === f.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter(f.id)}
                className="h-7 text-xs font-normal"
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        <span className="text-xs text-muted-foreground">
          {filtered.length} institutions match filters
        </span>
      </div>

      {/* Colleges Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">College Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Lifecycle Status</th>
                <th className="px-4 py-3 hidden md:table-cell">Campuses</th>
                <th className="px-4 py-3 hidden md:table-cell">Students</th>
                <th className="px-4 py-3 text-right">Editor Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => openInspector(c)}
                      className="font-medium text-foreground hover:underline text-left block"
                    >
                      {c.name}
                    </button>
                    <span className="text-[10px] text-muted-foreground">Registered {fmt(c.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-xs text-foreground bg-muted px-1.5 py-0.5 rounded">
                        {c.code}
                      </span>
                      {c.previousCodes && c.previousCodes.length > 0 && (
                        <span className="text-[10px] text-muted-foreground italic" title={`Previously: ${c.previousCodes.join(', ')}`}>
                          (prev: {c.previousCodes[c.previousCodes.length - 1]})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <CollegeStatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell text-muted-foreground">
                    {c.campuses || 1}
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell text-muted-foreground">
                    {c.students ?? 0}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTargetCollegeForCode(c)}
                        className="h-7 text-xs gap-1"
                        title="Authorized college code update"
                      >
                        <Edit3 className="h-3 w-3" /> Edit Code
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTargetCollegeForStatus(c)}
                        className="h-7 text-xs gap-1"
                        title="Update Active / Hold / Deactive status"
                      >
                        <PauseCircle className="h-3 w-3" /> Status
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openInspector(c)}
                        className="h-7 text-xs"
                      >
                        History
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No colleges match your active search and status filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* College Inspection & History Sheet */}
      <Sheet open={Boolean(inspectingCollege)} onOpenChange={(o) => !o && setInspectingCollege(null)}>
        <SheetContent className="max-w-xl sm:max-w-xl overflow-y-auto">
          {inspectingCollege && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {inspectingCollege.code}
                  </Badge>
                  <CollegeStatusBadge status={inspectingCollege.status} />
                </div>
                <SheetTitle className="text-base text-foreground mt-2">
                  {inspectingCollege.name}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Institutional governance metadata, lifecycle transitions, and audited code modifications.
                </SheetDescription>
              </SheetHeader>

              {/* Quick Actions inside Inspector */}
              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTargetCollegeForStatus(inspectingCollege);
                  }}
                  className="gap-1.5 text-xs flex-1"
                >
                  <PauseCircle className="h-3.5 w-3.5 text-primary" /> Update Lifecycle Status
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTargetCollegeForCode(inspectingCollege);
                  }}
                  className="gap-1.5 text-xs flex-1"
                >
                  <Edit3 className="h-3.5 w-3.5 text-primary" /> Update College Code
                </Button>
              </div>

              {/* Identity & Status Summary */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Immutable Internal ID</span>
                  <span className="font-mono text-[11px] text-foreground truncate max-w-[220px]">
                    {inspectingCollege.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Code</span>
                  <span className="font-mono font-bold text-foreground">{inspectingCollege.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lifecycle Status</span>
                  <CollegeStatusBadge status={inspectingCollege.status} />
                </div>
                {inspectingCollege.statusReason && (
                  <div className="border-t border-border pt-2 text-[11px]">
                    <span className="text-muted-foreground">Current Status Reason:</span>
                    <p className="italic text-foreground mt-0.5">"{inspectingCollege.statusReason}"</p>
                  </div>
                )}
              </div>

              {/* Status History */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" /> Lifecycle Status Transition History
                </h4>
                <CollegeStatusHistoryTable history={statusHistory} />
              </div>

              {/* Code History */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Edit3 className="h-3.5 w-3.5" /> College Code Modifications History
                </h4>
                <CollegeCodeHistoryTable history={codeHistory} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Status Change Dialog (Editor Authorized) */}
      <CollegeStatusChangeDialog
        college={targetCollegeForStatus}
        open={Boolean(targetCollegeForStatus)}
        onOpenChange={(isOpen) => !isOpen && setTargetCollegeForStatus(null)}
        onSuccess={(updated) => {
          setColleges(colleges.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
          if (inspectingCollege && inspectingCollege.id === updated.id) {
            setInspectingCollege({ ...inspectingCollege, ...updated });
            openInspector({ ...inspectingCollege, ...updated });
          }
          setTargetCollegeForStatus(null);
        }}
        isEditor={true}
      />

      {/* Code Edit Dialog (Editor Authorized) */}
      <CollegeCodeEditDialog
        college={targetCollegeForCode}
        open={Boolean(targetCollegeForCode)}
        onOpenChange={(isOpen) => !isOpen && setTargetCollegeForCode(null)}
        onSuccess={(updated) => {
          setColleges(colleges.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
          if (inspectingCollege && inspectingCollege.id === updated.id) {
            setInspectingCollege({ ...inspectingCollege, ...updated });
            openInspector({ ...inspectingCollege, ...updated });
          }
          setTargetCollegeForCode(null);
        }}
        isEditor={true}
      />
    </div>
  );
}
