import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../lib/api';

const fields = [
  { name: 'restaurantName', label: 'Restaurant name', type: 'text', autoComplete: 'organization' },
  { name: 'name', label: 'Your name', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'password', label: 'Password (min 8 characters)', type: 'password', autoComplete: 'new-password', minLength: 8 },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ restaurantName: '', name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(form);
      toast.success('Restaurant created!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Set up your restaurant"
      subtitle="Create the owner account. You can add staff later."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-stone-800 underline underline-offset-4">Log in</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {fields.map((f) => (
          <label key={f.name} className="block">
            <span className="eyebrow mb-2 block text-stone-500">{f.label}</span>
            <input
              name={f.name}
              type={f.type}
              required
              minLength={f.minLength}
              autoComplete={f.autoComplete}
              className="input"
              value={form[f.name]}
              onChange={onChange}
            />
          </label>
        ))}
        <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
          {submitting ? 'Creating…' : 'Create restaurant'}
        </button>
      </form>
    </AuthLayout>
  );
}
