import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export const EASE = [0.22, 1, 0.36, 1] as const;

let registered = false;
export function useGsapRegister() {
  useEffect(() => {
    if (!registered) {
      gsap.registerPlugin(ScrollTrigger);
      registered = true;
    }
  }, []);
}
export { gsap, ScrollTrigger };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE, delay: i * 0.08 } }),
};

export function Reveal({ children, i = 0, className }: { children: ReactNode; i?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      custom={i}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10% 0px" }}
    >
      {children}
    </motion.div>
  );
}

/** Line-by-line masked headline reveal. */
export function LineReveal({
  lines,
  className,
  delay = 0,
  as: Tag = "h2",
}: {
  lines: ReactNode[];
  className?: string;
  delay?: number;
  as?: "h1" | "h2";
}) {
  const reduce = useReducedMotion();
  return (
    <Tag className={className}>
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            className="block"
            initial={reduce ? { opacity: 0 } : { y: "105%" }}
            whileInView={reduce ? { opacity: 1 } : { y: "0%" }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: EASE, delay: delay + i * 0.12 }}
          >
            {l}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

export function SectionLabel({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="eyebrow text-accent">{n}</span>
      <span className="h-px w-10 bg-line" />
      <span className="eyebrow">{children}</span>
    </div>
  );
}
