import { Link, createFileRoute } from "@tanstack/react-router";
import { Boxes, Radar, TrendingUp, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ColoredBars, Donut } from "@/components/charts";
import { EmptyState, Insight, KpiCard, MetricMeter, PageHeader, SectionTitle, TableShell, Td, Th } from "@/components/shared";
import { Pill, SeverityBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money } from "@/lib/engine";
import { detectAnomalies, discrepancyByZone, inventoryAccuracy, pricingIdeas, type Anomaly } from "@/lib/ops";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/inventory-anomalies")({
  head: () => ({
    meta: [
      { title: "Inventory Intelligence — SmartFulfill" },
      { name: "description", content: "Detect stock mismatches, damage patterns, demand spikes and slow-moving inventory, with recommended corrective actions and pricing signals." },
      { property: "og:title", content: "Inventory Intelligence — SmartFulfill" },
      { property: "og:description", content: "Anomaly detection and pricing signals across the whole catalogue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/inventory-anomalies" }],
  }),
  component: () => (
    <AppShell role={["admin", "manager"]}>
      <InventoryAnomalies />
    </AppShell>
  ),
});

const RANK = { critical: 0, high: 1, medium: 2, low: 3 } as const;
const key = (a: Anomaly) => `${a.sku}-${a.type}`;

