import { clamp, hoursUntil, inventoryStatus, slaRisk } from "./engine";
import { CYCLE_COUNTS, DEMAND_SIGNALS } from "./ops-data";
import { STAGE_TIMES } from "./mock-data";
import type { Feedback, InventoryItem, Order, Station, WarehouseException, WorkerAssignment } from "./types";

export const STATIONS: Station[] = ["Picking", "Packing", "QC", "Dispatch"];

/* --------------------------- warehouse health ----------------------------- */

export type HealthPart = { label: string; value: number; target: number };

export function warehouseHealth(
  orders: Order[],
  inventory: InventoryItem[],
  exceptions: WarehouseException[],
): { score: number; parts: HealthPart[]; weakest: HealthPart } {
  const done = orders.filter((o) => o.stage === "completed").length;
  const fulfilment = Math.round((done / Math.max(1, orders.length)) * 100);
  const accuracy = inventoryAccuracy(inventory);
  const stageHealth = (stage: string) => {
    const s = STAGE_TIMES.find((t) => t.stage === stage);
    if (!s) return 90;
    return Math.round(clamp((s.target / s.actual) * 100, 0, 100));
  };
  const qcFails = exceptions.filter((e) => e.type === "QC Failure").length;
  const parts: HealthPart[] = [
    { label: "Fulfilment", value: fulfilment, target: 95 },
    { label: "Inventory accuracy", value: accuracy, target: 98 },
    { label: "Picking", value: stageHealth("Picking"), target: 90 },
    { label: "Packing", value: stageHealth("Packing"), target: 90 },
    { label: "Quality check", value: Math.round(clamp(100 - qcFails * 6, 0, 100)), target: 95 },
    { label: "Dispatch", value: stageHealth("Dispatch"), target: 90 },
  ];
  const score = Math.round(parts.reduce((s, p) => s + p.value, 0) / parts.length);
  const weakest = [...parts].sort((a, b) => a.value / a.target - b.value / b.target)[0]!;
  return { score, parts, weakest };
}

export function inventoryAccuracy(inventory: InventoryItem[]) {
  const counted = inventory.filter((i) => CYCLE_COUNTS[i.sku] !== undefined);
  if (!counted.length) return 100;
  const expected = counted.reduce((s, i) => s + i.available, 0);
  const diff = counted.reduce((s, i) => s + Math.abs(i.available - (CYCLE_COUNTS[i.sku] ?? i.available)), 0);
  return Math.round(clamp(100 - (diff / Math.max(1, expected)) * 100, 0, 100));
}

/* ---------------------------- inventory anomalies ------------------------- */

export type Anomaly = {
  sku: string;
  name: string;
  zone: string;
  bin: string;
  type: string;
  expected: number;
  physical: number;
  difference: number;
  risk: "critical" | "high" | "medium" | "low";
  recommendation: string;
};

