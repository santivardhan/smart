import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader, SectionTitle, StatLine } from "@/components/shared";
import { StageBadge } from "@/components/status";
import { Card } from "@/components/ui/card";
import { fmtDate } from "@/lib/engine";
import { useStore } from "@/lib/store";
import { STAGE_LABEL, STAGES, type Order, type Stage } from "@/lib/types";

const CUSTOMER_STEPS: Stage[] = STAGES;

export const Route = createFileRoute("/customer/orders")({
  head: () => ({
    meta: [
      { title: "Order Tracking — SmartFulfill" },
      { name: "description", content: "Follow each order step by step from placement to delivery with estimated delivery windows." },
      { property: "og:title", content: "Order Tracking — SmartFulfill" },
      { property: "og:description", content: "Step-by-step tracking for every SmartFulfill order." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/customer/orders" }],
  }),
  component: () => (
    <AppShell role="customer">
      <CustomerOrders />
    </AppShell>
  ),
});

function CustomerOrders() {
  const { orders: all, user } = useStore();
  const orders: Order[] = all.filter((o) => o.customerEmail === user?.email || o.customer === user?.name);

  return (
    <>
      <PageHeader accent="info" eyebrow="Tracking" title="My orders" description="A simple, honest view of where each order is right now." icon={Package} />

      {orders.length === 0 ? (
        <EmptyState title="No orders yet" description="Orders placed with SmartFulfill will appear here." />
      ) : (
        <div className="grid gap-4">
          {orders.map((o) => {
            const idx = CUSTOMER_STEPS.indexOf(o.stage as Stage);
            return (
              <Card key={o.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold">{o.id}</p>
                    <p className="text-xs text-muted-foreground">Placed {fmtDate(o.createdAt)}</p>
                  </div>
                  <StageBadge s={o.stage} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {CUSTOMER_STEPS.map((s, i) => (
                    <div
                      key={s}
                      className={`flex-1 rounded-lg border px-2 py-2 text-center text-[11px] ${
                        i <= idx ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-surface text-muted-foreground"
                      }`}
                    >
                      {STAGE_LABEL[s]}
                    </div>
                  ))}
                </div>

                <SectionTitle title="Items" />
                <ul className="space-y-1 text-sm">
                  {o.items.map((it: Order["items"][number]) => (
                    <li key={it.sku} className="flex justify-between border-b border-border/60 py-1">
                      <span>{it.name}</span>
                      <span className="tabular-nums text-muted-foreground">× {it.qty}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 grid gap-1 sm:grid-cols-2">
                  <StatLine label="Estimated delivery" value={fmtDate(o.slaDeadline)} />
                  <StatLine label="Recipient" value={o.customer} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
