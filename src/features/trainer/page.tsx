import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Eye, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrainerPageHeader({
  title,
  desc,
  actions,
  badgeText = "Read-Only Scoped",
}: {
  title: string;
  desc?: string;
  actions?: ReactNode;
  badgeText?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-5">
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">{title}</h1>
          <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground border-border/80 bg-muted/40 flex items-center gap-1">
            <Eye className="h-3 w-3 text-muted-foreground" /> {badgeText}
          </Badge>
        </div>
        {desc && <p className="max-w-3xl text-sm text-muted-foreground">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function TrainerMetric({
  label,
  value,
  note,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: ReactNode;
  note?: string;
  icon?: any;
  variant?: "default" | "success" | "warning" | "danger" | "primary";
}) {
  const variantStyles = {
    default: "border-border/70 bg-card/70 hover:border-border",
    primary: "border-primary/30 bg-primary/5 hover:border-primary/50",
    success: "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50",
    warning: "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50",
    danger: "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50",
  };

  return (
    <div className={cn("group rounded-xl border p-5 shadow-sm backdrop-blur-xl transition-all", variantStyles[variant])}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground/70 group-hover:text-foreground transition-colors" />}
      </div>
      <p className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">{value}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export function TrainerPanel({
  title,
  subtitle,
  children,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border/70 bg-card/75 shadow-sm backdrop-blur-xl transition-all overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between border-b border-border/60 bg-muted/20 px-5 py-3.5 gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function InsightCard({
  insight,
  evidence,
  action,
  skill,
  severity = "info",
}: {
  insight: string;
  evidence: string;
  action: string;
  skill?: string;
  severity?: "info" | "warning" | "critical";
}) {
  const borderMap = {
    info: "border-blue-500/30 bg-blue-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    critical: "border-rose-500/30 bg-rose-500/5",
  };

  return (
    <div className={cn("rounded-xl border p-4 backdrop-blur-xl space-y-3", borderMap[severity])}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Shared Intelligence Insight
          </span>
        </div>
        {skill && <Badge variant="secondary" className="text-xs">{skill}</Badge>}
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-xs font-semibold text-muted-foreground block">INSIGHT</span>
          <p className="text-foreground font-medium">{insight}</p>
        </div>
        <div>
          <span className="text-xs font-semibold text-muted-foreground block">EVIDENCE</span>
          <p className="text-xs text-muted-foreground">{evidence}</p>
        </div>
        <div className="pt-1 border-t border-border/40">
          <span className="text-xs font-semibold text-primary block">RECOMMENDED PEDAGOGICAL ACTION</span>
          <p className="text-xs text-foreground font-medium flex items-center gap-1.5 mt-0.5">
            <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" /> {action}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TrainerLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-muted/60 rounded-lg w-1/3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-28 bg-muted/40 rounded-xl" />
        <div className="h-28 bg-muted/40 rounded-xl" />
        <div className="h-28 bg-muted/40 rounded-xl" />
        <div className="h-28 bg-muted/40 rounded-xl" />
      </div>
      <div className="h-64 bg-muted/30 rounded-xl" />
    </div>
  );
}

export function TrainerEmptyState({
  title,
  description,
  icon: Icon = AlertCircle,
}: {
  title: string;
  description: string;
  icon?: any;
}) {
  return (
    <div className="py-16 px-4 text-center border border-dashed border-border/80 rounded-xl bg-card/20 backdrop-blur-sm">
      <Icon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <h3 className="font-display text-lg font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">{description}</p>
    </div>
  );
}
