import { Link } from 'react-router-dom';
import Button from '../components/Button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="card-surface max-w-4xl p-10 text-center">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-primary">HeartMed</p>
        <h1 className="text-4xl font-bold text-white md:text-6xl">Gestión médica moderna para tu tripulación</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
          Plataforma de administración clínica, inventario y monitorización operativa conectada a tu backend en C++.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link to="/login">
            <Button>Iniciar sesión</Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="secondary">Ver dashboard</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
