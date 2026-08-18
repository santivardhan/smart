import { Link, useRouter } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ArrowRight, Inbox, Lightbulb, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";


import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { STAGES, STAGE_LABEL, type Stage } from "@/lib/types";
import { Dot, type Tone } from "@/components/status";
import { IMPACT_ROWS } from "@/lib/impact";

/** Coordinated per-section colour identities inside one SmartFulfill brand. */
export type Accent = "primary" | "info" | "decision" | "warning" | "success" | "critical";

const ACCENT: Record<Accent, { icon: string; eyebrow: string; rule: string }> = {
  primary: { icon: "border-primary/30 bg-primary/10 text-primary", eyebrow: "text-primary", rule: "from-primary/60" },
  info: { icon: "border-info/30 bg-info/10 text-info", eyebrow: "text-info", rule: "from-info/60" },
  decision: { icon: "border-decision/30 bg-decision/10 text-decision", eyebrow: "text-decision", rule: "from-decision/60" },
  warning: { icon: "border-warning/30 bg-warning/10 text-warning", eyebrow: "text-warning", rule: "from-warning/60" },
  success: { icon: "border-success/30 bg-success/10 text-success", eyebrow: "text-success", rule: "from-success/60" },
  critical: { icon: "border-critical/30 bg-critical/10 text-critical", eyebrow: "text-critical", rule: "from-critical/60" },
};

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  accent = "primary",
  refreshable = true,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  accent?: Accent;
  /** Set false for read-only/static pages that have nothing to re-read. */
  refreshable?: boolean;
}) {
  const a = ACCENT[accent];
  return (
    <div className="relative flex flex-col gap-4 pb-5 md:flex-row md:items-end md:justify-between">
      <span className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r to-transparent", a.rule)} />
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
        <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl border shadow-sm", a.icon)}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", a.eyebrow)}>{eyebrow}</p>
          <h1 className="mt-1 font-display text-2xl font-bold leading-tight md:text-3xl">{title}</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      {(actions || refreshable) && (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {actions}
          {refreshable && (
            <>
              <LastUpdated />
              <RefreshButton />
            </>
          )}
        </div>
      )}
    </div>
  );
}


/** Shows when the operational data on screen was last re-read. */
export function LastUpdated() {
  const { lastRefreshedAt } = useStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const t = lastRefreshedAt ? new Date(lastRefreshedAt) : null;
  return (
    <span className="whitespace-nowrap text-xs text-muted-foreground">
      Updated {t ? t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "just now"}
    </span>
  );
}


