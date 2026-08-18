import { Link, createFileRoute } from "@tanstack/react-router";
import { Boxes, Check, PackageSearch, Pencil, X } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader, PipelineStrip, SectionTitle, StatLine } from "@/components/shared";
import { Pill, PriorityBadge, StageBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { fmtRelative, money } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/allocation")({
  head: () => ({
    meta: [
      { title: "Smart Allocation — SmartFulfill" },
      { name: "description", content: "Priority-aware inventory allocation with shortage detection, stock holds and explainable recommendations." },
      { property: "og:title", content: "Smart Allocation — SmartFulfill" },
      { property: "og:description", content: "Allocate scarce stock to the highest-priority orders with a transparent rationale." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/allocation" }],
  }),
  component: () => (
    <AppShell role={["admin", "manager"]}>
      <Allocation />
    </AppShell>
  ),
});

function Allocation() {
  const { orders, inventory, allocateOrder } = useStore();
  const [modify, setModify] = useState<Order | null>(null);
  const [note, setNote] = useState("");

  const queue = orders
    .filter((o) => ["pending", "hold", "partial"].includes(o.allocationStatus) && ["created", "prioritized"].includes(o.stage))
    .sort((a, b) => b.score - a.score);
  const allocated = orders.filter((o) => ["accepted", "partial"].includes(o.allocationStatus) && ["allocated", "picking"].includes(o.stage));


  return (
    <>
      <PageHeader
        accent="primary"
        eyebrow="Decision engine"
        title="Smart inventory allocation"
        description="When stock is scarce, SmartFulfill allocates to the highest priority score first, holds lower-priority demand and raises replenishment."
        icon={PackageSearch}
      />

      <PipelineStrip current="/allocation" />

      {queue.length === 0 ? (
        <EmptyState
          title="Allocation queue is clear"
          description="Every open order has been allocated. New orders appear here as soon as they are scored."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/orders/new">Create an order</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {queue.map((o) => {
            const lines = o.items.map((it) => {
              const inv = inventory.find((i) => i.sku === it.sku)!;
              const canAllocate = Math.min(inv.available, it.qty);
              return { ...it, inv, canAllocate, shortage: it.qty - canAllocate };
            });
            const shortage = lines.reduce((s, l) => s + l.shortage, 0);
            const competing = orders.filter(
              (x) => x.id !== o.id && x.stage !== "completed" && x.allocationStatus !== "accepted" && x.items.some((i) => o.items.some((j) => j.sku === i.sku)),
            );

            return (
              <Card key={o.id} className={shortage > 0 ? "gap-4 border-critical/40 p-5" : "gap-4 p-5"}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to="/orders/$orderId" params={{ orderId: o.id }} className="font-mono text-lg font-bold hover:text-primary">
                        {o.id}
                      </Link>
                      <PriorityBadge p={o.priority} score={o.score} />
                      <StageBadge s={o.stage} />
                      {o.allocationStatus === "hold" && <Pill t="warning">Stock hold</Pill>}
                      {o.allocationStatus === "partial" && <Pill t="warning">Partially allocated</Pill>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {o.customer} · {money(o.value)} · SLA {fmtRelative(o.slaDeadline)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => allocateOrder(o.id, "accept")}>
                      <Check className="size-4" /> Accept decision
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setModify(o);
                        setNote("");
                      }}
                    >
                      <Pencil className="size-4" /> Modify
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => allocateOrder(o.id, "reject", "Operator rejected the allocation recommendation")}>
                      <X className="size-4" /> Reject
                    </Button>
                  </div>
                </div>

                <div className="scroll-slim overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="py-2 text-left">SKU</th>
                        <th className="py-2 text-left">Bin</th>
                        <th className="py-2 text-right">Required</th>
                        <th className="py-2 text-right">Available</th>
                        <th className="py-2 text-right">Allocatable</th>
                        <th className="py-2 text-right">Shortage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {lines.map((l) => (
                        <tr key={l.sku}>
                          <td className="py-2">
                            <Link to="/inventory/$sku" params={{ sku: l.sku }} className="font-mono hover:text-primary">
                              {l.sku}
                            </Link>
                            <span className="ml-2 text-muted-foreground">{l.name}</span>
                          </td>
                          <td className="py-2 font-mono text-xs">{l.inv.bin}</td>
                          <td className="py-2 text-right tabular-nums">{l.qty}</td>
                          <td className="py-2 text-right tabular-nums">{l.inv.available}</td>
                          <td className="py-2 text-right tabular-nums font-semibold text-primary">{l.canAllocate}</td>
                          <td className={l.shortage ? "py-2 text-right tabular-nums font-semibold text-critical" : "py-2 text-right tabular-nums text-muted-foreground"}>
                            {l.shortage}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Recommended decision</p>
                  <p className="mt-1 text-sm">
                    {shortage > 0 ? (
                      <>
                        Allocate the {lines.reduce((s, l) => s + l.canAllocate, 0)} available unit(s) to <strong>{o.id}</strong> because its
                        priority score ({o.score}, {o.priority}) is the highest competing demand. Reserve the shortage of{" "}
                        <strong>{shortage} unit(s)</strong>, place lower-priority orders on stock hold and create a replenishment task.
                      </>
                    ) : (
                      <>
                        Full stock is available — reserve {lines.reduce((s, l) => s + l.qty, 0)} unit(s) for <strong>{o.id}</strong> and release
                        it to the picking queue.
                      </>
                    )}
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Why this order wins</p>
                      <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {o.reasons.map((r) => (
                          <li key={r}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Affected orders</p>
                      {competing.length === 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">No competing demand for these SKUs.</p>
                      ) : (
                        <ul className="mt-1 space-y-1 text-xs">
                          {competing.map((c) => (
                            <li key={c.id}>
                              <Link to="/orders/$orderId" params={{ orderId: c.id }} className="font-mono hover:text-primary">
                                {c.id}
                              </Link>{" "}
                              <span className="text-muted-foreground">
                                {c.priority} · score {c.score} {c.score < o.score ? "→ hold" : "→ unaffected"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Resulting actions</p>
                      <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                        <li>• Inventory reserved and stock movement logged</li>
                        <li>• Order released to the picking queue</li>
                        {shortage > 0 && <li>• Replenishment task + shortage exception raised</li>}
                        {shortage > 0 && <li>• Lower-priority orders moved to stock hold</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-5">
        <SectionTitle title="Recently allocated" hint="Reserved stock waiting on picking" />
        {allocated.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing allocated yet in this session.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {allocated.map((o) => (
              <Link key={o.id} to="/orders/$orderId" params={{ orderId: o.id }} className="rounded-xl border border-border bg-surface p-3 hover:border-primary/40">
                <div className="flex items-center gap-2">
                  <Boxes className="size-4 text-primary" />
                  <span className="font-mono text-sm font-semibold">{o.id}</span>
                  <span className="ml-auto"><StageBadge s={o.stage} /></span>
                </div>
                <StatLine label="Units reserved" value={o.items.reduce((s, i) => s + i.allocated, 0)} />
                <StatLine label="Customer" value={o.customer} />
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!modify} onOpenChange={(v) => !v && setModify(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify allocation for {modify?.id}</DialogTitle>
            <DialogDescription>
              Record why you are overriding the recommendation. The allocation still executes, but your reason is stored in the decision
              history.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Customer agreed to a split shipment — ship available units now." rows={4} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModify(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (modify) allocateOrder(modify.id, "modify", note || "Operator modified the allocation");
                setModify(null);
              }}
            >
              Execute modified allocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
