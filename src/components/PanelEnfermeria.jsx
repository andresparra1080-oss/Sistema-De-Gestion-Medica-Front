// src/components/PanelEnfermeria.jsx
// Piezas comunes de las pantallas del módulo de emergencias y alertas.
// Siguen el mismo estilo que InventarioPage (latón, ámbar y azul acero sobre
// la ilustración difuminada) para que todo parezca la misma app.
import { useNavigate } from 'react-router-dom';
import fondo from '../images/inicio.jpg';

export const TIPOS_EMERGENCIA = [
  { value: 'TRAUMATISMO', label: 'Traumatismo' },
  { value: 'HEMORRAGIA', label: 'Hemorragia' },
  { value: 'INTOXICACION', label: 'Intoxicación' },
  { value: 'QUEMADURA', label: 'Quemadura' },
  { value: 'OTRO', label: 'Otro' },
];

export const etiquetaTipo = (valor) =>
  TIPOS_EMERGENCIA.find((t) => t.value === valor)?.label ?? valor;

// Mismo dominio para emergencias.nivel_urgencia y alertas.prioridad
export const NIVELES = [
  { value: 'CRITICA', label: 'Crítica', color: '#ff6b5b', orden: 0 },
  { value: 'ALTA', label: 'Alta', color: '#ffa733', orden: 1 },
  { value: 'MEDIA', label: 'Media', color: '#ffd978', orden: 2 },
  { value: 'BAJA', label: 'Baja', color: '#7dffa0', orden: 3 },
];

export const nivelDe = (valor) => NIVELES.find((n) => n.value === valor) ?? NIVELES[2];

export const ESTADOS_EMERGENCIA = {
  ACTIVA: { label: 'Activa', color: '#ff8a7a' },
  EN_ATENCION: { label: 'En atención', color: '#4aa8ff' },
  FINALIZADA: { label: 'Finalizada', color: '#8a7a60' },
};

// "2026-10-20 23:07:18" -> "20/10 23:07". Se parte la cadena en vez de usar
// Date: el backend ya la envía en la hora local del barco.
export function formatFechaHora(texto) {
  if (!texto || texto.length < 16) return texto ?? '';
  const [fecha, hora] = texto.replace('T', ' ').split(' ');
  const [, mes, dia] = fecha.split('-');
  return `${dia}/${mes} ${hora.slice(0, 5)}`;
}

// fetch lanza "Failed to fetch" cuando el back no responde o la ruta no existe
// (un 404 de Crow llega sin cabeceras CORS). Se traduce a algo que se entienda.
export function mensajeDeError(error, recurso) {
  const texto = error?.message ?? '';
  if (!texto || /failed to fetch|networkerror|load failed/i.test(texto)) {
    return `No se pudo conectar con ${recurso}. Revisa que el backend esté activo y tenga esta ruta.`;
  }
  // Crow responde "404 Not Found" / "405 Method Not Allowed" en texto plano
  // cuando la ruta (o el método) todavía no existe en el back.
  if (/^40[45]\b/.test(texto)) {
    return `El backend todavía no tiene la ruta de ${recurso} que usa esta pantalla.`;
  }
  return texto;
}

export const claseCampo =
  'w-full rounded-md border border-[#b07a3a]/50 bg-[#0f141d] px-3 text-sm text-[#fbe9c0] ' +
  'placeholder-[#7d7560] outline-none [color-scheme:dark] focus:ring-2 focus:ring-[#ffd36a]';
export const claseEtiqueta =
  'mb-1 block text-xs font-semibold uppercase tracking-wider text-[#e0b060]';
export const claseBotonPrimario =
  'h-10 rounded-lg border border-[#ffd36a]/70 bg-gradient-to-b from-[#e8a93c] to-[#a8611a] px-4 ' +
  'text-sm font-bold uppercase tracking-wide text-[#2a1507] transition hover:brightness-110 ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a] ' +
  'disabled:cursor-not-allowed disabled:opacity-60';
export const claseBotonSecundario =
  'h-10 rounded-lg border border-[#b07a3a]/70 bg-[#1b1208]/80 px-4 text-sm font-bold uppercase ' +
  'tracking-wide text-[#f2c48a] transition hover:bg-[#2d1b0e] focus-visible:outline-none ' +
  'focus-visible:ring-4 focus-visible:ring-[#ffd36a] disabled:cursor-not-allowed disabled:opacity-50';

export function ErrorCampo({ children }) {
  if (!children) return null;
  return <p className="mt-1 text-xs font-semibold text-red-300">{children}</p>;
}

export function MensajeError({ children }) {
  if (!children) return null;
  return (
    <p
      className="rounded-lg border border-red-400/50 bg-[#2a1115]/90 px-4 py-3 text-sm font-semibold text-red-300"
      role="alert"
    >
      {children}
    </p>
  );
}

export function Insignia({ color, children }) {
  return (
    <span
      className="inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
      style={{ color, borderColor: `${color}88`, background: `${color}14` }}
    >
      {children}
    </span>
  );
}

export function Seccion({ id, titulo, accion, children, className = '' }) {
  return (
    <section
      aria-labelledby={id}
      className={`rounded-xl border border-[#b07a3a]/60 bg-[#141a26]/90 shadow-[0_0_2em_rgba(0,0,0,0.6)] backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#b07a3a]/40 px-4 py-3">
        <h2 id={id} className="text-sm font-bold uppercase tracking-wider text-[#e0b060]">
          {titulo}
        </h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

// Fondo, cabecera con botón "Atrás" y título. `extra` va a la derecha del título.
export function PaginaEnfermeria({ titulo, volverA = '/dashboard', extra, children }) {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full bg-[#140b05]">
      <img
        src={fondo}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none fixed inset-0 h-full w-full select-none object-cover blur-[6px] brightness-[0.45]"
      />

      <div className="relative mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(volverA)}
              className="shrink-0 rounded-lg border border-[#b07a3a]/70 bg-[#1b1208]/80 px-3 py-2 text-sm font-bold uppercase tracking-wide text-[#f2c48a] transition hover:bg-[#2d1b0e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]"
            >
              <span aria-hidden="true">←</span> Atrás
            </button>
            <h1 className="min-w-0 text-xl font-bold uppercase tracking-[0.2em] text-[#f2c48a] sm:text-2xl">
              {titulo}
            </h1>
          </div>
          {extra}
        </header>

        {children}
      </div>
    </div>
  );
}
