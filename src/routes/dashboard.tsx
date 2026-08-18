import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Brain,
  ClipboardList,
  Flame,
  Gauge as GaugeIcon,
  LayoutDashboard,
  PackageX,
  Truck,
} from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { BarSeries, ChartLegend, Donut, FlowFunnel, Gauge, TrendArea } from "@/components/charts";
import { EmptyState, ImpactPanel, KpiCard, PageHeader, SectionTitle, StatLine, WorkflowProgress } from "@/components/shared";

import { PriorityBadge, StageBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtRelative, inventoryStatus } from "@/lib/engine";
import { FULFILMENT_TREND, STAGE_QUEUES, STAGE_TIMES, WEEKLY_TREND } from "@/lib/mock-data";
import { useStats, useStore } from "@/lib/store";
import { warehouseHealth } from "@/lib/ops";
import { STAGE_LABEL } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Operations Dashboard — SmartFulfill" },
      { name: "description", content: "Live warehouse command center: order flow, inventory health, bottlenecks and SLA risk in one view." },
      { property: "og:title", content: "Operations Dashboard — SmartFulfill" },
      { property: "og:description", content: "Live warehouse command center with order flow, inventory health and bottleneck detection." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/dashboard" }],
  }),
  component: () => (
    <AppShell role={["admin", "manager"]}>
      <Dashboard />
    </AppShell>
  ),
});

export function bottleneck() {
  const worst = [...STAGE_TIMES].sort((a, b) => b.actual / b.target - a.actual / a.target)[0]!;
  return {
    ...worst,
    queue: STAGE_QUEUES[worst.stage] ?? 0,
    over: Math.round((worst.actual / worst.target - 1) * 100),
    recommendation:
      worst.stage === "Packing"
        ? "Open an additional packing station and reassign one picker from Zone C."
        : `Add capacity to ${worst.stage} — the stage is running above its target handling time.`,
  };
}

