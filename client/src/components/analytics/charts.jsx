import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '../../lib/format';

// Chart styling: one brand hue for single-series charts (no legend needed; the title names it),
// thin bars rounded at the data end, hairline recessive grid, text in neutral ink.
const BAR = '#ea580c';
const GRID = '#e7e5e4';
const INK_MUTED = '#78716c';
const tick = { fill: INK_MUTED, fontSize: 12 };

const compact = (n) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

function ChartTooltip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="text-stone-500">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-semibold text-stone-900">{format(p.value, p.dataKey)}</p>
      ))}
    </div>
  );
}

const dayLabel = (ymd, long = false) =>
  new Date(`${ymd}T12:00:00`).toLocaleDateString('en-IN', long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });

export function RevenueChart({ daily, currency }) {
  const data = daily.map((d) => ({ ...d, label: dayLabel(d.date), longLabel: dayLabel(d.date, true) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tick={tick} tickLine={false} axisLine={false} width={44} tickFormatter={compact} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: '#f5f5f4' }}
          content={(props) => (
            <ChartTooltip
              {...props}
              label={props.payload?.[0]?.payload.longLabel}
              format={(v) => `${formatMoney(v, currency)} · ${props.payload?.[0]?.payload.orders} orders`}
            />
          )}
        />
        <Bar dataKey="revenue" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const hourLabel = (h) => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`);

export function HourChart({ byHour }) {
  const data = byHour.map((h) => ({ ...h, label: hourLabel(h.hour) }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={{ stroke: GRID }} interval={2} />
        <YAxis tick={tick} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: '#f5f5f4' }}
          content={(props) => (
            <ChartTooltip
              {...props}
              label={`${props.label} – ${hourLabel(((props.payload?.[0]?.payload.hour ?? 0) + 1) % 24)}`}
              format={(v) => `${v} ${v === 1 ? 'order' : 'orders'}`}
            />
          )}
        />
        <Bar dataKey="orders" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Ranked list with inline bars: easier to read than a chart for five named items.
export function TopItems({ items, currency }) {
  if (!items.length) return <p className="py-8 text-center text-sm text-stone-500">No dishes sold in this period.</p>;
  const max = Math.max(...items.map((i) => i.qty));
  return (
    <ol className="space-y-3">
      {items.map((it, i) => (
        <li key={it.name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-stone-900">
              <span className="mr-2 text-stone-400 tabular-nums">{i + 1}</span>
              {it.name}
            </span>
            <span className="shrink-0 tabular-nums text-stone-600">
              {it.qty} sold · {formatMoney(it.revenue, currency)}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-stone-100" title={`${it.qty} sold`}>
            <div className="h-2 rounded-full" style={{ width: `${(it.qty / max) * 100}%`, background: BAR }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export { dayLabel, hourLabel };
