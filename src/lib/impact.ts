import { slaRisk } from "./engine";
import { inventoryAccuracy } from "./ops";
import type { InventoryItem, Order } from "./types";

/** Measured operational metrics — always derived from live state, never simulated. */
export type OpsMetrics = {
  fulfilment: number;
  delayed: number;
  accuracy: number;
  slaCompliance: number;
  inFlight: number;
};

export function opsMetrics(orders: Order[], inventory: InventoryItem[]): OpsMetrics {
  const total = Math.max(1, orders.length);
  const done = orders.filter((o) => o.stage === "completed").length;
  const delayed = orders.filter((o) => slaRisk(o) === "delayed").length;
  const inFlight = orders.filter((o) => o.stage !== "completed").length;
  return {
    fulfilment: Math.round((done / total) * 100),
    delayed,
    accuracy: inventoryAccuracy(inventory),
    slaCompliance: Math.round(((orders.length - delayed) / total) * 100),
    inFlight,
  };
}

export type ImpactSnapshot = {
  label: string;
  at: string;
  before: OpsMetrics;
  after: OpsMetrics;
};

export const IMPACT_ROWS: { key: keyof OpsMetrics; label: string; suffix: string; higherIsBetter: boolean }[] = [
  { key: "fulfilment", label: "Fulfilment", suffix: "%", higherIsBetter: true },
  { key: "slaCompliance", label: "SLA compliance", suffix: "%", higherIsBetter: true },
  { key: "accuracy", label: "Inventory accuracy", suffix: "%", higherIsBetter: true },
  { key: "delayed", label: "Delayed orders", suffix: "", higherIsBetter: false },
  { key: "inFlight", label: "Orders in flight", suffix: "", higherIsBetter: false },
];
