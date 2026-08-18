import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { ArrowLeft, Boxes } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BarSeries } from "@/components/charts";
import { BackLink, EmptyState, PageHeader, SectionTitle, StatLine } from "@/components/shared";
import { InventoryBadge, Pill } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fmtDate, inventoryStatus, money } from "@/lib/engine";
import { seedInventory } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/inventory/$sku")({
  head: ({ params }) => {
    const item = seedInventory().find((i) => i.sku === params.sku);
    const title = item ? `${item.name} (${item.sku}) — SmartFulfill Inventory` : "SKU Detail — SmartFulfill Inventory";
    const description = item
      ? `${item.name}: ${item.available} units available in zone ${item.zone}, bin ${item.bin}, reorder level ${item.reorderLevel}.`
      : "Stock position, bin location, movement history and linked orders for a single SKU.";
    const canonical = `https://swift-resolve-ware.lovable.app/inventory/${params.sku}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: canonical },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: item
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: item.name,
                sku: item.sku,
                category: item.category,
                url: canonical,
                offers: {
                  "@type": "Offer",
                  price: item.unitPrice,
                  priceCurrency: "USD",
                  url: canonical,
                  availability:
                    item.available > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                },
              }),
            },
          ]
        : [],
    };
  },

  component: () => (
    <AppShell role={["admin", "manager"]}>
      <SkuDetail />
    </AppShell>
  ),
});

function SkuDetail() {
  const { sku } = useParams({ from: "/inventory/$sku" });
  const { inventory, orders } = useStore();
  const item = inventory.find((i) => i.sku === sku);

  if (!item) {
    return (
      <EmptyState
        title="SKU not found"
        description={`No inventory record matches ${sku}.`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/inventory">Back to inventory</Link>
          </Button>
        }
      />
    );
  }

  const linked = orders.filter((o) => o.items.some((i) => i.sku === sku));
  const chart = [
    { name: "Available", qty: item.available },
    { name: "Reserved", qty: item.reserved },
    { name: "Damaged", qty: item.damaged },
    { name: "Reorder level", qty: item.reorderLevel },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/inventory">
          <ArrowLeft className="size-4" /> Inventory
        </Link>
      </Button>

      <BackLink to="/inventory" label="Back to inventory" />
      <PageHeader
        accent="info"
        eyebrow={item.sku}
        title={item.name}
        description={`${item.category} · Zone ${item.zone} · Bin ${item.bin}`}
        icon={Boxes}
        actions={<><InventoryBadge s={inventoryStatus(item)} /></>}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <SectionTitle title="Stock position" />
          <StatLine label="Available" value={item.available} tone="success" />
          <StatLine label="Reserved" value={item.reserved} tone="info" />
          <StatLine label="Damaged" value={item.damaged} tone="critical" />
          <StatLine label="Reorder level" value={item.reorderLevel} tone="warning" />
          <StatLine label="Unit price" value={money(item.unitPrice)} />
          <StatLine label="Stock value" value={money(item.unitPrice * item.available)} />
          {item.available <= item.reorderLevel && (
            <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <span className="font-semibold">Replenishment recommended:</span> raise a purchase requisition for{" "}
              {item.reorderLevel * 2} units to cover the next 14 days of demand.
            </p>
          )}
        </Card>

        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Stock composition" hint="Available vs reserved vs damaged vs reorder level" />
          <BarSeries data={chart} x="name" bars={[{ key: "qty", name: "Units" }]} height={240} />
        </Card>

        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Stock movement history" />
          <ol className="relative space-y-4 border-l border-border pl-4">
            {item.movements.slice(0, 10).map((m) => (
              <li key={m.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                <div className="flex flex-wrap items-center gap-2">
                  <Pill t={m.type === "inbound" ? "success" : m.type === "damage" ? "critical" : m.type === "reserve" ? "info" : "neutral"}>{m.type}</Pill>
                  <span className="text-sm font-medium tabular-nums">{m.qty} units</span>
                  <span className="text-[11px] text-muted-foreground">{fmtDate(m.at)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{m.note}</p>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Linked orders" hint={`${linked.length} order(s) reference this SKU`} />
          {linked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open orders reference this SKU.</p>
          ) : (
            <div className="space-y-2">
              {linked.map((o) => (
                <Link
                  key={o.id}
                  to="/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface p-3 text-sm hover:border-primary/40"
                >
                  <span className="font-mono font-semibold">{o.id}</span>
                  <span className="truncate text-muted-foreground">{o.customer}</span>
                  <span className="ml-auto text-xs tabular-nums">{o.items.find((i) => i.sku === sku)?.qty} units</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
