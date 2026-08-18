import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, MessageSquare, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ColoredBars, Donut } from "@/components/charts";
import { EmptyState, Insight, KpiCard, PageHeader, SectionTitle, TableShell, Td, Th } from "@/components/shared";
import { Pill } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { fmtRelative } from "@/lib/engine";
import { feedbackStats } from "@/lib/ops";
import { useStore } from "@/lib/store";
import {
  CUSTOMER_FEEDBACK_CATEGORIES,
  FEEDBACK_STATUS_LABEL,
  WORKER_FEEDBACK_CATEGORIES,
  type Feedback,
  type FeedbackStatus,
} from "@/lib/types";

export const Route = createFileRoute("/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — SmartFulfill" },
      { name: "description", content: "Customer and worker feedback in one queue: ratings, categories, sentiment and the operational response to each report." },
      { property: "og:title", content: "Feedback — SmartFulfill" },
      { property: "og:description", content: "Turn customer and floor feedback into operational fixes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://swift-resolve-ware.lovable.app/feedback" }],
  }),
  component: () => (
    <AppShell role={["admin", "manager", "worker", "customer"]}>
      <FeedbackRouter />
    </AppShell>
  ),
});

const STATUSES: FeedbackStatus[] = ["new", "reviewing", "in_progress", "resolved", "closed"];
const MAX_COMMENT = 280;

function statusTone(s: FeedbackStatus) {
  return s === "resolved" || s === "closed" ? "success" : s === "new" ? "critical" : "warning";
}

function StatusBadge({ s }: { s: FeedbackStatus }) {
  return <Pill t={statusTone(s)}>{FEEDBACK_STATUS_LABEL[s]}</Pill>;
}

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1" role={onChange ? "radiogroup" : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          aria-pressed={value === n}
          className={cn(
            "rounded-md p-1 transition-colors",
            onChange && "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
            n <= value ? "text-warning" : "text-muted-foreground",
          )}
        >
          <Star className={cn("size-5", n <= value && "fill-current")} />
        </button>
      ))}
    </div>
  );
}

function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
      {required && <span className="text-critical"> *</span>}
    </Label>
  );
}

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="text-xs font-medium text-critical">{children}</p>;
}

