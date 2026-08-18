import { NOW, scoreOrder } from "./engine";
import type {
  ActivityEvent,
  AppNotification,
  DecisionRecord,
  InventoryItem,
  Order,
  OrderItem,
  PendingDecision,
  Stage,
  WarehouseException,
  Worker,
} from "./types";

const iso = (hoursFromNow: number) => new Date(NOW.getTime() + hoursFromNow * 3600000).toISOString();

type P = [sku: string, name: string, cat: string, zone: string, bin: string, avail: number, res: number, dmg: number, reorder: number, price: number];

const PRODUCTS: P[] = [
  ["SKU-1001", "Wireless Keyboard", "Peripherals", "A", "A-01", 7, 10, 0, 15, 49],
  ["SKU-1002", "USB-C Charger 65W", "Power", "A", "A-02", 128, 24, 2, 40, 35],
  ["SKU-1003", "Bluetooth Earbuds", "Audio", "A", "A-03", 12, 8, 1, 20, 89],
  ["SKU-1004", "Mechanical Keyboard", "Peripherals", "A", "A-04", 0, 0, 3, 12, 139],
  ["SKU-1005", "Smart Watch Series 6", "Wearables", "A", "A-05", 44, 12, 0, 15, 249],
  ["SKU-1006", "Office Backpack", "Accessories", "B", "B-01", 63, 6, 0, 20, 79],
  ["SKU-1007", "Wireless Mouse", "Peripherals", "B", "B-02", 210, 30, 0, 50, 29],
  ["SKU-1008", "Laptop Stand Aluminium", "Accessories", "B", "B-03", 18, 4, 0, 20, 59],
  ["SKU-1009", "Power Bank 20000mAh", "Power", "B", "B-04", 96, 18, 4, 30, 45],
  ["SKU-1010", "HDMI Cable 2m", "Cables", "B", "B-05", 340, 40, 0, 60, 12],
  ["SKU-1011", "27-inch 4K Monitor", "Displays", "C", "C-01", 22, 9, 1, 10, 379],
  ["SKU-1012", "Webcam 1080p", "Peripherals", "C", "C-02", 9, 5, 0, 15, 69],
  ["SKU-1013", "Noise Cancelling Headset", "Audio", "C", "C-03", 31, 7, 2, 12, 199],
  ["SKU-1014", "Ergonomic Chair Cushion", "Accessories", "C", "C-04", 0, 0, 0, 10, 39],
  ["SKU-1015", "USB Hub 7-Port", "Cables", "A", "A-06", 74, 10, 0, 25, 34],
  ["SKU-1016", "Portable SSD 1TB", "Storage", "B", "B-12", 26, 3, 0, 10, 129],
  ["SKU-1017", "Desk Lamp LED", "Accessories", "C", "C-05", 5, 2, 1, 12, 42],
  ["SKU-1018", "Wireless Charging Pad", "Power", "A", "A-07", 88, 14, 0, 30, 32],
  ["SKU-1019", "Conference Speakerphone", "Audio", "C", "C-06", 14, 6, 0, 8, 219],
  ["SKU-1020", "Cable Management Tray", "Accessories", "B", "B-06", 152, 12, 0, 40, 24],
];

export function seedInventory(): InventoryItem[] {
  return PRODUCTS.map(([sku, name, category, zone, bin, available, reserved, damaged, reorderLevel, unitPrice], i) => ({
    sku,
    name,
    category,
    zone,
    bin,
    available,
    reserved,
    damaged,
    reorderLevel,
    unitPrice,
    movements: [
      { id: `${sku}-m1`, at: iso(-72 + i), type: "inbound" as const, qty: available + reserved + 20, note: "Goods receipt from supplier PO-88" + (100 + i) },
      { id: `${sku}-m2`, at: iso(-30 + i), type: "outbound" as const, qty: 20, note: "Dispatched against fulfilled orders" },
      ...(reserved ? [{ id: `${sku}-m3`, at: iso(-6), type: "reserve" as const, qty: reserved, note: "Reserved for open allocations" }] : []),
      ...(damaged ? [{ id: `${sku}-m4`, at: iso(-12), type: "damage" as const, qty: damaged, note: "Quarantined after QC inspection" }] : []),
    ],
  }));
}

