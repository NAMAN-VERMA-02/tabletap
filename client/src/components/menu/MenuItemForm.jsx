import { useState } from 'react';

const empty = { name: '', description: '', price: '', category: '', imageUrl: '', isVeg: true, isAvailable: true, tags: '' };

function toForm(item, defaultCategory) {
  if (!item) return { ...empty, category: defaultCategory || '' };
  return {
    name: item.name,
    description: item.description || '',
    price: String(item.price),
    category: item.category,
    imageUrl: item.imageUrl || '',
    isVeg: item.isVeg,
    isAvailable: item.isAvailable,
    tags: (item.tags || []).join(', '),
  };
}

export default function MenuItemForm({ item, categories, defaultCategory, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => toForm(item, defaultCategory));
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) =>
    setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        category: form.category,
        imageUrl: form.imageUrl.trim(),
        isVeg: form.isVeg,
        isAvailable: form.isAvailable,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Name</span>
        <input className="input" required maxLength={80} value={form.name} onChange={set('name')} autoFocus />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Price (₹)</span>
          <input className="input" type="number" required min="0" step="0.01" value={form.price} onChange={set('price')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Category</span>
          <select className="input" required value={form.category} onChange={set('category')}>
            <option value="" disabled>Choose…</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Description <span className="text-stone-400">(optional)</span></span>
        <textarea className="input" rows={2} maxLength={300} value={form.description} onChange={set('description')} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Image URL <span className="text-stone-400">(optional)</span></span>
        <input className="input" type="url" placeholder="https://…" value={form.imageUrl} onChange={set('imageUrl')} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Tags <span className="text-stone-400">(comma separated)</span></span>
        <input className="input" placeholder="spicy, bestseller" value={form.tags} onChange={set('tags')} />
      </label>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isVeg} onChange={set('isVeg')} className="accent-green-600" /> Vegetarian
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isAvailable} onChange={set('isAvailable')} className="accent-brand-600" /> Available
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : item ? 'Save changes' : 'Add item'}
        </button>
      </div>
    </form>
  );
}
