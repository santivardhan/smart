import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, MapPin, PackageX, Play, Route as RouteIcon, Scan, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader, PipelineStrip, SectionTitle, TableShell, Td, Th } from "@/components/shared";
import { Pill, PriorityBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fmtRelative, optimiseRoute } from "@/lib/engine";
import { WORKERS, ZONES } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/picking")({
  head: () => ({
    meta: [
      { title: "Picking Operations — SmartFulfill" },
      { name: "description", content: "Zone-aware pick tasks with optimised bin routing, live status and one-tap exception reporting." },
      { property: "og:title", content: "Picking Operations — SmartFulfill" },
      { property: "og:description", content: "Optimised pick routes across warehouse zones with live task status." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/picking" }],
  }),
  component: PickingRoute,
});

function PickingRoute() {
  const { user } = useStore();
  const role: Role[] = user?.role === "worker" ? ["worker"] : ["admin", "manager"];
  return (
    <AppShell role={role}>
      <Picking />
    </AppShell>
  );
}

function Picking() {
  const { orders, inventory, startPicking, completePicking, reportIssue } = useStore();
  const [picker, setPicker] = useState(WORKERS[0]!.name);

  const tasks = orders
    .filter((o) => ["allocated", "picking"].includes(o.stage))
    .sort((a, b) => b.score - a.score);

  const activeBins = tasks.flatMap((t) => t.items.map((i) => inventory.find((x) => x.sku === i.sku)!.bin));
  const routeDemo = optimiseRoute(activeBins.length ? activeBins.slice(0, 5) : ["A-01", "C-02", "A-05", "B-03"]);

  return (
    <>
      <PageHeader
        accent="success"
        eyebrow="Floor execution"
        title="Picking"
        description="Pick tasks ordered by priority score, with zone map and optimised bin routing to cut walking time."
        icon={Scan}
        actions={
          <Select value={picker} onValueChange={setPicker}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {WORKERS.map((w) => (
                <SelectItem key={w.id} value={w.name}>
                  {w.name} · {w.zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <PipelineStrip current="/picking" />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Warehouse zone map" hint="Bins with active pick demand are highlighted" />
          <div className="grid gap-3 md:grid-cols-3">
            {ZONES.map((z) => (
              <div key={z.zone} className="rounded-xl border border-border bg-surface p-3">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="size-4 text-primary" /> Zone {z.zone}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {z.bins.map((b) => {
                    const active = activeBins.includes(b);
                    return (
                      <div
                        key={b}
                        className={cn(
                          "rounded-lg border px-2 py-2 text-center font-mono text-xs",
                          active ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground",
                        )}
                      >
                        {b}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Pick-route optimisation" hint="Nearest-bin sequencing" />
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Original route</p>
              <p className="font-mono text-sm">{routeDemo.original.join(" → ")}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-primary">Optimised route</p>
              <p className="font-mono text-sm text-primary">{routeDemo.optimised.join(" → ")}</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
              <RouteIcon className="size-4 text-success" />
              Saves ~{routeDemo.distanceSaved} m walking · {routeDemo.minutesSaved} min per pick round
            </div>
          </div>
        </Card>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="No pick tasks in the queue"
          description="Allocate an order to release it into picking."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/allocation">Go to allocation</Link>
            </Button>
          }
        />
      ) : (
        <TableShell>
          <thead className="border-b border-border bg-surface">
            <tr>
              <Th>Pick ID</Th>
              <Th>Order</Th>
              <Th>Picker</Th>
              <Th>SKU / Qty</Th>
              <Th>Zone · Bin</Th>
              <Th>Priority</Th>
              <Th>Status</Th>
              <Th>Est. time</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tasks.map((o, idx) => {
              const bins = o.items.map((i) => inventory.find((x) => x.sku === i.sku)!);
              const est = o.items.reduce((s, i) => s + 1.5 + i.qty * 0.2, 0).toFixed(1);
              return (
                <tr key={o.id} className="transition-colors hover:bg-accent/40">
                  <Td className="font-mono">PICK-{700 + idx}</Td>
                  <Td>
                    <Link to="/orders/$orderId" params={{ orderId: o.id }} className="font-mono font-semibold hover:text-primary">
                      {o.id}
                    </Link>
                    <p className="text-xs text-muted-foreground">{o.customer}</p>
                  </Td>
                  <Td className="text-sm">{o.picker ?? <span className="text-muted-foreground">Unassigned</span>}</Td>
                  <Td className="text-xs">
                    {o.items.map((i) => (
                      <p key={i.sku} className="font-mono">
                        {i.sku} × {i.qty}
                      </p>
                    ))}
                  </Td>
                  <Td className="font-mono text-xs">{bins.map((b) => `${b.zone}·${b.bin}`).join(", ")}</Td>
                  <Td><PriorityBadge p={o.priority} score={o.score} /></Td>
                  <Td>
                    <Pill t={o.pickStatus === "in_progress" ? "primary" : o.pickStatus === "done" ? "success" : "neutral"}>
                      {o.pickStatus.replace("_", " ")}
                    </Pill>
                  </Td>
                  <Td className="text-xs text-muted-foreground">
                    {est} min · SLA {fmtRelative(o.slaDeadline)}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {o.pickStatus !== "in_progress" ? (
                        <Button size="sm" onClick={() => startPicking(o.id, picker)}>
                          <Play className="size-3.5" /> Start
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => completePicking(o.id)}>
                          <CheckCircle2 className="size-3.5" /> Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reportIssue(o.id, "Missing Item", o.items[0]?.sku, `Unit of ${o.items[0]?.sku} not found in bin ${bins[0]?.bin} during picking of ${o.id}.`)}
                      >
                        <PackageX className="size-3.5" /> Missing
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reportIssue(o.id, "Damaged Item", o.items[0]?.sku, `Damaged unit of ${o.items[0]?.sku} found while picking ${o.id}.`)}
                      >
                        <TriangleAlert className="size-3.5" /> Damaged
                      </Button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}
    </>
  );
}
