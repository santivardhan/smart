import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { BarSeries } from "@/components/charts";
import { Insight, PageHeader, SectionTitle } from "@/components/shared";
import { Pill } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useStore } from "@/lib/store";
import { simulate, stageLoads, type SimInput, type SimMetrics } from "@/lib/ops";
import { slaRisk } from "@/lib/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Operations Simulator — SmartFulfill" },
      { name: "description", content: "Run what-if scenarios on staffing, order volume and stock availability, and see the projected effect on fulfilment rate, processing time and SLA compliance." },
      { property: "og:title", content: "Operations Simulator — SmartFulfill" },
      { property: "og:description", content: "Test staffing and volume changes before you commit to them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/simulator" }],
  }),
  component: () => (
    <AppShell role={["admin", "manager"]}>
      <Simulator />
    </AppShell>
  ),
});

function Simulator() {
  const { orders, workforce, inventory } = useStore();

  const base: SimInput = useMemo(() => {
    const at = (s: string) => workforce.filter((w) => w.station === s && w.status !== "inactive").length;
    const availability = Math.round(
      (inventory.filter((i) => i.available > i.reorderLevel).length / Math.max(1, inventory.length)) * 100,
    );
    return {
      picking: Math.max(1, at("Picking")),
      packing: Math.max(1, at("Packing")),
      qc: Math.max(1, at("QC")),
      volume: Math.max(1, orders.filter((o) => o.stage !== "completed").length),
      availability,
    };
  }, [workforce, inventory, orders]);

  const current: SimMetrics = useMemo(() => {
    const loads = stageLoads(orders, workforce);
    const active = orders.filter((o) => o.stage !== "completed");
    return {
      fulfilment: Math.round((orders.filter((o) => o.stage === "completed").length / Math.max(1, orders.length)) * 100),
      processingMin: Math.round(loads.reduce((s, l) => s + l.processingMin, 0) * 10) / 10,
      delayedOrders: active.filter((o) => slaRisk(o) === "delayed").length + 1,
      utilisation: Math.round(loads.reduce((s, l) => s + l.utilisation, 0) / Math.max(1, loads.length)),
      slaCompliance: Math.round((active.filter((o) => slaRisk(o) === "on_time").length / Math.max(1, active.length)) * 100),
    };
  }, [orders, workforce]);

  const [input, setInput] = useState<SimInput>(base);
  const projected = useMemo(() => simulate(base, input, current), [base, input, current]);
  const changed = JSON.stringify(base) !== JSON.stringify(input);

  const set = (k: keyof SimInput) => (v: number[]) => setInput((p) => ({ ...p, [k]: v[0]! }));

  const rows: { label: string; now: number; next: number; suffix: string; higherBetter: boolean }[] = [
    { label: "Fulfilment rate", now: current.fulfilment, next: projected.fulfilment, suffix: "%", higherBetter: true },
    { label: "Avg processing time", now: current.processingMin, next: projected.processingMin, suffix: " min", higherBetter: false },
    { label: "Delayed orders", now: current.delayedOrders, next: projected.delayedOrders, suffix: "", higherBetter: false },
    { label: "Worker utilisation", now: current.utilisation, next: projected.utilisation, suffix: "%", higherBetter: false },
    { label: "SLA compliance", now: current.slaCompliance, next: projected.slaCompliance, suffix: "%", higherBetter: true },
  ];

  const verdict =
    projected.slaCompliance > current.slaCompliance && projected.processingMin <= current.processingMin
      ? "This scenario improves both SLA compliance and throughput — worth executing."
      : projected.slaCompliance < current.slaCompliance
        ? "This scenario degrades SLA compliance. Add capacity or reduce intake before committing."
        : "Roughly neutral — the change moves load around without a clear net gain.";

  return (
    <>
      <PageHeader
        accent="decision"
        eyebrow="What-if analysis"
        title="Operations simulator"
        description="Change staffing, incoming volume or stock availability and watch the projected operational outcome before you commit to it on the floor."
        icon={FlaskConical}
        actions={
          <Button variant="outline" size="sm" onClick={() => setInput(base)}>
            <RotateCcw className="size-4" /> Reset to live
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="gap-5 p-5">
          <SectionTitle title="Scenario inputs" hint="Sliders start from the live floor configuration" />
          <SliderRow label="Picking workers" value={input.picking} baseValue={base.picking} min={0} max={12} onChange={set("picking")} />
          <SliderRow label="Packing workers" value={input.packing} baseValue={base.packing} min={0} max={12} onChange={set("packing")} />
          <SliderRow label="QC inspectors" value={input.qc} baseValue={base.qc} min={0} max={8} onChange={set("qc")} />
          <SliderRow label="Order volume" value={input.volume} baseValue={base.volume} min={1} max={80} onChange={set("volume")} />
          <SliderRow label="Stock availability" value={input.availability} baseValue={base.availability} min={30} max={100} suffix="%" onChange={set("availability")} />
        </Card>

        <Card className="gap-4 p-5">
          <SectionTitle
            title="Projected outcome"
            hint="Current floor versus simulated scenario"
            right={<Pill t={changed ? "warning" : "neutral"}>{changed ? "Scenario modified" : "Live configuration"}</Pill>}
          />
          <div className="space-y-2">
            {rows.map((r) => {
              const better = r.higherBetter ? r.next > r.now : r.next < r.now;
              const same = r.next === r.now;
              return (
                <div key={r.label} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
                  <span className="text-sm text-muted-foreground">{r.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-sm tabular-nums text-muted-foreground">{r.now}{r.suffix}</span>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                    <span className={cn("font-display text-base font-bold tabular-nums", same ? "text-foreground" : better ? "text-success" : "text-critical")}>
                      {r.next}{r.suffix}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          <Insight text={verdict} />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!changed}
              onClick={() =>
                toast.success("Scenario saved", {
                  description: `${input.picking} picking · ${input.packing} packing · ${input.qc} QC at ${input.volume} orders — projected ${projected.slaCompliance}% SLA compliance.`,
                })
              }
            >
              Save scenario
            </Button>
            <Button size="sm" variant="outline" onClick={() => setInput({ ...base, volume: Math.round(base.volume * 1.5) })}>
              Peak-day preset
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setInput({ ...base, availability: 55 })}>
              Stock-shortage preset
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle title="Current versus simulated" hint="Same metrics side by side" />
        <BarSeries
          data={rows.map((r) => ({ metric: r.label, current: r.now, simulated: r.next }))}
          x="metric"
          bars={[
            { key: "current", name: "Current", color: "var(--color-chart-3)" },
            { key: "simulated", name: "Simulated", color: "var(--color-chart-1)" },
          ]}
          height={280}
        />
      </Card>
    </>
  );
}

function SliderRow({
  label,
  value,
  baseValue,
  min,
  max,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  baseValue: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-display text-sm font-bold tabular-nums">
          {value}{suffix}
          {value !== baseValue && <span className="ml-2 text-[11px] font-normal text-muted-foreground">live {baseValue}{suffix}</span>}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={onChange} />
    </div>
  );
}
