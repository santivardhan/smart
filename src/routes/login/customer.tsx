import { createFileRoute } from "@tanstack/react-router";

import { LoginScreen } from "@/components/login-form";

export const Route = createFileRoute("/login/customer")({
  head: () => ({
    meta: [
      { title: "Customer Sign In — Track Your SmartFulfill Orders" },
      { name: "description", content: "Sign in to track your orders, delivery estimates and fulfilment progress in real time." },
      { property: "og:title", content: "Customer Sign In — SmartFulfill" },
      { property: "og:description", content: "Track every order from placement to delivery." },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/login/customer" }],
  }),
  component: CustomerLogin,
});

function CustomerLogin() {
  return (
    <LoginScreen
      role="customer"
      accent="info"
      title="Know exactly where your order is."
      tagline="Customer portal access"
      description="Follow every order from placement to delivery with clear stage tracking and delivery estimates."
      bullets={[
        "Live order tracking across every fulfilment stage",
        "Estimated delivery windows and carrier tracking IDs",
        "Order history, invoices and line-level detail",
        "Notifications when your order moves forward",
      ]}
      redirect="/customer/dashboard"
    />
  );
}
