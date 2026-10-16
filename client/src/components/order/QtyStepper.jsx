export default function QtyStepper({ qty, onChange, size = 'md' }) {
  const pad = size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-2';

  if (qty === 0) {
    return (
      <button
        onClick={() => onChange(1)}
        className={`eyebrow rounded-[4px] border border-stone-700 bg-stone-50 text-stone-800 shadow-sm transition hover:bg-stone-800 hover:text-stone-50 ${size === 'sm' ? 'px-3 py-1' : 'px-5 py-2'}`}
      >
        Add
      </button>
    );
  }

  return (
    <div className="inline-flex items-center rounded-[4px] bg-stone-800 text-sm text-stone-50 shadow-sm">
      <button onClick={() => onChange(qty - 1)} className={`${pad} rounded-l-[4px] hover:bg-stone-950`} aria-label="Remove one">−</button>
      <span className="min-w-6 text-center tabular-nums" aria-live="polite">{qty}</span>
      <button
        onClick={() => onChange(qty + 1)}
        disabled={qty >= 20}
        className={`${pad} rounded-r-[4px] hover:bg-stone-950 disabled:opacity-40`}
        aria-label="Add one"
      >
        +
      </button>
    </div>
  );
}
