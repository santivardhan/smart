import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
];

const axis = { fill: "var(--color-chart-text)", stroke: "none", fontSize: 11, fontWeight: 500 };

const tooltipStyle = {
  contentStyle: {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: 10,
    fontSize: 12,
    color: "var(--color-popover-foreground)",
  },
  labelStyle: { color: "var(--color-chart-text)", fontSize: 11, fontWeight: 600 },
  itemStyle: { color: "var(--color-chart-text)", fontSize: 11 },
  cursor: { fill: "var(--color-chart-text)", opacity: 0.06 },
};

const legendStyle = { fontSize: 11, color: "var(--color-chart-text)", fontWeight: 500 };

export function ChartFrame({ children, height = 260 }: { children: React.ReactElement; height?: number }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/** Compact summary strip rendered directly below a chart with visible percentages. */
export function ChartLegend({ items }: { items: { name: string; value: number; color?: string }[] }) {
  const total = items.reduce((sum, i) => sum + (Number(i.value) || 0), 0);
  if (!items.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <div
          key={it.name}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-[11px] leading-none"
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: it.color ?? CHART_COLORS[i % CHART_COLORS.length] }}
          />
          <span className="text-chart-text">{it.name}</span>
          <span className="font-medium tabular-nums">{it.value}</span>
          <span className="tabular-nums text-primary">
            {total > 0 ? Math.round((Number(it.value) / total) * 100) : 0}%
          </span>
        </div>
      ))}
    </div>
  );
}


