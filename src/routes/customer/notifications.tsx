import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader } from "@/components/shared";
import { Card } from "@/components/ui/card";
import { fmtRelative } from "@/lib/engine";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/customer/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — SmartFulfill" },
      { name: "description", content: "Delivery updates, dispatch confirmations and delay notices for your SmartFulfill orders." },
      { property: "og:title", content: "Notifications — SmartFulfill" },
      { property: "og:description", content: "Order updates and delivery notices." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/customer/notifications" }],
  }),
  component: () => (
    <AppShell role="customer">
      <CustomerNotifications />
    </AppShell>
  ),
});

function CustomerNotifications() {
  const { notifications } = useStore();

  return (
    <>
      <PageHeader accent="info" eyebrow="Updates" title="Notifications" description="Every update we have sent you about your orders." icon={Bell} />
      {notifications.length === 0 ? (
        <EmptyState title="Nothing new" description="You are all caught up." />
      ) : (
        <Card className="p-5">
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li key={n.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{n.title}</p>
                  <span className="ml-auto text-xs text-muted-foreground">{fmtRelative(n.at)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{n.body}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
