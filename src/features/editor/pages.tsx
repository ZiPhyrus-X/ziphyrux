import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Metric, Panel, fmt } from "@/features/super-admin/page";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { ErrorState, EmptyState, Field, HistoryList, KV, NotImplemented, ReasonDialog } from "@/components/workspace/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { authService } from "@/lib/auth/service";
import { editorService as svc, latest, validateQuestion, type ContentStatus, type Domain, type QType, type Course, type Assessment, type Notification, type Override, type Feature } from "./mock-service";

function useData<T>(key: string, fn: () => Promise<T>) {
  return useQuery({ queryKey: ["editor", key], queryFn: fn });
}
function useAct<A>(fn: (a: A) => Promise<unknown>, ok: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => { qc.invalidateQueries({ queryKey: ["editor"] }); toast.success(ok); } });
}
function Load<T>({ q, children }: { q: { data?: T; isLoading: boolean; error: unknown; refetch: () => void }; children: (d: T) => React.ReactNode }) {
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (q.error || !q.data) return <ErrorState message="The data could not be loaded." onRetry={q.refetch} />;
  return <>{children(q.data)}</>;
}
const Note = () => <p className="mb-6 font-mono text-xs text-muted-foreground">Illustrative preview data — not saved, resets on reload.</p>;

export function EditorOverview() {
  const c = useData("courses", svc.courses), qn = useData("questions", svc.questions), f = useData("features", svc.features), a = useData("audit", svc.audit), as = useData("assessments", svc.assessments);
  const count = (s: ContentStatus) => (c.data ?? []).filter((x) => latest(x.versions).status === s).length;
  return (
    <>
      <PageHeader title="Overview" desc="Content and platform-configuration at a glance." />
      <Note />
      <div className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <Metric label="Drafts" value={count("draft")} note="Courses" />
        <Metric label="In review" value={count("review")} note="Courses" />
        <Metric label="Published" value={count("published")} note="Courses" />
        <Metric label="Questions" value={qn.data?.length ?? "—"} note={`${as.data?.length ?? 0} assessments`} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Feature availability">
          {(f.data ?? []).map((x) => <KV key={x.id} k={x.name} v={<StatusBadge s={x.enabled ? "active" : "inactive"} />} />)}
        </Panel>
        <Panel title="Recent changes (this session)">
          {a.data?.length ? <HistoryList items={a.data.slice(0, 6)} /> : <p className="text-sm text-muted-foreground">No changes yet.</p>}
        </Panel>
        <Panel title="Validation warnings">
          {(qn.data ?? []).filter((q) => validateQuestion(q).length).length === 0 ? <p className="text-sm text-muted-foreground">No content warnings.</p> : null}
        </Panel>
        <Panel title="Scheduled publishing"><p className="text-sm text-muted-foreground">Scheduling isn't defined by the backend yet.</p></Panel>
      </div>
    </>
  );
}

export function FeaturesPage() {
  const q = useData("features", svc.features);
  const [pending, setPending] = useState<Feature | null>(null);
  const act = useAct((a: { id: string; on: boolean; reason: string }) => svc.setFeature(a.id, a.on, a.reason), "Availability saved");
  return (
    <>
      <PageHeader title="Feature Availability" desc="Whether a feature is available. This does not grant anyone permission to use it." />
      <Note />
      <Load q={q}>{(rows) => (
        <div className="grid gap-4">
          {rows.map((f) => (
            <div key={f.id} className="grid gap-4 border border-border p-5 md:grid-cols-[1fr_auto]">
              <div>
                <div className="flex items-center gap-3"><h2 className="font-display text-2xl">{f.name}</h2><StatusBadge s={f.enabled ? "active" : "inactive"} /></div>
                <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">Scope: {f.scope} · Updated {fmt(f.updatedAt)} by {f.updatedBy}</p>
                <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted-foreground">History</summary><div className="mt-3"><HistoryList items={f.history} /></div></details>
              </div>
              <Switch checked={f.enabled} onCheckedChange={() => setPending(f)} aria-label={`Toggle ${f.name}`} />
            </div>
          ))}
        </div>
      )}</Load>
      {pending && (
        <ReasonDialog open onOpenChange={(o) => !o && setPending(null)} title={`${pending.enabled ? "Disable" : "Enable"} ${pending.name}?`}
          description="This changes availability for everyone in scope. User permissions are not affected." confirmLabel={pending.enabled ? "Disable" : "Enable"}
          onConfirm={async (reason) => { await act.mutateAsync({ id: pending.id, on: !pending.enabled, reason }); }} />
      )}
    </>
  );
}

