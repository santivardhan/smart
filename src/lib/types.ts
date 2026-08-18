export type Role = "admin" | "manager" | "worker" | "customer";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** for customer role: the customer name used on orders */
  customer?: string | undefined;
};

export type Stage =
  | "created"
  | "prioritized"
  | "allocated"
  | "picking"
  | "packing"
  | "qc"
  | "dispatch"
  | "completed";

export const STAGES: Stage[] = [
  "created",
  "prioritized",
  "allocated",
  "picking",
  "packing",
  "qc",
  "dispatch",
  "completed",
];

export const STAGE_LABEL: Record<Stage, string> = {
  created: "Created",
  prioritized: "Prioritized",
  allocated: "Allocated",
  picking: "Picking",
  packing: "Packing",
  qc: "Quality Check",
  dispatch: "Dispatch",
  completed: "Completed",
};

export type PriorityLevel = "critical" | "high" | "normal" | "low";

export type InventoryStatus = "healthy" | "low" | "out" | "reserved" | "damaged";

export type StockMovement = {
  id: string;
  at: string;
  type: "inbound" | "outbound" | "reserve" | "release" | "damage" | "adjust";
  qty: number;
  note: string;
};

export type InventoryItem = {
  sku: string;
  name: string;
  category: string;
  zone: string;
  bin: string;
  available: number;
  reserved: number;
  damaged: number;
  reorderLevel: number;
  unitPrice: number;
  movements: StockMovement[];
};

export type OrderItem = {
  sku: string;
  name: string;
  qty: number;
  allocated: number;
};

export type TimelineEvent = {
  id: string;
  at: string;
  title: string;
  detail: string;
};

export type Order = {
  id: string;
  customer: string;
  customerEmail: string;
  items: OrderItem[];
  value: number;
  createdAt: string;
  slaDeadline: string;
  stage: Stage;
  score: number;
  priority: PriorityLevel;
  reasons: string[];
  customerTier: "platinum" | "gold" | "standard";
  allocationStatus: "pending" | "accepted" | "partial" | "hold" | "rejected";
  picker?: string | undefined;
  pickStatus: "queued" | "in_progress" | "done";
  packChecks: string[];
  qcChecks: string[];
  carrier?: string | undefined;
  trackingId?: string | undefined;
  dispatchPriority: boolean;
  timeline: TimelineEvent[];
  delivered?: boolean | undefined;
};

export type ExceptionType =
  | "Stock Shortage"
  | "Damaged Item"
  | "Missing Item"
  | "Wrong SKU"
  | "Quantity Mismatch"
  | "Picking Delay"
  | "Packing Delay"
  | "QC Failure"
  | "Dispatch Delay";

export type ExceptionStatus =
  | "open"
  | "investigating"
  | "action_required"
  | "resolved"
  | "escalated";

export type WarehouseException = {
  id: string;
  type: ExceptionType;
  orderId?: string | undefined;
  sku?: string | undefined;
  severity: "critical" | "high" | "medium" | "low";
  detectedAt: string;
  status: ExceptionStatus;
  problem: string;
  recommendation: string;
  resolution?: string | undefined;
  owner: string;
};

export type DecisionKind = "allocation" | "damage" | "dispatch" | "replenishment" | "qc";

export type PendingDecision = {
  id: string;
  kind: DecisionKind;
  title: string;
  orderId?: string | undefined;
  sku?: string | undefined;
  severity: "critical" | "high" | "medium";
  context: string[];
  recommendation: string;
  why?: string;
  expectedResult?: string;
  createdAt: string;
};

export type DecisionRecord = {
  id: string;
  decision: string;
  reason: string;
  operator: string;
  at: string;
  result: string;
  outcome: "accepted" | "modified" | "rejected";
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  severity: "critical" | "warning" | "info" | "success";
  at: string;
  read: boolean;
  href: string;
};

export type ActivityEvent = {
  id: string;
  at: string;
  actor: string;
  event: string;
  detail: string;
};

export type Worker = {
  id: string;
  name: string;
  zone: string;
  shift: string;
  tasksToday: number;
  avgPickMin: number;
};

/* ------------------------- Ops intelligence layer ------------------------- */

export type Station = "Picking" | "Packing" | "QC" | "Dispatch";

export type WorkerAssignment = {
  id: string;
  name: string;
  jobRole: "Picker" | "Packer" | "QC Inspector" | "Dispatch Handler";
  zone: "A" | "B" | "C" | "D";
  station: Station;
  currentTask: string;
  status: "active" | "idle" | "break" | "inactive";
  tasksCompleted: number;
  productivity: number;
  exceptions: number;
};

export type FeedbackSource = "customer" | "worker";
export type FeedbackStatus = "new" | "reviewing" | "in_progress" | "resolved" | "closed";

export type Feedback = {
  id: string;
  source: FeedbackSource;
  author: string;
  orderId?: string | undefined;
  sku?: string | undefined;
  rating?: number | undefined;
  category: string;
  comment: string;
  at: string;
  status: FeedbackStatus;
  response?: string | undefined;
  priority?: "critical" | "high" | "medium" | "low" | undefined;
};

export const CUSTOMER_FEEDBACK_CATEGORIES = [
  "Product Quality",
  "Packaging",
  "Delivery",
  "Availability",
  "Price",
  "Service",
];
export const WORKER_FEEDBACK_CATEGORIES = [
  "Inventory Accuracy",
  "Product Availability",
  "Picking",
  "Packing",
  "Quality Check",
  "Warehouse Location",
  "Equipment",
  "Workflow",
];

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};
