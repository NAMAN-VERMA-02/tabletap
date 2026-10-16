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
import Photo from '../components/ui/Photo';

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
      <div className="grid min-h-screen place-items-center bg-sand px-6 text-center">
        <div className="max-w-sm">
          <p className="eyebrow text-stone-500">TableTap</p>
          <p className="display mt-4 text-4xl">{error}</p>
        </div>
      </div>
    );
  }
  if (!data) return <div className="grid min-h-screen place-items-center bg-sand text-stone-500">Loading menu…</div>;

  return (
    <div className="min-h-screen bg-sand pb-32">
      {/* Photo header */}
      <header className="relative h-64 sm:h-80">
        <Photo src="/images/menu-header.jpg" tone="dusk" priority className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-black/65" />
        <div className="relative mx-auto flex h-full max-w-2xl flex-col justify-end px-5 pb-7 text-white">
          <p className="eyebrow text-white/75">
            Table {data.table.number}
            {data.table.label && ` · ${data.table.label}`}
          </p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">{data.restaurant.name}</h1>
        </div>
      </header>

      {pastOrders.length > 0 && (
        <Link
          to={`/order/${pastOrders[0]}`}
          className="mx-auto flex max-w-2xl items-center justify-between border-b border-stone-700/10 px-5 py-4 text-sm text-stone-700"
        >
          <span className="eyebrow">Track your order</span> <span aria-hidden>→</span>
        </Link>
      )}

      {/* Search, veg filter and category jump links */}
      <div className="sticky top-0 z-10 border-b border-stone-700/10 bg-sand/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-5 pb-3 pt-4">
          <div className="flex gap-2">
            <input
              className="input bg-transparent"
              type="search"
              placeholder="Search the menu"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label className={`eyebrow flex shrink-0 cursor-pointer items-center gap-2 rounded-[4px] border px-3 transition ${vegOnly ? 'border-green-700 text-green-800' : 'border-stone-300 text-stone-600'}`}>
              <input type="checkbox" className="accent-green-700" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} />
              Veg
            </label>
          </div>
          <nav className="-mx-5 mt-3 flex gap-6 overflow-x-auto px-5" aria-label="Menu sections">
            {sections.map((s) => (
              <a key={s._id} href={`#cat-${s._id}`} className="eyebrow whitespace-nowrap py-1 text-stone-500 transition hover:text-stone-900">
                {s.name}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-5">
        {sections.length === 0 ? (
          <p className="py-20 text-center text-stone-500">
            {data.items.length === 0 ? 'The menu is being set up. Please ask the staff.' : 'Nothing matches that search.'}
          </p>
        ) : (
          sections.map((s, si) => (
            <section key={s._id} id={`cat-${s._id}`} className="scroll-mt-36 pt-12">
              <div className="flex items-baseline gap-4 border-b border-stone-700/15 pb-3">
                <span className="text-xs tabular-nums text-stone-400">{String(si + 1).padStart(2, '0')}</span>
                <h2 className="display text-4xl">{s.name}</h2>
              </div>
              <ul className="divide-y divide-stone-700/10">
                {s.items.map((item) => (
                  <li key={item._id} className="flex gap-4 py-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <VegMark isVeg={item.isVeg} />
                        {item.tags?.length > 0 && <span className="eyebrow text-[10px] text-brand-600">{item.tags.join(' · ')}</span>}
                      </div>
                      <h3 className="mt-2 text-lg font-medium leading-snug text-stone-800">{item.name}</h3>
                      {item.description && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-stone-500">{item.description}</p>}
                      <p className="mt-2 tabular-nums text-stone-700">{money(item.price)}</p>
                    </div>
                    <div className="flex w-28 shrink-0 flex-col items-center sm:w-32">
                      <DishImage item={item} />
                      <div className="-mt-4 relative">
                        <QtyStepper qty={cart.qtyOf(item._id)} onChange={(q) => cart.setQty(item, q)} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>

      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-2xl p-4">
          <button
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between rounded-[4px] bg-stone-800 px-5 py-4 text-stone-50 shadow-2xl transition hover:bg-stone-950"
          >
            <span className="text-sm">
              {cart.count} {cart.count === 1 ? 'item' : 'items'} · <span className="tabular-nums">{money(cart.subtotal)}</span>
            </span>
            <span className="eyebrow">View order →</span>
          </button>
        </div>
      )}

      <Modal open={cartOpen} title="Your order" onClose={() => setCartOpen(false)}>
        <CartSheet cart={cart} currency={data.restaurant.currency} taxPercent={data.restaurant.taxPercent} onPlace={placeOrder} />
      </Modal>
    </div>
  );
}

// The dish's own photo, or a matching file in /images/dishes/ (e.g. "Paneer Tikka" -> paneer-tikka.jpg).
// Shows a quiet placeholder if neither exists, so rows stay aligned.
function DishImage({ item }) {
  const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return <Photo src={item.imageUrl || `/images/dishes/${slug}.jpg`} alt={item.name} tone="sand" className="aspect-square w-full" />;
}
