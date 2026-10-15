import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LandingPreloader, usePreloaderContext } from "@/components/landing/landing-preloader";

function TestNavConsumer() {
  const { isNavVisible } = usePreloaderContext();
  return <div data-testid="nav-visibility">{isNavVisible ? "visible" : "hidden"}</div>;
}

describe("LandingPreloader with WebGL Glyph Wall Integration", () => {
  const STORAGE_KEY = "ziphyrus_preloader_seen";

  beforeEach(() => {
    sessionStorage.clear();
    document.body.style.overflow = "";
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.overflow = "";
    sessionStorage.clear();
  });

  it("renders the preloader on first session visit with top-left WELCOME TO and top-right branding", () => {
    render(
      <LandingPreloader>
        <TestNavConsumer />
        <div data-testid="landing-content">Landing Content</div>
      </LandingPreloader>,
    );

    // Preloader dialog is present
    const preloader = screen.getByRole("dialog", {
      name: /interactive introductory preloader/i,
    });
    expect(preloader).toBeInTheDocument();

    // Top-left WELCOME TO text
    expect(screen.getByText(/welcome to/i)).toBeInTheDocument();

    // Top-right branding text
    expect(screen.getAllByText(/ziphyrus/i).length).toBeGreaterThan(0);

    // Prompt at bottom
    expect(screen.getByText(/scroll to enter ziphyrus/i)).toBeInTheDocument();

    // Nav is hidden while preloader is active
    expect(screen.getByTestId("nav-visibility")).toHaveTextContent("hidden");

    expect(screen.getByTestId("landing-content")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("does not render the preloader if already seen in current session, and nav is visible", () => {
    sessionStorage.setItem(STORAGE_KEY, "true");

    render(
      <LandingPreloader>
        <TestNavConsumer />
        <div data-testid="landing-content">Landing Content</div>
      </LandingPreloader>,
    );

    expect(
      screen.queryByRole("dialog", { name: /interactive introductory preloader/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("landing-content")).toBeInTheDocument();
    expect(screen.getByTestId("nav-visibility")).toHaveTextContent("visible");
    expect(document.body.style.overflow).toBe("");
  });

  it("exits preloader, reveals nav bar, and sets sessionStorage on click", async () => {
    render(
      <LandingPreloader>
        <TestNavConsumer />
        <div data-testid="landing-content">Landing Content</div>
      </LandingPreloader>,
    );

    expect(screen.getByTestId("nav-visibility")).toHaveTextContent("hidden");

    const preloader = screen.getByRole("dialog", {
      name: /interactive introductory preloader/i,
    });

    act(() => {
      fireEvent.click(preloader);
    });

    // Nav becomes visible once preloader is scrolled/clicked
    expect(screen.getByTestId("nav-visibility")).toHaveTextContent("visible");
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe("true");
    expect(document.body.style.overflow).toBe("");
  });

  it("exits preloader on scroll wheel down (deltaY > 15) and reveals nav", () => {
    render(
      <LandingPreloader>
        <TestNavConsumer />
        <div data-testid="landing-content">Landing Content</div>
      </LandingPreloader>,
    );

    expect(screen.getByTestId("nav-visibility")).toHaveTextContent("hidden");

    act(() => {
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: 25 }));
    });

    expect(screen.getByTestId("nav-visibility")).toHaveTextContent("visible");
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe("true");
    expect(document.body.style.overflow).toBe("");
  });

  it("exits preloader on keyboard keydown (Enter / Space / Escape / ArrowDown)", () => {
    render(
      <LandingPreloader>
        <TestNavConsumer />
        <div data-testid="landing-content">Landing Content</div>
      </LandingPreloader>,
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });

    expect(screen.getByTestId("nav-visibility")).toHaveTextContent("visible");
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe("true");
    expect(document.body.style.overflow).toBe("");
  });

  it("restores body overflow on unmount", () => {
    const { unmount } = render(
      <LandingPreloader>
        <div>Content</div>
      </LandingPreloader>,
    );

    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
