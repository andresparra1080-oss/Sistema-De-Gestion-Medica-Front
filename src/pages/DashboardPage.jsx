import { Activity, HeartPulse, Package, ShieldCheck, Users } from 'lucide-react';

const stats = [
  { label: 'Pacientes activos', value: '128', icon: Users },
  { label: 'Protocolos críticos', value: '14', icon: ShieldCheck },
  { label: 'Inventario', value: '94%', icon: Package },
  { label: 'Monitoreo', value: '99.2%', icon: HeartPulse },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-primary">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Panel de control médico</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            <Activity className="h-4 w-4" />
            Sistema operativo
          </div>
        </header>

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
      </div>
    </main>
  );
}
