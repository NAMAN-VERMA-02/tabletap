import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { href: '#how', label: 'How it works' },
  { href: '#kitchen', label: 'Kitchen' },
  { href: '#features', label: 'Features' },
];

// Transparent over the hero, turns solid sand once you scroll.
export default function SiteHeader() {
  const { user } = useAuth();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const light = !solid && !open;
  const linkCls = `eyebrow transition-opacity hover:opacity-60 ${light ? 'text-white' : 'text-stone-700'}`;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-colors duration-500 ${
          solid ? 'border-b border-stone-700/10 bg-sand/90 backdrop-blur-md' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto_1fr] gap-2 items-center px-4 sm:px-8">
          <nav className="hidden items-center gap-8 md:flex" aria-label="Sections">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className={linkCls}>{n.label}</a>
            ))}
          </nav>
          <button
            onClick={() => setOpen(!open)}
            className={`eyebrow flex items-center gap-2 md:hidden ${light ? 'text-white' : 'text-stone-700'}`}
            aria-expanded={open}
            aria-controls="site-menu"
          >
            <span className="flex w-5 flex-col gap-1.5">
              <span className={`h-px w-full bg-current transition ${open ? 'translate-y-[3.5px] rotate-45' : ''}`} />
              <span className={`h-px w-full bg-current transition ${open ? '-translate-y-[3.5px] -rotate-45' : ''}`} />
            </span>
            {open ? 'Close' : 'Menu'}
          </button>

          <Logo light={light} className="justify-self-center" />

          <div className="flex items-center justify-end gap-6">
            {user ? (
              <Link to="/dashboard" className={`btn whitespace-nowrap px-3 sm:px-5 ${light ? 'bg-white/15 text-white backdrop-blur hover:bg-white/25' : 'bg-stone-700 text-stone-50 hover:bg-stone-900'}`}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className={`${linkCls} hidden sm:inline`}>Log in</Link>
                <Link
                  to="/register"
                  className={`btn whitespace-nowrap px-3 sm:px-5 ${light ? 'bg-white/15 text-white backdrop-blur hover:bg-white/25' : 'bg-stone-700 text-stone-50 hover:bg-stone-900'}`}
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      <div
        id="site-menu"
        className={`fixed inset-0 z-30 bg-sand pt-24 transition-opacity duration-500 md:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <ul className="divide-y divide-stone-700/10 border-y border-stone-700/10 px-4">
          {[...NAV, { href: '/login', label: 'Log in', route: true }].map((n, i) => (
            <li key={n.href}>
              {n.route ? (
                <Link to={n.href} onClick={() => setOpen(false)} className="flex items-baseline gap-4 py-5">
                  <span className="text-xs tabular-nums text-stone-500">0{i + 1}</span>
                  <span className="display text-4xl">{n.label}</span>
                </Link>
              ) : (
                <a href={n.href} onClick={() => setOpen(false)} className="flex items-baseline gap-4 py-5">
                  <span className="text-xs tabular-nums text-stone-500">0{i + 1}</span>
                  <span className="display text-4xl">{n.label}</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