export function detectAnomalies(inventory: InventoryItem[]): Anomaly[] {
  const out: Anomaly[] = [];
  inventory.forEach((i) => {
    const physical = CYCLE_COUNTS[i.sku];
    const signal = DEMAND_SIGNALS[i.sku];
    if (physical !== undefined && physical !== i.available) {
      const diff = physical - i.available;
      const pct = Math.abs(diff) / Math.max(1, i.available);
      out.push({
        sku: i.sku,
        name: i.name,
        zone: i.zone,
        bin: i.bin,
        type: diff < 0 ? "Stock mismatch — unexpected reduction" : "Incorrect bin quantity",
        expected: i.available,
        physical,
        difference: diff,
        risk: pct > 0.2 ? "critical" : pct > 0.1 ? "high" : "medium",
        recommendation: `Verify bin ${i.bin} in Zone ${i.zone} before allocating further stock.`,
      });
    }
    if (i.damaged >= 3) {
      out.push({
        sku: i.sku,
        name: i.name,
        zone: i.zone,
        bin: i.bin,
        type: "Damage pattern",
        expected: 0,
        physical: i.damaged,
        difference: -i.damaged,
        risk: i.damaged >= 4 ? "high" : "medium",
        recommendation: `${i.damaged} damaged units quarantined — inspect handling at ${i.bin}.`,
      });
    }
    if (signal && signal.demandChange >= 18 && i.available <= i.reorderLevel * 1.5) {
      out.push({
        sku: i.sku,
        name: i.name,
        zone: i.zone,
        bin: i.bin,
        type: "Demand spike vs falling cover",
        expected: i.reorderLevel * 2,
        physical: i.available,
        difference: i.available - i.reorderLevel * 2,
        risk: i.available <= i.reorderLevel ? "critical" : "high",
        recommendation: `Demand up ${signal.demandChange}% while stock moved ${signal.stockChange}% — raise a replenishment task.`,
      });
    }
    if (signal && signal.demandChange <= -10 && i.available > i.reorderLevel * 3) {
      out.push({
        sku: i.sku,
        name: i.name,
        zone: i.zone,
        bin: i.bin,
        type: "Demand drop with excess cover",
        expected: i.reorderLevel * 2,
        physical: i.available,
        difference: i.available - i.reorderLevel * 2,
        risk: "low",
        recommendation: `Demand down ${Math.abs(signal.demandChange)}% — pause replenishment and review pricing.`,
      });
    }
  });
  return out.sort((a, b) => rank(b.risk) - rank(a.risk));
}

const rank = (r: Anomaly["risk"]) => ({ critical: 4, high: 3, medium: 2, low: 1 })[r];

export function discrepancyByZone(anomalies: Anomaly[]) {
  const zones = ["A", "B", "C"];
  return zones.map((z) => ({
    name: `Zone ${z}`,
    value: anomalies.filter((a) => a.zone === z).reduce((s, a) => s + Math.abs(a.difference), 0),
  }));
}

/* ------------------------------- pricing ---------------------------------- */

export type PriceIdea = {
  sku: string;
  name: string;
  price: number;
  demandChange: number;
  stock: number;
  suggested: number;
  action: "Increase" | "Decrease" | "Maintain";
  why: string;
  projectedRevenue: number;
  projectedMargin: number;
};

export function pricingIdeas(inventory: InventoryItem[]): PriceIdea[] {
  return inventory
    .filter((i) => DEMAND_SIGNALS[i.sku])
    .map((i) => {
      const s = DEMAND_SIGNALS[i.sku]!;
      const low = i.available <= i.reorderLevel * 1.5;
      const high = i.available > i.reorderLevel * 3;
      let action: PriceIdea["action"] = "Maintain";
      let factor = 1;
      if (s.demandChange > 8 && low) {
        action = "Increase";
        factor = 1.06;
      } else if (s.demandChange < -8 && high) {
        action = "Decrease";
        factor = 0.93;
      }
      const suggested = Math.round(i.unitPrice * factor);
      return {
        sku: i.sku,
        name: i.name,
        price: i.unitPrice,
        demandChange: s.demandChange,
        stock: i.available,
        suggested,
        action,
        why:
          action === "Increase"
            ? `Demand up ${s.demandChange}% while inventory moved ${s.stockChange}% — cover is tightening.`
            : action === "Decrease"
              ? `Demand down ${Math.abs(s.demandChange)}% with ${i.available} units on hand — cover exceeds 3× reorder level.`
              : `Demand and cover are both stable — no price change justified.`,
        projectedRevenue: suggested * s.unitsSold,
        projectedMargin: Math.round(((suggested - i.unitPrice * 0.68) / suggested) * 100),
      };
    });
}

/* --------------------------- bottleneck / workforce ----------------------- */

export type StageLoad = {
  station: Station;
  queue: number;
  workers: number;
  capacity: number;
  processingMin: number;
  targetMin: number;
  utilisation: number;
  slaRisk: number;
};

