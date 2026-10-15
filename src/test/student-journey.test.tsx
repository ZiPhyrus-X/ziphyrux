import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StudentJourney } from "@/components/landing/sections";
import { JOURNEY } from "@/data/site";

describe("StudentJourney Responsive Interactive Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders all 8 journey stages including 08 Final Deployment", () => {
    render(<StudentJourney />);

    // Verify all 8 items exist in JOURNEY
    expect(JOURNEY).toHaveLength(8);
    expect(JOURNEY[7]!.k).toBe("Final Deployment");
    expect(JOURNEY[7]!.v).toBe("Qualified for enterprise campus drives and verified career placement");
    expect(JOURNEY[7]!.m).toBe("Offer secured");

    // Check that stage labels are in document
    JOURNEY.forEach((stage) => {
      expect(screen.getAllByText(stage.k).length).toBeGreaterThan(0);
    });

    // Verify 08 is rendered in list
    expect(screen.getByText("08")).toBeInTheDocument();
  });

  it("starts at stage 1 (Learning) and shows initial details", () => {
    render(<StudentJourney />);
    expect(screen.getByText("Completes 'Data Structures II' module")).toBeInTheDocument();
    expect(screen.getByText("6 sessions")).toBeInTheDocument();
  });

  it("navigates forward using next button to stage 8 (Final Deployment)", async () => {
    render(<StudentJourney />);

    const nextButtons = screen.getAllByRole("button", { name: /next/i });
    expect(nextButtons.length).toBeGreaterThan(0);

    // Click next 7 times to reach stage 8
    for (let i = 0; i < 7; i++) {
      fireEvent.click(nextButtons[0]);
    }

    // Now on stage 8: Final Deployment
    await waitFor(() => {
      expect(
        screen.getByText("Qualified for enterprise campus drives and verified career placement"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Offer secured")).toBeInTheDocument();
  });

  it("allows jumping directly to stage 8 via the 8th timeline button", async () => {
    render(<StudentJourney />);

    const stage8Button = screen.getByRole("button", { name: /08 Final Deployment/i });
    fireEvent.click(stage8Button);

    await waitFor(() => {
      expect(
        screen.getByText("Qualified for enterprise campus drives and verified career placement"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Offer secured")).toBeInTheDocument();
  });

  it("allows jumping to stage 8 via the mobile pagination dot", async () => {
    render(<StudentJourney />);

    const dot8 = screen.getByRole("button", { name: /jump to stage 08: final deployment/i });
    fireEvent.click(dot8);

    await waitFor(() => {
      expect(
        screen.getByText("Qualified for enterprise campus drives and verified career placement"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Offer secured")).toBeInTheDocument();
  });

  it("makes hovered step active on mouseenter and restores original on mouseleave", async () => {
    render(<StudentJourney />);

    // Initially stage 1 (Learning) is active
    expect(screen.getByText("Completes 'Data Structures II' module")).toBeInTheDocument();

    const stage2Button = screen.getByRole("button", { name: /02 Coding/i });

    // Hover over stage 2 (Coding)
    fireEvent.mouseEnter(stage2Button);

    await waitFor(() => {
      expect(screen.getByText("Attempts 14 graph problems")).toBeInTheDocument();
    });
    expect(screen.getByText("9 accepted")).toBeInTheDocument();

    // Mouse leaves
    fireEvent.mouseLeave(stage2Button);

    // Reverts back to stage 1 (Learning)
    await waitFor(() => {
      expect(screen.getByText("Completes 'Data Structures II' module")).toBeInTheDocument();
    });
    expect(screen.getByText("6 sessions")).toBeInTheDocument();
  });
});
