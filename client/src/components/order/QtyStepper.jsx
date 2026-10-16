export default function QtyStepper({ qty, onChange, size = 'md' }) {
  const pad = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1.5';

  if (qty === 0) {
    return (
      <button
        onClick={() => onChange(1)}
        className={`rounded-lg border border-brand-600 bg-white font-semibold text-brand-700 hover:bg-brand-50 ${pad} text-sm`}
      >
        ADD
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center rounded-lg bg-brand-600 text-sm font-semibold text-white`}>
      <button onClick={() => onChange(qty - 1)} className={`${pad} hover:bg-brand-700 rounded-l-lg`} aria-label="Remove one">−</button>
      <span className="min-w-6 text-center" aria-live="polite">{qty}</span>
      <button
        onClick={() => onChange(qty + 1)}
        disabled={qty >= 20}
        className={`${pad} hover:bg-brand-700 rounded-r-lg disabled:opacity-50`}
        aria-label="Add one"
      >
        +
      </button>
    </div>
  );
}
