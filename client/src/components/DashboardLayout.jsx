import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './ui/Logo';

const links = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/menu', label: 'Menu' },
  { to: '/dashboard/tables', label: 'Tables' },
  { to: '/dashboard/orders', label: 'Orders' },
  { to: '/kitchen', label: 'Kitchen ↗' },
];

export default function DashboardLayout() {
  const { user, restaurant, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-stone-700/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Logo to="/dashboard" />
          <div className="flex items-center gap-5">
            <span className="hidden text-right text-sm leading-tight sm:block">
              <span className="block text-stone-800">{restaurant?.name}</span>
              <span className="text-xs text-stone-500">
                {user.name} · <span className="capitalize">{user.role}</span>
              </span>
            </span>
            <button onClick={onLogout} className="btn-ghost px-4 py-2">Log out</button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-7 overflow-x-auto px-4 sm:px-6" aria-label="Dashboard">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `eyebrow whitespace-nowrap border-b pb-3 pt-1 transition ${
                  isActive ? 'border-stone-800 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