const CUSTOMERS: [name: string, email: string, tier: Order["customerTier"]][] = [
  ["Northwind Retail", "ops@northwind.example", "platinum"],
  ["Lakeside Electronics", "buying@lakeside.example", "gold"],
  ["Priya Raman", "priya.raman@example.com", "gold"],
  ["Halcyon Tech Co.", "supply@halcyon.example", "platinum"],
  ["Marcus Webb", "marcus.webb@example.com", "standard"],
  ["Bluepeak Offices", "facilities@bluepeak.example", "standard"],
  ["Sana Kapoor", "sana.kapoor@example.com", "standard"],
];

type OrderSeed = {
  id: string;
  c: number;
  items: [sku: string, qty: number][];
  sla: number;
  created: number;
  stage: Stage;
  alloc?: Order["allocationStatus"];
  picker?: string;
  pickStatus?: Order["pickStatus"];
  carrier?: string;
  dispatchPriority?: boolean;
};

const ORDER_SEEDS: OrderSeed[] = [
  { id: "ORD-1042", c: 0, items: [["SKU-1001", 10], ["SKU-1010", 4]], sla: 5, created: -20, stage: "prioritized", alloc: "pending" },
  { id: "ORD-1051", c: 5, items: [["SKU-1001", 5]], sla: 40, created: -8, stage: "prioritized", alloc: "pending" },
  { id: "ORD-1043", c: 3, items: [["SKU-1005", 6], ["SKU-1018", 6]], sla: 7, created: -26, stage: "allocated", alloc: "accepted" },
  { id: "ORD-1044", c: 1, items: [["SKU-1007", 12], ["SKU-1020", 8]], sla: 30, created: -14, stage: "picking", alloc: "accepted", picker: "Diego Alvarez", pickStatus: "in_progress" },
  { id: "ORD-1045", c: 2, items: [["SKU-1003", 2], ["SKU-1009", 1]], sla: 12, created: -18, stage: "picking", alloc: "accepted", picker: "Amara Osei", pickStatus: "queued" },
  { id: "ORD-1046", c: 4, items: [["SKU-1013", 3]], sla: 22, created: -10, stage: "packing", alloc: "accepted", picker: "Diego Alvarez", pickStatus: "done" },
  { id: "ORD-1047", c: 6, items: [["SKU-1016", 2], ["SKU-1010", 3]], sla: -2, created: -40, stage: "packing", alloc: "accepted", picker: "Ken Osborne", pickStatus: "done" },
  { id: "ORD-1048", c: 1, items: [["SKU-1011", 4]], sla: 9, created: -28, stage: "qc", alloc: "accepted", picker: "Amara Osei", pickStatus: "done" },
  { id: "ORD-1049", c: 3, items: [["SKU-1019", 2], ["SKU-1015", 4]], sla: 4, created: -30, stage: "dispatch", alloc: "accepted", picker: "Ken Osborne", pickStatus: "done", carrier: "SwiftLine Express" },
  { id: "ORD-1050", c: 0, items: [["SKU-1006", 10]], sla: -6, created: -52, stage: "dispatch", alloc: "accepted", picker: "Diego Alvarez", pickStatus: "done" },
  { id: "ORD-1052", c: 2, items: [["SKU-1012", 3]], sla: 34, created: -4, stage: "created" },
  { id: "ORD-1053", c: 6, items: [["SKU-1017", 2], ["SKU-1002", 2]], sla: 48, created: -3, stage: "created" },
  { id: "ORD-1038", c: 1, items: [["SKU-1007", 20]], sla: -30, created: -80, stage: "completed", alloc: "accepted", picker: "Amara Osei", pickStatus: "done", carrier: "Northstar Freight" },
  { id: "ORD-1039", c: 3, items: [["SKU-1005", 3], ["SKU-1013", 2]], sla: -26, created: -76, stage: "completed", alloc: "accepted", picker: "Ken Osborne", pickStatus: "done", carrier: "SwiftLine Express" },
  { id: "ORD-1040", c: 2, items: [["SKU-1010", 12]], sla: -20, created: -70, stage: "completed", alloc: "accepted", picker: "Diego Alvarez", pickStatus: "done", carrier: "MetroDrop" },
];

