import { Link, createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader, TableShell, Td, Th } from "@/components/shared";
import { PriorityBadge, RiskBadge, StageBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtRelative, money, slaRisk } from "@/lib/engine";
import { useStore } from "@/lib/store";
import { STAGES, STAGE_LABEL } from "@/lib/types";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Order Management — SmartFulfill" },
      { name: "description", content: "Search, filter and action every warehouse order with priority scores, SLA risk and workflow stage." },
      { property: "og:title", content: "Order Management — SmartFulfill" },
      { property: "og:description", content: "Every order with priority score, SLA risk and current fulfilment stage." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/orders" }],
  }),
  component: () => (
    <AppShell role={["admin", "manager"]}>
      <Orders />
    </AppShell>
  ),
});

function Orders() {
  const { orders } = useStore();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [priority, setPriority] = useState("all");
  const [risk, setRisk] = useState("all");
  const [sort, setSort] = useState("score");

  const rows = useMemo(() => {
    let list = orders.filter((o) => {
      const hay = `${o.id} ${o.customer} ${o.items.map((i) => `${i.sku} ${i.name}`).join(" ")}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (stage !== "all" && o.stage !== stage) return false;
      if (priority !== "all" && o.priority !== priority) return false;
      if (risk !== "all" && slaRisk(o) !== risk) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "score") return b.score - a.score;
      if (sort === "value") return b.value - a.value;
      if (sort === "sla") return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime();
      return a.id.localeCompare(b.id);
    });
    return list;
  }, [orders, q, stage, priority, risk, sort]);

  return (
    <>
      <PageHeader
        accent="primary"
        eyebrow="Fulfilment"
        title="Order management"
        description="Every order in DC-01 with its priority score, SLA risk and current workflow stage."
        icon={ClipboardList}
        actions={
          <>
          <Button asChild size="sm">
            <Link to="/orders/new">
              <Plus className="size-4" /> Create order
            </Link>
          </Button>
          </>
        }
      />

      <Card className="gap-3 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order ID, customer or product…" className="pl-9" />
          </div>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="md:w-[160px]"><SelectValue placeholder="Stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="md:w-[150px]"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger className="md:w-[150px]"><SelectValue placeholder="SLA risk" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All SLA risk</SelectItem>
              <SelectItem value="on_time">On time</SelectItem>
              <SelectItem value="at_risk">At risk</SelectItem>
              <SelectItem value="delayed">Delayed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="md:w-[170px]"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Sort: priority score</SelectItem>
              <SelectItem value="sla">Sort: SLA deadline</SelectItem>
              <SelectItem value="value">Sort: order value</SelectItem>
              <SelectItem value="id">Sort: order ID</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {rows.length} of {orders.length} orders
        </p>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          title="No orders match these filters"
          description="Try clearing the search box or resetting the filters above."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQ("");
                setStage("all");
                setPriority("all");
                setRisk("all");
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <TableShell>
          <thead className="border-b border-border bg-surface">
            <tr>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Items</Th>
              <Th>Value</Th>
              <Th>Priority</Th>
              <Th>SLA deadline</Th>
              <Th>Stage</Th>
              <Th>Risk</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((o) => (
              <tr key={o.id} className="transition-colors hover:bg-accent/40">
                <Td className="font-mono font-semibold">{o.id}</Td>
                <Td>
                  <p>{o.customer}</p>
                  <p className="text-xs capitalize text-muted-foreground">{o.customerTier} tier</p>
                </Td>
                <Td>
                  <p className="text-xs text-muted-foreground">{o.items.length} line(s)</p>
                  <p className="text-xs">{o.items.reduce((s, i) => s + i.qty, 0)} units</p>
                </Td>
                <Td className="tabular-nums">{money(o.value)}</Td>
                <Td><PriorityBadge p={o.priority} score={o.score} /></Td>
                <Td className="whitespace-nowrap text-xs text-muted-foreground">{fmtRelative(o.slaDeadline)}</Td>
                <Td><StageBadge s={o.stage} /></Td>
                <Td><RiskBadge r={slaRisk(o)} /></Td>
                <Td className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/orders/$orderId" params={{ orderId: o.id }}>View order</Link>
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </>
  );
}
