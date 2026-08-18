import { createFileRoute } from "@tanstack/react-router";
import { Activity as ActivityIcon } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader } from "@/components/shared";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fmtDate } from "@/lib/engine";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity Timeline — SmartFulfill" },
      { name: "description", content: "A chronological audit trail of every order, allocation, exception and dispatch event in the warehouse." },
      { property: "og:title", content: "Activity Timeline — SmartFulfill" },
      { property: "og:description", content: "Chronological audit trail of every warehouse event." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/activity" }],
  }),
  component: () => (
    <AppShell role={["admin", "manager"]}>
      <ActivityPage />
    </AppShell>
  ),
});

function ActivityPage() {
  const { activity } = useStore();
  const [q, setQ] = useState("");
  const rows = activity.filter((a) => `${a.actor} ${a.event} ${a.detail}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader
        accent="primary"
        eyebrow="Audit trail"
        title="Activity timeline"
        description="Every state change in DC-01, newest first — order creation, priority assignment, allocation, picking, packing, QC and dispatch."
        icon={ActivityIcon}
      />

      <Card className="p-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by actor, event or detail…" />
      </Card>

      <Card className="p-5">
        {rows.length === 0 ? (
          <EmptyState title="No matching activity" description="Try a different search term." />
        ) : (
          <ol className="relative space-y-5 border-l border-border pl-5">
            {rows.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[23px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{a.event}</p>
                  <span className="text-xs text-muted-foreground">· {a.actor}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{fmtDate(a.at)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{a.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
