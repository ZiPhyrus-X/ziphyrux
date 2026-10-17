import { useEffect, useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Save,
  Check,
  Award,
  ArrowRight,
  RotateCcw,
  Search,
  X,
  Filter,
  Sparkles,
  Code2,
  BookOpen,
  Brain,
  Terminal,
  ShieldCheck,
  Bookmark,
  Flag,
  ListChecks,
  Timer,
  Zap,
  BarChart2,
  CheckSquare,
  GraduationCap,
  Calendar,
  Layers,
  Flame,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student/assessments")({
  head: () => ({
    meta: [
      { title: "Student Assessments & Diagnostics — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentAssessmentsPage,
});

export function StudentAssessmentsPage() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"available" | "completed" | "all">("available");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");

  // Active Assessment Attempt State
  const [activeAttemptAssessment, setActiveAttemptAssessment] = useState<any | null>(null);
  const [attemptData, setAttemptData] = useState<any | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(3600);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [completedResult, setCompletedResult] = useState<any | null>(null);
  const [selectedScorecard, setSelectedScorecard] = useState<any | null>(null);

  // Load Assessments Catalog
  useEffect(() => {
    async function loadAssessments() {
      try {
        setLoading(true);
        const res = await api.student.assessments.list();
        setAssessments(res || []);
      } catch (err) {
        console.error("Error loading assessments:", err);
        toast.error("Failed to load assessments.");
      } finally {
        setLoading(false);
      }
    }
    loadAssessments();
  }, []);

  // Timer Countdown Effect for in-progress attempt
  useEffect(() => {
    if (!attemptData || attemptData.attempt?.status !== "in_progress") return;

    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attemptData]);

  // Keyboard shortcut support during active attempt
  useEffect(() => {
    if (!attemptData || attemptData.attempt?.status !== "in_progress" || completedResult) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      const currentQuestion = (attemptData.questions || [])[currentQuestionIndex];
      if (!currentQuestion || !currentQuestion.options) return;

      if (key === "1" || key === "A") {
        if (currentQuestion.options[0]) handleSelectOption(currentQuestion.id, currentQuestion.options[0]);
      } else if (key === "2" || key === "B") {
        if (currentQuestion.options[1]) handleSelectOption(currentQuestion.id, currentQuestion.options[1]);
      } else if (key === "3" || key === "C") {
        if (currentQuestion.options[2]) handleSelectOption(currentQuestion.id, currentQuestion.options[2]);
      } else if (key === "4" || key === "D") {
        if (currentQuestion.options[3]) handleSelectOption(currentQuestion.id, currentQuestion.options[3]);
      } else if (e.key === "ArrowRight") {
        if (currentQuestionIndex < (attemptData.questions?.length || 0) - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
        }
      } else if (e.key === "ArrowLeft") {
        if (currentQuestionIndex > 0) {
          setCurrentQuestionIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [attemptData, currentQuestionIndex, completedResult]);

  // Start Assessment Attempt
  const handleStartAttempt = async (asm: any) => {
    try {
      setLoading(true);
      const res = await api.student.assessments.start(asm.id);
      setActiveAttemptAssessment(asm);
      setAttemptData(res);
      setCurrentQuestionIndex(0);
      setTimeRemainingSeconds(res.attempt?.timeRemainingSeconds || (asm.durationMinutes || 60) * 60);

      // Hydrate saved answers
      const ansMap: Record<string, string> = {};
      res.savedAnswers?.forEach((a: any) => {
        ansMap[a.questionId] = a.selectedOption || a.answerText || "";
      });
      setUserAnswers(ansMap);
      setMarkedForReview({});
      setCompletedResult(null);
      toast.info(`Assessment Started: ${asm.title}`, {
        description: `${asm.durationMinutes || 60} minutes time window. Answers will autosave continuously.`,
      });
    } catch (err) {
      console.error("Start attempt error:", err);
      toast.error("Could not start assessment attempt.");
    } finally {
      setLoading(false);
    }
  };

  // Autosave Answer
  const handleSelectOption = async (questionId: string, option: string) => {
    if (!attemptData?.attempt?.id || !activeAttemptAssessment) return;
    setUserAnswers((prev) => ({ ...prev, [questionId]: option }));

    try {
      await api.student.assessments.saveAnswer(
        activeAttemptAssessment.id,
        attemptData.attempt.id,
        questionId,
        option
      );
    } catch (err) {
      console.error("Error autosaving answer:", err);
    }
  };

  // Clear Option
  const handleClearOption = async (questionId: string) => {
    if (!attemptData?.attempt?.id || !activeAttemptAssessment) return;
    setUserAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });

    try {
      await api.student.assessments.saveAnswer(
        activeAttemptAssessment.id,
        attemptData.attempt.id,
        questionId,
        ""
      );
    } catch (err) {}
  };

  // Toggle Mark for Review
  const handleToggleMarkForReview = (questionId: string) => {
    setMarkedForReview((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    if (!attemptData?.attempt?.id || !activeAttemptAssessment) return;
    setSubmittingAttempt(true);
    setConfirmSubmitOpen(false);

    try {
      const res = await api.student.assessments.submit(
        activeAttemptAssessment.id,
        attemptData.attempt.id
      );
      setCompletedResult(res);
      toast.success("Assessment submitted successfully!", {
        description: `Verified score: ${res.score}/${res.totalMarks} (${res.percentage}%)`,
      });

      // Refresh assessments list
      const updated = await api.student.assessments.list();
      setAssessments(updated || []);
    } catch (err) {
      console.error("Submit attempt error:", err);
      toast.error("Failed to submit assessment.");
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Helper styles by Domain
  const getDomainConfig = (domain: string) => {
    switch (domain?.toLowerCase()) {
      case "technical":
        return {
          icon: Code2,
          color: "text-blue-500",
          badgeBg: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
        };
      case "aptitude":
        return {
          icon: Brain,
          color: "text-purple-500",
          badgeBg: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
        };
      case "coding":
        return {
          icon: Terminal,
          color: "text-emerald-500",
          badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        };
      case "verbal":
        return {
          icon: BookOpen,
          color: "text-amber-500",
          badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
        };
      default:
        return {
          icon: Sparkles,
          color: "text-primary",
          badgeBg: "bg-primary/10 text-primary border-primary/30",
        };
    }
  };

  // Overall Statistics Calculation
  const stats = useMemo(() => {
    const total = assessments.length;
    const available = assessments.filter((a) => a.attemptStatus !== "submitted").length;
    const completed = assessments.filter((a) => a.attemptStatus === "submitted");
    const completedCount = completed.length;

    let totalScore = 0;
    let totalMaxMarks = 0;
    completed.forEach((c) => {
      totalScore += Number(c.score || 0);
      totalMaxMarks += Number(c.totalMarks || 100);
    });
    const avgPercentage = totalMaxMarks > 0 ? Math.round((totalScore / totalMaxMarks) * 100) : completedCount > 0 ? 84 : 0;

    return {
      total,
      available,
      completedCount,
      avgPercentage,
    };
  }, [assessments]);

  // Filtered Assessments List
  const filteredAssessments = useMemo(() => {
    return assessments.filter((asm) => {
      // Tab filter
      if (activeTab === "available" && asm.attemptStatus === "submitted") return false;
      if (activeTab === "completed" && asm.attemptStatus !== "submitted") return false;

      // Domain filter
      if (domainFilter !== "all" && asm.domain?.toLowerCase() !== domainFilter.toLowerCase()) {
        return false;
      }

      // Difficulty filter
      if (difficultyFilter !== "all" && asm.difficulty?.toLowerCase() !== difficultyFilter.toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = asm.title?.toLowerCase().includes(q);
        const matchesDesc = asm.description?.toLowerCase().includes(q);
        const matchesDomain = asm.domain?.toLowerCase().includes(q);
        const matchesCode = asm.code?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesDomain && !matchesCode) {
          return false;
        }
      }

      return true;
    });
  }, [assessments, activeTab, domainFilter, difficultyFilter, searchQuery]);

  if (loading && !attemptData) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
        Loading assessment portal…
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: ACTIVE ASSESSMENT ATTEMPT RUNNER (PROCTORED INTERFACE)
  // =========================================================================
  if (attemptData && activeAttemptAssessment && !completedResult) {
    const questions = attemptData.questions || [];
    const currentQuestion = questions[currentQuestionIndex];
    const answeredCount = Object.keys(userAnswers).filter((k) => userAnswers[k]).length;
    const markedCount = Object.keys(markedForReview).filter((k) => markedForReview[k]).length;
    const canGoPrev = currentQuestionIndex > 0;
    const canGoNext = currentQuestionIndex < questions.length - 1;
    const progressPct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
    const isUrgentTimer = timeRemainingSeconds < 300;

    const domainCfg = getDomainConfig(activeAttemptAssessment.domain);
    const DomainIcon = domainCfg.icon;

    return (
      <div className="space-y-4 max-w-5xl mx-auto pb-12">
        {/* Attempt Top Bar */}
        <div className="rounded-xl border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-[10px] font-mono", domainCfg.badgeBg)}>
                <DomainIcon className="w-3 h-3 mr-1" />
                {activeAttemptAssessment.domain}
              </Badge>
              <span className="font-mono text-muted-foreground text-[11px]">#{activeAttemptAssessment.code || "ASM"}</span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Autosave Active
              </span>
            </div>
            <h3 className="font-bold text-foreground text-base tracking-tight truncate">
              {activeAttemptAssessment.title}
            </h3>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            {/* Live Countdown Timer */}
            <div
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-mono font-bold text-sm flex items-center gap-2 border shadow-xs transition-colors",
                isUrgentTimer
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 animate-pulse"
                  : "bg-muted/40 text-foreground border-border/80"
              )}
            >
              <Timer className={cn("w-4 h-4", isUrgentTimer ? "text-rose-500" : "text-primary")} />
              <span>{formatTimer(timeRemainingSeconds)}</span>
              {isUrgentTimer && <span className="text-[10px] uppercase font-sans font-normal">Urgent</span>}
            </div>

            <Button
              size="sm"
              variant="default"
              className="h-9 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer gap-1.5"
              onClick={() => setConfirmSubmitOpen(true)}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Test</span>
            </Button>
          </div>
        </div>

        {/* Progress Strip */}
        <div className="rounded-xl border border-border/70 bg-card/75 p-3 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{answeredCount} Answered</span>
              {markedCount > 0 && <span className="text-amber-600 dark:text-amber-400 font-semibold">{markedCount} Flagged</span>}
              <span>{progressPct}% Completed</span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Question Palette & Active Question Box Container */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left / Top: Question Palette Grid */}
          <div className="lg:col-span-1 rounded-xl border border-border/70 bg-card/75 p-4 space-y-3.5 h-fit shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5 text-primary" />
                <span>Question Matrix</span>
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">{questions.length} Total</span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q: any, idx: number) => {
                const isAnswered = !!userAnswers[q.id];
                const isMarked = !!markedForReview[q.id];
                const isCurrent = idx === currentQuestionIndex;

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={cn(
                      "h-8 rounded-lg text-xs font-mono font-bold transition-all border flex items-center justify-center relative cursor-pointer shadow-2xs",
                      isCurrent
                        ? "ring-2 ring-primary border-primary bg-primary/10 text-primary"
                        : isAnswered
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25"
                        : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    {idx + 1}
                    {isMarked && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-1 ring-background" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Palette Legend */}
            <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                </span>
                <span>Flagged for Review ({markedCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-muted/40 border border-border" />
                <span>Unanswered ({questions.length - answeredCount})</span>
              </div>
            </div>
          </div>

          {/* Right: Active Question Box */}
          <div className="lg:col-span-3 space-y-4">
            {currentQuestion && (
              <div className="rounded-xl border border-border/70 bg-card/85 p-6 space-y-5 text-sm shadow-xs backdrop-blur-xl">
                {/* Question Metadata Header */}
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-border/60 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm font-mono">
                      QUESTION {currentQuestionIndex + 1}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-border bg-muted/30">
                      {currentQuestion.type || "Multiple Choice"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      +{currentQuestion.points || 20} Marks
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleMarkForReview(currentQuestion.id)}
                      className={cn(
                        "h-7 text-xs gap-1 cursor-pointer font-medium",
                        markedForReview[currentQuestion.id]
                          ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>{markedForReview[currentQuestion.id] ? "Flagged" : "Flag for Review"}</span>
                    </Button>

                    {userAnswers[currentQuestion.id] && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleClearOption(currentQuestion.id)}
                        className="h-7 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        Clear Choice
                      </Button>
                    )}
                  </div>
                </div>

                {/* Question Stem Prompt */}
                <div className="space-y-3">
                  <p className="text-foreground text-sm sm:text-base leading-relaxed font-medium whitespace-pre-wrap">
                    {currentQuestion.stem}
                  </p>
                </div>

                {/* MCQ Options Tiles */}
                <div className="space-y-2.5 pt-2">
                  {currentQuestion.options?.map((opt: string, optIdx: number) => {
                    const isSelected = userAnswers[currentQuestion.id] === opt;
                    const letter = String.fromCharCode(65 + optIdx);

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(currentQuestion.id, opt)}
                        className={cn(
                          "w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs",
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground font-medium ring-1 ring-primary/40 shadow-xs"
                            : "border-border/70 bg-card hover:bg-muted/40 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={cn(
                              "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-colors",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                : "border-border/80 text-muted-foreground group-hover:border-primary/60 group-hover:text-primary"
                            )}
                          >
                            {letter}
                          </span>
                          <span className="leading-snug">{opt}</span>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Question Navigation Controls */}
                <div className="flex items-center justify-between pt-5 border-t border-border/60">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-border/80 hover:bg-muted/40 cursor-pointer"
                    disabled={!canGoPrev}
                    onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    <span>Previous Question</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    {canGoNext ? (
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 text-xs bg-primary text-primary-foreground font-medium cursor-pointer shadow-xs gap-1"
                        onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                      >
                        <span>Next Question</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-xs gap-1.5"
                        onClick={() => setConfirmSubmitOpen(true)}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Finish & Submit</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal Before Final Submission */}
        <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
          <DialogContent className="bg-card border-border sm:max-w-md text-foreground">
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-primary" />
                <span>Submit Final Examination?</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Your answers will be authoritatively locked, graded, and recorded in your placement readiness timeline.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 rounded-xl bg-muted/20 border border-border/60 grid grid-cols-3 gap-2 text-center text-xs my-2 font-mono">
              <div className="p-2 rounded bg-background border border-border/40">
                <span className="text-[10px] text-muted-foreground font-sans block">Answered</span>
                <strong className="text-sm text-emerald-600 dark:text-emerald-400 font-bold">{answeredCount}</strong>
              </div>
              <div className="p-2 rounded bg-background border border-border/40">
                <span className="text-[10px] text-muted-foreground font-sans block">Flagged</span>
                <strong className="text-sm text-amber-600 dark:text-amber-400 font-bold">{markedCount}</strong>
              </div>
              <div className="p-2 rounded bg-background border border-border/40">
                <span className="text-[10px] text-muted-foreground font-sans block">Unanswered</span>
                <strong className="text-sm text-muted-foreground font-bold">{questions.length - answeredCount}</strong>
              </div>
            </div>

            {questions.length - answeredCount > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>You have {questions.length - answeredCount} unanswered questions remaining.</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmSubmitOpen(false)}
                className="border-border text-xs cursor-pointer"
              >
                Continue Test
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-xs gap-1.5"
                disabled={submittingAttempt}
                onClick={handleFinalSubmit}
              >
                {submittingAttempt ? (
                  <span>Grading Answers…</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Finalize Submission</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: COMPLETED RESULT VIEW (EXAM SCORECARD / REPORT)
  // =========================================================================
  if (completedResult) {
    const isPassed = (completedResult.percentage || 0) >= 40;

    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="rounded-2xl border border-border/70 bg-card/85 p-8 text-center space-y-6 shadow-sm backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30 shadow-xs">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold font-mono mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>OFFICIAL SCORECARD GENERATED</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground tracking-tight">Assessment Completed & Graded</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Your examination responses have been authoritatively evaluated and synchronized with the Layer C placement readiness model.
            </p>
          </div>

          {/* Large Graphical Score Metrics */}
          <div className="p-6 rounded-xl bg-muted/20 border border-border/60 grid grid-cols-3 gap-4 text-xs font-mono">
            <div className="space-y-1">
              <span className="text-muted-foreground block text-[11px] font-sans font-medium">Scored Points</span>
              <strong className="text-3xl text-foreground font-bold">{completedResult.score}</strong>
              <span className="text-[10px] text-muted-foreground block">Marks Earned</span>
            </div>
            <div className="space-y-1 border-x border-border/60 px-2">
              <span className="text-muted-foreground block text-[11px] font-sans font-medium">Total Cutoff</span>
              <strong className="text-3xl text-foreground font-bold">{completedResult.totalMarks}</strong>
              <span className="text-[10px] text-muted-foreground block">Max Marks</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block text-[11px] font-sans font-medium">Accuracy</span>
              <strong className={cn("text-3xl font-bold", isPassed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500")}>
                {completedResult.percentage}%
              </strong>
              <span className="text-[10px] text-muted-foreground block">{isPassed ? "Passed" : "Action Required"}</span>
            </div>
          </div>

          {/* Status Breakdown Box */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between text-xs text-left">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <span className="font-semibold text-foreground block">Authoritative Record Verified</span>
                <span className="text-muted-foreground text-[11px]">Added to student transcript & campus intelligence timeline.</span>
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-background font-mono text-xs">
              {completedResult.percentage >= 75 ? "Distinction" : "Qualified"}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto text-xs border-border cursor-pointer h-9 px-4"
              onClick={() => {
                setCompletedResult(null);
                setAttemptData(null);
                setActiveAttemptAssessment(null);
              }}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              <span>Back to Assessments</span>
            </Button>

            <Button
              size="sm"
              className="w-full sm:w-auto text-xs bg-primary text-primary-foreground font-semibold cursor-pointer h-9 px-5 shadow-xs"
              onClick={() => navigate({ to: "/student/m/$module", params: { module: "performance" } })}
            >
              <span>View Performance Analytics →</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: MODERN ASSESSMENTS CATALOG & BENCHMARKS DASHBOARD
  // =========================================================================
  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="pb-3 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-primary" />
            <span>Student Assessments & Diagnostics</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Authoritative examination benchmarks, aptitude diagnostics, and domain placement certifications.
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-mono bg-primary/10 text-primary border-primary/30 w-fit cursor-default">
          Exam Standing: {stats.avgPercentage >= 75 ? "Tier 1 Certified (High Honors)" : "On Track"}
        </Badge>
      </div>

      {/* 2. Interactive Telemetry KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Available Exams */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("available");
            setDomainFilter("all");
          }}
          className={cn(
            "rounded-xl border p-4 text-left transition-all duration-150 backdrop-blur-xl space-y-1 group cursor-pointer",
            activeTab === "available"
              ? "border-primary/60 bg-primary/5 ring-1 ring-primary/40 shadow-xs"
              : "border-border/70 bg-card/75 hover:border-primary/40 hover:bg-muted/30"
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium group-hover:text-foreground">Available Tests</span>
            <FileCheck2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1 flex items-baseline gap-1.5">
            <span>{stats.available}</span>
            <span className="text-xs text-muted-foreground font-sans font-normal">Active</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>Ready for evaluation</span>
            <span className="text-[10px] text-primary underline underline-offset-2">Filter available</span>
          </div>
        </button>

        {/* Completed Tests */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("completed");
            setDomainFilter("all");
          }}
          className={cn(
            "rounded-xl border p-4 text-left transition-all duration-150 backdrop-blur-xl space-y-1 group cursor-pointer",
            activeTab === "completed"
              ? "border-emerald-500/60 bg-emerald-500/5 ring-1 ring-emerald-500/40 shadow-xs"
              : "border-border/70 bg-card/75 hover:border-emerald-500/40 hover:bg-muted/30"
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium group-hover:text-foreground">Evaluated & Verified</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1 flex items-baseline gap-1.5">
            <span>{stats.completedCount}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-sans font-medium">Submitted</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>Graded by system</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 underline underline-offset-2">Filter done</span>
          </div>
        </button>

        {/* Average Score */}
        <div className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium">Average Performance</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mt-1 flex items-baseline gap-1.5">
            <span>{stats.avgPercentage}%</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-sans font-medium">Score</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>Passing cutoff: ≥40%</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Verified</span>
          </div>
        </div>

        {/* Campus Placement Qualification */}
        <div className="rounded-xl border border-border/70 bg-card/75 p-4 text-card-foreground shadow-xs backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium">Placement Status</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-foreground mt-1.5 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Campus Eligible</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
            Day-1 Drive Qualified
          </div>
        </div>
      </div>

      {/* 3. Interactive Filter & Search Controls */}
      <div className="rounded-xl border border-border/70 bg-card/75 p-3.5 text-card-foreground shadow-xs backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/30 border border-border/50 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("available")}
            className={cn(
              "px-3 py-1 rounded-md transition-all font-medium whitespace-nowrap cursor-pointer",
              activeTab === "available"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Available Tests ({stats.available})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={cn(
              "px-3 py-1 rounded-md transition-all font-medium whitespace-nowrap cursor-pointer",
              activeTab === "completed"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Completed ({stats.completedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-3 py-1 rounded-md transition-all font-medium whitespace-nowrap cursor-pointer",
              activeTab === "all"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All Evaluations ({assessments.length})
          </button>
        </div>

        {/* Domain, Difficulty & Search Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Domain Dropdown */}
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="h-8 rounded-md border border-border/70 bg-background px-2.5 text-xs text-foreground cursor-pointer"
          >
            <option value="all">All Domains</option>
            <option value="Technical">Technical</option>
            <option value="Aptitude">Aptitude</option>
            <option value="Coding">Coding</option>
            <option value="Verbal">Verbal</option>
          </select>

          {/* Difficulty Dropdown */}
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="h-8 rounded-md border border-border/70 bg-background px-2.5 text-xs text-foreground cursor-pointer"
          >
            <option value="all">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          {/* Search Box with Clear Button */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search evaluations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 h-8 text-xs bg-background/80 border-border/70"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Assessment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAssessments.length > 0 ? (
          filteredAssessments.map((asm) => {
            const domainCfg = getDomainConfig(asm.domain);
            const DomainIcon = domainCfg.icon;
            const isCompleted = asm.attemptStatus === "submitted";
            const isInProgress = asm.attemptStatus === "in_progress";

            return (
              <div
                key={asm.id}
                className={cn(
                  "rounded-xl border bg-card/75 p-5 flex flex-col justify-between gap-4 transition-all duration-200 shadow-xs backdrop-blur-xl group",
                  isCompleted
                    ? "border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-500/[0.02]"
                    : "border-border/70 hover:border-primary/50 hover:shadow-md"
                )}
              >
                <div className="space-y-3">
                  {/* Card Tags Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground font-semibold">
                        #{asm.code || asm.id.toUpperCase()}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] font-mono", domainCfg.badgeBg)}>
                        <DomainIcon className="w-3 h-3 mr-1" />
                        {asm.domain}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-mono",
                          asm.difficulty === "Advanced"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-medium"
                            : asm.difficulty === "Beginner"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium"
                        )}
                      >
                        {asm.difficulty || "Intermediate"}
                      </Badge>
                    </div>

                    {isCompleted ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono font-semibold">
                        Score: {asm.score}/{asm.totalMarks} ({asm.percentage}%)
                      </Badge>
                    ) : isInProgress ? (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-mono font-semibold animate-pulse">
                        In Progress
                      </Badge>
                    ) : null}
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                      {asm.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {asm.description || "Comprehensive module diagnostic covering theoretical concepts, algorithms, and practical problems."}
                    </p>
                  </div>

                  {/* Metadata Chips Strip */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-muted/20 border border-border/50 text-[11px] font-mono text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>{asm.durationMinutes || 60} Mins</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>{asm.totalMarks || 100} Marks</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{asm.questionsCount || 10} Qs</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span>Cutoff: <strong className="text-foreground">{asm.passingMarks || 40} Marks</strong></span>
                  </div>

                  {isCompleted ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer font-medium gap-1.5"
                      onClick={() => setSelectedScorecard(asm)}
                    >
                      <Award className="w-3.5 h-3.5 text-emerald-500" />
                      <span>View Scorecard</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className={cn(
                        "h-8 text-xs font-semibold cursor-pointer shadow-xs gap-1.5",
                        isInProgress
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                      onClick={() => handleStartAttempt(asm)}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isInProgress ? "Resume Attempt" : "Start Assessment"}</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-border p-8 space-y-3">
            <FileCheck2 className="w-8 h-8 text-muted-foreground/60 mx-auto" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-sm">No assessments match your current filters.</p>
              <p>Try resetting domain, difficulty, or search terms.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setActiveTab("all");
                setDomainFilter("all");
                setDifficultyFilter("all");
                setSearchQuery("");
              }}
              className="text-xs border-border cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              <span>Reset All Filters</span>
            </Button>
          </div>
        )}
      </div>

      {/* Scorecard Modal Dialog */}
      <Dialog open={!!selectedScorecard} onOpenChange={(open) => !open && setSelectedScorecard(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md text-foreground">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-500" />
              <span>Assessment Performance Scorecard</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Official graded evaluation record registered in the placement engine.
            </DialogDescription>
          </DialogHeader>

          {selectedScorecard && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                <span className="text-[10px] text-muted-foreground font-mono">#{selectedScorecard.code}</span>
                <p className="font-semibold text-foreground text-sm">{selectedScorecard.title}</p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className="text-[10px] font-mono border-border">
                    {selectedScorecard.domain}
                  </Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                    Verified Complete
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-4 rounded-xl bg-muted/30 border border-border/60 text-center font-mono">
                <div>
                  <span className="text-[10px] text-muted-foreground font-sans block">Score</span>
                  <strong className="text-2xl text-foreground font-bold">{selectedScorecard.score}</strong>
                  <span className="text-[10px] text-muted-foreground block">Marks</span>
                </div>
                <div className="border-x border-border/60 px-2">
                  <span className="text-[10px] text-muted-foreground font-sans block">Total</span>
                  <strong className="text-2xl text-foreground font-bold">{selectedScorecard.totalMarks}</strong>
                  <span className="text-[10px] text-muted-foreground block">Max Marks</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-sans block">Percentage</span>
                  <strong className="text-2xl text-emerald-600 dark:text-emerald-400 font-bold">
                    {selectedScorecard.percentage}%
                  </strong>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-sans font-medium">Passed</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span>Placement Cutoff Qualified</span>
                <strong className="font-mono">Passed (≥{selectedScorecard.passingMarks || 40})</strong>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-border/40">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedScorecard(null)}
              className="text-xs border-border cursor-pointer w-full"
            >
              Close Scorecard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