export function seedOrders(inventory: InventoryItem[]): Order[] {
  return ORDER_SEEDS.map((s) => {
    const [customer, customerEmail, customerTier] = CUSTOMERS[s.c]!;
    const items: OrderItem[] = s.items.map(([sku, qty]) => {
      const p = inventory.find((i) => i.sku === sku)!;
      const allocated = s.alloc === "accepted" ? Math.min(qty, qty) : 0;
      return { sku, name: p.name, qty, allocated };
    });
    const value = items.reduce((sum, it) => {
      const p = inventory.find((i) => i.sku === it.sku)!;
      return sum + p.unitPrice * it.qty;
    }, 0);
    const createdAt = iso(s.created);
    const slaDeadline = iso(s.sla);
    const sc = scoreOrder({ slaDeadline, createdAt, customerTier, value });
    const stageIdx = ["created", "prioritized", "allocated", "picking", "packing", "qc", "dispatch", "completed"].indexOf(s.stage);
    const timeline = [
      { id: `${s.id}-t0`, at: createdAt, title: "Order created", detail: `${items.length} line item(s) · ${customer}` },
      ...(stageIdx >= 1 ? [{ id: `${s.id}-t1`, at: iso(s.created + 0.2), title: "Priority assigned", detail: `${sc.priority.toUpperCase()} — score ${sc.score}` }] : []),
      ...(stageIdx >= 2 ? [{ id: `${s.id}-t2`, at: iso(s.created + 0.6), title: "Inventory allocated", detail: "Stock reserved across zones" }] : []),
      ...(stageIdx >= 3 ? [{ id: `${s.id}-t3`, at: iso(s.created + 1.2), title: "Picking started", detail: `Assigned to ${s.picker ?? "picking queue"}` }] : []),
      ...(stageIdx >= 4 ? [{ id: `${s.id}-t4`, at: iso(s.created + 2), title: "Picking completed", detail: "All lines picked and staged" }] : []),
      ...(stageIdx >= 5 ? [{ id: `${s.id}-t5`, at: iso(s.created + 2.7), title: "Packing completed", detail: "Package sealed and labelled" }] : []),
      ...(stageIdx >= 6 ? [{ id: `${s.id}-t6`, at: iso(s.created + 3.1), title: "QC approved", detail: "All quality checks passed" }] : []),
      ...(stageIdx >= 7 ? [{ id: `${s.id}-t7`, at: iso(s.created + 4), title: "Dispatched", detail: `Handed to ${s.carrier ?? "carrier"}` }] : []),
    ];
    return {
      id: s.id,
      customer,
      customerEmail,
      items,
      value,
      createdAt,
      slaDeadline,
      stage: s.stage,
      score: sc.score,
      priority: sc.priority,
      reasons: sc.reasons,
      customerTier,
      allocationStatus: s.alloc ?? "pending",
      picker: s.picker,
      pickStatus: s.pickStatus ?? "queued",
      packChecks: s.stage === "packing" && s.id === "ORD-1046" ? ["order", "sku"] : stageIdx >= 5 ? PACK_CHECKS.map((c) => c.id) : [],
      qcChecks: stageIdx >= 6 ? QC_CHECKS.map((c) => c.id) : [],
      carrier: s.carrier,
      trackingId: stageIdx >= 6 ? `SF${s.id.slice(-4)}${stageIdx}${s.c}XX` : undefined,
      dispatchPriority: !!s.dispatchPriority,
      timeline,
      delivered: s.stage === "completed",
    };
  });
}

export const PACK_CHECKS = [
  { id: "order", label: "Correct order", required: true },
  { id: "sku", label: "Correct SKU", required: true },
  { id: "qty", label: "Correct quantity", required: true },
  { id: "condition", label: "Product condition verified", required: true },
  { id: "packaging", label: "Packaging suitable", required: true },
  { id: "sealed", label: "Package sealed", required: true },
  { id: "label", label: "Shipping label applied", required: true },
];

export const QC_CHECKS = [
  { id: "sku", label: "SKU match" },
  { id: "qty", label: "Quantity match" },
  { id: "condition", label: "Product condition" },
  { id: "packaging", label: "Packaging integrity" },
  { id: "label", label: "Shipping label" },
];

export const WORKERS: Worker[] = [
  { id: "W-01", name: "Diego Alvarez", zone: "Zone A", shift: "06:00 – 14:00", tasksToday: 24, avgPickMin: 4.2 },
  { id: "W-02", name: "Amara Osei", zone: "Zone B", shift: "06:00 – 14:00", tasksToday: 19, avgPickMin: 3.8 },
  { id: "W-03", name: "Ken Osborne", zone: "Zone C", shift: "14:00 – 22:00", tasksToday: 21, avgPickMin: 5.1 },
  { id: "W-04", name: "Lena Fischer", zone: "Packing", shift: "06:00 – 14:00", tasksToday: 31, avgPickMin: 8.4 },
];

export const CARRIERS = ["SwiftLine Express", "Northstar Freight", "MetroDrop", "Harbour Logistics"];

