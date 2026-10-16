import { Link } from 'react-router-dom';

// Wordmark: thin serif with a small bronze dot.
export default function Logo({ light = false, className = '', to = '/' }) {
  return (
    <Link
      to={to}
      className={`display inline-flex items-baseline gap-1 text-2xl tracking-[0.02em] ${light ? 'text-white' : 'text-stone-800'} ${className}`}
      aria-label="TableTap home"
    >
      TableTap
      <span className={`inline-block size-1.5 rounded-full ${light ? 'bg-white/80' : 'bg-brand-500'}`} />
    </Link>
  );
}
