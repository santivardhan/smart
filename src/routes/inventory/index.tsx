import { Link, createFileRoute } from "@tanstack/react-router";
import { Boxes, RefreshCcw, Search, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Donut } from "@/components/charts";
import { EmptyState, PageHeader, SectionTitle, TableShell, Td, Th } from "@/components/shared";
import { InventoryBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inventoryStatus, money } from "@/lib/engine";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/inventory/")({
  head: () => ({
    meta: [
      { title: "Inventory Control — SmartFulfill" },
      { name: "description", content: "SKU-level stock health across zones and bins with automatic replenishment recommendations." },
      { property: "og:title", content: "Inventory Control — SmartFulfill" },
      { property: "og:description", content: "Available, reserved and damaged stock with reorder-level detection." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/inventory" }],
  }),
  component: () => (
    <AppShell role={["admin", "manager"]}>
      <Inventory />
    </AppShell>
  ),
});

function Inventory() {
  const { inventory, resolveDecision, decisions } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [zone, setZone] = useState("all");
  const [sort, setSort] = useState("status");

  const rows = useMemo(() => {
    const list = inventory.filter((i) => {
      const hay = `${i.sku} ${i.name} ${i.category} ${i.bin}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (status !== "all" && inventoryStatus(i) !== status) return false;
      if (zone !== "all" && i.zone !== zone) return false;
      return true;
    });
    const rank = { out: 0, low: 1, damaged: 2, reserved: 3, healthy: 4 } as const;
    return [...list].sort((a, b) => {
      if (sort === "status") return rank[inventoryStatus(a)] - rank[inventoryStatus(b)];
      if (sort === "available") return a.available - b.available;
      if (sort === "value") return b.available * b.unitPrice - a.available * a.unitPrice;
      return a.sku.localeCompare(b.sku);
    });
  }, [inventory, q, status, zone, sort]);

  const replenish = inventory.filter((i) => i.available <= i.reorderLevel);
  const replenishDecision = decisions.find((d) => d.kind === "replenishment");

  const health = (["healthy", "low", "out", "reserved"] as const).map((s, i) => ({
    name: s === "out" ? "Out of stock" : s === "low" ? "Low stock" : s[0]!.toUpperCase() + s.slice(1),
    value: inventory.filter((x) => inventoryStatus(x) === s).length,
    color: ["var(--color-success)", "var(--color-warning)", "var(--color-critical)", "var(--color-info)"][i]!,
  }));

  return (
    <>
      <PageHeader
        accent="info"
        eyebrow="Stock control"
        title="Inventory"
        description="Live stock positions by zone and bin, with automatic replenishment detection at reorder level."
        icon={Boxes}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <SectionTitle title="Inventory health" hint={`${inventory.length} SKUs`} />
          <Donut data={health} height={230} inner={54} />
        </Card>

        <Card className="border-warning/40 bg-warning/5 p-5 xl:col-span-2">
          <SectionTitle
            title="Replenishment recommendation"
            hint="Triggered automatically when available stock ≤ reorder level"
            right={
              replenishDecision ? (
                <Button size="sm" onClick={() => resolveDecision(replenishDecision.id, "accept")}>
                  <RefreshCcw className="size-4" /> Approve replenishment
                </Button>
              ) : undefined
            }
          />
          {replenish.length === 0 ? (
            <p className="text-sm text-muted-foreground">All SKUs are above their reorder level.</p>
          ) : (
            <ul className="space-y-2">
              {replenish.map((i) => (
                <li key={i.sku} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
                  <TriangleAlert className="size-4 text-warning" />
                  <span className="font-mono">{i.sku}</span>
                  <span className="text-muted-foreground">{i.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    On hand {i.available} · reorder {i.reorderLevel} · suggest order {i.reorderLevel * 2}
                  </span>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/inventory/$sku" params={{ sku: i.sku }}>Detail</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="gap-3 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SKU, product, category or bin…" className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
              <SelectItem value="low">Low stock</SelectItem>
              <SelectItem value="out">Out of stock</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="damaged">Damaged</SelectItem>
            </SelectContent>
          </Select>
          <Select value={zone} onValueChange={setZone}>
            <SelectTrigger className="md:w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All zones</SelectItem>
              <SelectItem value="A">Zone A</SelectItem>
              <SelectItem value="B">Zone B</SelectItem>
              <SelectItem value="C">Zone C</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="md:w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Sort: risk first</SelectItem>
              <SelectItem value="available">Sort: lowest stock</SelectItem>
              <SelectItem value="value">Sort: stock value</SelectItem>
              <SelectItem value="sku">Sort: SKU</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">Showing {rows.length} of {inventory.length} SKUs</p>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="No SKUs match" description="Adjust the filters to see stock again." />
      ) : (
        <TableShell>
          <thead className="border-b border-border bg-surface">
            <tr>
              <Th>SKU</Th>
              <Th>Product</Th>
              <Th>Category</Th>
              <Th>Zone / Bin</Th>
              <Th>Available</Th>
              <Th>Reserved</Th>
              <Th>Damaged</Th>
              <Th>Reorder</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((i) => (
              <tr key={i.sku} className="transition-colors hover:bg-accent/40">
                <Td className="font-mono font-semibold">{i.sku}</Td>
                <Td>
                  <p>{i.name}</p>
                  <p className="text-xs text-muted-foreground">{money(i.unitPrice)} / unit</p>
                </Td>
                <Td className="text-muted-foreground">{i.category}</Td>
                <Td className="font-mono text-xs">Zone {i.zone} · {i.bin}</Td>
                <Td className="tabular-nums font-semibold">{i.available}</Td>
                <Td className="tabular-nums text-muted-foreground">{i.reserved}</Td>
                <Td className="tabular-nums text-muted-foreground">{i.damaged}</Td>
                <Td className="tabular-nums text-muted-foreground">{i.reorderLevel}</Td>
                <Td><InventoryBadge s={inventoryStatus(i)} /></Td>
                <Td className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/inventory/$sku" params={{ sku: i.sku }}>View SKU</Link>
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
