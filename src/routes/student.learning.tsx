import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  FolderTree,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
  Layers,
  FileText,
  PlayCircle,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student/learning")({
  head: () => ({
    meta: [
      { title: "Learning Content — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentLearningPage,
});

function StudentLearningPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [featureDisabled, setFeatureDisabled] = useState(false);

  // Selected Course & Lesson
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonDetail, setLessonDetail] = useState<any | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());

  // Load courses
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const list = await api.student.learning.courses();
        setCourses(list || []);

        if (list && list.length > 0) {
          setSelectedCourseId(list[0].id);
        } else {
          // If empty list, check if training.courses flag is off
          setFeatureDisabled(true);
        }
      } catch (err: any) {
        if (err?.code === "feature_disabled" || err?.status === 403) {
          setFeatureDisabled(true);
        } else {
          setCourses([]);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Load selected course tree
  useEffect(() => {
    if (!selectedCourseId) return;

    async function loadCourseTree() {
      try {
        const c = await api.student.learning.getCourse(selectedCourseId);
        setSelectedCourse(c);

        // Pick first lesson
        const firstLesson = c?.modules?.[0]?.topics?.[0]?.lessons?.[0];
        if (firstLesson) {
          setSelectedLessonId(firstLesson.id);
        }
      } catch (err) {
        console.error("Error loading course tree:", err);
      }
    }

    loadCourseTree();
  }, [selectedCourseId]);

  // Load selected lesson detail
  useEffect(() => {
    if (!selectedCourseId || !selectedLessonId) return;

    async function loadLesson() {
      try {
        const l = await api.student.learning.getLesson(selectedCourseId, selectedLessonId);
        setLessonDetail(l);
      } catch (err) {
        console.error("Error loading lesson detail:", err);
      }
    }

    loadLesson();
  }, [selectedCourseId, selectedLessonId]);

  // Mark Lesson Complete (PART 8)
  const handleMarkComplete = async () => {
    if (!selectedCourseId || !selectedLessonId) return;
    setCompleting(true);
    try {
      await api.student.learning.complete(selectedCourseId, selectedLessonId, undefined, "reading");
      setCompletedLessonIds((prev) => new Set(prev).add(selectedLessonId));
      toast.success("Lesson marked as completed! Verified progress updated.");

      // Advance to next lesson if available
      if (lessonDetail?.nextLessonId) {
        setSelectedLessonId(lessonDetail.nextLessonId);
      }
    } catch (err) {
      toast.error("Error recording completion progress.");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
        Loading learning content…
      </div>
    );
  }

  // Feature Flag disabled state (Training & Courses is disabled by default per Part 8 & PART 25)
  if (featureDisabled || courses.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Training & Courses Module</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The institutional course catalog is governed by feature availability and campus licensing. Curricular course delivery is currently not activated for your institution.
        </p>
        <div className="p-3 rounded bg-muted/40 border border-border/60 text-[11px] text-muted-foreground text-left space-y-1">
          <span className="font-semibold text-foreground block">Campus Access Policy:</span>
          <span>• Training & Courses Feature Flag: <code className="font-mono text-amber-600">training.courses</code></span>
          <span className="block">• Contact your campus Coordinator or Ziphyrus X institutional administrator to request course access.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <span>Learning Content</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Repository-style hierarchical course materials and verified learning exercises.
          </p>
        </div>

        {/* Course Switcher */}
        {courses.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Course:</span>
            <select
              value={selectedCourseId || ""}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="h-8 text-xs rounded border border-border bg-background px-2 font-medium"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2-Column Repository Explorer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[580px]">
        {/* Left Column (4 cols): Course Tree Navigation */}
        <div className="lg:col-span-4 rounded-md border border-border bg-card p-3 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60 text-xs font-semibold text-foreground">
            <FolderTree className="w-4 h-4 text-primary" />
            <span>Course Navigation Tree</span>
          </div>

          <div className="space-y-2 text-xs overflow-y-auto max-h-[500px]">
            {selectedCourse?.modules?.map((mod: any, mIdx: number) => (
              <div key={mod.id || mIdx} className="space-y-1">
                <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block py-1 text-muted-foreground">
                  Module {mIdx + 1}: {mod.title}
                </span>

                {mod.topics?.map((top: any, tIdx: number) => (
                  <div key={top.id || tIdx} className="pl-2 space-y-1 border-l border-border/60">
                    <span className="font-medium text-foreground text-xs block py-0.5">
                      {top.title}
                    </span>

                    <div className="pl-2 space-y-0.5">
                      {top.lessons?.map((les: any) => {
                        const isSelected = les.id === selectedLessonId;
                        const isCompleted = completedLessonIds.has(les.id);

                        return (
                          <button
                            key={les.id}
                            type="button"
                            onClick={() => setSelectedLessonId(les.id)}
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors",
                              isSelected
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <span className="truncate pr-2">{les.title}</span>
                            {isCompleted && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (8 cols): Lesson Content Viewer & Previous/Next Navigation */}
        <div className="lg:col-span-8 rounded-md border border-border bg-card p-5 space-y-5 flex flex-col justify-between min-h-[500px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <span className="text-[11px] font-mono text-muted-foreground uppercase">
                  {selectedCourse?.title}
                </span>
                <h3 className="text-base font-bold text-foreground mt-0.5">
                  {lessonDetail?.lesson?.title || "Lesson Overview"}
                </h3>
              </div>

              <Button
                size="sm"
                variant={completedLessonIds.has(selectedLessonId || "") ? "outline" : "default"}
                className={cn(
                  "h-8 text-xs gap-1.5 font-medium",
                  completedLessonIds.has(selectedLessonId || "")
                    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
                disabled={completing}
                onClick={handleMarkComplete}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {completedLessonIds.has(selectedLessonId || "") ? "Completed" : "Mark as Completed"}
                </span>
              </Button>
            </div>

            {/* Lesson Body Content */}
            <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-foreground space-y-3">
              <p>
                {lessonDetail?.content ||
                  "In this lesson, we examine fundamental design patterns, data structure memory layout, and computational complexity guarantees."}
              </p>

              <div className="p-3 rounded bg-muted/40 border border-border font-mono text-xs">
                <span className="text-[10px] uppercase text-muted-foreground block mb-1">
                  Example Implementation Pattern:
                </span>
                <pre className="text-foreground overflow-x-auto">
                  {`// Optimal two-pointer traversal
function searchRange(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`}
                </pre>
              </div>

              <p className="text-muted-foreground">
                Key Takeaway: Cache locality and algorithmic invariants guarantee predictable latency under production data loads.
              </p>
            </div>
          </div>

          {/* Previous and Next Lesson Navigation Controls (PART 8) */}
          <div className="pt-4 border-t border-border/60 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-border gap-1"
              disabled={lessonDetail?.isFirstLesson || !lessonDetail?.previousLessonId}
              onClick={() => {
                if (lessonDetail?.previousLessonId) {
                  setSelectedLessonId(lessonDetail.previousLessonId);
                }
              }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous Lesson</span>
            </Button>

            <span className="text-[11px] text-muted-foreground truncate max-w-[200px] text-center hidden sm:inline">
              {lessonDetail?.lesson?.title}
            </span>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-border gap-1"
              disabled={lessonDetail?.isLastLesson || !lessonDetail?.nextLessonId}
              onClick={() => {
                if (lessonDetail?.nextLessonId) {
                  setSelectedLessonId(lessonDetail.nextLessonId);
                }
              }}
            >
              <span>Next Lesson</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
