import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/menu', label: 'Menu' },
  { to: '/dashboard/tables', label: 'Tables' },
  { to: '/dashboard/orders', label: 'Orders' },
  { to: '/kitchen', label: 'Kitchen display ↗' },
];

export default function DashboardLayout() {
  const { user, restaurant, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-brand-600">TableTap</p>
            <h1 className="truncate text-lg font-semibold">{restaurant?.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-stone-600 sm:inline">
              {user.name} · <span className="capitalize">{user.role}</span>
            </span>
            <button onClick={onLogout} className="btn-ghost">Log out</button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                  isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-stone-600 hover:text-stone-900'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
