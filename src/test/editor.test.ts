import { describe, expect, it } from "vitest";
import { editorService, latest, validateQuestion } from "@/features/editor/mock-service";

describe("editor rules", () => {
  it("MCQ needs exactly four options and one correct answer", () => {
    expect(validateQuestion({ domain: "Aptitude", type: "MCQ", text: "x", options: ["a", "b", "c"], correct: 0 })).not.toHaveLength(0);
    expect(validateQuestion({ domain: "Aptitude", type: "MCQ", text: "x", options: ["a", "b", "c", "d"] })).not.toHaveLength(0);
    expect(validateQuestion({ domain: "Aptitude", type: "MCQ", text: "x", options: ["a", "b", "c", "d"], correct: 1 })).toHaveLength(0);
  });
  it("Verbal and Soft Skills non-MCQ need an explanation", () => {
    expect(validateQuestion({ domain: "Verbal", type: "Short Answer", text: "x", answer: "y" })).not.toHaveLength(0);
    expect(validateQuestion({ domain: "Verbal", type: "Short Answer", text: "x", explanation: "y" })).toHaveLength(0);
  });
  it("Training & Courses is disabled by default", async () => {
    const f = await editorService.features();
    expect(f.find((x) => x.name === "Training & Courses")?.enabled).toBe(false);
  });
  it("editing a published course creates a new version, keeping the old one", async () => {
    const c = await editorService.newCourseVersion("c-1", "change wording");
    expect(c.versions).toHaveLength(2);
    expect(c.versions[0]?.status).toBe("published");
    expect(latest(c.versions).status).toBe("draft");
  });
});
