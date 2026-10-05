import { Activity, ArrowRight, HeartPulse, Package, ShieldCheck, Users } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const stats = [
  { label: 'Pacientes activos', value: '128', icon: Users },
  { label: 'Protocolos críticos', value: '14', icon: ShieldCheck },
  { label: 'Inventario', value: '94%', icon: Package },
  { label: 'Monitoreo', value: '99.2%', icon: HeartPulse },
];

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-primary">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Bienvenido, {user.name || user.email || 'usuario'}</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            <Activity className="h-4 w-4" />
            Sistema operativo
          </div>
        </header>

        <section className="mb-8 rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Sesión</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Autenticación validada correctamente</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              En línea
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <article key={label} className="card-surface p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{label}</p>
                  <h2 className="mt-3 text-3xl font-bold text-white">{value}</h2>
                </div>
                <div className="rounded-xl bg-primary/15 p-3 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </article>
          ))}
        </section>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
            onClick={() => window.location.href = '/login'}
          >
            Volver al login
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
