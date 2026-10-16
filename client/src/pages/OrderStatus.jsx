import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { formatMoney } from '../lib/format';
import { readJSON } from '../lib/storage';
import { connectSocket } from '../lib/socket';
import VegMark from '../components/menu/VegMark';

const STEPS = [
  { key: 'received', label: 'Order received', hint: 'The kitchen has your order.' },
  { key: 'preparing', label: 'Preparing', hint: 'Your food is being cooked.' },
  { key: 'ready', label: 'Ready', hint: 'Your food is on its way to your table.' },
  { key: 'served', label: 'Served', hint: 'Enjoy your meal! 🍽️' },
];

// Live updates come over Socket.io; this slow poll is only a safety net.
const POLL_MS = 30000;
const isFinal = (status) => ['served', 'cancelled'].includes(status);

export default function OrderStatus() {
  const { trackingToken } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const menuPath = readJSON('tabletap:lastMenu', null);

  useEffect(() => {
    let timer;
    let stopped = false;
    const socket = connectSocket();

    const load = async () => {
      clearTimeout(timer);
      try {
        const res = await api.get(`/public/orders/${trackingToken}`);
        if (stopped) return;
        setData(res.data);
        if (!isFinal(res.data.order.status)) timer = setTimeout(load, POLL_MS);
      } catch (err) {
        if (!stopped) setError(errorMessage(err));
      }
    };

    // (Re)join this order's room on every connect, then catch up on anything missed.
    socket.on('connect', () => {
      socket.emit('order:subscribe', trackingToken);
      load();
    });
    socket.on('order:updated', (order) => {
      // A logged-in staff member's socket also gets every order in the restaurant; ignore the rest.
      if (order.trackingToken !== trackingToken) return;
      setData((prev) => (prev ? { ...prev, order } : prev));
      if (isFinal(order.status)) clearTimeout(timer);
    });

    return () => {
      stopped = true;
      clearTimeout(timer);
      socket.disconnect();
    };
  }, [trackingToken]);

  if (error) return <div className="grid min-h-screen place-items-center bg-sand px-6 text-center"><p className="display text-3xl">{error}</p></div>;
  if (!data) return <div className="grid min-h-screen place-items-center bg-sand text-stone-500">Loading your order…</div>;

  const { order, restaurant } = data;
  const money = (n) => formatMoney(n, restaurant?.currency);
  const cancelled = order.status === 'cancelled';
  const currentIdx = STEPS.findIndex((s) => s.key === order.status);
  const timeOf = (status) => order.statusHistory.find((h) => h.status === status)?.at;
  const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-sand pb-16">
      <div className="mx-auto max-w-2xl px-5">
        <header className="border-b border-stone-700/10 pb-10 pt-14 text-center">
          <p className="eyebrow text-stone-500">
            {restaurant?.name} · Table {order.tableNumber}
          </p>
          <h1 className="display mt-5 text-5xl sm:text-6xl">{cancelled ? 'Order cancelled' : STEPS[currentIdx]?.label}</h1>
          <p className="mt-3 text-stone-600">{cancelled ? 'Please speak to the staff.' : STEPS[currentIdx]?.hint}</p>
        </header>

        {!cancelled && (
          <ol className="grid grid-cols-4 gap-2 py-10" aria-label="Order progress">
            {STEPS.map((step, i) => {
              const done = i <= currentIdx;
              const current = i === currentIdx && order.status !== 'served';
              const at = timeOf(step.key);
              return (
                <li key={step.key} className="text-center">
                  <div className={`h-0.5 w-full transition-colors duration-700 ${done ? 'bg-stone-800' : 'bg-stone-700/15'}`}>
                    {current && <div className="h-full w-1/2 animate-pulse bg-brand-500" />}
                  </div>
                  <p className={`mt-3 text-xs sm:text-sm ${done ? 'text-stone-800' : 'text-stone-400'}`}>{step.label}</p>
                  <p className="mt-0.5 h-4 text-[11px] tabular-nums text-stone-500">{at ? fmtTime(at) : ''}</p>
                </li>
              );
            })}
          </ol>
        )}

        <section className="border-t border-stone-700/10 pt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-3xl">Your order</h2>
            {order.customerName && <p className="text-sm text-stone-500">{order.customerName}</p>}
          </div>
          <ul className="mt-5 divide-y divide-stone-700/10 text-sm">
            {order.items.map((it, i) => (
              <li key={i} className="flex items-start gap-3 py-3">
                <span className="mt-0.5"><VegMark isVeg={it.isVeg} /></span>
                <span className="flex-1">
                  <span className="tabular-nums text-stone-500">{it.qty} ×</span> {it.name}
                  {it.note && <span className="block text-xs italic text-stone-500">“{it.note}”</span>}
                </span>
                <span className="tabular-nums">{money(it.price * it.qty)}</span>
              </li>
            ))}
          </ul>
          {order.note && <p className="mt-2 text-xs italic text-stone-500">Note for the kitchen: {order.note}</p>}
          <dl className="mt-4 space-y-1.5 border-t border-stone-700/15 pt-4 text-sm tabular-nums">
            <div className="flex justify-between text-stone-600"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            <div className="flex justify-between text-stone-600"><dt>Tax ({order.taxPercent}%)</dt><dd>{money(order.tax)}</dd></div>
            <div className="flex justify-between pt-1 text-base font-medium text-stone-900"><dt>Total</dt><dd>{money(order.total)}</dd></div>
          </dl>
        </section>

        {menuPath && (
          <Link to={menuPath} className="btn-ghost mt-10 w-full py-3.5">Order something else</Link>
        )}
        <p className="mt-8 text-center text-xs text-stone-500">Placed at {fmtTime(order.createdAt)} · this page updates by itself</p>
      </div>
    </div>
  );
}