function HistoryTable({ rows, productColumn }: { rows: Feedback[]; productColumn: "product" | "issue" }) {
  if (rows.length === 0) {
    return <EmptyState title="No records available" description="Submissions you make will appear here with their current status." />;
  }
  return (
    <TableShell>
      <thead className="border-b border-border bg-surface">
        <tr>
          <Th>{productColumn === "product" ? "Product" : "Issue"}</Th>
          <Th>{productColumn === "product" ? "Rating" : "Priority"}</Th>
          <Th>Category</Th>
          <Th>Status</Th>
          <Th>Date</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((f) => (
          <tr key={f.id} className="transition-colors hover:bg-accent/40">
            <Td className="max-w-[320px]">
              <p className="truncate text-sm">{f.comment}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {f.sku ?? "—"}
                {f.orderId ? ` · ${f.orderId}` : ""}
              </p>
            </Td>
            <Td>
              {productColumn === "product" ? (
                typeof f.rating === "number" ? <Stars value={f.rating} /> : <span className="text-muted-foreground">—</span>
              ) : (
                <Pill t={f.priority === "critical" ? "critical" : f.priority === "high" ? "warning" : "info"}>{f.priority ?? "medium"}</Pill>
              )}
            </Td>
            <Td className="text-sm">{f.category}</Td>
            <Td><StatusBadge s={f.status} /></Td>
            <Td className="text-xs text-muted-foreground">{fmtRelative(f.at)}</Td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

function FeedbackRouter() {
  const { user } = useStore();
  if (user?.role === "customer") return <CustomerFeedback />;
  if (user?.role === "worker") return <WorkerFeedback />;
  return <FeedbackQueue />;
}

/* ------------------------------- customer -------------------------------- */

function CustomerFeedback() {
  const { user, orders, feedback, submitFeedback } = useStore();
  const mine = feedback.filter((f) => f.source === "customer" && f.author === user?.name);
  const myOrders = orders.filter((o) => o.customerEmail === user?.email || o.customer === user?.name);

  const [orderId, setOrderId] = useState("");
  const [sku, setSku] = useState("");
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const products = myOrders.find((o) => o.id === orderId)?.items ?? [];

  const submit = () => {
    const e: Record<string, string> = {};
    if (!orderId) e["orderId"] = "Select the order this relates to.";
    if (!sku) e["sku"] = "Select the product.";
    if (!rating) e["rating"] = "Give a rating from 1 to 5.";
    if (!category) e["category"] = "Select a category.";
    if (comment.trim().length < 5) e["comment"] = "Add a short comment (at least 5 characters).";
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    window.setTimeout(() => {
      submitFeedback({
        source: "customer",
        author: user?.name ?? "Customer",
        orderId,
        sku,
        rating,
        category,
        comment: comment.trim(),
      });
      setBusy(false);
      setDone(true);
      setOrderId("");
      setSku("");
      setRating(0);
      setCategory("");
      setComment("");
    }, 500);
  };

  return (
    <>
      <PageHeader
        accent="info"
        eyebrow="Your experience"
        title="Share feedback"
        description="Tell us what happened so the warehouse team can resolve it quickly."
        icon={MessageSquare}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="p-5">
          <SectionTitle title="New feedback" hint="Takes under a minute — required fields are marked *" />

          {done && (
            <div className="mb-4 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-foreground" role="status">
              Feedback submitted successfully — the operations team has been notified.
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="fb-order" required>Order</FieldLabel>
              <Select value={orderId} onValueChange={(v) => { setOrderId(v); setSku(""); }}>
                <SelectTrigger id="fb-order"><SelectValue placeholder="Select an order" /></SelectTrigger>
                <SelectContent>
                  {myOrders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.id} · {o.items.length} item(s)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ErrorText>{errors["orderId"]}</ErrorText>
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="fb-sku" required>Product</FieldLabel>
              <Select value={sku} onValueChange={setSku} disabled={!orderId}>
                <SelectTrigger id="fb-sku"><SelectValue placeholder={orderId ? "Select a product" : "Select an order first"} /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.sku} value={p.sku}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ErrorText>{errors["sku"]}</ErrorText>
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="fb-rating" required>Rating</FieldLabel>
              <div id="fb-rating"><Stars value={rating} onChange={setRating} /></div>
              <ErrorText>{errors["rating"]}</ErrorText>
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="fb-cat" required>Category</FieldLabel>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="fb-cat"><SelectValue placeholder="What is this about?" /></SelectTrigger>
                <SelectContent>
                  {CUSTOMER_FEEDBACK_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ErrorText>{errors["category"]}</ErrorText>
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="fb-comment" required>Comment</FieldLabel>
              <Textarea
                id="fb-comment"
                rows={4}
                maxLength={MAX_COMMENT}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. The outer carton arrived crushed, the product inside was fine."
              />
              <div className="flex items-center justify-between">
                <ErrorText>{errors["comment"]}</ErrorText>
                <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{comment.length}/{MAX_COMMENT}</span>
              </div>
            </div>

            <Button onClick={submit} disabled={busy} className="w-full">
              {busy && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {busy ? "Submitting…" : "Submit feedback"}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="My feedback" hint={`${mine.length} submission(s) and their current status`} />
          <HistoryTable rows={mine} productColumn="product" />
        </Card>
      </div>
    </>
  );
}

/* -------------------------------- worker --------------------------------- */

function WorkerFeedback() {
  const { user, inventory, orders, feedback, submitFeedback } = useStore();
  const mine = feedback.filter((f) => f.source === "worker" && f.author === user?.name);

  const [sku, setSku] = useState("");
  const [orderId, setOrderId] = useState("none");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<"critical" | "high" | "medium" | "low">("medium");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = () => {
    const e: Record<string, string> = {};
    if (!sku) e["sku"] = "Select the product or SKU affected.";
    if (!category) e["category"] = "Select an issue category.";
    if (comment.trim().length < 5) e["comment"] = "Describe the issue briefly.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    window.setTimeout(() => {
      submitFeedback({
        source: "worker",
        author: user?.name ?? "Worker",
        sku,
        orderId: orderId === "none" ? undefined : orderId,
        category,
        priority,
        comment: comment.trim(),
      });
      setBusy(false);
      setDone(true);
      setSku("");
      setOrderId("none");
      setCategory("");
      setPriority("medium");
      setComment("");
    }, 500);
  };

  return (
    <>
      <PageHeader
        accent="info"
        eyebrow="Floor reporting"
        title="Report an issue"
        description="Tell us what happened so the warehouse team can resolve it quickly."
        icon={AlertTriangle}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="p-5">
          <SectionTitle title="New issue report" hint="Three fields are required — the rest is optional" />

          {done && (
            <div className="mb-4 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-foreground" role="status">
              Issue reported successfully — it is now in the operations queue.
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="wf-sku" required>Product / SKU</FieldLabel>
              <Select value={sku} onValueChange={setSku}>
                <SelectTrigger id="wf-sku"><SelectValue placeholder="Select the SKU affected" /></SelectTrigger>
                <SelectContent>
                  {inventory.map((i) => (
                    <SelectItem key={i.sku} value={i.sku}>{i.sku} · {i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ErrorText>{errors["sku"]}</ErrorText>
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="wf-order">Order ID (optional)</FieldLabel>
              <Select value={orderId} onValueChange={setOrderId}>
                <SelectTrigger id="wf-order"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not order specific</SelectItem>
                  {orders.slice(0, 40).map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.id} · {o.customer}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="wf-cat" required>Issue category</FieldLabel>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="wf-cat"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {WORKER_FEEDBACK_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ErrorText>{errors["category"]}</ErrorText>
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="wf-pri" required>Priority</FieldLabel>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                  <SelectTrigger id="wf-pri"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical — stops work now</SelectItem>
                    <SelectItem value="high">High — slows the line</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="wf-desc" required>Description</FieldLabel>
              <Textarea
                id="wf-desc"
                rows={4}
                maxLength={MAX_COMMENT}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. Bin B-12 count does not match the system, third time this week."
              />
              <div className="flex items-center justify-between">
                <ErrorText>{errors["comment"]}</ErrorText>
                <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{comment.length}/{MAX_COMMENT}</span>
              </div>
            </div>

            <Button onClick={submit} disabled={busy} className="w-full">
              {busy && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {busy ? "Submitting…" : "Submit report"}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="My reports" hint={`${mine.length} report(s) raised from the floor`} />
          <HistoryTable rows={mine} productColumn="issue" />
        </Card>
      </div>
    </>
  );
}

/* -------------------------- admin / manager queue ------------------------- */

function FeedbackQueue() {
  const { feedback, updateFeedback } = useStore();
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const stats = useMemo(() => feedbackStats(feedback), [feedback]);

  const rows = feedback.filter(
    (f) =>
      (source === "all" || f.source === source) &&
      (status === "all" || f.status === status) &&
      (!q || `${f.id} ${f.author} ${f.category} ${f.comment} ${f.sku ?? ""} ${f.orderId ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );

  const topCategory = stats.byCategory[0];

  return (
    <>
      <PageHeader
        accent="info"
        eyebrow="Voice of the operation"
        title="Feedback center"
        description="Customers report on delivery and quality; workers report on stock accuracy, layout and equipment. Both land here and both drive fixes."
        icon={MessageSquare}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Average rating" value={`${stats.average}/5`} hint={`${stats.total} submissions`} tone={stats.average >= 4 ? "success" : "warning"} icon={Star} />
        <KpiCard label="Positive" value={stats.positive} hint="4★ and above" tone="success" icon={ThumbsUp} />
        <KpiCard label="Negative" value={stats.negative} hint="2★ and below" tone="critical" icon={ThumbsDown} />
        <KpiCard label="Open items" value={stats.open} hint="Awaiting a response" tone="warning" icon={MessageSquare} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <SectionTitle title="Rating distribution" hint="Submissions per star rating (count)" />
          <ColoredBars data={stats.distribution.map((d, i) => ({ ...d, color: `var(--color-chart-${(i % 6) + 1})` }))} x="name" y="value" height={220} />
        </Card>

        <Card className="p-5">
          <SectionTitle title="Feedback by category" hint="Share of submissions per theme" />
          <Donut data={stats.byCategory.map((c, i) => ({ ...c, color: `var(--color-chart-${(i % 6) + 1})` }))} height={220} />
        </Card>

        <Card className="p-5">
          <SectionTitle title="What this tells us" hint="Feedback converted into an operational signal" />
          <div className="space-y-2">
            {topCategory && <Insight text={`${topCategory.name} is the most reported theme with ${topCategory.value} submission(s) — worth a process review.`} to="/warehouse-operations" />}
            <Insight text={`${feedback.filter((f) => f.source === "worker").length} worker report(s) come from the floor; these usually predict exceptions before customers notice.`} to="/exceptions" />
            <Insight text={`${stats.open} item(s) are still open. Responding closes the loop and is logged in the activity trail.`} to="/activity" />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Feedback queue"
          hint="Update the status or send a response — every change is recorded"
          right={
            <div className="flex flex-wrap items-center gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search feedback…" className="h-9 w-48" aria-label="Search feedback" />
              <Tabs value={source} onValueChange={setSource}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="customer">Customer</TabsTrigger>
                  <TabsTrigger value="worker">Worker</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{FEEDBACK_STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        {rows.length === 0 ? (
          <EmptyState title="No records available" description="Nothing matches the current filters." />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {rows.map((f) => (
              <div key={f.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill t={f.source === "customer" ? "info" : "warning"}>{f.source}</Pill>
                  <StatusBadge s={f.status} />
                  {f.priority && <Pill t={f.priority === "critical" ? "critical" : f.priority === "high" ? "warning" : "info"}>{f.priority}</Pill>}
                  <span className="text-xs text-muted-foreground">{f.category}</span>
                  {typeof f.rating === "number" && <Stars value={f.rating} />}
                  <span className="ml-auto font-mono text-[11px] text-muted-foreground">{f.id}</span>
                </div>

                <p className="mt-2 text-sm">{f.comment}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {f.author} · {fmtRelative(f.at)}
                  {f.orderId && (
                    <>
                      {" · "}
                      <Link to="/orders/$orderId" params={{ orderId: f.orderId }} className="text-primary hover:underline">{f.orderId}</Link>
                    </>
                  )}
                  {f.sku && (
                    <>
                      {" · "}
                      <Link to="/inventory/$sku" params={{ sku: f.sku }} className="text-primary hover:underline">{f.sku}</Link>
                    </>
                  )}
                </p>

                {f.response && (
                  <p className="mt-2 rounded-lg border border-success/30 bg-success/10 p-2 text-xs">
                    <span className="font-semibold">Response:</span> {f.response}
                  </p>
                )}

                {replyTo === f.id ? (
                  <div className="mt-3 space-y-2">
                    <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Write the response…" />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          updateFeedback(f.id, "resolved", reply || "Acknowledged and actioned by the operations team.");
                          setReplyTo(null);
                          setReply("");
                        }}
                      >
                        Send and resolve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => { setReplyTo(f.id); setReply(f.response ?? ""); }}>Respond</Button>
                    <Select value={f.status} onValueChange={(v) => updateFeedback(f.id, v as FeedbackStatus)}>
                      <SelectTrigger className="h-8 w-36" aria-label={`Status for ${f.id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{FEEDBACK_STATUS_LABEL[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
