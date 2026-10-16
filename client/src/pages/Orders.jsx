import { Fragment, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../lib/api';
import { formatMoney } from '../lib/format';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLE = {
  received: 'bg-blue-50 text-blue-700',
  preparing: 'bg-amber-50 text-amber-800',
  ready: 'bg-green-50 text-green-700',
  served: 'bg-stone-100 text-stone-700',
  cancelled: 'bg-red-50 text-red-700',
};
const STATUSES = Object.keys(STATUS_STYLE);
const LIMIT = 20;

const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// Filters live in the URL (?status=&date=&page=) so a filtered view can be refreshed or shared.
export default function Orders() {
  const { restaurant } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const date = params.get('date') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const money = (n) => formatMoney(n, restaurant?.currency);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = new URLSearchParams({ page, limit: LIMIT, ...(status && { status }), ...(date && { date }) });
    api
      .get(`/orders?${q}`)
      .then(({ data: d }) => !cancelled && setData(d))
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [status, date, page]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const orders = data?.orders || [];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="display text-5xl">Order history</h2>
          <p className="text-sm text-stone-600">{data ? `${data.total} ${data.total === 1 ? 'order' : 'orders'}` : '…'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input w-auto" value={status} onChange={(e) => setFilter('status', e.target.value)} aria-label="Status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <input className="input w-auto" type="date" value={date} onChange={(e) => setFilter('date', e.target.value)} aria-label="Date" />
          {(status || date) && (
            <button onClick={() => setParams({})} className="btn-ghost">Clear</button>
          )}
        </div>
      </div>

      <div className={`overflow-x-auto rounded-md border border-stone-200 bg-stone-50 ${loading ? 'opacity-60' : ''}`}>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Placed</th>
              <th className="px-4 py-3 font-medium">Table</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {!loading && orders.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-stone-500">No orders match these filters.</td></tr>
            )}
            {orders.map((o) => {
              const open = openId === o._id;
              const count = o.items.reduce((s, i) => s + i.qty, 0);
              return (
                <Fragment key={o._id}>
                  <tr
                    onClick={() => setOpenId(open ? null : o._id)}
                    className="cursor-pointer border-b border-stone-100 hover:bg-stone-50"
                    aria-expanded={open}
                  >
                    <td className="whitespace-nowrap px-4 py-3">{fmtDateTime(o.createdAt)}</td>
                    <td className="px-4 py-3 font-medium">T{o.tableNumber}</td>
                    <td className="px-4 py-3 text-stone-600">
                      <span className="line-clamp-1">
                        {count} · {o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[o.status]}`}>{o.status}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{money(o.total)}</td>
                  </tr>
                  {open && (
                    <tr className="border-b border-stone-100 bg-stone-50/60">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <ul className="space-y-1">
                            {o.items.map((i, idx) => (
                              <li key={idx} className="flex justify-between gap-3">
                                <span>
                                  {i.qty} × {i.name}
                                  {i.note && <span className="text-stone-500"> · “{i.note}”</span>}
                                </span>
                                <span className="tabular-nums">{money(i.price * i.qty)}</span>
                              </li>
                            ))}
                            <li className="flex justify-between border-t border-stone-200 pt-1 text-stone-500">
                              <span>Tax ({o.taxPercent}%)</span><span className="tabular-nums">{money(o.tax)}</span>
                            </li>
                          </ul>
                          <div className="space-y-1 text-stone-600">
                            {o.customerName && <p>Customer: {o.customerName}</p>}
                            {o.note && <p>Note: {o.note}</p>}
                            <p className="text-xs">
                              {o.statusHistory.map((h) => `${h.status} ${new Date(h.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`).join(' → ')}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          <button disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))} className="btn-ghost">← Previous</button>
          <span className="text-stone-600">Page {page} of {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setFilter('page', String(page + 1))} className="btn-ghost">Next →</button>
        </nav>
      )}
    </>
  );
}
