import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, PackageCheck, Scan, ShieldCheck, Truck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { KpiCard, PageHeader, SectionTitle } from "@/components/shared";
import { PriorityBadge, StageBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/worker/dashboard")({
  head: () => ({
    meta: [
      { title: "Worker Dashboard — SmartFulfill" },
      { name: "description", content: "Your assigned picking, packing, quality check and dispatch tasks for this shift." },
      { property: "og:title", content: "Worker Dashboard — SmartFulfill" },
      { property: "og:description", content: "Simple task-focused view for warehouse floor operators." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/worker/dashboard" }],
  }),
  component: () => (
    <AppShell role="worker">
      <WorkerDashboard />
    </AppShell>
  ),
});

function WorkerDashboard() {
  const { orders, exceptions, user } = useStore();
  const picking = orders.filter((o) => o.stage === "picking");
  const packing = orders.filter((o) => o.stage === "packing");
  const qc = orders.filter((o) => o.stage === "qc");
  const dispatch = orders.filter((o) => o.stage === "dispatch");
  const openExc = exceptions.filter((e) => e.status !== "resolved");
  const queue = [...picking, ...packing, ...qc].slice(0, 8);

  return (
    <>
      <PageHeader
        accent="success"
        eyebrow="My shift"
        title={`Good shift, ${user?.name?.split(" ")[0] ?? "operator"}`}
        description="Only what you need: your task queue, in priority order."
        icon={Scan}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Picking tasks" value={picking.length} tone="primary" icon={Scan} />
        <KpiCard label="Packing tasks" value={packing.length} tone="info" icon={PackageCheck} />
        <KpiCard label="Quality checks" value={qc.length} tone="warning" icon={ShieldCheck} />
        <KpiCard label="Ready to dispatch" value={dispatch.length} tone="success" icon={Truck} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Your task queue" hint="Highest priority first" />
          <div className="space-y-2">
            {queue.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3">
                <span className="font-mono text-sm font-semibold">{o.id}</span>
                <StageBadge s={o.stage} />
                <PriorityBadge p={o.priority} />
                <span className="text-xs text-muted-foreground">{o.items.length} items · {o.customer}</span>
                <Button asChild size="sm" variant="outline" className="ml-auto">
                  <Link to="/orders/$orderId" params={{ orderId: o.id }}>Open</Link>
                </Button>
              </div>
            ))}
            {queue.length === 0 && <p className="text-sm text-muted-foreground">No tasks assigned right now.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Quick actions" />
          <div className="grid gap-2">
            <Button asChild><Link to="/picking"><Scan className="size-4" /> Start picking</Link></Button>
            <Button asChild variant="outline"><Link to="/packing"><PackageCheck className="size-4" /> Packing station</Link></Button>
            <Button asChild variant="outline"><Link to="/quality-check"><ShieldCheck className="size-4" /> Quality check</Link></Button>
            <Button asChild variant="outline"><Link to="/dispatch"><Truck className="size-4" /> Dispatch</Link></Button>
          </div>

          <SectionTitle title="Exceptions to report" hint={`${openExc.length} open`} />
          <div className="space-y-2">
            {openExc.slice(0, 4).map((e) => (
              <Link key={e.id} to="/exceptions/$exceptionId" params={{ exceptionId: e.id }} className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-sm hover:border-primary/50">
                <AlertTriangle className="mt-0.5 size-4 text-warning" />
                <span>
                  <span className="block font-medium">{e.type}</span>
                  <span className="block text-xs text-muted-foreground">{e.problem}</span>
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
