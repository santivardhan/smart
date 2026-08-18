import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PageHeader, SectionTitle, StatLine, TableShell, Td, Th } from "@/components/shared";
import { Pill } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { WORKERS } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Warehouse Settings — SmartFulfill" },
      { name: "description", content: "Configure SLA thresholds, priority weighting, worker roster and operational baselines for the warehouse." },
      { property: "og:title", content: "Warehouse Settings — SmartFulfill" },
      { property: "og:description", content: "SLA thresholds, priority weights and worker roster configuration." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/settings" }],
  }),
  component: () => (
    <AppShell role="admin">
      <Settings />
    </AppShell>
  ),
});

function Settings() {
  const { user, resetDemo } = useStore();
  const [slaWarn, setSlaWarn] = useState("8");
  const [autoHold, setAutoHold] = useState(true);
  const [autoReplenish, setAutoReplenish] = useState(true);

  return (
    <>
      <PageHeader
        accent="primary"
        eyebrow="Configuration"
        title="Warehouse settings"
        description="Tune how SmartFulfill scores orders, flags SLA risk and reacts to shortages."
        icon={SettingsIcon}
        actions={
          <Button variant="outline" size="sm" onClick={resetDemo}>
            <RotateCcw className="size-4" /> Restore baseline data
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <SectionTitle title="Your account" />
          <StatLine label="Name" value={user?.name ?? "—"} />
          <StatLine label="Email" value={user?.email ?? "—"} />
          <StatLine label="Role" value={<span className="capitalize">{user?.role}</span>} />
          <StatLine label="Warehouse" value="DC-01 Rotterdam" />
          <StatLine label="Shift" value="06:00 – 14:00 CET" />
        </Card>

        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Operational rules" hint="Applied across allocation, dispatch and exception handling" />
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sla">SLA "at risk" threshold (hours)</Label>
                <Input id="sla" className="w-40" type="number" value={slaWarn} onChange={(e) => setSlaWarn(e.target.value)} />
              </div>
              <Button
                size="sm"
                onClick={() => toast.success(`SLA risk threshold set to ${slaWarn}h for this session`)}
              >
                Save threshold
              </Button>
            </div>
            <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-3">
              <span>
                <span className="block text-sm font-medium">Auto-hold lower priority orders on shortage</span>
                <span className="block text-xs text-muted-foreground">Competing orders with a lower score move to stock hold automatically.</span>
              </span>
              <Switch checked={autoHold} onCheckedChange={(v) => { setAutoHold(v); toast.success(`Auto-hold ${v ? "enabled" : "disabled"}`); }} />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-3">
              <span>
                <span className="block text-sm font-medium">Auto-create replenishment tasks</span>
                <span className="block text-xs text-muted-foreground">Raised when available stock falls to or below the reorder level.</span>
              </span>
              <Switch checked={autoReplenish} onCheckedChange={(v) => { setAutoReplenish(v); toast.success(`Auto-replenishment ${v ? "enabled" : "disabled"}`); }} />
            </label>
          </div>

          <SectionTitle title="Priority weighting" hint="Urgency 40% · SLA risk 30% · Customer priority 20% · Order value 10%" />
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              ["Urgency", 40],
              ["SLA risk", 30],
              ["Customer", 20],
              ["Value", 10],
            ].map(([label, w]) => (
              <div key={label as string} className="rounded-lg border border-border bg-surface p-3 text-center">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-display text-2xl font-bold">{w}%</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 xl:col-span-3">
          <SectionTitle title="Worker roster" hint="Operators on shift in DC-01" />
          <TableShell>
            <thead className="border-b border-border bg-surface">
              <tr>
                <Th>Worker</Th>
                <Th>Zone</Th>
                <Th>Shift</Th>
                <Th>Tasks today</Th>
                <Th>Avg. handling</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {WORKERS.map((w) => (
                <tr key={w.id}>
                  <Td className="font-medium">{w.name}</Td>
                  <Td>{w.zone}</Td>
                  <Td className="text-muted-foreground">{w.shift}</Td>
                  <Td className="tabular-nums">{w.tasksToday}</Td>
                  <Td className="tabular-nums">{w.avgPickMin} min</Td>
                  <Td>
                    <Pill t={w.avgPickMin > 6 ? "warning" : "success"}>{w.avgPickMin > 6 ? "Above target" : "On target"}</Pill>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Card>
      </div>
    </>
  );
}
