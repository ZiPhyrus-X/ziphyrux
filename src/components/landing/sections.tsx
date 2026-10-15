import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EASE, LineReveal, Reveal, SectionLabel } from "@/animations/motion";
import { AUDIENCES, JOURNEY, NAV, PLACEMENT, PRINCIPLES, SITE, SKILLS } from "@/data/site";
import { Wordmark } from "@/components/brand";
import { cn } from "@/lib/utils";

/* SECTION 06 — Ecosystem */
export function AudienceSection() {
  const [i, setI] = useState(0);
  return (
    <section id="ecosystem" className="border-t border-border py-28 md:py-36">
      <div className="container-x">
        <SectionLabel n="04">The ecosystem</SectionLabel>
        <LineReveal className="mt-10 max-w-4xl font-display text-section" lines={["Six perspectives.", <span className="text-muted-foreground">One shared source of evidence.</span>]} />
        <div className="mt-16 grid gap-10 lg:grid-cols-12">
          <div role="tablist" aria-label="Audiences" className="flex flex-col lg:col-span-5">
            {AUDIENCES.map((a, idx) => (
              <button
                key={a.k}
                role="tab"
                aria-selected={i === idx}
                onClick={() => setI(idx)}
                onMouseEnter={() => setI(idx)}
                className={cn(
                  "flex items-baseline justify-between border-t border-border py-4 text-left font-display text-3xl transition-colors last:border-b md:text-4xl",
                  i === idx ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {a.k}
                <span className={cn("font-mono text-xs", i === idx ? "text-accent" : "")}>0{idx + 1}</span>
              </button>
            ))}
          </div>
          <div className="relative min-h-[20rem] border border-line bg-surface p-8 md:p-12 lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.45, ease: EASE }}>
                <p className="eyebrow text-accent">Workspace / {AUDIENCES[i]!.k}</p>
                <p className="mt-6 font-display text-4xl leading-tight md:text-5xl">{AUDIENCES[i]!.d}</p>
                <div className="mt-10 grid grid-cols-3 gap-px bg-border" aria-hidden>
                  {["Evidence", "Context", "Action"].map((t, j) => (
                    <div key={t} className="bg-surface p-4">
                      <div className="h-1 bg-muted"><div className="h-1 bg-accent" style={{ width: `${40 + ((i * 17 + j * 23) % 55)}%` }} /></div>
                      <p className="mt-3 font-mono text-xs text-muted-foreground">{t}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* SECTION 07 — Student journey (interactive timeline, illustrative data) */
export function StudentJourney() {
  const [s, setS] = useState(0);
  return (
    <section id="journey" className="border-t border-border py-28 md:py-36">
      <div className="container-x">
        <SectionLabel n="05">The student journey</SectionLabel>
        <LineReveal className="mt-10 max-w-5xl font-display text-section" lines={["From activity to evidence.", <em className="text-accent">From evidence to progress.</em>]} />
        <div className="mt-16 no-scrollbar overflow-x-auto pb-2">
          <ol className="grid min-w-[860px] grid-cols-8 border-t border-line">
            {JOURNEY.map((j, idx) => (
              <li key={j.k}>
                <button onClick={() => setS(idx)} className="group w-full pt-5 text-left" aria-pressed={s === idx}>
                  <span className={cn("-mt-[1.45rem] mb-4 block h-2.5 w-2.5 rounded-full border transition-all", idx <= s ? "border-accent bg-accent" : "border-line bg-background")} />
                  <span className="eyebrow">{String(idx + 1).padStart(2, "0")}</span>
                  <span className={cn("mt-1 block text-sm font-medium transition-colors", idx === s ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{j.k}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-10 grid gap-6 border border-line p-8 md:grid-cols-[1fr_auto] md:items-end md:p-10">
          <AnimatePresence mode="wait">
            <motion.div key={s} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.35, ease: EASE }}>
              <p className="eyebrow">{JOURNEY[s]!.k}</p>
              <p className="mt-3 font-display text-3xl md:text-4xl">{JOURNEY[s]!.v}</p>
            </motion.div>
          </AnimatePresence>
          <div className="text-right">
            <p className="font-mono text-2xl text-accent">{JOURNEY[s]!.m}</p>
            <p className="mt-2 eyebrow">Illustrative sample</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* SECTION 08 — Skill intelligence visualization */
export function IntelligenceVisualization() {
  const [focus, setFocus] = useState<number | null>(null);
  return (
    <section className="border-t border-border py-28 md:py-36">
      <div className="container-x grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionLabel n="06">Skill intelligence</SectionLabel>
          <LineReveal className="mt-10 font-display text-section" lines={["Where a student is.", <span className="text-muted-foreground">Where they need to be.</span>]} />
          <Reveal className="mt-8 space-y-4 text-sm text-muted-foreground">
            <p>Current skill is inferred from learning, assessment and coding evidence. The gap to a target role becomes the basis of each recommendation.</p>
            <p className="flex gap-2 border-l border-accent pl-3"><Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />Confidence depends on how much evidence exists. Thin evidence produces tentative recommendations — and the interface says so.</p>
          </Reveal>
          <div className="mt-8 flex gap-6 font-mono text-xs text-muted-foreground">
            <span className="flex items-center gap-2"><span className="h-2 w-6 bg-foreground" />Current</span>
            <span className="flex items-center gap-2"><span className="h-3 w-px bg-accent" />Target</span>
          </div>
        </div>
        <div className="lg:col-span-8">
          {SKILLS.map((k, i) => {
            const gap = k.tgt - k.cur;
            const ev = 2 + ((i * 3) % 4);
            return (
              <Reveal key={k.k} i={i}>
                <div
                  onMouseEnter={() => setFocus(i)}
                  onMouseLeave={() => setFocus(null)}
                  className={cn("grid grid-cols-[8rem_1fr] items-center gap-6 border-t border-border py-5 transition-opacity md:grid-cols-[10rem_1fr_9rem]", focus !== null && focus !== i && "opacity-40")}
                >
                  <span className="text-sm">{k.k}</span>
                  <div className="relative h-6">
                    <div className="absolute inset-y-2 left-0 right-0 bg-muted" />
                    <motion.div className="absolute inset-y-2 left-0 bg-foreground" initial={{ width: 0 }} whileInView={{ width: `${k.cur}%` }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE, delay: i * 0.08 }} />
                    {gap > 0 && <div className="absolute inset-y-2 bg-accent/30" style={{ left: `${k.cur}%`, width: `${gap}%` }} />}
                    <div className="absolute inset-y-0 w-px bg-accent" style={{ left: `${k.tgt}%` }} />
                  </div>
                  <span className="col-span-2 font-mono text-xs text-muted-foreground md:col-span-1 md:text-right">
                    {gap > 0 ? <span className="text-accent">gap {gap}</span> : "on target"} · {ev} sources
                  </span>
                </div>
              </Reveal>
            );
          })}
          <p className="mt-6 eyebrow">Illustrative data — for explanation only</p>
        </div>
      </div>
    </section>
  );
}

/* SECTION 09 — Placement intelligence */
export function PlacementIntelligence() {
  const [s, setS] = useState(1);
  return (
    <section className="border-t border-border bg-surface py-28 md:py-36">
      <div className="container-x">
        <SectionLabel n="07">Placement intelligence</SectionLabel>
        <LineReveal className="mt-10 font-display text-statement" lines={["Readiness is", <em className="text-accent">more than a score.</em>]} />
        <div className="mt-16 grid grid-cols-2 gap-px bg-border sm:grid-cols-4 xl:grid-cols-7">
          {PLACEMENT.map((p, i) => (
            <Button
              key={p.k}
              variant="ghost"
              aria-pressed={s === i}
              onClick={() => setS(i)}
              onMouseEnter={() => setS(i)}
              className={cn("h-auto min-h-[9rem] min-w-0 flex-col items-start justify-between gap-6 whitespace-normal rounded-none p-4 text-left", s === i ? "bg-foreground text-background hover:bg-foreground hover:text-background" : "bg-surface hover:bg-muted")}
            >
              <span className="font-mono text-xs opacity-60">{String(i + 1).padStart(2, "0")}</span>
              <span className="w-full font-display text-xl leading-tight tracking-normal 2xl:text-2xl">{p.k}</span>
            </Button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.p key={s} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="mt-10 max-w-3xl text-xl leading-relaxed">
            {PLACEMENT[s]?.d}
          </motion.p>
        </AnimatePresence>
        <p className="mt-6 text-sm text-muted-foreground">Ziphyrus X informs preparation. It does not guarantee jobs or placements.</p>
      </div>
    </section>
  );
}

/* SECTION 10 — For institutions */
export function InstitutionSection() {
  const items = ["Connected student evidence", "Training visibility", "Skill-gap insights", "Targeted trainer intervention", "Placement preparation", "Reporting and institutional intelligence"];
  const rows = [
    { b: "CSE · Section A", r: "Algorithms", s: "Needs attention", w: 38 },
    { b: "CSE · Section B", r: "SQL", s: "On track", w: 76 },
    { b: "ECE · Section A", r: "Aptitude", s: "Improving", w: 61 },
    { b: "IT · Section C", r: "System Design", s: "Needs attention", w: 29 },
  ];
  return (
    <section id="institutions" className="border-t border-border py-28 md:py-36">
      <div className="container-x grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionLabel n="08">For institutions</SectionLabel>
          <LineReveal className="mt-10 font-display text-section" lines={["Give every training", "decision a", <em className="text-accent">clearer context.</em>]} />
          <ul className="mt-10">
            {items.map((t, i) => (
              <Reveal key={t} i={i}>
                <li className="flex gap-4 border-t border-border py-3 text-sm"><span className="font-mono text-xs text-accent">+</span>{t}</li>
              </Reveal>
            ))}
          </ul>
        </div>
        <Reveal className="lg:col-span-7">
          <div className="border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="font-mono text-xs">coordinator / batch overview</span>
              <span className="eyebrow">Illustrative preview</span>
            </div>
            <div className="grid grid-cols-3 gap-px bg-border">
              {[["Active batches", "12"], ["Open skill gaps", "37"], ["Interventions this week", "9"]].map(([k, v]) => (
                <div key={k} className="bg-surface p-5"><p className="font-display text-4xl">{v}</p><p className="mt-1 text-xs text-muted-foreground">{k}</p></div>
              ))}
            </div>
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div key={r.b} className="grid grid-cols-[1fr_1fr] items-center gap-4 px-5 py-4 text-sm md:grid-cols-[1.2fr_1fr_1fr_1fr]">
                  <span>{r.b}</span>
                  <span className="text-muted-foreground">{r.r}</span>
                  <div className="hidden h-1 bg-muted md:block"><div className="h-1 bg-accent" style={{ width: `${r.w}%` }} /></div>
                  <span className={cn("hidden text-right font-mono text-xs md:block", r.s === "Needs attention" ? "text-accent" : "text-muted-foreground")}>{r.s}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* SECTION 11 — Principles */
export function PlatformPrinciples() {
  return (
    <section id="principles" className="border-t border-border py-28 md:py-36">
      <div className="container-x">
        <SectionLabel n="09">Principles</SectionLabel>
        <ol className="mt-14">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p} i={0}>
              <li className="group flex items-baseline gap-6 border-t border-border py-6 last:border-b">
                <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-display text-[clamp(2rem,5vw,4.5rem)] leading-none transition-all duration-500 group-hover:italic group-hover:text-accent">{p}</span>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* SECTION 12 — Final CTA */
export function FinalCTA() {
  return (
    <section className="border-t border-border bg-foreground py-28 text-background md:py-40">
      <div className="container-x">
        <LineReveal className="max-w-5xl font-display text-statement" lines={["Build a clearer path", <>from learning to <em>employability.</em></>]} />
        <Reveal className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <p className="max-w-md text-lg opacity-70">Bring training, evidence, skills and placement preparation into one connected platform.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="xl" className="bg-background text-foreground hover:bg-accent hover:text-accent-foreground">
              <Link to="/login">
                Classroom <ArrowRight />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* SECTION 13 — Footer */
export function Footer() {
  return (
    <footer className="border-t border-border py-16">
      <div className="container-x grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Wordmark />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">College employability intelligence. Evidence in, clearer decisions out.</p>
        </div>
        <nav className="grid grid-cols-2 gap-3 text-sm md:col-span-4" aria-label="Footer">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`} className="text-muted-foreground hover:text-foreground">{n.label}</a>)}
          <Link to="/login" className="text-muted-foreground hover:text-foreground">Classroom</Link>
        </nav>
        <div className="space-y-3 text-sm md:col-span-3">
          {SITE.contactEmail ? <a href={`mailto:${SITE.contactEmail}`} className="block hover:text-accent">{SITE.contactEmail}</a> : <p className="text-muted-foreground">Contact details coming soon</p>}
          <Link to="/legal/$doc" params={{ doc: "privacy" }} className="block text-muted-foreground hover:text-foreground">Privacy</Link>
          <Link to="/legal/$doc" params={{ doc: "terms" }} className="block text-muted-foreground hover:text-foreground">Terms</Link>
          {SITE.social.map((s) => <a key={s.href} href={s.href} className="block text-muted-foreground hover:text-foreground">{s.label}</a>)}
        </div>
      </div>
      <div className="container-x mt-16 flex justify-between border-t border-border pt-6 font-mono text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Ziphyrus X</span>
        <span>Evidence → Outcomes</span>
      </div>
    </footer>
  );
}
