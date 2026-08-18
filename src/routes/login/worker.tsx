import { createFileRoute } from "@tanstack/react-router";

import { LoginScreen } from "@/components/login-form";

export const Route = createFileRoute("/login/worker")({
  head: () => ({
    meta: [
      { title: "Worker Sign In — SmartFulfill Floor App" },
      { name: "description", content: "Warehouse floor sign in for picking, packing, quality check and dispatch tasks." },
      { property: "og:title", content: "Worker Sign In — SmartFulfill" },
      { property: "og:description", content: "Your assigned picking, packing and QC tasks in one focused queue." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/login/worker" }],
  }),
  component: WorkerLogin,
});

function WorkerLogin() {
  return (
    <LoginScreen
      role="worker"
      accent="warning"
      title="Your tasks, your zone, your queue."
      tagline="Warehouse floor access"
      description="A focused workspace for pickers and packers: assigned tasks, optimised pick routes and one-tap exception reporting."
      bullets={[
        "Assigned picking tasks with optimised bin routing",
        "Packing checklist workstation with verification gates",
        "Quality check bench and dispatch handover",
        "Report missing, damaged or wrong SKUs instantly",
      ]}
      redirect="/worker/dashboard"
    />
  );
}