export function stageLoads(orders: Order[], workforce: WorkerAssignment[]): StageLoad[] {
  const stageOf: Record<Station, Order["stage"]> = { Picking: "picking", Packing: "packing", QC: "qc", Dispatch: "dispatch" };
  return STATIONS.map((station) => {
    const queueOrders = orders.filter((o) => o.stage === stageOf[station]);
    const workers = workforce.filter((w) => w.station === station && w.status !== "inactive").length;
    const timing = STAGE_TIMES.find((t) => t.stage === station) ?? { actual: 5, target: 5 };
    const perWorker = Math.max(1, Math.round(60 / Math.max(1, timing.actual)));
    const capacity = workers * perWorker;
    const queue = queueOrders.length;
    return {
      station,
      queue,
      workers,
      capacity,
      processingMin: timing.actual,
      targetMin: timing.target,
      utilisation: Math.round(clamp((queue / Math.max(1, capacity)) * 100, 0, 200)),
      slaRisk: queueOrders.filter((o) => slaRisk(o) !== "on_time").length,
    };
  });
}

export function detectBottleneck(loads: StageLoad[]) {
  const worst = [...loads].sort((a, b) => b.processingMin / b.targetMin - a.processingMin / a.targetMin)[0]!;
  const donor = [...loads].sort((a, b) => a.utilisation - b.utilisation)[0]!;
  const need = worst.processingMin > worst.targetMin ? Math.max(1, Math.round(worst.queue / Math.max(1, worst.capacity))) : 0;
  return {
    ...worst,
    donor: donor.station,
    workersNeeded: Math.min(2, Math.max(1, need)),
    over: Math.round((worst.processingMin / worst.targetMin - 1) * 100),
    recommendation: `Move ${Math.min(2, Math.max(1, need))} available worker(s) from ${donor.station} to ${worst.station}.`,
  };
}

/* ------------------------------- simulator -------------------------------- */

export type SimInput = { picking: number; packing: number; qc: number; volume: number; availability: number };

export type SimMetrics = {
  fulfilment: number;
  processingMin: number;
  delayedOrders: number;
  utilisation: number;
  slaCompliance: number;
};

