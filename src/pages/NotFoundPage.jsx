import { Link } from 'react-router-dom';
import Button from '../components/Button';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card-surface max-w-lg p-10 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-primary">404</p>
        <h1 className="mt-4 text-4xl font-bold text-white">Página no encontrada</h1>
        <p className="mt-4 text-slate-300">La ruta solicitada no existe o fue movida.</p>
        <Link to="/" className="mt-6 inline-block">
          <Button>Volver al inicio</Button>
        </Link>
      </div>
    </main>
  );
}
