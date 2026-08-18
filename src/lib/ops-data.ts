import { NOW } from "./engine";
import type { Feedback, WorkerAssignment } from "./types";

const iso = (hoursFromNow: number) => new Date(NOW.getTime() + hoursFromNow * 3600000).toISOString();

export function seedWorkforce(): WorkerAssignment[] {
  return [
    { id: "W-01", name: "Diego Alvarez", jobRole: "Picker", zone: "A", station: "Picking", currentTask: "ORD-1044 · pick 2 lines", status: "active", tasksCompleted: 24, productivity: 96, exceptions: 1 },
    { id: "W-02", name: "Amara Osei", jobRole: "Picker", zone: "B", station: "Picking", currentTask: "ORD-1045 · pick 2 lines", status: "active", tasksCompleted: 19, productivity: 92, exceptions: 0 },
    { id: "W-03", name: "Ken Osborne", jobRole: "Picker", zone: "C", station: "Picking", currentTask: "Idle — queue cleared", status: "idle", tasksCompleted: 21, productivity: 84, exceptions: 2 },
    { id: "W-04", name: "Lena Fischer", jobRole: "Packer", zone: "B", station: "Packing", currentTask: "ORD-1046 · packing bench 1", status: "active", tasksCompleted: 31, productivity: 78, exceptions: 3 },
    { id: "W-05", name: "Tomas Berg", jobRole: "QC Inspector", zone: "C", station: "QC", currentTask: "ORD-1048 · inspection", status: "active", tasksCompleted: 17, productivity: 94, exceptions: 1 },
    { id: "W-06", name: "Nadia Haddad", jobRole: "Dispatch Handler", zone: "D", station: "Dispatch", currentTask: "Dock 2 · carrier handover", status: "active", tasksCompleted: 14, productivity: 91, exceptions: 0 },
    { id: "W-07", name: "Ravi Shetty", jobRole: "Picker", zone: "A", station: "Picking", currentTask: "Idle — awaiting assignment", status: "idle", tasksCompleted: 12, productivity: 88, exceptions: 0 },
    { id: "W-08", name: "Grace Miller", jobRole: "Packer", zone: "B", station: "Packing", currentTask: "On break", status: "break", tasksCompleted: 9, productivity: 74, exceptions: 1 },
  ];
}

export function seedFeedback(): Feedback[] {
  return [
    { id: "FB-201", source: "customer", author: "Northwind Retail", orderId: "ORD-1040", rating: 5, category: "Delivery", comment: "Split shipment arrived a day early and both parcels were tracked correctly.", at: iso(-22), status: "closed", response: "Thanks — noted for the carrier scorecard." },
    { id: "FB-202", source: "customer", author: "Lakeside Electronics", orderId: "ORD-1038", rating: 2, category: "Packaging", comment: "Outer carton was crushed on arrival, the mice inside were fine but presentation was poor.", at: iso(-18), status: "in_progress" },
    { id: "FB-203", source: "customer", author: "Priya Raman", orderId: "ORD-1039", rating: 4, category: "Quality", comment: "Product exactly as described, only the invoice was missing from the box.", at: iso(-12), status: "reviewing" },
    { id: "FB-204", source: "worker", author: "Lena Fischer", sku: "SKU-1013", category: "Packing", comment: "Packing bench 1 runs out of medium cartons every afternoon which stalls the queue.", at: iso(-6), status: "new" },
    { id: "FB-205", source: "worker", author: "Ken Osborne", sku: "SKU-1016", category: "Inventory Accuracy", comment: "Bin B-12 count does not match the system, third time this week.", at: iso(-4), status: "in_progress" },
    { id: "FB-206", source: "worker", author: "Amara Osei", category: "Location", comment: "Fast-moving SKUs in Zone C are stored at the far end, adds walking time to every pick.", at: iso(-3), status: "new" },
    { id: "FB-207", source: "customer", author: "Marcus Webb", orderId: "ORD-1047", rating: 3, category: "Availability", comment: "Had to wait because one item was out of stock at the time of ordering.", at: iso(-2), status: "new" },
  ];
}

/** Financial series derived from the same order/inventory dataset scale. */
export const FINANCE_TREND = [
  { day: "Aug 10", revenue: 21400, cost: 15100 },
  { day: "Aug 11", revenue: 24800, cost: 16400 },
  { day: "Aug 12", revenue: 19200, cost: 15800 },
  { day: "Aug 13", revenue: 26900, cost: 17300 },
  { day: "Aug 14", revenue: 22600, cost: 16900 },
  { day: "Aug 15", revenue: 28400, cost: 18100 },
  { day: "Aug 16", revenue: 24100, cost: 17600 },
];

export const COST_SPLIT = [
  { name: "Inventory", value: 61 },
  { name: "Labour", value: 18 },
  { name: "Shipping", value: 12 },
  { name: "Packaging", value: 9 },
];

/** Rule inputs for the pricing engine: 7-day demand and stock movement per SKU. */
export const DEMAND_SIGNALS: Record<string, { demandChange: number; stockChange: number; unitsSold: number }> = {
  "SKU-1001": { demandChange: 18, stockChange: -12, unitsSold: 42 },
  "SKU-1002": { demandChange: -6, stockChange: 9, unitsSold: 31 },
  "SKU-1003": { demandChange: 12, stockChange: -8, unitsSold: 27 },
  "SKU-1005": { demandChange: 24, stockChange: -15, unitsSold: 19 },
  "SKU-1007": { demandChange: -11, stockChange: 14, unitsSold: 58 },
  "SKU-1010": { demandChange: 3, stockChange: 1, unitsSold: 76 },
  "SKU-1011": { demandChange: 9, stockChange: -4, unitsSold: 12 },
  "SKU-1013": { demandChange: -14, stockChange: 11, unitsSold: 15 },
  "SKU-1016": { demandChange: 21, stockChange: -9, unitsSold: 18 },
  "SKU-1019": { demandChange: 2, stockChange: 0, unitsSold: 8 },
};

/** Physical cycle-count results used to detect inventory discrepancies. */
export const CYCLE_COUNTS: Record<string, number> = {
  "SKU-1001": 7,
  "SKU-1002": 124,
  "SKU-1003": 12,
  "SKU-1006": 59,
  "SKU-1009": 96,
  "SKU-1011": 20,
  "SKU-1016": 21,
  "SKU-1017": 5,
};

export const ACCURACY_TREND = [
  { day: "Aug 10", accuracy: 96.4 },
  { day: "Aug 11", accuracy: 97.1 },
  { day: "Aug 12", accuracy: 95.2 },
  { day: "Aug 13", accuracy: 96.8 },
  { day: "Aug 14", accuracy: 94.9 },
  { day: "Aug 15", accuracy: 95.6 },
  { day: "Aug 16", accuracy: 96.2 },
];
