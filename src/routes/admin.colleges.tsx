import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { COLLEGES } from "@/features/super-admin/mock-data";
import { PageHeader, fmt } from "@/features/super-admin/page";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/admin/colleges")({
  head: () => ({ meta: [{ title: "Colleges — Ziphyrus X Super Admin" }, { name: "robots", content: "noindex" }] }),
  component: Colleges,
});

const schema = z.object({
  name: z.string().trim().min(3, "College name is required").max(120),
  code: z.string().trim().regex(/^[A-Z0-9]{3,12}$/, "3–12 uppercase letters or digits"),
});

function Colleges() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(COLLEGES);
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: "", code: "" } });

  const submit = form.handleSubmit((v) => {
    if (rows.some((r) => r.code === v.code)) return form.setError("code", { message: "This college code already exists" });
    setRows([{ id: `col-new-${Date.now()}`, name: v.name, code: v.code, status: "pending", campuses: 1, students: 0, trainers: 0, createdAt: new Date().toISOString() }, ...rows]);
    toast.success(`${v.name} added (preview only — not saved to a backend)`);
    form.reset();
    setOpen(false);
  });

  return (
    <>
      <PageHeader title="Colleges" desc="Registered institutions, their unique codes and status." actions={<Button variant="hero" onClick={() => setOpen(true)}><Plus /> Add college</Button>} />
      <DataTable
        rows={rows}
        searchKeys={["name", "code"]}
        filterKey="status"
        onRowClick={(r) => navigate({ to: "/admin/colleges/$id", params: { id: r.id } })}
        columns={[
          { key: "name", label: "College" },
          { key: "code", label: "Code", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
          { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> },
          { key: "campuses", label: "Campuses", className: "hidden md:table-cell" },
          { key: "students", label: "Students", className: "hidden md:table-cell" },
          { key: "createdAt", label: "Registered", className: "hidden lg:table-cell", render: (r) => fmt(r.createdAt) },
        ]}
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add college</SheetTitle>
            <SheetDescription>New colleges start in a pending state.</SheetDescription>
          </SheetHeader>
          <form onSubmit={submit} className="mt-6 space-y-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="c-name">College name</Label>
              <Input id="c-name" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-code">Unique college code</Label>
              <Input id="c-code" className="font-mono uppercase" {...form.register("code", { setValueAs: (v: string) => v.toUpperCase() })} />
              {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
            </div>
            <Button type="submit" variant="hero" className="w-full">Create college</Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
