import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertCircle,
  Archive,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code,
  Download,
  Edit,
  Eye,
  EyeOff,
  FileCheck,
  FileCode,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderOpen,
  FolderPlus,
  FolderTree,
  History,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Tag,
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
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { api } from "@/lib/api/client";
import { authService } from "@/lib/auth/service";

export const Route = createFileRoute("/editor/courses")({
  head: () => ({
    meta: [
      { title: "Learning Content & Courses — Ziphyrus X Editor" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LearningContentPage,
});

interface LearningModule {
  id: string;
  name: string;
  normalizedName: string;
  description?: string;
  visibilityStatus: "hidden" | "visible";
  status: "active" | "archived";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  totalCourses: number;
  draftCount: number;
  inReviewCount: number;
  publishedCount: number;
  archivedCount: number;
  totalLessons: number;
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

interface CourseItem {
  id: string;
  code: string;
  learningModuleId?: string;
  title: string;
  description?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  prerequisites?: string;
  learningObjectives?: string[];
  estimatedDurationHours?: number;
  version: string;
  currentVersion?: string;
  modulesCount: number;
  lessonsCount: number;
  status: "draft" | "review" | "in_review" | "published" | "archived";
  createdBy?: string;
  createdAt?: string;
  publishedAt?: string;
  publishedBy?: string;
  updatedAt: string;
  modules?: any[];
}

interface UploadBatch {
  id: string;
  learningModuleId: string;
  moduleName: string;
  filename: string;
  uploadMethod: string;
  format: string;
  uploadedBy: string;
  totalItems: number;
  importedItems: number;
  rejectedItems: number;
  duplicateItems: number;
  status: "processing" | "completed" | "failed" | "partial";
  publicationStatus: "draft" | "in_review" | "published";
  errorSummary?: string;
  rejectedDetails?: { rowNumber?: number; data?: any; errors: string[] }[];
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

interface CollegeItem {
  id: string;
  name: string;
  code: string;
  status: "active" | "hold" | "deactive";
}

export function LearningContentPage() {
  const session = authService.getSession();
  const currentEditor = session?.user?.loginId || "editor1@ziphyrus.in";

  // State: Learning Modules
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<string>("mod-learn-tech");
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [newModuleDesc, setNewModuleDesc] = useState("");
  const [savingModule, setSavingModule] = useState(false);

  // Edit / Archive / Delete Module
  const [editingModule, setEditingModule] = useState<LearningModule | null>(null);
  const [editModuleName, setEditModuleName] = useState("");
  const [editModuleDesc, setEditModuleDesc] = useState("");
  const [updatingModule, setUpdatingModule] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<LearningModule | null>(null);
  const [deletingModule, setDeletingModule] = useState(false);

  // College Visibility Modal
  const [colleges, setColleges] = useState<CollegeItem[]>([]);
  const [visibilityDialogOpen, setVisibilityDialogOpen] = useState(false);
  const [selectedModuleForVisibility, setSelectedModuleForVisibility] = useState<LearningModule | null>(null);
  const [visMode, setVisMode] = useState<"hidden" | "visible">("hidden");
  const [selectedCollegeIds, setSelectedCollegeIds] = useState<string[]>([]);
  const [collegeSearch, setCollegeSearch] = useState("");
  const [savingVisibility, setSavingVisibility] = useState(false);

  // Section 1: Upload History (at top of page)
  const [uploadHistory, setUploadHistory] = useState<UploadBatch[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historySearch, setHistorySearch] = useState("");
  const [historyModuleFilter, setHistoryModuleFilter] = useState("all");
  const [historyMethodFilter, setHistoryMethodFilter] = useState("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [inspectBatch, setInspectBatch] = useState<UploadBatch | null>(null);

  // Section 3: Workspace Courses
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<string>("library");

  // Hierarchy Inspector & Course Details
  const [selectedCourseForInspector, setSelectedCourseForInspector] = useState<any | null>(null);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);

  // Form State: Create Course
  const [createCourseTitle, setCreateCourseTitle] = useState("");
  const [createCourseCode, setCreateCourseCode] = useState("");
  const [createCourseDifficulty, setCreateCourseDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner");
  const [createCourseDesc, setCreateCourseDesc] = useState("");
  const [createCoursePrereq, setCreateCoursePrereq] = useState("");
  const [createCourseDuration, setCreateCourseDuration] = useState(15);
  const [savingCourse, setSavingCourse] = useState(false);

  // Form State: Hierarchy Adding (Chapter, Topic, Lesson, Activity)
  const [addChapterDialogOpen, setAddChapterDialogOpen] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterDesc, setNewChapterDesc] = useState("");

  const [addTopicDialogOpen, setAddTopicDialogOpen] = useState(false);
  const [targetChapterId, setTargetChapterId] = useState("");
  const [newTopicTitle, setNewTopicTitle] = useState("");

  const [addLessonDialogOpen, setAddLessonDialogOpen] = useState(false);
  const [targetTopicId, setTargetTopicId] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState<string>("reading");
  const [newLessonDuration, setNewLessonDuration] = useState(20);
  const [newLessonContent, setNewLessonContent] = useState("");

  const [addActivityDialogOpen, setAddActivityDialogOpen] = useState(false);
  const [targetLessonId, setTargetLessonId] = useState("");
  const [newActivityType, setNewActivityType] = useState<string>("reading");
  const [newActivityTitle, setNewActivityTitle] = useState("");
  const [linkedQuestionCode, setLinkedQuestionCode] = useState("");
  const [linkedProblemCode, setLinkedProblemCode] = useState("");

  // Bulk Upload Form
  const [bulkUploadMethod, setBulkUploadMethod] = useState("ZIP package import");
  const [bulkFilename, setBulkFilename] = useState("");
  const [bulkJsonContent, setBulkJsonContent] = useState("");
  const [importingBulk, setImportingBulk] = useState(false);

  // Course Deletion Modal
  const [courseToDelete, setCourseToDelete] = useState<CourseItem | null>(null);
  const [deletingCourse, setDeletingCourse] = useState(false);

  // ---------------------------------------------------------------------------
  // Load Modules & Colleges & Upload History
  // ---------------------------------------------------------------------------
  const fetchModules = async () => {
    setLoadingModules(true);
    try {
      const res = await api.editor.learning.modules.list();
      setModules(res);
      if (res.length > 0 && !res.some((m) => m.id === activeModuleId)) {
        setActiveModuleId(res[0].id);
      }
    } catch {
      toast.error("Failed to load learning modules from Supabase");
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchColleges = async () => {
    try {
      const list = await api.editor.colleges.list();
      setColleges(list);
    } catch {
      toast.error("Failed to load college directory");
    }
  };

  const fetchUploadHistory = async () => {
    setLoadingHistory(true);
    try {
      const list = await api.editor.learning.uploadHistory.list();
      setUploadHistory(list);
    } catch {
      toast.error("Failed to load learning content upload history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const list = await api.editor.courses.list({ moduleId: activeModuleId });
      setCourses(list);
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    fetchModules();
    fetchColleges();
    fetchUploadHistory();
  }, []);

  useEffect(() => {
    if (activeModuleId) {
      fetchCourses();
    }
  }, [activeModuleId]);

  // Active module record
  const currentModule = useMemo(() => {
    return modules.find((m) => m.id === activeModuleId) || modules[0];
  }, [modules, activeModuleId]);

  // Global header stats
  const stats = useMemo(() => {
    const totalModules = modules.length;
    const totalCourses = modules.reduce((acc, m) => acc + (m.totalCourses || 0), 0);
    const publishedCourses = modules.reduce((acc, m) => acc + (m.publishedCount || 0), 0);
    const draftCourses = modules.reduce((acc, m) => acc + (m.draftCount || 0), 0);
    const totalUploads = uploadHistory.length;
    return { totalModules, totalCourses, publishedCourses, draftCourses, totalUploads };
  }, [modules, uploadHistory]);

  // Filtered Upload History
  const filteredHistory = useMemo(() => {
    return uploadHistory.filter((item) => {
      const matchesSearch =
        !historySearch ||
        item.filename.toLowerCase().includes(historySearch.toLowerCase()) ||
        item.id.toLowerCase().includes(historySearch.toLowerCase()) ||
        item.moduleName.toLowerCase().includes(historySearch.toLowerCase());
      const matchesModule = historyModuleFilter === "all" || item.learningModuleId === historyModuleFilter;
      const matchesMethod = historyMethodFilter === "all" || item.uploadMethod.toLowerCase().includes(historyMethodFilter.toLowerCase());
      const matchesStatus = historyStatusFilter === "all" || item.status === historyStatusFilter;
      return matchesSearch && matchesModule && matchesMethod && matchesStatus;
    });
  }, [uploadHistory, historySearch, historyModuleFilter, historyMethodFilter, historyStatusFilter]);

  // Filtered Workspace Courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        !courseSearch ||
        c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(courseSearch.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesDifficulty = difficultyFilter === "all" || c.difficulty === difficultyFilter;
      return matchesSearch && matchesStatus && matchesDifficulty;
    });
  }, [courses, courseSearch, statusFilter, difficultyFilter]);

  // ---------------------------------------------------------------------------
  // Action Handlers: Learning Modules & Visibility
  // ---------------------------------------------------------------------------
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) {
      toast.error("Module name is required");
      return;
    }
    setSavingModule(true);
    try {
      const created = await api.editor.learning.modules.create({
        name: newModuleName.trim(),
        description: newModuleDesc.trim() || undefined,
      });
      toast.success(`Learning Module "${created.name}" created (Default: Hidden).`);
      setAddModuleOpen(false);
      setNewModuleName("");
      setNewModuleDesc("");
      await fetchModules();
      setActiveModuleId(created.id);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create learning module");
    } finally {
      setSavingModule(false);
    }
  };

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule || !editModuleName.trim()) return;
    setUpdatingModule(true);
    try {
      await api.editor.learning.modules.update(editingModule.id, {
        name: editModuleName.trim(),
        description: editModuleDesc.trim() || undefined,
      });
      toast.success(`Module "${editModuleName.trim()}" updated.`);
      setEditingModule(null);
      await fetchModules();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update module");
    } finally {
      setUpdatingModule(false);
    }
  };

  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;
    setDeletingModule(true);
    try {
      await api.editor.learning.modules.delete(moduleToDelete.id);
      toast.success(`Learning module "${moduleToDelete.name}" permanently deleted.`);
      const remaining = modules.filter((m) => m.id !== moduleToDelete.id);
      setModules(remaining);
      if (activeModuleId === moduleToDelete.id && remaining.length > 0) {
        setActiveModuleId(remaining[0].id);
      }
      setModuleToDelete(null);
      await fetchCourses();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete module");
    } finally {
      setDeletingModule(false);
    }
  };

  const openVisibilityDialog = (mod: LearningModule) => {
    setSelectedModuleForVisibility(mod);
    setVisMode(mod.visibilityStatus);
    setSelectedCollegeIds(mod.assignedColleges?.map((c) => c.id) || []);
    setCollegeSearch("");
    setVisibilityDialogOpen(true);
  };

  const handleSaveVisibility = async () => {
    if (!selectedModuleForVisibility) return;
    if (visMode === "visible" && selectedCollegeIds.length === 0) {
      toast.error("At least one college must be selected when making a module visible.");
      return;
    }

    setSavingVisibility(true);
    try {
      await api.editor.learning.modules.updateVisibility(selectedModuleForVisibility.id, {
        visibilityStatus: visMode,
        collegeIds: visMode === "visible" ? selectedCollegeIds : [],
        confirmRevoke: true,
      });
      toast.success(`Module visibility updated to ${visMode.toUpperCase()}.`);
      setVisibilityDialogOpen(false);
      await fetchModules();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update module visibility");
    } finally {
      setSavingVisibility(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Action Handlers: Courses & Hierarchy
  // ---------------------------------------------------------------------------
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCourseTitle.trim()) {
      toast.error("Course title is required");
      return;
    }
    setSavingCourse(true);
    try {
      const created = await api.editor.courses.create({
        title: createCourseTitle.trim(),
        learningModuleId: activeModuleId,
        difficulty: createCourseDifficulty,
        description: createCourseDesc.trim() || undefined,
        modulesCount: 1,
        lessonsCount: 1,
      });
      toast.success(`Course "${created.title}" created in Draft status.`);
      setCreateCourseTitle("");
      setCreateCourseCode("");
      setCreateCourseDesc("");
      setCreateCoursePrereq("");
      setActiveWorkspaceTab("library");
      await fetchCourses();
      await fetchModules();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create course");
    } finally {
      setSavingCourse(false);
    }
  };

  const handlePublishCourse = async (courseId: string) => {
    try {
      await api.editor.courses.publish(courseId);
      toast.success("Course approved and published. Content version frozen.");
      await fetchCourses();
      await fetchModules();
    } catch (err: any) {
      toast.error(err?.message || "Failed to publish course");
    }
  };

  const handleSubmitCourseForReview = async (courseId: string) => {
    try {
      await api.editor.courses.submitForReview(courseId);
      toast.success("Course submitted for review.");
      await fetchCourses();
      await fetchModules();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit course");
    }
  };

  const handleArchiveCourse = async (courseId: string) => {
    try {
      await api.editor.courses.archive(courseId);
      toast.success("Course archived.");
      await fetchCourses();
      await fetchModules();
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive course");
    }
  };

  const handleCreateNewVersion = async (courseId: string) => {
    try {
      const ver = await api.editor.courses.createVersion(courseId);
      toast.success(`Created new working draft version ${ver.versionNumber}.`);
      await fetchCourses();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create new version");
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setDeletingCourse(true);
    try {
      await api.editor.courses.delete(courseToDelete.id);
      toast.success(`Course "${courseToDelete.title}" deleted.`);
      setCourseToDelete(null);
      await fetchCourses();
      await fetchModules();
    } catch (err: any) {
      toast.error(err?.message || "Cannot delete course");
    } finally {
      setDeletingCourse(false);
    }
  };

  const openHierarchyInspector = async (c: CourseItem) => {
    setLoadingHierarchy(true);
    try {
      const full = await api.editor.courses.get(c.id);
      setSelectedCourseForInspector(full);
    } catch {
      toast.error("Failed to load course hierarchy");
    } finally {
      setLoadingHierarchy(false);
    }
  };

  // Add Chapter to Course Hierarchy
  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForInspector || !newChapterTitle.trim()) return;
    const versionId = selectedCourseForInspector.currentVersionDetails?.id;
    if (!versionId) return;

    try {
      await api.editor.courses.addModule(versionId, {
        title: newChapterTitle.trim(),
        description: newChapterDesc.trim() || undefined,
      });
      toast.success(`Chapter "${newChapterTitle.trim()}" added.`);
      setAddChapterDialogOpen(false);
      setNewChapterTitle("");
      setNewChapterDesc("");
      const full = await api.editor.courses.get(selectedCourseForInspector.id);
      setSelectedCourseForInspector(full);
      fetchCourses();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add chapter");
    }
  };

  // Add Topic to Chapter
  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetChapterId || !newTopicTitle.trim()) return;
    try {
      await api.editor.courses.addTopic(targetChapterId, {
        title: newTopicTitle.trim(),
      });
      toast.success(`Topic "${newTopicTitle.trim()}" added.`);
      setAddTopicDialogOpen(false);
      setNewTopicTitle("");
      const full = await api.editor.courses.get(selectedCourseForInspector.id);
      setSelectedCourseForInspector(full);
      fetchCourses();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add topic");
    }
  };

  // Add Lesson to Topic
  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTopicId || !newLessonTitle.trim()) return;
    try {
      await api.editor.courses.addLesson(targetTopicId, {
        title: newLessonTitle.trim(),
        lessonType: newLessonType,
        durationMinutes: Number(newLessonDuration),
        lessonContent: newLessonContent.trim() || undefined,
      });
      toast.success(`Lesson "${newLessonTitle.trim()}" added.`);
      setAddLessonDialogOpen(false);
      setNewLessonTitle("");
      setNewLessonContent("");
      const full = await api.editor.courses.get(selectedCourseForInspector.id);
      setSelectedCourseForInspector(full);
      fetchCourses();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add lesson");
    }
  };

  // Add Activity to Lesson (linking Question Bank or Coding Judge)
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLessonId || !newActivityTitle.trim()) return;
    try {
      await api.editor.courses.addActivity(targetLessonId, {
        activityType: newActivityType,
        title: newActivityTitle.trim(),
        linkedQuestionId: linkedQuestionCode.trim() || undefined,
        linkedProblemId: linkedProblemCode.trim() || undefined,
      });
      toast.success(`Activity "${newActivityTitle.trim()}" attached.`);
      setAddActivityDialogOpen(false);
      setNewActivityTitle("");
      setLinkedQuestionCode("");
      setLinkedProblemCode("");
      const full = await api.editor.courses.get(selectedCourseForInspector.id);
      setSelectedCourseForInspector(full);
    } catch (err: any) {
      toast.error(err?.message || "Failed to attach activity");
    }
  };

  // Bulk Upload Handler
  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFilename.trim()) {
      toast.error("Filename is required");
      return;
    }
    setImportingBulk(true);
    try {
      let items: any[] = [];
      if (bulkJsonContent.trim()) {
        try {
          items = JSON.parse(bulkJsonContent);
          if (!Array.isArray(items)) items = [items];
        } catch {
          toast.error("Invalid JSON format in import payload");
          setImportingBulk(false);
          return;
        }
      } else {
        items = [
          {
            title: `Course Package: ${bulkFilename.replace(/\.[^/.]+$/, "")}`,
            description: "Bulk uploaded curriculum package",
            difficulty: "Beginner",
            durationHours: 20,
          },
        ];
      }

      const res = await api.editor.learning.uploadHistory.bulkUpload({
        moduleId: activeModuleId,
        filename: bulkFilename.trim(),
        uploadMethod: bulkUploadMethod,
        items,
      });

      toast.success(`Bulk upload processed: ${res.importedCount} courses imported.`);
      setBulkFilename("");
      setBulkJsonContent("");
      await fetchUploadHistory();
      await fetchCourses();
      await fetchModules();
      setActiveWorkspaceTab("library");
    } catch (err: any) {
      toast.error(err?.message || "Failed to process bulk upload");
    } finally {
      setImportingBulk(false);
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    const template = [
      {
        code: "CRS-EX101",
        title: "Sample Engineering Course",
        difficulty: "Intermediate",
        durationHours: 25,
        description: "Course syllabus overview and learning outcomes",
        chapters: [
          {
            title: "Chapter 1: Principles",
            topics: [
              {
                title: "Topic 1.1: Foundations",
                lessons: [
                  {
                    title: "Conceptual Reading",
                    lessonType: "reading",
                    durationMinutes: 15,
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ziphyrus_learning_template.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded learning course JSON template.");
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <PageHeader
        title="Learning Content"
        desc="Educational hierarchy: Course → Course Version → Chapter → Topic → Lesson → Activity. Manage course curriculum, module college access, and learning resource uploads."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchModules();
                fetchUploadHistory();
                fetchCourses();
              }}
              disabled={loadingModules || loadingCourses}
            >
              <RotateCw className={`mr-2 h-4 w-4 ${loadingModules || loadingCourses ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setAddModuleOpen(true)}>
              <FolderPlus className="mr-2 h-4 w-4" /> Add Module
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="eyebrow text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" /> Learning Modules
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{stats.totalModules}</p>
          <p className="text-[11px] text-muted-foreground">5 Default + Custom</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="eyebrow text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-emerald-500" /> Total Courses
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{stats.totalCourses}</p>
          <p className="text-[11px] text-muted-foreground">Across all modules</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="eyebrow text-muted-foreground flex items-center gap-1.5">
            <FileCheck className="h-3.5 w-3.5 text-blue-500" /> Published Courses
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{stats.publishedCourses}</p>
          <p className="text-[11px] text-muted-foreground">Active for enrolled colleges</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="eyebrow text-muted-foreground flex items-center gap-1.5">
            <Edit className="h-3.5 w-3.5 text-amber-500" /> Drafts & In Review
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{stats.draftCourses}</p>
          <p className="text-[11px] text-muted-foreground">Curriculum in preparation</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="eyebrow text-muted-foreground flex items-center gap-1.5">
            <UploadCloud className="h-3.5 w-3.5 text-purple-500" /> Upload Batches
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{stats.totalUploads}</p>
          <p className="text-[11px] text-muted-foreground">Ingested packages & assets</p>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1 (TOP): Learning Content Upload History
         ========================================================================= */}
      <Panel
        title={
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <span>Learning Content Upload History</span>
            <Badge variant="outline" className="ml-2 text-xs font-mono">
              {filteredHistory.length}
            </Badge>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search uploads by filename or batch ID..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={historyModuleFilter} onValueChange={setHistoryModuleFilter}>
              <SelectTrigger>
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

            <Select value={historyMethodFilter} onValueChange={setHistoryMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Upload Methods</SelectItem>
                <SelectItem value="zip">ZIP Packages</SelectItem>
                <SelectItem value="pdf">PDF Uploads</SelectItem>
                <SelectItem value="json">JSON Curriculum</SelectItem>
              </SelectContent>
            </Select>

            <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Processing Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* History DataTable */}
          <DataTable
            data={filteredHistory}
            emptyMessage={
              loadingHistory
                ? "Loading upload history from Supabase..."
                : "No learning content uploads match your filter criteria."
            }
            columns={[
              {
                header: "Batch ID",
                accessor: (item) => (
                  <span className="font-mono text-xs font-semibold text-primary">{item.id}</span>
                ),
              },
              {
                header: "Module",
                accessor: (item) => (
                  <Badge variant="outline" className="text-xs">
                    {item.moduleName}
                  </Badge>
                ),
              },
              {
                header: "Resource File",
                accessor: (item) => (
                  <div>
                    <p className="font-medium text-xs flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      {item.filename}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{item.uploadMethod}</p>
                  </div>
                ),
              },
              {
                header: "Uploader & Date",
                accessor: (item) => (
                  <div>
                    <p className="text-xs">{item.uploadedBy}</p>
                    <p className="text-[10px] text-muted-foreground">{fmt(item.createdAt)}</p>
                  </div>
                ),
              },
              {
                header: "Items Processed",
                accessor: (item) => (
                  <div className="text-xs">
                    <span className="font-semibold text-foreground">
                      {item.importedItems} / {item.totalItems}
                    </span>
                    {item.rejectedItems > 0 && (
                      <span className="ml-1 text-[11px] text-destructive">({item.rejectedItems} rejected)</span>
                    )}
                  </div>
                ),
              },
              {
                header: "Processing Status",
                accessor: (item) => (
                  <Badge
                    variant={
                      item.status === "completed"
                        ? "default"
                        : item.status === "failed"
                        ? "destructive"
                        : "secondary"
                    }
                    className="capitalize text-xs"
                  >
                    {item.status}
                  </Badge>
                ),
              },
              {
                header: "Publication",
                accessor: (item) => (
                  <StatusBadge status={item.publicationStatus} label={item.publicationStatus.toUpperCase()} />
                ),
              },
              {
                header: "Actions",
                accessor: (item) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInspectBatch(item)}
                    className="text-xs h-7 px-2"
                  >
                    Details
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </Panel>

      {/* =========================================================================
          SECTION 2: Learning Modules (Flexible 3-per-row Grid)
         ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Learning Modules & College Visibility
            </h2>
            <p className="text-xs text-muted-foreground">
              Select a module to manage its course curriculum. Newly created modules default to Hidden. Access requires both visibility and the Training feature flag.
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
                          setEditModuleName(mod.name);
                          setEditModuleDesc(mod.description || "");
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
                      Learning
                    </Badge>
                    {isVisible ? (
                      <Badge variant="outline" className="text-[10px] py-0 px-2 h-5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Eye className="h-2.5 w-2.5" /> Visible ({mod.assignedCollegeCount})
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] py-0 px-2 h-5 text-muted-foreground flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5" /> Hidden
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 h-8">
                    {mod.description || "Comprehensive module courses and lesson activities."}
                  </p>
                </div>

                {/* Metrics Breakdown */}
                <div className="my-4 grid grid-cols-3 gap-2 border-y border-border/60 py-2.5 text-center text-xs">
                  <div>
                    <span className="block font-semibold text-foreground">{mod.totalCourses}</span>
                    <span className="text-[10px] text-muted-foreground">Courses</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-emerald-600 dark:text-emerald-400">{mod.publishedCount}</span>
                    <span className="text-[10px] text-muted-foreground">Published</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-amber-600 dark:text-amber-400">{mod.draftCount}</span>
                    <span className="text-[10px] text-muted-foreground">Drafts</span>
                  </div>
                </div>

                {/* Action Bar at bottom */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openVisibilityDialog(mod);
                    }}
                    className="h-8 text-xs shrink-0 px-2.5"
                  >
                    <Eye className="h-3 w-3 mr-1" /> Visibility
                  </Button>

                  <Button
                    variant={isSelected ? "default" : "secondary"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModuleId(mod.id);
                    }}
                    className="h-8 text-xs flex-1 truncate"
                  >
                    Manage Courses
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: Selected Module Workspace
         ========================================================================= */}
      <Panel
        title={
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>
                Workspace: <span className="text-primary font-semibold">{currentModule?.name}</span>
              </span>
              <Badge variant="outline" className="text-xs">
                {courses.length} Courses
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Status: <strong className="text-foreground capitalize">{currentModule?.visibilityStatus}</strong></span>
              <span>·</span>
              <span>Assigned Colleges: <strong className="text-foreground">{currentModule?.assignedCollegeCount || 0}</strong></span>
            </div>
          </div>
        }
      >
        <Tabs value={activeWorkspaceTab} onValueChange={setActiveWorkspaceTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full">
            <TabsTrigger value="library">Course Library</TabsTrigger>
            <TabsTrigger value="create">Create Course</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
            <TabsTrigger value="review">Review & Publish</TabsTrigger>
            <TabsTrigger value="history">Content History</TabsTrigger>
            <TabsTrigger value="visibility">Module Visibility</TabsTrigger>
          </TabsList>

          {/* TAB 1: Course Library */}
          <TabsContent value="library" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 gap-2 max-w-lg">
                <Input
                  placeholder="Search courses by title or code…"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DataTable
              data={filteredCourses}
              emptyMessage={
                loadingCourses
                  ? "Loading courses..."
                  : "No courses found in this module. Use 'Create Course' or 'Bulk Upload' to add curriculum."
              }
              columns={[
                {
                  header: "Code",
                  accessor: (c) => <span className="font-mono text-xs font-semibold">{c.code}</span>,
                },
                {
                  header: "Title & Details",
                  accessor: (c) => (
                    <div>
                      <p className="font-medium text-xs sm:text-sm">{c.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        {c.description || "No description provided."}
                      </p>
                    </div>
                  ),
                },
                {
                  header: "Level & Duration",
                  accessor: (c) => (
                    <div className="text-xs">
                      <Badge variant="outline" className="text-[10px] py-0">
                        {c.difficulty || "Beginner"}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {c.estimatedDurationHours || 15} hrs
                      </p>
                    </div>
                  ),
                },
                {
                  header: "Version",
                  accessor: (c) => (
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.currentVersion || c.version}
                    </span>
                  ),
                },
                {
                  header: "Structure",
                  accessor: (c) => (
                    <span className="text-xs text-muted-foreground">
                      {c.modulesCount} units · {c.lessonsCount} lessons
                    </span>
                  ),
                },
                {
                  header: "Status",
                  accessor: (c) => <StatusBadge status={c.status} label={c.status.toUpperCase()} />,
                },
                {
                  header: "Actions",
                  accessor: (c) => (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openHierarchyInspector(c)}
                        className="text-xs h-7 px-2"
                      >
                        <FolderTree className="h-3 w-3 mr-1" /> Inspector
                      </Button>

                      {c.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSubmitCourseForReview(c.id)}
                          className="text-xs h-7 px-2 text-blue-600 hover:text-blue-700"
                        >
                          Submit
                        </Button>
                      )}

                      {(c.status === "draft" || c.status === "in_review") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePublishCourse(c.id)}
                          className="text-xs h-7 px-2 text-emerald-600 hover:text-emerald-700"
                        >
                          Publish
                        </Button>
                      )}

                      {c.status === "published" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreateNewVersion(c.id)}
                            className="text-xs h-7 px-2 text-purple-600 hover:text-purple-700"
                          >
                            New Ver
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchiveCourse(c.id)}
                            className="text-xs h-7 px-2 text-amber-600 hover:text-amber-700"
                          >
                            Archive
                          </Button>
                        </>
                      )}

                      {c.status !== "published" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCourseToDelete(c)}
                          className="text-xs h-7 px-2 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </TabsContent>

          {/* TAB 2: Create Course */}
          <TabsContent value="create">
            <div className="max-w-2xl rounded-lg border border-border bg-card p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-base">Create Course in {currentModule?.name}</h3>
                <p className="text-xs text-muted-foreground">
                  New courses start in Draft status. You can configure chapters, topics, lessons, and linked activities before publishing.
                </p>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <Label htmlFor="crs-title">Course Title</Label>
                  <Input
                    id="crs-title"
                    placeholder="e.g. Distributed Consensus & Raft Architecture"
                    value={createCourseTitle}
                    onChange={(e) => setCreateCourseTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="crs-diff">Difficulty Level</Label>
                    <Select
                      value={createCourseDifficulty}
                      onValueChange={(v: any) => setCreateCourseDifficulty(v)}
                    >
                      <SelectTrigger id="crs-diff">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="crs-dur">Estimated Duration (Hours)</Label>
                    <Input
                      id="crs-dur"
                      type="number"
                      min="1"
                      max="200"
                      value={createCourseDuration}
                      onChange={(e) => setCreateCourseDuration(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="crs-desc">Course Description & Outcomes</Label>
                  <Textarea
                    id="crs-desc"
                    placeholder="Provide a comprehensive summary of key concepts covered..."
                    rows={3}
                    value={createCourseDesc}
                    onChange={(e) => setCreateCourseDesc(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="crs-prereq">Prerequisites Summary</Label>
                  <Input
                    id="crs-prereq"
                    placeholder="e.g. Basic knowledge of computer systems and discrete structures"
                    value={createCoursePrereq}
                    onChange={(e) => setCreateCoursePrereq(e.target.value)}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveWorkspaceTab("library")}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingCourse}>
                    {savingCourse ? "Creating…" : "Create Course"}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>

          {/* TAB 3: Bulk Upload */}
          <TabsContent value="bulk">
            <div className="max-w-2xl rounded-lg border border-border bg-card p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-primary" /> Bulk Course & Curriculum Ingestion
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload complete structured packages (ZIP), JSON curriculum manifests, or individual PDF guides into {currentModule?.name}. Imported records begin in Draft status.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="text-xs">
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download JSON Template
                </Button>
              </div>

              <form onSubmit={handleBulkUpload} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bulk-method">Upload Method / Format</Label>
                    <Select value={bulkUploadMethod} onValueChange={setBulkUploadMethod}>
                      <SelectTrigger id="bulk-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ZIP package import">ZIP Package (.zip)</SelectItem>
                        <SelectItem value="JSON curriculum import">JSON Curriculum Manifest</SelectItem>
                        <SelectItem value="PDF document upload">PDF Course Guide / Notes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="bulk-fname">File Name</Label>
                    <Input
                      id="bulk-fname"
                      placeholder="e.g. curriculum_pack_v1.zip"
                      value={bulkFilename}
                      onChange={(e) => setBulkFilename(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bulk-payload">JSON Manifest Payload (Optional text input)</Label>
                  <Textarea
                    id="bulk-payload"
                    placeholder="Paste JSON array or leave blank to auto-generate default course package..."
                    rows={6}
                    value={bulkJsonContent}
                    onChange={(e) => setBulkJsonContent(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="rounded-md border border-border/80 bg-muted/20 p-3 text-xs space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Validation Invariants
                  </p>
                  <p className="text-muted-foreground">
                    - Path traversal (ZIP-slip) and unauthorized parent references are strictly rejected.
                  </p>
                  <p className="text-muted-foreground">
                    - Ingested content is placed into Draft status awaiting explicit editor review and publication.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="submit" disabled={importingBulk}>
                    {importingBulk ? "Processing Import…" : "Run Validation & Import"}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>

          {/* TAB 4: Review & Publish */}
          <TabsContent value="review" className="space-y-4">
            <div>
              <h3 className="font-semibold text-base">Courses Awaiting Review & Publication</h3>
              <p className="text-xs text-muted-foreground">
                Verify curriculum completeness before publishing. Publishing creates an immutable version snapshot.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {courses
                .filter((c) => c.status === "in_review" || c.status === "draft")
                .map((c) => (
                  <div key={c.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-primary">{c.code}</span>
                      <StatusBadge status={c.status} label={c.status.toUpperCase()} />
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm">{c.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>
                    </div>

                    <div className="space-y-1 rounded border border-border/60 bg-muted/20 p-2.5 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5 text-foreground font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Structure Checklist
                      </p>
                      <p>• Modules / Units: {c.modulesCount} configured</p>
                      <p>• Lessons count: {c.lessonsCount} lessons</p>
                      <p>• Version target: {c.currentVersion || c.version}</p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openHierarchyInspector(c)}
                        className="text-xs"
                      >
                        Inspect
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePublishCourse(c.id)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Approve & Publish
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>

          {/* TAB 5: Content History */}
          <TabsContent value="history">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base">Module Content Audit History</h3>
                <p className="text-xs text-muted-foreground">
                  Immutable ledger of course authoring, version freezes, publication, and visibility assignments.
                </p>
              </div>

              <div className="rounded-md border border-border p-4 bg-card text-xs space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-medium text-foreground">Action: Course Publication (CRS-DSA101)</span>
                  <span className="text-muted-foreground">Version: v1.2 · 30 days ago</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-medium text-foreground">Action: Module Visibility Assigned (SMP101, SMP102)</span>
                  <span className="text-muted-foreground">Actor: editor1@ziphyrus.in · 40 days ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Action: Ingestion Batch Processed (react_architecture_handbook.pdf)</span>
                  <span className="text-muted-foreground">12 days ago</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 6: Module Visibility */}
          <TabsContent value="visibility">
            <div className="max-w-2xl rounded-lg border border-border bg-card p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" /> College Visibility & Access Controls
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure which institutions have curricular access to {currentModule?.name}. Note that student delivery also requires the "Training & Courses" feature flag.
                </p>
              </div>

              <div className="rounded-md border border-border p-4 bg-muted/20 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Mode:</span>
                  <Badge variant={currentModule?.visibilityStatus === "visible" ? "default" : "outline"} className="capitalize">
                    {currentModule?.visibilityStatus}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Assigned Colleges:</span>
                  <span className="font-semibold text-foreground">
                    {currentModule?.assignedCollegeCount || 0} Institution(s)
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold">Active Institutional Grants:</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {currentModule?.assignedColleges && currentModule.assignedColleges.length > 0 ? (
                    currentModule.assignedColleges.map((col) => (
                      <div key={col.id} className="flex items-center justify-between p-2 rounded border border-border/80 bg-background text-xs">
                        <div>
                          <span className="font-mono font-semibold text-primary">{col.code}</span>
                          <span className="ml-2 font-medium">{col.name}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {col.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No colleges currently assigned.</p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <Button size="sm" onClick={() => openVisibilityDialog(currentModule!)}>
                  Edit Module Visibility & College Access
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Panel>

      {/* =========================================================================
          DIALOG: Add Learning Module
         ========================================================================= */}
      <Dialog open={addModuleOpen} onOpenChange={setAddModuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Learning Content Module</DialogTitle>
            <DialogDescription>
              Create a new organizational category for courses and lessons. Defaults to Hidden.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateModule} className="space-y-4 py-2">
            <div>
              <Label htmlFor="new-mod-name">Module Name</Label>
              <Input
                id="new-mod-name"
                placeholder="e.g. Cloud Computing & DevOps"
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="new-mod-desc">Description</Label>
              <Textarea
                id="new-mod-desc"
                placeholder="Brief summary of domain topics covered..."
                rows={3}
                value={newModuleDesc}
                onChange={(e) => setNewModuleDesc(e.target.value)}
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

      {/* =========================================================================
          DIALOG: Edit Module
         ========================================================================= */}
      <Dialog open={!!editingModule} onOpenChange={(open) => !open && setEditingModule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Learning Module</DialogTitle>
            <DialogDescription>Update module title and domain description.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateModule} className="space-y-4 py-2">
            <div>
              <Label htmlFor="edit-mod-name">Module Name</Label>
              <Input
                id="edit-mod-name"
                value={editModuleName}
                onChange={(e) => setEditModuleName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-mod-desc">Description</Label>
              <Textarea
                id="edit-mod-desc"
                rows={3}
                value={editModuleDesc}
                onChange={(e) => setEditModuleDesc(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingModule(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatingModule}>
                {updatingModule ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          DIALOG: Manage College Visibility
         ========================================================================= */}
      <Dialog open={visibilityDialogOpen} onOpenChange={setVisibilityDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage College Visibility — {selectedModuleForVisibility?.name}</DialogTitle>
            <DialogDescription>
              Control institutional access to courses and lessons within this learning module.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <RadioGroup value={visMode} onValueChange={(v: any) => setVisMode(v)} className="space-y-2">
              <div className="flex items-start space-x-2 rounded-md border p-3">
                <RadioGroupItem value="hidden" id="vis-hidden" className="mt-0.5" />
                <Label htmlFor="vis-hidden" className="cursor-pointer font-normal">
                  <span className="font-semibold text-foreground">Hidden (Default)</span>
                  <span className="block text-xs text-muted-foreground">
                    Module and its courses are hidden from ordinary student and coordinator dashboards. Editors can manage freely.
                  </span>
                </Label>
              </div>

              <div className="flex items-start space-x-2 rounded-md border p-3">
                <RadioGroupItem value="visible" id="vis-visible" className="mt-0.5" />
                <Label htmlFor="vis-visible" className="cursor-pointer font-normal">
                  <span className="font-semibold text-foreground">Visible to Selected Colleges</span>
                  <span className="block text-xs text-muted-foreground">
                    Assign access to one or more approved institutions. Requires feature flag activation for student delivery.
                  </span>
                </Label>
              </div>
            </RadioGroup>

            {visMode === "visible" && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Select Authorized Colleges</Label>
                  <span className="text-xs text-muted-foreground font-mono">
                    {selectedCollegeIds.length} selected
                  </span>
                </div>

                <Input
                  placeholder="Search colleges by name or code..."
                  value={collegeSearch}
                  onChange={(e) => setCollegeSearch(e.target.value)}
                  className="text-xs h-8"
                />

                <div className="max-h-60 overflow-y-auto space-y-1.5 rounded-md border p-2 bg-muted/10">
                  {colleges
                    .filter(
                      (c) =>
                        !collegeSearch ||
                        c.name.toLowerCase().includes(collegeSearch.toLowerCase()) ||
                        c.code.toLowerCase().includes(collegeSearch.toLowerCase())
                    )
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
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-xs ${
                            isChecked ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox checked={isChecked} onCheckedChange={() => {}} />
                            <div>
                              <span className="font-mono font-semibold text-primary">{col.code}</span>
                              <span className="ml-2 font-medium">{col.name}</span>
                              <span className="block font-mono text-[10px] text-muted-foreground">{col.id}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {col.status}
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVisibilityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVisibility} disabled={savingVisibility}>
              {savingVisibility ? "Saving…" : "Save Visibility Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          DIALOG: Hierarchy Inspector & Course Tree Builder
         ========================================================================= */}
      <Dialog
        open={!!selectedCourseForInspector}
        onOpenChange={(open) => !open && setSelectedCourseForInspector(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono">
              <span>{selectedCourseForInspector?.code}</span>
              <span className="font-sans font-semibold text-foreground">
                — {selectedCourseForInspector?.title}
              </span>
            </DialogTitle>
            <DialogDescription>
              Hierarchical Content Tree: Course → Version ({selectedCourseForInspector?.currentVersion}) → Chapter → Topic → Lesson → Activity.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Status: <strong className="text-foreground capitalize">{selectedCourseForInspector?.status}</strong> · Level: <strong>{selectedCourseForInspector?.difficulty}</strong>
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddChapterDialogOpen(true)}
                className="text-xs"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Chapter
              </Button>
            </div>

            {/* Chapters list */}
            <div className="space-y-3">
              {selectedCourseForInspector?.chapters && selectedCourseForInspector.chapters.length > 0 ? (
                selectedCourseForInspector.chapters.map((ch: any, chIdx: number) => (
                  <div key={ch.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <FolderTree className="h-4 w-4 text-primary" /> Chapter {chIdx + 1}: {ch.title}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setTargetChapterId(ch.id);
                          setAddTopicDialogOpen(true);
                        }}
                        className="text-[11px] h-6 px-2 text-primary"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Topic
                      </Button>
                    </div>

                    {/* Topics */}
                    <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                      {ch.topics && ch.topics.length > 0 ? (
                        ch.topics.map((top: any, topIdx: number) => (
                          <div key={top.id} className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between font-medium text-foreground">
                              <span>• Topic {chIdx + 1}.{topIdx + 1}: {top.title}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setTargetTopicId(top.id);
                                  setAddLessonDialogOpen(true);
                                }}
                                className="text-[10px] h-5 px-1.5 text-muted-foreground hover:text-foreground"
                              >
                                <Plus className="h-2.5 w-2.5 mr-0.5" /> Lesson
                              </Button>
                            </div>

                            {/* Lessons */}
                            <div className="pl-4 border-l border-border/60 space-y-1 text-muted-foreground">
                              {top.lessons && top.lessons.length > 0 ? (
                                top.lessons.map((les: any) => (
                                  <div key={les.id} className="rounded bg-muted/20 p-2 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-foreground text-[11px]">
                                        └ {les.title} [{les.lessonType}]
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setTargetLessonId(les.id);
                                          setAddActivityDialogOpen(true);
                                        }}
                                        className="text-[10px] h-5 px-1 text-primary"
                                      >
                                        <Plus className="h-2.5 w-2.5 mr-0.5" /> Activity
                                      </Button>
                                    </div>

                                    {/* Activities */}
                                    {les.activities && les.activities.length > 0 && (
                                      <div className="pl-3 space-y-0.5 text-[10px]">
                                        {les.activities.map((act: any) => (
                                          <div key={act.id} className="flex items-center gap-1.5 text-primary">
                                            <span>⚡ Activity:</span>
                                            <span className="text-foreground">{act.title}</span>
                                            {act.linkedQuestionId && <Badge variant="outline" className="text-[9px] py-0">Q-Ref: {act.linkedQuestionId}</Badge>}
                                            {act.linkedProblemId && <Badge variant="outline" className="text-[9px] py-0">PRB-Ref: {act.linkedProblemId}</Badge>}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-[11px] text-muted-foreground italic">No lessons in this topic yet.</p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">No topics in this chapter yet.</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6 italic">
                  No chapters yet. Click "Add Chapter" above to start building the curriculum.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCourseForInspector(null)}>
              Close Inspector
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          DIALOGS FOR HIERARCHY TREE: Chapter, Topic, Lesson, Activity
         ========================================================================= */}
      <Dialog open={addChapterDialogOpen} onOpenChange={setAddChapterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Course Chapter / Module</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddChapter} className="space-y-4 py-2">
            <div>
              <Label htmlFor="ch-title">Chapter Title</Label>
              <Input
                id="ch-title"
                placeholder="e.g. Memory Layout & Cache Coherence"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="ch-desc">Description</Label>
              <Input
                id="ch-desc"
                placeholder="Summary of this unit..."
                value={newChapterDesc}
                onChange={(e) => setNewChapterDesc(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddChapterDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Add Chapter</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addTopicDialogOpen} onOpenChange={setAddTopicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Topic</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTopic} className="space-y-4 py-2">
            <div>
              <Label htmlFor="top-title">Topic Title</Label>
              <Input
                id="top-title"
                placeholder="e.g. Cache Lines & False Sharing"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddTopicDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Add Topic</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addLessonDialogOpen} onOpenChange={setAddLessonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Lesson</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLesson} className="space-y-4 py-2">
            <div>
              <Label htmlFor="les-title">Lesson Title</Label>
              <Input
                id="les-title"
                placeholder="e.g. Cache Invalidation in Multiprocessors"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="les-type">Lesson Type</Label>
                <Select value={newLessonType} onValueChange={setNewLessonType}>
                  <SelectTrigger id="les-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reading">Reading / Article</SelectItem>
                    <SelectItem value="video">Video Lecture</SelectItem>
                    <SelectItem value="notes">Structured Notes</SelectItem>
                    <SelectItem value="practice_question">Practice Questions</SelectItem>
                    <SelectItem value="coding_exercise">Coding Judge Exercise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="les-dur">Duration (mins)</Label>
                <Input
                  id="les-dur"
                  type="number"
                  min="5"
                  max="180"
                  value={newLessonDuration}
                  onChange={(e) => setNewLessonDuration(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="les-content">Lesson Body / Markdown</Label>
              <Textarea
                id="les-content"
                placeholder="Write lesson notes or markdown content..."
                rows={4}
                value={newLessonContent}
                onChange={(e) => setNewLessonContent(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddLessonDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Add Lesson</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addActivityDialogOpen} onOpenChange={setAddActivityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Learning Activity</DialogTitle>
            <DialogDescription>
              Link interactive tasks, Question Management items, or Coding Judge exercises.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddActivity} className="space-y-4 py-2">
            <div>
              <Label htmlFor="act-title">Activity Title</Label>
              <Input
                id="act-title"
                placeholder="e.g. Solve Two Sum on Coding Judge"
                value={newActivityTitle}
                onChange={(e) => setNewActivityTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="act-type">Activity Type</Label>
              <Select value={newActivityType} onValueChange={setNewActivityType}>
                <SelectTrigger id="act-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reading">Reading / Notes</SelectItem>
                  <SelectItem value="practice_question">Linked Question (MCQ / Subjective)</SelectItem>
                  <SelectItem value="coding_exercise">Linked Coding Judge Problem</SelectItem>
                  <SelectItem value="video">Video Watching</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newActivityType === "practice_question" && (
              <div>
                <Label htmlFor="q-ref">Question Code / ID from Question Bank</Label>
                <Input
                  id="q-ref"
                  placeholder="e.g. Q-0001 or 70000000-0000-0000-0000-000000000001"
                  value={linkedQuestionCode}
                  onChange={(e) => setLinkedQuestionCode(e.target.value)}
                />
              </div>
            )}
            {newActivityType === "coding_exercise" && (
              <div>
                <Label htmlFor="prb-ref">Problem Code / ID from Coding Judge</Label>
                <Input
                  id="prb-ref"
                  placeholder="e.g. PRB-0001 or f0000000-0000-0000-0000-000000000001"
                  value={linkedProblemCode}
                  onChange={(e) => setLinkedProblemCode(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Hidden test cases and reference solutions remain isolated in the Judge engine and are never exposed to learners.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddActivityDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Attach Activity</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          DIALOG: Inspect Batch Upload Details
         ========================================================================= */}
      <Dialog open={!!inspectBatch} onOpenChange={(open) => !open && setInspectBatch(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload Batch Details: {inspectBatch?.id}</DialogTitle>
            <DialogDescription>
              Processing status, file metadata, and rejected row breakdown.
            </DialogDescription>
          </DialogHeader>

          {inspectBatch && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-md border p-3 bg-muted/20">
                <div>
                  <span className="text-muted-foreground">Filename:</span>
                  <p className="font-semibold text-foreground">{inspectBatch.filename}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Target Module:</span>
                  <p className="font-semibold text-foreground">{inspectBatch.moduleName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Upload Method:</span>
                  <p className="font-semibold text-foreground">{inspectBatch.uploadMethod}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Uploaded By:</span>
                  <p className="font-semibold text-foreground">{inspectBatch.uploadedBy}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Items Processed:</span>
                  <p className="font-semibold text-foreground">
                    {inspectBatch.importedItems} / {inspectBatch.totalItems} imported
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Publication Status:</span>
                  <p className="font-semibold text-foreground uppercase">{inspectBatch.publicationStatus}</p>
                </div>
              </div>

              {inspectBatch.errorSummary && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 space-y-1">
                  <p className="font-semibold text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> Error Summary
                  </p>
                  <p className="text-destructive/90">{inspectBatch.errorSummary}</p>
                  {inspectBatch.rejectedDetails && inspectBatch.rejectedDetails.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {inspectBatch.rejectedDetails.map((rej, i) => (
                        <div key={i} className="text-[11px] text-destructive/80 pl-2 border-l border-destructive/40">
                          Row {rej.rowNumber}: {rej.errors.join(", ")}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInspectBatch(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          DIALOG: Delete Course Confirmation
         ========================================================================= */}
      <Dialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete course <strong className="font-mono text-foreground">{courseToDelete?.code}</strong> ({courseToDelete?.title})? This will permanently remove its draft chapters and lessons.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCourse} disabled={deletingCourse}>
              {deletingCourse ? "Deleting…" : "Delete Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          ALERT DIALOG: Delete Learning Module Confirmation
         ========================================================================= */}
      <AlertDialog open={Boolean(moduleToDelete)} onOpenChange={(open) => !open && setModuleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Permanently Delete Learning Module?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete module &ldquo;{moduleToDelete?.name}&rdquo;?
              <br />
              <br />
              <strong>Warning:</strong> This action will cascade and permanently delete all child courses, versions, chapters, topics, lessons, and college visibility mappings associated with this module in both the local database and Supabase.
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
    </div>
  );
}
export default LearningContentPage;
