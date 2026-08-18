import { Link, createFileRoute } from "@tanstack/react-router";
import { Rocket, Truck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, PageHeader, PipelineStrip, SectionTitle, TableShell, Td, Th } from "@/components/shared";
import { Pill, RiskBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtRelative, slaRisk } from "@/lib/engine";
import { CARRIERS } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import type { Order, Role } from "@/lib/types";

export const Route = createFileRoute("/dispatch")({
  head: () => ({
    meta: [
      { title: "Dispatch Control — SmartFulfill" },
      { name: "description", content: "Carrier assignment, SLA risk triage and dispatch confirmation with automatic inventory reconciliation." },
      { property: "og:title", content: "Dispatch Control — SmartFulfill" },
      { property: "og:description", content: "Ready, at-risk, delayed and dispatched orders in one queue." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/dispatch" }],
  }),
  component: DispatchRoute,
});

function DispatchRoute() {
  const { user } = useStore();
  const role: Role[] = user?.role === "worker" ? ["worker"] : ["admin", "manager"];
  return (
    <AppShell role={role}>
      <Dispatch />
    </AppShell>
  );
}

function Dispatch() {
  const { orders, assignCarrier, prioritiseDispatch, markDispatched } = useStore();

  const queue = orders.filter((o) => o.stage === "dispatch");
  const ready = queue.filter((o) => slaRisk(o) === "on_time");
  const atRisk = queue.filter((o) => slaRisk(o) === "at_risk");
  const delayed = queue.filter((o) => slaRisk(o) === "delayed");
  const dispatched = orders.filter((o) => o.stage === "completed");

  const Section = ({ title, list, tone }: { title: string; list: Order[]; tone: "success" | "warning" | "critical" }) => (
    <Card className="p-5">
      <SectionTitle title={title} hint={`${list.length} order(s)`} right={<Pill t={tone}>{list.length}</Pill>} />
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing in this bucket.</p>
      ) : (
        <TableShell>
          <thead className="border-b border-border bg-surface">
            <tr>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Package</Th>
              <Th>Carrier</Th>
              <Th>Tracking</Th>
              <Th>Deadline</Th>
              <Th>Risk</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((o) => {
              const units = o.items.reduce((s, i) => s + i.qty, 0);
              return (
                <tr key={o.id} className="transition-colors hover:bg-accent/40">
                  <Td>
                    <Link to="/orders/$orderId" params={{ orderId: o.id }} className="font-mono font-semibold hover:text-primary">
                      {o.id}
                    </Link>
                    {o.dispatchPriority && <Pill t="primary" className="ml-2">Priority</Pill>}
                  </Td>
                  <Td>{o.customer}</Td>
                  <Td className="text-xs text-muted-foreground">{units} units · {(units * 0.42 + 0.3).toFixed(2)} kg</Td>
                  <Td>
                    <Select value={o.carrier ?? ""} onValueChange={(v) => assignCarrier(o.id, v)}>
                      <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Assign carrier" /></SelectTrigger>
                      <SelectContent>
                        {CARRIERS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Td>
                  <Td className="font-mono text-xs">{o.trackingId ?? "—"}</Td>
                  <Td className="text-xs text-muted-foreground">{fmtRelative(o.slaDeadline)}</Td>
                  <Td><RiskBadge r={slaRisk(o)} /></Td>
                  <Td>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {!o.dispatchPriority && (
                        <Button size="sm" variant="outline" onClick={() => prioritiseDispatch(o.id)}>
                          <Rocket className="size-3.5" /> Prioritise
                        </Button>
                      )}
                      <Button size="sm" disabled={!o.carrier} onClick={() => markDispatched(o.id)}>
                        <Truck className="size-3.5" /> Mark dispatched
                      </Button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}
    </Card>
  );

  return (
    <>
      <PageHeader
        accent="success"
        eyebrow="Outbound"
        title="Dispatch"
        description="Assign carriers, clear SLA risk and confirm handover. Dispatching an order reconciles reserved inventory automatically."
        icon={Truck}
      />

      <PipelineStrip current="/dispatch" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ready" value={ready.length} tone="success" icon={Truck} hint="Within SLA" />
        <KpiCard label="At risk" value={atRisk.length} tone="warning" icon={Rocket} hint="Under 8h to deadline" />
        <KpiCard label="Delayed" value={delayed.length} tone="critical" icon={Rocket} hint="SLA already breached" />
        <KpiCard label="Dispatched" value={dispatched.length} tone="info" icon={Truck} hint="Completed fulfilments" />
      </div>

      {queue.length === 0 && (
        <EmptyState
          title="Dispatch queue is empty"
          description="Approve an order at quality check to move it into dispatch."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/quality-check">Go to quality check</Link>
            </Button>
          }
        />
      )}

      {delayed.length > 0 && <Section title="Delayed" list={delayed} tone="critical" />}
      {atRisk.length > 0 && <Section title="At risk" list={atRisk} tone="warning" />}
      {ready.length > 0 && <Section title="Ready" list={ready} tone="success" />}

      <Card className="p-5">
        <SectionTitle title="Dispatched" hint="Completed fulfilments with carrier and tracking" />
        {dispatched.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders dispatched yet.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {dispatched.map((o) => (
              <Link key={o.id} to="/orders/$orderId" params={{ orderId: o.id }} className="rounded-lg border border-border bg-surface p-3 text-sm hover:border-primary/40">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{o.id}</span>
                  <Pill t="success" className="ml-auto">Completed</Pill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {o.customer} · {o.carrier ?? "carrier"} · {o.trackingId ?? "—"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
