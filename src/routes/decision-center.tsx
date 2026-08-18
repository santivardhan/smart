import { Link, createFileRoute } from "@tanstack/react-router";
import { Brain, Check, Pencil, Rocket, ShieldAlert, X } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CategoryDonut } from "@/components/charts";
import { EmptyState, ImpactPanel, Insight, KpiCard, PageHeader, SectionTitle, TableShell, Td, Th } from "@/components/shared";
import { Pill, SeverityBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate, fmtRelative } from "@/lib/engine";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/decision-center")({
  head: () => ({
    meta: [
      { title: "Decision Center — SmartFulfill" },
      { name: "description", content: "Every operational decision that needs a human: shortages, damages, dispatch risk and replenishment, each with a recommendation." },
      { property: "og:title", content: "Decision Center — SmartFulfill" },
      { property: "og:description", content: "Accept, modify or reject system recommendations — every action changes real state." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/decision-center" }],
  }),
  component: () => (
    <AppShell role={["admin", "manager"]}>
      <DecisionCenter />
    </AppShell>
  ),
});

function DecisionCenter() {
  const { decisions, history, resolveDecision } = useStore();
  const [modifyId, setModifyId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const kindMeta = {
    allocation: { label: "Allocation", tone: "critical" as const },
    damage: { label: "Damage", tone: "warning" as const },
    dispatch: { label: "Dispatch risk", tone: "critical" as const },
    replenishment: { label: "Replenishment", tone: "info" as const },
    qc: { label: "Quality", tone: "warning" as const },
  };

  const byKind = Object.entries(
    decisions.reduce<Record<string, number>>((acc, d) => {
      const label = kindMeta[d.kind].label;
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const criticalCount = decisions.filter((d) => d.severity === "critical").length;
  const topKind = byKind[0];

  return (
    <>
      <PageHeader
        accent="decision"
        eyebrow="Detect → Analyse → Decide → Act → Measure"
        title="Decision center"
        description="SmartFulfill surfaces the problem, explains the reasoning and recommends the action. You accept, modify or reject — and the system state changes."
        icon={Brain}
      />

      <ImpactPanel />

      <Card className="p-5">
        <SectionTitle title="Open decisions by category" hint="What the operation currently needs a human to decide" />
        {byKind.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing waiting on a decision right now.</p>
        ) : (
          <>
            <CategoryDonut data={byKind} />
            <Insight
              text={
                topKind
                  ? `${topKind.name} is the largest open decision category — ${topKind.value} of ${decisions.length} pending item(s); ${criticalCount} carry critical severity.`
                  : ""
              }
            />
          </>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pending decisions" value={decisions.length} tone="primary" icon={Brain} />
        <KpiCard label="Critical" value={criticalCount} tone="critical" icon={ShieldAlert} />
        <KpiCard label="Decisions executed" value={history.length} tone="success" icon={Check} />
        <KpiCard label="Overrides" value={history.filter((h) => h.outcome !== "accepted").length} tone="warning" icon={Pencil} />
      </div>

      {decisions.length === 0 ? (
        <EmptyState
          title="No decisions waiting"
          description="Every recommendation has been actioned. New decisions appear here the moment the system detects a problem."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {decisions.map((d) => {
            const meta = kindMeta[d.kind];
            return (
              <Card key={d.id} className="gap-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill t={meta.tone}>{meta.label}</Pill>
                      <SeverityBadge s={d.severity} />
                      <span className="font-mono text-xs text-muted-foreground">{d.id}</span>
                    </div>
                    <h3 className="mt-2 font-display text-lg font-bold">{d.title}</h3>
                    <p className="text-xs text-muted-foreground">Raised {fmtRelative(d.createdAt)}</p>
                  </div>
                  {d.orderId && (
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/orders/$orderId" params={{ orderId: d.orderId }}>View order</Link>
                    </Button>
                  )}
                </div>

                <div className="rounded-xl border border-critical/40 bg-critical/10 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-critical">Problem</p>
                  <p className="mt-1 text-sm">{d.title}</p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Evidence</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {d.context.map((c) => (
                      <li key={c}>• {c}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-warning/40 bg-warning/10 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-warning">Risk if ignored</p>
                  <p className="mt-1 text-sm">
                    {d.why ?? `Severity is ${d.severity} — the situation blocks the ${meta.label.toLowerCase()} step and puts the order's SLA at risk.`}
                  </p>
                </div>

                <div className="rounded-xl border border-primary/40 bg-primary/10 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Recommended action</p>
                  <p className="mt-1 text-sm">{d.recommendation}</p>
                </div>

                <div className="rounded-xl border border-success/40 bg-success/10 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-success">Expected impact <span className="text-muted-foreground">(projected)</span></p>
                  <p className="mt-1 text-sm">
                    {d.expectedResult ?? "Accepting updates orders, inventory and the activity log immediately, and the outcome is recorded in decision history."}
                  </p>
                </div>


                <div className="flex flex-wrap gap-2">
                  {d.kind === "damage" ? (
                    <>
                      <Button size="sm" onClick={() => resolveDecision(d.id, "accept")}>
                        <Check className="size-4" /> Resolve with replacement
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resolveDecision(d.id, "hold")}>
                        Hold order
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => resolveDecision(d.id, "escalate")}>
                        <ShieldAlert className="size-4" /> Escalate
                      </Button>
                    </>
                  ) : d.kind === "dispatch" ? (
                    <Button size="sm" onClick={() => resolveDecision(d.id, "accept")}>
                      <Rocket className="size-4" /> Prioritise dispatch
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => resolveDecision(d.id, "accept")}>
                        <Check className="size-4" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setModifyId(d.id);
                          setNote("");
                        }}
                      >
                        <Pencil className="size-4" /> Modify
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => resolveDecision(d.id, "reject", "Operator rejected the recommendation")}>
                        <X className="size-4" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-5">
        <SectionTitle title="Decision history" hint="Every executed decision, with reasoning, operator and outcome" />
        <TableShell>
          <thead className="border-b border-border bg-surface">
            <tr>
              <Th>Decision</Th>
              <Th>Reason</Th>
              <Th>Operator</Th>
              <Th>Timestamp</Th>
              <Th>Outcome</Th>
              <Th>Result</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {history.map((h) => (
              <tr key={h.id}>
                <Td className="font-medium">{h.decision}</Td>
                <Td className="max-w-[260px] text-xs text-muted-foreground">{h.reason}</Td>
                <Td className="text-sm">{h.operator}</Td>
                <Td className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(h.at)}</Td>
                <Td>
                  <Pill t={h.outcome === "accepted" ? "success" : h.outcome === "modified" ? "warning" : "critical"}>{h.outcome}</Pill>
                </Td>
                <Td className="max-w-[240px] text-xs text-muted-foreground">{h.result}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Card>

      <Dialog open={!!modifyId} onOpenChange={(v) => !v && setModifyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify the recommendation</DialogTitle>
            <DialogDescription>Your override reason is stored in the decision history alongside the outcome.</DialogDescription>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Explain the modification…" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModifyId(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (modifyId) resolveDecision(modifyId, "modify", note || "Operator modified the recommendation");
                setModifyId(null);
              }}
            >
              Execute modified decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
