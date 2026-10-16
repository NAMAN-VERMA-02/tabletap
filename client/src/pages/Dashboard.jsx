import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Overview tab. Analytics get built here later.
const sections = [
  { name: 'Menu', to: '/dashboard/menu', ready: true },
  { name: 'Tables & QR codes' },
  { name: 'Kitchen display' },
  { name: 'Orders' },
  { name: 'Analytics' },
  { name: 'Staff' },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <>
      <h2 className="text-2xl font-bold">Hi {user.name.split(' ')[0]} 👋</h2>
      <p className="mt-1 text-stone-600">Here's what you can set up for your restaurant.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) =>
          s.ready ? (
            <Link
              key={s.name}
              to={s.to}
              className="rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-brand-500 hover:shadow-sm"
            >
              <h3 className="font-semibold">{s.name}</h3>
              <p className="mt-1 text-sm text-brand-600">Manage →</p>
            </Link>
          ) : (
            <div key={s.name} className="rounded-2xl border border-dashed border-stone-300 bg-white p-5">
              <h3 className="font-semibold">{s.name}</h3>
              <p className="mt-1 text-sm text-stone-500">Coming soon</p>
            </div>
          )
        )}
      </div>
    </>
  );
}
