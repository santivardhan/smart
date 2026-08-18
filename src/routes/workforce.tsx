import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Gauge as GaugeIcon, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { BarSeries } from "@/components/charts";
import { Insight, KpiCard, MetricMeter, PageHeader, SectionTitle, TableShell, Td, Th } from "@/components/shared";
import { Pill } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { STATIONS, detectBottleneck, stageLoads } from "@/lib/ops";
import type { Station } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workforce")({
  head: () => ({
    meta: [
      { title: "Workforce Optimisation — SmartFulfill" },
      { name: "description", content: "Compare required versus available capacity per station, detect workload imbalance and rebalance workers with a measurable projected impact." },
      { property: "og:title", content: "Workforce Optimisation — SmartFulfill" },
      { property: "og:description", content: "Detect workload imbalance and rebalance the floor in one click." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/workforce" }],
  }),
  component: () => (
    <AppShell role={["admin", "manager"]}>
      <Workforce />
    </AppShell>
  ),
});

function Workforce() {
  const { workforce, orders, reassignWorker, setWorkerStatus } = useStore();
  const [q, setQ] = useState("");
  const [station, setStation] = useState("all");
  const [sort, setSort] = useState("productivity");
  const [rejected, setRejected] = useState(false);

  const loads = useMemo(() => stageLoads(orders, workforce), [orders, workforce]);
  const bottleneck = useMemo(() => detectBottleneck(loads), [loads]);

  const donorWorker = workforce.find(
    (w) => w.station === bottleneck.donor && w.status !== "inactive" && w.station !== bottleneck.station,
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = workforce.filter(
      (w) =>
        (station === "all" || w.station === station) &&
        (!term || `${w.id} ${w.name} ${w.jobRole} ${w.zone} ${w.currentTask}`.toLowerCase().includes(term)),
    );
    return [...list].sort((a, b) =>
      sort === "productivity"
        ? b.productivity - a.productivity
        : sort === "tasks"
          ? b.tasksCompleted - a.tasksCompleted
          : sort === "exceptions"
            ? b.exceptions - a.exceptions
            : a.name.localeCompare(b.name),
    );
  }, [workforce, q, station, sort]);

  const active = workforce.filter((w) => w.status === "active").length;
  const available = workforce.filter((w) => w.status === "idle").length;
  const avgProductivity = Math.round(workforce.reduce((s, w) => s + w.productivity, 0) / Math.max(1, workforce.length));

  const projected = {
    processing: { now: bottleneck.processingMin, next: Math.round(bottleneck.processingMin * 0.76 * 10) / 10 },
    delayed: { now: bottleneck.slaRisk + 8, next: Math.max(0, Math.round((bottleneck.slaRisk + 8) * 0.45)) },
    fulfilment: { now: 91, next: 96 },
  };

  return (
    <>
      <PageHeader
        accent="decision"
        eyebrow="Capacity intelligence"
        title="Workforce optimisation"
        description="Required capacity versus available capacity for every station, with a concrete reassignment that changes the floor when you accept it."
        icon={Users}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Required vs available capacity" hint="Orders waiting against what the assigned team can process per hour" />
          <BarSeries
            data={loads.map((l) => ({ station: l.station, required: l.queue, capacity: l.capacity }))}
            x="station"
            bars={[
              { key: "required", name: "Required (queue)", color: "var(--color-chart-4)" },
              { key: "capacity", name: "Available capacity", color: "var(--color-chart-2)" },
            ]}
            height={250}
          />
          <div className="mt-3">
            <Insight text={`${bottleneck.station} needs ${bottleneck.workersNeeded} more worker(s); ${bottleneck.donor} has the lowest utilisation on the floor.`} to="/warehouse-operations" />
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Station utilisation" hint="Current load against capacity" />
          <div className="space-y-4">
            {loads.map((l) => (
              <MetricMeter key={l.station} label={l.station} value={Math.min(100, l.utilisation)} target={85} />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active workers" value={active} hint={`${workforce.length} on the roster`} tone="primary" icon={Users} />
        <KpiCard label="Available now" value={available} hint="Idle and reassignable" tone="success" icon={Check} />
        <KpiCard label="Tasks completed today" value={workforce.reduce((s, w) => s + w.tasksCompleted, 0)} tone="info" icon={ArrowRight} />
        <KpiCard label="Average productivity" value={`${avgProductivity}%`} hint="Target 90%" tone={avgProductivity >= 90 ? "success" : "warning"} icon={GaugeIcon} />
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Worker roster"
          hint="Search, filter and sort — reassign any worker directly"
          right={
            <div className="flex flex-wrap gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search worker, zone, task…" className="h-9 w-52" />
              <Select value={station} onValueChange={setStation}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stations</SelectItem>
                  {STATIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="productivity">Sort: productivity</SelectItem>
                  <SelectItem value="tasks">Sort: tasks done</SelectItem>
                  <SelectItem value="exceptions">Sort: exceptions</SelectItem>
                  <SelectItem value="name">Sort: name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
        <TableShell>
          <thead className="border-b border-border bg-surface">
            <tr>
              <Th>Worker</Th>
              <Th>Role</Th>
              <Th>Zone</Th>
              <Th>Current task</Th>
              <Th>Status</Th>
              <Th>Productivity</Th>
              <Th>Reassign</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((w) => (
              <tr key={w.id}>
                <Td>
                  <span className="font-medium">{w.name}</span>
                  <span className="block font-mono text-[10px] text-muted-foreground">{w.id} · {w.station}</span>
                </Td>
                <Td className="text-sm">{w.jobRole}</Td>
                <Td className="font-mono text-xs">Zone {w.zone}</Td>
                <Td className="max-w-[220px] text-xs text-muted-foreground">{w.currentTask}</Td>
                <Td>
                  <button onClick={() => setWorkerStatus(w.id, w.status === "active" ? "idle" : "active")}>
                    <Pill t={w.status === "active" ? "success" : w.status === "idle" ? "info" : w.status === "break" ? "warning" : "neutral"}>{w.status}</Pill>
                  </button>
                </Td>
                <Td>
                  <span className={cn("font-mono text-sm font-semibold tabular-nums", w.productivity >= 90 ? "text-success" : w.productivity >= 80 ? "text-warning" : "text-critical")}>
                    {w.productivity}%
                  </span>
                </Td>
                <Td>
                  <Select value={w.station} onValueChange={(v) => reassignWorker(w.id, v as Station)}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
        {rows.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No workers match the current filters.</p>}
      </Card>

      <Card className="gap-4 border-warning/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Pill t="warning">Bottleneck detected</Pill>
            <h2 className="mt-2 font-display text-xl font-bold">{bottleneck.station} is running {bottleneck.over}% over its target handling time</h2>
            <p className="text-sm text-muted-foreground">
              Queue {bottleneck.queue} · Capacity {bottleneck.capacity} · Utilisation {bottleneck.utilisation}% · {bottleneck.workers} worker(s) assigned
            </p>
          </div>
          <Pill t="critical">{bottleneck.slaRisk} order(s) at SLA risk</Pill>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-3 text-sm">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Why</p>
            <p className="mt-1">
              {bottleneck.station} averages {bottleneck.processingMin} min against a {bottleneck.targetMin} min target, while {bottleneck.donor} is the least utilised station on the floor.
            </p>
          </div>
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Recommendation</p>
            <p className="mt-1">{bottleneck.recommendation}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Comparison label="Processing time" now={`${projected.processing.now} min`} next={`${projected.processing.next} min`} good />
          <Comparison label="Delayed orders" now={String(projected.delayed.now)} next={String(projected.delayed.next)} good />
          <Comparison label="Fulfilment" now={`${projected.fulfilment.now}%`} next={`${projected.fulfilment.next}%`} good />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!donorWorker}
            onClick={() => donorWorker && reassignWorker(donorWorker.id, bottleneck.station)}
          >
            <Check className="size-4" /> Accept — move {donorWorker?.name ?? "a worker"} to {bottleneck.station}
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/simulator">Modify in simulator</Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setRejected(true);
              toast.message("Recommendation rejected", { description: "Kept the current staffing plan. The bottleneck stays visible until it clears." });
            }}
          >
            <X className="size-4" /> Reject
          </Button>
          {rejected && <span className="self-center text-xs text-muted-foreground">Rejected — staffing unchanged.</span>}
        </div>
      </Card>
    </>
  );
}

function Comparison({ label, now, next, good }: { label: string; now: string; next: string; good?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-display text-lg font-bold tabular-nums text-muted-foreground line-through decoration-muted-foreground/40">{now}</span>
        <ArrowRight className="size-3.5 text-muted-foreground" />
        <span className={cn("font-display text-lg font-bold tabular-nums", good ? "text-success" : "text-foreground")}>{next}</span>
      </div>
      <p className="text-[10px] text-muted-foreground">Projected after reassignment</p>
    </div>
  );
}
