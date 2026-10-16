import VegMark from '../menu/VegMark';

const NEXT = {
  received: { status: 'preparing', label: 'Start preparing', className: 'bg-amber-500 hover:bg-amber-600' },
  preparing: { status: 'ready', label: 'Mark ready', className: 'bg-green-600 hover:bg-green-700' },
  ready: { status: 'served', label: 'Served', className: 'bg-stone-800 hover:bg-stone-900' },
};

function minutesSince(date, now) {
  return Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000));
}

export default function OrderCard({ order, now, isOwner, busy, onMove, isNew }) {
  const mins = minutesSince(order.createdAt, now);
  const late = order.status !== 'ready' && mins >= 15;
  const next = NEXT[order.status];

  return (
    <article
      className={`rounded-xl border-2 bg-white p-4 shadow-sm transition ${
        late ? 'border-red-400' : 'border-stone-200'
      } ${isNew ? 'animate-[pulse_1s_ease-in-out_3]' : ''}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-2xl font-bold leading-none">T{order.tableNumber}</p>
          {order.customerName && <p className="mt-1 text-sm text-stone-600">{order.customerName}</p>}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-sm font-semibold tabular-nums ${
            late ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-700'
          }`}
          title={new Date(order.createdAt).toLocaleTimeString()}
        >
          {mins < 1 ? 'now' : `${mins}m`}
        </span>
      </header>

      <ul className="mt-3 space-y-1.5">
        {order.items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1"><VegMark isVeg={it.isVeg} /></span>
            <span className="text-lg font-semibold tabular-nums">{it.qty}×</span>
            <span className="flex-1 text-lg leading-snug">
              {it.name}
              {it.note && <span className="block text-sm font-medium text-amber-700">→ {it.note}</span>}
            </span>
          </li>
        ))}
      </ul>
      {order.note && <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-sm text-amber-800">📝 {order.note}</p>}

      <div className="mt-4 flex gap-2">
        {next && (
          <button
            onClick={() => onMove(order, next.status)}
            disabled={busy}
            className={`btn flex-1 py-3 text-base text-white ${next.className}`}
          >
            {next.label}
          </button>
        )}
        {isOwner && ['received', 'preparing'].includes(order.status) && (
          <button
            onClick={() => window.confirm(`Cancel table ${order.tableNumber}'s order?`) && onMove(order, 'cancelled')}
            disabled={busy}
            className="btn border border-stone-300 px-3 text-red-600 hover:bg-red-50"
            title="Cancel order"
          >
            ✕
          </button>
        )}
      </div>
    </article>
  );
}
