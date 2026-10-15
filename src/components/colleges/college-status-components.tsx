import { useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, History, PauseCircle, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/client";

export type CollegeLifecycleStatus = "active" | "hold" | "deactive";

export function getStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "active") return "Active";
  if (s === "hold") return "Hold";
  if (s === "deactive" || s === "inactive") return "Deactive";
  return status;
}

export function CollegeStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const s = status.toLowerCase();
  const label = getStatusLabel(status);

  if (s === "active") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-medium text-xs text-emerald-600 dark:text-emerald-400",
          className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {label}
      </span>
    );
  }

  if (s === "hold") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-medium text-xs text-amber-600 dark:text-amber-400",
          className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {label}
      </span>
    );
  }

  // Deactive / Inactive
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 font-medium text-xs text-rose-600 dark:text-rose-400",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
      {label}
    </span>
  );
}

export function CollegeStatusChangeDialog({
  college,
  open,
  onOpenChange,
  onSuccess,
  isEditor = false,
}: {
  college: { id: string; name: string; code: string; status: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updated: any) => void;
  isEditor?: boolean;
}) {
  const currentStatus = (college?.status?.toLowerCase() === "hold"
    ? "hold"
    : college?.status?.toLowerCase() === "deactive" || college?.status?.toLowerCase() === "inactive"
    ? "deactive"
    : "active") as CollegeLifecycleStatus;

  const [newStatus, setNewStatus] = useState<CollegeLifecycleStatus>(currentStatus);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Synchronize when opening
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && college) {
      setNewStatus(
        college.status.toLowerCase() === "hold"
          ? "hold"
          : college.status.toLowerCase() === "deactive" || college.status.toLowerCase() === "inactive"
          ? "deactive"
          : "active"
      );
      setReason("");
    }
    onOpenChange(isOpen);
  };

  const isReactivation = (currentStatus === "deactive" || currentStatus === ("inactive" as any)) && newStatus !== "deactive";
  const isValidReason = reason.trim().length >= 5;
  const isChanged = newStatus !== currentStatus;

  const handleSubmit = async () => {
    if (!college) return;
    if (!isChanged) {
      toast.info("Target status is identical to current status.");
      return;
    }
    if (!isValidReason) {
      toast.error("A mandatory reason of at least 5 characters is required.");
      return;
    }

    setSubmitting(true);
    try {
      const updateFn = isEditor
        ? api.editor.colleges.updateStatus
        : api.colleges.updateStatus;

      const res = await updateFn(college.id, {
        status: newStatus,
        reason: reason.trim(),
      });

      toast.success(
        `College status updated to '${getStatusLabel(newStatus)}' for ${college.name}.`
      );
      onSuccess?.(res);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update college status.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!college) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PauseCircle className="h-5 w-5 text-primary" /> Update College Lifecycle Status
          </DialogTitle>
          <DialogDescription className="text-xs">
            Manage operational engagement status for <span className="font-semibold text-foreground">{college.name}</span> ({college.code}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/40 p-3 text-xs">
            <div>
              <span className="text-muted-foreground">Current Status</span>
              <div className="mt-1">
                <CollegeStatusBadge status={currentStatus} />
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Target Status</span>
              <div className="mt-1">
                <CollegeStatusBadge status={newStatus} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status-select" className="text-xs font-medium">
              Select New Lifecycle Status
            </Label>
            <Select
              value={newStatus}
              onValueChange={(val: CollegeLifecycleStatus) => setNewStatus(val)}
            >
              <SelectTrigger id="status-select" className="h-9 text-xs">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active" className="text-xs">
                  Active — Fully operational, data ingestion & training live
                </SelectItem>
                <SelectItem value="hold" className="text-xs">
                  Hold — Engagement paused between semesters, data preserved
                </SelectItem>
                <SelectItem value="deactive" className="text-xs">
                  Deactive — Engagement concluded, historical records retained
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Operational Policy Guidance */}
          <div className="rounded-md border border-border p-3 text-xs space-y-1 bg-card">
            {newStatus === "active" && (
              <p className="text-emerald-600 dark:text-emerald-400">
                <span className="font-semibold">Active Policy:</span> College is fully operational. Authorized student assessments, trainer sessions, and data ingestion operate normally.
              </p>
            )}
            {newStatus === "hold" && (
              <p className="text-amber-600 dark:text-amber-400">
                <span className="font-semibold">Hold Policy:</span> Temporary pause (e.g., between semesters). Ingestion is buffered without data loss; historical records and intelligence remain intact.
              </p>
            )}
            {newStatus === "deactive" && (
              <p className="text-rose-600 dark:text-rose-400">
                <span className="font-semibold">Deactive Policy:</span> Engagement has concluded. New data ingestion is disabled. Historical student records, diagnostic assessments, and intelligence are preserved.
              </p>
            )}
          </div>

          {/* Prominent warning for reactivation */}
          {isReactivation && (
            <div className="flex items-start gap-2.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="font-semibold">Reactivation Confirmation Required</span>
                <p className="mt-0.5 leading-relaxed text-[11px]">
                  Confirm that the college's operational configuration, academic structure, and trainer allocations are verified prior to resuming live activity.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="status-reason" className="text-xs font-medium">
                Mandatory Reason / Justification
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {reason.trim().length}/5 min characters
              </span>
            </div>
            <Textarea
              id="status-reason"
              placeholder="Provide a clear operational rationale for this status transition (minimum 5 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="text-xs resize-none"
            />
            {reason.length > 0 && !isValidReason && (
              <p className="text-[11px] text-destructive">
                Reason must be at least 5 characters long.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!isChanged || !isValidReason || submitting}
            className="gap-1.5"
          >
            {submitting ? "Saving Transition..." : "Confirm Status Change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CollegeCodeEditDialog({
  college,
  open,
  onOpenChange,
  onSuccess,
  isEditor = true,
}: {
  college: { id: string; name: string; code: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updated: any) => void;
  isEditor?: boolean;
}) {
  const [newCode, setNewCode] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && college) {
      setNewCode(college.code);
      setReason("");
    }
    onOpenChange(isOpen);
  };

  const formattedCode = newCode.trim().toUpperCase();
  const isValidFormat = /^[A-Z0-9]{3,12}$/.test(formattedCode);
  const isValidReason = reason.trim().length >= 5;
  const isChanged = college && formattedCode !== college.code;

  const handleSubmit = async () => {
    if (!college) return;
    if (!isChanged) {
      toast.info("New college code is identical to current code.");
      return;
    }
    if (!isValidFormat) {
      toast.error("College code must be 3–12 uppercase alphanumeric characters.");
      return;
    }
    if (!isValidReason) {
      toast.error("A mandatory reason of at least 5 characters is required.");
      return;
    }

    setSubmitting(true);
    try {
      const updateFn = isEditor
        ? api.editor.colleges.updateCode
        : api.colleges.updateCode;

      const res = await updateFn(college.id, {
        newCode: formattedCode,
        reason: reason.trim(),
      });

      toast.success(
        `College code updated from '${college.code}' to '${formattedCode}'. Dependent references preserved.`
      );
      onSuccess?.(res);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update college code.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!college) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-5 w-5 text-primary" /> Modify College Code
          </DialogTitle>
          <DialogDescription className="text-xs">
            Authorized correction workflow for <span className="font-semibold text-foreground">{college.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs space-y-1">
            <span className="text-muted-foreground">College Internal ID (Immutable)</span>
            <p className="font-mono text-[11px] text-foreground truncate">{college.id}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Current Code</span>
              <p className="mt-1 font-mono font-bold text-foreground text-sm">{college.code}</p>
            </div>
            <div>
              <Label htmlFor="new-code" className="text-xs font-medium">
                New College Code
              </Label>
              <Input
                id="new-code"
                placeholder="e.g. RNSIT"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="mt-1 font-mono uppercase text-xs h-9"
                maxLength={12}
              />
            </div>
          </div>

          {!isValidFormat && newCode.length > 0 && (
            <p className="text-[11px] text-destructive">
              Code must be 3–12 uppercase letters or numbers without spaces or special characters.
            </p>
          )}

          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Relational Integrity Invariant:</span> Modifying the code preserves the college's internal identity, existing student registrations, Coordinator assignments, and historical intelligence.
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="code-reason" className="text-xs font-medium">
                Mandatory Reason for Correction
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {reason.trim().length}/5 min characters
              </span>
            </div>
            <Textarea
              id="code-reason"
              placeholder="State why this college code is being updated (minimum 5 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="text-xs resize-none"
            />
            {reason.length > 0 && !isValidReason && (
              <p className="text-[11px] text-destructive">
                Reason must be at least 5 characters long.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!isChanged || !isValidFormat || !isValidReason || submitting}
            className="gap-1.5"
          >
            {submitting ? "Updating Code..." : "Update College Code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CollegeStatusHistoryTable({
  history,
}: {
  history: Array<{
    id: string;
    previousStatus: string;
    newStatus: string;
    changedBy: string;
    timestamp: string;
    reason: string;
  }>;
}) {
  if (!history || history.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground">
        No recorded status transitions for this institution.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Timestamp</TableHead>
            <TableHead className="text-xs">Transition</TableHead>
            <TableHead className="text-xs">Actor</TableHead>
            <TableHead className="text-xs">Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((h) => (
            <TableRow key={h.id}>
              <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                {new Date(h.timestamp).toLocaleString()}
              </TableCell>
              <TableCell className="text-xs">
                <div className="flex items-center gap-1.5">
                  <CollegeStatusBadge status={h.previousStatus} />
                  <span className="text-muted-foreground">→</span>
                  <CollegeStatusBadge status={h.newStatus} />
                </div>
              </TableCell>
              <TableCell className="text-xs font-mono">{h.changedBy}</TableCell>
              <TableCell className="text-xs max-w-[240px] truncate" title={h.reason}>
                {h.reason}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CollegeCodeHistoryTable({
  history,
}: {
  history: Array<{
    id: string;
    previousCode: string;
    newCode: string;
    changedBy: string;
    timestamp: string;
    reason: string;
  }>;
}) {
  if (!history || history.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground">
        No recorded code modifications for this institution.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Timestamp</TableHead>
            <TableHead className="text-xs">Code Change</TableHead>
            <TableHead className="text-xs">Actor</TableHead>
            <TableHead className="text-xs">Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((h) => (
            <TableRow key={h.id}>
              <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                {new Date(h.timestamp).toLocaleString()}
              </TableCell>
              <TableCell className="text-xs">
                <span className="font-mono font-semibold text-muted-foreground">{h.previousCode}</span>
                <span className="mx-1 text-muted-foreground">→</span>
                <span className="font-mono font-bold text-foreground">{h.newCode}</span>
              </TableCell>
              <TableCell className="text-xs font-mono">{h.changedBy}</TableCell>
              <TableCell className="text-xs max-w-[240px] truncate" title={h.reason}>
                {h.reason}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
