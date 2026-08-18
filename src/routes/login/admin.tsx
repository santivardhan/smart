import { createFileRoute } from "@tanstack/react-router";

import { LoginScreen } from "@/components/login-form";

export const Route = createFileRoute("/login/admin")({
  head: () => ({
    meta: [
      { title: "Admin Sign In — SmartFulfill Control Center" },
      { name: "description", content: "Sign in to the SmartFulfill admin portal for full warehouse visibility, decisions and analytics." },
      { property: "og:title", content: "Admin Sign In — SmartFulfill" },
      { property: "og:description", content: "Full warehouse command center access for operations managers." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/login/admin" }],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  return (
    <LoginScreen
      role="admin"
      accent="primary"
      title="Run the whole floor from one control room."
      tagline="Operations manager access"
      description="Full visibility over orders, inventory, allocation decisions, exceptions and warehouse performance analytics."
      bullets={[
        "Priority scoring and allocation decisions with full reasoning",
        "Live bottleneck detection across every fulfilment stage",
        "Exception management, decision history and audit trail",
        "Operational analytics, inventory health and SLA risk",
      ]}
      redirect="/dashboard"
    />
  );
}
