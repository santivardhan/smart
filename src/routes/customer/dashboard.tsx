import { Link, createFileRoute } from "@tanstack/react-router";
import { Clock, Package, PackageCheck, Truck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { KpiCard, PageHeader, SectionTitle } from "@/components/shared";
import { StageBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fmtDate } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/customer/dashboard")({
  head: () => ({
    meta: [
      { title: "My Orders — SmartFulfill" },
      { name: "description", content: "Track your orders through packing, quality check and dispatch with live delivery estimates." },
      { property: "og:title", content: "My Orders — SmartFulfill" },
      { property: "og:description", content: "Live order tracking for SmartFulfill customers." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/customer/dashboard" }],
  }),
  component: () => (
    <AppShell role="customer">
      <CustomerDashboard />
    </AppShell>
  ),
});

function CustomerDashboard() {
  const { user } = useStore();
  const orders: Order[] = useStore().orders.filter((o) => o.customerEmail === user?.email || o.customer === user?.name);
  const active = orders.filter((o) => o.stage !== "completed");
  const delivered = orders.filter((o) => o.stage === "completed");
  const shipped = orders.filter((o) => o.stage === "dispatch");

  return (
    <>
      <PageHeader
        accent="info"
        eyebrow="Customer portal"
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
        description="Track every order as it moves through our fulfilment centre."
        icon={Package}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active orders" value={active.length} tone="primary" icon={Package} />
        <KpiCard label="In transit" value={shipped.length} tone="info" icon={Truck} />
        <KpiCard label="Delivered" value={delivered.length} tone="success" icon={PackageCheck} />
        <KpiCard label="Total orders" value={orders.length} tone="info" icon={Clock} />
      </div>

      <Card className="p-5">
        <SectionTitle title="Your orders" hint="Newest first" />
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
              <div>
                <p className="font-mono text-sm font-semibold">{o.id}</p>
                <p className="text-xs text-muted-foreground">Placed {fmtDate(o.createdAt)} · {o.items.length} items</p>
              </div>
              <StageBadge s={o.stage} />
              <p className="text-xs text-muted-foreground">Expected {fmtDate(o.slaDeadline)}</p>
              <Button asChild size="sm" variant="outline" className="ml-auto">
                <Link to="/customer/orders">Track order</Link>
              </Button>
            </div>
          ))}
          {orders.length === 0 && <p className="text-sm text-muted-foreground">You have no orders yet.</p>}
        </div>
      </Card>
    </>
  );
}
