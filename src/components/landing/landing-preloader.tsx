import React, { useEffect, useState, useCallback, useRef, createContext, useContext } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { GlyphWall } from "./glyph-wall";

const STORAGE_KEY = "ziphyrus_preloader_seen";

export interface PreloaderContextValue {
  isNavVisible: boolean;
}

export const PreloaderContext = createContext<PreloaderContextValue>({
  isNavVisible: true,
});

export const usePreloaderContext = () => useContext(PreloaderContext);

interface LandingPreloaderProps {
  children: React.ReactNode;
}

export function LandingPreloader({ children }: LandingPreloaderProps) {
  // Check session storage immediately if in browser
  const [active, setActive] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(STORAGE_KEY) !== "true";
    } catch {
      return false;
    }
  });

  // Nav bar stays hidden while preloader is active, and appears once preloader is scrolled / dismissed
  const [isNavVisible, setIsNavVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return true;
    }
  });

  const [isExiting, setIsExiting] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const touchStartY = useRef<number | null>(null);

  // Pin scroll to top on mount when preloader is active
  useEffect(() => {
    if (active && typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [active]);

  // Mark session seen and initiate exit
  const handleEnter = useCallback(() => {
    if (isExiting) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignore storage errors in private browsing/sandboxes
    }
    setIsExiting(true);
    // Once preloader scrolled / exit begins, nav bar starts visible itself
    setIsNavVisible(true);
    // Keep window strictly pinned to top so scroll momentum doesn't bleed into section 2
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  }, [isExiting]);

  // Lock body scroll while preloader is active (including while isExiting)
  useEffect(() => {
    if (!active) return;

    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }

    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, [active]);

  // Global wheel, keyboard, and touch swipe listeners
  useEffect(() => {
    if (!active) return;

    const onWheel = (e: WheelEvent) => {
      // Prevent browser default scroll pass-through to ensure underlying page never jumps past Hero
      if (e.cancelable) {
        e.preventDefault();
      }
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
      if (!isExiting && (e.deltaY > 15 || e.deltaY < -15)) {
        handleEnter();
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0 && e.touches[0]) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY.current !== null && e.touches.length > 0 && e.touches[0]) {
        const delta = touchStartY.current - e.touches[0].clientY;
        if (Math.abs(delta) > 5 && e.cancelable) {
          e.preventDefault();
        }
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }
        // Swiped up by more than 25px
        if (!isExiting && delta > 25) {
          handleEnter();
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Enter" ||
        e.key === " " ||
        e.key === "ArrowDown" ||
        e.key === "PageDown" ||
        e.key === "Escape"
      ) {
        if (e.cancelable) e.preventDefault();
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }
        if (!isExiting) {
          handleEnter();
        }
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
    };
  }, [active, isExiting, handleEnter]);

  return (
    <PreloaderContext.Provider value={{ isNavVisible }}>
      <AnimatePresence
        onExitComplete={() => {
          setActive(false);
          setIsNavVisible(true);
          if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
          }
          // Small RAF delay to ensure all residual scroll momentum is absorbed before restoring normal scroll
          requestAnimationFrame(() => {
            if (typeof window !== "undefined") {
              window.scrollTo({ top: 0, left: 0, behavior: "instant" });
            }
            if (typeof document !== "undefined") {
              document.body.style.overflow = "";
            }
          });
        }}
      >
        {active && !isExiting && (
          <motion.div
            key="ziphyrus-preloader"
            initial={{ y: 0, opacity: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0, transition: { duration: 0.4 } }
                : {
                    y: "-100%",
                    opacity: 0.98,
                    transition: {
                      duration: 0.85,
                      ease: [0.77, 0, 0.175, 1], // Cinematic cubic-bezier
                    },
                  }
            }
            className="fixed inset-0 z-[60] h-screen w-screen cursor-pointer overflow-hidden select-none bg-[#08090d]"
            onClick={handleEnter}
            role="dialog"
            aria-label="Interactive introductory preloader"
          >
            {/* Fullscreen WebGL Glyph Wall Canvas */}
            <div className="absolute inset-0 h-full w-full">
              <GlyphWall
                revealText="ZIPHYRUS"
                background="#08090d"
                glyphColor="#2b313d"
                accent="#f59e0b"
                size={52}
                reach={165}
                hover={75}
                speed={48}
              />
            </div>

            {/* Top Left: Blinking dot and "WELCOME TO" text */}
            <div className="absolute top-6 left-6 md:top-8 md:left-10 z-20 flex items-center gap-2.5 pointer-events-none select-none">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              </span>
              <span className="font-mono text-xs font-semibold tracking-[0.25em] text-foreground/90">
                WELCOME TO
              </span>
            </div>

            {/* Top Right: Ziphyrus [x] Branding */}
            <div className="absolute top-6 right-6 md:top-8 md:right-10 z-20 pointer-events-none select-none">
              <div className="inline-flex items-baseline gap-1.5 drop-shadow-sm">
                <span className="font-display text-2xl leading-none text-foreground">Ziphyrus</span>
                <span className="relative inline-grid h-5 w-5 place-items-center border border-amber-500 font-mono text-[0.7rem] text-amber-500">
                  x
                </span>
              </div>
            </div>

            {/* Subtle top edge gradient vignette */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#08090d]/80 to-transparent"
              aria-hidden
            />

            {/* Minimalist floating prompt at bottom center */}
            <div
              className="pointer-events-none absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-center select-none z-20"
              aria-hidden
            >
              <span className="font-mono text-[11px] font-medium tracking-[0.25em] text-muted-foreground/80 transition-colors duration-300">
                SCROLL TO ENTER ZIPHYRUS
              </span>
              <div className="relative flex items-center justify-center">
                <div className="absolute h-7 w-7 animate-ping rounded-full bg-amber-500/15" />
                <ChevronDown className="h-4 w-4 animate-bounce text-amber-500/90 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Landing page components render underneath */}
      {children}
    </PreloaderContext.Provider>
  );
}

export default LandingPreloader;
