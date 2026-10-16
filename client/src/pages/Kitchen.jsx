import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../lib/api';
import { connectSocket } from '../lib/socket';
import { playChime, unlockAudio } from '../lib/chime';
import { readJSON, writeJSON } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import OrderCard from '../components/kitchen/OrderCard';

const COLUMNS = [
  { status: 'received', title: 'New', accent: 'bg-blue-500' },
  { status: 'preparing', title: 'Preparing', accent: 'bg-amber-500' },
  { status: 'ready', title: 'Ready to serve', accent: 'bg-green-600' },
];
const ACTIVE = COLUMNS.map((c) => c.status);

// Full-screen kitchen display, meant for a tablet or TV on the kitchen wall.
export default function Kitchen() {
  const { user, restaurant } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [freshIds, setFreshIds] = useState(() => new Set());
  const [now, setNow] = useState(Date.now());
  const [sound, setSound] = useState(() => readJSON('tabletap:kitchenSound', false));
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const loadActive = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/active');
      setOrders(data.orders);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const socket = connectSocket();

    // Refetch on every (re)connect so nothing is missed while offline.
    socket.on('connect', () => {
      setConnected(true);
      loadActive();
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('order:new', (order) => {
      setOrders((prev) => (prev.some((o) => o._id === order._id) ? prev : [...prev, order]));
      setFreshIds((prev) => new Set(prev).add(order._id));
      setTimeout(() => setFreshIds((prev) => {
        const next = new Set(prev);
        next.delete(order._id);
        return next;
      }), 4000);
      toast(`New order · Table ${order.tableNumber}`, { icon: '🔔' });
      if (soundRef.current) playChime();
    });

    // Another screen (or the owner) moved an order.
    socket.on('order:updated', (order) => {
      setOrders((prev) =>
        ACTIVE.includes(order.status)
          ? prev.map((o) => (o._id === order._id ? order : o))
          : prev.filter((o) => o._id !== order._id)
      );
    });

    return () => socket.disconnect();
  }, [loadActive]);

  // Keep the "x minutes ago" timers fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const move = async (order, status) => {
    setBusyId(order._id);
    try {
      const { data } = await api.patch(`/orders/${order._id}/status`, { status });
      setOrders((prev) =>
        ACTIVE.includes(status) ? prev.map((o) => (o._id === order._id ? data.order : o)) : prev.filter((o) => o._id !== order._id)
      );
    } catch (err) {
      toast.error(errorMessage(err));
      loadActive(); // someone else probably moved it first
    } finally {
      setBusyId(null);
    }
  };

  const toggleSound = () => {
    const next = !sound;
    if (next) {
      unlockAudio();
      playChime();
    }
    setSound(next);
    writeJSON('tabletap:kitchenSound', next);
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-950 text-stone-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="rounded-[4px] px-2 py-1 text-stone-400 transition hover:bg-white/10 hover:text-white" title="Back to dashboard">←</Link>
          <div>
            <h1 className="display text-3xl">Kitchen <span className="text-stone-500">· {restaurant?.name}</span></h1>
            <p className="eyebrow mt-1 flex items-center gap-1.5 text-[10px] text-stone-400">
              <span className={`size-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-500'}`} />
              {connected ? 'Live' : 'Reconnecting…'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleSound}
          className={`btn ${sound ? 'bg-stone-100 text-stone-900' : 'border border-white/20 text-stone-300 hover:border-white/50'}`}
        >
          {sound ? 'Sound on' : 'Tap to enable sound'}
        </button>
      </header>

      {loading ? (
        <p className="p-8 text-stone-400">Loading orders…</p>
      ) : (
        <main className="grid flex-1 gap-4 p-4 sm:p-6 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const list = orders.filter((o) => o.status === col.status);
            return (
              <section key={col.status} className="flex min-h-40 flex-col rounded-md border border-white/5 bg-white/[0.03] p-3">
                <h2 className="eyebrow mb-4 flex items-center gap-2 px-1 pt-1 text-stone-300">
                  <span className={`size-2.5 rounded-full ${col.accent}`} />
                  {col.title}
                  <span className="ml-auto text-sm tabular-nums text-stone-400">{list.length}</span>
                </h2>
                <div className="space-y-3">
                  {list.length === 0 ? (
                    <p className="px-1 py-10 text-center text-sm text-stone-600">Nothing here</p>
                  ) : (
                    list.map((o) => (
                      <OrderCard
                        key={o._id}
                        order={o}
                        now={now}
                        isOwner={user.role === 'owner'}
                        busy={busyId === o._id}
                        isNew={freshIds.has(o._id)}
                        onMove={move}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </main>
      )}
    </div>
  );
}
