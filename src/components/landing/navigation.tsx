import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, GraduationCap, Menu, X } from "lucide-react";
import { Wordmark, ThemeToggle } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { NAV } from "@/data/site";
import { cn } from "@/lib/utils";
import { EASE } from "@/animations/motion";

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    NAV.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) io.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "border-b border-border/60 bg-background/75 backdrop-blur-xl shadow-sm" : "border-b border-transparent",
      )}
    >
      <div className="container-x flex h-16 items-center justify-between gap-6">
        <Wordmark />
        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={cn(
                "relative text-sm transition-colors hover:text-foreground",
                active === n.id ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {n.label}
              {active === n.id && (
                <motion.span layoutId="nav-dot" className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" />
              )}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            asChild
            size="sm"
            className="group relative hidden overflow-hidden rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-2 text-xs font-semibold tracking-wide text-white shadow-md shadow-amber-500/20 transition-all duration-300 hover:scale-[1.03] hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/30 active:scale-[0.98] md:inline-flex"
          >
            <Link to="/login" className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              <GraduationCap className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
              <span>Classroom</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <button
            className="inline-grid h-9 w-9 place-items-center rounded-md border border-border lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="h-[calc(100dvh-4rem)] border-t border-border bg-background lg:hidden"
          >
            <nav className="container-x flex flex-col py-8" aria-label="Mobile">
              {NAV.map((n, i) => (
                <motion.a
                  key={n.id}
                  href={`#${n.id}`}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, ease: EASE }}
                  className="flex items-baseline justify-between border-b border-border py-4 font-display text-4xl"
                >
                  {n.label}
                  <span className="eyebrow">0{i + 1}</span>
                </motion.a>
              ))}
              <div className="mt-8 flex flex-col gap-3">
                <Button
                  asChild
                  size="xl"
                  className="group relative w-full overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-base font-semibold text-white shadow-md shadow-amber-500/25 transition-all duration-300 hover:border-amber-400"
                >
                  <Link to="/login" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2.5">
                    <GraduationCap className="h-5 w-5" />
                    <span>Classroom</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
