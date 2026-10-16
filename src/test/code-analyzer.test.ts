import { describe, it, expect } from "vitest";
import { analyzeSourceCode } from "../server/code-analyzer";

describe("Static Analysis & Identifier Verification Engine", () => {
  it("passes for valid Java Two Sum solution using HashMap", () => {
    const javaCode = `
class Solution {
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
}
    `;
    const result = analyzeSourceCode("java", javaCode);
    expect(result.hasError).toBe(false);
  });

  it("catches undeclared variable in Java on RHS and generates realistic compiler diagnostic", () => {
    const brokenJavaCode = `
class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - undeclaredVar;
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}
    `;
    const result = analyzeSourceCode("java", brokenJavaCode);
    expect(result.hasError).toBe(true);
    expect(result.errorType).toBe("undeclared_variable");
    expect(result.errorSymbol).toBe("undeclaredVar");
    expect(result.errorMessage).toContain("cannot find symbol: variable undeclaredVar");
    expect(result.terminalOutput).toContain("Solution.java");
    expect(result.terminalOutput).toContain("error: cannot find symbol");
    expect(result.terminalOutput).toContain("symbol:   variable undeclaredVar");
    expect(result.terminalOutput).toContain("^");
  });

  it("passes for valid Python Two Sum solution using dict", () => {
    const pyCode = `
class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []
    `;
    const result = analyzeSourceCode("python", pyCode);
    expect(result.hasError).toBe(false);
  });

  it("catches undeclared variable in Python and generates NameError terminal traceback", () => {
    const brokenPyCode = `
class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - undeclaredVar
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []
    `;
    const result = analyzeSourceCode("python", brokenPyCode);
    expect(result.hasError).toBe(true);
    expect(result.errorType).toBe("undeclared_variable");
    expect(result.errorSymbol).toBe("undeclaredVar");
    expect(result.errorMessage).toContain("NameError: name 'undeclaredVar' is not defined");
    expect(result.terminalOutput).toContain("Traceback (most recent call last):");
    expect(result.terminalOutput).toContain("NameError: name 'undeclaredVar' is not defined");
  });

  it("catches undeclared variable in array index", () => {
    const brokenIndexCode = `
class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            map.put(nums[ghostIndex], i);
        }
        return new int[] {};
    }
}
    `;
    const result = analyzeSourceCode("java", brokenIndexCode);
    expect(result.hasError).toBe(true);
    expect(result.errorSymbol).toBe("ghostIndex");
  });

  it("catches unmatched parentheses with line and column", () => {
    const syntaxErrCode = `
class Solution {
    public int[] twoSum(int[] nums, int target) {
        if (target > 0 {
            return new int[] { 0, 1 };
        }
        return new int[] {};
    }
}
    `;
    const result = analyzeSourceCode("java", syntaxErrCode);
    expect(result.hasError).toBe(true);
    expect(result.errorType).toBe("syntax_error");
  });

  it("produces VS Code syntax highlighted HTML for Java code", async () => {
    const { highlightCode } = await import("../lib/syntax-highlighter");
    const code = "class Solution { public int[] twoSum(int[] nums) { return new int[]{}; } }";
    const html = highlightCode(code, "java", { isDark: true });
    expect(html).toContain("color: #569cd6"); // keyword class/public
    expect(html).toContain("color: #c586c0"); // control keyword return
    expect(html).toContain("twoSum");
  });

  it("produces VS Code syntax highlighted HTML for Python code with comments and strings", async () => {
    const { highlightCode } = await import("../lib/syntax-highlighter");
    const py = 'def twoSum(self, nums):\n    # Hash map\n    msg = "solved"\n    return []';
    const html = highlightCode(py, "python", { isDark: true });
    expect(html).toContain("color: #6a9955"); // comment
    expect(html).toContain("color: #ce9178"); // string
    expect(html).toContain("color: #c586c0"); // return
  });
});
