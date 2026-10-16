import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../lib/api';

// Public demo account created by `npm run seed` / `npm run dev:demo` on the server.
const DEMO = { email: 'demo@tabletap.test', password: 'demo12345' };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const doLogin = async (credentials) => {
    setSubmitting(true);
    try {
      await login(credentials);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    doLogin(form);
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to run your restaurant."
      footer={<>New here? <Link to="/register" className="font-medium text-stone-800 underline underline-offset-4">Create an account</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <label className="block">
          <span className="eyebrow mb-2 block text-stone-500">Email</span>
          <input name="email" type="email" required autoComplete="email" className="input" value={form.email} onChange={onChange} />
        </label>
        <label className="block">
          <span className="eyebrow mb-2 block text-stone-500">Password</span>
          <input name="password" type="password" required autoComplete="current-password" className="input" value={form.password} onChange={onChange} />
        </label>
        <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <div className={`mt-6 border p-4 ${params.get('demo') ? 'border-brand-500 bg-brand-50' : 'border-stone-700/10'}`}>
        <p className="text-sm text-stone-700">Just looking around?</p>
        <p className="mt-1 text-xs text-stone-500">Open a sample restaurant with a full menu, tables, live orders and 30 days of history.</p>
        <button type="button" disabled={submitting} onClick={() => doLogin(DEMO)} className="btn-ghost mt-3 w-full">
          Explore the demo restaurant
        </button>
      </div>
    </AuthLayout>
  );
}
