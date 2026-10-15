import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Shield, ShieldAlert, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { PageHeader, fmt } from "@/features/super-admin/page";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/admin/accounts")({
  head: () => ({
    meta: [
      { title: "Account Governance — Ziphyrus X Super Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountGovernancePage,
});

const editorSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please provide a valid email address"),
});

type EditorFormValues = z.infer<typeof editorSchema>;

export function AccountGovernancePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [confirmStatusChange, setConfirmStatusChange] = useState(false);
  const [createEditorOpen, setCreateEditorOpen] = useState(false);

  const form = useForm<EditorFormValues>({
    resolver: zodResolver(editorSchema),
    defaultValues: { name: "", email: "" },
  });

  const fetchUsers = () => {
    setLoading(true);
    api.users
      .list()
      .then((data) => {
        if (Array.isArray(data)) {
          setRows(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateEditor = form.handleSubmit(async (values) => {
    try {
      const created = await api.editors.create(values);
      toast.success(`Editor account created for ${created.name} (${created.email})`);
      setRows([created, ...rows]);
      form.reset();
      setCreateEditorOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create Editor account");
    }
  });

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    if (selectedUser.isProtected) {
      toast.error("Protected accounts cannot be deactivated under Ziphyrus X policy.");
      setConfirmStatusChange(false);
      return;
    }

    const nextStatus = selectedUser.status === "active" ? "inactive" : "active";
    try {
      const updated = await api.users.updateStatus(selectedUser.id, nextStatus);
      setRows(rows.map((r) => (r.id === selectedUser.id ? { ...r, status: updated.status } : r)));
      setSelectedUser({ ...selectedUser, status: updated.status });
      setConfirmStatusChange(false);
      toast.success(`Account ${updated.status === "active" ? "activated" : "deactivated"}`);
    } catch (e: any) {
      setConfirmStatusChange(false);
      toast.error(e?.message ?? "Status update rejected by backend policy.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader
          title="Account Governance"
          desc="Platform-wide identity and credential governance. Super Admin manages authorized Editor accounts and protected accounts."
        />
        <Button onClick={() => setCreateEditorOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Create Editor Account
        </Button>
      </div>

      {/* Permanent Protected Accounts Policy Callout */}
      <div className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-semibold text-foreground">Permanent Protected Accounts Safeguard</h4>
            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
              Permanent Super Admin (<code className="font-mono text-foreground font-medium">sAdmin1@ziphyrus.in</code>) and
              Permanent Editor (<code className="font-mono text-foreground font-medium">editor1@ziphyrus.in</code>) are
              permanently locked accounts. They cannot be deactivated, deleted, or removed under platform governance rules.
            </p>
          </div>
        </div>
      </div>

      {/* Accounts Data Table */}
      <DataTable
        rows={rows}
        searchKeys={["name", "loginId", "email", "role"]}
        filterKey="role"
        onRowClick={setSelectedUser}
        columns={[
          {
            key: "name",
            label: "Name & Identity",
            render: (r) => (
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{r.name}</span>
                {r.isProtected && (
                  <Badge variant="outline" className="border-primary/50 text-[10px] text-primary gap-1">
                    <Shield className="h-3 w-3" /> Protected
                  </Badge>
                )}
              </div>
            ),
          },
          {
            key: "loginId",
            label: "Login ID / Email",
            render: (r) => (
              <div>
                <span className="font-mono text-xs">{r.loginId}</span>
                {r.email && r.email !== r.loginId && (
                  <span className="block text-[11px] text-muted-foreground">{r.email}</span>
                )}
              </div>
            ),
          },
          {
            key: "role",
            label: "Assigned Role",
            render: (r) => (
              <Badge variant="secondary" className="capitalize">
                {r.role?.replace("_", " ")}
              </Badge>
            ),
          },
          {
            key: "college",
            label: "College Scope",
            className: "hidden md:table-cell",
            render: (r) => <span className="text-muted-foreground">{r.college || "Platform-wide"}</span>,
          },
          {
            key: "status",
            label: "Status",
            render: (r) => <StatusBadge s={r.status} />,
          },
          {
            key: "lastActive",
            label: "Last Active",
            className: "hidden lg:table-cell",
            render: (r) => fmt(r.lastActive),
          },
        ]}
      />

      {/* Create Editor Account Modal */}
      <Dialog open={createEditorOpen} onOpenChange={setCreateEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateEditor}>
            <DialogHeader>
              <DialogTitle>Provision Authorized Editor Account</DialogTitle>
              <DialogDescription>
                Super Admin creates authorized Editor accounts. Editors hold authority over question banks,
                feature availability, learning courses, and visible-value overrides.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="editor-name">Full Name</Label>
                <Input
                  id="editor-name"
                  placeholder="e.g. Priya Sharma"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editor-email">Editor Email Address</Label>
                <Input
                  id="editor-email"
                  type="email"
                  placeholder="e.g. priya.editor@ziphyrus.in"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Audit Notice:</span> This account creation event will
                be recorded in the immutable platform audit log with your Super Admin identity.
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setCreateEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Provisioning…" : "Create Editor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Account Detail Drawer */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedUser && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <SheetTitle className="font-display text-2xl font-normal">
                    {selectedUser.name}
                  </SheetTitle>
                  {selectedUser.isProtected && (
                    <Badge variant="outline" className="border-primary/50 text-xs text-primary gap-1">
                      <Shield className="h-3 w-3" /> Protected Account
                    </Badge>
                  )}
                </div>
                <SheetDescription>
                  <span className="font-mono text-foreground">{selectedUser.loginId}</span>
                </SheetDescription>
              </SheetHeader>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-border pb-2">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd className="font-medium capitalize">{selectedUser.role?.replace("_", " ")}</dd>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-mono text-xs">{selectedUser.email}</dd>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <dt className="text-muted-foreground">College Scope</dt>
                  <dd>{selectedUser.college || "Platform-wide"}</dd>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd><StatusBadge s={selectedUser.status} /></dd>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{fmt(selectedUser.createdAt)}</dd>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <dt className="text-muted-foreground">Last Activity</dt>
                  <dd>{fmt(selectedUser.lastActive)}</dd>
                </div>
              </dl>

              {/* Action Button: Disabled for protected accounts */}
              <div className="pt-4">
                {selectedUser.isProtected ? (
                  <div className="rounded-md border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground text-center">
                    <ShieldCheck className="mx-auto h-5 w-5 text-primary mb-1" />
                    This account is permanently protected. Deactivation and deletion are disabled by platform policy.
                  </div>
                ) : (
                  <Button
                    variant={selectedUser.status === "active" ? "destructive" : "default"}
                    className="w-full"
                    onClick={() => setConfirmStatusChange(true)}
                  >
                    {selectedUser.status === "active" ? "Deactivate Account" : "Activate Account"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmStatusChange} onOpenChange={setConfirmStatusChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.status === "active" ? "Deactivate" : "Activate"} {selectedUser?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This state transition will be logged in the immutable platform audit log.
              Deactivated users cannot authenticate or access platform resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
