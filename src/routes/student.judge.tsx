import { useEffect, useState, useMemo, useRef, useLayoutEffect } from "react";
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
  Maximize2,
  Minimize2,
  Settings,
  Braces,
  Shuffle,
  Timer,
  Lock,
  Sparkles,
  Flame,
  Copy,
  ListFilter,
  Trash2,
  TextWrap,
  Cpu,
  Layers,
  Activity,
  Zap,
  X,
  ArrowUpDown,
  SlidersHorizontal,
  GripVertical,
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
import { authService } from "@/lib/auth/service";
import { cn } from "@/lib/utils";
import { highlightCode, highlightCodeLines } from "@/lib/syntax-highlighter";
import { getProblemEditorial, getProblemSolutions } from "@/lib/problem-editorial";

export const Route = createFileRoute("/student/judge")({
  head: () => ({
    meta: [
      { title: "Code — Let's code flow in your veins | Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentJudgePage,
});

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function formatLinePrettier(line: string): string {
  // Ensure space after commas (except inside strings)
  let out = "";
  let inStr = false;
  let strQuote = "";

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inStr) {
      out += ch;
      if (ch === strQuote && line[i - 1] !== "\\") inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = true;
      strQuote = ch;
      out += ch;
      continue;
    }
    if (ch === ",") {
      out += ", ";
      while (i + 1 < line.length && line[i + 1] === " ") i++;
      continue;
    }
    if (ch === ";") {
      out = out.trimEnd() + ";";
      continue;
    }
    if (ch === "{") {
      if (out.length > 0 && !/\s/.test(out[out.length - 1] ?? "")) {
        out += " ";
      }
      out += "{";
      continue;
    }
    out += ch;
  }

  // Normalize single equals '=' spacing if not part of ==, !=, <=, >=, =>, +=, -=
  out = out.replace(/([^=!<>&|+*\/%\-\s])=([^=<>])/g, "$1 = $2");
  out = out.replace(/([^=!<>&|+*\/%\-])\s*=\s*([^=<>])/g, "$1 = $2");

  return out;
}

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
      let line = lines[i].trim();
      if (!line) {
        if (formatted.length > 0 && formatted[formatted.length - 1] !== "") {
          formatted.push("");
        }
        continue;
      }

      line = formatLinePrettier(line);

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
    let line = lines[i].trim();
    if (!line) {
      if (formatted.length > 0 && formatted[formatted.length - 1] !== "") {
        formatted.push("");
      }
      continue;
    }

    line = formatLinePrettier(line);

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

  // Problem 2: Shortest Path in Binary Matrix / Grid
  if (probCode === "PRB-0002" || probTitle.includes("shortest path") || probTitle.includes("grid") || probTitle.includes("matrix")) {
    switch (l) {
      case "python":
        return `class Solution:\n    def shortestPathBinaryMatrix(self, grid: list[list[int]]) -> int:\n        # Let's code flow in your veins\n        # Write your solution here\n        return -1\n`;
      case "javascript":
        return `/**\n * @param {number[][]} grid\n * @return {number}\n */\nvar shortestPathBinaryMatrix = function(grid) {\n    // Let's code flow in your veins\n    // Write your solution here\n    return -1;\n};\n`;
      case "cpp":
        return `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int shortestPathBinaryMatrix(vector<vector<int>>& grid) {\n        // Let's code flow in your veins\n        // Write your solution here\n        return -1;\n    }\n};\n`;
      case "c":
        return `int shortestPathBinaryMatrix(int** grid, int gridSize, int* gridColSize) {\n    // Let's code flow in your veins\n    // Write your solution here\n    return -1;\n}\n`;
      case "java":
      default:
        return `class Solution {\n    public int shortestPathBinaryMatrix(int[][] grid) {\n        // Let's code flow in your veins\n        // Write your solution here\n        return -1;\n    }\n}\n`;
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

export function getStoredJudgeCode(problemId: string, lang: string): string | null {
  try {
    return localStorage.getItem(`zx_judge_code_${problemId}_${lang.toLowerCase()}`);
  } catch {
    return null;
  }
}

export function setStoredJudgeCode(problemId: string, lang: string, source: string) {
  try {
    localStorage.setItem(`zx_judge_code_${problemId}_${lang.toLowerCase()}`, source);
  } catch {}
}

export function isCodeMatchingLanguage(source: string, lang: string): boolean {
  if (!source || !source.trim()) return false;
  const s = source.trim();
  const l = (lang || "").toLowerCase();

  if (l === "python") {
    if (
      s.includes("public class") ||
      s.includes("public int") ||
      s.includes("public void") ||
      s.includes("#include <") ||
      s.includes("var twoSum") ||
      s.includes("int[]") ||
      s.includes("vector<int>")
    ) {
      return false;
    }
  } else if (l === "java") {
    if (
      s.includes("def twoSum") ||
      s.includes("def isValid") ||
      s.includes("def solve") ||
      s.includes("def shortestPath") ||
      s.includes("#include <vector>") ||
      s.includes("var twoSum")
    ) {
      return false;
    }
  } else if (l === "cpp") {
    if (s.includes("public class") || s.includes("def twoSum") || s.includes("var twoSum")) {
      return false;
    }
  } else if (l === "c") {
    if (s.includes("class Solution") || s.includes("def twoSum") || s.includes("var twoSum")) {
      return false;
    }
  } else if (l === "javascript") {
    if (s.includes("public class") || s.includes("#include <") || s.includes("def twoSum")) {
      return false;
    }
  }
  return true;
}

function StudentJudgePage() {
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);

  // Filters & Problem Drawer
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [problemListOpen, setProblemListOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"default" | "asc" | "desc">("default");
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);

  // Split Pane Resizing State (Problem Statement vs Code Editor)
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("zx_judge_split_ratio");
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 20 && parsed <= 80) return parsed;
      }
    } catch {}
    return 46; // default 46% for Problem Statement, matching LeetCode
  });
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const splitPaneContainerRef = useRef<HTMLDivElement>(null);

  // Editor State
  const [language, setLanguage] = useState("java");
  const [code, setCode] = useState("");
  const [draftSaved, setDraftSaved] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [undoStack, setUndoStack] = useState<Array<{ code: string; selStart: number; selEnd: number }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{ code: string; selStart: number; selEnd: number }>>([]);
  const pendingCursorPos = useRef<{ start: number; end: number } | null>(null);
  const codeByLangRef = useRef<Record<string, Record<string, string>>>({});

  // Execution State
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sampleResult, setSampleResult] = useState<any>(null);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [activeLeftTab, setActiveLeftTab] = useState("description");
  const [activeBottomTab, setActiveBottomTab] = useState<"testcase" | "result" | "telemetry">("result");
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const [bottomConsoleExpanded, setBottomConsoleExpanded] = useState(true);
  const [terminalMaximized, setTerminalMaximized] = useState(false);
  const [terminalWordWrap, setTerminalWordWrap] = useState(true);

  // Custom Input State
  const [customInput, setCustomInput] = useState<string>("");
  const [isCustomCaseActive, setIsCustomCaseActive] = useState(false);
  const [customResult, setCustomResult] = useState<any>(null);
  const [runningCustom, setRunningCustom] = useState(false);

  // Collapsible metadata
  const [showTopics, setShowTopics] = useState(false);
  const [showCompanies, setShowCompanies] = useState(false);
  const [showHints, setShowHints] = useState(false);

  // Student Profile Info & Presence
  const [studentName, setStudentName] = useState<string>(() => {
    return authService.getSession()?.user?.name || "Student";
  });
  const [targetRepo, setTargetRepo] = useState<string>("ZiphyrusX-Aarav-001");

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorScrollerRef = useRef<HTMLDivElement>(null);
  const [terminalCopied, setTerminalCopied] = useState(false);

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

  // Load problem list & profile & all submissions
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [probRes, profileRes, subsRes] = await Promise.all([
          api.student.judge.problems(),
          api.student.profile().catch(() => null),
          api.student.judge.submissions().catch(() => []),
        ]);
        setProblems(probRes || []);
        if (subsRes) setAllSubmissions(subsRes);
        if (probRes && probRes.length > 0 && !selectedProblemId) {
          setSelectedProblemId(probRes[0].id);
        }
        if (profileRes?.name) {
          setStudentName(profileRes.name);
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

  // Track solved problems for current student
  const solvedProblemIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSubmissions) {
      if (s.status === "accepted" && s.problemId) {
        set.add(s.problemId);
      }
    }
    return set;
  }, [allSubmissions]);

  const solvedCount = solvedProblemIds.size;

  // Filtered & Sorted problem list
  const filteredProblems = useMemo(() => {
    let list = problems.filter((p) => {
      const matchSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        p.topic.toLowerCase().includes(search.toLowerCase());
      const matchDiff =
        difficultyFilter === "all" ||
        p.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
      const matchTopic =
        topicFilter === "all" || p.topic.toLowerCase() === topicFilter.toLowerCase();
      return matchSearch && matchDiff && matchTopic;
    });

    if (sortOrder === "asc") {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOrder === "desc") {
      list = [...list].sort((a, b) => b.title.localeCompare(a.title));
    }

    return list;
  }, [problems, search, difficultyFilter, topicFilter, sortOrder]);

  // Split-pane Drag Handlers (Left/Right resizing for Problem Statement)
  const startDraggingSplitter = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  };

  useEffect(() => {
    if (!isDraggingSplitter) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!splitPaneContainerRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const containerRect = splitPaneContainerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      if (containerWidth <= 0) return;

      const offsetLeft = clientX - containerRect.left;
      const percentage = (offsetLeft / containerWidth) * 100;
      const clamped = Math.max(20, Math.min(80, percentage));
      setLeftPanelWidth(clamped);
      try {
        localStorage.setItem("zx_judge_split_ratio", clamped.toFixed(1));
      } catch {}
    };

    const handlePointerUp = () => {
      setIsDraggingSplitter(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove, { passive: false });
    window.addEventListener("touchend", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDraggingSplitter]);

  // Current problem & position in filtered list
  const currentProblemIndex = useMemo(() => {
    return filteredProblems.findIndex((p) => p.id === selectedProblemId);
  }, [filteredProblems, selectedProblemId]);

  const currentProblem = filteredProblems[currentProblemIndex] || filteredProblems[0] || null;

  // Editorial & Verified Reference Solutions
  const [selectedSolutionIndex, setSelectedSolutionIndex] = useState(0);
  const [solutionCopied, setSolutionCopied] = useState(false);
  const editorial = useMemo(() => getProblemEditorial(currentProblem), [currentProblem]);
  const solutions = useMemo(() => getProblemSolutions(currentProblem), [currentProblem]);

  // Load problem details, drafts, and submissions when problem changes
  useEffect(() => {
    if (!currentProblem) return;

    async function loadProblemWorkspace() {
      try {
        const probId = currentProblem.id;
        setSelectedSolutionIndex(0);
        const [draftRes, subRes] = await Promise.all([
          api.student.judge.getDraft(probId, language).catch(() => null),
          api.student.judge.submissions(probId).catch(() => []),
        ]);

        if (draftRes && draftRes.code && isCodeMatchingLanguage(draftRes.code, draftRes.language || language)) {
          const draftLang = draftRes.language || language;
          setLanguage(draftLang);
          setCode(draftRes.code);
          if (!codeByLangRef.current[probId]) codeByLangRef.current[probId] = {};
          codeByLangRef.current[probId][draftLang] = draftRes.code;
          setStoredJudgeCode(probId, draftLang, draftRes.code);
        } else {
          const cached = codeByLangRef.current[probId]?.[language] || getStoredJudgeCode(probId, language);
          if (cached && cached.trim() && isCodeMatchingLanguage(cached, language)) {
            setCode(cached);
            if (!codeByLangRef.current[probId]) codeByLangRef.current[probId] = {};
            codeByLangRef.current[probId][language] = cached;
          } else {
            const starter = getStarterCodeForProblem(currentProblem, language);
            setCode(starter);
            if (!codeByLangRef.current[probId]) codeByLangRef.current[probId] = {};
            codeByLangRef.current[probId][language] = starter;
          }
        }

        setSubmissionsList(subRes || []);
        setSampleResult(null);
        setSubmissionResult(null);
        setIsDirty(false);
        setDraftSaved(true);
        setActiveBottomTab("result");
        setActiveCaseIndex(0);
        setIsCustomCaseActive(false);
        setCustomResult(null);
        if (currentProblem.testCases?.[0]?.input) {
          setCustomInput(currentProblem.testCases[0].input);
        }
      } catch (err) {
        console.error("Error loading problem details:", err);
      }
    }

    loadProblemWorkspace();
  }, [currentProblem?.id]);

  // Handle language switch
  const handleLanguageChange = (newLang: string) => {
    if (newLang === language) return;

    // 1. Save current language's working code
    const probId = currentProblem?.id || "default";
    if (!codeByLangRef.current[probId]) {
      codeByLangRef.current[probId] = {};
    }
    if (code) {
      codeByLangRef.current[probId][language] = code;
      if (currentProblem?.id) {
        setStoredJudgeCode(currentProblem.id, language, code);
      }
    }

    // 2. Set new language
    setLanguage(newLang);

    // 3. Resolve code for new language:
    // Check in-memory cache first, then localStorage
    const cached =
      codeByLangRef.current[probId]?.[newLang] ||
      (currentProblem?.id ? getStoredJudgeCode(currentProblem.id, newLang) : null);

    let nextCode = "";
    if (cached && cached.trim() && isCodeMatchingLanguage(cached, newLang)) {
      nextCode = cached;
    } else {
      // Load fresh boilerplate for the selected language!
      nextCode = getStarterCodeForProblem(currentProblem, newLang);
      codeByLangRef.current[probId][newLang] = nextCode;
      if (currentProblem?.id) {
        setStoredJudgeCode(currentProblem.id, newLang, nextCode);
      }
    }

    setCode(nextCode);
    setUndoStack([]);
    setRedoStack([]);
    setIsDirty(false);
    setDraftSaved(true);
    setSampleResult(null);
    setSubmissionResult(null);

    toast.info(`Switched to ${newLang.toUpperCase()} boilerplate`);
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
      const probId = currentProblem.id;
      if (!codeByLangRef.current[probId]) {
        codeByLangRef.current[probId] = {};
      }
      codeByLangRef.current[probId][language] = code;
      setStoredJudgeCode(probId, language, code);

      await api.student.judge.saveDraft(probId, language, code);
      setDraftSaved(true);
      setIsDirty(false);
      toast.success(`Draft saved for ${language.toUpperCase()}.`);
    } catch {
      toast.error("Failed to save draft.");
    }
  };

  // Track cursor position
  const updateCursorPos = (ta: HTMLTextAreaElement) => {
    const textLines = ta.value.substring(0, ta.selectionStart).split("\n");
    const currentLine = textLines.length;
    const currentCol = (textLines[textLines.length - 1] ?? "").length + 1;
    setCursorPos({
      line: currentLine,
      col: currentCol,
    });
  };

  // Cursor preservation across programmatic state updates
  useIsomorphicLayoutEffect(() => {
    if (pendingCursorPos.current && textareaRef.current) {
      const { start, end } = pendingCursorPos.current;
      textareaRef.current.selectionStart = start;
      textareaRef.current.selectionEnd = end;
      updateCursorPos(textareaRef.current);
      pendingCursorPos.current = null;
    }
  }, [code]);

  const applyCodeChange = (newCode: string, cursorStart: number, cursorEnd: number) => {
    const curStart = textareaRef.current?.selectionStart ?? cursorStart;
    const curEnd = textareaRef.current?.selectionEnd ?? cursorEnd;
    const currentCode = textareaRef.current?.value ?? code;
    setUndoStack((prev) => [...prev.slice(-50), { code: currentCode, selStart: curStart, selEnd: curEnd }]);
    setRedoStack([]);
    pendingCursorPos.current = { start: cursorStart, end: cursorEnd };
    setCode(newCode);
    setIsDirty(true);
    setDraftSaved(false);
    const probId = currentProblem?.id || "default";
    if (!codeByLangRef.current[probId]) {
      codeByLangRef.current[probId] = {};
    }
    codeByLangRef.current[probId][language] = newCode;
    if (currentProblem?.id) {
      setStoredJudgeCode(currentProblem.id, language, newCode);
    }
  };

  const handleCursorEvent = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    updateCursorPos(e.currentTarget);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCode(val);
    setIsDirty(true);
    setDraftSaved(false);
    updateCursorPos(e.target);
    const probId = currentProblem?.id || "default";
    if (!codeByLangRef.current[probId]) {
      codeByLangRef.current[probId] = {};
    }
    codeByLangRef.current[probId][language] = val;
    if (currentProblem?.id) {
      setStoredJudgeCode(currentProblem.id, language, val);
    }
  };

  // Full-line count & memoized VS Code syntax-highlighted HTML
  const codeLines = useMemo(() => (code || "").split("\n"), [code]);
  const lineCount = useMemo(() => Math.max(codeLines.length, 24), [codeLines.length]);

  const highlightedHtml = useMemo(() => {
    return highlightCode(code, language, { isDark: true });
  }, [code, language]);

  // Tab, Enter auto-indent, auto-closing brackets, smart backspace, undo/redo & Prettier keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. Prettier formatting shortcut: Alt+Shift+F or Ctrl+Shift+F or Cmd+Shift+F
    if (e.shiftKey && (e.altKey || e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
      e.preventDefault();
      formatCode();
      return;
    }

    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const val = target.value;

    // 2. Undo / Redo shortcuts (Ctrl+Z and Ctrl+Y / Ctrl+Shift+Z)
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      if (e.key === "z" && !e.shiftKey) {
        if (undoStack.length > 0) {
          e.preventDefault();
          const last = undoStack[undoStack.length - 1];
          setUndoStack((prev) => prev.slice(0, -1));
          setRedoStack((prev) => [...prev.slice(-50), { code, selStart: start, selEnd: end }]);
          pendingCursorPos.current = { start: last.selStart, end: last.selEnd };
          setCode(last.code);
          setIsDirty(true);
          const probId = currentProblem?.id || "default";
          if (!codeByLangRef.current[probId]) codeByLangRef.current[probId] = {};
          codeByLangRef.current[probId][language] = last.code;
          if (currentProblem?.id) setStoredJudgeCode(currentProblem.id, language, last.code);
          return;
        }
      } else if ((e.key === "y" && !e.shiftKey) || (e.key === "z" && e.shiftKey)) {
        if (redoStack.length > 0) {
          e.preventDefault();
          const next = redoStack[redoStack.length - 1];
          setRedoStack((prev) => prev.slice(0, -1));
          setUndoStack((prev) => [...prev.slice(-50), { code, selStart: start, selEnd: end }]);
          pendingCursorPos.current = { start: next.selStart, end: next.selEnd };
          setCode(next.code);
          setIsDirty(true);
          const probId = currentProblem?.id || "default";
          if (!codeByLangRef.current[probId]) codeByLangRef.current[probId] = {};
          codeByLangRef.current[probId][language] = next.code;
          if (currentProblem?.id) setStoredJudgeCode(currentProblem.id, language, next.code);
          return;
        }
      }
    }

    // 3. Tab & Shift+Tab handling
    if (e.key === "Tab") {
      e.preventDefault();

      if (e.shiftKey) {
        // Shift + Tab: un-indent current line or selected lines
        const beforeSel = val.substring(0, start);
        const lineStart = beforeSel.lastIndexOf("\n") + 1;
        const selectedText = val.substring(lineStart, end);
        const lines = selectedText.split("\n");
        let firstLineRemoved = 0;
        let totalRemoved = 0;

        const unindentedLines = lines.map((l, idx) => {
          let spacesToRemove = 0;
          while (spacesToRemove < 4 && l[spacesToRemove] === " ") {
            spacesToRemove++;
          }
          if (spacesToRemove === 0 && l[0] === "\t") {
            spacesToRemove = 1;
          }
          if (idx === 0) firstLineRemoved = spacesToRemove;
          totalRemoved += spacesToRemove;
          return l.substring(spacesToRemove);
        });

        const replacement = unindentedLines.join("\n");
        const newCode = val.substring(0, lineStart) + replacement + val.substring(end);
        applyCodeChange(newCode, Math.max(lineStart, start - firstLineRemoved), Math.max(lineStart, end - totalRemoved));
        return;
      }

      if (start !== end) {
        // Multi-line indent with Tab
        const beforeSel = val.substring(0, start);
        const lineStart = beforeSel.lastIndexOf("\n") + 1;
        const selectedText = val.substring(lineStart, end);
        const lines = selectedText.split("\n");
        const indentedLines = lines.map((l) => "    " + l);
        const replacement = indentedLines.join("\n");
        const newCode = val.substring(0, lineStart) + replacement + val.substring(end);
        applyCodeChange(newCode, start + 4, end + 4 * lines.length);
        return;
      }

      // Single cursor Tab: insert 4 spaces
      const newCode = val.substring(0, start) + "    " + val.substring(end);
      applyCodeChange(newCode, start + 4, start + 4);
      return;
    }

    // 4. Enter (Smart Auto-Indentation & Brace Expansion)
    if (e.key === "Enter") {
      e.preventDefault();
      const beforeCursor = val.substring(0, start);
      const afterCursor = val.substring(end);
      const lastNewlineIdx = beforeCursor.lastIndexOf("\n");
      const currentLine = lastNewlineIdx === -1 ? beforeCursor : beforeCursor.substring(lastNewlineIdx + 1);

      const indentMatch = currentLine.match(/^([ \t]*)/);
      const currentIndent = indentMatch ? (indentMatch[1] ?? "") : "";

      const charBefore = beforeCursor.trimEnd().slice(-1);
      const charAfter = afterCursor.trimStart().slice(0, 1);

      const isBetweenBrackets =
        (charBefore === "{" && charAfter === "}") ||
        (charBefore === "(" && charAfter === ")") ||
        (charBefore === "[" && charAfter === "]");

      const opensBlock =
        charBefore === "{" ||
        charBefore === ":" ||
        charBefore === "(" ||
        charBefore === "[";

      if (isBetweenBrackets) {
        const textToInsert = "\n" + currentIndent + "    \n" + currentIndent;
        const newCode = val.substring(0, start) + textToInsert + val.substring(end);
        const newPos = start + 1 + currentIndent.length + 4;
        applyCodeChange(newCode, newPos, newPos);
      } else if (opensBlock) {
        const textToInsert = "\n" + currentIndent + "    ";
        const newCode = val.substring(0, start) + textToInsert + val.substring(end);
        const newPos = start + textToInsert.length;
        applyCodeChange(newCode, newPos, newPos);
      } else {
        const textToInsert = "\n" + currentIndent;
        const newCode = val.substring(0, start) + textToInsert + val.substring(end);
        const newPos = start + textToInsert.length;
        applyCodeChange(newCode, newPos, newPos);
      }
      return;
    }

    // 5. Closing character skip-over
    const CLOSING_CHARS = new Set([")", "]", "}", '"', "'", "`"]);
    if (CLOSING_CHARS.has(e.key) && start === end && val[start] === e.key) {
      e.preventDefault();
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
        updateCursorPos(textareaRef.current);
      }
      return;
    }

    // 6. Auto-closing pairs
    const PAIRS: Record<string, string> = {
      "(": ")",
      "[": "]",
      "{": "}",
      '"': '"',
      "'": "'",
      "`": "`",
    };

    if (PAIRS[e.key]) {
      const closeChar = PAIRS[e.key];

      if (start !== end) {
        e.preventDefault();
        const selected = val.substring(start, end);
        const newCode = val.substring(0, start) + e.key + selected + closeChar + val.substring(end);
        applyCodeChange(newCode, start + 1, start + 1 + selected.length);
        return;
      }

      if ((e.key === "'" || e.key === '"') && start > 0 && /[a-zA-Z0-9_]/.test(val[start - 1] ?? "")) {
        return;
      }

      const nextChar = val[start] ?? "";
      if (!nextChar || /[\s)\]},;]/.test(nextChar)) {
        e.preventDefault();
        const newCode = val.substring(0, start) + e.key + closeChar + val.substring(end);
        applyCodeChange(newCode, start + 1, start + 1);
        return;
      }
    }

    // 7. Smart Backspace
    if (e.key === "Backspace" && start === end && start > 0) {
      const charBefore = val[start - 1];
      const charAfter = val[start];

      if (
        (charBefore === "(" && charAfter === ")") ||
        (charBefore === "[" && charAfter === "]") ||
        (charBefore === "{" && charAfter === "}") ||
        (charBefore === '"' && charAfter === '"') ||
        (charBefore === "'" && charAfter === "'") ||
        (charBefore === "`" && charAfter === "`")
      ) {
        e.preventDefault();
        const newCode = val.substring(0, start - 1) + val.substring(start + 1);
        applyCodeChange(newCode, start - 1, start - 1);
        return;
      }

      const lineStart = val.lastIndexOf("\n", start - 1) + 1;
      const textBeforeOnLine = val.substring(lineStart, start);
      if (textBeforeOnLine.length >= 4 && /^ +$/.test(textBeforeOnLine) && textBeforeOnLine.length % 4 === 0) {
        e.preventDefault();
        const newCode = val.substring(0, start - 4) + val.substring(start);
        applyCodeChange(newCode, start - 4, start - 4);
        return;
      }
    }
  };

  // Reset Code
  const resetCode = () => {
    const starter = getStarterCodeForProblem(currentProblem, language);
    const probId = currentProblem?.id || "default";
    setCode(starter);
    if (!codeByLangRef.current[probId]) {
      codeByLangRef.current[probId] = {};
    }
    codeByLangRef.current[probId][language] = starter;
    if (currentProblem?.id) {
      setStoredJudgeCode(currentProblem.id, language, starter);
    }
    setUndoStack([]);
    setRedoStack([]);
    setIsDirty(false);
    setDraftSaved(true);
    setSampleResult(null);
    setSubmissionResult(null);
    toast.info(`Reset code to ${language.toUpperCase()} solution template.`);
  };

  // Format Code with Prettier
  const formatCode = () => {
    try {
      const formatted = formatSourceCode(code, language);
      if (formatted !== code) {
        applyCodeChange(formatted, textareaRef.current?.selectionStart ?? 0, textareaRef.current?.selectionEnd ?? 0);
        toast.success("Code formatted with Prettier ✨");
      } else {
        toast.info("Code is already well-formatted with Prettier.");
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
    setBottomConsoleExpanded(true);
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
    setBottomConsoleExpanded(true);
    setActiveBottomTab("result");
    setSubmissionResult(null);
    try {
      const res = await api.student.judge.submit(currentProblem.id, language, code);
      setSubmissionResult(res);

      if (res.status === "accepted") {
        setAllSubmissions((prev) => [res, ...prev]);
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

  // Run Custom Testcase Input
  const handleRunCustom = async (overrideInput?: string) => {
    if (!currentProblem) return;
    const inputToUse =
      (overrideInput ?? customInput).trim() ||
      currentProblem.testCases?.[0]?.input ||
      "nums = [2,7,11,15], target = 9";
    setRunningCustom(true);
    setRunning(true);
    setBottomConsoleExpanded(true);
    try {
      const res = await api.student.judge.runCustom(currentProblem.id, language, code, inputToUse);
      setCustomResult(res);
      setSampleResult({
        ...res,
        totalSampleCases: 1,
        passedSampleCases: res.passed ? 1 : 0,
        results: [
          {
            testCaseId: "custom",
            orderIndex: 1,
            input: res.customInput,
            expectedOutput: res.expectedOutput,
            actualOutput: res.actualOutput,
            passed: res.passed,
            executionTimeMs: res.executionTimeMs,
            memoryUsedMb: res.memoryUsedMb,
          },
        ],
      });
      if (res.status === "sample_passed") {
        toast.success("Custom test case passed! ✓");
      } else if (res.status === "compile_error") {
        toast.error("Compilation / runtime error on custom testcase");
      } else {
        toast.error("Custom test case failed (Wrong Output)");
      }
    } catch {
      toast.error("Execution error while evaluating custom input.");
    } finally {
      setRunningCustom(false);
      setRunning(false);
    }
  };

  // Terminal Copy & Clear Handlers
  const handleCopyTerminalOutput = () => {
    const textToCopy =
      sampleResult?.terminalOutput ||
      submissionResult?.terminalOutput ||
      sampleResult?.compileError ||
      submissionResult?.compileError ||
      "";
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setTerminalCopied(true);
      toast.success("Terminal output copied to clipboard.");
      setTimeout(() => setTerminalCopied(false), 2000);
    }
  };

  const handleClearTerminal = () => {
    setSampleResult(null);
    setSubmissionResult(null);
    setCustomResult(null);
    toast.info("Terminal output cleared.");
  };

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
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
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

          {/* Run, Custom & Submit Top Execution Buttons */}
          <div className="flex items-center gap-1.5 font-sans">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRunSample}
              disabled={running || submitting}
              className="h-7 px-2.5 text-xs gap-1 border-border/80 bg-background/80 hover:bg-muted/60 font-sans font-normal"
            >
              <Play className="w-3 h-3 text-blue-500 fill-blue-500" />
              <span>{running ? "Running…" : "Run"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setActiveBottomTab("testcase");
                setIsCustomCaseActive(true);
                setBottomConsoleExpanded(true);
              }}
              disabled={running || submitting}
              className="h-7 px-2.5 text-xs gap-1 border-border/80 bg-background/80 hover:bg-muted/60 font-sans font-normal text-muted-foreground hover:text-foreground"
              title="Open Custom Input Runner"
            >
              <Code2 className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">Custom</span>
            </Button>

            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={running || submitting}
              className="h-7 px-3 text-xs gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-normal shadow-none"
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

      {/* Overlay to prevent text selection and capture mouse during split-drag */}
      {isDraggingSplitter && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none pointer-events-auto bg-transparent" />
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MAIN 2-COLUMN LEETCODE RESIZABLE SPLIT WORKSPACE                           */}
      {/* -------------------------------------------------------------------------- */}
      <div
        ref={splitPaneContainerRef}
        className="flex-1 min-h-0 flex flex-col lg:flex-row gap-0 overflow-hidden relative"
      >
        {/* ======================================================================== */}
        {/* LEFT COLUMN: Problem Details / Editorial / Solutions / Submissions       */}
        {/* ======================================================================== */}
        <div
          style={{ width: `${leftPanelWidth}%` }}
          className="h-full min-h-0 flex flex-col rounded-lg border border-border/70 bg-card/75 backdrop-blur-xl overflow-hidden shadow-xs shrink-0 max-lg:!w-full"
        >
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
                <div className="pb-1 border-b border-border/40">
                  <h3 className="text-sm font-bold text-foreground">
                    {editorial.problemTitle} — Editorial Breakdown
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {editorial.overview}
                  </p>
                </div>

                {editorial.approaches.map((app, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-foreground">
                        {app.title}
                      </h4>
                      {app.badge && (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          {app.badge}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                        Intuition
                      </span>
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        {app.intuition}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                        Algorithm Steps
                      </span>
                      <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                        {app.algorithm.map((step, sIdx) => (
                          <li key={sIdx} className="leading-relaxed">
                            <span className="text-foreground/90">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="pt-2 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-background/60 border border-border/40">
                        <div className="font-mono text-primary font-semibold text-[11px]">
                          Time: {app.complexity.time}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {app.complexity.timeNotes}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-background/60 border border-border/40">
                        <div className="font-mono text-amber-500 font-semibold text-[11px]">
                          Space: {app.complexity.space}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {app.complexity.spaceNotes}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {editorial.edgeCases && editorial.edgeCases.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                    <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5" /> Key Edge Cases to Watch
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[11px]">
                      {editorial.edgeCases.map((ec, i) => (
                        <li key={i}>{ec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Solutions Tab Content */}
            {activeLeftTab === "solutions" && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-border/40">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Verified Reference Solutions</h3>
                    <p className="text-[11px] text-muted-foreground">Optimal implementations across supported languages</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Verified Reference
                  </Badge>
                </div>

                {/* Language Selection Pills */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-muted/30 border border-border/50">
                  {solutions.map((sol, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSolutionIndex(idx)}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-mono font-medium transition-all",
                        selectedSolutionIndex === idx
                          ? "bg-background text-primary shadow-xs border border-border/60"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {sol.languageLabel}
                    </button>
                  ))}
                </div>

                {/* Solution Box */}
                {solutions[selectedSolutionIndex] && (() => {
                  const sol = solutions[selectedSolutionIndex];
                  return (
                    <div className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
                      <div className="px-3 py-2 bg-muted/40 border-b border-border/40 flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-2">
                          <span className="text-primary font-mono">{sol.languageLabel}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground font-sans text-[11px]">{sol.approachTitle}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              navigator.clipboard.writeText(sol.code);
                              setSolutionCopied(true);
                              setTimeout(() => setSolutionCopied(false), 2000);
                              toast.success("Solution copied to clipboard");
                            }}
                          >
                            {solutionCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{solutionCopied ? "Copied" : "Copy"}</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[11px] gap-1 font-mono text-primary border-primary/30 hover:bg-primary/10"
                            onClick={() => {
                              setLanguage(sol.language);
                              setCode(sol.code);
                              const probId = currentProblem?.id || "default";
                              if (!codeByLangRef.current[probId]) codeByLangRef.current[probId] = {};
                              codeByLangRef.current[probId][sol.language] = sol.code;
                              setStoredJudgeCode(probId, sol.language, sol.code);
                              setIsDirty(true);
                              setDraftSaved(false);
                              toast.success(`Loaded ${sol.languageLabel} solution into editor!`);
                            }}
                          >
                            <Code2 className="w-3 h-3" />
                            <span>Load into Editor</span>
                          </Button>
                        </div>
                      </div>

                      <pre className="p-3 bg-background/80 overflow-x-auto text-[11px] font-mono leading-relaxed text-foreground select-all max-h-[460px]">
                        {sol.code}
                      </pre>
                    </div>
                  );
                })()}
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
                            const subLang = sub.language || "java";
                            setLanguage(subLang);
                            setCode(sub.sourceCode);
                            const probId = currentProblem?.id || "default";
                            if (!codeByLangRef.current[probId]) codeByLangRef.current[probId] = {};
                            codeByLangRef.current[probId][subLang] = sub.sourceCode;
                            setStoredJudgeCode(probId, subLang, sub.sourceCode);
                            setIsDirty(true);
                            setDraftSaved(false);
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

          {/* Bottom Matrix Greeting Ribbon */}
          <div className="border-t border-border/60 bg-muted/20 px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-muted-foreground font-medium font-mono text-[11px] truncate">
              Greetings {studentName}!, Ziphyrus-X welcome you to the Matrix.
            </span>
          </div>
        </div>

        {/* ======================================================================== */}
        {/* RESIZABLE DRAG HANDLE / SPLITTER (Visible on lg screens)                 */}
        {/* ======================================================================== */}
        <div
          role="separator"
          tabIndex={0}
          aria-valuenow={Math.round(leftPanelWidth)}
          aria-label="Resize problem statement width"
          onMouseDown={startDraggingSplitter}
          onTouchStart={startDraggingSplitter}
          onDoubleClick={() => setLeftPanelWidth(46)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              setLeftPanelWidth((w) => Math.max(20, w - 2));
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              setLeftPanelWidth((w) => Math.min(80, w + 2));
            }
          }}
          className={cn(
            "hidden lg:flex w-2.5 shrink-0 items-center justify-center cursor-col-resize group relative select-none z-10 transition-colors mx-0.5",
            isDraggingSplitter && "cursor-col-resize"
          )}
          title="Drag left/right to resize Problem Statement (Double-click to reset to 46%)"
        >
          {/* Visual pill handle */}
          <div
            className={cn(
              "w-1 h-8 rounded-full bg-border/80 group-hover:bg-primary group-hover:h-12 group-hover:w-1.5 transition-all shadow-xs",
              isDraggingSplitter && "bg-primary h-14 w-1.5 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
            )}
          />
        </div>

        {/* ======================================================================== */}
        {/* RIGHT COLUMN: Code Editor (Top) & Execution Console (Bottom)             */}
        {/* ======================================================================== */}
        <div
          style={{ width: `calc(${100 - leftPanelWidth}% - 10px)` }}
          className="h-full min-h-0 flex flex-col flex-1 gap-1.5 overflow-hidden max-lg:!w-full"
        >
          {/* ---------------------------------------------------------------------- */}
          {/* TOP PANE: Code Editor                                                  */}
          {/* ---------------------------------------------------------------------- */}
          <div className={cn("flex flex-col rounded-lg border border-border/70 bg-card/75 backdrop-blur-xl overflow-hidden shadow-xs min-h-0 transition-all duration-200", terminalMaximized ? "hidden" : bottomConsoleExpanded ? "flex-[3_3_0%]" : "flex-1")}>
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

              {/* Action Icons: Prettier, Reset, Save Draft */}
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={formatCode}
                  className="h-6 px-2 text-[11px] gap-1.5 border-border/80 bg-background/80 hover:bg-muted font-mono text-foreground shadow-xs"
                  title="Format Code with Prettier (Alt + Shift + F)"
                >
                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500/20" />
                  <span className="font-semibold">Prettier</span>
                  <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">Alt+Shift+F</span>
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

            {/* Editor Body with Monospace Line Numbers & Dual-Layer VS Code Syntax Highlighter */}
            <div
              ref={editorScrollerRef}
              className="relative flex-1 min-h-0 bg-[#1e1e1e] text-[#d4d4d4] overflow-auto select-text font-mono text-xs"
              style={{ scrollbarGutter: "stable" }}
              onClick={() => {
                textareaRef.current?.focus();
              }}
            >
              <div className="flex min-w-full w-max min-h-full">
                {/* Sticky Line Numbers Gutter */}
                <div
                  className="sticky left-0 top-0 z-20 shrink-0 select-none bg-[#1e1e1e] border-r border-[#2d2d2d] text-right text-[#858585] py-2.5 pr-3 pl-2 cursor-text"
                  style={{ width: "48px" }}
                  onClick={() => textareaRef.current?.focus()}
                >
                  {Array.from({ length: lineCount }).map((_, idx) => {
                    const lineNum = idx + 1;
                    const isCurrentLine = cursorPos.line === lineNum;
                    return (
                      <div
                        key={lineNum}
                        style={{ height: "24px", lineHeight: "24px" }}
                        className={cn(
                          "transition-colors",
                          isCurrentLine ? "text-[#c6c6c6] font-semibold" : ""
                        )}
                      >
                        {lineNum}
                      </div>
                    );
                  })}
                </div>

                {/* Code Body Grid: Pre layer and Textarea in EXACT same cell */}
                <div
                  className="relative flex-1 min-w-[500px] min-h-full cursor-text"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gridTemplateRows: "1fr",
                  }}
                  onClick={() => textareaRef.current?.focus()}
                >
                  {/* Active Line Background Highlight Strip */}
                  <div
                    className="absolute left-0 right-0 pointer-events-none bg-white/[0.04] border-y border-white/[0.07] z-0"
                    style={{
                      top: `${Math.max(0, (cursorPos.line - 1) * 24 + 10)}px`,
                      height: "24px",
                    }}
                  />

                  {/* Layer 1: Syntax Highlighted Layer (Non-interactive, visual only) */}
                  <pre
                    aria-hidden="true"
                    style={{
                      gridArea: "1 / 1 / 2 / 2",
                      margin: 0,
                      padding: "10px 14px",
                      boxSizing: "border-box",
                      fontFamily: '"JetBrains Mono", Consolas, "Fira Code", Monaco, Menlo, monospace',
                      fontSize: "13px",
                      lineHeight: "24px",
                      letterSpacing: "0px",
                      wordSpacing: "0px",
                      fontVariantLigatures: "none",
                      tabSize: 4,
                      MozTabSize: 4,
                      whiteSpace: "pre",
                      wordBreak: "keep-all",
                      overflowWrap: "normal",
                      pointerEvents: "none",
                      userSelect: "none",
                      zIndex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      overflow: "hidden",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: (highlightedHtml || "&nbsp;") + (code.endsWith("\n") ? "\n " : ""),
                    }}
                  />

                  {/* Layer 2: Textarea (Front, transparent text, caret & selection visible) */}
                  <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={handleCodeChange}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleCursorEvent}
                    onClick={handleCursorEvent}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    style={{
                      gridArea: "1 / 1 / 2 / 2",
                      margin: 0,
                      padding: "10px 14px",
                      boxSizing: "border-box",
                      fontFamily: '"JetBrains Mono", Consolas, "Fira Code", Monaco, Menlo, monospace',
                      fontSize: "13px",
                      lineHeight: "24px",
                      letterSpacing: "0px",
                      wordSpacing: "0px",
                      fontVariantLigatures: "none",
                      tabSize: 4,
                      MozTabSize: 4,
                      whiteSpace: "pre",
                      wordBreak: "keep-all",
                      overflowWrap: "normal",
                      border: "none",
                      outline: "none",
                      resize: "none",
                      overflow: "hidden",
                      background: "transparent",
                      color: "transparent",
                      WebkitTextFillColor: "transparent",
                      caretColor: "#58a6ff",
                      zIndex: 2,
                    }}
                    className="selection:bg-[#264f78]/80 selection:text-transparent"
                    placeholder="// Let's code flow in your veins..."
                  />
                </div>
              </div>
            </div>

            {/* Editor Footer Status Bar (VS Code Look) */}
            <div className="shrink-0 border-t border-border/50 bg-[#181818] px-3 py-1 flex items-center justify-between text-[11px] font-mono text-muted-foreground select-none">
              <div className="flex items-center gap-2">
                {draftSaved ? (
                  <span className="flex items-center gap-1 text-emerald-500">
                    <Check className="w-3 h-3" />
                    <span>Saved</span>
                  </span>
                ) : (
                  <span className="text-amber-500">Unsaved changes</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline">Spaces: 4</span>
                <span className="hidden sm:inline">UTF-8</span>
                <span className="capitalize">{language}</span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  <span>Prettier</span>
                </span>
                <span>
                  Ln {cursorPos.line}, Col {cursorPos.col}
                </span>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------------- */}
          {/* BOTTOM PANE: High-Tech Integrated Execution Terminal & Test Console     */}
          {/* ---------------------------------------------------------------------- */}
          <div
            className={cn(
              "rounded-lg border border-border/70 bg-card/85 backdrop-blur-xl overflow-hidden shadow-sm flex flex-col min-h-0 transition-all duration-200",
              terminalMaximized
                ? "flex-1 h-full min-h-0"
                : bottomConsoleExpanded
                ? "flex-[2_2_0%] min-h-[190px]"
                : "h-9 shrink-0"
            )}
          >
            {/* Header: macOS Traffic Lights + Tab Navigation + Quick Actions */}
            <div className="shrink-0 border-b border-border/60 bg-muted/30 px-3 py-1.5 flex items-center justify-between text-xs select-none">
              <div className="flex items-center gap-3">
                {/* macOS Terminal Traffic Light Controls */}
                <div className="flex items-center gap-1.5">
                  <span
                    onClick={handleClearTerminal}
                    title="Clear Terminal Output"
                    className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] hover:brightness-125 cursor-pointer transition-all shadow-[0_0_4px_rgba(255,95,86,0.5)]"
                  />
                  <span
                    onClick={() => setBottomConsoleExpanded(!bottomConsoleExpanded)}
                    title={bottomConsoleExpanded ? "Collapse Console" : "Expand Console"}
                    className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] hover:brightness-125 cursor-pointer transition-all shadow-[0_0_4px_rgba(255,189,46,0.5)]"
                  />
                  <span
                    onClick={() => {
                      if (!bottomConsoleExpanded) setBottomConsoleExpanded(true);
                      setTerminalMaximized(!terminalMaximized);
                    }}
                    title={terminalMaximized ? "Restore Console Height" : "Maximize Terminal"}
                    className="w-2.5 h-2.5 rounded-full bg-[#27c93f] hover:brightness-125 cursor-pointer transition-all shadow-[0_0_4px_rgba(39,201,63,0.5)]"
                  />
                </div>

                <div className="h-3 w-px bg-border/60" />

                {/* Main Console Tabs */}
                <div className="flex items-center gap-1 font-sans">
                  <button
                    type="button"
                    onClick={() => setActiveBottomTab("result")}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all font-sans",
                      activeBottomTab === "result"
                        ? "bg-background text-foreground shadow-xs font-medium border border-border/60"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-normal"
                    )}
                  >
                    <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Terminal</span>
                    {(sampleResult || submissionResult) && (
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          submissionResult?.status === "accepted" || sampleResult?.status === "sample_passed"
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-rose-500"
                        )}
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveBottomTab("testcase");
                      setIsCustomCaseActive(false);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all font-sans",
                      activeBottomTab === "testcase" && !isCustomCaseActive
                        ? "bg-background text-foreground shadow-xs font-medium border border-border/60"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-normal"
                    )}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Test Cases</span>
                    {sampleResult?.results && (
                      <span className="text-[10px] px-1 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                        {sampleResult.passedSampleCases}/{sampleResult.totalSampleCases}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveBottomTab("testcase");
                      setIsCustomCaseActive(true);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all font-sans",
                      activeBottomTab === "testcase" && isCustomCaseActive
                        ? "bg-background text-foreground shadow-xs font-medium border border-border/60"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-normal"
                    )}
                  >
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Custom Input</span>
                    {customResult && (
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          customResult.passed ? "bg-emerald-500" : "bg-rose-500"
                        )}
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveBottomTab("telemetry")}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all font-sans",
                      activeBottomTab === "telemetry"
                        ? "bg-background text-foreground shadow-xs font-medium border border-border/60"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-normal"
                    )}
                  >
                    <Activity className="w-3.5 h-3.5 text-amber-500" />
                    <span>Telemetry</span>
                    {submissionResult?.githubSynced && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Right Side Quick Actions & Telemetry Indicator */}
              <div className="flex items-center gap-1 font-sans">
                {/* Live Sandbox Status Indicator */}
                <div className="hidden sm:flex items-center gap-1.5 mr-1.5 px-2 py-0.5 rounded-full bg-muted/40 border border-border/40 text-[10px] text-muted-foreground">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      running || submitting
                        ? "bg-amber-400 animate-ping"
                        : sampleResult || submissionResult
                        ? "bg-emerald-500"
                        : "bg-slate-400"
                    )}
                  />
                  <span>
                    {running || submitting
                      ? "evaluating"
                      : sampleResult || submissionResult
                      ? submissionResult?.status || sampleResult?.status || "ready"
                      : "idle"}
                  </span>
                </div>

                {/* Word Wrap Toggle */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setTerminalWordWrap(!terminalWordWrap)}
                  className={cn(
                    "h-6 w-6 text-muted-foreground hover:text-foreground",
                    terminalWordWrap && "text-foreground bg-muted/50"
                  )}
                  title={terminalWordWrap ? "Disable Word Wrap" : "Enable Word Wrap"}
                >
                  <TextWrap className="w-3.5 h-3.5" />
                </Button>

                {/* Copy Terminal Output */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCopyTerminalOutput}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title="Copy Output"
                >
                  {terminalCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>

                {/* Clear Output */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleClearTerminal}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title="Clear Terminal"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>

                {/* Maximize / Restore Toggle */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (!bottomConsoleExpanded) setBottomConsoleExpanded(true);
                    setTerminalMaximized(!terminalMaximized);
                  }}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground hidden sm:flex"
                  title={terminalMaximized ? "Restore Height" : "Maximize Console"}
                >
                  {terminalMaximized ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </Button>

                {/* Expand / Collapse Console */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setBottomConsoleExpanded(!bottomConsoleExpanded)}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title={bottomConsoleExpanded ? "Collapse Console" : "Expand Console"}
                >
                  {bottomConsoleExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Bottom Console Content */}
            {bottomConsoleExpanded && (
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 bg-background/40 flex flex-col">
                {/* ================================================================ */}
                {/* TAB 1: INTEGRATED DEVELOPER TERMINAL (>_ Terminal)              */}
                {/* ================================================================ */}
                {activeBottomTab === "result" && (
                  <div className="flex-1 flex flex-col space-y-2.5">
                    {/* Terminal Glass Container */}
                    <div className="rounded-lg bg-[#080c14] border border-[#182033] shadow-2xl overflow-hidden font-mono text-xs flex flex-col relative select-text">
                      {/* Top Glowing Cyan Accent Sheen */}
                      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent pointer-events-none" />

                      {/* Inner Shell Breadcrumbs & Execution Metadata */}
                      <div className="shrink-0 px-3 py-1.5 bg-[#0b101c] border-b border-[#1b253b] flex items-center justify-between text-[11px] font-mono select-none">
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-400 font-bold">ziphyrus@matrix</span>
                          <span className="text-slate-600">:</span>
                          <span className="text-emerald-400">
                            ~/judge/{currentProblem?.code || "PRB-0001"}
                          </span>
                          <span className="text-slate-600 font-sans text-[10px] hidden sm:inline">
                            (main)
                          </span>
                          <span className="text-cyan-400">❯</span>
                          <span className="text-slate-200">
                            solution.
                            {language === "python"
                              ? "py"
                              : language === "javascript"
                              ? "js"
                              : language === "cpp"
                              ? "cpp"
                              : "java"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-[#131c2e] text-slate-300 border border-[#212f4b] hidden md:inline">
                            {language.toUpperCase()} 21
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#131c2e] text-slate-300 border border-[#212f4b] hidden sm:inline">
                            cgroups • 256MB
                          </span>
                          {(sampleResult || submissionResult) && (
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded font-bold border",
                                submissionResult?.status === "accepted" ||
                                  sampleResult?.status === "sample_passed"
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(52,211,153,0.2)]"
                                  : "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]"
                              )}
                            >
                              {submissionResult?.status === "accepted" ||
                              sampleResult?.status === "sample_passed"
                                ? "EXIT 0 (PASS)"
                                : "EXIT 1 (FAIL)"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Screen Content: Evaluating / Idle / Output Stream */}
                      {running || submitting ? (
                        /* Running / Evaluating Animated Stream */
                        <div className="p-4 space-y-3 text-slate-300">
                          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                            <Terminal className="w-4 h-4 animate-spin" />
                            <span>
                              ❯ zx-judge evaluate --problem={currentProblem?.code || "PRB"} --lang={language}
                            </span>
                          </div>

                          <div className="pl-6 space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 text-emerald-400">
                              <Check className="w-3.5 h-3.5" />
                              <span>[1/3] Parsed AST and validated syntax tokens</span>
                            </div>
                            <div className="flex items-center gap-2 text-cyan-400 font-medium animate-pulse">
                              <span className="w-3.5 h-3.5 inline-block rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                              <span>[2/3] Spawning isolated Linux cgroups runtime container...</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <span className="w-3.5 h-3.5 inline-block rounded-full bg-slate-800" />
                              <span>[3/3] Streaming test suites through stdin/stdout channel...</span>
                            </div>
                          </div>

                          <div className="pt-2">
                            <div className="h-1.5 w-full bg-[#111827] rounded-full overflow-hidden border border-cyan-900/30">
                              <div className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-indigo-500 rounded-full animate-pulse w-3/4 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                            </div>
                          </div>
                        </div>
                      ) : !sampleResult && !submissionResult ? (
                        /* Hacker Terminal Welcome Standby Screen */
                        <div className="p-4 space-y-3 text-slate-300">
                          <div className="text-cyan-400/80 text-[11px] leading-tight select-none font-bold">
                            <div>┌─────────────────────────────────────────────────────────────────┐</div>
                            <div>│  Z I P H Y R U S - X   E X E C U T I O N   M A T R I X          │</div>
                            <div>│  High-Performance Algorithmic Sandbox (Alpine 3.19 • x86_64)    │</div>
                            <div>└─────────────────────────────────────────────────────────────────┘</div>
                          </div>

                          <div className="space-y-1 text-xs text-slate-400">
                            <div>
                              <span className="text-slate-500">Target Problem : </span>
                              <span className="text-slate-200 font-semibold">
                                {currentProblem?.title || "Problem"}
                              </span>
                              <span className="text-slate-500"> ({currentProblem?.code})</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Active Compiler : </span>
                              <span className="text-emerald-400 font-medium">
                                {language.toUpperCase()} Runtime
                              </span>
                              <span className="text-slate-500"> • Ceiling: 256MB RAM / 2000ms CPU</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Session Status  : </span>
                              <span className="text-cyan-400 font-semibold">STANDBY</span>
                              <span className="text-slate-500"> — Sandbox primed & awaiting execution</span>
                            </div>
                          </div>

                          <div className="pt-2 flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              onClick={handleRunSample}
                              className="h-7 px-3 text-xs gap-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white font-sans font-normal rounded transition-all shadow-none"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span className="font-sans font-normal">Run Sample Tests</span>
                              <span className="text-[10px] opacity-60 font-sans font-light tracking-tight">(Ctrl+')</span>
                            </Button>

                            <Button
                              size="sm"
                              onClick={handleSubmit}
                              className="h-7 px-3 text-xs gap-1.5 bg-primary/90 hover:bg-primary text-primary-foreground font-sans font-normal rounded transition-all shadow-none"
                            >
                              <Send className="w-3 h-3" />
                              <span className="font-sans font-normal">Submit to Matrix</span>
                              <span className="text-[10px] opacity-60 font-sans font-light tracking-tight">(Ctrl+Enter)</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActiveBottomTab("testcase");
                                setIsCustomCaseActive(true);
                              }}
                              className="h-7 px-2.5 text-xs gap-1.5 border-border/70 hover:bg-muted/40 text-muted-foreground hover:text-foreground font-sans font-normal rounded transition-all shadow-none"
                            >
                              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="font-sans font-normal">Custom Input</span>
                            </Button>
                          </div>

                          <div className="pt-2 text-slate-500 text-[11px] flex items-center">
                            <span className="text-cyan-400 font-bold">ziphyrus@matrix</span>
                            <span className="text-slate-600">:</span>
                            <span className="text-emerald-400">~/judge</span>
                            <span className="text-cyan-400 ml-1">❯</span>
                            <span className="text-slate-400 ml-1.5">awaiting execution trigger</span>
                            <span className="inline-block w-2 h-3.5 bg-emerald-400 animate-pulse ml-1 align-middle shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                          </div>
                        </div>
                      ) : (
                        /* Line-Numbered Monospaced Stream with Rich Syntax */
                        <div
                          className={cn(
                            "p-3 font-mono text-xs leading-relaxed overflow-y-auto max-h-[360px]",
                            terminalWordWrap ? "break-words" : "overflow-x-auto whitespace-pre"
                          )}
                        >
                          {(
                            submissionResult?.terminalOutput ||
                            sampleResult?.terminalOutput ||
                            submissionResult?.compileError ||
                            sampleResult?.compileError ||
                            "$ run solution\nExecution completed with status: " +
                              (sampleResult?.status || submissionResult?.status || "done")
                          )
                            .split("\n")
                            .map((line: string, idx: number) => {
                              const lineNum = (idx + 1).toString().padStart(2, "0");
                              let content = <span>{line || "\u00A0"}</span>;

                              if (line.startsWith("$") || line.startsWith("❯")) {
                                content = (
                                  <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                                    <span className="text-emerald-400">❯</span>
                                    <span>{line.replace(/^[$❯]\s*/, "")}</span>
                                  </span>
                                );
                              } else if (
                                line.includes("error:") ||
                                line.includes("SyntaxError:") ||
                                line.includes("NameError:") ||
                                line.includes("ReferenceError:") ||
                                line.includes("IndentationError:") ||
                                line.includes("TypeError:") ||
                                line.includes("ArithmeticException:") ||
                                line.includes("ZeroDivisionError:") ||
                                line.includes("NullPointerException:") ||
                                line.includes("ArrayIndexOutOfBoundsException:") ||
                                line.includes("IndexError:") ||
                                line.includes("Floating point exception") ||
                                line.includes("Time Limit Exceeded") ||
                                line.includes("cannot find symbol") ||
                                line.includes("missing return statement") ||
                                line.includes("incompatible types") ||
                                line.includes("Error:")
                              ) {
                                content = (
                                  <span className="text-rose-400 font-bold bg-rose-500/15 border-l-2 border-rose-500 px-1.5 py-0.5 rounded inline-block">
                                    {line}
                                  </span>
                                );
                              } else if (line.includes("^")) {
                                content = (
                                  <span className="text-amber-400 font-bold">{line}</span>
                                );
                              } else if (
                                line.includes("✓") ||
                                line.includes("[PASS]") ||
                                line.includes("ACCEPTED") ||
                                line.includes("Passed")
                              ) {
                                content = (
                                  <span className="text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 inline-block">
                                    {line}
                                  </span>
                                );
                              } else if (
                                line.includes("✗") ||
                                line.includes("[FAIL]") ||
                                line.includes("WRONG ANSWER")
                              ) {
                                content = (
                                  <span className="text-rose-400 font-medium bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 inline-block">
                                    {line}
                                  </span>
                                );
                              } else if (line.startsWith("Process exited with code")) {
                                content = (
                                  <span className="text-slate-400 font-semibold pt-1 border-t border-slate-800/80 mt-1 block">
                                    {line}
                                  </span>
                                );
                              } else {
                                content = <span className="text-slate-300">{line || "\u00A0"}</span>;
                              }

                              return (
                                <div
                                  key={idx}
                                  className="flex items-start hover:bg-slate-900/50 rounded px-1 -mx-1"
                                >
                                  <span className="w-8 shrink-0 select-none text-slate-600 font-mono text-[11px] text-right pr-2.5 border-r border-slate-800/80 mr-3">
                                    {lineNum}
                                  </span>
                                  <div className="flex-1 min-w-0">{content}</div>
                                </div>
                              );
                            })}

                          <div className="pt-2 flex items-center text-slate-500 text-[11px]">
                            <span className="w-8 shrink-0 text-slate-700 text-right pr-2.5 border-r border-slate-800/80 mr-3 select-none">
                              ➜
                            </span>
                            <span className="text-cyan-400 font-bold">ziphyrus@matrix</span>
                            <span className="text-slate-600">:</span>
                            <span className="text-emerald-400">~/judge</span>
                            <span className="text-cyan-400 ml-1">❯</span>
                            <span className="inline-block w-2 h-3.5 bg-emerald-400 animate-pulse ml-1 align-middle shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interactive Custom Input Option in Terminal */}
                    <div className="rounded-lg bg-[#080d19] border border-[#1b253b] p-2.5 space-y-2 select-text">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-sans text-muted-foreground">
                          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-foreground font-medium text-xs">Custom Input Option</span>
                          <span className="text-slate-400 text-[11px] hidden sm:inline">— run custom stdin through matrix sandbox</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground mr-1 hidden sm:inline">Presets:</span>
                          {(currentProblem?.testCases || []).slice(0, 3).map((tc, idx) => (
                            <button
                              key={tc.id || idx}
                              type="button"
                              onClick={() => {
                                setCustomInput(tc.input);
                                toast.info(`Loaded preset Case ${idx + 1}`);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-colors"
                            >
                              Case {idx + 1}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cyan-400 font-mono text-xs select-none">
                            ❯
                          </span>
                          <Input
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleRunCustom();
                              }
                            }}
                            placeholder="e.g. nums = [2,7,11,15], target = 9"
                            className="pl-7 h-8 text-xs font-mono bg-[#040711] border-slate-800 text-slate-200 placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                          />
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleRunCustom()}
                          disabled={runningCustom || running}
                          className="h-8 px-3 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-normal shrink-0 rounded transition-all shadow-none"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>{runningCustom ? "Running…" : "Run Custom Input"}</span>
                        </Button>
                      </div>

                      {customResult && (
                        <div
                          className={cn(
                            "p-2 rounded border text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 transition-all",
                            customResult.passed
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : customResult.status === "compile_error"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {customResult.passed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : customResult.status === "compile_error" ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            )}
                            <span className="font-semibold text-xs">
                              {customResult.passed
                                ? "Custom Case Passed"
                                : customResult.status === "compile_error"
                                ? "Compiler Error"
                                : "Wrong Answer (Mismatch)"}
                            </span>
                            <span className="text-slate-400 text-[11px] truncate">
                              | Output: <code className="text-slate-200 font-mono">{customResult.actualOutput}</code>
                              {" "}| Expected: <code className="text-slate-200 font-mono">{customResult.expectedOutput}</code>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0 font-sans">
                            <span>⚡ {customResult.executionTimeMs} ms</span>
                            <span>•</span>
                            <span>🧠 {customResult.memoryUsedMb} MB</span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveBottomTab("testcase");
                                setIsCustomCaseActive(true);
                              }}
                              className="text-cyan-400 hover:underline ml-1"
                            >
                              Expand View ↗
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sample Test Result Quick Cards */}
                    {sampleResult && sampleResult.results && sampleResult.results.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono px-0.5">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Sample Validation Benchmark:</span>
                          </span>
                          <span>
                            Runtime: <strong className="text-foreground">{sampleResult.executionTimeMs} ms</strong> • Memory: <strong className="text-foreground">{sampleResult.memoryUsedMb} MB</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {sampleResult.results.map((r: any, idx: number) => (
                            <div
                              key={idx}
                              className={cn(
                                "p-2 rounded border text-[11px] font-mono flex items-center justify-between transition-colors",
                                r.passed
                                  ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-700 dark:text-emerald-400"
                                  : "bg-rose-500/5 border-rose-500/25 text-rose-700 dark:text-rose-400"
                              )}
                            >
                              <div className="flex items-center gap-1.5">
                                {r.passed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                )}
                                <span className="font-medium">Case {r.orderIndex}</span>
                              </div>
                              <span className="text-[10px]">{r.passed ? `${r.executionTimeMs}ms` : "Wrong Output"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Full Submission Banner & GitHub Continuous Sync */}
                    {submissionResult && (
                      <div className="space-y-2 pt-1 border-t border-border/40">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={cn(
                              "font-bold flex items-center gap-1.5",
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
                                <span>Accepted (Score: {submissionResult.score}/100)</span>
                              </>
                            ) : submissionResult.status === "compile_error" ? (
                              <>
                                <AlertTriangle className="w-4 h-4" />
                                <span>Compile Error (Score: 0/100)</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4" />
                                <span>Wrong Answer (Score: {submissionResult.score}/100)</span>
                              </>
                            )}
                          </span>

                          <div className="flex items-center gap-3 text-muted-foreground text-[11px] font-mono">
                            <span>
                              Testcases: {submissionResult.testCasesPassed}/{submissionResult.totalTestCases}
                            </span>
                          </div>
                        </div>

                        {submissionResult.githubSynced && (
                          <div className="p-2.5 rounded bg-muted/30 border border-border flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <GitBranch className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <div className="min-w-0">
                                <span className="font-semibold text-foreground">
                                  Synced to Student GitHub
                                </span>
                                <span className="block font-mono text-[11px] text-muted-foreground truncate">
                                  {submissionResult.githubRepoName || targetRepo} &bull; {submissionResult.githubFilePath}
                                </span>
                              </div>
                            </div>
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono shrink-0">
                              Commit: {submissionResult.githubCommitSha?.slice(0, 10)}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ================================================================ */}
                {/* TAB 2: INTERACTIVE TEST CASE RUNNER (☑ Test Cases)              */}
                {/* ================================================================ */}
                {activeBottomTab === "testcase" && (() => {
                  const problemTestCases =
                    currentProblem?.testCases && currentProblem.testCases.length > 0
                      ? currentProblem.testCases
                      : [
                          { id: "sample-1", orderIndex: 1, input: "nums = [2,7,11,15], target = 9", expectedOutput: "[0,1]" },
                          { id: "sample-2", orderIndex: 2, input: "nums = [3,2,4], target = 6", expectedOutput: "[1,2]" },
                          { id: "sample-3", orderIndex: 3, input: "nums = [3,3], target = 6", expectedOutput: "[0,1]" },
                        ];
                  const activeTestCase = problemTestCases[activeCaseIndex] || problemTestCases[0];
                  const activeSampleResult = sampleResult?.results?.find(
                    (r: any) => r.orderIndex === (activeCaseIndex + 1)
                  );

                  return (
                    <div className="space-y-3 font-sans">
                      {/* Case Pill Selector */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {problemTestCases.map((tc: any, idx: number) => {
                          const res = sampleResult?.results?.find((r: any) => r.orderIndex === (idx + 1));
                          const isActive = !isCustomCaseActive && activeCaseIndex === idx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setActiveCaseIndex(idx);
                                setIsCustomCaseActive(false);
                              }}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-all border font-sans",
                                isActive
                                  ? "bg-muted text-foreground border-border font-medium shadow-xs"
                                  : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/40 font-normal"
                              )}
                            >
                              {res && (
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    res.passed ? "bg-emerald-500" : "bg-rose-500"
                                  )}
                                />
                              )}
                              <span>Case {idx + 1}</span>
                            </button>
                          );
                        })}

                        {/* Custom Input Pill in the Selector */}
                        <button
                          type="button"
                          onClick={() => setIsCustomCaseActive(true)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-all border font-sans",
                            isCustomCaseActive
                              ? "bg-muted text-foreground border-border font-medium shadow-xs"
                              : "bg-transparent text-muted-foreground border-dashed border-border/70 hover:bg-muted/40 font-normal"
                          )}
                        >
                          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Custom Input</span>
                          {customResult && (
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                customResult.passed ? "bg-emerald-500" : "bg-rose-500"
                              )}
                            />
                          )}
                        </button>
                      </div>

                      {/* Content: Either Custom Input Sandbox OR Standard Case Inspector */}
                      {isCustomCaseActive ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                                Custom Input Stdin
                              </span>
                              <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30 font-mono py-0 px-1.5">
                                live-eval
                              </Badge>
                            </div>

                            {/* Quick Preset Fillers */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground mr-1 hidden sm:inline">Load Preset:</span>
                              {problemTestCases.map((tc: any, idx: number) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setCustomInput(tc.input);
                                    toast.info(`Loaded preset Case ${idx + 1}`);
                                  }}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-colors"
                                >
                                  Case {idx + 1}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Textarea for Custom Input */}
                          <div className="space-y-2">
                            <textarea
                              value={customInput}
                              onChange={(e) => setCustomInput(e.target.value)}
                              rows={3}
                              placeholder="Enter custom stdin string, e.g. nums = [2,7,11,15], target = 9"
                              className="w-full p-2.5 rounded bg-muted/30 border border-border/60 text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/60 transition-colors resize-y min-h-[75px]"
                            />

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleRunCustom()}
                                  disabled={runningCustom || running}
                                  className="h-7.5 px-3.5 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-normal rounded-md transition-all shadow-none"
                                >
                                  <Play className="w-3.5 h-3.5 fill-white" />
                                  <span>{runningCustom ? "Evaluating on Matrix…" : "Run Custom Input"}</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setCustomInput(problemTestCases[0]?.input || "");
                                    toast.info("Reset custom input to default");
                                  }}
                                  className="h-7.5 px-2.5 text-xs gap-1 text-muted-foreground font-sans font-normal rounded-md border-border/60"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Reset</span>
                                </Button>
                              </div>

                              <span className="text-[10px] text-muted-foreground font-mono">
                                {customInput.length} chars
                              </span>
                            </div>
                          </div>

                          {/* Custom Input Output & Expected Ground Truth Breakdown */}
                          {customResult && (
                            <div className="space-y-2 pt-2 border-t border-border/50">
                              <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-2 font-medium">
                                  <span>Verdict:</span>
                                  <Badge
                                    className={cn(
                                      "text-[10px] font-normal px-2 py-0.5 border",
                                      customResult.passed
                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                        : customResult.status === "compile_error"
                                        ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                        : "bg-rose-500/10 text-rose-500 border-rose-500/30"
                                    )}
                                  >
                                    {customResult.passed ? (
                                      <span className="flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                        <span>Match (Passed)</span>
                                      </span>
                                    ) : customResult.status === "compile_error" ? (
                                      <span className="flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                        <span>Compiler / Runtime Error</span>
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1">
                                        <XCircle className="w-3 h-3 text-rose-500" />
                                        <span>Mismatch (Wrong Answer)</span>
                                      </span>
                                    )}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px]">
                                  <span>⏱ {customResult.executionTimeMs} ms</span>
                                  <span>💾 {customResult.memoryUsedMb} MB</span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveBottomTab("result")}
                                    className="text-cyan-400 hover:underline font-sans text-[11px]"
                                  >
                                    View Terminal Stream &rarr;
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                                    Ground Truth Expected Output
                                  </span>
                                  <div className="p-2.5 rounded bg-muted/40 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-xs overflow-x-auto select-all">
                                    {customResult.expectedOutput || "(none)"}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                                    Your Solution Output
                                  </span>
                                  <div
                                    className={cn(
                                      "p-2.5 rounded border font-mono text-xs overflow-x-auto select-all",
                                      customResult.passed
                                        ? "bg-muted/40 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                        : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                                    )}
                                  >
                                    {customResult.actualOutput || customResult.compileError || "(none)"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Case Input & Output Inspector */
                        <div className="space-y-2.5">
                          <div className="space-y-1">
                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                              Input
                            </span>
                            <div className="p-2.5 rounded bg-muted/40 border border-border/50 text-foreground font-mono text-xs overflow-x-auto select-all">
                              {activeTestCase?.input}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                              Expected Output
                            </span>
                            <div className="p-2.5 rounded bg-muted/40 border border-border/50 text-foreground font-mono text-xs overflow-x-auto select-all">
                              {activeTestCase?.expectedOutput}
                            </div>
                          </div>

                          {activeSampleResult && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground uppercase tracking-wider font-medium">
                                  Actual Output
                                </span>
                                <span
                                  className={cn(
                                    "font-bold text-[10px] px-1.5 py-0.5 rounded border",
                                    activeSampleResult.passed
                                      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
                                      : "text-rose-500 bg-rose-500/10 border-rose-500/30"
                                  )}
                                >
                                  {activeSampleResult.passed ? "Match (Passed)" : "Mismatch (Wrong Answer)"}
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "p-2.5 rounded border font-mono text-xs overflow-x-auto select-all",
                                  activeSampleResult.passed
                                    ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                    : "bg-rose-500/5 border-rose-500/30 text-rose-600 dark:text-rose-400"
                                )}
                              >
                                {activeSampleResult.actualOutput}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ================================================================ */}
                {/* TAB 3: TELEMETRY & GITHUB SYNC (⚡ Telemetry)                    */}
                {/* ================================================================ */}
                {activeBottomTab === "telemetry" && (
                  <div className="space-y-3 font-mono">
                    {/* Grid of Key Benchmark Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Runtime</span>
                        </div>
                        <div className="text-lg font-bold text-foreground">
                          {sampleResult?.executionTimeMs || submissionResult?.executionTimeMs || 22} ms
                        </div>
                        <div className="text-[10px] text-emerald-500 font-sans">
                          ⚡ Faster than 88.5%
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Memory</span>
                        </div>
                        <div className="text-lg font-bold text-foreground">
                          {sampleResult?.memoryUsedMb || submissionResult?.memoryUsedMb || 15.2} MB
                        </div>
                        <div className="text-[10px] text-emerald-500 font-sans">
                          Optimal footprint
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          <span>Accuracy</span>
                        </div>
                        <div className="text-lg font-bold text-foreground">
                          {submissionResult
                            ? `${submissionResult.score}%`
                            : sampleResult
                            ? `${Math.round((sampleResult.passedSampleCases / sampleResult.totalSampleCases) * 100)}%`
                            : "100%"}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-sans">
                          {submissionResult
                            ? `${submissionResult.testCasesPassed}/${submissionResult.totalTestCases} Cases`
                            : sampleResult
                            ? `${sampleResult.passedSampleCases}/${sampleResult.totalSampleCases} Samples`
                            : "Awaiting run"}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Layers className="w-3.5 h-3.5 text-amber-400" />
                          <span>Complexity</span>
                        </div>
                        <div className="text-sm font-bold text-foreground pt-0.5">
                          O(N) <span className="text-xs font-normal text-muted-foreground">time</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-sans">
                          O(N) space ceiling
                        </div>
                      </div>
                    </div>

                    {/* GitHub Continuous Synchronization Card */}
                    <div className="p-3 rounded-lg border border-border/60 bg-gradient-to-r from-muted/30 to-muted/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-emerald-500" />
                          <span className="font-semibold text-xs text-foreground">
                            Student GitHub Continuous Sync
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono text-[10px]",
                            submissionResult?.githubSynced
                              ? "text-emerald-500 border-emerald-500/40 bg-emerald-500/10"
                              : "text-muted-foreground"
                          )}
                        >
                          {submissionResult?.githubSynced ? "Auto-synced" : "Ready on Accepted"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded bg-background/60 border border-border/40">
                          <span className="text-[10px] text-muted-foreground block">Target Repository</span>
                          <span className="text-foreground font-semibold">
                            {submissionResult?.githubRepoName || targetRepo}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-background/60 border border-border/40">
                          <span className="text-[10px] text-muted-foreground block">Language File Path</span>
                          <span className="text-foreground font-semibold">
                            {submissionResult?.githubFilePath ||
                              `${language === "python" ? "Python" : language === "cpp" ? "Cpp" : language === "javascript" ? "JavaScript" : "Java"}/solution.${language === "python" ? "py" : language === "cpp" ? "cpp" : language === "javascript" ? "js" : "java"}`}
                          </span>
                        </div>
                      </div>

                      {submissionResult?.githubCommitSha && (
                        <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1">
                          <span>
                            Commit: <code className="text-primary font-mono">{submissionResult.githubCommitSha}</code>
                          </span>
                          <span className="text-emerald-500 font-sans text-[11px]">✓ Pushed to origin/main</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* LEETCODE PROBLEM LIST FLYOUT DRAWER (SLIDE-OVER PANEL)                      */}
      {/* -------------------------------------------------------------------------- */}
      {/* Overlay Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-200",
          problemListOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setProblemListOpen(false)}
      />

      {/* Flyout Panel Drawer */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-full max-w-[380px] sm:max-w-[410px] bg-[#1a1a1a] text-neutral-200 shadow-2xl border-r border-[#2c2c2c] flex flex-col transition-transform duration-300 ease-out select-none font-sans",
          problemListOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="shrink-0 px-4 py-3.5 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-white tracking-tight">
            <span>Problem List</span>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="flex items-center gap-3">
            {/* Solved Counter */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-sans">
              <span className="w-2.5 h-2.5 rounded-full border border-neutral-500 inline-block" />
              <span>{solvedCount}/{problems.length || 0} Solved</span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setProblemListOpen(false)}
              className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-[#282828] transition-colors"
              title="Close Problem List"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search, Sort & Filter Row */}
        <div className="shrink-0 px-3.5 py-2.5 border-b border-[#242424] flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search questions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-7 text-xs bg-[#282828] text-white placeholder:text-neutral-500 rounded-lg border border-transparent focus:border-neutral-600 focus:outline-none transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs w-4 h-4 flex items-center justify-center rounded-full hover:bg-neutral-700"
              >
                ×
              </button>
            )}
          </div>

          {/* Sort Button */}
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === "default" ? "asc" : prev === "asc" ? "desc" : "default")}
            className={cn(
              "h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white transition-colors border border-transparent",
              sortOrder !== "default" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" : "bg-[#282828] hover:bg-[#323232]"
            )}
            title={`Sort: ${sortOrder === "default" ? "Default Order" : sortOrder === "asc" ? "Title (A-Z)" : "Title (Z-A)"}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          {/* Difficulty Filter Button */}
          <button
            type="button"
            onClick={() => {
              setDifficultyFilter(prev => {
                if (prev === "all") return "Easy";
                if (prev === "Easy") return "Medium";
                if (prev === "Medium") return "Hard";
                return "all";
              });
            }}
            className={cn(
              "h-8 px-2 shrink-0 flex items-center gap-1 rounded-lg text-xs transition-colors border border-transparent",
              difficultyFilter === "all"
                ? "bg-[#282828] hover:bg-[#323232] text-neutral-400 hover:text-white"
                : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
            )}
            title={`Filter Difficulty: ${difficultyFilter}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {difficultyFilter !== "all" && (
              <span className="text-[10px] font-medium">{difficultyFilter === "Medium" ? "Med." : difficultyFilter}</span>
            )}
          </button>
        </div>

        {/* Scrollable Problem Items List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {filteredProblems.map((p, idx) => {
            const isSelected = p.id === currentProblem?.id;
            const diffLabel = p.difficulty === "Medium" ? "Med." : p.difficulty;
            const isSolved = solvedProblemIds.has(p.id);

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedProblemId(p.id);
                  setProblemListOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3.5 py-3 rounded-lg text-xs transition-all flex items-center justify-between group",
                  isSelected
                    ? "bg-white text-neutral-900 font-semibold shadow-md"
                    : "bg-[#242424] hover:bg-[#2c2c2c] text-[#d4d4d4] hover:text-white font-medium"
                )}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  {isSolved && (
                    <CheckCircle2
                      className={cn(
                        "w-3.5 h-3.5 shrink-0",
                        isSelected ? "text-emerald-600" : "text-emerald-400"
                      )}
                    />
                  )}
                  <span className="truncate">
                    {idx + 1}. {p.title}
                  </span>
                </div>

                <span
                  className={cn(
                    "text-xs shrink-0 font-medium",
                    p.difficulty === "Easy"
                      ? isSelected ? "text-emerald-600 font-semibold" : "text-[#00b8a3]"
                      : p.difficulty === "Medium"
                      ? isSelected ? "text-amber-600 font-semibold" : "text-[#ffc01e]"
                      : isSelected ? "text-rose-600 font-semibold" : "text-[#ff375f]"
                  )}
                >
                  {diffLabel}
                </span>
              </button>
            );
          })}

          {filteredProblems.length === 0 && (
            <div className="p-8 text-center text-xs text-neutral-500">
              No questions found matching your filter
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
