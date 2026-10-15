import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bell, BellOff, Clock, Trash2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/lib/api/client";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  targetRole?: string;
  collegeScope?: string;
  sentAt?: string;
  durationDays?: number;
  expiresAt?: string;
}

interface NotificationBellProps {
  role?: string;
  collegeCode?: string;
  align?: "start" | "center" | "end";
  manageLink?: string;
  manageLabel?: string;
  className?: string;
}

export function NotificationBell({
  role,
  collegeCode,
  align = "end",
  manageLink,
  manageLabel = "View all notifications →",
  className,
}: NotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.notifications.list({
        collegeScope: collegeCode,
        role,
      });
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // Fail-safe graceful fallback
    } finally {
      setLoading(false);
    }
  }, [collegeCode, role]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds to auto-remove expired notifications in real-time
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await api.notifications.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success(`Notification "${title}" removed.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete notification");
    } finally {
      setDeletingId(null);
    }
  };

  const getDaysRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const activeCount = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications (${activeCount} active)`}
          className={`relative ${className || ""}`}
        >
          <Bell className="h-4 w-4" />
          {activeCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm"
              aria-label={`${activeCount} unread`}
            >
              {activeCount > 9 ? "9+" : activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align={align} className="w-80 sm:w-96 p-0 text-sm shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Notifications</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
              {activeCount} active
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={fetchNotifications}
            disabled={loading}
            title="Refresh notifications"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Content list */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
          {activeCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="rounded-full bg-muted/50 p-3 mb-2">
                <BellOff className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs font-medium text-foreground">No active notifications</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Expired and removed notifications are automatically purged.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const daysLeft = getDaysRemaining(n.expiresAt);
              return (
                <div
                  key={n.id}
                  className="group relative flex items-start justify-between gap-3 p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-xs text-foreground truncate">{n.title}</p>
                      {n.collegeScope && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.2 font-mono text-[9px] font-medium text-primary">
                          {n.collegeScope}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-snug">
                      {n.message}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                      {n.durationDays && (
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" /> {n.durationDays}d lifetime
                        </span>
                      )}
                      {daysLeft !== null && (
                        <span
                          className={`font-medium ${
                            daysLeft <= 1 ? "text-amber-500 font-bold" : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {daysLeft === 0 ? "Expiring today" : `${daysLeft}d left`}
                        </span>
                      )}
                      {n.sentAt && (
                        <span className="text-[10px] text-muted-foreground/80">
                          {new Date(n.sentAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button on EACH AND EVERY notification */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 transition-opacity"
                    onClick={(e) => handleDelete(n.id, n.title, e)}
                    disabled={deletingId === n.id}
                    title="Delete notification"
                    aria-label={`Delete notification ${n.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {manageLink && (
          <div className="border-t border-border bg-muted/20 px-3 py-2 text-right">
            <Link
              to={manageLink as any}
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              {manageLabel}
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
