import { useState } from 'react';
import VegMark from '../menu/VegMark';
import QtyStepper from './QtyStepper';
import { formatMoney } from '../../lib/format';

export default function CartSheet({ cart, currency, taxPercent, onPlace }) {
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const money = (n) => formatMoney(n, currency);

  const submit = async (e) => {
    e.preventDefault();
    setPlacing(true);
    try {
      await onPlace({ customerName: customerName.trim(), note: note.trim() });
    } finally {
      setPlacing(false);
    }
  };

  if (cart.lines.length === 0) return <p className="py-8 text-center text-stone-500">Your cart is empty.</p>;

  return (
    <form onSubmit={submit} className="space-y-5">
      <ul className="divide-y divide-stone-100">
        {cart.lines.map((l) => (
          <li key={l.menuItem} className="py-3">
            <div className="flex items-center gap-3">
              <VegMark isVeg={l.isVeg} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.name}</p>
                <p className="text-sm text-stone-500">{money(l.price * l.qty)}</p>
              </div>
              <QtyStepper qty={l.qty} size="sm" onChange={(q) => cart.setQty({ _id: l.menuItem }, q)} />
            </div>
            <input
              className="mt-2 w-full rounded-md border border-transparent bg-stone-50 px-2 py-1 text-xs outline-none focus:border-stone-300"
              placeholder="Add a note (e.g. less spicy)"
              maxLength={100}
              value={l.note}
              onChange={(e) => cart.setNote(l.menuItem, e.target.value)}
            />
          </li>
        ))}
      </ul>

      <div className="grid gap-3">
        <input
          className="input"
          placeholder="Your name (optional)"
          maxLength={40}
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <textarea
          className="input"
          rows={2}
          placeholder="Anything else for the kitchen? (optional)"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <dl className="space-y-1 rounded-xl bg-stone-50 p-4 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(cart.subtotal)}</dd></div>
        <div className="flex justify-between text-stone-600"><dt>Tax ({taxPercent}%)</dt><dd>{money(cart.tax)}</dd></div>
        <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
          <dt>Total</dt><dd>{money(cart.total)}</dd>
        </div>
      </dl>

      <button type="submit" disabled={placing} className="btn-primary w-full py-3 text-base">
        {placing ? 'Placing order…' : `Place order · ${money(cart.total)}`}
      </button>
      <p className="text-center text-xs text-stone-500">Pay at the counter after your meal.</p>
    </form>
  );
}
