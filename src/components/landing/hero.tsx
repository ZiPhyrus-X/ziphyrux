import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EASE, LineReveal, gsap, useGsapRegister } from "@/animations/motion";
import { useDemo } from "./demo-dialog";

const STAGES = ["Learning", "Evidence", "Intelligence", "Action", "Outcomes"];

function HeroGraphic() {
  const ref = useRef<SVGSVGElement>(null);
  const reduce = useReducedMotion();
  useGsapRegister();
  useEffect(() => {
    if (!ref.current || reduce) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.9 });
      tl.from(".hg-path", { strokeDashoffset: 1, duration: 2.2, ease: "power2.inOut" })
        .from(".hg-node", { scale: 0, transformOrigin: "center", stagger: 0.25, duration: 0.6, ease: "back.out(2)" }, 0.2)
        .from(".hg-label", { opacity: 0, y: 8, stagger: 0.25, duration: 0.6 }, 0.4);
      gsap.to(".hg-pulse", { attr: { r: 18 }, opacity: 0, duration: 2.4, repeat: -1, ease: "power1.out", stagger: 0.48 });
    }, ref);
    return () => ctx.revert();
  }, [reduce]);

  const pts = [
    [40, 260], [170, 170], [300, 210], [430, 100], [560, 60],
  ];
  const d = `M${pts.map((p) => p.join(",")).join(" L")}`;
  return (
    <svg ref={ref} viewBox="0 0 600 320" className="h-auto w-full" role="img" aria-label="Learning becomes evidence, intelligence, action and outcomes">
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="0" x2="600" y1={60 + i * 70} y2={60 + i * 70} className="stroke-border" strokeDasharray="2 6" />
      ))}
      {/* scattered raw evidence */}
      {Array.from({ length: 22 }).map((_, i) => (
        <rect key={i} x={20 + ((i * 53) % 150)} y={200 + ((i * 37) % 90)} width="3" height="3" className="hg-node fill-muted-foreground" opacity={0.5} />
      ))}
      <path d={d} pathLength={1} strokeDasharray="1" className="hg-path fill-none stroke-accent" strokeWidth="1.5" />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="6" className="hg-pulse fill-none stroke-accent" />
          <circle cx={x} cy={y} r={i === pts.length - 1 ? 7 : 4.5} className={`hg-node ${i === pts.length - 1 ? "fill-accent" : "fill-background stroke-foreground"}`} strokeWidth="1.5" />
          <text x={x} y={y - 18} textAnchor="middle" className="hg-label fill-foreground font-mono" fontSize="11">
            {STAGES[i]}
          </text>
          <text x={x} y={y + 24} textAnchor="middle" className="hg-label fill-muted-foreground font-mono" fontSize="9">
            0{i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function Hero() {
  const demo = useDemo();
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden pt-28 pb-12">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" aria-hidden />
      <div className="container-x relative">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 1 }}
          className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4"
        >
          <span className="eyebrow">College Employability Intelligence</span>
          <span className="eyebrow hidden sm:inline">Data → Analysis → Decision → Action → Outcomes</span>
        </motion.div>

        <div className="grid items-end gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <LineReveal
              as="h1"
              className="font-display text-hero"
              delay={0.25}
              lines={["Make", <>employability <em className="text-accent">measurable.</em></>]}
            />
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.8, ease: EASE }}
              className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground"
            >
              Connect learning, coding, assessments, skills and placement intelligence in one continuous system built
              to turn student potential into measurable outcomes.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05, duration: 0.8, ease: EASE }}
              className="mt-10 flex flex-wrap items-center gap-3"
            >
              <Button asChild variant="hero" size="xl">
                <a href="#platform">
                  Explore the Platform <ArrowRight />
                </a>
              </Button>
              <Button variant="line" size="xl" onClick={demo}>
                Request a Demo
              </Button>
              <a href="#intelligence" className="ml-2 inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Discover the Intelligence Loop <ArrowDownRight className="h-4 w-4" />
              </a>
            </motion.div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative border-l border-border pl-6">
              <span className="eyebrow absolute -top-6 left-6">fig. 01 — the path of evidence</span>
              <HeroGraphic />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
