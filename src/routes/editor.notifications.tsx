import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bell, CheckCircle2, Clock, Plus, RotateCw, Send, Trash2, Users } from "lucide-react";
import { PageHeader, Panel, fmt } from "@/features/editor/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/editor/notifications")({
  head: () => ({
    meta: [
      { title: "Notification Authoring — Ziphyrus X" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsPage,
});

interface Notification {
  id: string;
  title: string;
  message: string;
  targetRole: "all" | "student" | "trainer" | "coordinator" | string;
  collegeScope?: string;
  status: "sent" | "draft" | "scheduled";
  sentAt: string;
  durationDays?: number;
  expiresAt?: string;
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState<string>("all");
  const [durationDays, setDurationDays] = useState<number>(7);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotifications = () => {
    setLoading(true);
    api.editor.notifications
      .list()
      .then((res) => {
        setNotifications(res);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load notifications");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getDaysRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.editor.notifications.create({
        title: title.trim(),
        message: message.trim(),
        targetRole,
        durationDays,
      });
      setNotifications((prev) => [created, ...prev]);
      toast.success(`Notification "${created.title}" dispatched (active for ${created.durationDays || durationDays} days).`);
      setCreateOpen(false);
      setTitle("");
      setMessage("");
      setDurationDays(7);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to broadcast notification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, notifTitle: string) => {
    if (!confirm(`Are you sure you want to delete the notification "${notifTitle}"? This will permanently remove it for all recipients.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await api.editor.notifications.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success(`Notification "${notifTitle}" deleted permanently.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete notification");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        desc="Author and broadcast platform announcements and targeted communication. Notifications use the shared Targeting Engine."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchNotifications} disabled={loading}>
              <RotateCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Author Notification
            </Button>
          </div>
        }
      />

      <Panel title={`Notification Broadcasts (${notifications.length})`}>
        <DataTable
          data={notifications}
          emptyMessage="No notifications have been dispatched."
          columns={[
            {
              header: "Subject / Title",
              accessor: (n) => (
                <div>
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>
                </div>
              ),
            },
            {
              header: "Target Audience",
              accessor: (n) => (
                <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-muted">
                  {n.targetRole}
                </span>
              ),
            },
            {
              header: "Scope",
              accessor: (n) => (
                <span className="text-xs text-muted-foreground">{n.collegeScope ?? "Platform-wide"}</span>
              ),
            },
            {
              header: "Dispatched At",
              accessor: (n) => <span className="text-xs">{fmt(n.sentAt)}</span>,
            },
            {
              header: "Lifetime & Expiration",
              accessor: (n) => {
                const daysLeft = getDaysRemaining(n.expiresAt);
                return (
                  <div className="text-xs space-y-0.5">
                    <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{n.durationDays ?? 7} days</span>
                    </div>
                    {daysLeft !== null && (
                      <span className={`inline-block text-[11px] font-medium ${daysLeft <= 1 ? "text-amber-500 font-bold" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {daysLeft === 0 ? "Expiring today" : `Expires in ${daysLeft}d`}
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              header: "Status",
              accessor: (n) => <StatusBadge status={n.status} label={n.status.toUpperCase()} />,
            },
            {
              header: "Actions",
              accessor: (n) => (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive gap-1.5 transition-colors"
                  onClick={() => handleDelete(n.id, n.title)}
                  disabled={deletingId === n.id}
                  title={`Delete notification "${n.title}"`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Delete</span>
                </Button>
              ),
            },
          ]}
        />
      </Panel>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Author & Dispatch Notification</DialogTitle>
            <DialogDescription>
              Targeted broadcasts reach eligible recipient workspaces and app banners. Specify lifetime duration for automatic expiration.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSend} className="space-y-4 py-2">
            <div>
              <Label htmlFor="notif-title">Announcement Title</Label>
              <Input
                id="notif-title"
                placeholder="e.g. Scheduled Maintenance Window: Sunday 02:00 AM"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="notif-target">Target Audience</Label>
              <Select value={targetRole} onValueChange={(v: any) => setTargetRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles (Platform-wide)</SelectItem>
                  <SelectItem value="student">Students Only</SelectItem>
                  <SelectItem value="trainer">Trainers Only</SelectItem>
                  <SelectItem value="coordinator">Coordinators Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notif-duration" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Active Lifetime (Days)
                </Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {durationDays} {durationDays === 1 ? "day" : "days"} lifetime
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <Input
                  id="notif-duration"
                  type="number"
                  min={1}
                  max={365}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 font-mono h-9"
                  required
                />
                <div className="flex flex-wrap gap-1">
                  {[1, 3, 7, 14, 30].map((days) => (
                    <Button
                      key={days}
                      type="button"
                      variant={durationDays === days ? "default" : "outline"}
                      size="sm"
                      className="h-9 px-2.5 text-xs"
                      onClick={() => setDurationDays(days)}
                    >
                      {days}d
                    </Button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Auto-expiration: After {durationDays} {durationDays === 1 ? "day" : "days"}, this notification will automatically expire and be removed for all recipients.
              </p>
            </div>

            <div>
              <Label htmlFor="notif-message">Message Content</Label>
              <Textarea
                id="notif-message"
                rows={4}
                placeholder="Provide clear instructions and relevant context…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                <Send className="mr-2 h-4 w-4" /> {submitting ? "Sending…" : "Dispatch Notification"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
