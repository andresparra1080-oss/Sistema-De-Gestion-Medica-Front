import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { checkApiHealth, checkServerHealth, loginUser } from '../services/api';

const STATUS_STYLES = {
  checking: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  online: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  offline: 'border-red-400/40 bg-red-500/10 text-red-200',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [apiStatus, setApiStatus] = useState({
    state: 'checking',
    message: 'Verificando servicio HeartMed...',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const verifyHealth = async () => {
      try {
        const health = await checkServerHealth();

        if (mounted) {
          const isHealthy = health?.status === 'ok';
          setApiStatus({
            state: isHealthy ? 'online' : 'offline',
            message: isHealthy ? 'API activa en /health' : 'El servicio responde pero no está en estado OK.',
          });
        }
      } catch (serverError) {
        try {
          const apiHealth = await checkApiHealth();

          if (mounted) {
            const isHealthy = apiHealth?.status === 'ok';
            setApiStatus({
              state: isHealthy ? 'online' : 'offline',
              message: isHealthy ? 'API activa en /api/health' : 'La API responde pero no está en estado OK.',
            });
          }
        } catch (apiError) {
          if (mounted) {
            setApiStatus({
              state: 'offline',
              message: 'No se pudo conectar a HeartMed. Revisa CORS o que el backend esté levantado en http://localhost:18080',
            });
          }
        }
      }
    };

    verifyHealth();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password.trim()) {
      setError('Debes introducir tu email y contraseña para continuar.');
      return;
    }

    if (apiStatus.state !== 'online') {
      setError('La API de HeartMed no está disponible. Revisa que el backend esté levantado en http://localhost:18080 y que permita CORS.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await loginUser({
        email: form.email.trim(),
        password: form.password.trim(),
      });

      if (!response?.success) {
        throw new Error(response?.message || 'No se pudo iniciar sesión.');
      }

      const userData = {
        email: response.email || form.email,
        name: (response.email || form.email).split('@')[0],
        rol: response.rol || 'usuario',
      };

      if (response?.token) {
        localStorage.setItem('token', response.token);
      }

      login(userData);
      navigate('/dashboard', { replace: true });
    } catch (loginError) {
      setError(loginError.message || 'No se pudo iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="anime-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="anime-panel card-surface w-full max-w-md overflow-hidden p-0">
        <div className="anime-topbar border-b border-amber-400/30 px-6 py-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.55em] text-amber-300">Heart Pirates</span>
            <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.3em] text-amber-200">
              Crew 01
            </span>
          </div>
          <h1 className="heart-pirates-heading text-4xl font-black text-white">HeartMed</h1>
        </div>

        <div className="p-6">
          <div className="mb-5 rounded-2xl border border-amber-400/25 bg-slate-950/60 px-3 py-2 text-sm shadow-[inset_0_0_18px_rgba(245,199,107,0.08)]">
            <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${apiStatus.state === 'online' ? 'bg-emerald-500/20 text-emerald-200' : apiStatus.state === 'offline' ? 'bg-red-500/20 text-red-200' : 'bg-amber-500/20 text-amber-200'}`}>
              {apiStatus.state === 'online' ? 'Online' : apiStatus.state === 'offline' ? 'Offline' : 'Checking'}
            </span>
            <p className={`mt-2 ${STATUS_STYLES[apiStatus.state]}`}>
              <span className="font-medium">Estado API:</span> {apiStatus.message}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                placeholder="nombre@empresa.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Contraseña</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                placeholder="Tu contraseña"
              />
            </div>

            {error ? (
              <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting || apiStatus.state !== 'online'}>
              {isSubmitting ? 'Iniciando sesión...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
