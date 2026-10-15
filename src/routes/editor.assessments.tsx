import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  EyeOff,
  FolderPlus,
  Layers,
  Lock,
  Plus,
  RotateCw,
  Search,
  ShieldCheck,
  Trash2,
  AlertCircle,
  FileText,
  Filter,
} from "lucide-react";
import { PageHeader, Panel, fmt } from "@/features/editor/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/editor/assessments")({
  head: () => ({
    meta: [
      { title: "Assessment Content & Modules — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssessmentContentPage,
});

interface AssessmentModule {
  id: string;
  name: string;
  normalizedName: string;
  domain: "Technical" | "Aptitude" | "Verbal" | "Soft Skills" | "Coding" | "Core Engineering";
  description?: string;
  visibilityStatus: "hidden" | "visible";
  status: "active" | "archived";
  assessmentsCount?: number;
  assignedCollegeCount?: number;
  assignedColleges?: {
    id: string;
    code: string;
    name: string;
    status: string;
    grantedAt: string;
    grantedBy: string;
  }[];
}

interface Assessment {
  id: string;
  code: string;
  moduleId?: string;
  title: string;
  description?: string;
  domain: "Technical" | "Aptitude" | "Verbal" | "Soft Skills" | "Coding" | "Core Engineering";
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  durationMinutes?: number;
  totalMarks?: number;
  passingMarks?: number;
  questionsCount: number;
  status: "draft" | "in_review" | "published" | "archived";
  version: string;
  currentVersion?: string;
  updatedAt: string;
}

interface College {
  id: string;
  name: string;
  code: string;
  status: "active" | "hold" | "deactive";
}

function AssessmentContentPage() {
  // Modules state
  const [modules, setModules] = useState<AssessmentModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<string>("mod-asm-tech");

  // Assessments state
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Colleges for visibility modal
  const [colleges, setColleges] = useState<College[]>([]);

  // Dialog states: Add Module
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [newModName, setNewModName] = useState("");
  const [newModDomain, setNewModDomain] = useState<AssessmentModule["domain"]>("Technical");
  const [newModDesc, setNewModDesc] = useState("");
  const [savingModule, setSavingModule] = useState(false);

  // Dialog states: Edit Module
  const [editingModule, setEditingModule] = useState<AssessmentModule | null>(null);
  const [editModName, setEditModName] = useState("");
  const [editModDomain, setEditModDomain] = useState<AssessmentModule["domain"]>("Technical");
  const [editModDesc, setEditModDesc] = useState("");

  // Dialog states: Visibility Modal
  const [visibilityModalOpen, setVisibilityModalOpen] = useState(false);
  const [targetModuleForVisibility, setTargetModuleForVisibility] = useState<AssessmentModule | null>(null);
  const [visibilityStatus, setVisibilityStatus] = useState<"visible" | "hidden">("hidden");
  const [selectedCollegeIds, setSelectedCollegeIds] = useState<string[]>([]);
  const [collegeSearch, setCollegeSearch] = useState("");
  const [savingVisibility, setSavingVisibility] = useState(false);

  // Dialog states: Delete Module Confirmation
  const [moduleToDelete, setModuleToDelete] = useState<AssessmentModule | null>(null);
  const [deletingModule, setDeletingModule] = useState(false);

  // Dialog states: Create Blueprint
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<Assessment["domain"]>("Technical");
  const [difficulty, setDifficulty] = useState<Assessment["difficulty"]>("Intermediate");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [totalMarks, setTotalMarks] = useState(100);
  const [passingMarks, setPassingMarks] = useState(40);
  const [questionsCount, setQuestionsCount] = useState(25);
  const [description, setDescription] = useState("");
  const [submittingBlueprint, setSubmittingBlueprint] = useState(false);

  // Dialog states: Delete Assessment Confirmation
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);
  const [deletingAssessment, setDeletingAssessment] = useState(false);

  // Fetch initial data
  const fetchModules = async () => {
    setLoadingModules(true);
    try {
      const res = await api.editor.assessment.modules.list();
      setModules(res);
      if (res.length > 0 && !res.some((m) => m.id === activeModuleId)) {
        setActiveModuleId(res[0].id);
      }
    } catch {
      toast.error("Failed to load assessment modules");
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchAssessments = async () => {
    setLoadingAssessments(true);
    try {
      const res = await api.editor.assessments.list();
      setAssessments(res);
    } catch {
      toast.error("Failed to load assessments");
    } finally {
      setLoadingAssessments(false);
    }
  };

  const fetchColleges = async () => {
    try {
      const list = await api.editor.colleges.list();
      setColleges(list);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    fetchModules();
    fetchAssessments();
    fetchColleges();
  }, []);

  // Filter assessments based on active module and search
  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      // Must match active module
      if (activeModuleId && a.moduleId && a.moduleId !== activeModuleId) {
        return false;
      }
      if (statusFilter !== "all" && a.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return a.title.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [assessments, activeModuleId, statusFilter, searchQuery]);

  // Active module object
  const activeModule = useMemo(() => {
    return modules.find((m) => m.id === activeModuleId) || null;
  }, [modules, activeModuleId]);

  // Stats calculation
  const totalBlueprints = assessments.length;
  const publishedBlueprints = assessments.filter((a) => a.status === "published").length;
  const draftBlueprints = assessments.filter((a) => a.status === "draft").length;
  const uniqueCollegesAssigned = useMemo(() => {
    const ids = new Set<string>();
    modules.forEach((m) => {
      m.assignedColleges?.forEach((c) => ids.add(c.id));
    });
    return ids.size;
  }, [modules]);

  // Handlers: Add Module
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModName.trim()) {
      toast.error("Module name is required");
      return;
    }
    setSavingModule(true);
    try {
      const created = await api.editor.assessment.modules.create({
        name: newModName.trim(),
        domain: newModDomain,
        description: newModDesc.trim(),
      });
      toast.success(`Assessment module "${created.name}" created (Default: Hidden).`);
      setAddModuleOpen(false);
      setNewModName("");
      setNewModDesc("");
      await fetchModules();
      setActiveModuleId(created.id);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create assessment module");
    } finally {
      setSavingModule(false);
    }
  };

  // Handlers: Edit Module
  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule || !editModName.trim()) return;
    try {
      await api.editor.assessment.modules.update(editingModule.id, {
        name: editModName.trim(),
        domain: editModDomain,
        description: editModDesc.trim(),
      });
      toast.success("Assessment module updated.");
      setEditingModule(null);
      await fetchModules();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update module");
    }
  };

  // Handlers: Delete Module
  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;
    setDeletingModule(true);
    try {
      await api.editor.assessment.modules.delete(moduleToDelete.id);
      toast.success(`Assessment module "${moduleToDelete.name}" permanently deleted.`);
      const remaining = modules.filter((m) => m.id !== moduleToDelete.id);
      setModules(remaining);
      if (activeModuleId === moduleToDelete.id && remaining.length > 0) {
        setActiveModuleId(remaining[0].id);
      }
      setModuleToDelete(null);
      await fetchAssessments();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete assessment module");
    } finally {
      setDeletingModule(false);
    }
  };

  // Handlers: Open Visibility Modal
  const handleOpenVisibility = (mod: AssessmentModule, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetModuleForVisibility(mod);
    setVisibilityStatus(mod.visibilityStatus);
    setSelectedCollegeIds(mod.assignedColleges?.map((c) => c.id) || []);
    setCollegeSearch("");
    setVisibilityModalOpen(true);
  };

  // Handlers: Save Visibility
  const handleSaveVisibility = async () => {
    if (!targetModuleForVisibility) return;
    if (visibilityStatus === "visible" && selectedCollegeIds.length === 0) {
      toast.error("Please select at least one college to make this module visible.");
      return;
    }
    setSavingVisibility(true);
    try {
      await api.editor.assessment.modules.updateVisibility(targetModuleForVisibility.id, {
        visibilityStatus,
        collegeIds: visibilityStatus === "visible" ? selectedCollegeIds : [],
      });
      toast.success(`Visibility for "${targetModuleForVisibility.name}" updated.`);
      setVisibilityModalOpen(false);
      await fetchModules();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update visibility");
    } finally {
      setSavingVisibility(false);
    }
  };

  // Handlers: Create Assessment Blueprint
  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Assessment title is required");
      return;
    }
    setSubmittingBlueprint(true);
    try {
      const created = await api.editor.assessments.create({
        title: title.trim(),
        moduleId: activeModuleId,
        domain: activeModule?.domain || domain,
        difficulty,
        durationMinutes: Number(durationMinutes),
        totalMarks: Number(totalMarks),
        passingMarks: Number(passingMarks),
        questionsCount: Number(questionsCount),
        description: description.trim(),
      });
      toast.success(`Assessment blueprint "${created.code}" created.`);
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      await fetchAssessments();
      await fetchModules();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create assessment");
    } finally {
      setSubmittingBlueprint(false);
    }
  };

  // Handlers: Delete Assessment
  const handleDeleteAssessment = async () => {
    if (!assessmentToDelete) return;
    setDeletingAssessment(true);
    try {
      await api.editor.assessments.delete(assessmentToDelete.id);
      toast.success(`Assessment "${assessmentToDelete.code}" deleted.`);
      setAssessmentToDelete(null);
      await fetchAssessments();
      await fetchModules();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete assessment");
    } finally {
      setDeletingAssessment(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Content & Modules"
        desc="Assessment blueprints, diagnostic evaluations, multi-college visibility controls, and modular sampling parameters. Official candidate results and scores remain immutable."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchModules();
                fetchAssessments();
              }}
              disabled={loadingModules || loadingAssessments}
            >
              <RotateCw className={`mr-2 h-4 w-4 ${loadingModules ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddModuleOpen(true)}>
              <FolderPlus className="mr-2 h-4 w-4" /> Add Module
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Blueprint
            </Button>
          </div>
        }
      />

      {/* Architecture Disclaimer */}
      <div className="rounded-md border border-border bg-muted/30 p-4 text-xs text-muted-foreground flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
        <span>
          Under the Ziphyrus X locked architecture, the Editor manages diagnostic blueprints, question quotas, and college visibility. Candidate session submissions and coding judge verdicts are calculated independently and cannot be overridden.
        </span>
      </div>

      {/* Overview Statistics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Total Modules</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{modules.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Total Blueprints</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{totalBlueprints}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Published</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {publishedBlueprints}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Drafts</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {draftBlueprints}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Authorized Colleges</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-primary">
            {uniqueCollegesAssigned}
          </p>
        </div>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* SECTION 1: ASSESSMENT MODULES & COLLEGE VISIBILITY (Flexible 3-card grid) */}
      {/* -------------------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Assessment Modules & College Visibility
            </h2>
            <p className="text-xs text-muted-foreground">
              Select a module to manage its diagnostic blueprints. Newly created modules default to Hidden. Access requires explicit college assignment.
            </p>
          </div>
          <Button size="sm" onClick={() => setAddModuleOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" /> Add Module
          </Button>
        </div>

        {/* Flexible 3 modules per row grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => {
            const isSelected = mod.id === activeModuleId;
            const isVisible = mod.visibilityStatus === "visible";

            return (
              <div
                key={mod.id}
                onClick={() => setActiveModuleId(mod.id)}
                className={`flex flex-col justify-between rounded-lg border p-4 transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-border/80 hover:bg-muted/30"
                }`}
              >
                {/* Header Row 1 & 2 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-base tracking-tight truncate">{mod.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingModule(mod);
                          setEditModName(mod.name);
                          setEditModDomain(mod.domain);
                          setEditModDesc(mod.description || "");
                        }}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModuleToDelete(mod);
                        }}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 min-h-[22px]">
                    {isSelected && (
                      <Badge variant="default" className="text-[10px] py-0 px-2 h-5">
                        Active
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px] py-0 px-2 h-5">
                      {mod.domain}
                    </Badge>
                    {isVisible ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-2 h-5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
                      >
                        <Eye className="h-2.5 w-2.5" /> Visible ({mod.assignedCollegeCount ?? 0})
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-2 h-5 text-muted-foreground flex items-center gap-1"
                      >
                        <Lock className="h-2.5 w-2.5" /> Hidden
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 h-8">
                    {mod.description || "Comprehensive diagnostic assessment blueprints and evaluations."}
                  </p>
                </div>

                {/* Metrics Breakdown */}
                <div className="my-4 grid grid-cols-2 gap-2 border-y border-border/60 py-2.5 text-center text-xs">
                  <div>
                    <span className="block font-semibold text-foreground">{mod.assessmentsCount ?? 0}</span>
                    <span className="text-[10px] text-muted-foreground">Blueprints</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-primary">{mod.assignedCollegeCount ?? 0}</span>
                    <span className="text-[10px] text-muted-foreground">Active Colleges</span>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs shrink-0 flex items-center gap-1.5"
                    onClick={(e) => handleOpenVisibility(mod, e)}
                  >
                    <Eye className="h-3 w-3" /> Visibility
                  </Button>
                  <Button
                    variant={isSelected ? "default" : "secondary"}
                    size="sm"
                    className="flex-1 h-8 text-xs truncate"
                  >
                    {isSelected ? "Active Workspace" : "Manage Assessments"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* SECTION 2: SELECTED MODULE WORKSPACE                                       */}
      {/* -------------------------------------------------------------------------- */}
      {activeModule && (
        <Panel
          title={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span>{activeModule.name} Workspace</span>
                <Badge variant="outline" className="text-xs">
                  {filteredAssessments.length} blueprints
                </Badge>
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> New Blueprint
              </Button>
            </div>
          }
        >
          {/* Filter Bar */}
          <div className="mb-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assessments by code or title..."
                className="pl-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assessments Table */}
          <DataTable
            data={filteredAssessments}
            emptyMessage={
              loadingAssessments
                ? "Loading assessment blueprints..."
                : "No assessment blueprints found in this module."
            }
            columns={[
              {
                header: "Code",
                accessor: (a) => <span className="font-mono text-xs font-semibold text-primary">{a.code}</span>,
              },
              {
                header: "Title & Overview",
                accessor: (a) => (
                  <div>
                    <p className="font-medium text-sm text-foreground">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {a.description || "Standard diagnostic assessment blueprint."}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Version: {a.version} · Updated: {fmt(a.updatedAt)}
                    </p>
                  </div>
                ),
              },
              {
                header: "Difficulty",
                accessor: (a) => (
                  <Badge variant="secondary" className="text-[10px]">
                    {a.difficulty || "Intermediate"}
                  </Badge>
                ),
              },
              {
                header: "Duration & Score",
                accessor: (a) => (
                  <div className="text-xs">
                    <span className="font-semibold">{a.durationMinutes || 60} mins</span>
                    <span className="text-[10px] text-muted-foreground block">
                      {a.totalMarks || 100} marks (Pass: {a.passingMarks || 40})
                    </span>
                  </div>
                ),
              },
              {
                header: "Question Quota",
                accessor: (a) => (
                  <span className="text-xs font-mono">{a.questionsCount} questions</span>
                ),
              },
              {
                header: "Status",
                accessor: (a) => <StatusBadge status={a.status} label={a.status.toUpperCase()} />,
              },
              {
                header: "Actions",
                accessor: (a) => (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAssessmentToDelete(a)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ),
              },
            ]}
          />
        </Panel>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* DIALOG: ADD MODULE                                                         */}
      {/* -------------------------------------------------------------------------- */}
      <Dialog open={addModuleOpen} onOpenChange={setAddModuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Assessment Module</DialogTitle>
            <DialogDescription>
              Create a persistent assessment module. New modules default to Hidden until assigned to authorized colleges.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateModule} className="space-y-4 py-2">
            <div>
              <Label htmlFor="mod-name">Module Name</Label>
              <Input
                id="mod-name"
                placeholder="e.g. System Architecture Diagnostic"
                value={newModName}
                onChange={(e) => setNewModName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Domain</Label>
              <Select value={newModDomain} onValueChange={(v: any) => setNewModDomain(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Technical">Technical</SelectItem>
                  <SelectItem value="Aptitude">Aptitude</SelectItem>
                  <SelectItem value="Verbal">Verbal</SelectItem>
                  <SelectItem value="Soft Skills">Soft Skills</SelectItem>
                  <SelectItem value="Coding">Coding</SelectItem>
                  <SelectItem value="Core Engineering">Core Engineering</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="mod-desc">Description</Label>
              <Textarea
                id="mod-desc"
                placeholder="Brief description of the assessment scope and competencies covered..."
                value={newModDesc}
                onChange={(e) => setNewModDesc(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddModuleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingModule}>
                {savingModule ? "Creating…" : "Create Module"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------------- */}
      {/* DIALOG: EDIT MODULE                                                        */}
      {/* -------------------------------------------------------------------------- */}
      <Dialog open={Boolean(editingModule)} onOpenChange={(open) => !open && setEditingModule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assessment Module</DialogTitle>
            <DialogDescription>
              Update module details and description.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateModule} className="space-y-4 py-2">
            <div>
              <Label>Module Name</Label>
              <Input
                value={editModName}
                onChange={(e) => setEditModName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Domain</Label>
              <Select value={editModDomain} onValueChange={(v: any) => setEditModDomain(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Technical">Technical</SelectItem>
                  <SelectItem value="Aptitude">Aptitude</SelectItem>
                  <SelectItem value="Verbal">Verbal</SelectItem>
                  <SelectItem value="Soft Skills">Soft Skills</SelectItem>
                  <SelectItem value="Coding">Coding</SelectItem>
                  <SelectItem value="Core Engineering">Core Engineering</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={editModDesc}
                onChange={(e) => setEditModDesc(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingModule(null)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------------- */}
      {/* DIALOG: MANAGE COLLEGE VISIBILITY MODAL                                    */}
      {/* -------------------------------------------------------------------------- */}
      <Dialog open={visibilityModalOpen} onOpenChange={setVisibilityModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage College Visibility</DialogTitle>
            <DialogDescription>
              Configure institutional access for &ldquo;{targetModuleForVisibility?.name}&rdquo;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Visibility Policy</Label>
              <Select
                value={visibilityStatus}
                onValueChange={(val: "visible" | "hidden") => setVisibilityStatus(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hidden">Hidden (No college access)</SelectItem>
                  <SelectItem value="visible">Visible to selected colleges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {visibilityStatus === "visible" && (
              <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Authorized Institutions</Label>
                  <span className="text-[11px] text-muted-foreground">
                    {selectedCollegeIds.length} selected (≥ 1 required)
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search colleges by name or code..."
                    value={collegeSearch}
                    onChange={(e) => setCollegeSearch(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                  {colleges
                    .filter((col) => {
                      if (!collegeSearch.trim()) return true;
                      const q = collegeSearch.toLowerCase();
                      return col.name.toLowerCase().includes(q) || col.code.toLowerCase().includes(q);
                    })
                    .map((col) => {
                      const isChecked = selectedCollegeIds.includes(col.id);
                      return (
                        <div
                          key={col.id}
                          onClick={() => {
                            setSelectedCollegeIds((prev) =>
                              isChecked ? prev.filter((id) => id !== col.id) : [...prev, col.id]
                            );
                          }}
                          className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-card hover:bg-muted/50"
                          }`}
                        >
                          <div>
                            <span className="font-semibold">{col.code}</span> · {col.name}
                          </div>
                          {isChecked && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVisibilityModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVisibility} disabled={savingVisibility}>
              {savingVisibility ? "Saving…" : "Save Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------------- */}
      {/* ALERT DIALOG: DELETE MODULE CONFIRMATION                                   */}
      {/* -------------------------------------------------------------------------- */}
      <AlertDialog open={Boolean(moduleToDelete)} onOpenChange={(open) => !open && setModuleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Permanently Delete Assessment Module?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete module &ldquo;{moduleToDelete?.name}&rdquo;?
              <br />
              <br />
              <strong>Warning:</strong> This action will cascade and permanently delete all child assessment blueprints, question mappings, and college access records associated with this module in both the local database and Supabase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingModule}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModule}
              disabled={deletingModule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingModule ? "Deleting…" : "Delete Module"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* -------------------------------------------------------------------------- */}
      {/* DIALOG: CREATE ASSESSMENT BLUEPRINT                                        */}
      {/* -------------------------------------------------------------------------- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Assessment Blueprint</DialogTitle>
            <DialogDescription>
              Define blueprint title, target parameters, and question quota.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAssessment} className="space-y-4 py-2">
            <div>
              <Label htmlFor="asm-title">Assessment Title</Label>
              <Input
                id="asm-title"
                placeholder="e.g. Full Stack System Design & Problem Solving Benchmark"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Module</Label>
                <Input
                  value={activeModule?.name || "Technical"}
                  disabled
                  className="bg-muted text-xs"
                />
              </div>

              <div>
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="asm-duration">Duration (mins)</Label>
                <Input
                  id="asm-duration"
                  type="number"
                  min="10"
                  max="300"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="asm-quota">Questions</Label>
                <Input
                  id="asm-quota"
                  type="number"
                  min="1"
                  max="200"
                  value={questionsCount}
                  onChange={(e) => setQuestionsCount(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="asm-marks">Total Marks</Label>
                <Input
                  id="asm-marks"
                  type="number"
                  min="10"
                  max="500"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="asm-pass">Passing Marks</Label>
              <Input
                id="asm-pass"
                type="number"
                min="1"
                max={totalMarks}
                value={passingMarks}
                onChange={(e) => setPassingMarks(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <Label htmlFor="asm-desc">Description</Label>
              <Textarea
                id="asm-desc"
                placeholder="Diagnostic scope and benchmark competencies..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingBlueprint}>
                {submittingBlueprint ? "Creating…" : "Create Blueprint"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------------- */}
      {/* ALERT DIALOG: DELETE ASSESSMENT CONFIRMATION                               */}
      {/* -------------------------------------------------------------------------- */}
      <AlertDialog
        open={Boolean(assessmentToDelete)}
        onOpenChange={(open) => !open && setAssessmentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Delete Assessment Blueprint?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete assessment blueprint &ldquo;{assessmentToDelete?.title}&rdquo; ({assessmentToDelete?.code})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAssessment}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAssessment}
              disabled={deletingAssessment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAssessment ? "Deleting…" : "Delete Blueprint"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
