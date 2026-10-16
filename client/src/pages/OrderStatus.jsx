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

  if (error) return <div className="grid min-h-screen place-items-center px-6 text-center font-medium">{error}</div>;
  if (!data) return <div className="grid min-h-screen place-items-center text-stone-500">Loading your order…</div>;

  const { order, restaurant } = data;
  const money = (n) => formatMoney(n, restaurant?.currency);
  const cancelled = order.status === 'cancelled';
  const currentIdx = STEPS.findIndex((s) => s.key === order.status);
  const timeOf = (status) => order.statusHistory.find((h) => h.status === status)?.at;
  const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-white pb-10">
      <header className="bg-brand-600 px-4 pb-5 pt-6 text-white">
        <p className="text-sm text-brand-100">{restaurant?.name} · Table {order.tableNumber}</p>
        <h1 className="mt-1 text-2xl font-bold">
          {cancelled ? 'Order cancelled' : STEPS[currentIdx]?.label}
        </h1>
        <p className="mt-1 text-sm text-brand-100">
          {cancelled ? 'Please speak to the staff.' : STEPS[currentIdx]?.hint}
        </p>
      </header>

      {!cancelled && (
        <ol className="px-6 py-6">
          {STEPS.map((step, i) => {
            const done = i <= currentIdx;
            const at = timeOf(step.key);
            return (
              <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
                {i < STEPS.length - 1 && (
                  <span className={`absolute left-[11px] top-6 h-full w-0.5 ${i < currentIdx ? 'bg-brand-600' : 'bg-stone-200'}`} />
                )}
                <span
                  className={`relative z-10 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    done ? 'bg-brand-600 text-white' : 'border-2 border-stone-300 bg-white'
                  } ${i === currentIdx && order.status !== 'served' ? 'ring-4 ring-brand-100' : ''}`}
                >
                  {done && '✓'}
                </span>
                <div className="-mt-0.5">
                  <p className={`font-medium ${done ? '' : 'text-stone-400'}`}>{step.label}</p>
                  {at && <p className="text-xs text-stone-500">{fmtTime(at)}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <section className="mx-4 rounded-2xl border border-stone-200 p-4">
        <h2 className="font-semibold">Your order{order.customerName && ` · ${order.customerName}`}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.items.map((it, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5"><VegMark isVeg={it.isVeg} /></span>
              <span className="flex-1">
                {it.qty} × {it.name}
                {it.note && <span className="block text-xs text-stone-500">“{it.note}”</span>}
              </span>
              <span>{money(it.price * it.qty)}</span>
            </li>
          ))}
        </ul>
        {order.note && <p className="mt-3 rounded-lg bg-stone-50 p-2 text-xs text-stone-600">Note: {order.note}</p>}
        <dl className="mt-4 space-y-1 border-t border-stone-100 pt-3 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
          <div className="flex justify-between text-stone-600"><dt>Tax ({order.taxPercent}%)</dt><dd>{money(order.tax)}</dd></div>
          <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{money(order.total)}</dd></div>
        </dl>
      </section>

      {menuPath && (
        <div className="px-4 pt-6">
          <Link to={menuPath} className="btn-ghost w-full py-3">+ Order more</Link>
        </div>
      )}
      <p className="mt-6 text-center text-xs text-stone-400">Placed at {fmtTime(order.createdAt)} · updates automatically</p>
    </div>
  );
}