function InventoryAnomalies() {
  const { inventory } = useStore();
  const [risk, setRisk] = useState("all");
  const [type, setType] = useState("all");
  const [actioned, setActioned] = useState<string[]>([]);

  const anomalies = useMemo(() => detectAnomalies(inventory), [inventory]);
  const accuracy = useMemo(() => inventoryAccuracy(inventory), [inventory]);
  const zones = useMemo(() => discrepancyByZone(anomalies), [anomalies]);
  const prices = useMemo(() => pricingIdeas(inventory), [inventory]);

  const types = [...new Set(anomalies.map((a) => a.type))];

  const visible = useMemo(
    () =>
      anomalies
        .filter((a) => !actioned.includes(key(a)))
        .filter((a) => (risk === "all" || a.risk === risk) && (type === "all" || a.type === type))
        .sort((a, b) => RANK[a.risk] - RANK[b.risk]),
    [anomalies, actioned, risk, type],
  );

  const critical = visible.filter((a) => a.risk === "critical").length;
  const damageFree = Math.round(
    (inventory.filter((i) => i.damaged === 0).length / Math.max(1, inventory.length)) * 100,
  );
  const holding = inventory.reduce((s, i) => s + i.available * i.unitPrice, 0);
  const hottestZone = [...zones].sort((a, b) => b.value - a.value)[0];

  return (
    <>
      <PageHeader
        accent="critical"
        eyebrow="Inventory intelligence"
        title="Anomaly detection"
        description="Continuous rule-based checks across stock counts, damage rates, demand movement and dead stock — each one paired with a corrective action."
        icon={Radar}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open anomalies" value={visible.length} tone="warning" icon={Radar} />
        <KpiCard label="Critical risk" value={critical} tone="critical" icon={Wrench} />
        <KpiCard label="Inventory accuracy" value={`${accuracy}%`} hint="System count vs physical cycle count" tone={accuracy >= 97 ? "success" : "warning"} icon={Boxes} />
        <KpiCard label="Holding value" value={money(holding)} tone="info" icon={TrendingUp} to="/finance" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <SectionTitle title="Accuracy health" hint="Counting and condition quality" />
          <div className="space-y-4">
            <MetricMeter label="Inventory accuracy" value={accuracy} target={98} />
            <MetricMeter label="Damage-free SKUs" value={damageFree} target={97} />
            <MetricMeter
              label="SKUs above reorder level"
              value={Math.round((inventory.filter((i) => i.available > i.reorderLevel).length / Math.max(1, inventory.length)) * 100)}
              target={90}
            />
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Discrepancy units by zone" hint="Where counting errors concentrate" />
          <ColoredBars data={zones} x="name" y="value" height={220} />
          {hottestZone && hottestZone.value > 0 && (
            <Insight text={`${hottestZone.name} carries the largest count gap (${hottestZone.value} units) — schedule a full cycle count there first.`} to="/warehouse-operations" />
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle title="Anomaly mix" hint="Detected issues by type" />
          <Donut
            data={types.map((t, i) => ({
              name: t,
              value: anomalies.filter((a) => a.type === t).length,
              color: `var(--color-chart-${(i % 6) + 1})`,
            }))}
            height={220}
          />
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Detected anomalies"
          hint="Review the evidence, then apply or dismiss the recommended action"
          right={
            <div className="flex gap-2">
              <Select value={risk} onValueChange={setRisk}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All risk levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        {visible.length === 0 ? (
          <EmptyState
            title="No anomalies outstanding"
            description="Every detected inventory anomaly has been actioned. New ones surface automatically as counts and demand shift."
            action={<Button asChild size="sm" variant="outline"><Link to="/inventory">Go to inventory</Link></Button>}
          />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {visible.map((a) => (
              <div key={key(a)} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge s={a.risk} />
                  <Pill t="info">{a.type}</Pill>
                  <Link to="/inventory/$sku" params={{ sku: a.sku }} className="font-mono text-xs text-primary hover:underline">
                    {a.sku}
                  </Link>
                  <span className="font-mono text-[11px] text-muted-foreground">Zone {a.zone} · {a.bin}</span>
                </div>
                <h3 className="mt-2 font-display text-base font-bold">{a.name}</h3>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <Metric label="System" value={a.expected} />
                  <Metric label="Physical" value={a.physical} />
                  <Metric label="Difference" value={`${a.difference > 0 ? "+" : ""}${a.difference}`} tone={a.difference === 0 ? "" : a.difference < 0 ? "text-critical" : "text-warning"} />
                </div>
                <div className="mt-3 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Recommended action</p>
                  <p className="mt-1">{a.recommendation}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setActioned((p) => [...p, key(a)]);
                      toast.success(`Action applied to ${a.sku}`, { description: a.recommendation });
                    }}
                  >
                    Apply action
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/inventory/$sku" params={{ sku: a.sku }}>Open SKU</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setActioned((p) => [...p, key(a)])}>Dismiss</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <SectionTitle title="Pricing and demand signals" hint="Suggested adjustments based on demand movement and stock cover" />
        <TableShell>
          <thead className="border-b border-border bg-surface">
            <tr>
              <Th>SKU</Th>
              <Th>Product</Th>
              <Th>Demand</Th>
              <Th>On hand</Th>
              <Th>Current</Th>
              <Th>Suggested</Th>
              <Th>Action</Th>
              <Th>Rationale</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {prices.map((p) => (
              <tr key={p.sku}>
                <Td>
                  <Link to="/inventory/$sku" params={{ sku: p.sku }} className="font-mono text-xs text-primary hover:underline">{p.sku}</Link>
                </Td>
                <Td className="text-sm">{p.name}</Td>
                <Td>
                  <Pill t={p.demandChange >= 0 ? "success" : "critical"}>{p.demandChange >= 0 ? "+" : ""}{p.demandChange}%</Pill>
                </Td>
                <Td className="tabular-nums text-sm">{p.stock}</Td>
                <Td className="tabular-nums text-sm">{money(p.price)}</Td>
                <Td className="font-semibold tabular-nums">{money(p.suggested)}</Td>
                <Td>
                  <Pill t={p.action === "Increase" ? "success" : p.action === "Decrease" ? "warning" : "neutral"}>{p.action}</Pill>
                </Td>
                <Td className="max-w-[300px] text-xs text-muted-foreground">{p.why}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
        {prices.length > 0 && (
          <div className="mt-3">
            <Insight text={`${prices.filter((p) => p.action !== "Maintain").length} SKU(s) justify a price move; the rest are stable on both demand and cover.`} />
          </div>
        )}
      </Card>
    </>
  );
}

function Metric({ label, value, tone = "" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-display text-lg font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
