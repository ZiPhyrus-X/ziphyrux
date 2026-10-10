import { createFileRoute, notFound } from "@tanstack/react-router";
import { toast } from "sonner";
import { Upload, Plus, RotateCw } from "lucide-react";
import { AUDIT, INTEGRATIONS, JOBS, MASTER, PERMISSIONS, PROBLEMS, QUESTIONS, SERVICES } from "@/features/super-admin/mock-data";
import { ADMIN_NAV, type ModuleSlug } from "@/features/super-admin/nav";
import { Metric, PageHeader, Panel, fmt } from "@/features/super-admin/page";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const DESC: Record<ModuleSlug, string> = {
  roles: "Roles, permissions and the scope each one is restricted to.",
  "master-data": "Reference data used across the platform. Records are archived, never silently deleted.",
  coding: "Coding problems, versions and lifecycle status.",
  questions: "Technical, aptitude, verbal and soft-skill question banks.",
  health: "Live status of platform services.",
  integrations: "Connected services and their synchronisation state.",
  jobs: "Scheduled and on-demand background work.",
  audit: "An immutable record of administrative and security events.",
  settings: "Platform-wide configuration.",
};

export const Route = createFileRoute("/admin/m/$module")({
  loader: ({ params }) => {
    if (!(params.module in DESC)) throw notFound();
    return { slug: params.module as ModuleSlug };
  },
  head: () => ({ meta: [{ title: "Ziphyrus - X" }, { name: "robots", content: "noindex" }] }),
  component: ModulePage,
});

const preview = (msg: string) => () => toast.info(`${msg} — available once the backend is connected.`);

function ModulePage() {
  const { slug } = Route.useLoaderData();
  const label = ADMIN_NAV.find((n) => n.slug === slug)?.label ?? "";
  return (
    <>
      <PageHeader title={label} desc={DESC[slug]} />
      <Body slug={slug} />
    </>
  );
}

function Body({ slug }: { slug: ModuleSlug }) {
  switch (slug) {
    case "roles":
      return <DataTable rows={PERMISSIONS} searchKeys={["role", "permission"]} filterKey="role" columns={[
        { key: "role", label: "Role" },
        { key: "permission", label: "Permission", render: (r) => <span className="font-mono text-xs">{r.permission}</span> },
        { key: "scope", label: "Scope" },
        { key: "description", label: "Description", className: "hidden md:table-cell" },
      ]} />;
    case "master-data":
      return <DataTable rows={MASTER} searchKeys={["entity"]} toolbar={<Button variant="hero" size="sm" onClick={preview("Adding master data")}><Plus /> New record</Button>} columns={[
        { key: "entity", label: "Entity" },
        { key: "records", label: "Records" },
        { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> },
        { key: "updatedAt", label: "Updated", render: (r) => fmt(r.updatedAt) },
      ]} />;
    case "coding":
      return <DataTable rows={PROBLEMS} searchKeys={["title", "id"]} filterKey="status" toolbar={<Button variant="hero" size="sm" onClick={preview("The problem editor")}><Plus /> New problem</Button>} columns={[
        { key: "id", label: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
        { key: "title", label: "Title" },
        { key: "difficulty", label: "Difficulty" },
        { key: "topic", label: "Topic", className: "hidden md:table-cell" },
        { key: "version", label: "Version", className: "hidden md:table-cell" },
        { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> },
      ]} />;
    case "questions":
      return <DataTable rows={QUESTIONS} searchKeys={["stem", "id"]} filterKey="domain" toolbar={<>
        <Button variant="line" size="sm" onClick={preview("Excel/CSV import")}><Upload /> Bulk import</Button>
        <Button variant="hero" size="sm" onClick={preview("The question editor")}><Plus /> New question</Button>
      </>} columns={[
        { key: "id", label: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
        { key: "stem", label: "Question" },
        { key: "domain", label: "Domain" },
        { key: "type", label: "Type", className: "hidden md:table-cell" },
        { key: "difficulty", label: "Difficulty", className: "hidden md:table-cell" },
        { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> },
      ]} />;
    case "health":
      return (
        <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div key={s.id} className="bg-background p-5">
              <div className="flex items-center justify-between"><p className="text-sm">{s.name}</p><StatusBadge s={s.status} /></div>
              <p className="mt-4 font-display text-3xl">{s.latency}</p>
              <p className="mt-1 text-xs text-muted-foreground">Last check {fmt(s.checkedAt)}</p>
            </div>
          ))}
        </div>
      );
    case "integrations":
      return <DataTable rows={INTEGRATIONS} searchKeys={["name"]} columns={[
        { key: "name", label: "Integration" },
        { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> },
        { key: "capabilities", label: "Capabilities", className: "hidden md:table-cell" },
        { key: "lastSync", label: "Last sync", render: (r) => fmt(r.lastSync) },
        { key: "lastError", label: "Last error", className: "hidden lg:table-cell" },
      ]} />;
    case "jobs":
      return (
        <>
          <div className="mb-6 grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-4">
            {(["succeeded", "running", "queued", "failed"] as const).map((s) => <Metric key={s} label={s} value={JOBS.filter((j) => j.status === s).length} />)}
          </div>
          <DataTable rows={JOBS} searchKeys={["type", "id"]} filterKey="status" columns={[
            { key: "type", label: "Job type", render: (r) => <span className="font-mono text-xs">{r.type}</span> },
            { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> },
            { key: "attempts", label: "Attempts" },
            { key: "duration", label: "Duration", className: "hidden md:table-cell" },
            { key: "startedAt", label: "Started", render: (r) => fmt(r.startedAt) },
            { key: "id", label: "", sortable: false, render: (r) => r.status === "failed" ? <Button size="sm" variant="line" onClick={(e) => { e.stopPropagation(); preview("Retrying jobs")(); }}><RotateCw /> Retry</Button> : null },
          ]} />
        </>
      );
    case "audit":
      return <DataTable rows={AUDIT} searchKeys={["actor", "action", "target"]} filterKey="severity" pageSize={15} columns={[
        { key: "at", label: "Time", render: (r) => fmt(r.at) },
        { key: "actor", label: "Actor", render: (r) => <span className="font-mono text-xs">{r.actor}</span> },
        { key: "action", label: "Action", render: (r) => <span className="font-mono text-xs">{r.action}</span> },
        { key: "target", label: "Target" },
        { key: "severity", label: "Severity", render: (r) => <StatusBadge s={r.severity} /> },
      ]} />;
    case "settings":
      return (
        <Panel title="Feature availability">
          <ul className="divide-y divide-border">
            {["Employer workspace", "Student self-registration", "Recommendation engine", "Coding judge submissions"].map((f, i) => (
              <li key={f} className="flex items-center justify-between py-4">
                <Label htmlFor={`f-${i}`} className="font-normal">{f}</Label>
                <Switch id={`f-${i}`} defaultChecked={i !== 1} onCheckedChange={preview("Saving settings")} />
              </li>
            ))}
          </ul>
        </Panel>
      );
  }
}