export function BarSeries({
  data,
  x,
  bars,
  height,
  layout = "horizontal",
}: {
  data: Record<string, unknown>[];
  x: string;
  bars: { key: string; name: string; color?: string }[];
  height?: number;
  layout?: "horizontal" | "vertical";
}) {
  return (
    <div>
      <ChartFrame height={height}>
        <BarChart data={data} layout={layout} margin={{ top: 8, right: 8, bottom: bars.length > 1 ? 8 : 0, left: layout === "vertical" ? 24 : 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            {...(layout === "horizontal"
              ? { dataKey: x, interval: 0, height: 30, tickMargin: 8 }
              : { type: "number" as const })}
            tick={axis}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            {...(layout === "horizontal"
              ? { allowDecimals: false, width: 40 }
              : { type: "category" as const, dataKey: x, width: 110 })}
            tick={axis}
            tickLine={false}
            axisLine={false}
          />

          <Tooltip {...tooltipStyle} />
          {bars.length > 1 && <Legend wrapperStyle={legendStyle} verticalAlign="bottom" align="center" height={28} />}

          {bars.map((b, i) => (
            <Bar key={b.key} dataKey={b.key} name={b.name} fill={b.color ?? CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={38} />
          ))}
        </BarChart>
      </ChartFrame>
      {bars.length === 1 && (
        <ChartLegend
          items={data.map((d, i) => ({
            name: String(d[x] ?? ""),
            value: Number(d[bars[0].key] ?? 0),
            color: bars[0].color ?? CHART_COLORS[i % CHART_COLORS.length],
          }))}
        />
      )}
    </div>
  );
}

export function ColoredBars({
  data,
  x,
  y,
  height,
}: {
  data: { [k: string]: unknown; color?: string }[];
  x: string;
  y: string;
  height?: number;
}) {
  return (
    <div>
      <ChartFrame height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey={x} tick={axis} tickLine={false} axisLine={false} interval={0} angle={-12} height={44} textAnchor="end" />
          <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey={y} radius={[4, 4, 0, 0]} maxBarSize={44}>
            {data.map((d, i) => (
              <Cell key={i} fill={(d.color as string) ?? CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>
      <ChartLegend
        items={data.map((d, i) => ({
          name: String(d[x] ?? ""),
          value: Number(d[y] ?? 0),
          color: (d.color as string) ?? CHART_COLORS[i % CHART_COLORS.length],
        }))}
      />
    </div>
  );
}

export function Donut({
  data,
  height = 260,
  inner = 62,
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  inner?: number;
}) {
  return (
    <div>
      <ChartFrame height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={inner} outerRadius={92} paddingAngle={2} stroke="var(--color-background)">
            {data.map((d, i) => (
              <Cell key={d.name} fill={d.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
        </PieChart>
      </ChartFrame>
      <ChartLegend items={data} />
    </div>
  );
}


export function TrendArea({
  data,
  x,
  series,
  height,
}: {
  data: Record<string, unknown>[];
  x: string;
  series: { key: string; name: string; color?: string }[];
  height?: number;
}) {
  return (
    <ChartFrame height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.45} />
              <stop offset="100%" stopColor={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey={x} tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} />
<Legend wrapperStyle={legendStyle} />
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            fill={`url(#grad-${s.key})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ChartFrame>
  );
}

export function TrendLine({
  data,
  x,
  series,
  height,
}: {
  data: Record<string, unknown>[];
  x: string;
  series: { key: string; name: string; color?: string }[];
  height?: number;
}) {
  return (
    <ChartFrame height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey={x} tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={legendStyle} />
        {series.map((s, i) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ChartFrame>
  );
}

export function Gauge({ value, label, height = 200 }: { value: number; label: string; height?: number }) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ name: label, value }]} startAngle={210} endAngle={-30}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={12} fill="var(--color-chart-1)" background={{ fill: "var(--color-secondary)" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold tabular-nums">{value}%</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

/** Distinct, accessible palette for exception categories (8 slots). */
export const CATEGORY_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
  "var(--color-info)",
  "var(--color-warning)",
];

/**
 * Interactive donut chart for categorical breakdowns: hover tooltip with count
 * and percentage, plus a high-contrast grid legend below. Optional click-to-filter.
 */
export function CategoryDonut({
  data,
  height = 280,
  onSelect,
  unit = "incidents",
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  onSelect?: (name: string) => void;
  unit?: string;
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, d) => s + d.value, 0);
  const slices = sorted.map((d, i) => ({
    ...d,
    color: d.color ?? CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

  return (
    <div>
      <div className="relative" style={{ height }}>
        <ChartFrame height={height}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={Math.round(height * 0.26)}
              outerRadius={Math.round(height * 0.4)}
              paddingAngle={2}
              minAngle={4}
              isAnimationActive={false}
              stroke="var(--color-background)"
              strokeWidth={2}
              onClick={onSelect ? (d: { name?: string }) => d?.name && onSelect(d.name) : undefined}
              cursor={onSelect ? "pointer" : undefined}
            >
              {slices.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              {...tooltipStyle}
              formatter={(value: number, name: string) => [`${value} ${unit} · ${pct(Number(value))}%`, name]}
            />
          </PieChart>
        </ChartFrame>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold tabular-nums text-chart-text">{total}</span>
          <span className="text-xs font-medium text-chart-text">{unit}</span>
        </div>
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {slices.map((d) => (
          <li key={d.name}>
            <button
              type="button"
              onClick={onSelect ? () => onSelect(d.name) : undefined}
              title={`${d.name} — ${d.value} ${unit} (${pct(d.value)}%)`}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-chart-text">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="truncate">{d.name}</span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-chart-text">
                <span className="font-semibold">{d.value}</span>
                <span className="text-muted-foreground"> · </span>
                <span className="font-semibold text-primary">{pct(d.value)}%</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Horizontal ranked bar list (highest → lowest) with per-category colour,
 * high-contrast labels, counts and percentages. Optional click-to-filter.
 */
export function RankedBars({
  data,
  onSelect,
  unit = "incidents",
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  onSelect?: (name: string) => void;
  unit?: string;
}) {

  const sorted = [...data].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, d) => s + d.value, 0);
  const max = Math.max(1, ...sorted.map((d) => d.value));

  return (
    <ul className="flex flex-col gap-2.5">
      {sorted.map((d, i) => {
        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
        const color = d.color ?? CHART_COLORS[i % CHART_COLORS.length];
        return (
          <li key={d.name}>
            <button
              type="button"
              onClick={onSelect ? () => onSelect(d.name) : undefined}
              title={`${d.name} — ${d.value} ${unit} (${pct}%)`}
              className="group w-full rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-chart-text">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
                  <span className="truncate">{d.name}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-chart-text">
                  <span className="font-semibold">{d.value}</span>
                  <span className="text-muted-foreground"> {unit} · </span>
                  <span className="font-semibold text-primary">{pct}%</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${Math.max(4, (d.value / max) * 100)}%`, background: color }}
                />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}


/** Fulfilment flow funnel: one stage per step, congested stage highlighted. */
export function FlowFunnel({
  steps,
  onSelect,
  hotExclude = [],
  hotStage,
}: {
  steps: { stage: string; count: number; to?: string }[];
  onSelect?: (stage: string) => void;
  hotExclude?: string[];
  hotStage?: string;
}) {
  const max = Math.max(1, ...steps.map((s) => s.count));
  const candidates = steps.filter((s) => !hotExclude.includes(s.stage));
  const worst = hotStage ? { stage: hotStage, count: 1 } : candidates.reduce((a, b) => (b.count > a.count ? b : a), candidates[0] ?? { stage: "", count: 0 });
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      {steps.map((s) => {
        const hot = s.stage === worst.stage && s.count > 0;
        const pct = Math.round((s.count / max) * 100);
        return (
          <button
            key={s.stage}
            type="button"
            onClick={() => onSelect?.(s.stage)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              hot ? "border-warning/60 bg-warning/10" : "border-border bg-surface hover:border-primary/40"
            }`}
          >
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{s.stage}</p>
            <p className={`font-display text-2xl font-bold tabular-nums ${hot ? "text-warning" : ""}`}>{s.count}</p>
            <div className="mt-2 h-1.5 rounded-full bg-secondary">
              <div className={`h-1.5 rounded-full ${hot ? "bg-warning" : "bg-primary"}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{hot ? "Most congested" : `${pct}% of peak`}</p>
          </button>
        );
      })}
    </div>
  );
}
