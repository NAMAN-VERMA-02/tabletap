import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import TableForm from '../components/tables/TableForm';
import QrPanel from '../components/tables/QrPanel';

export default function Tables() {
  const { user } = useAuth();
  const isOwner = user.role === 'owner';

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | table
  const [qrFor, setQrFor] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/tables');
      setTables(data.tables);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upsert = (table) =>
    setTables((prev) =>
      (prev.some((t) => t._id === table._id) ? prev.map((t) => (t._id === table._id ? table : t)) : [...prev, table]).sort(
        (a, b) => a.number - b.number
      )
    );

  const save = async (payload) => {
    try {
      const { data } =
        editing === 'new' ? await api.post('/tables', payload) : await api.patch(`/tables/${editing._id}`, payload);
      upsert(data.table);
      toast.success(editing === 'new' ? `Table ${data.table.number} added` : 'Table updated');
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const toggleActive = async (table) => {
    try {
      const { data } = await api.patch(`/tables/${table._id}`, { isActive: !table.isActive });
      upsert(data.table);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (table) => {
    if (!window.confirm(`Delete table ${table.number}? Its QR code will stop working.`)) return;
    try {
      await api.delete(`/tables/${table._id}`);
      setTables((prev) => prev.filter((t) => t._id !== table._id));
      toast.success('Table deleted');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading) return <p className="text-stone-500">Loading tables…</p>;

  const activeCount = tables.filter((t) => t.isActive).length;
  const totalSeats = tables.filter((t) => t.isActive).reduce((sum, t) => sum + t.seats, 0);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tables</h2>
          <p className="text-sm text-stone-600">
            {activeCount} active {activeCount === 1 ? 'table' : 'tables'} · {totalSeats} seats
          </p>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <Link
              to="/print/qr-codes"
              target="_blank"
              className={`btn-ghost ${activeCount ? '' : 'pointer-events-none opacity-50'}`}
            >
              🖨 Print QR sheet
            </Link>
            <button onClick={() => setEditing('new')} className="btn-primary">+ Add table</button>
          </div>
        )}
      </div>

      {tables.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">
          No tables yet. {isOwner && 'Add one, then print its QR code and stick it on the table.'}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map((t) => (
            <li
              key={t._id}
              className={`flex flex-col rounded-2xl border bg-white p-4 ${
                t.isActive ? 'border-stone-200' : 'border-dashed border-stone-300 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone-500">Table</p>
                  <p className="text-3xl font-bold">{t.number}</p>
                </div>
                {!t.isActive && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">Inactive</span>}
              </div>
              <p className="mt-1 text-sm text-stone-600">
                {t.seats} seats{t.label && ` · ${t.label}`}
              </p>

              {isOwner && (
                <div className="mt-4 flex flex-wrap gap-1 border-t border-stone-100 pt-3">
                  <button onClick={() => setQrFor(t)} className="btn-primary px-3 py-1">QR</button>
                  <button onClick={() => setEditing(t)} className="btn-ghost px-3 py-1">Edit</button>
                  <button onClick={() => toggleActive(t)} className="btn-ghost px-3 py-1">
                    {t.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => remove(t)} className="btn px-2 py-1 text-red-600 hover:bg-red-50" title="Delete">🗑</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal open={Boolean(editing)} title={editing === 'new' ? 'Add table' : `Edit table ${editing?.number}`} onClose={() => setEditing(null)}>
        {editing && (
          <TableForm
            key={editing === 'new' ? 'new' : editing._id}
            table={editing === 'new' ? null : editing}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal open={Boolean(qrFor)} title={`Table ${qrFor?.number} QR code`} onClose={() => setQrFor(null)}>
        {qrFor && <QrPanel table={qrFor} onRegenerated={upsert} />}
      </Modal>
    </>
  );
}
