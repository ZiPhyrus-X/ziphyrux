import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, SlidersHorizontal, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { COLLEGES } from "@/features/super-admin/mock-data";
import { PageHeader, fmt } from "@/features/super-admin/page";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CollegeStatusBadge,
  CollegeStatusChangeDialog,
  type CollegeLifecycleStatus,
} from "@/components/colleges/college-status-components";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/admin/colleges")({
  head: () => ({
    meta: [
      { title: "Colleges — Ziphyrus X Super Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Colleges,
});

const schema = z.object({
  name: z.string().trim().min(3, "College name is required").max(120),
  code: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{3,12}$/, "3–12 uppercase letters or digits"),
  status: z.enum(["active", "hold", "deactive"]),
});

type FormData = z.infer<typeof schema>;

export function Colleges() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>(COLLEGES);
  const [open, setOpen] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [targetCollegeForStatus, setTargetCollegeForStatus] = useState<any | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      code: "",
      status: "active",
    },
  });

  const loadColleges = () => {
    api.colleges
      .list(undefined, selectedStatusFilter === "all" ? undefined : selectedStatusFilter)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRows(data);
        }
      })
      .catch(() => {
        // Fallback to current rows
      });
  };

  useEffect(() => {
    loadColleges();
  }, [selectedStatusFilter]);

  const submit = form.handleSubmit(async (v) => {
    try {
      const created = await api.colleges.create({
        name: v.name,
        code: v.code,
        status: v.status,
      });
      setRows([created, ...rows]);
      toast.success(`${v.name} (${v.code}) created successfully with status ${v.status.toUpperCase()}.`);
      form.reset({ name: "", code: "", status: "active" });
      setOpen(false);
    } catch (e: any) {
      if (e?.message?.includes("already exists")) {
        form.setError("code", { message: "This college code already exists" });
      } else {
        toast.error(e?.message ?? "Failed to create college");
      }
    }
  });

  const filteredRows = selectedStatusFilter === "all"
    ? rows
    : rows.filter((r) => r.status?.toLowerCase() === selectedStatusFilter.toLowerCase());

  return (
    <>
      <PageHeader
        title="Colleges Governance Directory"
        desc="Registered institutions, operational status lifecycle (Active, Hold, Deactive), and unique codes."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="hero" onClick={() => setOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add College
            </Button>
          </div>
        }
      />

      {/* College Status Filter Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Lifecycle Status:</span>
          <div className="flex gap-1.5">
            {[
              { id: "all", label: "All Colleges" },
              { id: "active", label: "Active" },
              { id: "hold", label: "Hold" },
              { id: "deactive", label: "Deactive" },
            ].map((f) => (
              <Button
                key={f.id}
                variant={selectedStatusFilter === f.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedStatusFilter(f.id)}
                className="h-7 text-xs font-normal"
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        <span className="text-xs text-muted-foreground">
          Showing {filteredRows.length} institutions
        </span>
      </div>

      <DataTable
        rows={filteredRows}
        searchKeys={["name", "code"]}
        onRowClick={(r) => navigate({ to: "/admin/colleges/$id", params: { id: r.id } })}
        columns={[
          { key: "name", label: "College" },
          {
            key: "code",
            label: "Code",
            render: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span>,
          },
          {
            key: "status",
            label: "Status",
            render: (r) => <CollegeStatusBadge status={r.status} />,
          },
          { key: "campuses", label: "Campuses", className: "hidden md:table-cell" },
          { key: "students", label: "Students", className: "hidden md:table-cell" },
          {
            key: "createdAt",
            label: "Registered",
            className: "hidden lg:table-cell",
            render: (r) => fmt(r.createdAt),
          },
          {
            key: "actions",
            label: "Quick Actions",
            className: "text-right",
            render: (r) => (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setTargetCollegeForStatus(r);
                }}
              >
                Change Status
              </Button>
            ),
          },
        ]}
      />

      {/* Add College Sheet (Super Admin Only) */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add College</SheetTitle>
            <SheetDescription>
              Register a new college. Only Super Admin has authorization to provision institutions.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={submit} className="mt-6 space-y-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="c-name">College Name</Label>
              <Input
                id="c-name"
                placeholder="e.g. National Institute of Technology"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-code">Unique College Code</Label>
              <Input
                id="c-code"
                placeholder="e.g. NIT101"
                className="font-mono uppercase"
                {...form.register("code", {
                  setValueAs: (v: string) => v.toUpperCase(),
                })}
              />
              {form.formState.errors.code && (
                <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-status">Initial Lifecycle Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="c-status" className="h-9 text-xs">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active" className="text-xs">
                        Active — (Proposed Default) Live operational engagement
                      </SelectItem>
                      <SelectItem value="hold" className="text-xs">
                        Hold — Temporary pause between semesters
                      </SelectItem>
                      <SelectItem value="deactive" className="text-xs">
                        Deactive — Completed/concluded engagement
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.status && (
                <p className="text-xs text-destructive">{form.formState.errors.status.message}</p>
              )}
            </div>

            <Button type="submit" variant="hero" className="w-full mt-4">
              Create College
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* College Status Change Modal */}
      <CollegeStatusChangeDialog
        college={targetCollegeForStatus}
        open={Boolean(targetCollegeForStatus)}
        onOpenChange={(isOpen) => !isOpen && setTargetCollegeForStatus(null)}
        onSuccess={(updated) => {
          setRows(rows.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
          setTargetCollegeForStatus(null);
        }}
        isEditor={false}
      />
    </>
  );
}
