import { cn } from "@/lib/utils";
import { STAGE_LABEL, type ExceptionStatus, type InventoryStatus, type PriorityLevel, type Stage } from "@/lib/types";

const base =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap";

const tone = {
  critical: "border-critical/40 bg-critical/15 text-critical",
  warning: "border-warning/40 bg-warning/15 text-warning",
  success: "border-success/40 bg-success/15 text-success",
  info: "border-info/40 bg-info/15 text-info",
  primary: "border-primary/40 bg-primary/15 text-primary",
  neutral: "border-border bg-secondary text-muted-foreground",
} as const;

export type Tone = keyof typeof tone;

export function Pill({ children, t = "neutral", className }: { children: React.ReactNode; t?: Tone; className?: string }) {
  return <span className={cn(base, tone[t], className)}>{children}</span>;
}

export function Dot({ t }: { t: Tone }) {
  return <span className={cn("size-1.5 rounded-full", {
    critical: "bg-critical",
    warning: "bg-warning",
    success: "bg-success",
    info: "bg-info",
    primary: "bg-primary",
    neutral: "bg-muted-foreground",
  }[t])} />;
}

const priorityTone: Record<PriorityLevel, Tone> = {
  critical: "critical",
  high: "warning",
  normal: "info",
  low: "neutral",
};

export function PriorityBadge({ p, score }: { p: PriorityLevel; score?: number }) {
  return (
    <Pill t={priorityTone[p]} className={p === "critical" ? "pulse-critical" : undefined}>
      <Dot t={priorityTone[p]} />
      {p}
      {score !== undefined && <span className="font-mono opacity-80">{score}</span>}
    </Pill>
  );
}

const stageTone: Record<Stage, Tone> = {
  created: "neutral",
  prioritized: "info",
  allocated: "info",
  picking: "primary",
  packing: "warning",
  qc: "warning",
  dispatch: "primary",
  completed: "success",
};

export function StageBadge({ s }: { s: Stage }) {
  return (
    <Pill t={stageTone[s]}>
      <Dot t={stageTone[s]} />
      {STAGE_LABEL[s]}
    </Pill>
  );
}

const invTone: Record<InventoryStatus, Tone> = {
  healthy: "success",
  low: "warning",
  out: "critical",
  reserved: "info",
  damaged: "critical",
};

const invLabel: Record<InventoryStatus, string> = {
  healthy: "Healthy",
  low: "Low stock",
  out: "Out of stock",
  reserved: "Reserved",
  damaged: "Damaged",
};

export function InventoryBadge({ s }: { s: InventoryStatus }) {
  return (
    <Pill t={invTone[s]}>
      <Dot t={invTone[s]} />
      {invLabel[s]}
    </Pill>
  );
}

const exTone: Record<ExceptionStatus, Tone> = {
  open: "warning",
  investigating: "info",
  action_required: "critical",
  resolved: "success",
  escalated: "critical",
};

export function ExceptionBadge({ s }: { s: ExceptionStatus }) {
  return <Pill t={exTone[s]}>{s.replace("_", " ")}</Pill>;
}

export function RiskBadge({ r }: { r: "on_time" | "at_risk" | "delayed" }) {
  const map = { on_time: ["success", "On time"], at_risk: ["warning", "At risk"], delayed: ["critical", "Delayed"] } as const;
  const [t, label] = map[r];
  return (
    <Pill t={t}>
      <Dot t={t} />
      {label}
    </Pill>
  );
}

export function SeverityBadge({ s }: { s: "critical" | "high" | "medium" | "low" }) {
  const map = { critical: "critical", high: "warning", medium: "info", low: "neutral" } as const;
  return <Pill t={map[s]}>{s}</Pill>;
}
