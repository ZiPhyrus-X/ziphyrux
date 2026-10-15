import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlacementIntelligence } from "@/components/landing/sections";
import { PLACEMENT } from "@/data/site";

describe("PlacementIntelligence Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all 8 placement stages including 08 Career Onboarding without empty blocks", () => {
    render(<PlacementIntelligence />);

    expect(PLACEMENT).toHaveLength(8);
    expect(PLACEMENT[7]!.k).toBe("Career Onboarding");
    expect(PLACEMENT[7]!.d).toContain("Verified offer acceptance");

    // Check all 8 buttons exist
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(8);

    PLACEMENT.forEach((p) => {
      expect(screen.getByText(p.k)).toBeInTheDocument();
    });
  });

  it("highlights on hover and reverts back to original color state on mouseleave", async () => {
    render(<PlacementIntelligence />);

    // Find 05 Interview button
    const interviewBtn = screen.getByRole("button", { name: /interview/i });

    // Initial state: not hovered
    expect(interviewBtn.className).toContain("bg-surface");
    expect(interviewBtn.className).not.toContain("bg-foreground");

    // Hover on 05 Interview
    fireEvent.pointerEnter(interviewBtn, { pointerType: "mouse" });

    // While hovered, turns to the white block (bg-foreground)
    expect(interviewBtn.className).toContain("bg-foreground");
    expect(interviewBtn.className).toContain("text-background");

    await waitFor(() => {
      expect(screen.getByText(PLACEMENT[4]!.d)).toBeInTheDocument();
    });

    // Mouse leaves
    fireEvent.pointerLeave(interviewBtn);

    // Reverts back to original color state (bg-surface)
    expect(interviewBtn.className).toContain("bg-surface");
    expect(interviewBtn.className).not.toContain("bg-foreground");
  });

  it("selecting an item updates the description while maintaining original dark background", async () => {
    render(<PlacementIntelligence />);

    const onboardingBtn = screen.getByRole("button", { name: /career onboarding/i });
    fireEvent.click(onboardingBtn);

    // After click, it has selected indicator but its base background is bg-surface (not a stark white block)
    expect(onboardingBtn.className).toContain("bg-surface");
    expect(onboardingBtn.className).not.toContain("bg-foreground");

    await waitFor(() => {
      expect(screen.getByText(PLACEMENT[7]!.d)).toBeInTheDocument();
    });
  });
});
