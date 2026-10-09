import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("group inline-flex items-baseline gap-1.5", className)} aria-label="Ziphyrus X home">
      <span className="font-display text-2xl leading-none">Ziphyrus</span>
      <span className="relative inline-grid h-5 w-5 place-items-center border border-accent font-mono text-[0.7rem] text-accent transition-transform duration-500 group-hover:rotate-90">
        X
      </span>
    </Link>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className={cn(
        "inline-grid h-9 w-9 place-items-center rounded-md border border-border text-foreground transition-colors hover:border-line hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
    >
      <motion.span key={theme} initial={{ rotate: -60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.35 }}>
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </motion.span>
    </button>
  );
}
