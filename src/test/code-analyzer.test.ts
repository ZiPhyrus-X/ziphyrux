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

  it("catches missing semicolon in Java and generates realistic compiler diagnostic", () => {
    const brokenJava = `
class Solution {
    public int[] twoSum(int[] nums, int target) {
        int x = 5
        return new int[]{};
    }
}
    `;
    const result = analyzeSourceCode("java", brokenJava);
    expect(result.hasError).toBe(true);
    expect(result.errorType).toBe("syntax_error");
    expect(result.errorMessage).toContain("error: ';' expected");
    expect(result.terminalOutput).toContain("Solution.java:4: error: ';' expected");
    expect(result.terminalOutput).toContain("^");
  });

  it("catches missing colon in Python block headers", () => {
    const brokenPy = `
def twoSum(nums, target)
    return []
    `;
    const result = analyzeSourceCode("python", brokenPy);
    expect(result.hasError).toBe(true);
    expect(result.errorType).toBe("syntax_error");
    expect(result.errorMessage).toContain("SyntaxError: expected ':'");
    expect(result.terminalOutput).toContain("SyntaxError: expected ':'");
  });

  it("catches Python indentation error after compound header statement", () => {
    const unindentedPy = `
def twoSum(nums, target):
return []
    `;
    const result = analyzeSourceCode("python", unindentedPy);
    expect(result.hasError).toBe(true);
    expect(result.errorType).toBe("syntax_error");
    expect(result.errorMessage).toContain("IndentationError: expected an indented block");
    expect(result.terminalOutput).toContain("IndentationError: expected an indented block after 'def' statement");
  });

  it("catches division by zero in Python and throws ZeroDivisionError", () => {
    const divZeroPy = `
def twoSum(nums, target):
    val = 10 / 0
    return []
    `;
    const result = analyzeSourceCode("python", divZeroPy);
    expect(result.hasError).toBe(true);
    expect(result.errorType).toBe("runtime_error");
    expect(result.errorMessage).toContain("ZeroDivisionError: division by zero");
    expect(result.terminalOutput).toContain("ZeroDivisionError: division by zero");
  });

  it("catches division by zero in Java and throws ArithmeticException", () => {
    const divZeroJava = `
class Solution {
    public int[] twoSum(int[] nums, int target) {
        int x = 10 / 0;
        return new int[]{};
    }
}
    `;
    const result = analyzeSourceCode("java", divZeroJava);
    expect(result.hasError).toBe(true);
    expect(result.errorType).toBe("runtime_error");
    expect(result.errorMessage).toContain("ArithmeticException: / by zero");
    expect(result.terminalOutput).toContain("java.lang.ArithmeticException: / by zero");
  });

  it("catches null pointer dereference in Java", () => {
    const nullDeref = `
class Solution {
    public int[] twoSum(int[] nums, int target) {
        int len = null.length();
        return new int[]{};
    }
}
    `;
    const result = analyzeSourceCode("java", nullDeref);
    expect(result.hasError).toBe(true);
    expect(result.errorType).toBe("runtime_error");
    expect(result.errorMessage).toContain("NullPointerException");
  });

  it("catches negative array indexing in Java and throws ArrayIndexOutOfBoundsException", () => {
    const negIndex = `
class Solution {
    public int[] twoSum(int[] nums, int target) {
        int val = nums[-1];
        return new int[]{};
    }
}
    `;
    const result = analyzeSourceCode("java", negIndex);
    expect(result.hasError).toBe(true);
    expect(result.errorType).toBe("runtime_error");
    expect(result.errorMessage).toContain("ArrayIndexOutOfBoundsException: Index -1 out of bounds");
  });

  it("catches infinite loops and reports Time Limit Exceeded (TLE)", () => {
    const infiniteLoopJava = `
class Solution {
    public int[] twoSum(int[] nums, int target) {
        while (true) {
            // endless loop
        }
        return new int[]{};
    }
}
    `;
    const result = analyzeSourceCode("java", infiniteLoopJava);
    expect(result.hasError).toBe(true);
    expect(result.errorMessage).toContain("Time Limit Exceeded (TLE)");
    expect(result.terminalOutput).toContain("Time Limit Exceeded (TLE)");
    expect(result.terminalOutput).toContain("exit code 124");
  });

  it("catches missing return statement in Java non-void method", () => {
    const missingReturn = `
class Solution {
    public int[] twoSum(int[] nums, int target) {
        int sum = nums[0] + nums[1];
    }
}
    `;
    const result = analyzeSourceCode("java", missingReturn);
    expect(result.hasError).toBe(true);
    expect(result.errorMessage).toContain("missing return statement");
    expect(result.terminalOutput).toContain("error: missing return statement");
  });

  it("catches incompatible return types in Java methods", () => {
    const wrongReturnType = `
class Solution {
    public int[] twoSum(int[] nums, int target) {
        return true;
    }
}
    `;
    const result = analyzeSourceCode("java", wrongReturnType);
    expect(result.hasError).toBe(true);
    expect(result.errorMessage).toContain("incompatible types: boolean cannot be converted to int[]");
  });
});
