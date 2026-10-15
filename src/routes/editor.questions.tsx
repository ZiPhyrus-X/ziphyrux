import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertCircle,
  Archive,
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  Clock,
  Code,
  Cpu,
  Download,
  Edit,
  Eye,
  EyeOff,
  FileCheck,
  FileCode,
  FileDown,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderOpen,
  FolderPlus,
  HelpCircle,
  History,
  Layers,
  Lock,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Tag,
  Terminal,
  Trash2,
  Upload,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { PageHeader, Panel, fmt } from "@/features/editor/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api/client";
import { authService } from "@/lib/auth/service";

export const Route = createFileRoute("/editor/questions")({
  head: () => ({
    meta: [
      { title: "Question Management & Bank — Ziphyrus X Editor" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuestionManagementPage,
});

interface QuestionModule {
  id: string;
  name: string;
  normalizedName: string;
  description?: string;
  moduleKind: "assessment" | "coding";
  visibilityStatus: "hidden" | "visible";
  status: "active" | "archived";
  blueprintCode?: string;
  targetDifficulty?: "Beginner" | "Intermediate" | "Advanced";
  domain?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  totalQuestions: number;
  draftCount: number;
  inReviewCount: number;
  publishedCount: number;
  archivedCount: number;
  assignedCollegeCount: number;
  assignedColleges: {
    id: string;
    code: string;
    name: string;
    status: string;
    grantedAt: string;
    grantedBy: string;
  }[];
}

interface CodingProblemItem {
  id: string;
  code: string;
  moduleId: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
  version: string;
  status: "draft" | "in_review" | "published" | "archived";
  description?: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  supportedLanguages: string[];
  referenceSolution?: {
    language: string;
    code: string;
    validatedAt?: string;
    validationStatus?: "valid" | "invalid" | "untested";
  };
  testCases: {
    id: string;
    input: string;
    expectedOutput: string;
    isSample: boolean;
    explanation?: string;
    orderIndex: number;
  }[];
  currentVersion: number;
  assessmentUsageCount?: number;
  submissionCount?: number;
  acceptedCount?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  publishedBy?: string;
}

interface CollegeItem {
  id: string;
  name: string;
  code: string;
  status: "active" | "hold" | "deactive";
}

interface QuestionItem {
  id: string;
  code: string;
  moduleId: string;
  domain: string;
  type: "MCQ" | "Long Answer" | "Short Answer";
  difficulty: "Easy" | "Medium" | "Hard";
  stem: string;
  options?: string[];
  correctAnswer?: string;
  expectedAnswer?: string;
  rubric?: string;
  explanation?: string;
  tags?: string[];
  currentVersion: number;
  status: "draft" | "in_review" | "published" | "archived";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  publishedBy?: string;
  assessmentUsageCount?: number;
}

interface UploadBatch {
  id: string;
  moduleId?: string;
  moduleName: string;
  filename: string;
  uploadMethod: string;
  uploadedBy: string;
  totalRows: number;
  importedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  status: "completed" | "processing" | "failed" | "partial";
  publicationStatus: "draft" | "in_review" | "published";
  errorSummary?: string;
  rejectedDetails?: { rowNumber: number; data?: any; errors: string[] }[];
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

export function QuestionManagementPage() {
  const session = authService.getSession();
  const currentEditor = session?.user?.loginId || "editor1@ziphyrus.in";

  // State: Modules
  const [modules, setModules] = useState<QuestionModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<string>("mod-tech");
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [newModuleDesc, setNewModuleDesc] = useState("");
  const [newModuleKind, setNewModuleKind] = useState<"assessment" | "coding">("assessment");
  const [newBlueprintCode, setNewBlueprintCode] = useState("");
  const [newTargetDifficulty, setNewTargetDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [newDomain, setNewDomain] = useState<string>("Technical");
  const [availableBlueprints, setAvailableBlueprints] = useState<any[]>([]);
  const [isCustomBlueprint, setIsCustomBlueprint] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<QuestionModule | null>(null);
  const [deletingModule, setDeletingModule] = useState(false);
  const [savingModule, setSavingModule] = useState(false);

  const selectedBlueprint = useMemo(() => {
    return availableBlueprints.find((b) => b.code === newBlueprintCode);
  }, [availableBlueprints, newBlueprintCode]);

  // Edit / Archive Module
  const [editingModule, setEditingModule] = useState<QuestionModule | null>(null);
  const [editModuleName, setEditModuleName] = useState("");
  const [editModuleCode, setEditModuleCode] = useState("");
  const [editBlueprintCode, setEditBlueprintCode] = useState("");
  const [editModuleDesc, setEditModuleDesc] = useState("");
  const [updatingModule, setUpdatingModule] = useState(false);

  // State: College Visibility Management Dialog
  const [colleges, setColleges] = useState<CollegeItem[]>([]);
  const [visibilityDialogOpen, setVisibilityDialogOpen] = useState(false);
  const [selectedModuleForVisibility, setSelectedModuleForVisibility] = useState<QuestionModule | null>(null);
  const [visMode, setVisMode] = useState<"hidden" | "visible">("hidden");
  const [selectedCollegeIds, setSelectedCollegeIds] = useState<string[]>([]);
  const [collegeSearch, setCollegeSearch] = useState("");
  const [savingVisibility, setSavingVisibility] = useState(false);

  // State: Upload History (Top section)
  const [uploadHistory, setUploadHistory] = useState<UploadBatch[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historySearch, setHistorySearch] = useState("");
  const [historyModuleFilter, setHistoryModuleFilter] = useState("all");
  const [historyMethodFilter, setHistoryMethodFilter] = useState("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [inspectBatch, setInspectBatch] = useState<UploadBatch | null>(null);

  // State: Workspace Questions (Assessment modules)
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionSearch, setQuestionSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<string>("bank");

  // State: Workspace Coding Problems (Coding module)
  const [codingProblems, setCodingProblems] = useState<CodingProblemItem[]>([]);
  const [loadingCodingProblems, setLoadingCodingProblems] = useState(false);
  const [codingSearch, setCodingSearch] = useState("");
  const [codingDifficultyFilter, setCodingDifficultyFilter] = useState("all");
  const [codingStatusFilter, setCodingStatusFilter] = useState("all");
  const [viewCodingProblem, setViewCodingProblem] = useState<CodingProblemItem | null>(null);
  const [selectedProblemForValidator, setSelectedProblemForValidator] = useState<string>("");
  const [validatorOutput, setValidatorOutput] = useState<any | null>(null);
  const [validatingRefSolution, setValidatingRefSolution] = useState(false);
  const [codingSubmissions, setCodingSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Form State: Add Coding Problem Draft
  const [newCodingTitle, setNewCodingTitle] = useState("");
  const [newCodingTopic, setNewCodingTopic] = useState("Algorithms");
  const [newCodingDifficulty, setNewCodingDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [newCodingDescription, setNewCodingDescription] = useState("");
  const [newCodingTimeLimit, setNewCodingTimeLimit] = useState(2000);
  const [newCodingMemoryLimit, setNewCodingMemoryLimit] = useState(256);
  const [newCodingLanguages, setNewCodingLanguages] = useState<string[]>(["python", "javascript", "cpp", "java"]);
  const [newCodingSampleInput, setNewCodingSampleInput] = useState("");
  const [newCodingSampleOutput, setNewCodingSampleOutput] = useState("");
  const [newCodingSampleExplanation, setNewCodingSampleExplanation] = useState("");
  const [newCodingHiddenInput, setNewCodingHiddenInput] = useState("");
  const [newCodingHiddenOutput, setNewCodingHiddenOutput] = useState("");
  const [newCodingRefLang, setNewCodingRefLang] = useState("python");
  const [newCodingRefCode, setNewCodingRefCode] = useState("");
  const [savingCodingProblem, setSavingCodingProblem] = useState(false);

  // Bulk Import Coding Problems
  const [codingBulkJson, setCodingBulkJson] = useState("");
  const [importingCodingBulk, setImportingCodingBulk] = useState(false);

  // State: View Question Details (Assessment)
  const [viewQuestion, setViewQuestion] = useState<QuestionItem | null>(null);

  // Form State: Add Assessment Question
  const [newQuestionType, setNewQuestionType] = useState<"MCQ" | "Short Answer" | "Long Answer">("MCQ");
  const [newStem, setNewStem] = useState("");
  const [newDifficulty, setNewDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [newOptions, setNewOptions] = useState<string[]>(["", "", "", ""]);
  const [newCorrectAnswer, setNewCorrectAnswer] = useState("");
  const [newExpectedAnswer, setNewExpectedAnswer] = useState("");
  const [newRubric, setNewRubric] = useState("");
  const [newExplanation, setNewExplanation] = useState("");
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Form State: Bulk Upload (Assessment)
  const [uploadFormat, setUploadFormat] = useState<"csv" | "json" | "xlsx">("csv");
  const [uploadFilename, setUploadFilename] = useState("");
  const [uploadContent, setUploadContent] = useState("");
  const [validationPreview, setValidationPreview] = useState<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    warnings: string[];
    rows: { rowNumber: number; valid: boolean; data: any; errors: string[] }[];
  } | null>(null);
  const [validatingUpload, setValidatingUpload] = useState(false);
  const [confirmingUpload, setConfirmingUpload] = useState(false);

  // Delete Question / Problem Confirmation State
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    code: string;
    type: "question" | "problem";
    title: string;
  } | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  // ---------------------------------------------------------------------------
  // Load Modules & Colleges
  // ---------------------------------------------------------------------------
  const fetchModules = async () => {
    setLoadingModules(true);
    try {
      const res = await api.editor.modules.list();
      setModules(res);
      if (res.length > 0 && !res.some((m) => m.id === activeModuleId)) {
        setActiveModuleId(res[0].id);
      }
    } catch (e: any) {
      toast.error("Failed to load question modules: " + (e?.message || "Unknown error"));
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchColleges = async () => {
    try {
      const res = await api.editor.colleges.list();
      setColleges(res || []);
    } catch (e: any) {
      console.error("Failed to load colleges:", e);
    }
  };

  // ---------------------------------------------------------------------------
  // Load Upload History (Top section)
  // ---------------------------------------------------------------------------
  const fetchUploadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.editor.questions.getUploadHistory({
        moduleId: historyModuleFilter !== "all" ? historyModuleFilter : undefined,
        search: historySearch || undefined,
        uploadMethod: historyMethodFilter !== "all" ? historyMethodFilter : undefined,
        status: historyStatusFilter !== "all" ? historyStatusFilter : undefined,
      });
      setUploadHistory(res);
    } catch (e: any) {
      toast.error("Failed to load upload history: " + (e?.message || "Unknown error"));
    } finally {
      setLoadingHistory(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Load Assessment Questions
  // ---------------------------------------------------------------------------
  const fetchQuestions = async () => {
    if (!activeModuleId) return;
    setLoadingQuestions(true);
    try {
      const res = await api.editor.questions.list({
        moduleId: activeModuleId,
        type: typeFilter !== "all" ? typeFilter : undefined,
        difficulty: difficultyFilter !== "all" ? difficultyFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: questionSearch || undefined,
      });
      setQuestions(res);
    } catch (e: any) {
      toast.error("Failed to load module questions: " + (e?.message || "Unknown error"));
    } finally {
      setLoadingQuestions(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Load Coding Problems
  // ---------------------------------------------------------------------------
  const fetchCodingProblems = async () => {
    setLoadingCodingProblems(true);
    try {
      const res = await api.editor.coding.listProblems({
        status: codingStatusFilter !== "all" ? codingStatusFilter : undefined,
        difficulty: codingDifficultyFilter !== "all" ? codingDifficultyFilter : undefined,
        search: codingSearch || undefined,
      });
      setCodingProblems(res || []);
      if (res.length > 0 && !selectedProblemForValidator) {
        setSelectedProblemForValidator(res[0].id);
      }
    } catch (e: any) {
      toast.error("Failed to load coding problems: " + (e?.message || "Unknown error"));
    } finally {
      setLoadingCodingProblems(false);
    }
  };

  const fetchCodingSubmissions = async (problemId: string) => {
    if (!problemId) return;
    setLoadingSubmissions(true);
    try {
      const res = await api.editor.coding.getSubmissions(problemId);
      setCodingSubmissions(res || []);
    } catch (e: any) {
      toast.error("Failed to load submissions: " + (e?.message || "Unknown error"));
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const fetchBlueprints = async () => {
    try {
      const res = await api.editor.assessments.list();
      setAvailableBlueprints(res || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchModules();
    fetchColleges();
    fetchBlueprints();
  }, []);

  useEffect(() => {
    if (addModuleOpen && !isCustomBlueprint && !newBlueprintCode) {
      const firstPub = availableBlueprints.find((b) => b.status === "published");
      if (firstPub) {
        setNewBlueprintCode(firstPub.code);
        if (firstPub.domain) setNewDomain(firstPub.domain);
        if (firstPub.difficulty) setNewTargetDifficulty(firstPub.difficulty);
      }
    }
  }, [addModuleOpen, availableBlueprints, isCustomBlueprint, newBlueprintCode]);

  useEffect(() => {
    fetchUploadHistory();
  }, [historySearch, historyModuleFilter, historyMethodFilter, historyStatusFilter]);

  const activeModule = useMemo(() => {
    return modules.find((m) => m.id === activeModuleId);
  }, [modules, activeModuleId]);

  useEffect(() => {
    if (!activeModule) return;
    if (activeModule.moduleKind === "coding") {
      fetchCodingProblems();
    } else {
      fetchQuestions();
    }
  }, [
    activeModuleId,
    activeModule?.moduleKind,
    typeFilter,
    difficultyFilter,
    statusFilter,
    questionSearch,
    codingStatusFilter,
    codingDifficultyFilter,
    codingSearch,
  ]);

  useEffect(() => {
    if (selectedProblemForValidator) {
      fetchCodingSubmissions(selectedProblemForValidator);
    }
  }, [selectedProblemForValidator]);

  // ---------------------------------------------------------------------------
  // Module Creation & Visibility Handlers
  // ---------------------------------------------------------------------------
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) {
      toast.error("Module name is required.");
      return;
    }
    setSavingModule(true);
    try {
      const created = await api.editor.modules.create({
        name: newModuleName.trim(),
        description: newModuleDesc.trim() || undefined,
        moduleKind: newModuleKind,
        blueprintCode: newBlueprintCode.trim() || undefined,
        targetDifficulty: newTargetDifficulty,
        domain: newDomain ? (newDomain as any) : undefined,
      });
      toast.success(`Module '${created.name}' created successfully.`);
      setAddModuleOpen(false);
      setNewModuleName("");
      setNewModuleDesc("");
      setNewModuleKind("assessment");
      setIsCustomBlueprint(false);
      setNewBlueprintCode("");
      setNewTargetDifficulty("Intermediate");
      setNewDomain("Technical");
      await fetchModules();
      setActiveModuleId(created.id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create module.");
    } finally {
      setSavingModule(false);
    }
  };

  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;
    setDeletingModule(true);
    try {
      await api.editor.modules.delete(moduleToDelete.id);
      toast.success(`Question module "${moduleToDelete.name}" deleted successfully.`);
      const remaining = modules.filter((m) => m.id !== moduleToDelete.id);
      if (activeModuleId === moduleToDelete.id && remaining.length > 0) {
        setActiveModuleId(remaining[0].id);
      }
      setModuleToDelete(null);
      await fetchModules();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete question module.");
    } finally {
      setDeletingModule(false);
    }
  };

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule || !editModuleName.trim()) return;
    if (!editModuleCode.trim()) {
      toast.error("Module unique code is required.");
      return;
    }
    setUpdatingModule(true);
    try {
      const res = await api.editor.modules.update(editingModule.id, {
        name: editModuleName.trim(),
        code: editModuleCode.trim(),
        blueprintCode: editBlueprintCode.trim() || undefined,
        description: editModuleDesc.trim() || undefined,
      });
      toast.success("Module updated successfully.");
      const updatedMod = res.data;
      if (activeModuleId === editingModule.id && updatedMod?.id) {
        setActiveModuleId(updatedMod.id);
      }
      setEditingModule(null);
      await fetchModules();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update module.");
    } finally {
      setUpdatingModule(false);
    }
  };

  const handleArchiveModule = async (moduleId: string) => {
    try {
      await api.editor.modules.archive(moduleId);
      toast.success("Module archived successfully.");
      await fetchModules();
    } catch (e: any) {
      toast.error(e?.message || "Cannot archive module.");
    }
  };

  const handleOpenVisibilityDialog = (mod: QuestionModule) => {
    setSelectedModuleForVisibility(mod);
    setVisMode(mod.visibilityStatus);
    setSelectedCollegeIds(mod.assignedColleges?.map((c) => c.id) || []);
    setCollegeSearch("");
    setVisibilityDialogOpen(true);
  };

  const handleSaveVisibility = async () => {
    if (!selectedModuleForVisibility) return;
    if (visMode === "visible" && selectedCollegeIds.length === 0) {
      toast.error("At least one college must be selected when module is Visible.");
      return;
    }
    setSavingVisibility(true);
    try {
      await api.editor.modules.updateVisibility(selectedModuleForVisibility.id, {
        visibilityStatus: visMode,
        collegeIds: visMode === "visible" ? selectedCollegeIds : [],
        confirmRevoke: true,
      });
      toast.success(
        `Module visibility updated to ${visMode.toUpperCase()} (${
          visMode === "visible" ? selectedCollegeIds.length + " college(s)" : "0 colleges"
        }).`
      );
      setVisibilityDialogOpen(false);
      await fetchModules();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update module visibility.");
    } finally {
      setSavingVisibility(false);
    }
  };

  const filteredColleges = useMemo(() => {
    if (!collegeSearch.trim()) return colleges;
    const q = collegeSearch.toLowerCase();
    return colleges.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [colleges, collegeSearch]);

  const toggleCollegeSelection = (collegeId: string) => {
    setSelectedCollegeIds((prev) =>
      prev.includes(collegeId) ? prev.filter((id) => id !== collegeId) : [...prev, collegeId]
    );
  };

  const handleSelectAllActiveColleges = () => {
    const activeIds = colleges.filter((c) => c.status === "active").map((c) => c.id);
    setSelectedCollegeIds(activeIds);
  };

  // ---------------------------------------------------------------------------
  // Assessment Question Handlers
  // ---------------------------------------------------------------------------
  const handleSaveQuestion = async (submitForReview = false) => {
    if (!activeModuleId) {
      toast.error("Please select an active module first.");
      return;
    }
    if (!newStem.trim()) {
      toast.error("Question statement text is required.");
      return;
    }

    if (newQuestionType === "MCQ") {
      if (newOptions.some((o) => !o.trim())) {
        toast.error("All four MCQ answer options must be filled.");
        return;
      }
      if (!newCorrectAnswer.trim()) {
        toast.error("Please select a correct answer for the MCQ.");
        return;
      }
    }

    setSavingQuestion(true);
    try {
      await api.editor.questions.create({
        moduleId: activeModuleId,
        stem: newStem.trim(),
        type: newQuestionType,
        difficulty: newDifficulty,
        options: newQuestionType === "MCQ" ? newOptions.map((o) => o.trim()) : undefined,
        correctAnswer: newQuestionType === "MCQ" ? newCorrectAnswer.trim() : undefined,
        expectedAnswer: newQuestionType === "Short Answer" ? newExpectedAnswer.trim() : undefined,
        rubric: newQuestionType === "Long Answer" ? newRubric.trim() : undefined,
        explanation: newExplanation.trim() || undefined,
        submitForReview,
      });

      toast.success(
        submitForReview
          ? "Question created and submitted for review!"
          : "Question draft saved successfully."
      );

      setNewStem("");
      setNewOptions(["", "", "", ""]);
      setNewCorrectAnswer("");
      setNewExpectedAnswer("");
      setNewRubric("");
      setNewExplanation("");
      setActiveWorkspaceTab("bank");
      await fetchQuestions();
      await fetchModules();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save question.");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleReviewAction = async (
    questionId: string,
    action: "return_to_draft" | "approve_and_publish" | "archive"
  ) => {
    try {
      await api.editor.questions.review(questionId, action);
      toast.success(
        action === "approve_and_publish"
          ? "Question approved and published for assessments!"
          : action === "return_to_draft"
          ? "Question returned to Draft state."
          : "Question archived."
      );
      await fetchQuestions();
      await fetchModules();
    } catch (e: any) {
      toast.error(e?.message || "Review action failed.");
    }
  };

  const handleSubmitForReview = async (questionId: string) => {
    try {
      await api.editor.questions.submit(questionId);
      toast.success("Question submitted for review.");
      await fetchQuestions();
      await fetchModules();
    } catch (e: any) {
      toast.error(e?.message || "Cannot submit for review.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeletingItem(true);
    try {
      if (itemToDelete.type === "question") {
        await api.editor.questions.delete(itemToDelete.id);
        toast.success(`Question ${itemToDelete.code} deleted successfully.`);
        await fetchQuestions();
        await fetchModules();
        if (viewQuestion?.id === itemToDelete.id) {
          setViewQuestion(null);
        }
      } else {
        await api.editor.coding.deleteProblem(itemToDelete.id);
        toast.success(`Coding problem ${itemToDelete.code} deleted successfully.`);
        await fetchCodingProblems();
        await fetchModules();
        if (viewCodingProblem?.id === itemToDelete.id) {
          setViewCodingProblem(null);
        }
      }
      setItemToDelete(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete item.");
    } finally {
      setDeletingItem(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Coding Problem Handlers
  // ---------------------------------------------------------------------------
  const handleCreateCodingProblem = async (submitForReview = false) => {
    if (!activeModuleId) return;
    if (!newCodingTitle.trim()) {
      toast.error("Problem title is required.");
      return;
    }
    if (!newCodingDescription.trim()) {
      toast.error("Problem statement / description is required.");
      return;
    }
    if (!newCodingSampleInput.trim() || !newCodingSampleOutput.trim()) {
      toast.error("Sample test case input and expected output are required.");
      return;
    }

    setSavingCodingProblem(true);
    try {
      const testCases = [
        {
          input: newCodingSampleInput.trim(),
          expectedOutput: newCodingSampleOutput.trim(),
          isSample: true,
          explanation: newCodingSampleExplanation.trim() || undefined,
          orderIndex: 1,
        },
      ];
      if (newCodingHiddenInput.trim() && newCodingHiddenOutput.trim()) {
        testCases.push({
          input: newCodingHiddenInput.trim(),
          expectedOutput: newCodingHiddenOutput.trim(),
          isSample: false,
          explanation: undefined,
          orderIndex: 2,
        });
      }

      const created = await api.editor.coding.createProblem({
        moduleId: activeModuleId,
        title: newCodingTitle.trim(),
        topic: newCodingTopic.trim() || "Algorithms",
        difficulty: newCodingDifficulty,
        description: newCodingDescription.trim(),
        timeLimitMs: Number(newCodingTimeLimit) || 2000,
        memoryLimitMb: Number(newCodingMemoryLimit) || 256,
        supportedLanguages: newCodingLanguages,
        referenceSolution: newCodingRefCode.trim()
          ? { language: newCodingRefLang, code: newCodingRefCode.trim() }
          : undefined,
        testCases,
        submitForReview,
      });

      toast.success(
        submitForReview
          ? `Coding problem ${created.code} created and submitted for review!`
          : `Coding problem draft ${created.code} created successfully.`
      );

      setNewCodingTitle("");
      setNewCodingDescription("");
      setNewCodingSampleInput("");
      setNewCodingSampleOutput("");
      setNewCodingSampleExplanation("");
      setNewCodingHiddenInput("");
      setNewCodingHiddenOutput("");
      setNewCodingRefCode("");
      setActiveWorkspaceTab("bank");
      await fetchCodingProblems();
      await fetchModules();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create coding problem.");
    } finally {
      setSavingCodingProblem(false);
    }
  };

  const handleValidateRefSolution = async (problemId: string) => {
    if (!problemId) return;
    setValidatingRefSolution(true);
    setValidatorOutput(null);
    try {
      const res = await api.editor.coding.validateReferenceSolution(problemId);
      setValidatorOutput(res);
      if (res.valid) {
        toast.success("Reference solution passed all test cases!");
      } else {
        toast.error("Reference solution failed one or more test cases.");
      }
      await fetchCodingProblems();
    } catch (e: any) {
      toast.error(e?.message || "Validation failed.");
    } finally {
      setValidatingRefSolution(false);
    }
  };

  const handleCodingReviewAction = async (
    problemId: string,
    action: "return_to_draft" | "approve_and_publish" | "archive"
  ) => {
    try {
      await api.editor.coding.review(problemId, action);
      toast.success(
        action === "approve_and_publish"
          ? "Coding problem approved & published to Judge!"
          : action === "return_to_draft"
          ? "Coding problem returned to Draft."
          : "Coding problem archived."
      );
      await fetchCodingProblems();
      await fetchModules();
    } catch (e: any) {
      toast.error(e?.message || "Review action failed.");
    }
  };

  const handleCodingSubmitForReview = async (problemId: string) => {
    try {
      await api.editor.coding.submit(problemId);
      toast.success("Problem submitted for publication review.");
      await fetchCodingProblems();
      await fetchModules();
    } catch (e: any) {
      toast.error(e?.message || "Cannot submit problem for review.");
    }
  };

  const handleCodingCreateVersion = async (problem: CodingProblemItem) => {
    try {
      const created = await api.editor.coding.createVersion(problem.id, {
        description: problem.description,
      });
      toast.success(`Created draft version ${created.version} from ${problem.version}.`);
      await fetchCodingProblems();
      await fetchModules();
    } catch (e: any) {
      toast.error(e?.message || "Cannot create new version.");
    }
  };

  const handleCodingBulkImport = async () => {
    if (!codingBulkJson.trim()) {
      toast.error("Please paste JSON array of coding problems.");
      return;
    }
    setImportingCodingBulk(true);
    try {
      const parsed = JSON.parse(codingBulkJson.trim());
      const problemsArray = Array.isArray(parsed) ? parsed : [parsed];
      const res = await api.editor.coding.bulkImport({
        moduleId: activeModuleId,
        problems: problemsArray,
      });
      toast.success(
        `Imported ${res.importedCount} coding problems as Draft (${res.rejectedCount} rejected).`
      );
      setCodingBulkJson("");
      setActiveWorkspaceTab("bank");
      await fetchCodingProblems();
      await fetchModules();
    } catch (e: any) {
      toast.error(e?.message || "Failed to import coding problems JSON.");
    } finally {
      setImportingCodingBulk(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Bulk Upload Validation & Confirmation Handlers (Assessment)
  // ---------------------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setUploadContent(text);
      validateFileContent(text, uploadFormat);
    };
    reader.readAsText(file);
  };

  const validateFileContent = async (content: string, format: "csv" | "json" | "xlsx") => {
    if (!activeModuleId) {
      toast.error("Please select a target module first.");
      return;
    }
    setValidatingUpload(true);
    try {
      const preview = await api.editor.questions.validateUpload({
        content,
        format,
        moduleId: activeModuleId,
      });
      setValidationPreview(preview);
    } catch (e: any) {
      toast.error(e?.message || "Failed to validate file content.");
      setValidationPreview(null);
    } finally {
      setValidatingUpload(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!validationPreview || !activeModuleId) return;
    setConfirmingUpload(true);
    try {
      const methodLabel =
        uploadFormat === "csv"
          ? "CSV import"
          : uploadFormat === "json"
          ? "JSON import"
          : "XLSX import";

      const res = await api.editor.questions.confirmUpload({
        moduleId: activeModuleId,
        filename: uploadFilename || `upload_${Date.now()}.${uploadFormat}`,
        uploadMethod: methodLabel,
        validatedRows: validationPreview.rows,
      });

      toast.success(
        `Import completed: ${res.importedCount} questions saved as Draft (${res.rejectedCount} rejected).`
      );

      setValidationPreview(null);
      setUploadContent("");
      setUploadFilename("");
      setActiveWorkspaceTab("bank");
      await fetchQuestions();
      await fetchModules();
      await fetchUploadHistory();
    } catch (e: any) {
      toast.error(e?.message || "Import failed.");
    } finally {
      setConfirmingUpload(false);
    }
  };

  const downloadSampleTemplate = () => {
    const sampleCsv = `question_text,question_type,difficulty,option_a,option_b,option_c,option_d,correct_option,expected_answer,explanation
"What is the average time complexity of Hash Table lookup?","MCQ","Easy","O(1)","O(log n)","O(n)","O(n^2)","O(1)","","Direct constant time address calculation"
"Explain the difference between process and thread.","Long Answer","Medium","","","","","","Process has independent address space; thread shares parent memory space.","Operating Systems concurrency"
"What is the return type of a constructor in Java?","Short Answer","Easy","","","","","","No return type","Constructors initialize object instances without return signatures"`;

    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ziphyrus_question_upload_template_${activeModule?.normalizedName || "sample"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadErrorReport = (batch: UploadBatch) => {
    if (!batch.rejectedDetails || batch.rejectedDetails.length === 0) {
      toast.info("No rejected rows recorded for this batch.");
      return;
    }
    const csvContent =
      "RowNumber,Errors,SampleContent\n" +
      batch.rejectedDetails
        .map((r) => `"${r.rowNumber}","${r.errors.join("; ")}","${JSON.stringify(r.data).replace(/"/g, '""')}"`)
        .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `error_report_${batch.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header */}
      <PageHeader
        title="Question Management & Question Bank"
        desc="Authoritative repository for domain-specific question modules, Coding Judge programming problems, versioned assets, and college visibility governance."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchModules();
                fetchColleges();
                fetchUploadHistory();
                if (activeModule?.moduleKind === "coding") {
                  fetchCodingProblems();
                } else {
                  fetchQuestions();
                }
              }}
              disabled={loadingModules || loadingHistory || loadingQuestions || loadingCodingProblems}
              className="gap-1.5"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loadingModules || loadingHistory || loadingQuestions || loadingCodingProblems
                    ? "animate-spin"
                    : ""
                }`}
              />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setAddModuleOpen(true)} className="gap-1.5 shadow-sm">
              <FolderPlus className="h-4 w-4" /> Add Module
            </Button>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 2. TOP SECTION: UPLOADED QUESTION HISTORY                                  */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Uploaded Question History & Import Ledger
              </h2>
              <Badge variant="secondary" className="font-mono text-xs">
                {uploadHistory.length} batches
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Immutable ledger of manual, file-based, and draft imports across all question modules.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-36">
              <Select value={historyModuleFilter} onValueChange={setHistoryModuleFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Select value={historyMethodFilter} onValueChange={setHistoryMethodFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="CSV import">CSV import</SelectItem>
                  <SelectItem value="JSON import">JSON import</SelectItem>
                  <SelectItem value="XLSX import">XLSX import</SelectItem>
                  <SelectItem value="Manual question creation">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-32">
              <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative w-44 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search file, batch, user…"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-muted-foreground font-medium">
                  <th className="py-2.5 px-3">Batch ID</th>
                  <th className="py-2.5 px-3">Module</th>
                  <th className="py-2.5 px-3">Filename</th>
                  <th className="py-2.5 px-3">Upload Method</th>
                  <th className="py-2.5 px-3">Uploaded By</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Submitted</th>
                  <th className="py-2.5 px-3 text-right">Imported</th>
                  <th className="py-2.5 px-3 text-right">Rejected</th>
                  <th className="py-2.5 px-3 text-center">Processing</th>
                  <th className="py-2.5 px-3 text-center">Publication</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin inline-block mr-2" />
                      Loading upload history…
                    </td>
                  </tr>
                ) : uploadHistory.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-muted-foreground">
                      No upload batches found matching current filters.
                    </td>
                  </tr>
                ) : (
                  uploadHistory.map((batch) => (
                    <tr key={batch.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-primary">
                        {batch.id}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {batch.moduleName}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-medium max-w-[160px] truncate" title={batch.filename}>
                        {batch.filename}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{batch.uploadMethod}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {batch.uploadedBy}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                        {fmt(batch.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{batch.totalRows}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-500">
                        {batch.importedRows}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-500 font-bold">
                        {batch.rejectedRows}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${
                            batch.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : batch.status === "partial"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                          }`}
                        >
                          {batch.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant="secondary"
                          className="text-[10px] capitalize font-mono text-muted-foreground"
                        >
                          {batch.publicationStatus}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Inspect batch details"
                            onClick={() => setInspectBatch(batch)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {batch.rejectedRows > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                              title="Download rejected rows error report"
                              onClick={() => downloadErrorReport(batch)}
                            >
                              <FileDown className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. QUESTION MODULES SECTION                                               */}
      {/* ========================================================================= */}
      <section className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Question Modules & College Visibility
              </h2>
              <Badge variant="secondary" className="font-mono text-xs">
                {modules.length} modules
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Domain modules governing curriculum content. Configure college visibility or select a module to manage its question assets.
            </p>
          </div>
        </div>

        {/* Modules Cards Grid: Flexible 3 modules per row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingModules ? (
            <div className="col-span-full py-8 text-center text-muted-foreground text-xs">
              <RefreshCw className="h-4 w-4 animate-spin inline-block mr-2" />
              Loading question modules…
            </div>
          ) : (
            modules.map((mod) => {
              const isSelected = activeModuleId === mod.id;

              return (
                <div
                  key={mod.id}
                  className={`rounded-lg border p-4 transition-all relative shadow-sm flex flex-col justify-between overflow-hidden ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-border/80 hover:shadow"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Row 1 (Title + Edit button), Row 2 (Badges with uniform min-height) */}
                    <div className="space-y-1.5">
                      {/* Row 1: Module Title & Edit/Delete Icons */}
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <h3 className="text-sm font-bold text-foreground truncate" title={mod.name}>
                          {mod.name}
                        </h3>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingModule(mod);
                              setEditModuleName(mod.name);
                              setEditModuleCode(mod.id);
                              setEditBlueprintCode(mod.blueprintCode || "");
                              setEditModuleDesc(mod.description || "");
                            }}
                            title="Edit module metadata"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModuleToDelete(mod);
                            }}
                            title="Delete question module"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Row 2: Dedicated badges container with uniform min-h-[22px] */}
                      <div className="flex items-center gap-1.5 flex-wrap min-h-[22px]">
                        {isSelected && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground leading-normal">
                            Active
                          </Badge>
                        )}
                        {mod.moduleKind === "coding" ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 bg-indigo-500/10 text-indigo-600 border-indigo-500/30 gap-1 leading-normal"
                          >
                            <Code className="h-3 w-3 shrink-0" /> Coding
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 bg-cyan-500/10 text-cyan-600 border-cyan-500/30 gap-1 leading-normal"
                          >
                            <FileQuestion className="h-3 w-3 shrink-0" /> Assessment
                          </Badge>
                        )}
                        {mod.blueprintCode && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1 font-mono leading-normal"
                            title={`Linked Blueprint: ${mod.blueprintCode}${mod.targetDifficulty ? ` (${mod.targetDifficulty})` : ""}`}
                          >
                            BP: {mod.blueprintCode}
                          </Badge>
                        )}
                      </div>

                      {/* Description with uniform 2-line clamp */}
                      <p className="text-[11px] text-muted-foreground line-clamp-2 min-h-[32px] pt-0.5">
                        {mod.description ||
                          (mod.moduleKind === "coding"
                            ? "Programming problems, test cases, and judge execution."
                            : "Core domain curriculum questions.")}
                      </p>
                    </div>

                    {/* Visibility Badge */}
                    <div>
                      {mod.visibilityStatus === "visible" ? (
                        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 font-mono truncate max-w-full">
                          <Eye className="h-3 w-3 shrink-0" />
                          <span className="truncate">Visible ({mod.assignedCollegeCount || mod.assignedColleges?.length || 0} colleges)</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-muted/60 text-muted-foreground gap-1 font-mono"
                        >
                          <EyeOff className="h-3 w-3 shrink-0" /> Hidden (0 colleges)
                        </Badge>
                      )}
                    </div>

                    {/* Module Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center font-mono">
                      <div className="bg-muted/40 p-1.5 rounded">
                        <span className="text-[10px] text-muted-foreground block">Total</span>
                        <span className="text-xs font-bold text-foreground">
                          {mod.totalQuestions}
                        </span>
                      </div>
                      <div className="bg-emerald-500/10 p-1.5 rounded text-emerald-600">
                        <span className="text-[10px] block">Published</span>
                        <span className="text-xs font-bold">{mod.publishedCount}</span>
                      </div>
                      <div className="bg-amber-500/10 p-1.5 rounded text-amber-600">
                        <span className="text-[10px] block">Draft/Rev</span>
                        <span className="text-xs font-bold">
                          {mod.draftCount + mod.inReviewCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2 w-full min-w-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1 px-2.5 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenVisibilityDialog(mod)}
                      title="Manage College Visibility"
                    >
                      <Eye className="h-3 w-3 shrink-0" />
                      <span>Manage Visibility</span>
                    </Button>
                    <Button
                      size="sm"
                      variant={isSelected ? "default" : "secondary"}
                      className="text-xs h-7 gap-1 px-2.5 font-semibold shrink-0"
                      onClick={() => {
                        setActiveModuleId(mod.id);
                        setActiveWorkspaceTab("bank");
                      }}
                      title={mod.moduleKind === "coding" ? "Manage Problems" : "Manage Questions"}
                    >
                      <span>
                        {mod.moduleKind === "coding" ? "Manage Problems" : "Manage Questions"}
                      </span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SELECTED MODULE WORKSPACE                                              */}
      {/* ========================================================================= */}
      {activeModule && (
        <section className="space-y-4 pt-4 border-t border-border">
          {/* Workspace Banner */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  3
                </span>
                <Badge variant="outline" className="text-xs font-mono uppercase">
                  {activeModule.name} Workspace
                </Badge>
                {activeModule.moduleKind === "coding" ? (
                  <Badge variant="secondary" className="gap-1 bg-indigo-500/10 text-indigo-500">
                    <Code className="h-3 w-3" /> Coding Judge Module
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 bg-cyan-500/10 text-cyan-600">
                    <FileQuestion className="h-3 w-3" /> Assessment Module
                  </Badge>
                )}
                <h3 className="text-base font-bold text-foreground">{activeModule.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{activeModule.description}</p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <Badge variant="secondary">Total: {activeModule.totalQuestions}</Badge>
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                Published: {activeModule.publishedCount}
              </Badge>
              <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                In Review: {activeModule.inReviewCount}
              </Badge>
              <Badge variant="outline" className="text-slate-500 border-slate-500/30">
                Draft: {activeModule.draftCount}
              </Badge>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* BRANCH A: CODING MODULE WORKSPACE                                       */}
          {/* ======================================================================= */}
          {activeModule.moduleKind === "coding" ? (
            <Tabs value={activeWorkspaceTab} onValueChange={setActiveWorkspaceTab} className="space-y-4">
              <TabsList className="grid grid-cols-2 sm:grid-cols-6 w-full">
                <TabsTrigger value="bank" className="text-xs gap-1.5">
                  <Code className="h-3.5 w-3.5" /> Problem Bank
                </TabsTrigger>
                <TabsTrigger value="add" className="text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Create Problem
                </TabsTrigger>
                <TabsTrigger value="validate" className="text-xs gap-1.5">
                  <Play className="h-3.5 w-3.5" /> Reference Validator
                </TabsTrigger>
                <TabsTrigger value="review" className="text-xs gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Review & Publish (
                  {activeModule.draftCount + activeModule.inReviewCount})
                </TabsTrigger>
                <TabsTrigger value="bulk" className="text-xs gap-1.5">
                  <UploadCloud className="h-3.5 w-3.5" /> Bulk Import
                </TabsTrigger>
                <TabsTrigger value="telemetry" className="text-xs gap-1.5">
                  <Terminal className="h-3.5 w-3.5" /> Judge Telemetry
                </TabsTrigger>
              </TabsList>

              {/* CODING TAB 1: PROBLEM BANK */}
              <TabsContent value="bank" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border border-border">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search coding problems…"
                      value={codingSearch}
                      onChange={(e) => setCodingSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={codingDifficultyFilter} onValueChange={setCodingDifficultyFilter}>
                      <SelectTrigger className="h-8 text-xs w-32">
                        <SelectValue placeholder="All Difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Difficulty</SelectItem>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={codingStatusFilter} onValueChange={setCodingStatusFilter}>
                      <SelectTrigger className="h-8 text-xs w-32">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/50 text-muted-foreground font-medium">
                          <th className="py-2.5 px-3">Problem Code</th>
                          <th className="py-2.5 px-3">Title & Topic</th>
                          <th className="py-2.5 px-3">Difficulty</th>
                          <th className="py-2.5 px-3">Languages</th>
                          <th className="py-2.5 px-3 text-center">Test Cases</th>
                          <th className="py-2.5 px-3 text-center">Limits</th>
                          <th className="py-2.5 px-3 text-center">Version</th>
                          <th className="py-2.5 px-3 text-center">Submissions</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {loadingCodingProblems ? (
                          <tr>
                            <td colSpan={10} className="py-8 text-center text-muted-foreground">
                              <RefreshCw className="h-4 w-4 animate-spin inline-block mr-2" />
                              Loading coding problems…
                            </td>
                          </tr>
                        ) : codingProblems.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-8 text-center text-muted-foreground">
                              No coding problems found matching current filters.
                            </td>
                          </tr>
                        ) : (
                          codingProblems.map((prob) => (
                            <tr key={prob.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-primary whitespace-nowrap">
                                {prob.code}
                              </td>
                              <td className="py-2.5 px-3 max-w-[240px]">
                                <span className="font-semibold text-foreground block truncate" title={prob.title}>
                                  {prob.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground block font-mono">
                                  {prob.topic}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] ${
                                    prob.difficulty === "Easy"
                                      ? "text-emerald-500 bg-emerald-500/10"
                                      : prob.difficulty === "Medium"
                                      ? "text-amber-500 bg-amber-500/10"
                                      : "text-rose-500 bg-rose-500/10"
                                  }`}
                                >
                                  {prob.difficulty}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                                {prob.supportedLanguages?.slice(0, 3).join(", ")}
                                {prob.supportedLanguages?.length > 3 && ` +${prob.supportedLanguages.length - 3}`}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono">
                                <span className="text-foreground font-semibold">
                                  {prob.testCases?.length || 0}
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                  ({prob.testCases?.filter((t) => t.isSample).length || 0} sample)
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-[10px] text-muted-foreground">
                                {prob.timeLimitMs}ms / {prob.memoryLimitMb}MB
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono">
                                {prob.version || `v${prob.currentVersion || 1}`}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono">
                                <span className="text-foreground font-semibold">
                                  {prob.submissionCount || 0}
                                </span>
                                <span className="text-[10px] text-emerald-500 block">
                                  {prob.acceptedCount || 0} ac
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] capitalize font-mono ${
                                    prob.status === "published"
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                      : prob.status === "in_review"
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                      : prob.status === "archived"
                                      ? "bg-slate-500/10 text-slate-500 border-slate-500/30"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {prob.status}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    title="Inspect problem details"
                                    onClick={() => setViewCodingProblem(prob)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  {prob.status === "draft" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-primary"
                                      title="Submit for review"
                                      onClick={() => handleCodingSubmitForReview(prob.id)}
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  {prob.status === "published" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-amber-500"
                                      title="Create new draft version"
                                      onClick={() => handleCodingCreateVersion(prob)}
                                    >
                                      <Sparkles className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                                    title="Delete coding problem"
                                    onClick={() =>
                                      setItemToDelete({
                                        id: prob.id,
                                        code: prob.code,
                                        type: "problem",
                                        title: prob.title,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* CODING TAB 2: CREATE PROBLEM DRAFT */}
              <TabsContent value="add" className="space-y-4">
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm max-w-3xl mx-auto space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Author Coding Problem Draft
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Create programming problems for the automated Coding Judge. Problems enter as Draft.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Problem Title <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        placeholder="e.g. Invert Binary Tree, Two Sum, Merge Intervals"
                        value={newCodingTitle}
                        onChange={(e) => setNewCodingTitle(e.target.value)}
                        className="text-xs h-8"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Topic / Tag</Label>
                      <Input
                        placeholder="e.g. Arrays & Hashing, Dynamic Programming, Graphs"
                        value={newCodingTopic}
                        onChange={(e) => setNewCodingTopic(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Difficulty</Label>
                      <Select
                        value={newCodingDifficulty}
                        onValueChange={(val: any) => setNewCodingDifficulty(val)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Time Limit (ms)</Label>
                      <Input
                        type="number"
                        value={newCodingTimeLimit}
                        onChange={(e) => setNewCodingTimeLimit(Number(e.target.value))}
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Memory Limit (MB)</Label>
                      <Input
                        type="number"
                        value={newCodingMemoryLimit}
                        onChange={(e) => setNewCodingMemoryLimit(Number(e.target.value))}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  {/* Problem Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Problem Statement & Constraints <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      rows={4}
                      placeholder="Detailed problem specification, input/output specifications, constraints, and algorithmic complexity expectations…"
                      value={newCodingDescription}
                      onChange={(e) => setNewCodingDescription(e.target.value)}
                      className="text-xs resize-none"
                      required
                    />
                  </div>

                  {/* Sample Test Case */}
                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-primary">
                        <FileCode className="h-4 w-4" /> Sample Test Case (Visible to Students)
                      </span>
                      <Badge variant="outline" className="text-[10px]">Sample #1</Badge>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground block font-mono">Sample Input</span>
                        <Textarea
                          rows={2}
                          placeholder="[2,7,11,15]&#10;9"
                          value={newCodingSampleInput}
                          onChange={(e) => setNewCodingSampleInput(e.target.value)}
                          className="font-mono text-xs resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground block font-mono">Expected Output</span>
                        <Textarea
                          rows={2}
                          placeholder="[0,1]"
                          value={newCodingSampleOutput}
                          onChange={(e) => setNewCodingSampleOutput(e.target.value)}
                          className="font-mono text-xs resize-none"
                        />
                      </div>
                    </div>
                    <Input
                      placeholder="Sample explanation notes (e.g. Because nums[0] + nums[1] == 9, return [0, 1])"
                      value={newCodingSampleExplanation}
                      onChange={(e) => setNewCodingSampleExplanation(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  {/* Hidden Test Case */}
                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-rose-500">
                        <Lock className="h-4 w-4" /> Hidden Judge Test Case (Protected from Students)
                      </span>
                      <Badge variant="secondary" className="text-[10px]">Hidden #2</Badge>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground block font-mono">Hidden Input</span>
                        <Textarea
                          rows={2}
                          placeholder="[3,2,4]&#10;6"
                          value={newCodingHiddenInput}
                          onChange={(e) => setNewCodingHiddenInput(e.target.value)}
                          className="font-mono text-xs resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground block font-mono">Expected Output</span>
                        <Textarea
                          rows={2}
                          placeholder="[1,2]"
                          value={newCodingHiddenOutput}
                          onChange={(e) => setNewCodingHiddenOutput(e.target.value)}
                          className="font-mono text-xs resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reference Solution */}
                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Cpu className="h-4 w-4 text-emerald-500" /> Reference Solution (Judge Benchmark)
                      </Label>
                      <div className="w-32">
                        <Select value={newCodingRefLang} onValueChange={setNewCodingRefLang}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="python">Python 3</SelectItem>
                            <SelectItem value="javascript">JavaScript</SelectItem>
                            <SelectItem value="typescript">TypeScript</SelectItem>
                            <SelectItem value="cpp">C++ 20</SelectItem>
                            <SelectItem value="java">Java 21</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Textarea
                      rows={5}
                      placeholder="def solution(nums, target):&#10;    seen = {}&#10;    for i, n in enumerate(nums):&#10;        diff = target - n&#10;        if diff in seen: return [seen[diff], i]&#10;        seen[n] = i"
                      value={newCodingRefCode}
                      onChange={(e) => setNewCodingRefCode(e.target.value)}
                      className="font-mono text-xs resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateCodingProblem(false)}
                      disabled={savingCodingProblem}
                    >
                      Save as Draft
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCreateCodingProblem(true)}
                      disabled={savingCodingProblem}
                      className="gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" /> Save & Submit for Review
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* CODING TAB 3: REFERENCE SOLUTION VALIDATOR */}
              <TabsContent value="validate" className="space-y-4">
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm max-w-3xl mx-auto space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Coding Judge Reference Solution Validator
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Execute authoritative reference solution against all sample and hidden test cases to verify correctness.
                      </p>
                    </div>

                    <div className="w-56">
                      <Select
                        value={selectedProblemForValidator}
                        onValueChange={setSelectedProblemForValidator}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select Problem" />
                        </SelectTrigger>
                        <SelectContent>
                          {codingProblems.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.code} — {p.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedProblemForValidator ? (
                    (() => {
                      const prob = codingProblems.find((p) => p.id === selectedProblemForValidator);
                      if (!prob) return null;

                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-2 font-mono text-center text-xs">
                            <div className="bg-muted/40 p-2 rounded">
                              <span className="text-[10px] text-muted-foreground block">Difficulty</span>
                              <span className="font-bold text-foreground">{prob.difficulty}</span>
                            </div>
                            <div className="bg-muted/40 p-2 rounded">
                              <span className="text-[10px] text-muted-foreground block">Test Cases</span>
                              <span className="font-bold text-foreground">{prob.testCases?.length || 0} cases</span>
                            </div>
                            <div className="bg-muted/40 p-2 rounded">
                              <span className="text-[10px] text-muted-foreground block">Status</span>
                              <span className="font-bold text-primary uppercase">{prob.status}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold">
                                Reference Solution ({prob.referenceSolution?.language || "python"})
                              </Label>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-mono ${
                                  prob.referenceSolution?.validationStatus === "valid"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {prob.referenceSolution?.validationStatus || "untested"}
                              </Badge>
                            </div>
                            <div className="rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-100 overflow-x-auto max-h-56">
                              <pre>{prob.referenceSolution?.code || "No reference solution provided."}</pre>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-border">
                            <p className="text-[11px] text-muted-foreground">
                              Simulates full execution with sandbox runtime limits ({prob.timeLimitMs}ms / {prob.memoryLimitMb}MB).
                            </p>
                            <Button
                              size="sm"
                              onClick={() => handleValidateRefSolution(prob.id)}
                              disabled={validatingRefSolution || !prob.referenceSolution}
                              className="gap-1.5"
                            >
                              <Play className={`h-3.5 w-3.5 ${validatingRefSolution ? "animate-spin" : ""}`} />
                              Run & Validate Solution
                            </Button>
                          </div>

                          {validatorOutput && (
                            <div
                              className={`rounded-lg border p-4 space-y-2 text-xs ${
                                validatorOutput.valid
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                                  : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span className="flex items-center gap-1.5">
                                  {validatorOutput.valid ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ) : (
                                    <XCircle className="h-4 w-4" />
                                  )}
                                  Validation Result: {validatorOutput.valid ? "PASSED" : "FAILED"}
                                </span>
                                <span className="font-mono text-[11px]">
                                  {validatorOutput.passedCount} / {validatorOutput.totalCount} test cases passed
                                </span>
                              </div>
                              <p className="text-[11px] font-mono">
                                Execution runtime: {validatorOutput.executionTimeMs}ms
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      Please select a coding problem from the list above.
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* CODING TAB 4: REVIEW & PUBLISH */}
              <TabsContent value="review" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Coding Problem Publication Queue
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Published problems become immutable in the Coding Judge. New revisions require version incrementing.
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {codingProblems.filter((p) => p.status === "in_review" || p.status === "draft").length} pending items
                    </Badge>
                  </div>

                  <div className="divide-y divide-border rounded-lg border border-border bg-card">
                    {codingProblems.filter((p) => p.status === "in_review" || p.status === "draft").length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                        No pending draft or review coding problems.
                      </div>
                    ) : (
                      codingProblems
                        .filter((p) => p.status === "in_review" || p.status === "draft")
                        .map((p) => (
                          <div key={p.id} className="p-4 flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-1.5 max-w-2xl">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-primary">{p.code}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {p.topic}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px]">
                                  {p.difficulty}
                                </Badge>
                                <Badge
                                  className={`text-[10px] capitalize ${
                                    p.status === "in_review"
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {p.status}
                                </Badge>
                              </div>

                              <p className="text-xs font-semibold text-foreground">{p.title}</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-2">
                                {p.description}
                              </p>

                              <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground pt-1">
                                <span>{p.testCases?.length || 0} test cases</span>
                                <span>{p.timeLimitMs}ms limit</span>
                                <span>Ref solution: {p.referenceSolution?.validationStatus || "untested"}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {p.status === "in_review" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCodingReviewAction(p.id, "return_to_draft")}
                                  className="text-xs h-8"
                                >
                                  Return to Draft
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handleCodingReviewAction(p.id, "approve_and_publish")}
                                className="text-xs h-8 gap-1"
                              >
                                <Check className="h-3.5 w-3.5" /> Approve & Publish
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCodingReviewAction(p.id, "archive")}
                                className="text-xs h-8 text-slate-500 hover:text-slate-600 hover:bg-slate-500/10"
                              >
                                Archive
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setItemToDelete({
                                    id: p.id,
                                    code: p.code,
                                    type: "problem",
                                    title: p.title,
                                  })
                                }
                                className="text-xs h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1"
                                title="Delete coding problem permanently"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* CODING TAB 5: BULK IMPORT */}
              <TabsContent value="bulk" className="space-y-4">
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm max-w-3xl mx-auto space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Bulk Import Coding Problems
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Paste a JSON array of coding problems including test cases and reference solutions.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const sample = [
                          {
                            title: "Reverse String",
                            topic: "Strings",
                            difficulty: "Easy",
                            description: "Write a function that reverses an input string in-place.",
                            timeLimitMs: 1000,
                            memoryLimitMb: 128,
                            supportedLanguages: ["python", "javascript", "cpp"],
                            referenceSolution: {
                              language: "python",
                              code: "def solution(s):\n    return s[::-1]",
                            },
                            testCases: [
                              { input: "hello", expectedOutput: "olleh", isSample: true, orderIndex: 1 },
                              { input: "Hannah", expectedOutput: "hannaH", isSample: false, orderIndex: 2 },
                            ],
                          },
                        ];
                        setCodingBulkJson(JSON.stringify(sample, null, 2));
                      }}
                      className="text-xs gap-1.5 h-8"
                    >
                      <FileCode className="h-3.5 w-3.5" /> Load Sample JSON
                    </Button>
                  </div>

                  <Textarea
                    rows={8}
                    placeholder="[ { title: 'Problem Name', difficulty: 'Easy', testCases: [...] } ]"
                    value={codingBulkJson}
                    onChange={(e) => setCodingBulkJson(e.target.value)}
                    className="font-mono text-xs resize-none"
                  />

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <Button
                      size="sm"
                      onClick={handleCodingBulkImport}
                      disabled={importingCodingBulk || !codingBulkJson.trim()}
                      className="gap-1.5"
                    >
                      <UploadCloud className="h-3.5 w-3.5" /> Confirm & Import Problems
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* CODING TAB 6: TELEMETRY & SUBMISSIONS */}
              <TabsContent value="telemetry" className="space-y-4">
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                        Coding Judge Execution Telemetry & Submissions
                      </h4>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {codingSubmissions.length} submissions recorded
                    </Badge>
                  </div>

                  <div className="divide-y divide-border">
                    {loadingSubmissions ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin inline-block mr-2" />
                        Loading execution telemetry…
                      </div>
                    ) : codingSubmissions.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No submissions recorded for this problem yet.
                      </div>
                    ) : (
                      codingSubmissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary">{sub.id}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {sub.language}
                              </Badge>
                              <span className="text-muted-foreground">{sub.userLogin}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Submitted at: {fmt(sub.createdAt)}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <Badge
                              className={`text-[10px] ${
                                sub.verdict === "accepted"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              }`}
                            >
                              {sub.verdict}
                            </Badge>
                            <span>
                              {sub.passedTestCases} / {sub.totalTestCases} passed
                            </span>
                            <span className="text-muted-foreground">
                              {sub.runtimeMs}ms / {sub.memoryMb}MB
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            /* ======================================================================= */
            /* BRANCH B: ASSESSMENT MODULE WORKSPACE (MCQ / SHORT / LONG ANSWER)       */
            /* ======================================================================= */
            <Tabs value={activeWorkspaceTab} onValueChange={setActiveWorkspaceTab} className="space-y-4">
              <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full">
                <TabsTrigger value="bank" className="text-xs gap-1.5">
                  <FileQuestion className="h-3.5 w-3.5" /> Question Bank
                </TabsTrigger>
                <TabsTrigger value="add" className="text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Question
                </TabsTrigger>
                <TabsTrigger value="upload" className="text-xs gap-1.5">
                  <UploadCloud className="h-3.5 w-3.5" /> Bulk Upload
                </TabsTrigger>
                <TabsTrigger value="review" className="text-xs gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Review & Publish (
                  {activeModule.draftCount + activeModule.inReviewCount})
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs gap-1.5">
                  <History className="h-3.5 w-3.5" /> Module Uploads
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: QUESTION BANK */}
              <TabsContent value="bank" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border border-border">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search questions in this module…"
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-8 text-xs w-32">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="MCQ">MCQ</SelectItem>
                        <SelectItem value="Short Answer">Short Answer</SelectItem>
                        <SelectItem value="Long Answer">Long Answer</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                      <SelectTrigger className="h-8 text-xs w-32">
                        <SelectValue placeholder="All Difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Difficulty</SelectItem>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8 text-xs w-32">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/50 text-muted-foreground font-medium">
                          <th className="py-2.5 px-3">Code / ID</th>
                          <th className="py-2.5 px-3">Statement Preview</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Difficulty</th>
                          <th className="py-2.5 px-3 text-center">Version</th>
                          <th className="py-2.5 px-3 text-center">Assessment Usage</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3">Created By</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {loadingQuestions ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-muted-foreground">
                              <RefreshCw className="h-4 w-4 animate-spin inline-block mr-2" />
                              Loading questions…
                            </td>
                          </tr>
                        ) : questions.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-muted-foreground">
                              No questions found in this module matching current filters.
                            </td>
                          </tr>
                        ) : (
                          questions.map((q) => (
                            <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-primary whitespace-nowrap">
                                {q.code}
                              </td>
                              <td className="py-2.5 px-3 max-w-[280px]">
                                <span className="font-medium text-foreground block truncate" title={q.stem}>
                                  {q.stem}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge variant="outline" className="text-[10px]">
                                  {q.type}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] ${
                                    q.difficulty === "Easy"
                                      ? "text-emerald-500 bg-emerald-500/10"
                                      : q.difficulty === "Medium"
                                      ? "text-amber-500 bg-amber-500/10"
                                      : "text-rose-500 bg-rose-500/10"
                                  }`}
                                >
                                  {q.difficulty}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono">
                                v{q.currentVersion || 1}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">
                                {q.assessmentUsageCount || 0} asm
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] capitalize font-mono ${
                                    q.status === "published"
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                      : q.status === "in_review"
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                      : q.status === "archived"
                                      ? "bg-slate-500/10 text-slate-500 border-slate-500/30"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {q.status}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-muted-foreground font-mono">
                                {q.createdBy.split("@")[0]}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    title="Inspect full question details"
                                    onClick={() => setViewQuestion(q)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  {q.status === "draft" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-primary"
                                      title="Submit for review"
                                      onClick={() => handleSubmitForReview(q.id)}
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                                    title="Delete question"
                                    onClick={() =>
                                      setItemToDelete({
                                        id: q.id,
                                        code: q.code,
                                        type: "question",
                                        title: q.stem,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: ADD QUESTION */}
              <TabsContent value="add" className="space-y-4">
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm max-w-3xl mx-auto space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Author Question in {activeModule.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Author a new question draft. Newly authored questions enter the workflow as Draft.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Question Type</Label>
                      <Select
                        value={newQuestionType}
                        onValueChange={(val: any) => setNewQuestionType(val)}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MCQ">MCQ (Multiple Choice)</SelectItem>
                          <SelectItem value="Short Answer">Short Answer</SelectItem>
                          <SelectItem value="Long Answer">Long Answer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Difficulty Tier</Label>
                      <Select
                        value={newDifficulty}
                        onValueChange={(val: any) => setNewDifficulty(val)}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Question Statement */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Question Statement (Stem) <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      rows={3}
                      placeholder="Enter the full question problem text…"
                      value={newStem}
                      onChange={(e) => setNewStem(e.target.value)}
                      className="text-xs resize-none"
                      required
                    />
                  </div>

                  {/* MCQ Options */}
                  {newQuestionType === "MCQ" && (
                    <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border">
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span>MCQ Options (Exactly 4 Required)</span>
                        <span className="text-[11px] text-muted-foreground">
                          Select radio next to the correct answer
                        </span>
                      </Label>

                      <div className="space-y-2">
                        {["A", "B", "C", "D"].map((letter, idx) => (
                          <div key={letter} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correctOpt"
                              checked={
                                Boolean(newOptions[idx]) && newCorrectAnswer === newOptions[idx]
                              }
                              onChange={() => setNewCorrectAnswer(newOptions[idx])}
                              className="cursor-pointer"
                              title="Mark as correct answer"
                            />
                            <span className="font-mono font-bold text-xs w-5 text-center">
                              {letter}
                            </span>
                            <Input
                              placeholder={`Option ${letter} text…`}
                              value={newOptions[idx]}
                              onChange={(e) => {
                                const next = [...newOptions];
                                next[idx] = e.target.value;
                                setNewOptions(next);
                                if (newCorrectAnswer === newOptions[idx]) {
                                  setNewCorrectAnswer(e.target.value);
                                }
                              }}
                              className="text-xs h-8"
                              required
                            />
                          </div>
                        ))}
                      </div>

                      {newCorrectAnswer && (
                        <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5 pt-1">
                          <Check className="h-3.5 w-3.5" /> Selected Correct Answer:{" "}
                          <strong className="font-mono text-foreground">{newCorrectAnswer}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Short Answer */}
                  {newQuestionType === "Short Answer" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Expected Answer / Guidance</Label>
                      <Textarea
                        rows={2}
                        placeholder="Expected succinct response or evaluation criteria…"
                        value={newExpectedAnswer}
                        onChange={(e) => setNewExpectedAnswer(e.target.value)}
                        className="text-xs resize-none"
                      />
                    </div>
                  )}

                  {/* Long Answer */}
                  {newQuestionType === "Long Answer" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Evaluation Rubric</Label>
                      <Textarea
                        rows={3}
                        placeholder="Grading rubric, key keywords, and evaluation criteria…"
                        value={newRubric}
                        onChange={(e) => setNewRubric(e.target.value)}
                        className="text-xs resize-none"
                      />
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Explanation Notes (Optional)</Label>
                    <Textarea
                      rows={2}
                      placeholder="Educational explanation shown after assessment evaluation…"
                      value={newExplanation}
                      onChange={(e) => setNewExplanation(e.target.value)}
                      className="text-xs resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveQuestion(false)}
                      disabled={savingQuestion}
                    >
                      Save as Draft
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSaveQuestion(true)}
                      disabled={savingQuestion}
                      className="gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" /> Save & Submit for Review
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: BULK UPLOAD */}
              <TabsContent value="upload" className="space-y-4">
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm max-w-3xl mx-auto space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Bulk Upload Questions into {activeModule.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Upload batches via CSV, JSON, or XLSX. Accepted questions enter as Draft.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadSampleTemplate}
                      className="text-xs gap-1.5 h-8"
                    >
                      <Download className="h-3.5 w-3.5" /> Download CSV Template
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">File Format</Label>
                      <Select
                        value={uploadFormat}
                        onValueChange={(val: any) => setUploadFormat(val)}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV (Comma-Separated)</SelectItem>
                          <SelectItem value="json">JSON (Array of Objects)</SelectItem>
                          <SelectItem value="xlsx">XLSX (Spreadsheet)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Select File</Label>
                      <Input
                        type="file"
                        accept=".csv,.json,.txt"
                        onChange={handleFileChange}
                        className="text-xs h-9 cursor-pointer"
                      />
                    </div>
                  </div>

                  {validatingUpload && (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin inline-block mr-2 text-primary" />
                      Validating import rows…
                    </div>
                  )}

                  {validationPreview && (
                    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <span className="text-xs font-semibold text-foreground">
                          Validation Preview Results
                        </span>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <Badge variant="secondary">Total: {validationPreview.totalRows}</Badge>
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            Valid: {validationPreview.validRows}
                          </Badge>
                          {validationPreview.invalidRows > 0 && (
                            <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30">
                              Invalid: {validationPreview.invalidRows}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                        {validationPreview.rows.map((r) => (
                          <div
                            key={r.rowNumber}
                            className={`p-2 rounded border text-xs flex items-start justify-between gap-3 ${
                              r.valid
                                ? "border-emerald-500/20 bg-emerald-500/5 text-foreground"
                                : "border-rose-500/20 bg-rose-500/5 text-rose-600"
                            }`}
                          >
                            <div className="space-y-0.5">
                              <span className="font-mono text-[10px] font-bold block text-muted-foreground">
                                Row #{r.rowNumber} — {r.data.type || "MCQ"} ({r.data.difficulty || "Medium"})
                              </span>
                              <span className="font-medium text-[11px] block truncate max-w-lg">
                                {r.data.stem || "No statement text"}
                              </span>
                              {r.errors.length > 0 && (
                                <p className="text-[10px] text-rose-500">
                                  Errors: {r.errors.join("; ")}
                                </p>
                              )}
                            </div>

                            <Badge
                              variant="outline"
                              className={`text-[10px] shrink-0 ${
                                r.valid ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {r.valid ? "Ready" : "Rejected"}
                            </Badge>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/60">
                        <p className="text-[11px] text-muted-foreground">
                          {validationPreview.validRows > 0
                            ? `Ready to import ${validationPreview.validRows} questions as Draft.`
                            : "No valid rows found in upload file."}
                        </p>
                        <Button
                          size="sm"
                          onClick={handleConfirmUpload}
                          disabled={validationPreview.validRows === 0 || confirmingUpload}
                          className="gap-1.5"
                        >
                          <Check className="h-3.5 w-3.5" /> Confirm & Import Valid Rows
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB 4: REVIEW & PUBLISH */}
              <TabsContent value="review" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Review & Publication Queue for {activeModule.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Questions must be approved and published before being delivered by the Assessment Engine.
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {questions.filter((q) => q.status === "in_review" || q.status === "draft").length} pending items
                    </Badge>
                  </div>

                  <div className="divide-y divide-border rounded-lg border border-border bg-card">
                    {questions.filter((q) => q.status === "in_review" || q.status === "draft").length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                        No pending drafts or review questions for this module.
                      </div>
                    ) : (
                      questions
                        .filter((q) => q.status === "in_review" || q.status === "draft")
                        .map((q) => (
                          <div key={q.id} className="p-4 flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-1.5 max-w-2xl">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-primary">{q.code}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {q.type}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px]">
                                  {q.difficulty}
                                </Badge>
                                <Badge
                                  className={`text-[10px] capitalize ${
                                    q.status === "in_review"
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {q.status}
                                </Badge>
                              </div>

                              <p className="text-xs font-semibold text-foreground">{q.stem}</p>

                              {q.type === "MCQ" && q.options && (
                                <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground pt-1">
                                  {q.options.map((opt, i) => (
                                    <div
                                      key={i}
                                      className={`px-2 py-1 rounded text-[11px] font-mono border ${
                                        opt === q.correctAnswer
                                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 font-semibold"
                                          : "bg-muted/30 border-border"
                                      }`}
                                    >
                                      {String.fromCharCode(65 + i)}: {opt}
                                      {opt === q.correctAnswer && " (Correct)"}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {q.status === "in_review" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReviewAction(q.id, "return_to_draft")}
                                  className="text-xs h-8"
                                >
                                  Return to Draft
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handleReviewAction(q.id, "approve_and_publish")}
                                className="text-xs h-8 gap-1"
                              >
                                <Check className="h-3.5 w-3.5" /> Approve & Publish
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReviewAction(q.id, "archive")}
                                className="text-xs h-8 text-slate-500 hover:text-slate-600 hover:bg-slate-500/10"
                              >
                                Archive
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setItemToDelete({
                                    id: q.id,
                                    code: q.code,
                                    type: "question",
                                    title: q.stem,
                                  })
                                }
                                className="text-xs h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1"
                                title="Delete question permanently"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* TAB 5: MODULE UPLOAD HISTORY */}
              <TabsContent value="history" className="space-y-4">
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                      Upload Batches for {activeModule.name}
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {uploadHistory.filter((b) => b.moduleId === activeModule.id).length} batches
                    </Badge>
                  </div>

                  <div className="divide-y divide-border">
                    {uploadHistory.filter((b) => b.moduleId === activeModule.id).length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No upload batches recorded for this module yet.
                      </div>
                    ) : (
                      uploadHistory
                        .filter((b) => b.moduleId === activeModule.id)
                        .map((batch) => (
                          <div
                            key={batch.id}
                            className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-primary">{batch.id}</span>
                                <span className="font-medium text-foreground">{batch.filename}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {batch.uploadMethod}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Imported by {batch.uploadedBy} on {fmt(batch.createdAt)}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 font-mono">
                              <span>Total: <strong>{batch.totalRows}</strong></span>
                              <span className="text-emerald-500">Imported: <strong>{batch.importedRows}</strong></span>
                              <span className="text-rose-500">Rejected: <strong>{batch.rejectedRows}</strong></span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setInspectBatch(batch)}
                                title="Inspect details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* DIALOG: MANAGE MODULE VISIBILITY & COLLEGE ACCESS                         */}
      {/* ========================================================================= */}
      <Dialog open={visibilityDialogOpen} onOpenChange={setVisibilityDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Configure Module Visibility & College Access
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set visibility policy and select colleges authorized to access{" "}
              <strong className="text-foreground">{selectedModuleForVisibility?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedModuleForVisibility && (
            <div className="space-y-4 py-2">
              {/* Visibility Mode Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Access Policy</Label>
                <RadioGroup
                  value={visMode}
                  onValueChange={(val: any) => setVisMode(val)}
                  className="grid grid-cols-1 gap-2"
                >
                  <div
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      visMode === "hidden"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/30"
                    }`}
                    onClick={() => setVisMode("hidden")}
                  >
                    <RadioGroupItem value="hidden" id="vis-hidden" className="mt-0.5" />
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="vis-hidden"
                        className="font-semibold text-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        Hidden
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Module is private to platform editors. Inaccessible to students and college coordinators.
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      visMode === "visible"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/30"
                    }`}
                    onClick={() => setVisMode("visible")}
                  >
                    <RadioGroupItem value="visible" id="vis-visible" className="mt-0.5" />
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="vis-visible"
                        className="font-semibold text-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5 text-emerald-500" />
                        Visible to Selected Colleges
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Only authorized colleges can deliver questions/problems from this module in assessments and practice.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* College Multi-Select (When Visible) */}
              {visMode === "visible" && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold">Authorized Colleges</Label>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {selectedCollegeIds.length} selected
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[11px] h-6 px-2 text-primary"
                      onClick={handleSelectAllActiveColleges}
                    >
                      Select All Active
                    </Button>
                  </div>

                  {/* Search colleges */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search college by name or code (e.g. SMP101)..."
                      value={collegeSearch}
                      onChange={(e) => setCollegeSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>

                  {/* College list */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {filteredColleges.length === 0 ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        No colleges found.
                      </div>
                    ) : (
                      filteredColleges.map((col) => {
                        const isChecked = selectedCollegeIds.includes(col.id);
                        return (
                          <div
                            key={col.id}
                            onClick={() => toggleCollegeSelection(col.id)}
                            className={`flex items-center justify-between p-2 rounded border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? "border-primary/40 bg-primary/5"
                                : "border-border/60 hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleCollegeSelection(col.id)}
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-foreground text-[12px]">
                                    {col.name}
                                  </span>
                                  <Badge variant="outline" className="font-mono text-[10px] px-1 py-0">
                                    {col.code}
                                  </Badge>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  ID: {col.id}
                                </span>
                              </div>
                            </div>

                            <Badge
                              variant="secondary"
                              className={`text-[10px] capitalize font-mono ${
                                col.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : col.status === "hold"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-rose-500/10 text-rose-600"
                              }`}
                            >
                              {col.status}
                            </Badge>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {selectedCollegeIds.length === 0 && (
                    <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      At least 1 college must be selected when module is Visible.
                    </p>
                  )}

                  <div className="rounded bg-amber-500/10 border border-amber-500/20 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                    <span className="font-semibold">Operational Impact Notice:</span> Revoking access
                    blocks subsequent test delivery for unselected colleges without destroying historical
                    submissions or assessment records.
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibilityDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveVisibility}
                  disabled={savingVisibility || (visMode === "visible" && selectedCollegeIds.length === 0)}
                  className="gap-1.5"
                >
                  {savingVisibility ? "Saving…" : "Save Visibility Settings"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: CREATE QUESTION MODULE                                            */}
      {/* ========================================================================= */}
      <Dialog open={addModuleOpen} onOpenChange={setAddModuleOpen}>
        <DialogContent className="sm:max-w-xl max-w-[95vw]">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FolderPlus className="h-4.5 w-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Create New Question Module
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Add a curriculum domain module to categorize and govern questions or coding judge problems.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateModule} className="space-y-4 pt-3">
            {/* Module Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Module Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Core Engineering, Data Structures, Legal Aptitude"
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            {/* Assessment Blueprint Linkage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Assessment Blueprint Code
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = !isCustomBlueprint;
                    setIsCustomBlueprint(nextMode);
                    if (!nextMode) {
                      const firstPub = availableBlueprints.find((b) => b.status === "published");
                      if (firstPub) {
                        setNewBlueprintCode(firstPub.code);
                        if (firstPub.domain) setNewDomain(firstPub.domain);
                        if (firstPub.difficulty) setNewTargetDifficulty(firstPub.difficulty);
                      }
                    }
                  }}
                  className="text-[11px] text-primary hover:underline font-medium transition-colors"
                >
                  {isCustomBlueprint ? "← Select from published blueprints" : "+ Enter custom blueprint code"}
                </button>
              </div>

              {!isCustomBlueprint ? (
                <div className="space-y-2">
                  <Select
                    value={newBlueprintCode}
                    onValueChange={(val) => {
                      setNewBlueprintCode(val);
                      const matched = availableBlueprints.find((b) => b.code === val);
                      if (matched) {
                        if (matched.domain) setNewDomain(matched.domain);
                        if (matched.difficulty) setNewTargetDifficulty(matched.difficulty);
                      }
                    }}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select published assessment blueprint" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBlueprints
                        .filter((b) => b.status === "published")
                        .map((b) => (
                          <SelectItem key={b.id || b.code} value={b.code}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-primary">{b.code}</span>
                              <span className="text-muted-foreground">—</span>
                              <span className="truncate">{b.title}</span>
                              <span className="text-muted-foreground text-[10px]">({b.domain}, {b.difficulty})</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {selectedBlueprint && (
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/30 font-semibold leading-normal">
                            {selectedBlueprint.code}
                          </Badge>
                          <span className="font-medium text-foreground truncate">{selectedBlueprint.title}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Domain: <span className="font-semibold text-foreground">{selectedBlueprint.domain}</span> • Difficulty: <span className="font-semibold text-foreground">{selectedBlueprint.difficulty}</span> • Total Marks: <span className="font-semibold text-foreground">{selectedBlueprint.totalMarks}</span>
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 shrink-0 font-medium leading-normal">
                        Published
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <Input
                    placeholder="e.g. ASM-TECH01, ASM-CODE02"
                    value={newBlueprintCode}
                    onChange={(e) => setNewBlueprintCode(e.target.value.toUpperCase())}
                    className="text-xs font-mono h-9"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Must correspond to a published assessment blueprint code in the registry.
                  </p>
                </div>
              )}
            </div>

            {/* Curriculum Domain & Target Difficulty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Curriculum Domain</span>
                  {selectedBlueprint && !isCustomBlueprint && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-normal">
                      <Lock className="h-2.5 w-2.5" /> Synced to Blueprint
                    </span>
                  )}
                </Label>
                <Select
                  value={newDomain}
                  onValueChange={(val) => setNewDomain(val)}
                  disabled={Boolean(selectedBlueprint && !isCustomBlueprint)}
                >
                  <SelectTrigger className="text-xs h-9 disabled:opacity-90 disabled:bg-muted/40">
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

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Target Difficulty</span>
                  {selectedBlueprint && !isCustomBlueprint && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-normal">
                      <Lock className="h-2.5 w-2.5" /> Synced to Blueprint
                    </span>
                  )}
                </Label>
                <Select
                  value={newTargetDifficulty}
                  onValueChange={(val: any) => setNewTargetDifficulty(val)}
                  disabled={Boolean(selectedBlueprint && !isCustomBlueprint)}
                >
                  <SelectTrigger className="text-xs h-9 disabled:opacity-90 disabled:bg-muted/40">
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

            {/* Module Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Module Type</Label>
              <Select
                value={newModuleKind}
                onValueChange={(val: any) => setNewModuleKind(val)}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assessment">
                    <div className="flex items-center gap-2">
                      <FileQuestion className="h-3.5 w-3.5 text-cyan-600" />
                      <span>Assessment Questions (MCQ, Short, Long Answer)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="coding">
                    <div className="flex items-center gap-2">
                      <Code className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Coding Judge (Programming Problems, Test Cases)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description (Optional) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description (Optional)</Label>
              <Textarea
                rows={3}
                placeholder="Describe the domain curriculum, syllabus topics, and competency areas covered…"
                value={newModuleDesc}
                onChange={(e) => setNewModuleDesc(e.target.value)}
                className="text-xs resize-none min-h-[72px]"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddModuleOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingModule || !newModuleName.trim()}
                className="gap-1.5 shadow-sm font-semibold"
              >
                {savingModule ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Creating…
                  </>
                ) : (
                  <>
                    <FolderPlus className="h-3.5 w-3.5" /> Create Module
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: EDIT MODULE METADATA                                              */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(editingModule)} onOpenChange={(open) => !open && setEditingModule(null)}>
        <DialogContent className="sm:max-w-lg max-w-[95vw]">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Edit className="h-4.5 w-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Edit Question Module
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Configure module unique code, name, linked blueprint, and curriculum description.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editingModule && (
            <form onSubmit={handleUpdateModule} className="space-y-4 pt-3">
              {/* Module Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Module Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={editModuleName}
                  onChange={(e) => setEditModuleName(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              {/* Module Unique Code */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Module Unique Code <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-muted-foreground font-normal">Unique registry identifier</span>
                </Label>
                <Input
                  value={editModuleCode}
                  onChange={(e) => setEditModuleCode(e.target.value)}
                  placeholder="e.g. mod-tech, MOD-CS01"
                  className="text-xs font-mono h-9"
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  Unique identifier used across question items, assessments, and college access permissions.
                </p>
              </div>

              {/* Linked Assessment Blueprint Code */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Assessment Blueprint Code</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional curriculum linkage</span>
                </Label>
                <div className="space-y-1.5">
                  <Select
                    value={editBlueprintCode || "__none__"}
                    onValueChange={(val) => setEditBlueprintCode(val === "__none__" ? "" : val)}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select published blueprint or enter code below" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-muted-foreground italic">None (Unlinked)</span>
                      </SelectItem>
                      {availableBlueprints
                        .filter((b) => b.status === "published")
                        .map((b) => (
                          <SelectItem key={b.id || b.code} value={b.code}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-primary">{b.code}</span>
                              <span className="text-muted-foreground">—</span>
                              <span className="truncate">{b.title}</span>
                              <span className="text-muted-foreground text-[10px]">({b.domain}, {b.difficulty})</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Or enter Blueprint Code (e.g. ASM-TECH01)"
                    value={editBlueprintCode}
                    onChange={(e) => setEditBlueprintCode(e.target.value.toUpperCase())}
                    className="text-xs font-mono h-9"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description (Optional)</Label>
                <Textarea
                  rows={3}
                  value={editModuleDesc}
                  onChange={(e) => setEditModuleDesc(e.target.value)}
                  className="text-xs resize-none min-h-[72px]"
                  placeholder="Describe curriculum topics, syllabus areas, and competencies covered..."
                />
              </div>

              <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 border-amber-500/30 text-xs"
                  onClick={() => {
                    handleArchiveModule(editingModule.id);
                    setEditingModule(null);
                  }}
                >
                  Archive Module
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingModule(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={updatingModule || !editModuleName.trim() || !editModuleCode.trim()}
                    className="gap-1.5 font-semibold shadow-sm"
                  >
                    {updatingModule ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving…
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: VIEW CODING PROBLEM DETAILS                                       */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(viewCodingProblem)} onOpenChange={(open) => !open && setViewCodingProblem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Code className="h-4 w-4 text-primary" />
              Coding Problem Specification
            </DialogTitle>
            <DialogDescription className="text-xs">
              Problem Code: <code className="font-mono text-foreground">{viewCodingProblem?.code}</code> (
              {viewCodingProblem?.version || `v${viewCodingProblem?.currentVersion || 1}`})
            </DialogDescription>
          </DialogHeader>

          {viewCodingProblem && (
            <div className="space-y-3 text-xs py-2">
              <div className="bg-muted/30 p-3 rounded-md border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm">{viewCodingProblem.title}</span>
                  <Badge variant="outline">{viewCodingProblem.topic}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 whitespace-pre-line">{viewCodingProblem.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="bg-muted/40 p-2 rounded">
                  <span className="text-[10px] text-muted-foreground block">Difficulty</span>
                  <span className="font-bold text-foreground">{viewCodingProblem.difficulty}</span>
                </div>
                <div className="bg-muted/40 p-2 rounded">
                  <span className="text-[10px] text-muted-foreground block">Time Limit</span>
                  <span className="font-bold text-foreground">{viewCodingProblem.timeLimitMs}ms</span>
                </div>
                <div className="bg-muted/40 p-2 rounded">
                  <span className="text-[10px] text-muted-foreground block">Memory Limit</span>
                  <span className="font-bold text-foreground">{viewCodingProblem.memoryLimitMb}MB</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">Test Cases:</span>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {viewCodingProblem.testCases?.map((tc, i) => (
                    <div
                      key={tc.id || i}
                      className="p-2 rounded border bg-muted/20 border-border text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-foreground">
                          Case #{tc.orderIndex || i + 1}
                        </span>
                        <Badge
                          variant={tc.isSample ? "outline" : "secondary"}
                          className={`text-[9px] ${tc.isSample ? "text-emerald-500" : "text-amber-500"}`}
                        >
                          {tc.isSample ? "Sample" : "Hidden"}
                        </Badge>
                      </div>
                      <div className="font-mono grid grid-cols-2 gap-2 text-[10px] bg-background/50 p-1.5 rounded">
                        <div>
                          <strong className="text-muted-foreground">Input:</strong> {tc.input}
                        </div>
                        <div>
                          <strong className="text-muted-foreground">Output:</strong> {tc.expectedOutput}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between w-full">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                const p = viewCodingProblem;
                if (p) {
                  setItemToDelete({
                    id: p.id,
                    code: p.code,
                    type: "problem",
                    title: p.title,
                  });
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Problem
            </Button>
            <Button variant="outline" size="sm" onClick={() => setViewCodingProblem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: VIEW QUESTION DETAILS (ASSESSMENT)                                 */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(viewQuestion)} onOpenChange={(open) => !open && setViewQuestion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Question Specification & Answer Keys
            </DialogTitle>
            <DialogDescription className="text-xs">
              ID: <code className="font-mono text-foreground">{viewQuestion?.code}</code> (Version v
              {viewQuestion?.currentVersion || 1})
            </DialogDescription>
          </DialogHeader>

          {viewQuestion && (
            <div className="space-y-3 text-xs py-2">
              <div className="bg-muted/30 p-3 rounded-md border border-border space-y-1">
                <span className="text-[11px] text-muted-foreground block font-medium">Question Stem</span>
                <p className="font-medium text-foreground">{viewQuestion.stem}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="bg-muted/40 p-2 rounded">
                  <span className="text-[10px] text-muted-foreground block">Type</span>
                  <span className="font-bold text-foreground">{viewQuestion.type}</span>
                </div>
                <div className="bg-muted/40 p-2 rounded">
                  <span className="text-[10px] text-muted-foreground block">Difficulty</span>
                  <span className="font-bold text-foreground">{viewQuestion.difficulty}</span>
                </div>
                <div className="bg-muted/40 p-2 rounded">
                  <span className="text-[10px] text-muted-foreground block">Status</span>
                  <span className="font-bold uppercase text-primary">{viewQuestion.status}</span>
                </div>
              </div>

              {viewQuestion.type === "MCQ" && viewQuestion.options && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">Options:</span>
                  <div className="space-y-1">
                    {viewQuestion.options.map((opt, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded border font-mono text-[11px] flex items-center justify-between ${
                          opt === viewQuestion.correctAnswer
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 font-bold"
                            : "bg-muted/30 border-border text-foreground"
                        }`}
                      >
                        <span>
                          {String.fromCharCode(65 + i)}: {opt}
                        </span>
                        {opt === viewQuestion.correctAnswer && (
                          <Badge className="bg-emerald-500 text-white text-[9px] px-1 py-0">
                            Correct Answer
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewQuestion.expectedAnswer && (
                <div className="bg-muted/30 p-2.5 rounded-md border border-border">
                  <span className="text-[11px] text-muted-foreground block font-semibold">
                    Expected Answer Guidance:
                  </span>
                  <p className="mt-0.5 text-foreground">{viewQuestion.expectedAnswer}</p>
                </div>
              )}

              {viewQuestion.rubric && (
                <div className="bg-muted/30 p-2.5 rounded-md border border-border">
                  <span className="text-[11px] text-muted-foreground block font-semibold">
                    Evaluation Rubric:
                  </span>
                  <p className="mt-0.5 text-foreground">{viewQuestion.rubric}</p>
                </div>
              )}

              {viewQuestion.explanation && (
                <div className="bg-muted/30 p-2.5 rounded-md border border-border">
                  <span className="text-[11px] text-muted-foreground block font-semibold">
                    Educational Explanation:
                  </span>
                  <p className="mt-0.5 text-foreground">{viewQuestion.explanation}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between w-full">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                const q = viewQuestion;
                if (q) {
                  setItemToDelete({
                    id: q.id,
                    code: q.code,
                    type: "question",
                    title: q.stem,
                  });
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Question
            </Button>
            <Button variant="outline" size="sm" onClick={() => setViewQuestion(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: INSPECT BATCH LEDGER                                              */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(inspectBatch)} onOpenChange={(open) => !open && setInspectBatch(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Upload Batch Inspection Ledger
            </DialogTitle>
            <DialogDescription className="text-xs">
              Batch: <code className="font-mono text-foreground">{inspectBatch?.id}</code> (
              {inspectBatch?.filename})
            </DialogDescription>
          </DialogHeader>

          {inspectBatch && (
            <div className="space-y-3 text-xs py-2">
              <div className="grid grid-cols-2 gap-2 bg-muted/30 p-3 rounded border border-border">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Module</span>
                  <span className="font-semibold text-foreground">{inspectBatch.moduleName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Upload Method</span>
                  <span className="font-medium text-foreground">{inspectBatch.uploadMethod}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Uploaded By</span>
                  <span className="font-mono text-foreground">{inspectBatch.uploadedBy}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Processed At</span>
                  <span className="text-foreground">{fmt(inspectBatch.createdAt)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="bg-muted/40 p-2 rounded">
                  <span className="text-[10px] text-muted-foreground block">Total</span>
                  <span className="font-bold text-foreground">{inspectBatch.totalRows}</span>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded text-emerald-600">
                  <span className="text-[10px] block">Imported</span>
                  <span className="font-bold">{inspectBatch.importedRows}</span>
                </div>
                <div className="bg-rose-500/10 p-2 rounded text-rose-600">
                  <span className="text-[10px] block">Rejected</span>
                  <span className="font-bold">{inspectBatch.rejectedRows}</span>
                </div>
              </div>

              {inspectBatch.rejectedDetails && inspectBatch.rejectedDetails.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-rose-500">
                    Row-Level Rejection Breakdown:
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {inspectBatch.rejectedDetails.map((rej, i) => (
                      <div
                        key={i}
                        className="bg-rose-500/5 border border-rose-500/20 p-2 rounded text-[11px]"
                      >
                        <span className="font-mono font-bold text-rose-600">Row #{rej.rowNumber}:</span>{" "}
                        <span className="text-foreground">{rej.errors.join("; ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            {inspectBatch && inspectBatch.rejectedRows > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadErrorReport(inspectBatch)}
                className="gap-1.5 text-rose-500"
              >
                <FileDown className="h-3.5 w-3.5" /> Download Error CSV
              </Button>
            ) : <div />}
            <Button variant="outline" size="sm" onClick={() => setInspectBatch(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: CONFIRM DELETE QUESTION / CODING PROBLEM                          */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(itemToDelete)} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-rose-600">
              <Trash2 className="h-4 w-4" />
              Delete {itemToDelete?.type === "problem" ? "Coding Problem" : "Question"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground">{itemToDelete?.code}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs space-y-2">
            <div className="p-3 bg-muted/30 rounded border border-border">
              <p className="font-medium text-foreground line-clamp-3">{itemToDelete?.title}</p>
            </div>
            <p className="text-muted-foreground text-[11px]">
              This action will permanently remove this {itemToDelete?.type === "problem" ? "coding problem" : "question"} from the question bank. Historical student attempts and assessment records will not be damaged.
            </p>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItemToDelete(null)}
              disabled={deletingItem}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deletingItem}
              className="gap-1.5"
            >
              {deletingItem ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" /> Confirm Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ALERT DIALOG: CONFIRM DELETE QUESTION MODULE                              */}
      {/* ========================================================================= */}
      <AlertDialog open={Boolean(moduleToDelete)} onOpenChange={(open) => !open && setModuleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete Question Module
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                Are you sure you want to permanently delete question module{" "}
                <strong className="text-foreground">&ldquo;{moduleToDelete?.name}&rdquo;</strong>?
              </span>
              <span className="block text-xs text-muted-foreground pt-1">
                This action is irreversible. All associated questions, coding problems, test cases, and college visibility access records will be permanently removed.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingModule}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModule}
              disabled={deletingModule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingModule ? "Deleting…" : "Confirm Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
