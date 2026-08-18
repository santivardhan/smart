import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CheckCircle2, Search, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { BackLink, EmptyState, PageHeader, SectionTitle, StatLine } from "@/components/shared";
import { ExceptionBadge, SeverityBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/exceptions/$exceptionId")({
  head: ({ params }) => ({
    meta: [
      { title: `Exception ${params.exceptionId} — SmartFulfill` },
      { name: "description", content: `Problem, recommended decision and resolution actions for warehouse exception ${params.exceptionId}.` },
      { property: "og:title", content: `Exception ${params.exceptionId} — SmartFulfill` },
      { property: "og:description", content: "Resolve, investigate or escalate a warehouse exception." },
      { property: "og:url", content: `https://swift-resolve-ware.lovable.app/exceptions/${params.exceptionId}` },
    ],
    links: [{ rel: "canonical", href: `https://swift-resolve-ware.lovable.app/exceptions/${params.exceptionId}` }],
  }),

  component: ExceptionRoute,
});

function ExceptionRoute() {
  const { user } = useStore();
  const role: Role[] = user?.role === "worker" ? ["worker"] : ["admin", "manager"];
  return (
    <AppShell role={role}>
      <ExceptionDetail />
    </AppShell>
  );
}

function ExceptionDetail() {
  const { exceptionId } = useParams({ from: "/exceptions/$exceptionId" });
  const { exceptions, updateException, orders } = useStore();
  const ex = exceptions.find((e) => e.id === exceptionId);
  const [resolution, setResolution] = useState("");

  if (!ex) {
    return (
      <EmptyState
        title="Exception not found"
        description={`No exception matches ${exceptionId}.`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/exceptions">Back to exceptions</Link>
          </Button>
        }
      />
    );
  }

  const order = orders.find((o) => o.id === ex.orderId);

  return (
    <>
      <BackLink to="/exceptions" label="Back to exceptions" />

      <PageHeader
        accent="critical"
        eyebrow={ex.id}
        title={ex.type}
        description={`Detected ${fmtDate(ex.detectedAt)} · owner ${ex.owner}`}
        icon={AlertTriangle}
        actions={
          <>
            <SeverityBadge s={ex.severity} />
            <ExceptionBadge s={ex.status} />
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Problem → recommended decision → resolution" />
          <div className="space-y-3">
            <div className="rounded-xl border border-critical/40 bg-critical/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-critical">Problem</p>
              <p className="mt-1 text-sm">{ex.problem}</p>
            </div>
            <div className="flex justify-center text-muted-foreground">
              <ArrowRight className="size-4 rotate-90" />
            </div>
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Recommended decision</p>
              <p className="mt-1 text-sm">{ex.recommendation}</p>
            </div>
            <div className="flex justify-center text-muted-foreground">
              <ArrowRight className="size-4 rotate-90" />
            </div>
            <div className={ex.resolution ? "rounded-xl border border-success/40 bg-success/10 p-4" : "rounded-xl border border-dashed border-border p-4"}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-success">Resolution</p>
              <p className="mt-1 text-sm">{ex.resolution ?? "Not resolved yet — record the resolution below."}</p>
            </div>
          </div>

          {ex.status !== "resolved" && (
            <div className="mt-5 space-y-3">
              <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} placeholder="Describe the action taken to resolve this exception…" />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => updateException(ex.id, "resolved", resolution || ex.recommendation)}>
                  <CheckCircle2 className="size-4" /> Resolve exception
                </Button>
                <Button variant="outline" onClick={() => updateException(ex.id, "investigating")}>
                  <Search className="size-4" /> Mark investigating
                </Button>
                <Button variant="outline" onClick={() => updateException(ex.id, "action_required")}>
                  Action required
                </Button>
                <Button variant="ghost" onClick={() => updateException(ex.id, "escalated", resolution || "Escalated to supervisor")}>
                  <ShieldAlert className="size-4" /> Escalate
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle title="Context" />
          <StatLine label="Exception ID" value={ex.id} />
          <StatLine label="Type" value={ex.type} />
          <StatLine label="Severity" value={<span className="capitalize">{ex.severity}</span>} />
          <StatLine label="Status" value={<span className="capitalize">{ex.status.replace("_", " ")}</span>} />
          <StatLine label="Owner" value={ex.owner} />
          <StatLine label="Detected" value={fmtDate(ex.detectedAt)} />
          {ex.sku && <StatLine label="SKU" value={ex.sku} />}
          <div className="mt-4 flex flex-wrap gap-2">
            {order && (
              <Button asChild size="sm" variant="outline">
                <Link to="/orders/$orderId" params={{ orderId: order.id }}>View order {order.id}</Link>
              </Button>
            )}
            {ex.sku && (
              <Button asChild size="sm" variant="outline">
                <Link to="/inventory/$sku" params={{ sku: ex.sku }}>View SKU</Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to="/decision-center">Decision center</Link>
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
