import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PageHeader, SectionTitle, StatLine } from "@/components/shared";
import { PriorityBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { money, scoreOrder } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/orders/new")({
  head: () => ({
    meta: [
      { title: "Create Order — SmartFulfill" },
      { name: "description", content: "Create a warehouse order and watch priority scoring, inventory checks and allocation recommendations run instantly." },
      { property: "og:title", content: "Create Order — SmartFulfill" },
      { property: "og:description", content: "Order intake with live priority scoring and inventory availability preview." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/orders/new" }],
  }),
  component: () => (
    <AppShell role={["admin", "manager"]}>
      <CreateOrder />
    </AppShell>
  ),
});

function CreateOrder() {
  const { inventory, createOrder } = useStore();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<Order["customerTier"]>("standard");
  const [slaHours, setSlaHours] = useState("24");
  const [lines, setLines] = useState<{ sku: string; qty: number }[]>([{ sku: inventory[0]!.sku, qty: 1 }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const value = useMemo(
    () => lines.reduce((s, l) => s + (inventory.find((i) => i.sku === l.sku)?.unitPrice ?? 0) * l.qty, 0),
    [lines, inventory],
  );

  const preview = useMemo(() => {
    const now = new Date().toISOString();
    return scoreOrder({
      createdAt: now,
      slaDeadline: new Date(Date.now() + Number(slaHours || 24) * 3600000).toISOString(),
      customerTier: tier,
      value,
    });
  }, [slaHours, tier, value]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!customer.trim()) return setError("Customer name is required.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError("A valid customer email is required.");
    if (lines.some((l) => l.qty < 1)) return setError("Every line must have a quantity of at least 1.");
    if (new Set(lines.map((l) => l.sku)).size !== lines.length) return setError("Each SKU can only appear once per order.");

    setSubmitting(true);
    window.setTimeout(() => {
      const id = createOrder({
        customer: customer.trim(),
        customerEmail: email.trim(),
        customerTier: tier,
        slaHours: Number(slaHours || 24),
        items: lines,
      });
      setSubmitting(false);
      toast.success(`${id} created — priority scored and allocation recommendation raised`);
      navigate({ to: "/orders/$orderId", params: { orderId: id } });
    }, 500);
  };

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/orders">
          <ArrowLeft className="size-4" /> All orders
        </Link>
      </Button>

      <PageHeader
        accent="primary"
        eyebrow="Order intake"
        title="Create order"
        description="Order → priority calculation → inventory check → allocation recommendation, all triggered on submit."
        icon={Plus}
      />

      <form onSubmit={submit} className="grid gap-4 xl:grid-cols-3" noValidate>
        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Customer & service level" />
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer">Customer</Label>
              <Input id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Northwind Retail" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Customer email</Label>
              <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ops@northwind.example" />
            </div>
            <div className="space-y-1.5">
              <Label>Customer tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as Order["customerTier"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="platinum">Platinum (20% weight max)</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sla">SLA window (hours)</Label>
              <Input id="sla" type="number" min={1} max={168} value={slaHours} onChange={(e) => setSlaHours(e.target.value)} />
            </div>
          </div>

          <SectionTitle title="Order lines" hint="Live availability is checked as you type" />
          <div className="space-y-3">
            {lines.map((line, idx) => {
              const inv = inventory.find((i) => i.sku === line.sku)!;
              const short = line.qty > inv.available;
              return (
                <div key={idx} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-3">
                  <div className="min-w-[220px] flex-1 space-y-1.5">
                    <Label>Product</Label>
                    <Select value={line.sku} onValueChange={(v) => setLines((l) => l.map((x, i) => (i === idx ? { ...x, sku: v } : x)))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {inventory.map((i) => (
                          <SelectItem key={i.sku} value={i.sku}>
                            {i.sku} · {i.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1.5">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={line.qty}
                      onChange={(e) => setLines((l) => l.map((x, i) => (i === idx ? { ...x, qty: Number(e.target.value) } : x)))}
                    />
                  </div>
                  <div className="min-w-[150px] text-xs">
                    <p className="text-muted-foreground">On hand: {inv.available} in {inv.bin}</p>
                    <p className={short ? "font-semibold text-critical" : "text-success"}>
                      {short ? `Shortage of ${line.qty - inv.available} unit(s)` : "Stock available"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={lines.length === 1}
                    onClick={() => setLines((l) => l.filter((_, i) => i !== idx))}
                    aria-label="Remove line"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-fit"
            onClick={() => {
              const next = inventory.find((i) => !lines.some((l) => l.sku === i.sku));
              if (next) setLines((l) => [...l, { sku: next.sku, qty: 1 }]);
              else toast.info("Every SKU is already on this order");
            }}
          >
            <Plus className="size-4" /> Add line
          </Button>
        </Card>

        <Card className="h-fit p-5">
          <SectionTitle title="Live priority preview" hint="Urgency 40 · SLA 30 · Customer 20 · Value 10" />
          <div className="mb-3">
            <PriorityBadge p={preview.priority} score={preview.score} />
          </div>
          {preview.breakdown.map((b) => (
            <StatLine key={b.label} label={`${b.label} (${b.weight * 100}%)`} value={`${b.points.toFixed(1)} pts`} />
          ))}
          <StatLine label="Order value" value={money(value)} />
          <StatLine label="Total units" value={lines.reduce((s, l) => s + l.qty, 0)} />
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {preview.reasons.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
          <Button type="submit" className="mt-4 w-full" disabled={submitting}>
            {submitting ? "Creating order…" : "Create order"}
          </Button>
        </Card>
      </form>
    </>
  );
}
