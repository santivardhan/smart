import { Link, createFileRoute } from "@tanstack/react-router";
import { Box, PackageCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader, PipelineStrip, SectionTitle, StatLine } from "@/components/shared";
import { Pill, PriorityBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtRelative } from "@/lib/engine";
import { PACK_CHECKS } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import type { ExceptionType, Role } from "@/lib/types";

export const Route = createFileRoute("/packing")({
  head: () => ({
    meta: [
      { title: "Packing Station — SmartFulfill" },
      { name: "description", content: "Guided packing workstation with verification checklist gates and instant exception handling." },
      { property: "og:title", content: "Packing Station — SmartFulfill" },
      { property: "og:description", content: "Verification checklist, package details and exception resolution at the packing bench." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/packing" }],
  }),
  component: PackingRoute,
});

function PackingRoute() {
  const { user } = useStore();
  const role: Role[] = user?.role === "worker" ? ["worker"] : ["admin", "manager"];
  return (
    <AppShell role={role}>
      <Packing />
    </AppShell>
  );
}

const EXCEPTION_OPTIONS: ExceptionType[] = ["Missing Item", "Wrong SKU", "Quantity Mismatch", "Damaged Item", "Packing Delay"];

function Packing() {
  const { orders, togglePackCheck, completePacking, reportIssue, decisions, resolveDecision } = useStore();
  const [exceptionFor, setExceptionFor] = useState<string | null>(null);
  const [excType, setExcType] = useState<ExceptionType>("Damaged Item");

  const queue = orders.filter((o) => o.stage === "packing").sort((a, b) => b.score - a.score);

  return (
    <>
      <PageHeader
        accent="success"
        eyebrow="Workstation"
        title="Packing"
        description="Each order must clear every verification gate before it can be sealed and sent to quality check."
        icon={PackageCheck}
      />

      <PipelineStrip current="/packing" />

      {queue.length === 0 ? (
        <EmptyState
          title="Packing bench is clear"
          description="Complete a pick task to send an order to packing."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/picking">Go to picking</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {queue.map((o) => {
            const done = o.packChecks.length;
            const ready = PACK_CHECKS.every((c) => o.packChecks.includes(c.id));
            const units = o.items.reduce((s, i) => s + i.qty, 0);
            const weight = (units * 0.42 + 0.3).toFixed(2);
            const pkg = units > 10 ? "Large carton (60×40×40)" : units > 4 ? "Medium carton (40×30×30)" : "Small carton (30×20×15)";
            const linkedDecision = decisions.find((d) => d.orderId === o.id && d.kind === "damage");

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
                      {o.customer} · picked by {o.picker ?? "—"} · SLA {fmtRelative(o.slaDeadline)}
                    </p>
                  </div>
                  <Pill t={ready ? "success" : "warning"}>
                    {done}/{PACK_CHECKS.length} checks
                  </Pill>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-surface p-3">
                    <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Items</p>
                    {o.items.map((i) => (
                      <div key={i.sku} className="flex items-center justify-between py-1 text-sm">
                        <span className="truncate">{i.name}</span>
                        <span className="font-mono text-xs">× {i.qty}</span>
                      </div>
                    ))}
                    <StatLine label="Package type" value={pkg} />
                    <StatLine label="Est. weight" value={`${weight} kg`} />
                  </div>

                  <div className="rounded-xl border border-border bg-surface p-3">
                    <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Verification checklist</p>
                    <ul className="space-y-2">
                      {PACK_CHECKS.map((c) => (
                        <li key={c.id}>
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox checked={o.packChecks.includes(c.id)} onCheckedChange={() => togglePackCheck(o.id, c.id)} />
                            {c.label}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {linkedDecision && (
                  <div className="rounded-xl border border-critical/40 bg-critical/10 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-critical">Exception → recommended decision</p>
                    <p className="mt-1 text-sm">{linkedDecision.context[0]}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Recommendation: {linkedDecision.recommendation}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => resolveDecision(linkedDecision.id, "accept")}>
                        Replace item
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resolveDecision(linkedDecision.id, "hold")}>
                        Hold order
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => resolveDecision(linkedDecision.id, "escalate")}>
                        Escalate
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button disabled={!ready} onClick={() => completePacking(o.id)}>
                    <Box className="size-4" /> Complete packing
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setExceptionFor(o.id);
                      setExcType("Damaged Item");
                    }}
                  >
                    <TriangleAlert className="size-4" /> Report exception
                  </Button>
                  {!ready && <p className="self-center text-xs text-muted-foreground">Complete all checks to seal this package.</p>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!exceptionFor} onOpenChange={(v) => !v && setExceptionFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a packing exception</DialogTitle>
            <DialogDescription>
              SmartFulfill will raise the exception, generate a recommended decision and route it to the Decision Center.
            </DialogDescription>
          </DialogHeader>
          <Select value={excType} onValueChange={(v) => setExcType(v as ExceptionType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXCEPTION_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExceptionFor(null)}>Cancel</Button>
            <Button
              onClick={() => {
                const o = orders.find((x) => x.id === exceptionFor);
                if (o) reportIssue(o.id, excType, o.items[0]?.sku, `${excType} detected at the packing bench for ${o.id}.`);
                setExceptionFor(null);
              }}
            >
              Raise exception
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
