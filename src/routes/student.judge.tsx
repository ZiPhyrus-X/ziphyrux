import { useEffect, useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import { createFileRoute } from "@tanstack/react-router";
import {
  Code2,
  Terminal,
  Play,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Clock,
  Search,
  Check,
  Save,
  FileText,
  BookOpen,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Star,
  Share2,
  HelpCircle,
  Maximize2,
  Minimize2,
  Settings,
  Braces,
  Shuffle,
  Timer,
  Lock,
  ListFilter,
  Sparkles,
  ExternalLink,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student/judge")({
  head: () => ({
    meta: [
      { title: "Code — Let's code flow in your veins | Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentJudgePage,
});

export function formatSourceCode(rawCode: string, lang: string): string {
  if (!rawCode || !rawCode.trim()) return rawCode;

  const normalizedLang = (lang || "").toLowerCase();
  const indentStr = "    "; // 4 spaces indentation
  const lines = rawCode.replace(/\r\n/g, "\n").split("\n");

  if (normalizedLang === "python") {
    let minNonZeroIndent = 0;
    for (const l of lines) {
      const match = l.match(/^([ \t]+)/);
      if (match) {
        const spaces = match[1].replace(/\t/g, "    ").length;
        if (spaces > 0 && (minNonZeroIndent === 0 || spaces < minNonZeroIndent)) {
          minNonZeroIndent = spaces;
        }
      }
    }
    if (minNonZeroIndent === 0) minNonZeroIndent = 4;

    const formatted: string[] = [];
    let prevEndsWithColon = false;
    let prevLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        if (formatted.length > 0 && formatted[formatted.length - 1] !== "") {
          formatted.push("");
        }
        continue;
      }

      const match = lines[i].match(/^([ \t]+)/);
      const spaces = match ? match[1].replace(/\t/g, "    ").length : 0;
      let level = Math.round(spaces / minNonZeroIndent);

      if (prevEndsWithColon && level <= prevLevel) {
        level = prevLevel + 1;
      }

      formatted.push(indentStr.repeat(Math.max(0, level)) + line);
      prevEndsWithColon = line.endsWith(":") || line.endsWith(": #") || /:\s*#/.test(line);
      prevLevel = level;
    }
    return formatted.join("\n") + "\n";
  }

  // C / C++ / Java / JavaScript / TypeScript
  let indentLevel = 0;
  const formatted: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (formatted.length > 0 && formatted[formatted.length - 1] !== "") {
        formatted.push("");
      }
      continue;
    }

    const leadingCloses = (line.match(/^([\}\]\)]+)/) || [""])[0].length;
    if (leadingCloses > 0) {
      indentLevel = Math.max(0, indentLevel - leadingCloses);
    }

    formatted.push(indentStr.repeat(Math.max(0, indentLevel)) + line);

    let opens = 0;
    let closes = 0;
    let inStr = false;
    let strCh = "";

    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (inStr) {
        if (ch === strCh && line[c - 1] !== "\\") inStr = false;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inStr = true;
        strCh = ch;
        continue;
      }
      if (ch === "{" || ch === "[" || ch === "(") opens++;
      if (ch === "}" || ch === "]" || ch === ")") closes++;
    }

    const netChange = opens - (closes - leadingCloses);
    indentLevel = Math.max(0, indentLevel + (netChange > 0 ? netChange : 0));
  }

  return formatted.join("\n") + "\n";
}