export function simulate(base: SimInput, next: SimInput, current: SimMetrics): SimMetrics {
  const capRatio = (n: number, b: number) => (b === 0 ? 1 : n / b);
  const staff = (capRatio(next.picking, base.picking) * 0.4 + capRatio(next.packing, base.packing) * 0.4 + capRatio(next.qc, base.qc) * 0.2) || 1;
  const load = capRatio(next.volume, base.volume);
  const stress = load / staff;
  const stock = next.availability / 100;

  const processingMin = round1(current.processingMin * clamp(stress, 0.45, 2.2));
  const fulfilment = Math.round(clamp(current.fulfilment * (1 / clamp(stress, 0.6, 2)) * (0.7 + stock * 0.3), 30, 99));
  const delayedOrders = Math.max(0, Math.round(current.delayedOrders * clamp(stress, 0.2, 2.5) * (2 - stock)));
  const utilisation = Math.round(clamp(current.utilisation * clamp(stress, 0.3, 2), 15, 130));
  const slaCompliance = Math.round(clamp(current.slaCompliance * (1 / clamp(stress, 0.65, 1.9)) * (0.75 + stock * 0.25), 30, 99));
  return { fulfilment, processingMin, delayedOrders, utilisation, slaCompliance };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/* -------------------------------- finance --------------------------------- */

export function financeSummary(orders: Order[], inventory: InventoryItem[]) {
  const completed = orders.filter((o) => o.stage === "completed");
  const revenue = completed.reduce((s, o) => s + o.value, 0);
  const inventoryCost = Math.round(revenue * 0.58);
  const packaging = Math.round(completed.reduce((s, o) => s + o.items.length * 3.4, 0));
  const shipping = Math.round(completed.length * 18.5);
  const labour = Math.round(completed.reduce((s, o) => s + o.items.reduce((n, i) => n + i.qty, 0) * 1.9, 0));
  const cost = inventoryCost + packaging + shipping + labour;
  const profit = revenue - cost;
  const holding = inventory.reduce((s, i) => s + i.available * i.unitPrice, 0);
  return {
    revenue,
    cost,
    inventoryCost,
    packaging,
    shipping,
    labour,
    profit,
    margin: revenue ? Math.round((profit / revenue) * 100) : 0,
    holding,
  };
}

/* ------------------------------- zones ------------------------------------ */

export type ZoneMetrics = {
  zone: "A" | "B" | "C" | "D";
  label: string;
  orders: number;
  workers: number;
  pendingTasks: number;
  exceptions: number;
  inventory: number;
  utilisation: number;
  heat: "low" | "medium" | "high" | "critical";
};

export function zoneMetrics(
  orders: Order[],
  inventory: InventoryItem[],
  exceptions: WarehouseException[],
  workforce: WorkerAssignment[],
): ZoneMetrics[] {
  const zones: ZoneMetrics["zone"][] = ["A", "B", "C", "D"];
  const label: Record<string, string> = { A: "Receiving & fast pick", B: "Bulk storage & packing", C: "Slow movers & QC", D: "Dispatch & staging" };
  return zones.map((z) => {
    const skus = inventory.filter((i) => i.zone === z).map((i) => i.sku);
    const zoneOrders = z === "D"
      ? orders.filter((o) => o.stage === "dispatch")
      : orders.filter((o) => o.stage !== "completed" && o.items.some((i) => skus.includes(i.sku)));
    const workers = workforce.filter((w) => w.zone === z && w.status !== "inactive").length;
    const exc = exceptions.filter((e) => e.status !== "resolved" && (e.sku ? skus.includes(e.sku) : zoneOrders.some((o) => o.id === e.orderId))).length;
    const pending = zoneOrders.filter((o) => o.stage !== "dispatch").length;
    const stock = inventory.filter((i) => i.zone === z).reduce((s, i) => s + i.available, 0);
    const utilisation = Math.round(clamp(zoneOrders.length * 12 + exc * 9 + (workers ? 0 : 20), 5, 100));
    return {
      zone: z,
      label: label[z]!,
      orders: zoneOrders.length,
      workers,
      pendingTasks: pending,
      exceptions: exc,
      inventory: stock,
      utilisation,
      heat: utilisation >= 80 ? "critical" : utilisation >= 60 ? "high" : utilisation >= 35 ? "medium" : "low",
    };
  });
}

/* ------------------------------- feedback --------------------------------- */

export function feedbackStats(feedback: Feedback[]) {
  const rated = feedback.filter((f) => typeof f.rating === "number");
  const avg = rated.length ? rated.reduce((s, f) => s + (f.rating ?? 0), 0) / rated.length : 0;
  const byCategory = Object.entries(
    feedback.reduce<Record<string, number>>((acc, f) => ({ ...acc, [f.category]: (acc[f.category] ?? 0) + 1 }), {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const distribution = [5, 4, 3, 2, 1].map((r) => ({ name: `${r}★`, value: rated.filter((f) => f.rating === r).length }));
  return {
    average: Math.round(avg * 10) / 10,
    total: feedback.length,
    positive: rated.filter((f) => (f.rating ?? 0) >= 4).length,
    negative: rated.filter((f) => (f.rating ?? 0) <= 2).length,
    open: feedback.filter((f) => f.status !== "resolved" && f.status !== "closed").length,
    byCategory,
    distribution,
  };
}

/* ------------------------------- tracking --------------------------------- */

export const TRACKING_STEPS = ["Confirmed", "Allocated", "Picking", "Packing", "Quality check", "Dispatched", "In transit", "Delivered"];

export function trackingIndex(o: Order) {
  const map: Record<string, number> = { created: 0, prioritized: 0, allocated: 1, picking: 2, packing: 3, qc: 4, dispatch: 5, completed: 7 };
  return map[o.stage] ?? 0;
}

export function etaHours(o: Order) {
  return Math.max(0, Math.round(hoursUntil(o.slaDeadline)));
}

export function lowStockList(inventory: InventoryItem[]) {
  return inventory.filter((i) => ["low", "out"].includes(inventoryStatus(i)));
}
