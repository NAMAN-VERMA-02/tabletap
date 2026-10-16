import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  { title: 'Scan & order', text: 'Diners scan the QR on their table and order from a live menu. No app, no sign-up.' },
  { title: 'Live kitchen screen', text: 'Orders land on the kitchen display instantly and move from Preparing to Served in one tap.' },
  { title: 'Know your numbers', text: 'Daily revenue, top dishes and peak hours, all on one dashboard.' },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="text-xl font-bold text-brand-600">TableTap</span>
        <nav className="flex gap-2">
          {user ? (
            <Link to="/dashboard" className="btn-primary">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Log in</Link>
              <Link to="/register" className="btn-primary">Get started</Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-12 text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          QR ordering and a live kitchen screen for your restaurant
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-stone-600">
          Put a QR on every table. Orders go straight to the kitchen, and diners watch their food's status live.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/register" className="btn-primary px-6 py-3">Set up your restaurant</Link>
        </div>

        <section className="mt-16 grid gap-4 text-left sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-stone-200 bg-white p-5">
              <h2 className="font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-stone-600">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
