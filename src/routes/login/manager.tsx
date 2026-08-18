import { createFileRoute } from "@tanstack/react-router";

import { LoginScreen } from "@/components/login-form";

export const Route = createFileRoute("/login/manager")({
  head: () => ({
    meta: [
      { title: "Manager Sign In — SmartFulfill Operations" },
      { name: "description", content: "Sign in to the SmartFulfill manager portal for decisions, bottleneck detection, workforce balancing and analytics." },
      { property: "og:title", content: "Manager Sign In — SmartFulfill" },
      { property: "og:description", content: "Operations, decisions and analytics access for warehouse managers." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/login/manager" }],
  }),
  component: ManagerLogin,
});

function ManagerLogin() {
  return (
    <LoginScreen
      role="manager"
      accent="info"
      title="Decide faster than the queue grows."
      tagline="Warehouse manager access"
      description="Operational control over allocation, bottlenecks, workforce balancing and the what-if simulator — without financial or user administration."
      bullets={[
        "Decision center with recommendation, reasoning and expected impact",
        "Live bottleneck detection with one-click workforce rebalancing",
        "Warehouse zone map, congestion and exception heat",
        "What-if simulator for staffing and volume changes",
      ]}
      redirect="/dashboard"
    />
  );
}
