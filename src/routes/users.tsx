import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, HardHat, ShieldCheck, UserCog } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, KpiCard, PageHeader, SectionTitle, TableShell, Td, Th } from "@/components/shared";
import { Pill, PriorityBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { money } from "@/lib/engine";
import { useStore } from "@/lib/store";
import { DEMO_USERS } from "@/lib/mock-data";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "User Management — SmartFulfill" },
      { name: "description", content: "Manage warehouse staff and customer accounts: roles, activity, order volume and account value across the platform." },
      { property: "og:title", content: "User Management — SmartFulfill" },
      { property: "og:description", content: "Staff and customer accounts with role, activity and value." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/users" }],
  }),
  component: () => (
    <AppShell role={["admin"]}>
      <Users />
    </AppShell>
  ),
});

function Users() {
  const { orders, workforce, feedback } = useStore();
  const [tab, setTab] = useState("customers");
  const [q, setQ] = useState("");

  const customers = useMemo(() => {
    const map = new Map<string, { name: string; email: string; tier: string; orders: number; value: number; open: number }>();
    orders.forEach((o) => {
      const c = map.get(o.customer) ?? { name: o.customer, email: o.customerEmail, tier: o.customerTier, orders: 0, value: 0, open: 0 };
      c.orders += 1;
      c.value += o.value;
      if (o.stage !== "completed") c.open += 1;
      map.set(o.customer, c);
    });
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [orders]);

  const staff = [
    { id: "U-01", name: DEMO_USERS.admin.name, email: DEMO_USERS.admin.email, role: "Administrator", scope: "Full platform access" },
    { id: "U-02", name: DEMO_USERS.manager.name, email: DEMO_USERS.manager.email, role: "Operations manager", scope: "Operations, workforce, intelligence" },
    ...workforce.map((w) => ({
      id: w.id,
      name: w.name,
      email: `${w.name.split(" ")[0]!.toLowerCase()}@smartfulfill.io`,
      role: w.jobRole,
      scope: `${w.station} · Zone ${w.zone}`,
    })),
  ];

  const term = q.trim().toLowerCase();
  const visibleCustomers = customers.filter((c) => !term || `${c.name} ${c.email} ${c.tier}`.toLowerCase().includes(term));
  const visibleStaff = staff.filter((s) => !term || `${s.name} ${s.email} ${s.role} ${s.scope}`.toLowerCase().includes(term));

  return (
    <>
      <PageHeader
        accent="primary"
        eyebrow="Access and accounts"
        title="User management"
        description="Everyone connected to the warehouse: administrators, managers, floor operators and customer accounts, with the activity behind each one."
        icon={UserCog}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Customer accounts" value={customers.length} tone="primary" icon={Building2} />
        <KpiCard label="Warehouse staff" value={staff.length} tone="info" icon={HardHat} to="/workforce" />
        <KpiCard label="Privileged roles" value={2} hint="Administrator and operations manager" tone="warning" icon={ShieldCheck} />
        <KpiCard label="Feedback submitted" value={feedback.length} tone="success" icon={UserCog} to="/feedback" />
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Directory"
          hint="Search across names, emails, roles and tiers"
          right={
            <div className="flex flex-wrap gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search accounts…" className="h-9 w-52" />
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="customers">Customers</TabsTrigger>
                  <TabsTrigger value="staff">Staff</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          }
        />

        {tab === "customers" ? (
          visibleCustomers.length === 0 ? (
            <EmptyState title="No customers match" description="Try a different search term." />
          ) : (
            <TableShell>
              <thead className="border-b border-border bg-surface">
                <tr>
                  <Th>Customer</Th>
                  <Th>Email</Th>
                  <Th>Tier</Th>
                  <Th>Orders</Th>
                  <Th>Open</Th>
                  <Th>Lifetime value</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleCustomers.map((c) => (
                  <tr key={c.name}>
                    <Td className="font-medium">{c.name}</Td>
                    <Td className="text-xs text-muted-foreground">{c.email}</Td>
                    <Td><Pill t={c.tier === "platinum" ? "success" : c.tier === "gold" ? "warning" : "neutral"}>{c.tier}</Pill></Td>
                    <Td className="tabular-nums">{c.orders}</Td>
                    <Td className="tabular-nums">{c.open}</Td>
                    <Td className="font-semibold tabular-nums">{money(c.value)}</Td>
                    <Td>
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/orders" search={{ q: c.name } as never}>View orders</Link>
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )
        ) : visibleStaff.length === 0 ? (
          <EmptyState title="No staff match" description="Try a different search term." />
        ) : (
          <TableShell>
            <thead className="border-b border-border bg-surface">
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Scope</Th>
                <Th>Activity</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleStaff.map((s) => {
                const w = workforce.find((x) => x.id === s.id);
                return (
                  <tr key={s.id}>
                    <Td>
                      <span className="font-medium">{s.name}</span>
                      <span className="block font-mono text-[10px] text-muted-foreground">{s.id}</span>
                    </Td>
                    <Td className="text-xs text-muted-foreground">{s.email}</Td>
                    <Td><Pill t={s.role === "Administrator" ? "critical" : s.role === "Operations manager" ? "warning" : "info"}>{s.role}</Pill></Td>
                    <Td className="text-xs text-muted-foreground">{s.scope}</Td>
                    <Td className="text-sm">
                      {w ? `${w.tasksCompleted} tasks · ${w.productivity}% productivity` : "Platform access"}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </Card>

      <Card className="p-5">
        <SectionTitle title="Highest-priority customer orders" hint="Where account attention is needed right now" />
        <div className="space-y-2">
          {orders
            .filter((o) => o.stage !== "completed")
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3">
                <span className="font-mono text-sm font-semibold">{o.id}</span>
                <PriorityBadge p={o.priority} />
                <span className="text-sm">{o.customer}</span>
                <span className="text-xs text-muted-foreground">{money(o.value)}</span>
                <Button asChild size="sm" variant="outline" className="ml-auto">
                  <Link to="/orders/$orderId" params={{ orderId: o.id }}>Open</Link>
                </Button>
              </div>
            ))}
        </div>
      </Card>
    </>
  );
}