type Row<T> = T & { id: string };
export function ContentPage() {
  const q = useData("courses", svc.courses);
  const [sel, setSel] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [title, setTitle] = useState("");
  const create = useAct((t: string) => svc.createCourse(t), "Draft course created");
  return (
    <>
      <PageHeader title="Learning Content" desc="Course → Version → Module → Topic → Lesson → Activity. Published versions are never rewritten." actions={<Button onClick={() => setNewOpen(true)}><Plus /> New course</Button>} />
      <Note />
      <p className="mb-4 text-sm text-muted-foreground">Courses stay unavailable to learners while “Training & Courses” is disabled in Feature Availability.</p>
      <Load q={q}>{(rows) => {
        const data = rows.map((c) => ({ id: c.id, title: c.title, version: `v${latest(c.versions).version}`, status: latest(c.versions).status, updated: c.updatedAt }));
        const course = rows.find((c) => c.id === sel);
        return (<>
          <DataTable rows={data} searchKeys={["title"]} filterKey="status" onRowClick={(r) => setSel(r.id)}
            columns={[{ key: "title", label: "Course" }, { key: "version", label: "Version" }, { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> }, { key: "updated", label: "Updated", render: (r) => fmt(r.updated) }]} />
          <Sheet open={!!course} onOpenChange={(o) => !o && setSel(null)}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-xl">{course && <CourseDetail c={course} />}</SheetContent>
          </Sheet>
        </>);
      }}</Load>
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New course</DialogTitle></DialogHeader>
          <Field label="Course title" error={title && title.trim().length < 3 ? "At least 3 characters." : undefined}><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <DialogFooter><Button disabled={title.trim().length < 3 || create.isPending} onClick={async () => { await create.mutateAsync(title.trim()); setTitle(""); setNewOpen(false); }}>Create draft</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CourseDetail({ c }: { c: Course }) {
  const v = latest(c.versions);
  const [dlg, setDlg] = useState<null | { label: string; run: (r: string) => Promise<unknown> }>(null);
  const [mod, setMod] = useState("");
  const status = useAct((a: { s: ContentStatus; r: string }) => svc.setCourseStatus(c.id, a.s, a.r), "Status updated");
  const ver = useAct((r: string) => svc.newCourseVersion(c.id, r), "New draft version created");
  const add = useMutation({ mutationFn: (t: string) => svc.addModule(c.id, t) });
  const qc = useQueryClient();
  return (
    <>
      <SheetHeader><SheetTitle className="font-display text-2xl">{c.title}</SheetTitle></SheetHeader>
      <div className="mt-4 space-y-6">
        <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs">v{v.version}</span><StatusBadge s={v.status} />
          <span className="font-mono text-xs text-muted-foreground">{c.versions.length} version(s) · skills: {c.skills.join(", ") || "none linked"}</span></div>
        <div className="flex flex-wrap gap-2">
          {v.status === "draft" && <Button size="sm" onClick={() => setDlg({ label: "Submit for review", run: (r) => status.mutateAsync({ s: "review", r }) })}>Submit for review</Button>}
          {v.status === "review" && <Button size="sm" onClick={() => setDlg({ label: "Publish", run: (r) => status.mutateAsync({ s: "published", r }) })}>Publish v{v.version}</Button>}
          {(v.status === "published" || v.status === "archived") && <Button size="sm" variant="outline" onClick={() => setDlg({ label: "Create draft", run: (r) => ver.mutateAsync(r) })}>New draft version</Button>}
          {v.status === "published" && <Button size="sm" variant="ghost" onClick={() => setDlg({ label: "Archive", run: (r) => status.mutateAsync({ s: "archived", r }) })}>Archive</Button>}
        </div>
        <Panel title={`Structure (v${v.version})`}>
          {v.modules.length === 0 && <p className="text-sm text-muted-foreground">No modules yet.</p>}
          <ul className="space-y-3 text-sm">{v.modules.map((m, i) => (
            <li key={i}><p className="font-medium">Module · {m.title}</p>
              {m.topics.map((t, j) => <div key={j} className="ml-4 mt-1"><p>Topic · {t.title}</p>
                {t.lessons.map((l, k) => <p key={k} className="ml-4 text-muted-foreground">Lesson · {l.title} <span className="font-mono text-xs">({l.activities.join(", ")})</span></p>)}</div>)}
            </li>))}</ul>
          {v.status === "draft" && (
            <div className="mt-4 flex gap-2"><Input value={mod} onChange={(e) => setMod(e.target.value)} placeholder="New module title" />
              <Button variant="outline" disabled={!mod.trim()} onClick={async () => { try { await add.mutateAsync(mod.trim()); setMod(""); qc.invalidateQueries({ queryKey: ["editor"] }); } catch (e) { toast.error((e as Error).message); } }}>Add</Button></div>
          )}
          {v.status !== "draft" && <p className="mt-4 text-xs text-muted-foreground">This version is locked. Create a new draft version to make changes.</p>}
        </Panel>
        <Panel title="History"><HistoryList items={c.history} /></Panel>
      </div>
      {dlg && <ReasonDialog open onOpenChange={(o) => !o && setDlg(null)} title={`${dlg.label}?`} description="This is recorded in the content history." confirmLabel={dlg.label} onConfirm={async (r) => { await dlg.run(r); }} />}
    </>
  );
}

const DOMAINS: Domain[] = ["Technical", "Aptitude", "Verbal", "Soft Skills"];
const TYPES: QType[] = ["MCQ", "Short Answer", "Long Answer"];
export function QuestionsPage() {
  const q = useData("questions", svc.questions);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [dlg, setDlg] = useState<ContentStatus | null>(null);
  const status = useAct((a: { id: string; s: ContentStatus; r: string }) => svc.setQuestionStatus(a.id, a.s, a.r), "Status updated");
  return (
    <>
      <PageHeader title="Question Management" desc="Technical, Aptitude, Verbal and Soft Skills. MCQ, Short Answer and Long Answer." actions={<Button onClick={() => setOpen(true)}><Plus /> New question</Button>} />
      <Note />
      <Load q={q}>{(rows) => {
        const cur = rows.find((r) => r.id === sel);
        return (<>
          <DataTable rows={rows.map((r) => ({ ...r, ver: `v${r.version}` }))} searchKeys={["text", "domain"]} filterKey="domain" onRowClick={(r) => setSel(r.id)}
            columns={[{ key: "text", label: "Question", className: "max-w-md truncate" }, { key: "domain", label: "Domain" }, { key: "type", label: "Type" }, { key: "source", label: "Source" }, { key: "ver", label: "Version" }, { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> }]} />
          <Sheet open={!!cur} onOpenChange={(o) => !o && setSel(null)}>
            <SheetContent className="overflow-y-auto">{cur && (<>
              <SheetHeader><SheetTitle>Preview</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <p className="font-mono text-xs text-muted-foreground">{cur.domain} · {cur.type} · v{cur.version} · {cur.source}</p>
                <p className="text-base">{cur.text}</p>
                {cur.options && <ol className="space-y-1">{cur.options.map((o, i) => <li key={i} className={i === cur.correct ? "text-success" : ""}>{String.fromCharCode(65 + i)}. {o}{i === cur.correct && " ✓"}</li>)}</ol>}
                {cur.answer && <KV k="Model answer" v={cur.answer} />}
                {cur.explanation && <KV k="Explanation" v={cur.explanation} />}
                {cur.source === "AI-assisted" && cur.status === "draft" && <p className="text-xs text-warning">AI-assisted — stays a draft until someone reviews and publishes it.</p>}
                <div className="flex gap-2">
                  {cur.status !== "published" && cur.status !== "archived" && <Button size="sm" onClick={() => setDlg("published")}>Review & publish</Button>}
                  {cur.status === "published" && <Button size="sm" variant="ghost" onClick={() => setDlg("archived")}>Archive</Button>}
                </div>
              </div>
              {dlg && <ReasonDialog open onOpenChange={(o) => !o && setDlg(null)} title={dlg === "published" ? "Publish question?" : "Archive question?"} description="Questions already in a published assessment version are not changed." onConfirm={async (r) => { await status.mutateAsync({ id: cur.id, s: dlg, r }); }} />}
            </>)}</SheetContent>
          </Sheet>
        </>);
      }}</Load>
      <QuestionForm open={open} onOpenChange={setOpen} />
      <p className="mt-6 text-xs text-muted-foreground">Bulk import (Excel/CSV), Question Bank and AI-assisted generation will be enabled once the backend contract is defined.</p>
    </>
  );
}

function QuestionForm({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const blank = { domain: "Aptitude" as Domain, type: "MCQ" as QType, text: "", options: ["", "", "", ""], correct: undefined as number | undefined, answer: "", explanation: "" };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState<string | null>(null);
  const save = useAct(() => svc.saveQuestion({ ...f, source: "Manual", options: f.type === "MCQ" ? f.options : undefined, correct: f.type === "MCQ" ? f.correct : undefined }), "Draft question saved");
  const errs = validateQuestion(f);
  const explanationOnly = f.domain === "Verbal" || f.domain === "Soft Skills";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New question (draft)</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Domain"><Select value={f.domain} onValueChange={(v) => setF({ ...f, domain: v as Domain })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DOMAINS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Type"><Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as QType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></Field>
        </div>
        <Field label="Question text"><Textarea value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} /></Field>
        {f.type === "MCQ" ? (
          <div className="space-y-2"><p className="text-sm">Four options — tick the one correct answer</p>
            {f.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={f.correct === i} onChange={() => setF({ ...f, correct: i })} aria-label={`Option ${i + 1} is correct`} />
                <Input value={o} placeholder={`Option ${String.fromCharCode(65 + i)}`} onChange={(e) => { const opts = [...f.options]; opts[i] = e.target.value; setF({ ...f, options: opts }); }} />
              </div>))}
          </div>
        ) : explanationOnly ? (
          <Field label="Explanation (explanation-only for this domain)"><Textarea value={f.explanation} onChange={(e) => setF({ ...f, explanation: e.target.value })} /></Field>
        ) : (<>
          <Field label="Model answer"><Textarea value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} /></Field>
          <Field label="Explanation (optional)"><Textarea value={f.explanation} onChange={(e) => setF({ ...f, explanation: e.target.value })} /></Field>
        </>)}
        {errs.length > 0 && <ul className="text-xs text-muted-foreground">{errs.map((e) => <li key={e}>• {e}</li>)}</ul>}
        {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
        <DialogFooter><Button disabled={errs.length > 0 || save.isPending} onClick={async () => { setErr(null); try { await save.mutateAsync(undefined); setF(blank); onOpenChange(false); } catch (e) { setErr((e as Error).message); } }}>Save draft</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssessmentsPage() {
  const q = useData("assessments", svc.assessments), qs = useData("questions", svc.questions);
  const [sel, setSel] = useState<string | null>(null);
  const [create, setCreate] = useState(false);
  return (
    <>
      <PageHeader title="Assessment Content" desc="Versioned assessments. Published versions and past attempts are preserved; official results are never edited here." actions={<Button onClick={() => setCreate(true)}><Plus /> New assessment</Button>} />
      <Note />
      <Load q={q}>{(rows) => {
        const cur = rows.find((r) => r.id === sel);
        return (<>
          <DataTable rows={rows.map((a) => ({ id: a.id, title: a.title, ver: `v${latest(a.versions).version}`, status: latest(a.versions).status, n: String(latest(a.versions).questionIds.length) }))} searchKeys={["title"]} filterKey="status" onRowClick={(r) => setSel(r.id)}
            columns={[{ key: "title", label: "Assessment" }, { key: "ver", label: "Version" }, { key: "n", label: "Questions" }, { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> }]} />
          <Sheet open={!!cur} onOpenChange={(o) => !o && setSel(null)}><SheetContent className="w-full overflow-y-auto sm:max-w-xl">{cur && <AssessmentDetail a={cur} all={qs.data ?? []} />}</SheetContent></Sheet>
        </>);
      }}</Load>
      <AssessmentPicker open={create} onOpenChange={setCreate} questions={qs.data ?? []} />
    </>
  );
}

function QuestionPicker({ questions, value, onChange }: { questions: { id: string; text: string; status: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  const usable = questions.filter((q) => q.status === "published");
  const move = (i: number, d: number) => { const v = [...value]; const [x] = v.splice(i, 1); v.splice(i + d, 0, x); onChange(v); };
  return (
    <div className="space-y-3">
      <p className="text-sm">Published questions</p>
      {usable.length === 0 && <p className="text-xs text-muted-foreground">No published questions yet.</p>}
      {usable.map((q) => <label key={q.id} className="flex items-start gap-2 text-sm"><Checkbox checked={value.includes(q.id)} onCheckedChange={(c) => onChange(c ? [...value, q.id] : value.filter((x) => x !== q.id))} />{q.text}</label>)}
      {value.length > 1 && <div><p className="text-sm">Order</p>{value.map((id, i) => (
        <div key={id} className="flex items-center gap-2 text-xs"><span className="font-mono">{i + 1}.</span><span className="flex-1 truncate">{questions.find((q) => q.id === id)?.text}</span>
          <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)}>↑</Button><Button size="sm" variant="ghost" disabled={i === value.length - 1} onClick={() => move(i, 1)}>↓</Button></div>))}</div>}
    </div>
  );
}

function AssessmentPicker({ open, onOpenChange, questions }: { open: boolean; onOpenChange: (o: boolean) => void; questions: { id: string; text: string; status: string }[] }) {
  const [title, setTitle] = useState(""); const [dur, setDur] = useState("30"); const [ids, setIds] = useState<string[]>([]);
  const act = useAct(() => svc.createAssessment(title.trim(), Number(dur), ids), "Draft assessment created");
  const valid = title.trim().length >= 3 && Number(dur) > 0 && ids.length > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New assessment (draft)</DialogTitle></DialogHeader>
        <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Duration (minutes)"><Input type="number" min={1} value={dur} onChange={(e) => setDur(e.target.value)} /></Field>
        <QuestionPicker questions={questions} value={ids} onChange={setIds} />
        <DialogFooter><Button disabled={!valid || act.isPending} onClick={async () => { await act.mutateAsync(undefined); setTitle(""); setIds([]); onOpenChange(false); }}>Create draft</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssessmentDetail({ a, all }: { a: Assessment; all: { id: string; text: string; status: string }[] }) {
  const v = latest(a.versions);
  const [ids, setIds] = useState<string[] | null>(null);
  const [dlg, setDlg] = useState<"publish" | "version" | null>(null);
  const pub = useAct((r: string) => svc.publishAssessment(a.id, r), "Published");
  const ver = useAct((r: string) => svc.newAssessmentVersion(a.id, ids ?? v.questionIds, r), "New draft version created");
  return (
    <>
      <SheetHeader><SheetTitle className="font-display text-2xl">{a.title}</SheetTitle></SheetHeader>
      <div className="mt-4 space-y-6">
        <div className="flex items-center gap-2"><span className="font-mono text-xs">v{v.version} · {a.durationMin} min</span><StatusBadge s={v.status} /></div>
        <Panel title="Questions (preview)"><ol className="list-decimal space-y-1 pl-5 text-sm">{v.questionIds.map((id) => <li key={id}>{all.find((q) => q.id === id)?.text ?? id}</li>)}</ol></Panel>
        {v.status === "draft" ? <Button onClick={() => setDlg("publish")}>Publish v{v.version}</Button> : ids === null ? <Button variant="outline" onClick={() => setIds(v.questionIds)}>Start new version</Button> : (
          <Panel title={`Draft v${v.version + 1}`}><QuestionPicker questions={all} value={ids} onChange={setIds} />
            <div className="mt-4 flex gap-2"><Button disabled={!ids.length} onClick={() => setDlg("version")}>Save draft version</Button><Button variant="ghost" onClick={() => setIds(null)}>Cancel</Button></div>
            <p className="mt-2 text-xs text-muted-foreground">v{v.version} and its attempts stay unchanged.</p></Panel>
        )}
        <Panel title="All versions">{a.versions.map((x) => <KV key={x.version} k={`v${x.version} · ${x.questionIds.length} questions`} v={<StatusBadge s={x.status} />} />)}</Panel>
        <Panel title="History"><HistoryList items={a.history} /></Panel>
      </div>
      {dlg && <ReasonDialog open onOpenChange={(o) => !o && setDlg(null)} title={dlg === "publish" ? "Publish this version?" : "Create new draft version?"} description="Earlier versions are kept as they are." onConfirm={async (r) => { await (dlg === "publish" ? pub : ver).mutateAsync(r); setIds(null); }} />}
    </>
  );
}

const TARGETS = ["All students", "All trainers", "All coordinators", "Specific college (via Targeting Engine)"];
export function NotificationsPage() {
  const q = useData("notifications", svc.notifications);
  const [edit, setEdit] = useState<Partial<Notification> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const save = useAct((n: { id?: string; title: string; message: string; target: string }) => svc.saveNotification(n), "Draft saved");
  return (
    <>
      <PageHeader title="Notifications" desc="Draft, preview and track notifications. Targeting and delivery are validated by the backend." actions={<Button onClick={() => setEdit({ title: "", message: "", target: TARGETS[0] })}><Plus /> New notification</Button>} />
      <Note />
      <Load q={q}>{(rows) => rows.length ? (
        <DataTable rows={rows} searchKeys={["title"]} filterKey="status" onRowClick={(r) => setEdit(r)}
          columns={[{ key: "title", label: "Title" }, { key: "target", label: "Audience" }, { key: "status", label: "Delivery", render: (r) => <StatusBadge s={r.status} /> }, { key: "updatedAt", label: "Updated", render: (r) => fmt(r.updatedAt) }]} />
      ) : <EmptyState message="No notifications yet." />}</Load>
      <Dialog open={!!edit} onOpenChange={(o) => { if (!o) { setEdit(null); setErr(null); } }}>
        {edit && <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit.id ? "Edit notification" : "New notification"}</DialogTitle></DialogHeader>
          <Field label="Title"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} disabled={!!edit.status && edit.status !== "draft"} /></Field>
          <Field label="Message"><Textarea value={edit.message} onChange={(e) => setEdit({ ...edit, message: e.target.value })} disabled={!!edit.status && edit.status !== "draft"} /></Field>
          <Field label="Audience"><Select value={edit.target} onValueChange={(v) => setEdit({ ...edit, target: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TARGETS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></Field>
          <div className="border border-dashed border-border p-4"><p className="eyebrow">Preview</p><p className="mt-2 font-medium">{edit.title || "Title"}</p><p className="text-sm text-muted-foreground">{edit.message || "Message"}</p><p className="mt-2 font-mono text-xs text-muted-foreground">To: {edit.target}</p></div>
          {edit.history && <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">History</summary><div className="mt-3"><HistoryList items={edit.history} /></div></details>}
          {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
          <p className="text-xs text-muted-foreground">Sending is not available until the delivery service is connected.</p>
          <DialogFooter><Button disabled={!edit.title?.trim() || !edit.message?.trim() || save.isPending} onClick={async () => { try { await save.mutateAsync({ id: edit.id, title: edit.title!, message: edit.message!, target: edit.target! }); setEdit(null); } catch (e) { setErr((e as Error).message); } }}>Save draft</Button></DialogFooter>
        </DialogContent>}
      </Dialog>
    </>
  );
}

export function OverridesPage() {
  const q = useData("overrides", svc.overrides);
  const [sel, setSel] = useState<Override | null>(null);
  const [visible, setVisible] = useState(""); const [active, setActive] = useState(true);
  const act = useAct((a: { r: string }) => svc.setOverride(sel!.id, visible, active, a.r), "Override saved");
  return (
    <>
      <PageHeader title="Visible-Value Overrides" desc="Changes what people see only. Underlying data, calculations, readiness, matches and analytics keep using the actual value." />
      <Note />
      <Load q={q}>{(rows) => (
        <DataTable rows={rows} searchKeys={["entity", "field"]} onRowClick={(r) => { setSel(r); setVisible(r.visible); setActive(r.active); }}
          columns={[{ key: "entity", label: "Entity" }, { key: "field", label: "Field" }, { key: "actual", label: "Actual (system)" }, { key: "visible", label: "Visible" }, { key: "active", label: "Status", render: (r) => <StatusBadge s={r.active ? "active" : "inactive"} /> }, { key: "updatedAt", label: "Updated", render: (r) => `${fmt(r.updatedAt)} · ${r.updatedBy}` }]} />
      )}</Load>
      {sel && (
        <ReasonDialog open onOpenChange={(o) => !o && setSel(null)} title={`Override · ${sel.field}`} description={sel.entity} confirmLabel="Save override" extraValid={!!visible.trim()}
          onConfirm={async (r) => { await act.mutateAsync({ r }); }}>
          <KV k="Actual value (unchanged)" v={sel.actual} />
          <Field label="Visible value"><Input value={visible} onChange={(e) => setVisible(e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm"><Switch checked={active} onCheckedChange={setActive} /> Override in effect</label>
          <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">History</summary><div className="mt-3"><HistoryList items={sel.history} /></div></details>
        </ReasonDialog>
      )}
    </>
  );
}

export function HistoryPage() {
  const q = useData("audit", svc.audit);
  return (
    <>
      <PageHeader title="Content History" desc="Every change made in this workspace, newest first." />
      <Note />
      <Load q={q}>{(rows) => rows.length ? (
        <DataTable rows={rows.map((r, i) => ({ id: String(i), ...r, reason: r.reason ?? "—" }))} searchKeys={["action", "area", "reason"]} filterKey="area"
          columns={[{ key: "at", label: "When", render: (r) => fmt(r.at) }, { key: "area", label: "Area" }, { key: "action", label: "Change" }, { key: "reason", label: "Reason" }, { key: "by", label: "By" }]} />
      ) : <EmptyState message="Changes you make in this session will appear here." />}</Load>
    </>
  );
}

export function AccountPage() {
  const s = authService.getSession();
  return (
    <>
      <PageHeader title="My Account" />
      {s && <Panel title="Profile"><KV k="Name" v={s.user.name} /><KV k="Login ID" v={s.user.loginId} /><KV k="Role" v="Editor" /><KV k="Session started" v={fmt(s.issuedAt)} /></Panel>}
      <div className="mt-6"><NotImplemented what="Password changes" /></div>
    </>
  );
}
export type { Row };
