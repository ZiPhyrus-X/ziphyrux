import { describe, it, expect } from "vitest";
import { getProblemEditorial, getProblemSolutions } from "@/lib/problem-editorial";

describe("Problem Editorial & Solutions Module", () => {
  it("returns rich editorial and solutions for Two Sum (PRB-0001)", () => {
    const prob = { code: "PRB-0001", title: "Two Sum" };
    const editorial = getProblemEditorial(prob);
    const solutions = getProblemSolutions(prob);

    expect(editorial.problemTitle).toBe("Two Sum");
    expect(editorial.approaches.length).toBeGreaterThanOrEqual(1);
    expect(editorial.approaches[0].complexity.time).toBe("O(N)");
    expect(editorial.approaches[0].complexity.space).toBe("O(N)");

    expect(solutions.length).toBeGreaterThanOrEqual(4);
    const langs = solutions.map((s) => s.language);
    expect(langs).toContain("java");
    expect(langs).toContain("python");
    expect(langs).toContain("cpp");
    expect(langs).toContain("javascript");
  });

  it("returns rich editorial and solutions for Shortest Path in Binary Matrix (PRB-0002)", () => {
    const prob = { code: "PRB-0002", title: "Shortest Path in Binary Matrix" };
    const editorial = getProblemEditorial(prob);
    const solutions = getProblemSolutions(prob);

    expect(editorial.problemTitle).toContain("Shortest Path");
    expect(editorial.approaches[0].title).toContain("BFS");
    expect(editorial.approaches[0].complexity.time).toBe("O(N^2)");

    expect(solutions.length).toBeGreaterThanOrEqual(3);
    const pythonSol = solutions.find((s) => s.language === "python");
    expect(pythonSol?.code).toContain("shortestPathBinaryMatrix");
  });

  it("returns rich editorial and solutions for Balanced Brackets (PRB-0003)", () => {
    const prob = { code: "PRB-0003", title: "Balanced Brackets" };
    const editorial = getProblemEditorial(prob);
    const solutions = getProblemSolutions(prob);

    expect(editorial.problemTitle).toContain("Balanced Brackets");
    expect(editorial.approaches[0].title).toContain("Stack");
    expect(editorial.approaches[0].complexity.time).toBe("O(N)");

    const javaSol = solutions.find((s) => s.language === "java");
    expect(javaSol?.code).toContain("isValid");
  });

  it("returns rich editorial and solutions for LRU Cache (PRB-0004)", () => {
    const prob = { code: "PRB-0004", title: "LRU Cache" };
    const editorial = getProblemEditorial(prob);
    const solutions = getProblemSolutions(prob);

    expect(editorial.problemTitle).toBe("LRU Cache");
    expect(editorial.approaches[0].complexity.time).toBe("O(1)");
    expect(solutions.some((s) => s.code.includes("LRUCache"))).toBe(true);
  });

  it("handles custom problems gracefully with generic fallback", () => {
    const prob = { code: "PRB-9999", title: "Custom Dynamic Programming Task" };
    const editorial = getProblemEditorial(prob);
    const solutions = getProblemSolutions(prob);

    expect(editorial.problemCode).toBe("PRB-9999");
    expect(editorial.approaches.length).toBeGreaterThanOrEqual(1);
    expect(solutions.length).toBeGreaterThanOrEqual(1);
  });
});
