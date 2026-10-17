import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Route, getStarterCodeForProblem, isCodeMatchingLanguage } from "../routes/student.judge";

// Mock api client
vi.mock("@/lib/api/client", () => ({
  api: {
    student: {
      judge: {
        problems: vi.fn().mockResolvedValue([
          {
            id: "prob-1",
            code: "PRB-0001",
            title: "Two Sum",
            topic: "Array & Hash Table",
            difficulty: "Easy",
            acceptanceRate: 88,
            solved: false,
          },
        ]),
        problem: vi.fn().mockResolvedValue({
          id: "prob-1",
          code: "PRB-0001",
          title: "Two Sum",
          topic: "Array & Hash Table",
          difficulty: "Easy",
          descriptionHtml: "<p>Two sum problem description</p>",
          examples: [],
          constraints: [],
          testCases: [],
          starterTemplates: {},
        }),
        getDraft: vi.fn().mockResolvedValue(null),
        saveDraft: vi.fn().mockResolvedValue({ success: true }),
        runSample: vi.fn().mockResolvedValue({
          success: true,
          status: "sample_passed",
          totalSampleCases: 3,
          passedSampleCases: 3,
          results: [],
        }),
        submit: vi.fn().mockResolvedValue({
          success: true,
          status: "accepted",
          score: 100,
          totalTestCases: 5,
          testCasesPassed: 5,
        }),
        submissions: vi.fn().mockResolvedValue([]),
        userProfile: vi.fn().mockResolvedValue({
          id: "stu-1",
          name: "Aarav Sharma",
          githubUsername: "aarav-sharma",
          targetRepo: "ZiphyrusX-Aarav-001",
        }),
      },
      profile: vi.fn().mockResolvedValue({
        id: "stu-1",
        name: "Aarav Sharma",
        targetGitHubRepo: "ZiphyrusX-Aarav-001",
      }),
    },
  },
}));

describe("Student Judge Editor Typing Experience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders editor textarea and allows direct typing without error", async () => {
    const Component = Route.options.component;
    expect(Component).toBeDefined();
    if (!Component) return;

    render(<Component />);

    const textarea = await screen.findByPlaceholderText(
      "// Let's code flow in your veins..."
    ) as HTMLTextAreaElement;
    expect(textarea).toBeDefined();

    // Type new text
    act(() => {
      fireEvent.change(textarea, { target: { value: "int sum = a + b;" } });
    });

    expect(textarea.value).toBe("int sum = a + b;");
  });

  it("handles Tab keypress by inserting 4 spaces cleanly", async () => {
    const Component = Route.options.component;
    if (!Component) return;

    render(<Component />);

    const textarea = await screen.findByPlaceholderText(
      "// Let's code flow in your veins..."
    ) as HTMLTextAreaElement;

    act(() => {
      textarea.value = "int x = 10;";
      textarea.selectionStart = 0;
      textarea.selectionEnd = 0;
      fireEvent.change(textarea, { target: { value: "int x = 10;" } });
    });

    act(() => {
      fireEvent.keyDown(textarea, { key: "Tab" });
    });

    expect(textarea.value).toBe("    int x = 10;");
  });

  it("handles auto-closing brackets for opening parentheses", async () => {
    const Component = Route.options.component;
    if (!Component) return;

    render(<Component />);

    const textarea = await screen.findByPlaceholderText(
      "// Let's code flow in your veins..."
    ) as HTMLTextAreaElement;

    act(() => {
      textarea.value = "";
      textarea.selectionStart = 0;
      textarea.selectionEnd = 0;
      fireEvent.change(textarea, { target: { value: "" } });
    });

    act(() => {
      fireEvent.keyDown(textarea, { key: "(" });
    });

    expect(textarea.value).toBe("()");
  });

  it("handles smart backspace between empty brackets", async () => {
    const Component = Route.options.component;
    if (!Component) return;

    render(<Component />);

    const textarea = await screen.findByPlaceholderText(
      "// Let's code flow in your veins..."
    ) as HTMLTextAreaElement;

    act(() => {
      textarea.value = "()";
      textarea.selectionStart = 1;
      textarea.selectionEnd = 1;
      fireEvent.change(textarea, { target: { value: "()" } });
    });

    act(() => {
      fireEvent.keyDown(textarea, { key: "Backspace" });
    });

    expect(textarea.value).toBe("");
  });

  it("handles Ctrl+Z undo cleanly", async () => {
    const Component = Route.options.component;
    if (!Component) return;

    render(<Component />);

    const textarea = await screen.findByPlaceholderText(
      "// Let's code flow in your veins..."
    ) as HTMLTextAreaElement;

    // Start with initial code
    act(() => {
      textarea.value = "int a = 1;";
      textarea.selectionStart = 10;
      textarea.selectionEnd = 10;
      fireEvent.change(textarea, { target: { value: "int a = 1;" } });
    });

    // Press Tab (which pushes to undoStack via applyCodeChange)
    act(() => {
      fireEvent.keyDown(textarea, { key: "Tab" });
    });

    expect(textarea.value).toBe("int a = 1;    ");

    // Press Ctrl+Z
    act(() => {
      fireEvent.keyDown(textarea, { key: "z", ctrlKey: true });
    });

    expect(textarea.value).toBe("int a = 1;");
  });

  it("provides distinct starter boilerplate templates for Java, Python, C++, C, and JavaScript", () => {
    const twoSumProblem = { code: "PRB-0001", title: "Two Sum" };

    const javaCode = getStarterCodeForProblem(twoSumProblem, "java");
    const pythonCode = getStarterCodeForProblem(twoSumProblem, "python");
    const cppCode = getStarterCodeForProblem(twoSumProblem, "cpp");
    const cCode = getStarterCodeForProblem(twoSumProblem, "c");
    const jsCode = getStarterCodeForProblem(twoSumProblem, "javascript");

    expect(javaCode).toContain("public int[] twoSum");
    expect(pythonCode).toContain("def twoSum(self, nums: list[int], target: int) -> list[int]:");
    expect(cppCode).toContain("vector<int> twoSum");
    expect(cCode).toContain("int* twoSum");
    expect(jsCode).toContain("var twoSum = function");

    // All templates must be distinct
    const set = new Set([javaCode, pythonCode, cppCode, cCode, jsCode]);
    expect(set.size).toBe(5);
  });

  it("correctly identifies language code matching via isCodeMatchingLanguage", () => {
    const javaCode = "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        return new int[]{};\n    }\n}";
    const pythonCode = "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        pass";

    expect(isCodeMatchingLanguage(javaCode, "java")).toBe(true);
    expect(isCodeMatchingLanguage(javaCode, "python")).toBe(false);

    expect(isCodeMatchingLanguage(pythonCode, "python")).toBe(true);
    expect(isCodeMatchingLanguage(pythonCode, "java")).toBe(false);
  });
});
