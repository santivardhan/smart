import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Boxes, Brain, HardHat, PackageCheck, ShieldCheck, Truck, UserRound, Warehouse } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartFulfill — Smart Warehouse Operations & Fulfilment" },
      {
        name: "description",
        content:
          "A warehouse command center: priority scoring, smart allocation, picking, packing, QC, dispatch, exception handling and bottleneck analytics.",
      },
      { property: "og:title", content: "SmartFulfill — Smart Warehouse Operations & Fulfilment" },
      { property: "og:description", content: "Visibility → Decision → Action → Resolution → Analytics for warehouse teams." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/" }],
  }),
  component: Landing,
});

const PORTALS = [
  {
    role: "admin",
    to: "/login/admin",
    icon: Warehouse,
    title: "Operations Admin",
    copy: "Full command center: orders, inventory, allocation decisions, exceptions and analytics.",
    creds: "admin@smartfulfill.io / admin123",
  },
  {
    role: "worker",
    to: "/login/worker",
    icon: HardHat,
    title: "Warehouse Worker",
    copy: "Focused task queue for picking, packing, quality check and dispatch handover.",
    creds: "diego@smartfulfill.io / worker123",
  },
  {
    role: "customer",
    to: "/login/customer",
    icon: UserRound,
    title: "Customer",
    copy: "Track orders end to end with clear stage progress and delivery estimates.",
    creds: "ops@northwind.example / customer123",
  },
] as const;

const FLOW = [
  { icon: Boxes, label: "Inventory checked" },
  { icon: Brain, label: "Decision recommended" },
  { icon: PackageCheck, label: "Picked & packed" },
  { icon: ShieldCheck, label: "Quality verified" },
  { icon: Truck, label: "Dispatched" },
  { icon: BarChart3, label: "Analysed" },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <Warehouse className="size-5" />
          </span>
        <span className="font-display text-lg font-bold">SmartFulfill</span>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-20">
        <section className="py-12 md:py-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Warehouse operations control
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] md:text-6xl">
            A warehouse command center that decides, not just displays.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            SmartFulfill scores every order, spots shortages before they hurt, recommends the right allocation and drives the
            order through picking, packing, QC and dispatch — with a full audit trail behind every decision.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/login/admin">
                Enter control center <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login/worker">Open floor app</Link>
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-x-3 gap-y-3 rounded-xl border border-border bg-card/60 p-4">
            {FLOW.map((f, i) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <f.icon className="size-4 text-primary" />
                  {f.label}
                </div>
                {i < FLOW.length - 1 && <ArrowRight className="hidden size-3.5 text-border md:block" />}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold">Choose your portal</h2>
          <p className="mt-1 text-sm text-muted-foreground">Three role-specific experiences, one connected operation.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PORTALS.map((p) => (
              <Card key={p.role} className="group gap-3 p-5 transition-colors hover:border-primary/50">
                <span className="grid size-11 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                  <p.icon className="size-5" />
                </span>
                <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.copy}</p>
                <p className="rounded-lg bg-secondary px-3 py-2 font-mono text-[11px] text-muted-foreground">{p.creds}</p>
                <Button asChild variant="secondary" className="mt-1 w-full">
                  <Link to={p.to}>
                    Sign in as {p.role} <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
