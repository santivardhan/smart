import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Box, Brain, PackageCheck, Scan, ShieldCheck, Truck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BackLink, EmptyState, PageHeader, SectionTitle, StatLine, WorkflowProgress } from "@/components/shared";
import { ExceptionBadge, Pill, PriorityBadge, RiskBadge, StageBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fmtDate, fmtRelative, money, scoreOrder, slaRisk } from "@/lib/engine";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/orders/$orderId")({
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.orderId} — SmartFulfill` },
      { name: "description", content: `Priority reasoning, allocation, workflow timeline, exceptions and decisions for order ${params.orderId}.` },
      { property: "og:title", content: `Order ${params.orderId} — SmartFulfill` },
      { property: "og:description", content: "Priority reasoning, allocation state, timeline and exceptions for a single order." },
      { property: "og:url", content: `https://swift-resolve-ware.lovable.app/orders/${params.orderId}` },
    ],
    links: [{ rel: "canonical", href: `https://swift-resolve-ware.lovable.app/orders/${params.orderId}` }],
  }),

  component: () => (
    <AppShell role={["admin", "manager"]}>
      <OrderDetail />
    </AppShell>
  ),
});

function OrderDetail() {
  const { orderId } = useParams({ from: "/orders/$orderId" });
  const { orders, inventory, exceptions, history } = useStore();
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <EmptyState
        title="Order not found"
        description={`No order matches ${orderId}. It may have been renamed or removed.`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/orders">Back to orders</Link>
          </Button>
        }
      />
    );
  }

  const breakdown = scoreOrder({
    slaDeadline: order.slaDeadline,
    createdAt: order.createdAt,
    customerTier: order.customerTier,
    value: order.value,
  }).breakdown;
  const orderExceptions = exceptions.filter((e) => e.orderId === order.id);
  const orderDecisions = history.filter((h) => h.decision.includes(order.id) || h.result.includes(order.id));

  const nextAction = {
    created: { label: "Allocate inventory", to: "/allocation", icon: Box },
    prioritized: { label: "Allocate inventory", to: "/allocation", icon: Box },
    allocated: { label: "Start picking", to: "/picking", icon: Scan },
    picking: { label: "Go to picking", to: "/picking", icon: Scan },
    packing: { label: "Pack order", to: "/packing", icon: PackageCheck },
    qc: { label: "Quality check", to: "/quality-check", icon: ShieldCheck },
    dispatch: { label: "Dispatch", to: "/dispatch", icon: Truck },
    completed: { label: "View analytics", to: "/analytics", icon: Brain },
  }[order.stage];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/orders">
          <ArrowLeft className="size-4" /> All orders
        </Link>
      </Button>

      <BackLink to="/orders" label="Back to orders" />
      <PageHeader
        accent="primary"
        eyebrow={`Order ${order.id}`}
        title={order.customer}
        description={`${order.items.length} line item(s) · ${money(order.value)} · created ${fmtRelative(order.createdAt)}`}
        icon={Box}
        actions={
          <>
            <PriorityBadge p={order.priority} score={order.score} />
            <StageBadge s={order.stage} />
            <RiskBadge r={slaRisk(order)} />
            <Button asChild size="sm">
              <Link to={nextAction.to as never}>
                <nextAction.icon className="size-4" /> {nextAction.label}
              </Link>
            </Button>
          </>
        }
      />

      <Card className="p-5">
        <SectionTitle title="Fulfilment workflow" hint={`Current stage: ${order.stage}`} />
        <WorkflowProgress stage={order.stage} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Order lines" hint="Requested quantity against live inventory" />
          <div className="space-y-3">
            {order.items.map((it) => {
              const inv = inventory.find((i) => i.sku === it.sku)!;
              const short = it.qty - Math.min(it.qty, inv.available + it.allocated);
              return (
                <div key={it.sku} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{it.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {it.sku} · Zone {inv.zone} · Bin {inv.bin}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Pill t="neutral">Qty {it.qty}</Pill>
                    <Pill t={it.allocated >= it.qty ? "success" : it.allocated > 0 ? "warning" : "neutral"}>Allocated {it.allocated}</Pill>
                    <Pill t={inv.available > 0 ? "info" : "critical"}>On hand {inv.available}</Pill>
                    {short > 0 && <Pill t="critical">Short {short}</Pill>}
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/inventory/$sku" params={{ sku: it.sku }}>Inventory</Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Priority decision" hint="Transparent rule-based scoring" />
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
            <p className="font-display text-2xl font-bold capitalize text-primary">
              {order.priority} — score {order.score}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {order.reasons.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4 space-y-3">
            {breakdown.map((b) => (
              <div key={b.label}>
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {b.label} <span className="text-xs text-muted-foreground">({b.weight * 100}%)</span>
                  </span>
                  <span className="font-mono">{b.points.toFixed(1)} pts</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-secondary">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${b.raw}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{b.note}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Order summary" />
          <StatLine label="Customer" value={order.customer} />
          <StatLine label="Contact" value={order.customerEmail} />
          <StatLine label="Tier" value={<span className="capitalize">{order.customerTier}</span>} />
          <StatLine label="Value" value={money(order.value)} />
          <StatLine label="Created" value={fmtDate(order.createdAt)} />
          <StatLine label="SLA deadline" value={`${fmtDate(order.slaDeadline)} (${fmtRelative(order.slaDeadline)})`} />
          <StatLine label="Allocation" value={<span className="capitalize">{order.allocationStatus}</span>} />
          <StatLine label="Picker" value={order.picker ?? "Unassigned"} />
          <StatLine label="Carrier" value={order.carrier ?? "Not assigned"} />
          <StatLine label="Tracking" value={order.trackingId ?? "—"} />
        </Card>

        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Activity timeline" hint="Every recorded state change on this order" />
          <ol className="relative space-y-4 border-l border-border pl-4">
            {order.timeline.map((t) => (
              <li key={t.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.detail}</p>
                <p className="text-[11px] text-muted-foreground">{fmtDate(t.at)}</p>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Exceptions" hint={`${orderExceptions.length} linked`} />
          {orderExceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exceptions raised on this order.</p>
          ) : (
            <div className="space-y-3">
              {orderExceptions.map((e) => (
                <Link
                  key={e.id}
                  to="/exceptions/$exceptionId"
                  params={{ exceptionId: e.id }}
                  className="block rounded-xl border border-border bg-surface p-3 hover:border-primary/40"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-warning" />
                    <span className="text-sm font-medium">{e.type}</span>
                    <span className="ml-auto"><ExceptionBadge s={e.status} /></span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{e.problem}</p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 xl:col-span-3">
          <SectionTitle title="Decision history" hint="Operator decisions affecting this order" />
          {orderDecisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No operator decisions recorded for this order yet.</p>
          ) : (
            <div className="space-y-2">
              {orderDecisions.map((d) => (
                <div key={d.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{d.decision}</span>
                    <Pill t={d.outcome === "accepted" ? "success" : d.outcome === "modified" ? "warning" : "critical"}>{d.outcome}</Pill>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {d.operator} · {fmtDate(d.at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Reason: {d.reason}</p>
                  <p className="text-xs text-muted-foreground">Result: {d.result}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
