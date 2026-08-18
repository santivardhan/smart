import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { NOW, inventoryStatus, scoreOrder, slaRisk } from "./engine";
import { opsMetrics, type ImpactSnapshot } from "./impact";
import {
  DEMO_USERS,
  PACK_CHECKS,
  QC_CHECKS,
  seedActivity,
  seedDecisionHistory,
  seedDecisions,
  seedExceptions,
  seedInventory,
  seedNotifications,
  seedOrders,
} from "./mock-data";
import { seedFeedback, seedWorkforce } from "./ops-data";
import type {
  ActivityEvent,
  AppNotification,
  Feedback,
  FeedbackStatus,
  Station,
  WorkerAssignment,
  DecisionRecord,
  ExceptionStatus,
  ExceptionType,
  InventoryItem,
  Order,
  PendingDecision,
  Role,
  Stage,
  User,
  WarehouseException,
} from "./types";

let seq = 1000;
const uid = (p: string) => `${p}-${++seq}`;
const stamp = (offsetMin = 0) => new Date(NOW.getTime() + offsetMin * 60000).toISOString();

type State = {
  user: User | null;
  inventory: InventoryItem[];
  orders: Order[];
  exceptions: WarehouseException[];
  decisions: PendingDecision[];
  history: DecisionRecord[];
  notifications: AppNotification[];
  activity: ActivityEvent[];
  workforce: WorkerAssignment[];
  feedback: Feedback[];
  lastImpact: ImpactSnapshot | null;
};

function initialState(): State {
  const inventory = seedInventory();
  return {
    user: null,
    inventory,
    orders: seedOrders(inventory),
    exceptions: seedExceptions(),
    decisions: seedDecisions(),
    history: seedDecisionHistory(),
    notifications: seedNotifications(),
    activity: seedActivity(),
    workforce: seedWorkforce(),
    feedback: seedFeedback(),
    lastImpact: null,
  };
}

const SESSION_KEY = "smartfulfill.session";

function readStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY) ?? window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user: User | null, remember: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(SESSION_KEY);
    if (!user) return;
    const store = remember ? window.localStorage : window.sessionStorage;
    store.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable — session stays in memory only */
  }
}

export type Store = ReturnType<typeof useStoreValue>;

const StoreContext = createContext<Store | null>(null);

