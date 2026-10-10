import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AUDIT, COLLEGES, USERS } from "@/features/super-admin/mock-data";
import { Metric, PageHeader, Panel, fmt } from "@/features/super-admin/page";
import { StatusBadge } from "@/components/tables/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/colleges_/$id")({
  loader: ({ params }) => {
    const c = COLLEGES.find((x) => x.id === params.id);
    if (!c) throw notFound();
    return c;
  },
  head: () => ({ meta: [{ title: "Ziphyrus - X" }, { name: "robots", content: "noindex" }] }),
  notFoundComponent: () => <p className="text-muted-foreground">College not found. <Link to="/admin/colleges" className="text-accent">Back to colleges</Link></p>,
  component: CollegeDetail,
});

function CollegeDetail() {
  const c = Route.useLoaderData();
  const users = USERS.filter((u) => u.college === c.code);
  return (
    <>
      <Link to="/admin/colleges" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Colleges</Link>
      <PageHeader title={c.name} desc={`Code ${c.code} · registered ${fmt(c.createdAt)}`} actions={<StatusBadge s={c.status} />} />
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="structure">Academic structure</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-3">
            <Metric label="Campuses" value={c.campuses} />
            <Metric label="Students" value={c.students} />
            <Metric label="Trainers" value={c.trainers} />
          </div>
        </TabsContent>
        <TabsContent value="structure" className="mt-6">
          <Panel title="Departments & programs">
            <p className="text-sm text-muted-foreground">Academic structure is managed in Master Data and will load from the backend once connected.</p>
          </Panel>
        </TabsContent>
        <TabsContent value="accounts" className="mt-6">
          <Panel title={`${users.length} accounts in this sample`}>
            <ul className="divide-y divide-border text-sm">
              {users.map((u) => <li key={u.id} className="flex justify-between py-2"><span>{u.name}</span><span className="text-muted-foreground">{u.role}</span></li>)}
              {users.length === 0 && <li className="py-2 text-muted-foreground">No accounts yet.</li>}
            </ul>
          </Panel>
        </TabsContent>
        <TabsContent value="activity" className="mt-6">
          <Panel title="Recent activity">
            <ul className="divide-y divide-border text-sm">
              {AUDIT.slice(0, 5).map((a) => <li key={a.id} className="flex justify-between py-2"><span className="font-mono text-xs">{a.action}</span><span className="text-xs text-muted-foreground">{fmt(a.at)}</span></li>)}
            </ul>
          </Panel>
        </TabsContent>
      </Tabs>
    </>
  );
}
