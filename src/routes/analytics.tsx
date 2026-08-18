import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Timer } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { BarSeries, CategoryDonut, ColoredBars, Donut, Gauge, TrendArea, TrendLine } from "@/components/charts";
import { KpiCard, PageHeader, SectionTitle, StatLine, TableShell, Td, Th } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bottleneck } from "@/routes/dashboard";
import { FULFILMENT_TREND, PICK_PERFORMANCE, STAGE_QUEUES, STAGE_TIMES } from "@/lib/mock-data";
import { inventoryStatus } from "@/lib/engine";
import { useStats, useStore } from "@/lib/store";
import { STAGE_LABEL } from "@/lib/types";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Warehouse Analytics — SmartFulfill" },
      { name: "description", content: "Fulfilment trends, stage performance, QC failure rates, exception analysis and automatic bottleneck detection." },
      { property: "og:title", content: "Warehouse Analytics — SmartFulfill" },
      { property: "og:description", content: "Deeper warehouse intelligence with automatic bottleneck detection." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/analytics" }],
  }),
  component: () => (
    <AppShell role={["admin", "manager"]}>
      <Analytics />
    </AppShell>
  ),
});

function Analytics() {
  const { orders, inventory, exceptions } = useStore();
  const stats = useStats();
  const [range, setRange] = useState("7");
  const bn = bottleneck();

  const trend = range === "1" ? FULFILMENT_TREND.slice(-1) : range === "7" ? FULFILMENT_TREND : FULFILMENT_TREND;
  const rangeLabel = range === "1" ? "Today" : range === "7" ? "Last 7 days" : "Last 30 days";

  const stageData = stats.stageCounts.map((s) => ({ stage: STAGE_LABEL[s.stage], count: s.count }));
  const invHealth = (["healthy", "low", "out", "reserved"] as const).map((s, i) => ({
    name: s === "out" ? "Out of stock" : s === "low" ? "Low stock" : s[0]!.toUpperCase() + s.slice(1),
    value: inventory.filter((x) => inventoryStatus(x) === s).length,
    color: ["var(--color-success)", "var(--color-warning)", "var(--color-critical)", "var(--color-info)"][i]!,
  }));
  const movement = FULFILMENT_TREND.map((d, i) => ({ day: d.day, inbound: 120 + i * 9, outbound: 95 + i * 12 }));
  const qcTrend = FULFILMENT_TREND.map((d, i) => ({ day: d.day, failureRate: [4, 3, 7, 2, 6, 3, 4][i] ?? 4 }));
  const excByType = Object.entries(
    exceptions.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.type]: (acc[e.type] ?? 0) + 1 }), {}),
  ).map(([name, count]) => ({ name, count }));

  return (
    <>
      <PageHeader
        accent="warning"
        eyebrow="Intelligence"
        title="Warehouse analytics"
        description="Trends, stage performance and bottleneck analysis across the whole fulfilment operation."
        icon={BarChart3}
        actions={
          <>
          <Tabs value={range} onValueChange={setRange}>
            <TabsList>
              <TabsTrigger value="1">Today</TabsTrigger>
              <TabsTrigger value="7">7 days</TabsTrigger>
              <TabsTrigger value="30">30 days</TabsTrigger>
            </TabsList>
          </Tabs>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Orders over time" hint={`Created vs completed — ${rangeLabel}`} />
          <TrendArea
            data={trend}
            x="day"
            series={[
              { key: "created", name: "Created", color: "var(--color-chart-5)" },
              { key: "completed", name: "Completed", color: "var(--color-chart-2)" },
            ]}
            height={260}
          />
        </Card>

        <Card className="p-5">
          <SectionTitle title="Fulfilment rate" hint="Completed vs total" />
          <TrendLine data={FULFILMENT_TREND} x="day" series={[{ key: "rate", name: "Rate %", color: "var(--color-chart-2)" }]} height={260} />
        </Card>

        <Card className="p-5">
          <SectionTitle title="Inventory health" hint={`${inventory.length} SKUs`} />
          <Donut data={invHealth} height={250} inner={54} />
        </Card>

        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Stock movement" hint="Inbound receipts vs outbound dispatches (units)" />
          <BarSeries
            data={movement}
            x="day"
            bars={[
              { key: "inbound", name: "Inbound", color: "var(--color-chart-2)" },
              { key: "outbound", name: "Outbound", color: "var(--color-chart-1)" },
            ]}
            height={250}
          />
        </Card>

        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Processing time by stage" hint="Actual vs target (minutes)" />
          <BarSeries
            data={STAGE_TIMES}
            x="stage"
            bars={[
              { key: "actual", name: "Actual", color: "var(--color-chart-1)" },
              { key: "target", name: "Target", color: "var(--color-chart-6)" },
            ]}
            height={250}
          />
        </Card>

        <Card className="p-5">
          <SectionTitle title="QC failure rate" hint="Percentage of inspections failed" />
          <TrendLine data={qcTrend} x="day" series={[{ key: "failureRate", name: "Failure %", color: "var(--color-chart-4)" }]} height={250} />
        </Card>

        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Order status distribution" hint="Live workflow position of every order" />
          <ColoredBars data={stageData} x="stage" y="count" height={250} />
        </Card>

        <Card className="p-5">
          <SectionTitle title="Exceptions" hint="By category — count and share of total" />
          <CategoryDonut data={excByType.map((e) => ({ name: e.name, value: e.count }))} height={240} />
        </Card>
      </div>

      <Card className="gap-4 border-critical/40 bg-critical/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-critical">Bottleneck analysis</p>
            <h2 className="font-display text-2xl font-bold">{bn.stage}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Queue {bn.queue} orders · average {bn.actual} min against a {bn.target} min target ({bn.over}% over).
            </p>
            <p className="mt-2 rounded-lg border border-critical/30 bg-critical/10 px-3 py-2 text-sm">
              <span className="font-semibold">Recommendation:</span> {bn.recommendation}
            </p>
          </div>
          <div className="min-w-[220px]">
            <Gauge value={Math.min(100, Math.round((bn.target / bn.actual) * 100))} label="Stage efficiency" height={170} />
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Fulfilment rate" value={`${stats.fulfilmentRate}%`} tone="success" icon={BarChart3} hint={rangeLabel} />
        <KpiCard label="Avg. processing time" value={`${(STAGE_TIMES.reduce((s, x) => s + x.actual, 0) / STAGE_TIMES.length).toFixed(1)}m`} tone="info" icon={Timer} hint="Across all five stages" />
        <KpiCard label="QC failure rate" value="4.1%" tone="warning" icon={BarChart3} hint="Rolling 7-day average" />
        <KpiCard label="Active exceptions" value={stats.activeExceptions} tone="critical" icon={BarChart3} hint={`${exceptions.length} total logged`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-3">
          <SectionTitle title="Picking & packing performance" hint="Per operator, current shift" />
          <TableShell>
            <thead className="border-b border-border bg-surface">
              <tr>
                <Th>Operator</Th>
                <Th>Tasks completed</Th>
                <Th>Average time</Th>
                <Th>Accuracy</Th>
                <Th>Assessment</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PICK_PERFORMANCE.map((p) => (
                <tr key={p.name}>
                  <Td className="font-medium">{p.name}</Td>
                  <Td className="tabular-nums">{p.picks}</Td>
                  <Td className="tabular-nums">{p.avgMin} min</Td>
                  <Td className="tabular-nums">{p.accuracy}%</Td>
                  <Td className="text-xs text-muted-foreground">
                    {p.avgMin > 6 ? "Above target handling time — consider support" : "Within target handling time"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Card>

        <Card className="p-5 xl:col-span-3">
          <SectionTitle title="Stage queues" hint="Where work is waiting right now" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Object.entries(STAGE_QUEUES).map(([stage, count]) => (
              <div key={stage} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs text-muted-foreground">{stage}</p>
                <p className="font-display text-2xl font-bold tabular-nums">{count}</p>
                <StatLine label="Target" value={`${STAGE_TIMES.find((s) => s.stage === stage)?.target ?? "—"} min`} />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              Export view
            </Button>
          </div>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Based on {orders.length} orders, {inventory.length} SKUs and {exceptions.length} logged exceptions in this session.
      </p>
    </>
  );
}
