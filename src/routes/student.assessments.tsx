import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      { title: "Student Assessments — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentAssessmentsPage,
});

function StudentAssessmentsPage() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("available");

  // Active Assessment Attempt State
  const [activeAttemptAssessment, setActiveAttemptAssessment] = useState<any | null>(null);
  const [attemptData, setAttemptData] = useState<any | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(3600);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [completedResult, setCompletedResult] = useState<any | null>(null);

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

  // Start Assessment Attempt
  const handleStartAttempt = async (asm: any) => {
    try {
      setLoading(true);
      const res = await api.student.assessments.start(asm.id);
      setActiveAttemptAssessment(asm);
      setAttemptData(res);
      setCurrentQuestionIndex(0);
      setTimeRemainingSeconds(res.attempt?.timeRemainingSeconds || 3600);

      // Hydrate saved answers
      const ansMap: Record<string, string> = {};
      res.savedAnswers?.forEach((a: any) => {
        ansMap[a.questionId] = a.selectedOption || a.answerText || "";
      });
      setUserAnswers(ansMap);
      setCompletedResult(null);
    } catch (err) {
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
      toast.success("Assessment submitted successfully!");

      // Refresh assessments list
      const updated = await api.student.assessments.list();
      setAssessments(updated || []);
    } catch (err) {
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

  if (loading && !attemptData) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
        Loading assessments…
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: ACTIVE ASSESSMENT ATTEMPT RUNNER
  // =========================================================================
  if (attemptData && activeAttemptAssessment && !completedResult) {
    const questions = attemptData.questions || [];
    const currentQuestion = questions[currentQuestionIndex];
    const answeredCount = Object.keys(userAnswers).filter((k) => userAnswers[k]).length;
    const canGoPrev = currentQuestionIndex > 0;
    const canGoNext = currentQuestionIndex < questions.length - 1;

    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Attempt Top Bar */}
        <div className="rounded-md border border-border bg-card p-3 flex items-center justify-between gap-3 text-xs">
          <div>
            <h3 className="font-bold text-foreground text-sm truncate">
              {activeAttemptAssessment.title}
            </h3>
            <span className="text-muted-foreground text-[11px]">
              Question {currentQuestionIndex + 1} of {questions.length} • {answeredCount} answered
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Countdown Timer */}
            <div
              className={cn(
                "px-3 py-1 rounded font-mono font-bold text-xs flex items-center gap-1.5 border",
                timeRemainingSeconds < 300
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse"
                  : "bg-muted/40 text-foreground border-border"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(timeRemainingSeconds)}</span>
            </div>

            <Button
              size="sm"
              variant="default"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={() => setConfirmSubmitOpen(true)}
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              <span>Submit Test</span>
            </Button>
          </div>
        </div>

        {/* Question Navigation Palette */}
        <div className="rounded-md border border-border bg-card p-3">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-2">
            Question Palette
          </span>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q: any, idx: number) => {
              const isAnswered = !!userAnswers[q.id];
              const isCurrent = idx === currentQuestionIndex;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={cn(
                    "w-7 h-7 rounded text-xs font-mono font-medium transition-colors border flex items-center justify-center",
                    isCurrent
                      ? "ring-2 ring-primary border-primary font-bold"
                      : isAnswered
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Question Box */}
        {currentQuestion && (
          <div className="rounded-md border border-border bg-card p-6 space-y-5 text-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <span className="font-semibold text-foreground">
                Question {currentQuestionIndex + 1}
              </span>
              <Badge variant="outline" className="text-xs border-border">
                {currentQuestion.points || 20} Marks
              </Badge>
            </div>

            <p className="text-foreground leading-relaxed whitespace-pre-wrap font-medium">
              {currentQuestion.stem}
            </p>

            {/* MCQ Options */}
            <div className="space-y-2 pt-2">
              {currentQuestion.options?.map((opt: string, optIdx: number) => {
                const isSelected = userAnswers[currentQuestion.id] === opt;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, opt)}
                    className={cn(
                      "w-full text-left p-3 rounded-md border text-xs sm:text-sm transition-colors flex items-center gap-3",
                      isSelected
                        ? "bg-primary/10 border-primary text-foreground font-medium"
                        : "border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center text-xs font-mono shrink-0",
                        isSelected ? "border-primary bg-primary text-primary-foreground font-bold" : "border-border"
                      )}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Question Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-border"
                disabled={!canGoPrev}
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                <span>Previous Question</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-border"
                disabled={!canGoNext}
                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
              >
                <span>Next Question</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Confirmation Modal Before Final Submission */}
        <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Submit Assessment?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                You have answered {answeredCount} of {questions.length} questions. Once submitted, your answers cannot be modified.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmSubmitOpen(false)}
                className="border-border text-xs"
              >
                Continue Test
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                disabled={submittingAttempt}
                onClick={handleFinalSubmit}
              >
                Confirm & Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: COMPLETED RESULT VIEW
  // =========================================================================
  if (completedResult) {
    return (
      <div className="max-w-2xl mx-auto rounded-md border border-border bg-card p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <Award className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-foreground">Assessment Completed</h3>
        <p className="text-xs text-muted-foreground">
          Your answers have been graded and recorded authoritatively in the Intelligence Engine.
        </p>

        <div className="p-4 rounded bg-muted/30 border border-border/60 grid grid-cols-3 gap-2 text-xs font-mono">
          <div>
            <span className="text-muted-foreground block text-[11px] font-sans">Score</span>
            <strong className="text-lg text-foreground">{completedResult.score}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px] font-sans">Total Marks</span>
            <strong className="text-lg text-foreground">{completedResult.totalMarks}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px] font-sans">Percentage</span>
            <strong className="text-lg text-emerald-600 dark:text-emerald-400">
              {completedResult.percentage}%
            </strong>
          </div>
        </div>

        <Button
          size="sm"
          className="text-xs"
          onClick={() => {
            setCompletedResult(null);
            setAttemptData(null);
            setActiveAttemptAssessment(null);
          }}
        >
          Back to Assessments
        </Button>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: ASSESSMENTS LIST VIEW
  // =========================================================================
  const availableList = assessments.filter((a) => a.attemptStatus !== "submitted");
  const completedList = assessments.filter((a) => a.attemptStatus === "submitted");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
        <div>
          <h2 className="text-lg font-bold text-foreground">Student Assessments</h2>
          <p className="text-xs text-muted-foreground">
            Authoritative examination benchmarks, aptitude diagnostics, and domain certifications.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-8 bg-muted/40 p-0.5 border border-border/60">
          <TabsTrigger value="available" className="text-xs">
            Available ({availableList.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Completed ({completedList.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-4 space-y-3">
          {availableList.length ? (
            availableList.map((asm) => (
              <div
                key={asm.id}
                className="rounded-md border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{asm.title}</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-border">
                      {asm.domain}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs line-clamp-1">{asm.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Duration: {asm.durationMinutes} mins</span>
                    <span>•</span>
                    <span>Total Marks: {asm.totalMarks}</span>
                    <span>•</span>
                    <span>Passing Cutoff: {asm.passingMarks}</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={() => handleStartAttempt(asm)}
                >
                  {asm.attemptStatus === "in_progress" ? "Resume Assessment" : "Start Assessment"}
                </Button>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground rounded-md border border-dashed border-border p-6">
              No pending assessments available at this time.
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completedList.length ? (
            completedList.map((asm) => (
              <div
                key={asm.id}
                className="rounded-md border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{asm.title}</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-border">
                      {asm.domain}
                    </Badge>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                      Submitted
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Score: <strong className="text-foreground">{asm.score}/{asm.totalMarks}</strong></span>
                    <span>•</span>
                    <span>Percentage: <strong className="text-emerald-600 dark:text-emerald-400">{asm.percentage}%</strong></span>
                  </div>
                </div>

                <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                  Authoritative Record Verified
                </Badge>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground rounded-md border border-dashed border-border p-6">
              No completed assessment records yet.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
