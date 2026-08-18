import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PageHeader, SectionTitle, StatLine } from "@/components/shared";
import { Card } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/customer/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — SmartFulfill" },
      { name: "description", content: "Your delivery address, contact details and account summary for SmartFulfill." },
      { property: "og:title", content: "My Profile — SmartFulfill" },
      { property: "og:description", content: "Account details and delivery preferences." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/customer/profile" }],
  }),
  component: () => (
    <AppShell role="customer">
      <CustomerProfile />
    </AppShell>
  ),
});

function CustomerProfile() {
  const { user } = useStore();
  const orders: Order[] = useStore().orders.filter((o) => o.customerEmail === user?.email || o.customer === user?.name);

  return (
    <>
      <PageHeader accent="info" eyebrow="Account" title="My profile" description="Contact and delivery details we use for your orders." icon={User} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Account" />
          <StatLine label="Name" value={user?.name ?? "—"} />
          <StatLine label="Email" value={user?.email ?? "—"} />
          <StatLine label="Account type" value="Business customer" />
          <StatLine label="Priority tier" value="Standard" />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Delivery" />
          <StatLine label="Default address" value={"Amsterdam, NL"} />
          <StatLine label="Preferred carrier" value="Express Logistics" />
          <StatLine label="Orders placed" value={orders.length} />
          <StatLine label="Delivered" value={orders.filter((o) => o.stage === "completed").length} />
        </Card>
      </div>
    </>
  );
}
