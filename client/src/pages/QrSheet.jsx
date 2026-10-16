import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Printable A4 sheet: one card per active table, cut out and stick on the table.
export default function QrSheet() {
  const { restaurant } = useAuth();
  const [tables, setTables] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/tables/qr-sheet')
      .then(({ data }) => setTables(data.tables))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <p className="p-8 text-red-600">{error}</p>;
  if (!tables) return <p className="p-8 text-stone-500">Generating QR codes…</p>;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-6 py-4 print:hidden">
        <div>
          <h1 className="display text-3xl">QR sheet · {restaurant?.name}</h1>
          <p className="text-sm text-stone-500">{tables.length} active tables. Print, cut along the dashed lines, and stick one on each table.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard/tables" className="btn-ghost">Back</Link>
          <button onClick={() => window.print()} className="btn-primary">🖨 Print</button>
        </div>
      </div>

      {tables.length === 0 ? (
        <p className="p-8 text-stone-500">No active tables to print.</p>
      ) : (
        <div className="mx-auto grid max-w-[210mm] grid-cols-2 gap-0 p-6 sm:grid-cols-3 print:p-0">
          {tables.map((t) => (
            <div key={t._id} className="break-inside-avoid border border-dashed border-stone-300 p-5 text-center">
              <p className="eyebrow text-stone-500">{restaurant?.name}</p>
              <img src={t.qr} alt={`QR for table ${t.number}`} className="mx-auto my-3 w-full max-w-[45mm]" />
              <p className="display text-3xl">Table {t.number}</p>
              {t.label && <p className="text-sm text-stone-500">{t.label}</p>}
              <p className="mt-2 text-xs text-stone-500">Scan to see the menu and order</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
