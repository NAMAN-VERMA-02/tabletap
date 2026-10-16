import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../../lib/api';

// Shows one table's QR with download, copy-link and regenerate actions.
export default function QrPanel({ table, onRegenerated }) {
  const [qr, setQr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/tables/${table._id}/qr`)
      .then(({ data }) => !cancelled && setQr(data))
      .catch((err) => toast.error(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [table._id]);

  const regenerate = async () => {
    if (!window.confirm('Make a new QR code? The old printed one will stop working.')) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/tables/${table._id}/regenerate-qr`);
      setQr(data);
      onRegenerated(data.table);
      toast.success('New QR code created. Reprint it!');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(qr.url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  if (!qr) return <p className="py-10 text-center text-stone-500">Generating QR…</p>;

  return (
    <div className="text-center">
      <img src={qr.qr} alt={`QR code for table ${table.number}`} className="mx-auto w-64 rounded-lg border border-stone-200" />
      <p className="mt-3 break-all text-xs text-stone-500">{qr.url}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <a href={qr.qr} download={`table-${table.number}-qr.png`} className="btn-primary">Download PNG</a>
        <button onClick={copyLink} className="btn-ghost">Copy link</button>
        <a href={qr.url} target="_blank" rel="noreferrer" className="btn-ghost">Open</a>
        <button onClick={regenerate} disabled={busy} className="btn text-red-600 hover:bg-red-50">Regenerate</button>
      </div>
    </div>
  );
}
