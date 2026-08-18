import { Link, createFileRoute } from "@tanstack/react-router";
import { Coins, PiggyBank, Receipt, TrendingUp } from "lucide-react";
import { useMemo } from "react";

import { AppShell } from "@/components/app-shell";
import { Donut, TrendArea } from "@/components/charts";
import { Insight, KpiCard, MetricMeter, PageHeader, SectionTitle, StatLine, TableShell, Td, Th } from "@/components/shared";
import { Pill } from "@/components/status";
import { Card } from "@/components/ui/card";
import { money } from "@/lib/engine";
import { COST_SPLIT, FINANCE_TREND } from "@/lib/ops-data";
import { financeSummary, pricingIdeas } from "@/lib/ops";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Finance Overview — SmartFulfill" },
      { name: "description", content: "Revenue, fulfilment cost breakdown, profit margin, inventory holding value and revenue-at-risk from delayed orders." },
      { property: "og:title", content: "Finance Overview — SmartFulfill" },
      { property: "og:description", content: "The commercial view of warehouse operations: revenue, cost and margin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/finance" }],
  }),
  component: () => (
    <AppShell role={["admin"]}>
      <Finance />
    </AppShell>
  ),
});

function Finance() {
  const { orders, inventory } = useStore();
  const f = useMemo(() => financeSummary(orders, inventory), [orders, inventory]);
  const prices = useMemo(() => pricingIdeas(inventory), [inventory]);

  const atRisk = orders.filter((o) => o.stage !== "completed" && o.priority === "critical");
  const riskValue = atRisk.reduce((s, o) => s + o.value, 0);
  const topCustomers = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => map.set(o.customer, (map.get(o.customer) ?? 0) + o.value));
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [orders]);

  const costs = [
    { name: "Inventory", value: f.inventoryCost },
    { name: "Labour", value: f.labour },
    { name: "Shipping", value: f.shipping },
    { name: "Packaging", value: f.packaging },
  ];

  return (
    <>
      <PageHeader
        accent="warning"
        eyebrow="Commercial view"
        title="Finance overview"
        description="How operational performance converts into revenue, cost and margin — including the money currently exposed by delayed orders."
        icon={Coins}
      />


      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Revenue versus cost" hint="Rolling seven-day view" />
          <TrendArea
            data={FINANCE_TREND}
            x="day"
            series={[
              { key: "revenue", name: "Revenue", color: "var(--color-chart-2)" },
              { key: "cost", name: "Cost", color: "var(--color-chart-4)" },
            ]}
            height={280}
          />
          <div className="mt-3">
            <Insight text={`Margin is holding at ${f.margin}%. Inventory is ${Math.round((f.inventoryCost / Math.max(1, f.cost)) * 100)}% of total fulfilment cost — the largest lever.`} to="/inventory-anomalies" />
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Cost breakdown" hint="Where the money goes" />
          <Donut data={costs.map((c, i) => ({ ...c, color: `var(--color-chart-${i + 1})` }))} height={230} />
          <div className="mt-2">
            {COST_SPLIT.map((c) => (
              <StatLine key={c.name} label={`${c.name} share (period)`} value={`${c.value}%`} />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue (fulfilled)" value={money(f.revenue)} tone="success" icon={TrendingUp} />
        <KpiCard label="Fulfilment cost" value={money(f.cost)} hint="Inventory, labour, shipping, packaging" tone="warning" icon={Receipt} />
        <KpiCard label="Profit" value={money(f.profit)} hint={`${f.margin}% margin`} tone="primary" icon={PiggyBank} />
        <KpiCard label="Revenue at risk" value={money(riskValue)} hint={`${atRisk.length} critical order(s)`} tone="critical" icon={Coins} to="/orders" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <SectionTitle title="Financial health" hint="Against internal targets" />
          <div className="space-y-4">
            <MetricMeter label="Gross margin" value={f.margin} target={40} />
            <MetricMeter label="Cost per order" value={Math.round(f.cost / Math.max(1, orders.filter((o) => o.stage === "completed").length))} target={220} suffix="" />
            <MetricMeter label="Order value fulfilled" value={Math.round((f.revenue / Math.max(1, orders.reduce((s, o) => s + o.value, 0))) * 100)} target={70} />
          </div>
          <StatLine label="Inventory holding value" value={money(f.holding)} tone="info" />
        </Card>

        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Revenue by customer" hint="Total order value booked per account" />
          <TableShell>
            <thead className="border-b border-border bg-surface">
              <tr>
                <Th>Customer</Th>
                <Th>Orders</Th>
                <Th>Total value</Th>
                <Th>Share</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topCustomers.map((c) => {
                const count = orders.filter((o) => o.customer === c.name).length;
                const share = Math.round((c.value / Math.max(1, orders.reduce((s, o) => s + o.value, 0))) * 100);
                return (
                  <tr key={c.name}>
                    <Td className="font-medium">{c.name}</Td>
                    <Td className="tabular-nums">{count}</Td>
                    <Td className="font-semibold tabular-nums">{money(c.value)}</Td>
                    <Td><Pill t={share >= 20 ? "success" : "info"}>{share}%</Pill></Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle title="Pricing opportunities" hint="Projected revenue if the suggested price is applied" />
        <TableShell>
          <thead className="border-b border-border bg-surface">
            <tr>
              <Th>SKU</Th>
              <Th>Product</Th>
              <Th>Current</Th>
              <Th>Suggested</Th>
              <Th>Action</Th>
              <Th>Projected revenue</Th>
              <Th>Projected margin</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {prices.map((p) => (
              <tr key={p.sku}>
                <Td>
                  <Link to="/inventory/$sku" params={{ sku: p.sku }} className="font-mono text-xs text-primary hover:underline">{p.sku}</Link>
                </Td>
                <Td className="text-sm">{p.name}</Td>
                <Td className="tabular-nums text-sm">{money(p.price)}</Td>
                <Td className="font-semibold tabular-nums">{money(p.suggested)}</Td>
                <Td><Pill t={p.action === "Increase" ? "success" : p.action === "Decrease" ? "warning" : "neutral"}>{p.action}</Pill></Td>
                <Td className="tabular-nums">{money(p.projectedRevenue)}</Td>
                <Td className="tabular-nums">{p.projectedMargin}%</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Card>
    </>
  );
}