export function seedExceptions(): WarehouseException[] {
  return [
    {
      id: "EXC-501",
      type: "Stock Shortage",
      orderId: "ORD-1042",
      sku: "SKU-1001",
      severity: "critical",
      detectedAt: iso(-2),
      status: "action_required",
      problem: "Order ORD-1042 requires 10 units of SKU-1001 (Wireless Keyboard); only 7 units are available.",
      recommendation: "Allocate the 7 available units to ORD-1042 (critical priority), place ORD-1051 on stock hold and raise a replenishment task for 25 units.",
      owner: "Allocation Desk",
    },
    {
      id: "EXC-502",
      type: "Damaged Item",
      orderId: "ORD-1046",
      sku: "SKU-1013",
      severity: "high",
      detectedAt: iso(-1.4),
      status: "action_required",
      problem: "Packer flagged 1 unit of SKU-1013 (Noise Cancelling Headset) with a crushed casing.",
      recommendation: "Replace the damaged unit from Bin B-12 replacement stock and return the order to Packing.",
      owner: "Lena Fischer",
    },
    {
      id: "EXC-503",
      type: "Dispatch Delay",
      orderId: "ORD-1050",
      severity: "critical",
      detectedAt: iso(-0.8),
      status: "open",
      problem: "ORD-1050 has breached its SLA deadline by 6 hours and is still awaiting carrier assignment.",
      recommendation: "Move ORD-1050 to the priority dispatch queue and assign the next available carrier.",
      owner: "Dispatch Desk",
    },
    {
      id: "EXC-504",
      type: "QC Failure",
      orderId: "ORD-1048",
      severity: "medium",
      detectedAt: iso(-3),
      status: "investigating",
      problem: "One monitor in ORD-1048 failed the packaging integrity check on the first inspection pass.",
      recommendation: "Re-inspect after repackaging; if it fails again send the order back to Packing.",
      owner: "QC Bench 2",
    },
    {
      id: "EXC-505",
      type: "Picking Delay",
      orderId: "ORD-1045",
      severity: "medium",
      detectedAt: iso(-1.1),
      status: "open",
      problem: "Pick task for ORD-1045 has been queued for over an hour in Zone A.",
      recommendation: "Reassign the pick to Amara Osei and run the optimised route to recover 6 minutes.",
      owner: "Zone A Lead",
    },
    {
      id: "EXC-506",
      type: "Missing Item",
      orderId: "ORD-1047",
      sku: "SKU-1016",
      severity: "high",
      detectedAt: iso(-4),
      status: "escalated",
      problem: "1 unit of SKU-1016 (Portable SSD 1TB) could not be located in Bin B-12 during picking.",
      recommendation: "Trigger a cycle count for Bin B-12 and substitute from overflow stock.",
      owner: "Inventory Control",
    },
    {
      id: "EXC-507",
      type: "Packing Delay",
      severity: "high",
      detectedAt: iso(-0.5),
      status: "open",
      problem: "Packing queue has grown to 18 orders with an average handling time of 8.4 min against a 5 min target.",
      recommendation: "Open an additional packing station and reassign one picker from Zone C.",
      owner: "Floor Supervisor",
    },
    {
      id: "EXC-508",
      type: "Wrong SKU",
      orderId: "ORD-1039",
      sku: "SKU-1005",
      severity: "low",
      detectedAt: iso(-30),
      status: "resolved",
      problem: "Picker scanned SKU-1004 instead of SKU-1005 on ORD-1039.",
      recommendation: "Return the wrong unit to A-04 and re-pick the correct SKU.",
      resolution: "Corrected at the packing bench before dispatch; no customer impact.",
      owner: "Ken Osborne",
    },
  ];
}