function Dashboard() {
  const { orders, inventory, decisions, activity, exceptions } = useStore();
  const stats = useStats();
  const [progressRange, setProgressRange] = useState("daily");

  const progressData = progressRange === "weekly" ? WEEKLY_TREND : FULFILMENT_TREND;
  const avgCompleted = Math.round(progressData.reduce((s, d) => s + d.completed, 0) / progressData.length);
  const avgRate = Math.round(progressData.reduce((s, d) => s + d.rate, 0) / progressData.length);

  const inProgressPct = Math.round((stats.inProgress / Math.max(1, stats.total)) * 100);
  const bn = bottleneck();
  const health = warehouseHealth(orders, inventory, exceptions);
  const topDecision =
    [...decisions].sort((a, b) => (a.severity === "critical" ? -1 : 0) - (b.severity === "critical" ? -1 : 0))[0] ?? null;

  const stageData = stats.stageCounts.map((s) => ({ stage: STAGE_LABEL[s.stage], count: s.count }));
  const priorityData = (["critical", "high", "normal", "low"] as const).map((p, i) => ({
    name: p[0]!.toUpperCase() + p.slice(1),
    value: orders.filter((o) => o.priority === p).length,
    color: ["var(--color-critical)", "var(--color-warning)", "var(--color-info)", "var(--color-chart-6)"][i]!,
  }));
  const invHealth = (["healthy", "low", "out", "reserved", "damaged"] as const).map((s, i) => ({
    name: s === "out" ? "Out of stock" : s === "low" ? "Low stock" : s[0]!.toUpperCase() + s.slice(1),
    value: s === "damaged" ? inventory.filter((x) => x.damaged > 0).length : inventory.filter((x) => inventoryStatus(x) === s).length,
    color: ["var(--color-success)", "var(--color-warning)", "var(--color-critical)", "var(--color-info)", "var(--color-chart-5)"][i]!,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Control room"
        title="Operations dashboard"
        description="Everything moving through DC-01 right now — order flow, inventory health, decision load and stage performance."
        icon={LayoutDashboard}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/decision-center">
                <Brain className="size-4" /> Decision center ({decisions.length})
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/orders/new">
                <ClipboardList className="size-4" /> Create order
              </Link>
            </Button>
          </>
        }
      />

      {/* Judge-first briefing: health → problem → evidence → recommendation → action */}
      <Card className="gap-4 p-5">
        <SectionTitle title="Warehouse status" hint="Health now vs target, and the single most critical problem to act on" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,260px)_1fr]">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Overall health</p>
            <p className="font-display text-4xl font-bold tabular-nums">{health.score}%</p>
            <p className="text-xs text-muted-foreground">Target 95% · weakest area: {health.weakest.label}</p>
            <div className="mt-3 space-y-2">
              {health.parts.map((p) => (
                <div key={p.label}>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{p.label}</span>
                    <span className="font-mono font-semibold">
                      {p.value}% <span className="text-muted-foreground">/ {p.target}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-secondary">
                    <div
                      className={`h-1.5 rounded-full ${p.value >= p.target ? "bg-success" : p.value >= p.target * 0.85 ? "bg-warning" : "bg-critical"}`}
                      style={{ width: `${Math.min(100, p.value)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-critical/40 bg-critical/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-critical">Top problem</p>
              <h2 className="font-display text-xl font-bold">
                {topDecision ? topDecision.title : `${bn.stage} is running ${bn.over}% over target`}
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Evidence</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {(topDecision?.context ?? [
                    `${bn.stage} queue: ${bn.queue} orders`,
                    `Average handling ${bn.actual} min vs ${bn.target} min target`,
                  ]).slice(0, 3).map((c) => (
                    <li key={c}>• {c}</li>
                  ))}
                  <li>• {stats.atRisk} order(s) at SLA risk · {stats.activeExceptions} active exception(s)</li>
                </ul>
              </div>
              <div className="rounded-xl border border-decision/40 bg-decision/10 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-decision">Recommendation</p>
                <p className="mt-1 text-sm">{topDecision?.recommendation ?? bn.recommendation}</p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-success">Expected impact</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {topDecision?.expectedResult ?? "Restoring capacity at the constraint reduces SLA risk and lifts the fulfilment rate."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to="/decision-center">
                  <Brain className="size-4" /> Act on this decision
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/workforce">Rebalance workforce</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link to="/analytics">
                  Measured impact <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <ImpactPanel />

      {/* Fulfilment flow */}
      <Card className="p-5">
        <SectionTitle title="Fulfilment flow" hint="Active orders at every stage — the most congested stage is highlighted" />
        <FlowFunnel steps={stageData.map((s) => ({ stage: s.stage, count: s.count }))} hotExclude={["Completed", "Created"]} hotStage={bn.stage} />
      </Card>

      {/* Total progress */}

      <Card className="p-5">
        <SectionTitle
          title="Total progress"
          hint="Overall fulfilment completion and throughput over time"
          right={
            <Tabs value={progressRange} onValueChange={setProgressRange}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,300px)_1fr]">
          <div className="space-y-4">
            <div>
              <div className="flex items-end justify-between">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Orders completed</span>
                <span className="font-mono text-2xl font-semibold">{stats.fulfilmentRate}%</span>
              </div>
              <Progress value={stats.fulfilmentRate} className="mt-2 h-2" />
              <p className="mt-1 text-xs text-muted-foreground">
                {orders.filter((o) => o.stage === "completed").length} of {stats.total} orders fulfilled
              </p>
            </div>
            <div>
              <div className="flex items-end justify-between">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">In progress</span>
                <span className="font-mono text-2xl font-semibold">{inProgressPct}%</span>
              </div>
              <Progress value={inProgressPct} className="mt-2 h-2" />
              <p className="mt-1 text-xs text-muted-foreground">{stats.inProgress} orders moving through the workflow</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-lg border border-border/60 p-3">
                <div className="text-xs text-muted-foreground">{progressRange === "daily" ? "Avg / day" : "Avg / week"}</div>
                <div className="font-mono text-lg font-semibold">{avgCompleted}</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <div className="text-xs text-muted-foreground">Completion rate</div>
                <div className="font-mono text-lg font-semibold">{avgRate}%</div>
              </div>
            </div>
          </div>
          <div>
            <TrendArea
              data={progressData}
              x="day"
              series={[
                { key: "created", name: "Created", color: "var(--color-chart-5)" },
                { key: "completed", name: "Completed", color: "var(--color-chart-2)" },
              ]}
              height={240}
            />
            <ChartLegend
              items={[
                { name: "Created", value: progressData.reduce((s, d) => s + d.created, 0), color: "var(--color-chart-5)" },
                { name: "Completed", value: progressData.reduce((s, d) => s + d.completed, 0), color: "var(--color-chart-2)" },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Charts */}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <SectionTitle title="Orders by priority" hint="Rule-based priority scoring" />
          <Donut data={priorityData} height={270} />
        </Card>

        <Card className="p-5 xl:col-span-2">
          <SectionTitle
            title="Processing time by stage"
            hint="Actual vs target handling time (minutes)"
            right={
              <Button asChild variant="ghost" size="sm">
                <Link to="/analytics">
                  Bottleneck analysis <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          />
          <BarSeries
            data={STAGE_TIMES}
            x="stage"
            bars={[
              { key: "actual", name: "Actual", color: "var(--color-chart-1)" },
              { key: "target", name: "Target", color: "var(--color-chart-6)" },
            ]}
            height={230}
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {STAGE_TIMES.map((s) => {
              const ratio = s.actual / s.target;
              return (
                <div key={s.stage} className="rounded-lg border border-border bg-surface p-2.5">
                  <p className="truncate text-[11px] text-muted-foreground">{s.stage}</p>
                  <p className="font-display text-base font-bold tabular-nums">{s.actual}m</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-secondary">
                    <div
                      className={ratio > 1 ? "h-1.5 rounded-full bg-critical" : "h-1.5 rounded-full bg-success"}
                      style={{ width: `${Math.min(100, (s.actual / (s.target * 2)) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Queue {STAGE_QUEUES[s.stage]} · target {s.target}m</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Inventory health" hint={`${inventory.length} SKUs across 3 zones`} />
          <Donut data={invHealth} height={260} inner={54} />
        </Card>

        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Fulfilment health" hint="Completed vs total in the current window" />
          <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_1fr] md:items-center">
            <Gauge value={stats.fulfilmentRate} label="Fulfilment rate" height={220} />
            <div>
              <StatLine label="On-time dispatch" value="92%" tone="success" />
              <StatLine label="QC pass rate" value="96%" tone="info" />
              <StatLine label="Orders at SLA risk" value={stats.atRisk} tone="warning" />
              <StatLine label={`${bn.stage} over target`} value={`${bn.over}%`} tone="critical" />
            </div>
          </div>
        </Card>
      </div>


      {/* Priority queue + activity */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Priority order queue" hint="Highest scoring open orders first" right={
            <Button asChild variant="ghost" size="sm">
              <Link to="/orders">
                All orders <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          } />
          <div className="space-y-3">
            {orders
              .filter((o) => o.stage !== "completed")
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map((o) => (
                <Link
                  key={o.id}
                  to="/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="block rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{o.id}</span>
                    <span className="text-sm text-muted-foreground">{o.customer}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <PriorityBadge p={o.priority} score={o.score} />
                      <StageBadge s={o.stage} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <WorkflowProgress stage={o.stage} compact />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">SLA {fmtRelative(o.slaDeadline)} · {o.items.length} line(s)</p>
                </Link>
              ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Activity timeline" hint="Every state change, in order" right={
            <Button asChild variant="ghost" size="sm">
              <Link to="/activity">
                <Activity className="size-3.5" />
              </Link>
            </Button>
          } />
          {activity.length === 0 ? (
            <EmptyState title="No activity yet" description="Actions you take will appear here." />
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-4">
              {activity.slice(0, 8).map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                  <p className="text-sm font-medium">{a.event}</p>
                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {a.actor} · {fmtRelative(a.at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* KPI summary */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total orders" value={stats.total} hint={`${stats.inProgress} in progress`} icon={ClipboardList} to="/orders" />
        <KpiCard label="Critical orders" value={stats.critical} hint="Highest priority band" tone="critical" icon={Flame} to="/orders" />
        <KpiCard label="Ready for dispatch" value={stats.readyDispatch} hint={`${stats.atRisk} orders at SLA risk`} tone="info" icon={Truck} to="/dispatch" />
        <KpiCard label="Fulfilment rate" value={`${stats.fulfilmentRate}%`} hint="Completed vs total orders" tone="success" icon={GaugeIcon} to="/analytics" />
        <KpiCard label="Low stock SKUs" value={stats.lowStock} hint="At or below reorder level" tone="warning" icon={Boxes} to="/inventory" />
        <KpiCard label="Out of stock SKUs" value={stats.outOfStock} hint="Replenishment required" tone="critical" icon={PackageX} to="/inventory" />
        <KpiCard label="Active exceptions" value={stats.activeExceptions} hint="Open, investigating or escalated" tone="warning" icon={AlertTriangle} to="/exceptions" />
        <KpiCard label="Pending decisions" value={decisions.length} hint="Awaiting operator action" tone="primary" icon={Brain} to="/decision-center" />
      </div>
    </>
  );
}