export function getStarterCodeForProblem(problem: any, lang: string): string {
  const probCode = (problem?.code || "").toUpperCase();
  const probTitle = (problem?.title || "").toLowerCase();
  const l = (lang || "java").toLowerCase();

  // Problem 1: Two Sum
  if (probCode === "PRB-0001" || probTitle.includes("two sum")) {
    switch (l) {
      case "python":
        return `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Let's code flow in your veins\n        # Write your solution here\n        pass\n`;
      case "javascript":
        return `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    // Let's code flow in your veins\n    // Write your solution here\n    return [];\n};\n`;
      case "cpp":
        return `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Let's code flow in your veins\n        // Write your solution here\n        return {};\n    }\n};\n`;
      case "c":
        return `#include <stdlib.h>\n\n/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\nint* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    // Let's code flow in your veins\n    *returnSize = 0;\n    return NULL;\n}\n`;
      case "java":
      default:
        return `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Let's code flow in your veins\n        // Write your solution here\n        return new int[]{};\n    }\n}\n`;
    }
  }

  // Problem 3: Balanced Brackets
  if (probCode === "PRB-0003" || probTitle.includes("bracket") || probTitle.includes("parenthes")) {
    switch (l) {
      case "python":
        return `class Solution:\n    def isValid(self, s: str) -> bool:\n        # Let's code flow in your veins\n        # Write your solution here\n        return False\n`;
      case "javascript":
        return `/**\n * @param {string} s\n * @return {boolean}\n */\nvar isValid = function(s) {\n    // Let's code flow in your veins\n    // Write your solution here\n    return false;\n};\n`;
      case "cpp":
        return `#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isValid(string s) {\n        // Let's code flow in your veins\n        // Write your solution here\n        return false;\n    }\n};\n`;
      case "c":
        return `#include <stdbool.h>\n\nbool isValid(char* s) {\n    // Let's code flow in your veins\n    return false;\n}\n`;
      case "java":
      default:
        return `class Solution {\n    public boolean isValid(String s) {\n        // Let's code flow in your veins\n        // Write your solution here\n        return false;\n    }\n}\n`;
    }
  }

  // Problem 4: LRU Cache
  if (probCode === "PRB-0004" || probTitle.includes("lru") || probTitle.includes("cache")) {
    switch (l) {
      case "python":
        return `class LRUCache:\n    def __init__(self, capacity: int):\n        # Let's code flow in your veins\n        pass\n\n    def get(self, key: int) -> int:\n        return -1\n\n    def put(self, key: int, value: int) -> None:\n        pass\n`;
      case "javascript":
        return `var LRUCache = function(capacity) {\n    // Let's code flow in your veins\n};\n\nLRUCache.prototype.get = function(key) {\n    return -1;\n};\n\nLRUCache.prototype.put = function(key, value) {\n};\n`;
      case "cpp":
        return `class LRUCache {\npublic:\n    LRUCache(int capacity) {\n        // Let's code flow in your veins\n    }\n\n    int get(int key) {\n        return -1;\n    }\n\n    void put(int key, int value) {\n    }\n};\n`;
      case "c":
        return `typedef struct {\n    // Let's code flow in your veins\n} LRUCache;\n\nLRUCache* lruCacheCreate(int capacity) {\n    return NULL;\n}\n\nint lruCacheGet(LRUCache* obj, int key) {\n    return -1;\n}\n\nvoid lruCachePut(LRUCache* obj, int key, int value) {\n}\n`;
      case "java":
      default:
        return `class LRUCache {\n    public LRUCache(int capacity) {\n        // Let's code flow in your veins\n    }\n\n    public int get(int key) {\n        return -1;\n    }\n\n    public void put(int key, int value) {\n    }\n}\n`;
    }
  }

  // Generic fallback
  switch (l) {
    case "python":
      return `class Solution:\n    def solve(self):\n        # Let's code flow in your veins\n        # Write your solution here\n        pass\n`;
    case "javascript":
      return `var solve = function() {\n    // Let's code flow in your veins\n    // Write your solution here\n};\n`;
    case "cpp":
      return `class Solution {\npublic:\n    void solve() {\n        // Let's code flow in your veins\n        // Write your solution here\n    }\n};\n`;
    case "c":
      return `void solve(void) {\n    // Let's code flow in your veins\n    // Write your solution here\n}\n`;
    case "java":
    default:
      return `class Solution {\n    public void solve() {\n        // Let's code flow in your veins\n        // Write your solution here\n    }\n}\n`;
  }
}

function formatSubmissionTime(dateStr?: string): string {
  if (!dateStr) return "Recently";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "Recently" : format(d, "MMM d, HH:mm");
  } catch {
    return "Recently";
  }
}

