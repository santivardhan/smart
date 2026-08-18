import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Grid3X3, Package, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, Insight, KpiCard, PageHeader, SectionTitle, StatLine, Td, Th, TableShell } from "@/components/shared";
import { Pill, StageBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { zoneMetrics, type ZoneMetrics } from "@/lib/ops";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/warehouse-operations")({
  head: () => ({
    meta: [
      { title: "Warehouse Map — SmartFulfill" },
      { name: "description", content: "Digital warehouse heatmap: zone utilisation, orders, workers, pending tasks and exceptions across receiving, storage, picking, packing, QC and dispatch." },
      { property: "og:title", content: "Warehouse Map — SmartFulfill" },
      { property: "og:description", content: "See congestion, workload and exception heat by warehouse zone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/warehouse-operations" }],
  }),
  component: () => (
    <AppShell role={["admin", "manager"]}>
      <WarehouseOperations />
    </AppShell>
  ),
});

const MODES = [
  { id: "orders", label: "Orders", key: "orders" as const, unit: "orders" },
  { id: "inventory", label: "Inventory", key: "inventory" as const, unit: "units" },
  { id: "workers", label: "Workers", key: "workers" as const, unit: "on shift" },
  { id: "congestion", label: "Congestion", key: "utilisation" as const, unit: "% utilised" },
  { id: "exceptions", label: "Exceptions", key: "exceptions" as const, unit: "open" },
];

const HEAT: Record<ZoneMetrics["heat"], string> = {
  low: "border-success/40 bg-success/10 text-success",
  medium: "border-info/40 bg-info/15 text-info",
  high: "border-warning/40 bg-warning/20 text-warning",
  critical: "border-critical/50 bg-critical/20 text-critical",
};

const FLOW = ["Receiving", "Storage", "Picking", "Packing", "Quality check", "Dispatch"];

