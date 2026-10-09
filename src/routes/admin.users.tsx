import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { USERS } from "@/features/super-admin/mock-data";
import { PageHeader, fmt } from "@/features/super-admin/page";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users & Accounts — Ziphyrus X Super Admin" }, { name: "robots", content: "noindex" }] }),
  component: Users,
});

type U = (typeof USERS)[number];

function Users() {
  const [rows, setRows] = useState(USERS);
  const [sel, setSel] = useState<U | null>(null);
  const [confirm, setConfirm] = useState(false);

  const toggle = () => {
    if (!sel) return;
    const status = sel.status === "active" ? "inactive" : "active";
    setRows(rows.map((r) => (r.id === sel.id ? { ...r, status } : r)));
    setSel({ ...sel, status });
    setConfirm(false);
    toast.success(`Account ${status === "active" ? "activated" : "deactivated"} (preview only)`);
  };

  return (
    <>
      <PageHeader title="Users & Accounts" desc="Search by name, login ID or email. Filter by role." />
      <DataTable
        rows={rows}
        searchKeys={["name", "loginId", "email"]}
        filterKey="role"
        onRowClick={setSel}
        columns={[
          { key: "name", label: "Name" },
          { key: "loginId", label: "Login ID", render: (r) => <span className="font-mono text-xs">{r.loginId}</span> },
          { key: "role", label: "Role" },
          { key: "college", label: "College", className: "hidden md:table-cell" },
          { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> },
          { key: "lastActive", label: "Last active", className: "hidden lg:table-cell", render: (r) => fmt(r.lastActive) },
        ]}
      />
      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent>
          {sel && (
            <>
              <SheetHeader><SheetTitle className="font-display text-3xl font-normal">{sel.name}</SheetTitle></SheetHeader>
              <dl className="mt-4 space-y-3 px-4 text-sm">
                {[["Login ID", sel.loginId], ["Email", sel.email], ["Role", sel.role], ["College scope", sel.college], ["Created", fmt(sel.createdAt)], ["Last activity", fmt(sel.lastActive)]].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-border pb-2"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>
                ))}
                <div className="flex justify-between pt-1"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge s={sel.status} /></dd></div>
              </dl>
              <div className="mt-8 px-4">
                <Button variant={sel.status === "active" ? "destructive" : "hero"} className="w-full" onClick={() => setConfirm(true)}>
                  {sel.status === "active" ? "Deactivate account" : "Activate account"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{sel?.status === "active" ? "Deactivate" : "Activate"} {sel?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This change is recorded in the audit log. Deactivated users cannot sign in.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={toggle}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
