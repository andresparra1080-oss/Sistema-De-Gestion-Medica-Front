import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    localStorage.setItem('token', 'demo-token');
    navigate('/dashboard');
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card-surface w-full max-w-md p-8">
        <h2 className="text-2xl font-bold text-white">Acceso al sistema</h2>
        <p className="mt-2 text-sm text-slate-300">Inicia sesión para continuar.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm text-slate-200">Usuario</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none ring-0 focus:border-primary"
              placeholder="capitan"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-200">Contraseña</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none ring-0 focus:border-primary"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full">Entrar</Button>
        </form>
      </div>
    </main>
  );
}
