import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, MapPin, Truck } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, PageHeader, SectionTitle } from "@/components/shared";
import { Pill, PriorityBadge, StageBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fmtDate, fmtRelative, money, slaRisk } from "@/lib/engine";
import { TRACKING_STEPS, etaHours, trackingIndex } from "@/lib/ops";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tracking")({
  head: () => ({
    meta: [
      { title: "Live Order Tracking — SmartFulfill" },
      { name: "description", content: "Track any order end to end: confirmed, allocated, picking, packing, quality check, dispatched, in transit and delivered, with a live ETA." },
      { property: "og:title", content: "Live Order Tracking — SmartFulfill" },
      { property: "og:description", content: "Stage-by-stage visibility with ETA and carrier detail for every order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/tracking" }],
  }),
  component: () => (
    <AppShell role={["admin", "manager", "customer", "worker"]}>
      <Tracking />
    </AppShell>
  ),
});

function Tracking() {
  const { orders, user } = useStore();
  const [q, setQ] = useState("");

  const scoped = useMemo(
    () => (user?.role === "customer" ? orders.filter((o) => o.customerEmail === user.email || o.customer === user.customer) : orders),
    [orders, user],
  );

  const term = q.trim().toLowerCase();
  const list = scoped.filter((o) => !term || `${o.id} ${o.customer} ${o.trackingId ?? ""}`.toLowerCase().includes(term));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = list.find((o) => o.id === selectedId) ?? list[0];

  const inTransit = scoped.filter((o) => o.stage === "dispatch").length;
  const delivered = scoped.filter((o) => o.stage === "completed").length;
  const atRisk = scoped.filter((o) => o.stage !== "completed" && slaRisk(o) !== "on_time").length;

  return (
    <>
      <PageHeader
        accent="info"
        eyebrow="End-to-end visibility"
        title="Live order tracking"
        description="Follow any order through every physical stage of fulfilment, with the live ETA and the carrier handling the final leg."
        icon={MapPin}
      />


      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <SectionTitle
            title="Orders"
            hint="Select an order to see its journey"
            right={<Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order or tracking ID" className="h-9 w-44" />}
          />
          <div className="scroll-slim max-h-[560px] space-y-2 overflow-y-auto pr-1">
            {list.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedId(o.id)}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition-colors",
                  selected?.id === o.id ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/40",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{o.id}</span>
                  <PriorityBadge p={o.priority} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{o.customer} · {money(o.value)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <StageBadge s={o.stage} />
                  <span className="text-[11px] text-muted-foreground">{o.stage === "completed" ? "Delivered" : `ETA ${etaHours(o)}h`}</span>
                </div>
              </button>
            ))}
            {list.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No orders match that search.</p>}
          </div>
        </Card>

        <Card className="p-5 xl:col-span-2">
          {!selected ? (
            <EmptyState title="Nothing to track" description="Once an order is created it appears here with a live journey." />
          ) : (
            <>
              <SectionTitle
                title={`Journey · ${selected.id}`}
                hint={`${selected.customer} · ${selected.items.length} line(s) · ${money(selected.value)}`}
                right={
                  <Pill t={slaRisk(selected) === "on_time" ? "success" : slaRisk(selected) === "at_risk" ? "warning" : "critical"}>
                    {slaRisk(selected) === "on_time" ? "On time" : slaRisk(selected) === "at_risk" ? "At risk" : "Delayed"}
                  </Pill>
                }
              />

              <div className="grid gap-3 sm:grid-cols-3">
                <Fact label="Current stage" value={selected.stage === "completed" ? "Delivered" : TRACKING_STEPS[trackingIndex(selected)]!} />
                <Fact label="Estimated arrival" value={selected.stage === "completed" ? "Delivered" : `${etaHours(selected)}h · ${fmtRelative(selected.slaDeadline)}`} />
                <Fact label="Carrier" value={selected.carrier ?? "Not yet assigned"} />
              </div>

              <ol className="mt-5 space-y-0">
                {TRACKING_STEPS.map((step, i) => {
                  const idx = trackingIndex(selected);
                  const done = i <= idx;
                  const current = i === idx && selected.stage !== "completed";
                  return (
                    <li key={step} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold",
                            done ? "border-success bg-success/20 text-success" : "border-border bg-surface text-muted-foreground",
                            current && "ring-2 ring-primary/50",
                          )}
                        >
                          {done ? "✓" : i + 1}
                        </span>
                        {i < TRACKING_STEPS.length - 1 && <span className={cn("h-8 w-px", done ? "bg-success/50" : "bg-border")} />}
                      </div>
                      <div className="pb-3">
                        <p className={cn("text-sm font-medium", done ? "text-foreground" : "text-muted-foreground")}>{step}</p>
                        {current && <p className="text-xs text-primary">In progress now</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="rounded-xl border border-border bg-surface p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Latest events</p>
                <ul className="mt-2 space-y-1.5">
                  {[...selected.timeline].slice(-4).reverse().map((t) => (
                    <li key={t.id} className="text-sm">
                      <span className="font-medium">{t.title}</span>
                      <span className="block text-xs text-muted-foreground">{t.detail} · {fmtDate(t.at)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to="/orders/$orderId" params={{ orderId: selected.id }}>Open full order</Link>
                </Button>
                {selected.trackingId && <Pill t="info">Tracking {selected.trackingId}</Pill>}
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Trackable orders" value={scoped.length} tone="primary" icon={MapPin} />
        <KpiCard label="In transit" value={inTransit} tone="info" icon={Truck} />
        <KpiCard label="Delivered" value={delivered} tone="success" icon={CheckCircle2} />
        <KpiCard label="At SLA risk" value={atRisk} tone="critical" icon={Clock} to="/orders" />
      </div>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
