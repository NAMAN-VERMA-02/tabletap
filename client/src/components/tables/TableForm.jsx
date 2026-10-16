import { useState } from 'react';

export default function TableForm({ table, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    number: table ? String(table.number) : '',
    label: table?.label || '',
    seats: table ? String(table.seats) : '4',
  });
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...(form.number !== '' && { number: Number(form.number) }),
        label: form.label.trim(),
        seats: Number(form.seats),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Table number</span>
          <input
            className="input"
            type="number"
            min="1"
            placeholder={table ? '' : 'Next free'}
            required={Boolean(table)}
            value={form.number}
            onChange={set('number')}
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Seats</span>
          <input className="input" type="number" min="1" max="50" required value={form.seats} onChange={set('seats')} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Label <span className="text-stone-400">(optional)</span></span>
        <input className="input" maxLength={40} placeholder="Patio, Window, Rooftop…" value={form.label} onChange={set('label')} />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : table ? 'Save changes' : 'Add table'}
        </button>
      </div>
    </form>
  );
}
