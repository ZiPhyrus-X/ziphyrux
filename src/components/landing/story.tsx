import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { LineReveal, Reveal, SectionLabel, gsap, useGsapRegister } from "@/animations/motion";
import { LOOP, SYSTEM } from "@/data/site";
import { cn } from "@/lib/utils";

const FRAGMENTS = ["Learning", "Coding", "Assessments", "Skills", "Placement"];

/* SECTION 03 — fragmented systems become connected (scroll-scrubbed) */
export function OpeningStatement() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  useGsapRegister();
  useEffect(() => {
    if (!ref.current || reduce) return;
    const ctx = gsap.context(() => {
      const scatter = [
        { x: -140, y: -60, r: -8 }, { x: 120, y: -90, r: 6 }, { x: -60, y: 80, r: 4 },
        { x: 160, y: 60, r: -5 }, { x: 0, y: -130, r: 9 },
      ];
      gsap.utils.toArray<HTMLElement>(".frag").forEach((el, i) => {
        gsap.fromTo(
          el,
          { x: scatter[i].x, y: scatter[i].y, rotate: scatter[i].r, opacity: 0.45 },
          { x: 0, y: 0, rotate: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: ".frag-wrap", start: "top 85%", end: "center 50%", scrub: 0.8 } },
        );
      });
      gsap.fromTo(".frag-link", { scaleX: 0 }, { scaleX: 1, ease: "none", transformOrigin: "left", scrollTrigger: { trigger: ".frag-wrap", start: "center 70%", end: "center 45%", scrub: 0.8 } });
    }, ref);
    return () => ctx.revert();
  }, [reduce]);

  return (
    <section ref={ref} className="border-t border-border py-28 md:py-40">
      <div className="container-x">
        <SectionLabel n="01">The problem</SectionLabel>
        <LineReveal
          className="mt-10 max-w-5xl font-display text-statement"
          lines={["Learning happens across systems.", <span className="text-muted-foreground">Employability needs to connect them.</span>]}
        />
        <Reveal className="mt-8 max-w-xl text-muted-foreground">
          <p>
            Training, coding practice, assessments and placement preparation usually live in separate tools. Each holds
            a piece of the picture. None of them can tell a trainer, a coordinator or a student what to do next.
          </p>
        </Reveal>
        <div className="frag-wrap relative mt-24 flex flex-wrap items-center justify-center gap-y-6">
          {FRAGMENTS.map((f, i) => (
            <div key={f} className="flex items-center">
              <div className="frag border border-line bg-surface px-5 py-3 font-mono text-sm">{f}</div>
              {i < FRAGMENTS.length - 1 && <span className="frag-link block h-px w-6 bg-accent md:w-14" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* SECTION 04 — the connected system as an editorial index */
export function PlatformOverview() {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <section id="platform" className="border-t border-border py-28 md:py-36">
      <div className="container-x grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <SectionLabel n="02">The approach</SectionLabel>
            <LineReveal className="mt-10 font-display text-section" lines={["One connected system.", <em className="text-accent">A clearer picture</em>, "of readiness."]} />
            <Reveal className="mt-8 max-w-md text-muted-foreground">
              <p>Nine stages, one data model. Each stage reads from the one before it and informs the next.</p>
            </Reveal>
            <div className="mt-10 hidden h-1 w-full bg-muted lg:block" aria-hidden>
              <div className="h-1 bg-accent transition-all duration-500" style={{ width: `${hover === null ? 0 : ((hover + 1) / SYSTEM.length) * 100}%` }} />
            </div>
          </div>
        </div>
        <ol className="lg:col-span-7">
          {SYSTEM.map((s, i) => (
            <Reveal key={s.k} i={i % 3}>
              <li
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className="group grid grid-cols-[3rem_1fr] items-baseline gap-4 border-t border-border py-6 last:border-b md:grid-cols-[4rem_1fr_1fr]"
              >
                <span className={cn("font-mono text-xs transition-colors", hover !== null && i <= hover ? "text-accent" : "text-muted-foreground")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-3xl transition-transform duration-500 group-hover:translate-x-2 md:text-4xl">{s.k}</span>
                <span className="col-start-2 text-sm text-muted-foreground md:col-start-3">{s.d}</span>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* SECTION 05 — pinned, scroll-scrubbed intelligence loop */
export function IntelligenceLoop() {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const reduce = useReducedMotion();
  useGsapRegister();

  useEffect(() => {
    if (!ref.current || reduce) {
      setStep(LOOP.length - 1);
      return;
    }
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 900px)", () => {
        gsap.timeline({
          scrollTrigger: {
            trigger: ".loop-pin",
            start: "top top",
            end: "+=2200",
            pin: true,
            scrub: 0.6,
            onUpdate: (self) => {
              const s = Math.min(LOOP.length - 1, Math.floor(self.progress * LOOP.length));
              setStep((p) => (p === s ? p : s));
            },
          },
        }).fromTo(".loop-ring", { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none" });
      });
      mm.add("(max-width: 899px)", () => {
        setStep(LOOP.length - 1);
        gsap.set(".loop-ring", { strokeDashoffset: 0 });
      });
    }, ref);
    return () => ctx.revert();
  }, [reduce]);

  const R = 160;
  const nodes = LOOP.map((_, i) => {
    const a = (i / LOOP.length) * Math.PI * 2 - Math.PI / 2;
    return [200 + R * Math.cos(a), 200 + R * Math.sin(a)];
  });

  return (
    <section id="intelligence" ref={ref} className="border-t border-border">
      <div className="loop-pin flex min-h-[100svh] items-center py-24">
        <div className="container-x grid items-center gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionLabel n="03">The intelligence loop</SectionLabel>
            <h2 className="mt-10 font-display text-section">
              Evidence in. <br />
              <em className="text-accent">Better decisions</em> out. <br />
              Then again.
            </h2>
            <div className="mt-10 min-h-[7rem] border-l-2 border-accent pl-5">
              <p className="eyebrow">Frame {String(step + 1).padStart(2, "0")} / 06</p>
              <p className="mt-2 font-display text-3xl">{LOOP[step].k}</p>
              <p className="mt-1 text-muted-foreground">{LOOP[step].d}</p>
            </div>
          </div>
          <div className="lg:col-span-7">
            <svg viewBox="0 0 400 400" className="mx-auto w-full max-w-[520px]" role="img" aria-label="Data, analysis, decision, recommendation, action, new data — a continuous loop">
              <circle cx="200" cy="200" r={R} className="fill-none stroke-border" />
              <circle cx="200" cy="200" r={R} pathLength={1} strokeDasharray="1" transform="rotate(-90 200 200)" className="loop-ring fill-none stroke-accent" strokeWidth="1.5" />
              <circle cx="200" cy="200" r="70" className="fill-none stroke-border" strokeDasharray="2 5" />
              <text x="200" y="196" textAnchor="middle" className="fill-foreground font-display" fontSize="26">Ziphyrus</text>
              <text x="200" y="218" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="9">continuous evidence model</text>
              {nodes.map(([x, y], i) => {
                const on = i <= step;
                return (
                  <g key={i} style={{ transition: "opacity .4s" }} opacity={on ? 1 : 0.35}>
                    <circle cx={x} cy={y} r={i === step ? 11 : 7} className={on ? "fill-accent" : "fill-background stroke-line"} style={{ transition: "r .4s" }} />
                    <text x={x} y={y + (y < 200 ? -20 : 30)} textAnchor="middle" className="fill-foreground font-mono" fontSize="11">
                      {LOOP[i].k}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
