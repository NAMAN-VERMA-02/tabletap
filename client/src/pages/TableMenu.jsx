import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../lib/api';
import { formatMoney } from '../lib/format';
import { readJSON, writeJSON } from '../lib/storage';
import useCart from '../hooks/useCart';
import Modal from '../components/Modal';
import VegMark from '../components/menu/VegMark';
import QtyStepper from '../components/order/QtyStepper';
import CartSheet from '../components/order/CartSheet';

// What a diner sees after scanning the table's QR code. No login needed.
export default function TableMenu() {
  const { qrToken } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const cart = useCart(qrToken, data?.restaurant.taxPercent);
  const pastOrders = readJSON(`tabletap:orders:${qrToken}`, []);
  const money = (n) => formatMoney(n, data?.restaurant.currency);

  const loadMenu = async () => {
    try {
      const res = await api.get(`/public/t/${qrToken}`);
      setData(res.data);
      cart.syncWithMenu(res.data.items);
      writeJSON('tabletap:lastMenu', `/t/${qrToken}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  useEffect(() => {
    loadMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrToken]);

  const sections = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const items = data.items.filter(
      (i) => (!vegOnly || i.isVeg) && (!q || i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q))
    );
    return data.categories
      .map((c) => ({ ...c, items: items.filter((i) => i.category === c._id) }))
      .filter((s) => s.items.length > 0);
  }, [data, search, vegOnly]);

  const placeOrder = async (extra) => {
    try {
      const { data: res } = await api.post(`/public/t/${qrToken}/orders`, {
        items: cart.lines.map(({ menuItem, qty, note }) => ({ menuItem, qty, ...(note.trim() && { note: note.trim() }) })),
        ...(extra.customerName && { customerName: extra.customerName }),
        ...(extra.note && { note: extra.note }),
      });
      const token = res.order.trackingToken;
      writeJSON(`tabletap:orders:${qrToken}`, [token, ...pastOrders].slice(0, 10));
      cart.clear();
      setCartOpen(false);
      navigate(`/order/${token}`);
    } catch (err) {
      toast.error(errorMessage(err), { duration: 5000 });
      // A dish sold out or vanished while they were browsing: refresh the menu and cart.
      if ([400, 409].includes(err?.response?.status)) await loadMenu();
    }
  };

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-5xl">😕</p>
          <p className="mt-4 font-medium">{error}</p>
        </div>
      </div>
    );
  }
  if (!data) return <div className="grid min-h-screen place-items-center text-stone-500">Loading menu…</div>;

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-white pb-28">
      <header className="bg-brand-600 px-4 pb-5 pt-6 text-white">
        <h1 className="text-2xl font-bold">{data.restaurant.name}</h1>
        <p className="mt-1 text-sm text-brand-100">
          Table {data.table.number}
          {data.table.label && ` · ${data.table.label}`}
        </p>
      </header>

      {pastOrders.length > 0 && (
        <Link
          to={`/order/${pastOrders[0]}`}
          className="flex items-center justify-between border-b border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700"
        >
          Track your last order <span>→</span>
        </Link>
      )}

      <div className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 px-4 pb-2 pt-3 backdrop-blur">
        <div className="flex gap-2">
          <input
            className="input"
            type="search"
            placeholder="Search dishes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-stone-300 px-3 text-sm">
            <input type="checkbox" className="accent-green-600" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} />
            Veg
          </label>
        </div>
        <nav className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
          {sections.map((s) => (
            <a
              key={s._id}
              href={`#cat-${s._id}`}
              className="whitespace-nowrap rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700 hover:bg-stone-200"
            >
              {s.name}
            </a>
          ))}
        </nav>
      </div>

      {sections.length === 0 ? (
        <p className="px-4 py-16 text-center text-stone-500">
          {data.items.length === 0 ? 'The menu is being set up. Please ask the staff.' : 'No dishes match.'}
        </p>
      ) : (
        sections.map((s) => (
          <section key={s._id} id={`cat-${s._id}`} className="scroll-mt-32 px-4 pt-6">
            <h2 className="text-lg font-bold">{s.name}</h2>
            <ul className="divide-y divide-stone-100">
              {s.items.map((item) => (
                <li key={item._id} className="flex gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <VegMark isVeg={item.isVeg} />
                    <h3 className="mt-1 font-semibold">{item.name}</h3>
                    <p className="text-sm font-medium">{money(item.price)}</p>
                    {item.description && <p className="mt-1 line-clamp-2 text-sm text-stone-500">{item.description}</p>}
                    {item.tags?.length > 0 && (
                      <p className="mt-1 text-xs text-brand-700">{item.tags.join(' · ')}</p>
                    )}
                  </div>
                  <div className="relative flex w-28 shrink-0 flex-col items-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-24 w-28 rounded-xl object-cover" loading="lazy" />
                    ) : (
                      <div className="h-6" />
                    )}
                    <div className={item.imageUrl ? '-mt-4' : ''}>
                      <QtyStepper qty={cart.qtyOf(item._id)} onChange={(q) => cart.setQty(item, q)} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-2xl p-3">
          <button
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between rounded-xl bg-brand-600 px-5 py-4 font-semibold text-white shadow-lg hover:bg-brand-700"
          >
            <span>
              {cart.count} {cart.count === 1 ? 'item' : 'items'} · {money(cart.subtotal)}
            </span>
            <span>View cart →</span>
          </button>
        </div>
      )}

      <Modal open={cartOpen} title="Your order" onClose={() => setCartOpen(false)}>
        <CartSheet
          cart={cart}
          currency={data.restaurant.currency}
          taxPercent={data.restaurant.taxPercent}
          onPlace={placeOrder}
        />
      </Modal>
    </div>
  );
}