export function seedDecisions(): PendingDecision[] {
  return [
    {
      id: "DEC-901",
      kind: "allocation",
      title: "Critical stock shortage on ORD-1042",
      orderId: "ORD-1042",
      sku: "SKU-1001",
      severity: "critical",
      context: [
        "ORD-1042 requires 10 × SKU-1001 (Wireless Keyboard)",
        "Available on hand: 7 units · Shortage: 3 units",
        "ORD-1042 priority: CRITICAL · ORD-1051 priority: NORMAL",
        "ORD-1051 also requests 5 × SKU-1001",
      ],
      recommendation:
        "Allocate all 7 available units to ORD-1042 because it carries the higher priority score, place ORD-1051 on stock hold and create a replenishment task for 25 units.",
      why: 'ORD-1042 scores higher on the priority engine (critical SLA, platinum customer) than ORD-1051, so scarce stock should follow the highest-risk order.',
      expectedResult: 'ORD-1042 ships within SLA, ORD-1051 slips by ~1 day on backorder, and 25 replacement units are inbound.',
      createdAt: iso(-2),
    },
    {
      id: "DEC-902",
      kind: "damage",
      title: "Damaged product detected during packing",
      orderId: "ORD-1046",
      sku: "SKU-1013",
      severity: "high",
      context: [
        "ORD-1046 · 1 × SKU-1013 flagged with a crushed casing",
        "Replacement stock confirmed at Bin B-12",
        "Order is 4.2h from its SLA deadline",
      ],
      recommendation: "Replace the damaged unit using Bin B-12 and return the order to Packing.",
      why: 'Replacement stock is on hand in the same zone, so swapping is faster than re-picking or cancelling the line.',
      expectedResult: 'Order returns to Packing in ~8 minutes and still clears its SLA with 3.9h to spare.',
      createdAt: iso(-1.4),
    },
    {
      id: "DEC-903",
      kind: "dispatch",
      title: "Dispatch SLA risk on ORD-1050",
      orderId: "ORD-1050",
      severity: "critical",
      context: [
        "ORD-1050 breached its SLA 6h ago",
        "No carrier assigned · package staged at dock 2",
        "Platinum customer — Northwind Retail",
      ],
      recommendation: "Move ORD-1050 into the priority dispatch queue and assign the next available carrier.",
      why: 'The order is already past SLA and staged at the dock — only carrier assignment is blocking it.',
      expectedResult: 'Package leaves on the next carrier run, capping the breach at one day for a platinum account.',
      createdAt: iso(-0.8),
    },
    {
      id: "DEC-904",
      kind: "replenishment",
      title: "Replenishment required for 4 SKUs below reorder level",
      severity: "medium",
      context: [
        "SKU-1004 Mechanical Keyboard — 0 on hand (reorder 12)",
        "SKU-1014 Ergonomic Chair Cushion — 0 on hand (reorder 10)",
        "SKU-1017 Desk Lamp LED — 5 on hand (reorder 12)",
        "SKU-1012 Webcam 1080p — 9 on hand (reorder 15)",
      ],
      recommendation: "Raise purchase requisitions for all four SKUs at 2× reorder level to cover the next 14 days of demand.",
      why: 'All four SKUs are at or below reorder level while demand is steady, so stock-outs are likely within days.',
      expectedResult: 'Cover for ~14 days of demand restored and four future allocation shortages avoided.',
      createdAt: iso(-5),
    },
  ];
}

export function seedDecisionHistory(): DecisionRecord[] {
  return [
    { id: "DH-1", decision: "Split allocation for ORD-1040", reason: "Partial stock available; customer accepted split shipment", operator: "M. Chandra", at: iso(-26), result: "Order dispatched in two parcels, SLA met", outcome: "modified" },
    { id: "DH-2", decision: "Escalate missing item on ORD-1047", reason: "Cycle count did not recover the unit", operator: "M. Chandra", at: iso(-4), result: "Escalated to Inventory Control", outcome: "accepted" },
    { id: "DH-3", decision: "Reject express carrier upgrade for ORD-1038", reason: "Cost exceeded the SLA benefit for a standard tier order", operator: "R. Whitfield", at: iso(-30), result: "Shipped with Northstar Freight, delivered on time", outcome: "rejected" },
  ];
}

export function seedNotifications(): AppNotification[] {
  return [
    { id: "N-1", title: "Critical order needs allocation", body: "ORD-1042 is CRITICAL with a 3-unit shortage on SKU-1001.", severity: "critical", at: iso(-2), read: false, href: "/decision-center" },
    { id: "N-2", title: "Dispatch SLA breached", body: "ORD-1050 is 6h past its promised dispatch time.", severity: "critical", at: iso(-0.8), read: false, href: "/dispatch" },
    { id: "N-3", title: "Damaged item at packing", body: "ORD-1046 · SKU-1013 flagged by the packing bench.", severity: "warning", at: iso(-1.4), read: false, href: "/packing" },
    { id: "N-4", title: "Low stock on 4 SKUs", body: "Mechanical Keyboard and 3 others are at or below reorder level.", severity: "warning", at: iso(-5), read: false, href: "/inventory" },
    { id: "N-5", title: "Packing bottleneck detected", body: "Packing queue at 18 orders, 8.4 min average vs 5 min target.", severity: "warning", at: iso(-0.5), read: false, href: "/analytics" },
    { id: "N-6", title: "ORD-1040 delivered", body: "Fulfilment completed and inventory reconciled.", severity: "success", at: iso(-20), read: true, href: "/orders" },
  ];
}

