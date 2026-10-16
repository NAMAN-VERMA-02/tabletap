import { useEffect, useMemo, useState } from 'react';
import { readJSON, writeJSON } from '../lib/storage';

// Cart per table, saved in localStorage so a refresh doesn't empty it.
// Prices here are only for display; the server recalculates the real bill.
export default function useCart(qrToken, taxPercent = 0) {
  const key = `tabletap:cart:${qrToken}`;
  const [lines, setLines] = useState(() => readJSON(key, []));

  useEffect(() => writeJSON(key, lines), [key, lines]);

  const qtyOf = (id) => lines.find((l) => l.menuItem === id)?.qty || 0;

  const setQty = (item, qty) =>
    setLines((prev) => {
      if (qty <= 0) return prev.filter((l) => l.menuItem !== item._id);
      const exists = prev.some((l) => l.menuItem === item._id);
      if (exists) return prev.map((l) => (l.menuItem === item._id ? { ...l, qty: Math.min(qty, 20) } : l));
      return [...prev, { menuItem: item._id, name: item.name, price: item.price, isVeg: item.isVeg, qty: 1, note: '' }];
    });

  const setNote = (id, note) => setLines((prev) => prev.map((l) => (l.menuItem === id ? { ...l, note } : l)));

  const removeByIds = (ids) => setLines((prev) => prev.filter((l) => !ids.includes(l.menuItem)));

  // Drop dishes that are no longer on the menu and refresh prices/names.
  const syncWithMenu = (items) =>
    setLines((prev) =>
      prev.flatMap((l) => {
        const m = items.find((i) => i._id === l.menuItem);
        return m ? [{ ...l, name: m.name, price: m.price, isVeg: m.isVeg }] : [];
      })
    );

  const clear = () => setLines([]);

  const totals = useMemo(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const subtotal = Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100;
    const tax = Math.round(subtotal * taxPercent) / 100;
    return { count, subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
  }, [lines, taxPercent]);

  return { lines, qtyOf, setQty, setNote, removeByIds, syncWithMenu, clear, ...totals };
}
