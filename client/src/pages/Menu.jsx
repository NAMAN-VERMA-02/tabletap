import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import MenuItemForm from '../components/menu/MenuItemForm';
import VegMark from '../components/menu/VegMark';
import { formatMoney } from '../lib/format';

const formatPrice = (n, currency) => formatMoney(n, currency);

export default function Menu() {
  const { user } = useAuth();
  const isOwner = user.role === 'owner';

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [renaming, setRenaming] = useState(null); // { _id, name }
  const [editing, setEditing] = useState(null); // null | 'new' | item

  const load = useCallback(async () => {
    try {
      const [c, i] = await Promise.all([api.get('/categories'), api.get('/menu-items')]);
      setCategories(c.data.categories);
      setItems(i.data.items);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Counts come from the item list so they stay right after every add/edit/delete.
  const counts = useMemo(() => {
    const map = {};
    items.forEach((i) => (map[i.category] = (map[i.category] || 0) + 1));
    return map;
  }, [items]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) => (activeCategory === 'all' || i.category === activeCategory) && (!q || i.name.toLowerCase().includes(q))
    );
  }, [items, activeCategory, search]);

  const categoryName = (id) => categories.find((c) => c._id === id)?.name || '—';

  // ---- Categories ----
  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      const { data } = await api.post('/categories', { name: newCategory.trim() });
      setCategories((prev) => [...prev, data.category]);
      setNewCategory('');
      toast.success('Category added');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const renameCategory = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.patch(`/categories/${renaming._id}`, { name: renaming.name.trim() });
      setCategories((prev) => prev.map((c) => (c._id === data.category._id ? data.category : c)));
      setRenaming(null);
      toast.success('Category renamed');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const deleteCategory = async (cat) => {
    if (!window.confirm(`Delete the "${cat.name}" category?`)) return;
    try {
      await api.delete(`/categories/${cat._id}`);
      setCategories((prev) => prev.filter((c) => c._id !== cat._id));
      if (activeCategory === cat._id) setActiveCategory('all');
      toast.success('Category deleted');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  // ---- Items ----
  const saveItem = async (payload) => {
    try {
      if (editing === 'new') {
        const { data } = await api.post('/menu-items', payload);
        setItems((prev) => [...prev, data.item]);
        toast.success('Item added');
      } else {
        const { data } = await api.patch(`/menu-items/${editing._id}`, payload);
        setItems((prev) => prev.map((i) => (i._id === data.item._id ? data.item : i)));
        toast.success('Item updated');
      }
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.delete(`/menu-items/${item._id}`);
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      toast.success('Item deleted');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  // Optimistic: flip it in the UI right away, roll back if the server says no.
  const toggleAvailability = async (item) => {
    const next = !item.isAvailable;
    setItems((prev) => prev.map((i) => (i._id === item._id ? { ...i, isAvailable: next } : i)));
    try {
      await api.patch(`/menu-items/${item._id}/availability`, { isAvailable: next });
    } catch (err) {
      setItems((prev) => prev.map((i) => (i._id === item._id ? { ...i, isAvailable: !next } : i)));
      toast.error(errorMessage(err));
    }
  };

  if (loading) return <p className="text-stone-500">Loading menu…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Categories */}
      <aside className="space-y-3">
        <h2 className="display text-3xl">Categories</h2>
        <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          <li>
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm ${
                activeCategory === 'all' ? 'bg-brand-100 font-medium text-brand-700' : 'hover:bg-stone-100'
              }`}
            >
              All items <span className="text-stone-500">{items.length}</span>
            </button>
          </li>
          {categories.map((c) => (
            <li key={c._id} className="group relative">
              <button
                onClick={() => setActiveCategory(c._id)}
                className={`flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm ${
                  activeCategory === c._id ? 'bg-brand-100 font-medium text-brand-700' : 'hover:bg-stone-100'
                } ${isOwner ? 'lg:pr-20' : ''}`}
              >
                {c.name} <span className="text-stone-500">{counts[c._id] || 0}</span>
              </button>
              {isOwner && (
                <span className="absolute right-8 top-1/2 hidden -translate-y-1/2 gap-1 lg:group-hover:flex">
                  <button onClick={() => setRenaming({ _id: c._id, name: c.name })} className="rounded px-1 text-xs text-stone-500 hover:bg-stone-50" title="Rename">✎</button>
                  <button onClick={() => deleteCategory(c)} className="rounded px-1 text-xs text-red-600 hover:bg-stone-50" title="Delete">🗑</button>
                </span>
              )}
            </li>
          ))}
        </ul>

        {isOwner && (
          <form onSubmit={addCategory} className="flex gap-2">
            <input
              className="input"
              placeholder="New category"
              maxLength={50}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <button type="submit" className="btn-ghost shrink-0">Add</button>
          </form>
        )}
      </aside>

      {/* Items */}
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="display text-4xl">
            {activeCategory === 'all' ? 'All items' : categoryName(activeCategory)}
          </h2>
          <div className="flex gap-2">
            <input
              className="input sm:w-56"
              placeholder="Search dishes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {isOwner && (
              <button
                onClick={() => (categories.length ? setEditing('new') : toast.error('Add a category first'))}
                className="btn-primary shrink-0"
              >
                + Add item
              </button>
            )}
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-10 text-center text-stone-500">
            {items.length === 0
              ? categories.length === 0
                ? 'Start by adding a category like "Starters" on the left.'
                : 'No dishes yet. Click "Add item" to create your first one.'
              : 'No dishes match.'}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => (
              <li
                key={item._id}
                className={`flex flex-col overflow-hidden rounded-md border border-stone-200 bg-stone-50 ${
                  item.isAvailable ? '' : 'opacity-60'
                }`}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-36 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid h-36 place-items-center bg-brand-50 text-4xl">🍽️</div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start gap-2">
                    <span className="mt-1"><VegMark isVeg={item.isVeg} /></span>
                    <h3 className="flex-1 font-semibold leading-snug">{item.name}</h3>
                    <span className="font-semibold">{formatPrice(item.price)}</span>
                  </div>
                  {item.description && <p className="mt-1 line-clamp-2 text-sm text-stone-600">{item.description}</p>}
                  {item.tags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.tags.map((t) => (
                        <span key={t} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{t}</span>
                      ))}
                    </div>
                  )}
                  {activeCategory === 'all' && <p className="mt-2 text-xs text-stone-400">{categoryName(item.category)}</p>}

                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="accent-brand-600"
                        checked={item.isAvailable}
                        onChange={() => toggleAvailability(item)}
                      />
                      {item.isAvailable ? 'Available' : 'Sold out'}
                    </label>
                    {isOwner && (
                      <div className="flex gap-1">
                        <button onClick={() => setEditing(item)} className="btn-ghost px-3 py-1">Edit</button>
                        <button onClick={() => deleteItem(item)} className="btn px-3 py-1 text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={Boolean(editing)} title={editing === 'new' ? 'Add menu item' : 'Edit menu item'} onClose={() => setEditing(null)}>
        {editing && (
          <MenuItemForm
            key={editing === 'new' ? 'new' : editing._id}
            item={editing === 'new' ? null : editing}
            categories={categories}
            defaultCategory={activeCategory !== 'all' ? activeCategory : categories[0]?._id}
            onSubmit={saveItem}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal open={Boolean(renaming)} title="Rename category" onClose={() => setRenaming(null)}>
        {renaming && (
          <form onSubmit={renameCategory} className="space-y-4">
            <input
              className="input"
              required
              maxLength={50}
              autoFocus
              value={renaming.name}
              onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRenaming(null)} className="btn-ghost">Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