export function seedActivity(): ActivityEvent[] {
  return [
    { id: "AC-1", at: iso(-0.5), actor: "System", event: "Bottleneck detected", detail: "Packing stage exceeded target handling time" },
    { id: "AC-2", at: iso(-0.8), actor: "System", event: "Exception created", detail: "EXC-503 · Dispatch delay on ORD-1050" },
    { id: "AC-3", at: iso(-1.4), actor: "Lena Fischer", event: "Exception created", detail: "EXC-502 · Damaged item on ORD-1046" },
    { id: "AC-4", at: iso(-2), actor: "System", event: "Priority assigned", detail: "ORD-1042 classified CRITICAL" },
    { id: "AC-5", at: iso(-3), actor: "QC Bench 2", event: "QC inspection", detail: "ORD-1048 failed packaging integrity on pass 1" },
    { id: "AC-6", at: iso(-4), actor: "Ken Osborne", event: "Picking completed", detail: "ORD-1047 staged for packing" },
    { id: "AC-7", at: iso(-20), actor: "Dispatch Desk", event: "Dispatch completed", detail: "ORD-1040 handed to MetroDrop" },
  ];
}

/** Historical series used by dashboard + analytics charts. */
export const FULFILMENT_TREND = [
  { day: "Aug 10", completed: 38, created: 42, rate: 90 },
  { day: "Aug 11", completed: 44, created: 46, rate: 96 },
  { day: "Aug 12", completed: 35, created: 48, rate: 73 },
  { day: "Aug 13", completed: 47, created: 49, rate: 96 },
  { day: "Aug 14", completed: 41, created: 52, rate: 79 },
  { day: "Aug 15", completed: 50, created: 51, rate: 98 },
  { day: "Aug 16", completed: 33, created: 45, rate: 73 },
];

export const STAGE_TIMES = [
  { stage: "Allocation", actual: 3.1, target: 4 },
  { stage: "Picking", actual: 6.4, target: 7 },
  { stage: "Packing", actual: 8.4, target: 5 },
  { stage: "QC", actual: 4.2, target: 4 },
  { stage: "Dispatch", actual: 5.6, target: 6 },
];

export const STAGE_QUEUES: Record<string, number> = {
  Allocation: 4,
  Picking: 9,
  Packing: 18,
  QC: 6,
  Dispatch: 7,
};

export const PICK_PERFORMANCE = [
  { name: "Diego Alvarez", picks: 24, avgMin: 4.2, accuracy: 99.1 },
  { name: "Amara Osei", picks: 19, avgMin: 3.8, accuracy: 99.6 },
  { name: "Ken Osborne", picks: 21, avgMin: 5.1, accuracy: 97.4 },
  { name: "Lena Fischer", picks: 31, avgMin: 8.4, accuracy: 98.2 },
];

export const ZONES = [
  { zone: "A", bins: ["A-01", "A-02", "A-03", "A-04", "A-05", "A-06", "A-07"] },
  { zone: "B", bins: ["B-01", "B-02", "B-03", "B-04", "B-05", "B-06", "B-12"] },
  { zone: "C", bins: ["C-01", "C-02", "C-03", "C-04", "C-05", "C-06"] },
];

export const DEMO_USERS = {
  admin: { email: "admin@smartfulfill.io", password: "admin123", name: "Meera Chandra" },
  manager: { email: "manager@smartfulfill.io", password: "manager123", name: "Rohan Whitfield" },
  worker: { email: "diego@smartfulfill.io", password: "worker123", name: "Diego Alvarez" },
  customer: { email: "ops@northwind.example", password: "customer123", name: "Northwind Retail" },
};

/** Weekly roll-up used by the dashboard progress panel. */
export const WEEKLY_TREND = [
  { day: "Wk 26", completed: 231, created: 258, rate: 90 },
  { day: "Wk 27", completed: 248, created: 262, rate: 95 },
  { day: "Wk 28", completed: 219, created: 271, rate: 81 },
  { day: "Wk 29", completed: 266, created: 279, rate: 95 },
  { day: "Wk 30", completed: 241, created: 288, rate: 84 },
  { day: "Wk 31", completed: 288, created: 296, rate: 97 },
];
