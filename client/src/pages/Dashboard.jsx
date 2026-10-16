import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { formatMoney } from '../lib/format';
import { readJSON, writeJSON } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { RevenueChart, HourChart, TopItems, dayLabel, hourLabel } from '../components/analytics/charts';

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

const shortcuts = [
  { name: 'Menu', to: '/dashboard/menu', text: 'Dishes, prices, sold-out' },
  { name: 'Tables & QR codes', to: '/dashboard/tables', text: 'Print QR codes' },
  { name: 'Kitchen display', to: '/kitchen', text: 'Live orders' },
  { name: 'Order history', to: '/dashboard/orders', text: 'Past orders' },
];

function Card({ title, subtitle, children, className = '' }) {
  return (
    <section className={`rounded-md border border-stone-200 bg-stone-50 p-5 ${className}`}>
      <h3 className="display text-2xl">{title}</h3>
      {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
      <p className="eyebrow text-stone-500">{label}</p>
      <p className="display mt-2 text-4xl tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

function Analytics() {
  const [range, setRange] = useState(() => readJSON('tabletap:range', '7d'));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    api
      .get(`/analytics/summary?range=${range}`)
      .then(({ data: d }) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    writeJSON('tabletap:range', range);
    return () => {
      cancelled = true;
    };
  }, [range]);

  const money = (n) => formatMoney(n, data?.currency);
  const t = data?.totals;
  const rangeLabel = RANGES.find((r) => r.value === range)?.label.toLowerCase();

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="display text-3xl">Performance</h3>
        <div className="inline-flex rounded-md border border-stone-300 bg-stone-50 p-0.5" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              aria-pressed={range === r.value}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                range === r.value ? 'bg-stone-800 text-stone-50' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {!data && !error && <p className="mt-4 text-stone-500">Loading numbers…</p>}

      {data && (
        <div className={`mt-4 space-y-4 transition-opacity ${data.range !== range ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Revenue" value={money(t.revenue)} hint={`${rangeLabel}, excluding cancelled`} />
            <Stat label="Orders" value={t.orders} hint={t.cancelled ? `${t.cancelled} cancelled` : 'none cancelled'} />
            <Stat label="Avg. order value" value={money(t.avgOrderValue)} />
            <Stat
              label="Busiest hour"
              value={t.peakHour === null ? '—' : `${hourLabel(t.peakHour)}–${hourLabel((t.peakHour + 1) % 24)}`}
              hint={t.peakHour === null ? 'no orders yet' : 'most orders placed'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {data.range !== 'today' && (
              <Card title="Revenue per day" subtitle={`Last ${data.daily.length} days`} className="lg:col-span-2">
                <RevenueChart daily={data.daily} currency={data.currency} />
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-stone-500">View as table</summary>
                  <table className="mt-2 w-full text-left tabular-nums">
                    <thead className="text-stone-500">
                      <tr><th className="py-1 font-medium">Day</th><th className="font-medium">Orders</th><th className="text-right font-medium">Revenue</th></tr>
                    </thead>
                    <tbody>
                      {data.daily.map((d) => (
                        <tr key={d.date} className="border-t border-stone-100">
                          <td className="py-1">{dayLabel(d.date, true)}</td><td>{d.orders}</td><td className="text-right">{money(d.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </Card>
            )}
            <Card title="Top dishes" subtitle="By quantity sold" className={data.range === 'today' ? 'lg:col-span-3' : ''}>
              <TopItems items={data.topItems} currency={data.currency} />
            </Card>
          </div>

          <Card title="Orders by hour" subtitle={`When orders come in (${data.timezone})`}>
            <HourChart byHour={data.byHour} />
          </Card>
        </div>
      )}
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isOwner = user.role === 'owner';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <p className="eyebrow text-stone-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h2 className="display mt-3 text-5xl sm:text-6xl">
        {greeting}, {user.name.split(' ')[0]}.
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden border border-stone-700/10 bg-stone-700/10 lg:grid-cols-4">
        {shortcuts.map((s, i) => (
          <Link key={s.name} to={s.to} className="group bg-sand px-5 py-5 transition hover:bg-stone-50">
            <span className="text-xs tabular-nums text-stone-400">0{i + 1}</span>
            <p className="mt-2 font-medium text-stone-800">
              {s.name} <span className="inline-block transition group-hover:translate-x-1" aria-hidden>→</span>
            </p>
            <p className="text-xs text-stone-500">{s.text}</p>
          </Link>
        ))}
      </div>
      {isOwner && <Analytics />}
    </>
  );
}
