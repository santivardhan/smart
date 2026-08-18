import type { InventoryItem, InventoryStatus, Order, PriorityLevel } from "./types";

/** Fixed clock so server render and client hydration always agree. */
export const NOW = new Date("2026-08-16T18:00:00.000Z");

export const hoursUntil = (iso: string) => (new Date(iso).getTime() - NOW.getTime()) / 3600000;

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function fmtRelative(iso: string) {
  const h = hoursUntil(iso);
  const abs = Math.abs(h);
  const unit = abs < 1 ? `${Math.round(abs * 60)}m` : abs < 48 ? `${abs.toFixed(1)}h` : `${Math.round(abs / 24)}d`;
  return h >= 0 ? `in ${unit}` : `${unit} ago`;
}

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/* -------------------------------------------------------------------------- */
/*  Transparent rule-based priority engine                                     */
/*  Urgency 40% · SLA risk 30% · Customer priority 20% · Order value 10%       */
/* -------------------------------------------------------------------------- */

export type PriorityResult = {
  score: number;
  priority: PriorityLevel;
  reasons: string[];
  breakdown: { label: string; weight: number; raw: number; points: number; note: string }[];
};

export function scoreOrder(input: {
  slaDeadline: string;
  createdAt: string;
  customerTier: Order["customerTier"];
  value: number;
}): PriorityResult {
  const h = hoursUntil(input.slaDeadline);

  // Urgency — how close the deadline is (0h => 100, 72h+ => 0)
  const urgencyRaw = clamp(100 - (h / 72) * 100, 0, 100);
  // SLA risk — elapsed share of the promised window
  const total = Math.max(
    1,
    (new Date(input.slaDeadline).getTime() - new Date(input.createdAt).getTime()) / 3600000,
  );
  const elapsed = (NOW.getTime() - new Date(input.createdAt).getTime()) / 3600000;
  const slaRaw = clamp((elapsed / total) * 100, 0, 100);
  const tierRaw = input.customerTier === "platinum" ? 100 : input.customerTier === "gold" ? 65 : 30;
  const valueRaw = clamp((input.value / 4000) * 100, 0, 100);

  const breakdown = [
    { label: "Urgency", weight: 0.4, raw: urgencyRaw, points: urgencyRaw * 0.4, note: h < 0 ? "SLA already breached" : `${h.toFixed(1)}h until SLA deadline` },
    { label: "SLA risk", weight: 0.3, raw: slaRaw, points: slaRaw * 0.3, note: `${slaRaw.toFixed(0)}% of the promise window consumed` },
    { label: "Customer priority", weight: 0.2, raw: tierRaw, points: tierRaw * 0.2, note: `${input.customerTier} tier account` },
    { label: "Order value", weight: 0.1, raw: valueRaw, points: valueRaw * 0.1, note: money(input.value) },
  ];

  const score = Math.round(breakdown.reduce((s, b) => s + b.points, 0));
  const priority: PriorityLevel =
    score >= 80 ? "critical" : score >= 60 ? "high" : score >= 40 ? "normal" : "low";

  const reasons: string[] = [];
  if (h < 0) reasons.push("SLA deadline has been breached");
  else if (h < 8) reasons.push("SLA deadline approaching within 8 hours");
  if (slaRaw > 70) reasons.push("Most of the promised fulfilment window is consumed");
  if (input.customerTier !== "standard") reasons.push(`${cap(input.customerTier)} customer priority`);
  if (input.value >= 2000) reasons.push("High order value");
  if (reasons.length === 0) reasons.push("Standard order — comfortable SLA buffer");

  return { score, priority, reasons, breakdown };
}

export const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function inventoryStatus(i: InventoryItem): InventoryStatus {
  if (i.available <= 0) return "out";
  if (i.damaged > 0 && i.damaged >= i.available) return "damaged";
  if (i.available <= i.reorderLevel) return "low";
  if (i.reserved > i.available) return "reserved";
  return "healthy";
}

export function slaRisk(o: Order): "on_time" | "at_risk" | "delayed" {
  const h = hoursUntil(o.slaDeadline);
  if (o.stage === "completed") return "on_time";
  if (h < 0) return "delayed";
  if (h < 8) return "at_risk";
  return "on_time";
}

/** Simplified nearest-neighbour pick-route optimisation over bin labels. */
export function optimiseRoute(bins: string[]) {
  const original = [...bins];
  const optimised = [...bins].sort((a, b) => a.localeCompare(b));
  let swaps = 0;
  original.forEach((b, i) => {
    if (optimised[i] !== b) swaps++;
  });
  const distanceSaved = swaps * 12; // metres
  return {
    original,
    optimised,
    distanceSaved,
    minutesSaved: Math.round((distanceSaved / 60) * 10) / 10,
  };
}