function StudentJudgePage() {
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [problemListOpen, setProblemListOpen] = useState(false);

  // Editor State
  const [language, setLanguage] = useState("java");
  const [code, setCode] = useState("");
  const [draftSaved, setDraftSaved] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Execution State
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sampleResult, setSampleResult] = useState<any>(null);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [activeLeftTab, setActiveLeftTab] = useState("description");
  const [activeBottomTab, setActiveBottomTab] = useState<"testcase" | "result">("testcase");
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const [bottomConsoleExpanded, setBottomConsoleExpanded] = useState(true);

  // Collapsible metadata
  const [showTopics, setShowTopics] = useState(false);
  const [showCompanies, setShowCompanies] = useState(false);
  const [showHints, setShowHints] = useState(false);

  // Reaction State
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [starred, setStarred] = useState(false);
  const [likesCount, setLikesCount] = useState(70724);

  // Student Profile Info for GitHub sync pill
  const [targetRepo, setTargetRepo] = useState<string>("ZiphyrusX-Aarav-001");

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Stopwatch effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formattedTimer = useMemo(() => {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [timerSeconds]);

  // Load problem list & profile
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [probRes, profileRes] = await Promise.all([
          api.student.judge.problems(),
          api.student.profile().catch(() => null),
        ]);
        setProblems(probRes || []);
        if (probRes && probRes.length > 0 && !selectedProblemId) {
          setSelectedProblemId(probRes[0].id);
        }
        if (profileRes?.targetGitHubRepo) {
          setTargetRepo(profileRes.targetGitHubRepo);
        }
      } catch (err) {
        console.error("Error loading problem bank:", err);
        toast.error("Failed to load problem bank.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered problem list
  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      const matchSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        p.topic.toLowerCase().includes(search.toLowerCase());
      const matchDiff = difficultyFilter === "all" || p.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
      const matchTopic = topicFilter === "all" || p.topic.toLowerCase() === topicFilter.toLowerCase();
      return matchSearch && matchDiff && matchTopic;
    });
  }, [problems, search, difficultyFilter, topicFilter]);

  // Current problem & position in filtered list
  const currentProblemIndex = useMemo(() => {
    return filteredProblems.findIndex((p) => p.id === selectedProblemId);
  }, [filteredProblems, selectedProblemId]);

  const currentProblem = filteredProblems[currentProblemIndex] || filteredProblems[0] || null;

  // Load problem details, drafts, and submissions when problem changes
  useEffect(() => {
    if (!currentProblem) return;

    async function loadProblemWorkspace() {
      try {
        const [draftRes, subRes] = await Promise.all([
          api.student.judge.getDraft(currentProblem.id).catch(() => null),
          api.student.judge.submissions(currentProblem.id).catch(() => []),
        ]);

        if (draftRes && draftRes.code) {
          setCode(draftRes.code);
          setLanguage(draftRes.language || "java");
        } else {
          setCode(getStarterCodeForProblem(currentProblem, language));
        }

        setSubmissionsList(subRes || []);
        setSampleResult(null);
        setSubmissionResult(null);
        setIsDirty(false);
        setDraftSaved(true);
        setActiveBottomTab("testcase");
        setActiveCaseIndex(0);
      } catch (err) {
        console.error("Error loading problem details:", err);
      }
    }

    loadProblemWorkspace();
  }, [currentProblem?.id]);

  // Handle language switch
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (!isDirty || !code.trim()) {
      setCode(getStarterCodeForProblem(currentProblem, newLang));
    }
  };

  // Previous & Next Problem Navigation
  const canGoPrevious = currentProblemIndex > 0;
  const canGoNext = currentProblemIndex >= 0 && currentProblemIndex < filteredProblems.length - 1;

  const navigateProblem = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= filteredProblems.length) return;
    if (isDirty) {
      const proceed = window.confirm(
        "You have unsaved changes in your solution draft. Do you want to save draft before navigating?"
      );
      if (proceed) {
        saveDraft();
      }
    }
    setSelectedProblemId(filteredProblems[newIndex].id);
  };

  const handlePickRandom = () => {
    if (filteredProblems.length <= 1) return;
    const randomIndex = Math.floor(Math.random() * filteredProblems.length);
    setSelectedProblemId(filteredProblems[randomIndex].id);
    toast.info("Picked a random problem for you!");
  };

  // Draft Save
  const saveDraft = async () => {
    if (!currentProblem) return;
    try {
      await api.student.judge.saveDraft(currentProblem.id, language, code);
      setDraftSaved(true);
      setIsDirty(false);
      toast.success("Draft saved successfully.");
    } catch {
      toast.error("Failed to save draft.");
    }
  };

  // Track cursor position and textarea changes
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
    setIsDirty(true);
    setDraftSaved(false);
    updateCursorPos(e.target);
  };

  const updateCursorPos = (ta: HTMLTextAreaElement) => {
    const textLines = ta.value.substring(0, ta.selectionStart).split("\n");
    setCursorPos({
      line: textLines.length,
      col: textLines[textLines.length - 1].length + 1,
    });
  };

  // Tab key & auto-indent support
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const spaces = "    ";
      const newCode = code.substring(0, start) + spaces + code.substring(end);
      setCode(newCode);
      setIsDirty(true);
      setDraftSaved(false);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + spaces.length;
        updateCursorPos(target);
      }, 0);
    }
  };

  // Synced scroll between line numbers and code
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Reset Code
  const resetCode = () => {
    setCode(getStarterCodeForProblem(currentProblem, language));
    setIsDirty(true);
    setDraftSaved(false);
    toast.info("Reset code to default solution template.");
  };

  // Format Code
  const formatCode = () => {
    try {
      const formatted = formatSourceCode(code, language);
      if (formatted !== code) {
        setCode(formatted);
        setIsDirty(true);
        setDraftSaved(false);
        toast.success("Code formatted successfully.");
      } else {
        toast.info("Code is already well-formatted.");
      }
    } catch (err) {
      console.error("Format error:", err);
      toast.error("Failed to format code.");
    }
  };

  // Run Sample Tests
  const handleRunSample = async () => {
    if (!currentProblem) return;
    setRunning(true);
    setActiveBottomTab("result");
    setSampleResult(null);
    try {
      const res = await api.student.judge.runSample(currentProblem.id, language, code);
      setSampleResult(res);
      if (res.status === "sample_passed") {
        toast.success(`Sample tests passed: ${res.passedSampleCases}/${res.totalSampleCases}`);
      } else {
        toast.error(`Sample tests failed (${res.passedSampleCases}/${res.totalSampleCases} passed)`);
      }
    } catch {
      toast.error("Execution error while running sample tests.");
    } finally {
      setRunning(false);
    }
  };

  // Submit Solution
  const handleSubmit = async () => {
    if (!currentProblem) return;
    setSubmitting(true);
    setActiveBottomTab("result");
    setSubmissionResult(null);
    try {
      const res = await api.student.judge.submit(currentProblem.id, language, code);
      setSubmissionResult(res);

      if (res.status === "accepted") {
        toast.success("Accepted! All test cases passed.", {
          description: `Automatically synced to GitHub repo '${res.githubRepoName || targetRepo}'`,
        });
      } else if (res.status === "wrong_answer") {
        toast.error(`Wrong Answer (${res.testCasesPassed}/${res.totalTestCases} test cases passed)`);
      } else {
        toast.error(`Verdict: ${res.status}`);
      }

      const updatedSubs = await api.student.judge.submissions(currentProblem.id);
      setSubmissionsList(updatedSubs || []);
    } catch {
      toast.error("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Line count for code gutter
  const lineCount = useMemo(() => {
    const lines = (code || "").split("\n").length;
    return Math.max(lines, 24);
  }, [code]);

  // Is problem currently solved?
  const isSolved = useMemo(() => {
    return submissionsList.some((s) => s.status === "accepted");
  }, [submissionsList]);

  if (loading) {
    return (
      <div className="h-[750px] flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground animate-pulse">
        <Code2 className="w-8 h-8 text-primary animate-spin" />
        <span>Loading problem workspace…</span>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden", isFullscreen && "fixed inset-0 z-50 bg-background p-2")}>
      {/* -------------------------------------------------------------------------- */}
      {/* TOP HEADER & NAVIGATION TOOLBAR (LEETCODE MODERN BAR)                      */}
      {/* -------------------------------------------------------------------------- */}
      <div className="shrink-0 rounded-lg border border-border/70 bg-card/75 backdrop-blur-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs shadow-xs">
        {/* Left: Problem List Dropdown & Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Problem List Trigger Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setProblemListOpen(true)}
            className="h-7 text-xs font-medium gap-1.5 px-2.5 text-foreground hover:bg-muted/60 border border-border/60"
          >
            <ListFilter className="w-3.5 h-3.5 text-primary" />
            <span>Problem List</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </Button>

          {/* Prev / Next / Random */}
          <div className="flex items-center gap-0.5 border border-border/60 rounded-md p-0.5 bg-background/50">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              disabled={!canGoPrevious}
              onClick={() => navigateProblem(currentProblemIndex - 1)}
              title="Previous Problem"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              disabled={!canGoNext}
              onClick={() => navigateProblem(currentProblemIndex + 1)}
              title="Next Problem"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={handlePickRandom}
              title="Pick Random Problem"
            >
              <Shuffle className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Center: Branding & Required Tagline */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground text-sm tracking-tight flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-primary" />
            <span>Code</span>
          </span>
          <span className="text-muted-foreground/40 font-mono">•</span>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-mono text-primary font-medium tracking-wide">
            <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>“Let&apos;s code flow in your veins”</span>
          </div>
        </div>

        {/* Right: Actions, GitHub Sync, Timer, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Target GitHub Repository Sync Pill */}
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/40 border border-border/60 text-[11px] text-muted-foreground font-mono">
            <GitBranch className="w-3 h-3 text-emerald-500" />
            <span>Sync:</span>
            <span className="font-semibold text-foreground">{targetRepo}</span>
          </div>

          {/* Stopwatch Timer */}
          <button
            type="button"
            onClick={() => setTimerRunning(!timerRunning)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-muted/30 hover:bg-muted/50 border border-border/50 text-xs font-mono text-muted-foreground"
            title={timerRunning ? "Pause Timer" : "Resume Timer"}
          >
            <Timer className="w-3 h-3 text-primary" />
            <span>{formattedTimer}</span>
          </button>

          {/* Run & Submit Top Execution Buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRunSample}
              disabled={running || submitting}
              className="h-7 text-xs gap-1 border-border/80 bg-background/80 hover:bg-muted/60"
            >
              <Play className="w-3 h-3 text-blue-500 fill-blue-500" />
              <span>{running ? "Running…" : "Run"}</span>
            </Button>

            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={running || submitting}
              className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-xs"
            >
              <Send className="w-3 h-3" />
              <span>{submitting ? "Evaluating…" : "Submit"}</span>
            </Button>
          </div>

          {/* Fullscreen Toggle */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* MAIN 2-COLUMN LEETCODE SPLIT WORKSPACE                                      */}
      {/* -------------------------------------------------------------------------- */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-1.5 overflow-hidden">
        {/* ======================================================================== */}
        {/* LEFT COLUMN: Problem Details / Editorial / Solutions / Submissions       */}
        {/* ======================================================================== */}
        <div className="h-full min-h-0 flex flex-col rounded-lg border border-border/70 bg-card/75 backdrop-blur-xl overflow-hidden shadow-xs">
          {/* Top Tabs Bar */}
          <div className="shrink-0 border-b border-border/60 bg-muted/20 px-2 py-1 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveLeftTab("description")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors",
                  activeLeftTab === "description"
                    ? "bg-background text-primary shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>Description</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLeftTab("editorial")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors",
                  activeLeftTab === "editorial"
                    ? "bg-background text-primary shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Editorial</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLeftTab("solutions")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors",
                  activeLeftTab === "solutions"
                    ? "bg-background text-primary shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Lightbulb className="w-3.5 h-3.5 text-emerald-500" />
                <span>Solutions</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLeftTab("submissions")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors",
                  activeLeftTab === "submissions"
                    ? "bg-background text-primary shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Clock className="w-3.5 h-3.5 text-purple-500" />
                <span>Submissions</span>
                {submissionsList.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-mono">({submissionsList.length})</span>
                )}
              </button>
            </div>
          </div>

          {/* Left Panel Body */}
          <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-foreground/90 leading-relaxed">
            {/* Description Tab Content */}
            {activeLeftTab === "description" && (
              <div className="space-y-4">
                {/* Title & Solved Badge */}
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">
                    {currentProblemIndex >= 0 ? `${currentProblemIndex + 1}. ` : "1. "}
                    {currentProblem?.title || "Two Sum"}
                  </h1>

                  {isSolved && (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Solved</span>
                    </div>
                  )}
                </div>

                {/* Metadata Badges: Easy / Topics / Companies / Hint */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px] font-medium rounded-full px-2.5 py-0.5",
                      currentProblem?.difficulty === "Easy"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                        : currentProblem?.difficulty === "Medium"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                    )}
                  >
                    {currentProblem?.difficulty || "Easy"}
                  </Badge>

                  <button
                    type="button"
                    onClick={() => setShowTopics(!showTopics)}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border/50 text-[11px] transition-colors"
                  >
                    <span>🏷️ Topics</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform", showTopics && "rotate-180")} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCompanies(!showCompanies)}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border/50 text-[11px] transition-colors"
                  >
                    <span>💼 Companies</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform", showCompanies && "rotate-180")} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowHints(!showHints)}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border/50 text-[11px] transition-colors"
                  >
                    <span>💡 Hint</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform", showHints && "rotate-180")} />
                  </button>
                </div>

                {/* Collapsible Topics Card */}
                {showTopics && (
                  <div className="p-2.5 rounded-md bg-muted/20 border border-border/40 flex flex-wrap gap-1.5 animate-in fade-in duration-150">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono mr-1">Tags:</span>
                    <span className="px-2 py-0.5 rounded bg-background border border-border/60 text-[11px] font-mono text-foreground">
                      {currentProblem?.topic || "Arrays & Hashing"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-background border border-border/60 text-[11px] font-mono text-foreground">
                      Hash Table
                    </span>
                    <span className="px-2 py-0.5 rounded bg-background border border-border/60 text-[11px] font-mono text-foreground">
                      Two Pointers
                    </span>
                  </div>
                )}

                {/* Collapsible Companies Card */}
                {showCompanies && (
                  <div className="p-2.5 rounded-md bg-muted/20 border border-border/40 flex flex-wrap gap-1.5 animate-in fade-in duration-150">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono mr-1">Companies:</span>
                    {["Amazon", "Google", "Microsoft", "Apple", "Meta", "Bloomberg"].map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded bg-background border border-border/60 text-[11px] text-foreground font-mono">
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* Collapsible Hints Card */}
                {showHints && (
                  <div className="p-3 rounded-md bg-amber-500/5 border border-amber-500/20 text-muted-foreground space-y-1.5 text-xs animate-in fade-in duration-150">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span>Hint 1:</span>
                    </p>
                    <p>
                      A really brute force way would be to search for all possible pairs of numbers but that would be too slow. Can we use extra memory such as a hash table to store already seen elements in $O(1)$ time?
                    </p>
                  </div>
                )}

                {/* Problem Statement Text */}
                <div className="space-y-3 pt-2">
                  <p>
                    You are given an array of integers{" "}
                    <code className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground font-mono text-[11px]">
                      nums
                    </code>{" "}
                    and an integer{" "}
                    <code className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground font-mono text-[11px]">
                      target
                    </code>
                    , return <em className="text-foreground font-medium">indices</em> of the two numbers such that they add up to{" "}
                    <code className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground font-mono text-[11px]">
                      target
                    </code>
                    .
                  </p>
                  <p>
                    You may assume that each input would have{" "}
                    <strong className="text-foreground font-semibold">exactly one solution</strong>, and you may not use the{" "}
                    <em className="text-foreground">same element twice</em>.
                  </p>
                  <p>You can return the answer in any order.</p>
                </div>

                {/* Examples Blocks */}
                <div className="space-y-3 pt-2">
                  {/* Example 1 */}
                  <div className="space-y-1.5">
                    <span className="font-semibold text-foreground text-xs block">Example 1:</span>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 font-mono text-[11px] space-y-1">
                      <p>
                        <span className="text-muted-foreground font-medium">Input:</span> nums = [2,7,11,15], target = 9
                      </p>
                      <p>
                        <span className="text-muted-foreground font-medium">Output:</span> [0,1]
                      </p>
                      <p>
                        <span className="text-muted-foreground font-medium">Explanation:</span> Because nums[0] + nums[1] == 9, we return [0, 1].
                      </p>
                    </div>
                  </div>

                  {/* Example 2 */}
                  <div className="space-y-1.5">
                    <span className="font-semibold text-foreground text-xs block">Example 2:</span>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 font-mono text-[11px] space-y-1">
                      <p>
                        <span className="text-muted-foreground font-medium">Input:</span> nums = [3,2,4], target = 6
                      </p>
                      <p>
                        <span className="text-muted-foreground font-medium">Output:</span> [1,2]
                      </p>
                    </div>
                  </div>

                  {/* Example 3 */}
                  <div className="space-y-1.5">
                    <span className="font-semibold text-foreground text-xs block">Example 3:</span>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 font-mono text-[11px] space-y-1">
                      <p>
                        <span className="text-muted-foreground font-medium">Input:</span> nums = [3,3], target = 6
                      </p>
                      <p>
                        <span className="text-muted-foreground font-medium">Output:</span> [0,1]
                      </p>
                    </div>
                  </div>
                </div>

                {/* Constraints */}
                <div className="space-y-2 pt-3 border-t border-border/40">
                  <span className="font-semibold text-foreground text-xs block">Constraints:</span>
                  <ul className="space-y-1.5 font-mono text-[11px] text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="text-foreground">•</span>
                      <code className="bg-muted/40 px-1 rounded text-foreground">2 &le; nums.length &le; 10&sup4;</code>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-foreground">•</span>
                      <code className="bg-muted/40 px-1 rounded text-foreground">-10&sup9; &le; nums[i] &le; 10&sup9;</code>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-foreground">•</span>
                      <code className="bg-muted/40 px-1 rounded text-foreground">-10&sup9; &le; target &le; 10&sup9;</code>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-foreground">•</span>
                      <span>Only one valid answer exists.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Editorial Tab Content */}
            {activeLeftTab === "editorial" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <h3 className="text-base font-bold text-foreground">Algorithmic Solution Breakdown</h3>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-2">
                  <h4 className="font-semibold text-foreground">Approach 1: Hash Map (Single Pass)</h4>
                  <p className="text-muted-foreground">
                    While we iterate and insert elements into the hash map, we also look back to check if current element&apos;s complement already exists in the table. If it exists, we have found a solution and return the indices immediately.
                  </p>
                  <div className="pt-2 flex items-center gap-4 text-[11px] font-mono text-muted-foreground">
                    <span>Time: <strong>O(N)</strong></span>
                    <span>•</span>
                    <span>Space: <strong>O(N)</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* Solutions Tab Content */}
            {activeLeftTab === "solutions" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">Verified Reference Solutions</h3>
                  <Badge variant="outline" className="text-[10px] font-mono">Multi-language</Badge>
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-1.5 font-mono text-xs">
                    <span className="text-primary font-semibold block">Java Solution (Hash Map)</span>
                    <pre className="p-2 rounded bg-background border border-border/40 overflow-x-auto text-[11px]">
{`class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}`}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Submissions History Tab Content */}
            {activeLeftTab === "submissions" && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <h3 className="text-sm font-semibold text-foreground">Your Submission History</h3>
                  <span className="text-xs text-muted-foreground font-mono">{submissionsList.length} submissions</span>
                </div>

                {submissionsList.length > 0 ? (
                  <div className="space-y-2">
                    {submissionsList.map((sub: any) => (
                      <div
                        key={sub.id}
                        onClick={() => {
                          if (sub.sourceCode) {
                            setCode(sub.sourceCode);
                            setLanguage(sub.language);
                            toast.info("Loaded submission code into editor.");
                          }
                        }}
                        className="p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/30 cursor-pointer transition-colors flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] py-0 px-1.5 font-medium",
                                sub.status === "accepted"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                              )}
                            >
                              {sub.status === "accepted" ? "Accepted" : "Wrong Answer"}
                            </Badge>
                            <span className="font-mono text-muted-foreground uppercase text-[10px]">
                              {sub.language}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span>{sub.executionTimeMs}ms</span>
                            <span>•</span>
                            <span>{sub.passedTestCases || sub.testCasesPassed}/{sub.totalTestCases} passed</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            {formatSubmissionTime(sub.submittedAt)}
                          </span>
                          {sub.githubSynced && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end mt-1">
                              <GitBranch className="w-3 h-3" /> Synced
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                    <Clock className="w-6 h-6 mx-auto text-muted-foreground/50" />
                    <p>No submissions recorded yet for this problem.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Reactions & Online Presence Toolbar (Matches Screenshot) */}
          <div className="border-t border-border/60 bg-muted/20 px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setLiked(!liked);
                  if (disliked) setDisliked(false);
                  setLikesCount((prev) => (liked ? prev - 1 : prev + 1));
                }}
                className={cn(
                  "flex items-center gap-1 hover:text-foreground transition-colors",
                  liked && "text-blue-500"
                )}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span className="font-mono text-[11px]">{(likesCount / 1000).toFixed(1)}K</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDisliked(!disliked);
                  if (liked) {
                    setLiked(false);
                    setLikesCount((prev) => prev - 1);
                  }
                }}
                className={cn(
                  "hover:text-foreground transition-colors",
                  disliked && "text-rose-500"
                )}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => toast.info("Discussion thread opened.")}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="font-mono text-[11px]">2.1K</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStarred(!starred);
                  toast.success(starred ? "Removed from starred" : "Saved to starred problems");
                }}
                className={cn("hover:text-foreground transition-colors", starred && "text-amber-500")}
              >
                <Star className={cn("w-3.5 h-3.5", starred && "fill-amber-500")} />
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Problem link copied to clipboard.");
                }}
                className="hover:text-foreground transition-colors"
                title="Share Problem"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => toast.info("Feedback dialog.")}
                className="hover:text-foreground transition-colors"
                title="Help"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-muted-foreground font-medium">689 Online</span>
            </div>
          </div>
        </div>

        {/* ======================================================================== */}
        {/* RIGHT COLUMN: Code Editor (Top) & Execution Console (Bottom)             */}
        {/* ======================================================================== */}
        <div className="h-full min-h-0 flex flex-col gap-1.5 overflow-hidden">
          {/* ---------------------------------------------------------------------- */}
          {/* TOP PANE: Code Editor                                                  */}
          {/* ---------------------------------------------------------------------- */}
          <div className={cn("flex flex-col rounded-lg border border-border/70 bg-card/75 backdrop-blur-xl overflow-hidden shadow-xs min-h-0", bottomConsoleExpanded ? "flex-[3_3_0%]" : "flex-1")}>
            {/* Editor Top Toolbar: </> Code / Language / Auto / Action Icons */}
            <div className="shrink-0 border-b border-border/60 bg-muted/20 px-3 py-1 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                {/* Code Tab Pill */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-background border border-border/60 text-primary font-semibold">
                  <Code2 className="w-3.5 h-3.5 text-primary" />
                  <span>Code</span>
                </div>

                {/* Language Select Dropdown */}
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="h-6 w-28 text-xs border-border/60 bg-background/80 font-mono">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-xs">
                    <SelectItem value="java">Java 17</SelectItem>
                    <SelectItem value="python">Python 3</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="cpp">C++ 20</SelectItem>
                    <SelectItem value="c">C 11</SelectItem>
                  </SelectContent>
                </Select>

                {/* Auto Complete / Lock Indicator */}
                <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                  <Lock className="w-3 h-3 text-muted-foreground/60" />
                  <span>Auto</span>
                </div>
              </div>

              {/* Action Icons: Format, Settings, Reset */}
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={formatCode}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title="Format Code"
                >
                  <Braces className="w-3.5 h-3.5" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={resetCode}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title="Reset to starter solution"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={saveDraft}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title="Save Draft"
                >
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Editor Body with Monospace Line Numbers & Textarea */}
            <div className="relative flex-1 min-h-0 bg-background flex overflow-hidden">
              {/* Line Numbers Gutter */}
              <div
                ref={lineNumbersRef}
                className="w-11 py-2.5 bg-muted/15 border-r border-border/30 text-right pr-2.5 font-mono text-xs text-muted-foreground/40 select-none overflow-hidden leading-6"
              >
                {Array.from({ length: lineCount }).map((_, idx) => (
                  <div key={idx + 1} className="h-6">
                    {idx + 1}
                  </div>
                ))}
              </div>

              {/* Monospaced Code Textarea */}
              <textarea
                ref={textareaRef}
                value={code}
                onChange={handleCodeChange}
                onKeyDown={handleKeyDown}
                onKeyUp={(e) => updateCursorPos(e.currentTarget)}
                onClick={(e) => updateCursorPos(e.currentTarget)}
                onScroll={handleScroll}
                spellCheck={false}
                className="flex-1 h-full p-2.5 font-mono text-xs leading-6 bg-transparent text-foreground resize-none focus:outline-none overflow-y-auto whitespace-pre tab-4"
                placeholder="// Let's code flow in your veins..."
              />
            </div>

            {/* Editor Footer Status Bar */}
            <div className="shrink-0 border-t border-border/50 bg-muted/20 px-3 py-1 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <div className="flex items-center gap-1.5">
                {draftSaved ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3 h-3" />
                    <span>Saved</span>
                  </span>
                ) : (
                  <span className="text-amber-500">Unsaved changes</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span>
                  Ln {cursorPos.line}, Col {cursorPos.col}
                </span>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------------- */}
          {/* BOTTOM PANE: Testcase & Test Result Execution Console                  */}
          {/* ---------------------------------------------------------------------- */}
          <div className={cn("rounded-lg border border-border/70 bg-card/75 backdrop-blur-xl overflow-hidden shadow-xs flex flex-col min-h-0 transition-all duration-200", bottomConsoleExpanded ? "flex-[2_2_0%] min-h-[160px]" : "h-9 shrink-0")}>
            {/* Header Tabs: ☑ Testcase | >_ Test Result */}
            <div className="shrink-0 border-b border-border/60 bg-muted/20 px-3 py-1 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveBottomTab("testcase")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors",
                    activeBottomTab === "testcase"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Testcase</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveBottomTab("result")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors",
                    activeBottomTab === "result"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Terminal className="w-3.5 h-3.5 text-primary" />
                  <span>Test Result</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setBottomConsoleExpanded(!bottomConsoleExpanded)}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title={bottomConsoleExpanded ? "Collapse Console" : "Expand Console"}
                >
                  {bottomConsoleExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            {/* Bottom Console Content */}
            {bottomConsoleExpanded && (
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5 bg-background/50 flex flex-col justify-center">
                {/* 1. Testcase Tab View */}
                {activeBottomTab === "testcase" && (
                  <div className="space-y-3">
                    {/* Case Pills: Case 1, Case 2, Case 3 */}
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveCaseIndex(idx)}
                          className={cn(
                            "px-2.5 py-1 rounded text-xs font-mono transition-colors border",
                            activeCaseIndex === idx
                              ? "bg-muted text-foreground border-border font-semibold shadow-xs"
                              : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/40"
                          )}
                        >
                          Case {idx + 1}
                        </button>
                      ))}
                    </div>

                    {/* Test Case Inputs Mock / Data */}
                    <div className="space-y-2 text-xs font-mono">
                      <div>
                        <span className="text-muted-foreground block text-[11px] mb-1">nums =</span>
                        <div className="p-2 rounded bg-muted/30 border border-border/50 text-foreground">
                          {activeCaseIndex === 0
                            ? "[2,7,11,15]"
                            : activeCaseIndex === 1
                            ? "[3,2,4]"
                            : "[3,3]"}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px] mb-1">target =</span>
                        <div className="p-2 rounded bg-muted/30 border border-border/50 text-foreground">
                          {activeCaseIndex === 0 ? "9" : activeCaseIndex === 1 ? "6" : "6"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Test Result Tab View */}
                {activeBottomTab === "result" && (
                  <div className="flex-1 flex flex-col justify-center">
                    {running || submitting ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Terminal className="w-5 h-5 text-primary animate-spin" />
                        <span>Evaluating test cases on judge sandbox…</span>
                      </div>
                    ) : !sampleResult && !submissionResult ? (
                      /* Exact LeetCode Empty State Matching Screenshot! */
                      <div className="py-10 text-center select-none">
                        <p className="text-muted-foreground text-sm font-sans">
                          You must run your code first
                        </p>
                      </div>
                    ) : (
                      /* Executed Result Display */
                      <div className="space-y-3">
                        {/* Sample Run Result */}
                        {sampleResult && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "text-sm font-bold flex items-center gap-1.5",
                                  sampleResult.status === "sample_passed"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : sampleResult.status === "compile_error"
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-rose-600 dark:text-rose-400"
                                )}
                              >
                                {sampleResult.status === "sample_passed" ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Accepted</span>
                                  </>
                                ) : sampleResult.status === "compile_error" ? (
                                  <>
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>Compile Error</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4" />
                                    <span>Wrong Answer</span>
                                  </>
                                )}
                              </span>

                              <div className="flex items-center gap-3 text-muted-foreground text-[11px] font-mono">
                                <span>Runtime: <strong>{sampleResult.executionTimeMs} ms</strong></span>
                                <span>•</span>
                                <span>Memory: <strong>{sampleResult.memoryUsedMb} MB</strong></span>
                              </div>
                            </div>

                            {sampleResult.compileError && (
                              <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 font-mono text-xs whitespace-pre-wrap">
                                {sampleResult.compileError}
                              </div>
                            )}

                            <div className="space-y-1.5 pt-1">
                              {sampleResult.results?.map((r: any, idx: number) => (
                                <div
                                  key={idx}
                                  className={cn(
                                    "p-2 rounded border text-[11px] font-mono flex items-center justify-between",
                                    r.passed
                                      ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-700 dark:text-emerald-400"
                                      : "bg-rose-500/5 border-rose-500/25 text-rose-700 dark:text-rose-400"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    {r.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                    <span>Case {r.orderIndex}</span>
                                  </div>
                                  <span>{r.passed ? "Passed" : "Wrong Output"}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Full Submission Verdict */}
                        {submissionResult && (
                          <div className="space-y-2 pt-2 border-t border-border/40">
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "text-sm font-bold flex items-center gap-1.5",
                                  submissionResult.status === "accepted"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : submissionResult.status === "compile_error"
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-rose-600 dark:text-rose-400"
                                )}
                              >
                                {submissionResult.status === "accepted" ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Submission Accepted</span>
                                  </>
                                ) : submissionResult.status === "compile_error" ? (
                                  <>
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>Compile Error</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4" />
                                    <span>Wrong Answer</span>
                                  </>
                                )}
                              </span>

                              <div className="flex items-center gap-3 text-muted-foreground text-[11px] font-mono">
                                <span>Score: <strong>{submissionResult.score}/100</strong></span>
                                <span>•</span>
                                <span>
                                  Testcases: {submissionResult.testCasesPassed}/{submissionResult.totalTestCases}
                                </span>
                              </div>
                            </div>

                            {submissionResult.githubSynced && (
                              <div className="p-2.5 rounded bg-muted/30 border border-border flex items-center justify-between text-xs mt-2">
                                <div className="flex items-center gap-2">
                                  <GitBranch className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  <div>
                                    <span className="font-semibold text-foreground">
                                      Synced to Student GitHub
                                    </span>
                                    <span className="block font-mono text-[11px] text-muted-foreground">
                                      {submissionResult.githubRepoName || targetRepo}
                                    </span>
                                  </div>
                                </div>
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                                  Commit: {submissionResult.githubCommitSha?.slice(0, 10)}
                                </Badge>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* PROBLEM PICKER MODAL DIALOG                                                */}
      {/* -------------------------------------------------------------------------- */}
      <Dialog open={problemListOpen} onOpenChange={setProblemListOpen}>
        <DialogContent className="max-w-2xl bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Code2 className="w-5 h-5 text-primary" />
              <span>Select Coding Problem</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Search and filter curated problems across topics and difficulty levels.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Filter by title, topic, or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs border-border bg-background"
                />
              </div>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="h-9 w-28 text-xs border-border bg-background font-mono">
                  <SelectValue placeholder="Diff" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-xs">
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border/40 border border-border/50 rounded-lg">
              {filteredProblems.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProblemId(p.id);
                    setProblemListOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 text-xs flex items-center justify-between transition-colors",
                    p.id === currentProblem?.id
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted/40 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="font-mono text-muted-foreground text-[11px] w-6 shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="truncate">{p.title}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                      {p.topic}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] py-0 px-1.5 font-medium",
                        p.difficulty === "Easy"
                          ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : p.difficulty === "Medium"
                          ? "text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "text-rose-600 dark:text-rose-400 border-rose-500/30"
                      )}
                    >
                      {p.difficulty}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