export function KpiCard({
  label,
  value,
  hint,
  tone = "primary",
  icon: Icon,
  to,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
  icon: LucideIcon;
  to?: string;
}) {
  const toneRing = {
    critical: "text-critical border-critical/30 bg-critical/10",
    warning: "text-warning border-warning/30 bg-warning/10",
    success: "text-success border-success/30 bg-success/10",
    info: "text-info border-info/30 bg-info/10",
    primary: "text-primary border-primary/30 bg-primary/10",
    neutral: "text-muted-foreground border-border bg-secondary",
  }[tone];

  const body = (
    <Card className="group h-full gap-0 p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <span className={cn("grid size-8 place-items-center rounded-lg border", toneRing)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );

  return to ? (
    <Link to={to} className="block h-full focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}

export function WorkflowProgress({ stage, compact = false }: { stage: Stage; compact?: boolean }) {
  const idx = STAGES.indexOf(stage);
  return (
    <div className={cn("flex w-full items-center", compact ? "gap-1" : "gap-1.5")}>
      {STAGES.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <div key={s} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div
              className={cn(
                "h-1.5 rounded-full transition-colors",
                done ? "bg-primary/60" : current ? "bg-primary" : "bg-secondary",
              )}
            />
            {!compact && (
              <span
                className={cn(
                  "truncate text-[10px] font-medium uppercase tracking-wide",
                  current ? "text-primary" : done ? "text-muted-foreground" : "text-muted-foreground",
                )}
              >
                {STAGE_LABEL[s]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SectionTitle({ title, hint, right }: { title: string; hint?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-14 text-center">
      <div className="grid size-11 place-items-center rounded-full border border-border bg-secondary text-muted-foreground">
        <Inbox className="size-5" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function LinkButton({ to, children, params }: { to: string; children: React.ReactNode; params?: Record<string, string> }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link to={to} params={params as never}>
        {children}
        <ArrowRight className="size-3.5" />
      </Link>
    </Button>
  );
}

export function StatLine({ label, value, tone }: { label: string; value: React.ReactNode; tone?: Tone }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="flex items-center gap-2 text-muted-foreground">
        {tone && <Dot t={tone} />}
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="scroll-slim w-full overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[720px] text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

/** One-line actionable insight rendered under a chart or section. */
export function Insight({ text, to, params }: { text: string; to?: string; params?: Record<string, string> }) {
  const body = (
    <p className="flex items-start gap-2 rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-xs text-foreground">
      <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-info" />
      <span className="flex-1">{text}</span>
      {to && <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-info" />}
    </p>
  );
  return to ? (
    <Link to={to} params={params as never} className="block transition-opacity hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Progress meter with current value, target and trend. */
export function MetricMeter({
  label,
  value,
  target,
  trend,
  suffix = "%",
}: {
  label: string;
  value: number;
  target: number;
  trend?: number;
  suffix?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, target)) * 100));
  const good = value >= target;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="flex items-baseline gap-2">
          <span className="font-display text-sm font-bold tabular-nums">
            {value}
            {suffix}
          </span>
          {typeof trend === "number" && (
            <span className={cn("text-[10px] font-semibold tabular-nums", trend >= 0 ? "text-success" : "text-critical")}>
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
            </span>
          )}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full transition-all", good ? "bg-success" : pct > 75 ? "bg-warning" : "bg-critical")} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Target {target}
        {suffix}
      </p>
    </div>
  );
}

/* --------------------------- navigation controls -------------------------- */

/** Consistent back control for secondary/detail pages. Preserves browser history. */
export function BackLink({
  to,
  params,
  label = "Back",
}: {
  to: string;
  params?: Record<string, string>;
  label?: string;
}) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
      aria-label={`Back to ${label.replace(/^Back to /i, "")}`}
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
        else router.navigate({ to, params: params as never });
      }}
    >
      <ArrowLeft className="size-4" />
      {label}
    </Button>
  );
}

/** Consistent refresh control: re-reads shared state, keeps the page and filters. */
export function RefreshButton({ className }: { className?: string }) {
  const { refresh } = useStore();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("gap-1.5", className)}
      disabled={busy}
      aria-label="Refresh data"
      title="Refresh data"
      onClick={() => {
        if (busy) return;
        setBusy(true);
        try {
          refresh();
          window.setTimeout(() => {
            setBusy(false);
            toast.success("Operations data updated");
          }, 450);
        } catch {
          setBusy(false);
          toast.error("Could not update operations data");
        }
      }}

    >
      <RotateCw className={cn("size-4", busy && "animate-spin")} />
      {busy ? "Refreshing…" : "Refresh"}
    </Button>
  );
}

/** Neutral loading block for data-driven sections. */
export function LoadingState({ label = "Loading warehouse data…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-border py-12 text-sm text-muted-foreground">
      <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {label}
    </div>
  );
}

const PIPELINE = [
  { stages: ["created", "prioritized"] as Stage[], label: "Intake", to: "/orders" },
  { stages: ["allocated"] as Stage[], label: "Allocation", to: "/allocation" },
  { stages: ["picking"] as Stage[], label: "Picking", to: "/picking" },
  { stages: ["packing"] as Stage[], label: "Packing", to: "/packing" },
  { stages: ["qc"] as Stage[], label: "Quality check", to: "/quality-check" },
  { stages: ["dispatch"] as Stage[], label: "Dispatch", to: "/dispatch" },
  { stages: ["completed"] as Stage[], label: "Completed", to: "/tracking" },
] as const;

/**
 * Live fulfilment pipeline strip: order counts per workflow step, the busiest
 * open step flagged as the constraint, every step links to its own console.
 */
export function PipelineStrip({ current }: { current?: (typeof PIPELINE)[number]["to"] }) {
  const { orders } = useStore();
  const counts = PIPELINE.map((p) => orders.filter((o) => p.stages.includes(o.stage)).length);
  const openMax = Math.max(...counts.slice(0, -1));
  const total = counts.reduce((a, b) => a + b, 0) || 1;

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Fulfilment pipeline</p>
          <p className="text-xs text-muted-foreground">Live order volume at every step — the busiest open step is the current constraint.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {PIPELINE.map((p, i) => {
          const count = counts[i]!;
          const isCurrent = current === p.to;
          const isHot = i < PIPELINE.length - 1 && count > 0 && count === openMax;
          return (
            <Link
              key={p.to}
              to={p.to}
              className={cn(
                "rounded-lg border p-2.5 transition-colors",
                isCurrent ? "border-primary/60 bg-primary/10" : "border-border bg-surface hover:border-primary/40",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[11px] text-muted-foreground">{p.label}</span>
                {isHot && <span className="text-[9px] font-semibold uppercase tracking-wide text-warning">Constraint</span>}
              </div>
              <p className={cn("font-display text-xl font-bold tabular-nums", isCurrent && "text-primary")}>{count}</p>
              <div className="mt-1 h-1.5 rounded-full bg-secondary">
                <div
                  className={cn("h-1.5 rounded-full", isHot ? "bg-warning" : isCurrent ? "bg-primary" : "bg-success")}
                  style={{ width: `${Math.round((count / total) * 100)}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

/* ------------------------- measured decision impact ----------------------- */

/**
 * Before → after comparison of measured operational metrics, captured either side
 * of the last executed decision. Values are ACTUAL — nothing here is projected.
 */
export function ImpactPanel({ compact = false }: { compact?: boolean }) {
  const { lastImpact } = useStore();
  if (!lastImpact) return null;
  const rows = IMPACT_ROWS.filter((r) => !compact || lastImpact.before[r.key] !== lastImpact.after[r.key] || r.key === "fulfilment");

  return (
    <Card className="gap-3 p-5">
      <SectionTitle
        title="Measured impact of the last decision"
        hint={`${lastImpact.label} · recorded ${new Date(lastImpact.at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`}
        right={<span className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-success">Actual</span>}
      />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {rows.map((r) => {
          const before = lastImpact.before[r.key];
          const after = lastImpact.after[r.key];
          const delta = after - before;
          const improved = r.higherIsBetter ? delta > 0 : delta < 0;
          const tone = delta === 0 ? "text-muted-foreground" : improved ? "text-success" : "text-critical";
          return (
            <div key={r.key} className="rounded-xl border border-border bg-surface p-3">
              <p className="text-[11px] font-medium text-muted-foreground">{r.label}</p>
              <p className="mt-1 flex items-baseline gap-1.5 font-display text-sm font-bold tabular-nums">
                <span className="text-muted-foreground">
                  {before}
                  {r.suffix}
                </span>
                <ArrowRight className="size-3 text-muted-foreground" />
                <span>
                  {after}
                  {r.suffix}
                </span>
              </p>
              <p className={cn("text-[11px] font-semibold tabular-nums", tone)}>
                {delta === 0 ? "no change" : `${delta > 0 ? "+" : ""}${delta}${r.suffix}`}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
