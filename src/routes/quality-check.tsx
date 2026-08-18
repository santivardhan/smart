import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader, PipelineStrip, SectionTitle, StatLine } from "@/components/shared";
import { Pill, PriorityBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { fmtRelative } from "@/lib/engine";
import { QC_CHECKS } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/quality-check")({
  head: () => ({
    meta: [
      { title: "Quality Check — SmartFulfill" },
      { name: "description", content: "QC bench with a five-point inspection checklist, approvals, rejections and automatic rework routing." },
      { property: "og:title", content: "Quality Check — SmartFulfill" },
      { property: "og:description", content: "Approve, reject or return orders to packing with a full audit trail." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/quality-check" }],
  }),
  component: QcRoute,
});

function QcRoute() {
  const { user } = useStore();
  const role: Role[] = user?.role === "worker" ? ["worker"] : ["admin", "manager"];
  return (
    <AppShell role={role}>
      <QualityCheck />
    </AppShell>
  );
}

function QualityCheck() {
  const { orders, toggleQcCheck, approveQc, rejectQc } = useStore();
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const queue = orders.filter((o) => o.stage === "qc").sort((a, b) => b.score - a.score);

  return (
    <>
      <PageHeader
        accent="success"
        eyebrow="Verification"
        title="Quality check"
        description="Final inspection before dispatch. Approve to release, reject to send the order back to packing with a recorded reason."
        icon={ShieldCheck}
      />

      <PipelineStrip current="/quality-check" />

      {queue.length === 0 ? (
        <EmptyState
          title="QC bench is empty"
          description="Complete a packing task to send an order to quality check."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/packing">Go to packing</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {queue.map((o) => {
            const passed = o.qcChecks.length;
            const allPassed = QC_CHECKS.every((c) => o.qcChecks.includes(c.id));
            return (
              <Card key={o.id} className="gap-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to="/orders/$orderId" params={{ orderId: o.id }} className="font-mono text-lg font-bold hover:text-primary">
                        {o.id}
                      </Link>
                      <PriorityBadge p={o.priority} score={o.score} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {o.customer} · SLA {fmtRelative(o.slaDeadline)}
                    </p>
                  </div>
                  <Pill t={allPassed ? "success" : "warning"}>
                    {passed}/{QC_CHECKS.length} passed
                  </Pill>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-surface p-3">
                    <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Inspection checklist</p>
                    <ul className="space-y-2">
                      {QC_CHECKS.map((c) => (
                        <li key={c.id}>
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox checked={o.qcChecks.includes(c.id)} onCheckedChange={() => toggleQcCheck(o.id, c.id)} />
                            {c.label}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-3">
                    <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Package contents</p>
                    {o.items.map((i) => (
                      <div key={i.sku} className="flex items-center justify-between py-1 text-sm">
                        <span className="truncate">{i.name}</span>
                        <span className="font-mono text-xs">× {i.qty}</span>
                      </div>
                    ))}
                    <StatLine label="Packed by" value={o.picker ?? "Packing bench"} />
                    <StatLine label="Tracking" value={o.trackingId ?? "generated on approval"} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => approveQc(o.id)}>
                    <CheckCircle2 className="size-4" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRejectFor(o.id);
                      setReason("");
                      setError(null);
                    }}
                  >
                    <XCircle className="size-4" /> Reject
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => rejectQc(o.id, "Returned to packing for repackaging by QC operator.")}
                  >
                    <RotateCcw className="size-4" /> Send back to packing
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-5">
        <SectionTitle title="Released today" hint="Orders that passed QC and moved on to dispatch" />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {orders
            .filter((o) => ["dispatch", "completed"].includes(o.stage))
            .map((o) => (
              <Link key={o.id} to="/orders/$orderId" params={{ orderId: o.id }} className="rounded-lg border border-border bg-surface p-3 text-sm hover:border-primary/40">
                <span className="font-mono font-semibold">{o.id}</span>
                <span className="ml-2 text-muted-foreground">{o.customer}</span>
                <p className="mt-1 text-xs text-muted-foreground">Tracking {o.trackingId ?? "—"}</p>
              </Link>
            ))}
        </div>
      </Card>

      <Dialog open={!!rejectFor} onOpenChange={(v) => !v && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject quality check</DialogTitle>
            <DialogDescription>
              A reason is required. The order returns to packing, a QC failure exception is raised and the event is logged.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="e.g. Outer carton damaged — corner crushed during sealing." />
          {error && <p className="text-sm text-critical">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (reason.trim().length < 8) return setError("Please describe the failure in at least 8 characters.");
                if (rejectFor) rejectQc(rejectFor, reason.trim());
                setRejectFor(null);
              }}
            >
              Reject and return to packing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