function useStoreValue() {
  const [state, setState] = useState<State>(initialState);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);


  /* ------------------------------ primitives ----------------------------- */

  const log = (s: State, actor: string, event: string, detail: string): State => ({
    ...s,
    activity: [{ id: uid("AC"), at: stamp(), actor, event, detail }, ...s.activity],
  });

  const notify = (
    s: State,
    n: Omit<AppNotification, "id" | "at" | "read">,
  ): State => ({
    ...s,
    notifications: [{ ...n, id: uid("N"), at: stamp(), read: false }, ...s.notifications],
  });

  const addException = (s: State, e: Omit<WarehouseException, "id" | "detectedAt">): State => ({
    ...s,
    exceptions: [{ ...e, id: uid("EXC"), detectedAt: stamp() }, ...s.exceptions],
  });

  const patchOrder = (s: State, id: string, patch: Partial<Order>, event?: { title: string; detail: string }): State => ({
    ...s,
    orders: s.orders.map((o) =>
      o.id === id
        ? {
            ...o,
            ...patch,
            timeline: event
              ? [...o.timeline, { id: uid("T"), at: stamp(), ...event }]
              : o.timeline,
          }
        : o,
    ),
  });

  const record = (s: State, r: Omit<DecisionRecord, "id" | "at" | "operator">, operator: string): State => ({
    ...s,
    history: [{ ...r, id: uid("DH"), at: stamp(), operator }, ...s.history],
  });

  /** Captures measured before/after metrics either side of an executed action. */
  const measure = (before: State, next: State, label: string): State => ({
    ...next,
    lastImpact: {
      label,
      at: stamp(),
      before: opsMetrics(before.orders, before.inventory),
      after: opsMetrics(next.orders, next.inventory),
    },
  });

  /* --------------------------------- auth -------------------------------- */

  // Restore a previous session after hydration so a page refresh keeps the user signed in.
  useEffect(() => {
    const stored = readStoredUser();
    if (stored) setState((s) => (s.user ? s : { ...s, user: stored }));
    setAuthReady(true);
  }, []);

  const login = useCallback((role: Role, email: string, password: string, remember = true) => {
    const demo = DEMO_USERS[role];
    if (email.trim().toLowerCase() !== demo.email || password !== demo.password) {
      return { ok: false as const, error: "Invalid credentials for this role. Use the access credentials shown on this screen." };
    }
    const user: User = {
      id: `U-${role}`,
      name: demo.name,
      email: demo.email,
      role,
      customer: role === "customer" ? "Northwind Retail" : undefined,
    };
    writeStoredUser(user, remember);
    setState((s) => log({ ...s, user }, demo.name, "Signed in", `${role} portal session started`));
    return { ok: true as const, user };
  }, []);

  const logout = useCallback(() => {
    writeStoredUser(null, false);
    setState((s) => ({ ...s, user: null }));
  }, []);

  /* -------------------------------- orders ------------------------------- */

  const createOrder = useCallback(
    (input: {
      customer: string;
      customerEmail: string;
      customerTier: Order["customerTier"];
      slaHours: number;
      items: { sku: string; qty: number }[];
    }) => {
      const id = `ORD-${1054 + Math.floor(Math.random() * 900)}`;
      let created: Order | null = null;
      setState((s) => {
        const items = input.items.map((it) => {
          const p = s.inventory.find((i) => i.sku === it.sku)!;
          return { sku: it.sku, name: p.name, qty: it.qty, allocated: 0 };
        });
        const value = items.reduce((sum, it) => sum + s.inventory.find((i) => i.sku === it.sku)!.unitPrice * it.qty, 0);
        const createdAt = stamp();
        const slaDeadline = stamp(input.slaHours * 60);
        const sc = scoreOrder({ createdAt, slaDeadline, customerTier: input.customerTier, value });
        const order: Order = {
          id,
          customer: input.customer,
          customerEmail: input.customerEmail,
          items,
          value,
          createdAt,
          slaDeadline,
          stage: "prioritized",
          score: sc.score,
          priority: sc.priority,
          reasons: sc.reasons,
          customerTier: input.customerTier,
          allocationStatus: "pending",
          pickStatus: "queued",
          packChecks: [],
          qcChecks: [],
          dispatchPriority: false,
          timeline: [
            { id: uid("T"), at: createdAt, title: "Order created", detail: `${items.length} line item(s) · ${input.customer}` },
            { id: uid("T"), at: createdAt, title: "Priority assigned", detail: `${sc.priority.toUpperCase()} — score ${sc.score}` },
          ],
        };
        created = order;
        let next: State = { ...s, orders: [order, ...s.orders] };

        // inventory check → allocation recommendation
        const shortages = items.filter((it) => s.inventory.find((i) => i.sku === it.sku)!.available < it.qty);
        next = {
          ...next,
          decisions: [
            {
              id: uid("DEC"),
              kind: shortages.length ? "allocation" : "allocation",
              title: shortages.length
                ? `Stock shortage on ${id}`
                : `Allocation ready for ${id}`,
              orderId: id,
              sku: shortages[0]?.sku,
              severity: sc.priority === "critical" ? "critical" : shortages.length ? "high" : "medium",
              context: [
                `${id} · ${input.customer} · ${sc.priority.toUpperCase()} (score ${sc.score})`,
                ...items.map((it) => {
                  const inv = s.inventory.find((i) => i.sku === it.sku)!;
                  return `${it.qty} × ${it.sku} requested · ${inv.available} available in ${inv.bin}`;
                }),
              ],
              recommendation: shortages.length
                ? `Allocate all available stock to ${id} and raise a replenishment task for the shortfall.`
                : `Full stock is available — reserve inventory and release ${id} to picking.`,
              createdAt: stamp(),
            },
            ...next.decisions,
          ],
        };
        next = log(next, s.user?.name ?? "Operator", "Order created", `${id} · ${sc.priority.toUpperCase()} score ${sc.score}`);
        next = notify(next, {
          title: `New ${sc.priority} order ${id}`,
          body: `${input.customer} · allocation recommendation ready.`,
          severity: sc.priority === "critical" ? "critical" : "info",
          href: "/decision-center",
        });
        return next;
      });
      return id;
    },
    [],
  );

  /* ------------------------------ allocation ----------------------------- */

  const allocateOrder = useCallback((orderId: string, mode: "accept" | "modify" | "reject", note?: string) => {
    setState((s) => {
      const order = s.orders.find((o) => o.id === orderId);
      if (!order) return s;
      const operator = s.user?.name ?? "Operator";
      if (mode === "reject") {
        let next = patchOrder(s, orderId, { allocationStatus: "rejected" }, { title: "Allocation rejected", detail: note ?? "Operator rejected the recommendation" });
        next = record(next, { decision: `Reject allocation for ${orderId}`, reason: note ?? "Operator override", result: "Order held without reservation", outcome: "rejected" }, operator);
        next = log(next, operator, "Allocation rejected", `${orderId} kept in the allocation queue`);
        return { ...next, decisions: next.decisions.filter((d) => d.orderId !== orderId || d.kind !== "allocation") };
      }

      // reserve what is available, per line
      let shortageTotal = 0;
      const inventory = s.inventory.map((inv) => {
        const line = order.items.find((it) => it.sku === inv.sku);
        if (!line) return inv;
        const take = Math.min(inv.available, line.qty);
        shortageTotal += line.qty - take;
        return {
          ...inv,
          available: inv.available - take,
          reserved: inv.reserved + take,
          movements: [
            { id: uid("MV"), at: stamp(), type: "reserve" as const, qty: take, note: `Reserved for ${orderId}` },
            ...inv.movements,
          ],
        };
      });
      const items = order.items.map((it) => {
        const inv = s.inventory.find((i) => i.sku === it.sku)!;
        return { ...it, allocated: Math.min(inv.available, it.qty) };
      });

      let next: State = { ...s, inventory };
      next = patchOrder(
        next,
        orderId,
        {
          items,
          stage: "allocated",
          allocationStatus: shortageTotal > 0 ? "partial" : "accepted",
          pickStatus: "queued",
        },
        {
          title: shortageTotal > 0 ? "Partial allocation accepted" : "Inventory allocated",
          detail: shortageTotal > 0 ? `${shortageTotal} unit(s) short — replenishment task raised` : "Full quantity reserved",
        },
      );

      if (shortageTotal > 0) {
        // hold lower priority orders competing for the same SKU
        const skus = order.items.map((i) => i.sku);
        const competing = next.orders.filter(
          (o) => o.id !== orderId && o.allocationStatus === "pending" && o.score < order.score && o.items.some((i) => skus.includes(i.sku)),
        );
        competing.forEach((c) => {
          next = patchOrder(next, c.id, { allocationStatus: "hold" }, { title: "Placed on stock hold", detail: `Stock prioritised for ${orderId} (higher priority score)` });
          next = addException(next, {
            type: "Stock Shortage",
            orderId: c.id,
            severity: "medium",
            status: "open",
            problem: `${c.id} is on stock hold because available units were allocated to the higher-priority ${orderId}.`,
            recommendation: "Release once the replenishment task for the affected SKU is received.",
            owner: "Allocation Desk",
          });
        });
        next = addException(next, {
          type: "Stock Shortage",
          orderId,
          sku: order.items[0]?.sku,
          severity: "high",
          status: "action_required",
          problem: `${orderId} is short by ${shortageTotal} unit(s) after allocation.`,
          recommendation: "Replenishment task raised — ship the allocated units and backorder the remainder.",
          owner: "Inventory Control",
        });
        next = notify(next, { title: `Replenishment task created`, body: `${orderId} short by ${shortageTotal} unit(s).`, severity: "warning", href: "/inventory" });
      }

      next = {
        ...next,
        exceptions: next.exceptions.map((e) =>
          e.orderId === orderId && e.type === "Stock Shortage" && e.status !== "resolved"
            ? { ...e, status: "resolved" as ExceptionStatus, resolution: `Allocation decision executed by ${operator}: ${shortageTotal} unit(s) backordered.` }
            : e,
        ),
        decisions: next.decisions.filter((d) => !(d.orderId === orderId && d.kind === "allocation")),
      };
      next = record(
        next,
        {
          decision: `${mode === "modify" ? "Modified" : "Accepted"} allocation for ${orderId}`,
          reason: note ?? `Priority score ${order.score} (${order.priority}) outranked competing demand`,
          result: shortageTotal > 0 ? `Partial allocation, ${shortageTotal} unit(s) backordered` : "Full allocation reserved",
          outcome: mode === "modify" ? "modified" : "accepted",
        },
        operator,
      );
      next = log(next, operator, "Inventory allocated", `${orderId} moved to picking queue`);
      next = notify(next, { title: `${orderId} allocated`, body: "Stock reserved and released to the picking queue.", severity: "success", href: "/picking" });
      return measure(s, next, `Allocation executed for ${orderId}`);
    });
    toast.success(mode === "reject" ? "Allocation rejected" : "Allocation executed — inventory and orders updated");
  }, []);

  /* -------------------------------- picking ------------------------------ */

  const startPicking = useCallback((orderId: string, picker: string) => {
    setState((s) => {
      let next = patchOrder(s, orderId, { stage: "picking", pickStatus: "in_progress", picker }, { title: "Picking started", detail: `Assigned to ${picker}` });
      next = log(next, picker, "Picking started", `${orderId} pick task in progress`);
      return next;
    });
    toast.success("Pick task started");
  }, []);

  const completePicking = useCallback((orderId: string) => {
    setState((s) => {
      let next = patchOrder(s, orderId, { stage: "packing", pickStatus: "done" }, { title: "Picking completed", detail: "All lines picked and staged for packing" });
      next = log(next, s.orders.find((o) => o.id === orderId)?.picker ?? "Picker", "Picking completed", `${orderId} staged at packing`);
      next = notify(next, { title: `${orderId} ready for packing`, body: "Pick task completed and staged.", severity: "info", href: "/packing" });
      return next;
    });
    toast.success("Pick completed — order moved to Packing");
  }, []);

  const reportIssue = useCallback(
    (orderId: string, type: ExceptionType, sku: string | undefined, detail: string) => {
      setState((s) => {
        const replacement = s.inventory.find((i) => i.sku !== sku && i.available > 0 && i.bin === "B-12");
        let next = addException(s, {
          type,
          orderId,
          sku,
          severity: type === "Damaged Item" || type === "Missing Item" ? "high" : "medium",
          status: "action_required",
          problem: detail,
          recommendation:
            type === "Damaged Item"
              ? `Replacement available at Bin ${replacement?.bin ?? "B-12"} — swap the unit and continue.`
              : type === "Missing Item"
                ? "Trigger a cycle count for the bin and substitute from overflow stock."
                : "Re-verify the scanned SKU against the order line before continuing.",
          owner: s.user?.name ?? "Floor Operator",
        });
        next = {
          ...next,
          decisions: [
            {
              id: uid("DEC"),
              kind: "damage",
              title: `${type} reported on ${orderId}`,
              orderId,
              sku,
              severity: "high",
              context: [detail, `Reported by ${s.user?.name ?? "Floor Operator"}`],
              recommendation:
                type === "Damaged Item"
                  ? `Replace the unit using Bin ${replacement?.bin ?? "B-12"} and return the order to Packing.`
                  : "Run a cycle count and substitute the line from overflow stock.",
              createdAt: stamp(),
            },
            ...next.decisions,
          ],
        };
        next = patchOrder(next, orderId, {}, { title: `${type} reported`, detail });
        next = log(next, s.user?.name ?? "Floor Operator", "Exception created", `${type} on ${orderId}`);
        next = notify(next, { title: `${type} on ${orderId}`, body: detail, severity: "warning", href: "/decision-center" });
        return next;
      });
      toast.warning(`${type} reported — decision raised in the Decision Center`);
    },
    [],
  );

  /* -------------------------------- packing ------------------------------ */

  const togglePackCheck = useCallback((orderId: string, checkId: string) => {
    setState((s) =>
      patchOrder(s, orderId, {
        packChecks: s.orders.find((o) => o.id === orderId)!.packChecks.includes(checkId)
          ? s.orders.find((o) => o.id === orderId)!.packChecks.filter((c) => c !== checkId)
          : [...s.orders.find((o) => o.id === orderId)!.packChecks, checkId],
      }),
    );
  }, []);

  const completePacking = useCallback((orderId: string) => {
    setState((s) => {
      let next = patchOrder(s, orderId, { stage: "qc" }, { title: "Packing completed", detail: "Package sealed and labelled" });
      next = log(next, s.user?.name ?? "Packer", "Packing completed", `${orderId} sent to quality check`);
      next = notify(next, { title: `${orderId} awaiting QC`, body: "Package sealed and queued at the QC bench.", severity: "info", href: "/quality-check" });
      return next;
    });
    toast.success("Packing complete — order moved to Quality Check");
  }, []);

  /* ---------------------------------- QC --------------------------------- */

  const toggleQcCheck = useCallback((orderId: string, checkId: string) => {
    setState((s) =>
      patchOrder(s, orderId, {
        qcChecks: s.orders.find((o) => o.id === orderId)!.qcChecks.includes(checkId)
          ? s.orders.find((o) => o.id === orderId)!.qcChecks.filter((c) => c !== checkId)
          : [...s.orders.find((o) => o.id === orderId)!.qcChecks, checkId],
      }),
    );
  }, []);

  const approveQc = useCallback((orderId: string) => {
    setState((s) => {
      const tracking = `SF${Math.floor(100000 + Math.random() * 899999)}`;
      let next = patchOrder(s, orderId, { stage: "dispatch", trackingId: tracking, qcChecks: QC_CHECKS.map((c) => c.id) }, { title: "QC approved", detail: `All checks passed · tracking ${tracking}` });
      next = log(next, s.user?.name ?? "QC Bench", "QC approved", `${orderId} released to dispatch`);
      next = {
        ...next,
        exceptions: next.exceptions.map((e) => (e.orderId === orderId && e.type === "QC Failure" && e.status !== "resolved" ? { ...e, status: "resolved" as ExceptionStatus, resolution: "Passed re-inspection." } : e)),
      };
      next = notify(next, { title: `${orderId} passed QC`, body: `Tracking ${tracking} generated — ready for dispatch.`, severity: "success", href: "/dispatch" });
      return next;
    });
    toast.success("QC approved — order released to Dispatch");
  }, []);

  const rejectQc = useCallback((orderId: string, reason: string) => {
    setState((s) => {
      let next = patchOrder(s, orderId, { stage: "packing", qcChecks: [], packChecks: [] }, { title: "QC rejected", detail: reason });
      next = addException(next, {
        type: "QC Failure",
        orderId,
        severity: "high",
        status: "action_required",
        problem: reason,
        recommendation: "Repack the order, correct the flagged defect and resubmit for quality check.",
        owner: s.user?.name ?? "QC Bench",
      });
      next = log(next, s.user?.name ?? "QC Bench", "QC rejected", `${orderId} returned to packing — ${reason}`);
      next = notify(next, { title: `QC failure on ${orderId}`, body: reason, severity: "critical", href: "/packing" });
      return next;
    });
    toast.error("QC rejected — order returned to Packing");
  }, []);

  /* ------------------------------- dispatch ------------------------------ */

  const assignCarrier = useCallback((orderId: string, carrier: string) => {
    setState((s) => {
      let next = patchOrder(s, orderId, { carrier }, { title: "Carrier assigned", detail: carrier });
      next = log(next, s.user?.name ?? "Dispatch Desk", "Carrier assigned", `${orderId} → ${carrier}`);
      return next;
    });
    toast.success(`Carrier assigned: ${carrier}`);
  }, []);

  const prioritiseDispatch = useCallback((orderId: string) => {
    setState((s) => {
      let next = patchOrder(s, orderId, { dispatchPriority: true }, { title: "Priority dispatch", detail: "Moved to the front of the dispatch queue" });
      next = {
        ...next,
        exceptions: next.exceptions.map((e) => (e.orderId === orderId && e.type === "Dispatch Delay" && e.status !== "resolved" ? { ...e, status: "resolved" as ExceptionStatus, resolution: "Moved to the priority dispatch queue." } : e)),
        decisions: next.decisions.filter((d) => !(d.orderId === orderId && d.kind === "dispatch")),
      };
      next = log(next, s.user?.name ?? "Dispatch Desk", "Dispatch prioritised", `${orderId} moved to the priority queue`);
      return next;
    });
    toast.success("Order moved to the priority dispatch queue");
  }, []);

  const markDispatched = useCallback((orderId: string) => {
    setState((s) => {
      const order = s.orders.find((o) => o.id === orderId);
      if (!order) return s;
      const inventory = s.inventory.map((inv) => {
        const line = order.items.find((it) => it.sku === inv.sku);
        if (!line) return inv;
        const qty = line.allocated || line.qty;
        return {
          ...inv,
          reserved: Math.max(0, inv.reserved - qty),
          movements: [{ id: uid("MV"), at: stamp(), type: "outbound" as const, qty, note: `Dispatched with ${orderId}` }, ...inv.movements],
        };
      });
      let next: State = { ...s, inventory };
      next = patchOrder(
        next,
        orderId,
        { stage: "completed", delivered: true, carrier: order.carrier ?? "SwiftLine Express", trackingId: order.trackingId ?? `SF${Math.floor(100000 + Math.random() * 899999)}` },
        { title: "Dispatched", detail: `Handed to ${order.carrier ?? "SwiftLine Express"} · inventory reconciled` },
      );
      next = log(next, s.user?.name ?? "Dispatch Desk", "Dispatch completed", `${orderId} fulfilled and inventory updated`);
      next = notify(next, { title: `${orderId} dispatched`, body: "Fulfilment complete — analytics updated.", severity: "success", href: "/analytics" });
      return measure(s, next, `${orderId} dispatched`);
    });
    toast.success("Order dispatched — inventory and analytics updated");
  }, []);

  /* ------------------------------ exceptions ----------------------------- */

  const updateException = useCallback((id: string, status: ExceptionStatus, resolution?: string) => {
    setState((s) => {
      let next: State = { ...s, exceptions: s.exceptions.map((e) => (e.id === id ? { ...e, status, resolution: resolution ?? e.resolution } : e)) };
      const ex = s.exceptions.find((e) => e.id === id);
      next = log(next, s.user?.name ?? "Operator", "Exception updated", `${id} → ${status.replace("_", " ")}${ex?.orderId ? ` (${ex.orderId})` : ""}`);
      return next;
    });
    toast.success(`Exception ${id} marked ${status.replace("_", " ")}`);
  }, []);

  /* --------------------------- decision center --------------------------- */

  const resolveDecision = useCallback(
    (decisionId: string, outcome: "accept" | "modify" | "reject" | "hold" | "escalate", note?: string) => {
      const d = state.decisions.find((x) => x.id === decisionId);
      if (!d) return;
      const operator = state.user?.name ?? "Operator";

      if (d.kind === "allocation" && d.orderId) {
        allocateOrder(d.orderId, outcome === "reject" ? "reject" : outcome === "modify" ? "modify" : "accept", note);
        return;
      }

      setState((s) => {
        let next = { ...s, decisions: s.decisions.filter((x) => x.id !== decisionId) };
        if (d.kind === "damage" && d.orderId) {
          if (outcome === "accept") {
            next = patchOrder(next, d.orderId, { stage: "packing", packChecks: [] }, { title: "Damaged unit replaced", detail: "Replacement pulled from Bin B-12 — order returned to Packing" });
            const inv = next.inventory.map((i) => (i.sku === d.sku ? { ...i, available: Math.max(0, i.available - 1), damaged: i.damaged + 1, movements: [{ id: uid("MV"), at: stamp(), type: "damage" as const, qty: 1, note: `Damaged unit quarantined for ${d.orderId}` }, ...i.movements] } : i));
            next = { ...next, inventory: inv };
            next = { ...next, exceptions: next.exceptions.map((e) => (e.orderId === d.orderId && e.type === "Damaged Item" && e.status !== "resolved" ? { ...e, status: "resolved" as ExceptionStatus, resolution: "Replacement issued from Bin B-12." } : e)) };
          } else if (outcome === "hold") {
            next = patchOrder(next, d.orderId, {}, { title: "Order held", detail: "Awaiting replacement stock" });
            next = { ...next, exceptions: next.exceptions.map((e) => (e.orderId === d.orderId && e.type === "Damaged Item" ? { ...e, status: "investigating" as ExceptionStatus } : e)) };
          } else {
            next = { ...next, exceptions: next.exceptions.map((e) => (e.orderId === d.orderId && e.type === "Damaged Item" ? { ...e, status: "escalated" as ExceptionStatus } : e)) };
          }
        }
        if (d.kind === "dispatch" && d.orderId) {
          next = patchOrder(next, d.orderId, { dispatchPriority: true }, { title: "Priority dispatch", detail: "Moved to the front of the dispatch queue" });
          next = { ...next, exceptions: next.exceptions.map((e) => (e.orderId === d.orderId && e.type === "Dispatch Delay" ? { ...e, status: "resolved" as ExceptionStatus, resolution: "Priority dispatch applied." } : e)) };
        }
        if (d.kind === "replenishment") {
          const inv = next.inventory.map((i) =>
            i.available <= i.reorderLevel
              ? { ...i, available: i.available + i.reorderLevel * 2, movements: [{ id: uid("MV"), at: stamp(), type: "inbound" as const, qty: i.reorderLevel * 2, note: "Replenishment requisition approved" }, ...i.movements] }
              : i,
          );
          next = { ...next, inventory: inv };
        }
        next = record(
          next,
          {
            decision: d.title,
            reason: note ?? d.recommendation,
            result:
              outcome === "accept"
                ? "Recommendation executed — system state updated"
                : outcome === "modify"
                  ? "Executed with operator modification"
                  : outcome === "hold"
                    ? "Order held pending stock"
                    : outcome === "escalate"
                      ? "Escalated to supervisor"
                      : "Recommendation rejected",
            outcome: outcome === "modify" ? "modified" : outcome === "reject" ? "rejected" : "accepted",
          },
          operator,
        );
        next = log(next, operator, "Decision resolved", `${d.title} → ${outcome}`);
        return measure(s, next, `${d.title} — ${outcome}`);
      });
      toast.success("Decision executed — system state updated");
    },
    [state.decisions, state.user, allocateOrder],
  );

  /* ----------------------------- notifications --------------------------- */

  const markNotificationRead = useCallback((id: string) => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  }, []);
  const markAllRead = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
  }, []);

  /* ------------------------------ workforce ------------------------------ */

  const reassignWorker = useCallback((workerId: string, station: Station) => {
    setState((s) => {
      const w = s.workforce.find((x) => x.id === workerId);
      if (!w) return s;
      const operator = s.user?.name ?? "Operator";
      let next: State = {
        ...s,
        workforce: s.workforce.map((x) =>
          x.id === workerId
            ? { ...x, station, status: "active" as const, currentTask: `Reassigned to ${station} — awaiting next task` }
            : x,
        ),
      };
      next = record(
        next,
        {
          decision: `Reassign ${w.name} from ${w.station} to ${station}`,
          reason: `${station} queue exceeded available capacity`,
          result: `${station} capacity increased — queue drain time reduced`,
          outcome: "accepted",
        },
        operator,
      );
      next = log(next, operator, "Workforce reassigned", `${w.name}: ${w.station} → ${station}`);
      next = notify(next, {
        title: `${w.name} moved to ${station}`,
        body: "Workforce rebalanced — stage capacity and metrics updated.",
        severity: "success",
        href: "/workforce",
      });
      return next;
    });
    toast.success(`Reassigned to ${station} — capacity updated`);
  }, []);

  const setWorkerStatus = useCallback((workerId: string, status: WorkerAssignment["status"]) => {
    setState((s) => {
      const w = s.workforce.find((x) => x.id === workerId);
      if (!w) return s;
      const next: State = { ...s, workforce: s.workforce.map((x) => (x.id === workerId ? { ...x, status } : x)) };
      return log(next, s.user?.name ?? "Operator", "Worker status updated", `${w.name} → ${status}`);
    });
    toast.success("Worker status updated");
  }, []);

  /* ------------------------------- feedback ------------------------------ */

  const submitFeedback = useCallback(
    (input: Omit<Feedback, "id" | "at" | "status">) => {
      const id = uid("FB");
      setState((s) => {
        let next: State = { ...s, feedback: [{ ...input, id, at: stamp(), status: "new" as FeedbackStatus }, ...s.feedback] };
        next = log(next, input.author, "Feedback submitted", `${input.category} · ${input.source}`);
        next = notify(next, {
          title: `New ${input.source} feedback`,
          body: `${input.category} — ${input.comment.slice(0, 70)}`,
          severity: input.rating && input.rating <= 2 ? "warning" : "info",
          href: "/feedback",
        });
        return next;
      });
      toast.success("Feedback submitted — routed to the operations queue");
      return id;
    },
    [],
  );

  const updateFeedback = useCallback((id: string, status: FeedbackStatus, response?: string) => {
    setState((s) => {
      const next: State = {
        ...s,
        feedback: s.feedback.map((f) => (f.id === id ? { ...f, status, response: response ?? f.response } : f)),
      };
      return log(next, s.user?.name ?? "Operator", "Feedback updated", `${id} → ${status.replace("_", " ")}`);
    });
    toast.success(`Feedback ${id} marked ${status.replace("_", " ")}`);
  }, []);

  /** Re-reads the shared application state so KPIs, tables and charts recompute. */
  const refresh = useCallback(() => {
    setState((s) => ({
      ...s,
      inventory: [...s.inventory],
      orders: [...s.orders],
      exceptions: [...s.exceptions],
      decisions: [...s.decisions],
      workforce: [...s.workforce],
      feedback: [...s.feedback],
    }));
    setLastRefreshedAt(new Date().toISOString());
  }, []);

  const resetDemo = useCallback(() => {
    setState((s) => ({ ...initialState(), user: s.user }));
    setLastRefreshedAt(new Date().toISOString());
    toast.success("Operations data restored to baseline");
  }, []);


  return {
    ...state,
    login,
    logout,
    authReady,
    createOrder,
    allocateOrder,
    startPicking,
    completePicking,
    reportIssue,
    togglePackCheck,
    completePacking,
    toggleQcCheck,
    approveQc,
    rejectQc,
    assignCarrier,
    prioritiseDispatch,
    markDispatched,
    updateException,
    resolveDecision,
    markNotificationRead,
    markAllRead,
    reassignWorker,
    setWorkerStatus,
    submitFeedback,
    updateFeedback,
    refresh,
    lastRefreshedAt,

    resetDemo,
    PACK_CHECKS,
    QC_CHECKS,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/* ------------------------------- selectors -------------------------------- */

export function useStats() {
  const { orders, inventory, exceptions } = useStore();
  return useMemo(() => {
    const byStage = (st: Stage) => orders.filter((o) => o.stage === st).length;
    const completed = byStage("completed");
    const low = inventory.filter((i) => inventoryStatus(i) === "low").length;
    const out = inventory.filter((i) => inventoryStatus(i) === "out").length;
    return {
      total: orders.length,
      critical: orders.filter((o) => o.priority === "critical" && o.stage !== "completed").length,
      inProgress: orders.filter((o) => !["created", "completed"].includes(o.stage)).length,
      readyDispatch: byStage("dispatch"),
      lowStock: low,
      outOfStock: out,
      fulfilmentRate: Math.round((completed / Math.max(1, orders.length)) * 100),
      activeExceptions: exceptions.filter((e) => e.status !== "resolved").length,
      atRisk: orders.filter((o) => slaRisk(o) !== "on_time" && o.stage !== "completed").length,
      stageCounts: (
        ["created", "prioritized", "allocated", "picking", "packing", "qc", "dispatch", "completed"] as Stage[]
      ).map((st) => ({ stage: st, count: byStage(st) })),
    };
  }, [orders, inventory, exceptions]);
}