function WarehouseOperations() {
  const { orders, inventory, exceptions, workforce } = useStore();
  const [mode, setMode] = useState("orders");
  const [open, setOpen] = useState<ZoneMetrics | null>(null);

  const zones = useMemo(() => zoneMetrics(orders, inventory, exceptions, workforce), [orders, inventory, exceptions, workforce]);
  const active = MODES.find((m) => m.id === mode)!;
  const hottest = [...zones].sort((a, b) => b.utilisation - a.utilisation)[0]!;

  const flowCounts: Record<string, number> = {
    Receiving: orders.filter((o) => ["created", "prioritized"].includes(o.stage)).length,
    Storage: orders.filter((o) => o.stage === "allocated").length,
    Picking: orders.filter((o) => o.stage === "picking").length,
    Packing: orders.filter((o) => o.stage === "packing").length,
    "Quality check": orders.filter((o) => o.stage === "qc").length,
    Dispatch: orders.filter((o) => o.stage === "dispatch").length,
  };

  const zoneOrders = (z: ZoneMetrics) => {
    const skus = inventory.filter((i) => i.zone === z.zone).map((i) => i.sku);
    return z.zone === "D"
      ? orders.filter((o) => o.stage === "dispatch")
      : orders.filter((o) => o.stage !== "completed" && o.items.some((i) => skus.includes(i.sku)));
  };

  return (
    <>
      <PageHeader
        accent="decision"
        eyebrow="Floor visibility"
        title="Warehouse operations map"
        description="A live digital layout of the floor. Switch the view to see where orders, stock, people, congestion or exceptions are concentrated."
        icon={Grid3X3}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Zones monitored" value={zones.length} tone="primary" icon={Grid3X3} />
        <KpiCard label="Active orders on floor" value={zones.reduce((s, z) => s + z.orders, 0)} tone="info" icon={Package} />
        <KpiCard label="Workers on shift" value={workforce.filter((w) => w.status !== "inactive").length} tone="success" icon={Users} to="/workforce" />
        <KpiCard label="Open exceptions" value={exceptions.filter((e) => e.status !== "resolved").length} tone="critical" icon={AlertTriangle} to="/exceptions" />
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Fulfilment flow load"
          hint="Orders currently sitting in each physical stage"
        />
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {FLOW.map((f) => {
            const n = flowCounts[f] ?? 0;
            return (
              <div key={f} className={cn("rounded-xl border p-3", n >= 3 ? "border-warning/40 bg-warning/10" : "border-border bg-surface")}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{f}</p>
                <p className="font-display text-2xl font-bold tabular-nums">{n}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle
          title="Zone heatmap"
          hint="Click any zone for a full breakdown"
          right={
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList>
                {MODES.map((m) => (
                  <TabsTrigger key={m.id} value={m.id}>
                    {m.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {zones.map((z) => (
            <button key={z.zone} onClick={() => setOpen(z)} className={cn("rounded-2xl border p-4 text-left transition-transform hover:-translate-y-0.5", HEAT[z.heat])}>
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-bold text-foreground">Zone {z.zone}</span>
                <Pill t={z.heat === "critical" ? "critical" : z.heat === "high" ? "warning" : z.heat === "medium" ? "info" : "success"}>{z.heat}</Pill>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{z.label}</p>
              <p className="mt-4 font-display text-3xl font-bold tabular-nums">{z[active.key]}</p>
              <p className="text-[11px] text-muted-foreground">{active.unit}</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background/60">
                <div className="h-full rounded-full bg-current" style={{ width: `${z.utilisation}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{z.utilisation}% utilised · {z.workers} worker(s)</p>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <Insight text={`Zone ${hottest.zone} is the most congested area at ${hottest.utilisation}% utilisation with ${hottest.exceptions} open exception(s).`} to="/workforce" />
        </div>
      </Card>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>Zone {open.zone} — {open.label}</DialogTitle>
                <DialogDescription>Live workload, staffing and exception detail for this zone.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <StatLine label="Utilisation" value={`${open.utilisation}%`} tone={open.heat === "critical" ? "critical" : "info"} />
                  <StatLine label="Active orders" value={open.orders} />
                  <StatLine label="Pending tasks" value={open.pendingTasks} />
                  <StatLine label="Workers on shift" value={open.workers} />
                  <StatLine label="Open exceptions" value={open.exceptions} tone={open.exceptions ? "critical" : "success"} />
                  <StatLine label="Units on hand" value={open.inventory} />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Orders in this zone</p>
                  {zoneOrders(open).slice(0, 6).map((o) => (
                    <Link
                      key={o.id}
                      to="/orders/$orderId"
                      params={{ orderId: o.id }}
                      className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2 text-sm hover:border-primary/50"
                    >
                      <span className="font-mono text-xs">{o.id}</span>
                      <StageBadge s={o.stage} />
                    </Link>
                  ))}
                  {zoneOrders(open).length === 0 && <p className="text-sm text-muted-foreground">No active orders in this zone.</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm"><Link to="/workforce">Rebalance workers</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/exceptions">View exceptions</Link></Button>
                <Button asChild size="sm" variant="ghost"><Link to="/inventory">Zone inventory</Link></Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Card className="p-5">
        <SectionTitle title="Zone comparison" hint="Same data in table form for quick scanning" />
        {zones.length === 0 ? (
          <EmptyState title="No zone data" description="Zone metrics appear as soon as inventory is mapped to zones." />
        ) : (
          <TableShell>
            <thead className="border-b border-border bg-surface">
              <tr>
                <Th>Zone</Th>
                <Th>Function</Th>
                <Th>Orders</Th>
                <Th>Pending</Th>
                <Th>Workers</Th>
                <Th>Exceptions</Th>
                <Th>Utilisation</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {zones.map((z) => (
                <tr key={z.zone} className="cursor-pointer hover:bg-accent/40" onClick={() => setOpen(z)}>
                  <Td className="font-mono font-semibold">Zone {z.zone}</Td>
                  <Td className="text-xs text-muted-foreground">{z.label}</Td>
                  <Td className="tabular-nums">{z.orders}</Td>
                  <Td className="tabular-nums">{z.pendingTasks}</Td>
                  <Td className="tabular-nums">{z.workers}</Td>
                  <Td className="tabular-nums">{z.exceptions}</Td>
                  <Td>
                    <Pill t={z.heat === "critical" ? "critical" : z.heat === "high" ? "warning" : z.heat === "medium" ? "info" : "success"}>{z.utilisation}%</Pill>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>
    </>
  );
}
