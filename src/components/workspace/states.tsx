import { useState, type ReactNode } from "react";
import { AlertTriangle, Construction, Inbox, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmt } from "@/features/super-admin/page";

function Box({ icon, title, message, action }: { icon: ReactNode; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 border border-dashed border-border p-10 text-center">
      {icon}
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
export const PermissionDenied = ({ message, action }: { message?: string; action?: ReactNode }) => (
  <Box icon={<Lock className="h-6 w-6 text-warning" />} title="You don't have access" message={message ?? "Your account isn't permitted to view this page. Contact your administrator if you think this is wrong."} action={action} />
);
export const EmptyState = ({ title = "Nothing here yet", message }: { title?: string; message: string }) => (
  <Box icon={<Inbox className="h-6 w-6 text-muted-foreground" />} title={title} message={message} />
);
export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <Box icon={<AlertTriangle className="h-6 w-6 text-destructive" />} title="This didn't load" message={message} action={onRetry && <Button variant="outline" onClick={onRetry}>Try again</Button>} />
);
export const NotImplemented = ({ what }: { what: string }) => (
  <Box icon={<Construction className="h-6 w-6 text-muted-foreground" />} title="Not available yet" message={`${what} will be enabled once the backend contract is defined.`} />
);

/** Confirmation dialog that requires a reason before a consequential change. */
export function ReasonDialog({ open, onOpenChange, title, description, confirmLabel = "Confirm", onConfirm, children, extraValid = true }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; confirmLabel?: string;
  onConfirm: (reason: string) => Promise<void> | void; children?: ReactNode; extraValid?: boolean;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const valid = reason.trim().length >= 10 && extraValid;
  const submit = async () => {
    setBusy(true); setErr(null);
    try { await onConfirm(reason.trim()); setReason(""); onOpenChange(false); }
    catch (e) { setErr(e instanceof Error ? e.message : "The change could not be saved."); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) { onOpenChange(o); setErr(null); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        {children}
        <div className="space-y-2">
          <Label htmlFor="reason">Reason (required, recorded in the audit log)</Label>
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="At least 10 characters" />
          {reason.length > 0 && reason.trim().length < 10 && <p className="text-xs text-destructive">Please give a fuller reason.</p>}
          {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || busy}>{busy ? "Saving…" : confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface HistoryEntry { at: string; by: string; action: string; reason?: string | undefined }
export function HistoryList({ items }: { items: HistoryEntry[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No history recorded.</p>;
  return (
    <ol className="space-y-3 border-l border-border pl-4">
      {items.map((h, i) => (
        <li key={i} className="text-sm">
          <p>{h.action}</p>
          <p className="font-mono text-xs text-muted-foreground">{fmt(h.at)} · {h.by}</p>
          {h.reason && <p className="mt-1 text-xs text-muted-foreground">Reason: {h.reason}</p>}
        </li>
      ))}
    </ol>
  );
}

export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}
export function KV({ k, v }: { k: string; v: ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0"><span className="text-muted-foreground">{k}</span><span className="text-right">{v}</span></div>;
}
