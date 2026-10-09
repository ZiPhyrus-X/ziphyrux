import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AUDIT, COLLEGES, INTEGRATIONS, JOBS, SERVICES, SIGNUPS, USERS } from "@/features/super-admin/mock-data";
import { Metric, PageHeader, Panel } from "@/features/super-admin/page";
import { StatusBadge } from "@/components/tables/data-table";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Overview — Ziphyrus X Super Admin" }, { name: "robots", content: "noindex" }] }),
  component: Overview,
});

function Overview() {
  const count = (r: string) => USERS.filter((u) => u.role === r).length;
  const failed = JOBS.filter((j) => j.status === "failed").length;
  return (
    <>
      <PageHeader title="Platform overview" desc="Governance view across colleges, accounts, services and jobs. All figures are illustrative development data." />
      <div className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-5">
        <Metric label="Registered colleges" value={COLLEGES.length} note={`${COLLEGES.filter((c) => c.status === "active").length} active`} />
        <Metric label="Student accounts" value={count("Student")} />
        <Metric label="Trainer accounts" value={count("Trainer")} />
        <Metric label="Coordinators" value={count("Coordinator")} />
        <Metric label="Failed jobs (24h)" value={<span className={failed ? "text-destructive" : ""}>{failed}</span>} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Panel title="Account creation, last 12 months">
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={SIGNUPS}>
                  <CartesianGrid strokeDasharray="2 6" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Area dataKey="students" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={1.5} />
                  <Area dataKey="staff" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.08} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
        <Panel title="System health" action={<Link to="/admin/m/$module" params={{ module: "health" }} className="text-xs text-accent hover:underline">Details</Link>}>
          <ul className="space-y-3 text-sm">
            {SERVICES.map((s) => <li key={s.id} className="flex items-center justify-between"><span>{s.name}</span><StatusBadge s={s.status} /></li>)}
          </ul>
        </Panel>
        <Panel title="Integrations">
          <ul className="space-y-3 text-sm">
            {INTEGRATIONS.map((s) => <li key={s.id} className="flex items-center justify-between"><span>{s.name}</span><StatusBadge s={s.status} /></li>)}
          </ul>
        </Panel>
        <Panel title="Background jobs" action={<Link to="/admin/m/$module" params={{ module: "jobs" }} className="text-xs text-accent hover:underline">All jobs</Link>}>
          <ul className="space-y-3 text-sm">
            {JOBS.slice(0, 6).map((j) => <li key={j.id} className="flex items-center justify-between gap-3"><span className="truncate font-mono text-xs">{j.type}</span><StatusBadge s={j.status} /></li>)}
          </ul>
        </Panel>
        <Panel title="Recent administrative activity" action={<Link to="/admin/m/$module" params={{ module: "audit" }} className="text-xs text-accent hover:underline">Audit log</Link>}>
          <ul className="space-y-3 text-sm">
            {AUDIT.slice(0, 6).map((a) => (
              <li key={a.id} className="flex justify-between gap-3">
                <span><span className="font-mono text-xs">{a.action}</span> <span className="text-muted-foreground">· {a.target}</span></span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.at))}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
