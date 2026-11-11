// src/pages/DashboardPage.jsx
//
// Responsive:
//  - lg (1024px o más): los datos van sobre la imagen dibujada, en las <Zona> de siempre.
//  - Menos de 1024px: la imagen es solo ambiente y los mismos elementos se ven como
//    tarjetas (2 por fila), saludo y botones grandes. `etiqueta` y `tarjeta` solo afectan a ese modo.
import { Activity, HeartPulse, Package, Users, ClipboardList } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useDashboardStats from '../hooks/useDashboardStats';
import DashboardGrandLine, { Zona, estilos } from './DashboardGrandLine';

// ⚠️ Debe coincidir con la ruta de la pantalla de registro de pacientes definida en App.jsx.
const RUTA_REGISTRO_PACIENTE = '/pacientes/registro';
const RUTA_INVENTARIO = '/inventario';
const RUTA_TRATAMIENTOS = '/tratamientos';

// Número con brillo neón; `valor` null = todavía sin dato.
// Tamaño: fijo en pantallas pequeñas, proporcional a la imagen (em) en pantallas grandes.
function Cifra({ valor, color, brillo }) {
  const texto = valor ?? '—';
  const esLargo = String(texto).length > 5; // "ONLINE" / "OFFLINE" necesitan letra más chica

  return (
    <span
      className={`font-bold leading-none tabular-nums ${esLargo ? 'text-2xl lg:text-[3.1em]' : 'text-5xl lg:text-[4.6em]'
        }`}
      style={{
        color,
        textShadow: `0 0 0.2em ${brillo}, 0 0 0.5em ${brillo}`,
      }}
    >
      {texto}
    </span>
  );
}

const centrado = 'flex items-center justify-center';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const stats = useDashboardStats({ enabled: Boolean(user) });

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const nombre = user.name || user.email || 'usuario';

  const handleVolverLogin = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const irInventario = () => navigate(RUTA_INVENTARIO);
  const irTratamientos = () => navigate(RUTA_TRATAMIENTOS);

  return (
    <DashboardGrandLine>
      {/* Saludo. En pantallas grandes "Bienvenido," ya está dibujado: solo va el nombre. */}
      <Zona x={1462} y={258} w={430} h={90} className={`${centrado} lg:justify-start`}>
        <span
          className="min-w-0 max-w-full truncate text-2xl font-semibold leading-none text-[#e9c7a0] lg:text-[3.1em]"
          title={nombre}
        >
          <span className="lg:hidden">Bienvenido, </span>
          {nombre}
        </span>
      </Zona>

      {/* Pacientes activos (azul) */}
      <Zona
        x={890}
        y={455}
        w={350}
        h={120}
        etiqueta="Pacientes activos"
        icono={Users}
        tarjeta="border-sky-400/70 from-sky-500/20 text-sky-200 shadow-[0_0_18px_rgba(70,170,255,0.25)]"
        className={centrado}
      >
        <Cifra valor={stats.activos} color="#8fdcff" brillo="rgba(70,170,255,0.8)" />
      </Zona>

      {/* Pacientes críticos (rojo) */}
      <Zona
        x={1550}
        y={455}
        w={350}
        h={120}
        etiqueta="Pacientes críticos"
        icono={HeartPulse}
        tarjeta="border-red-400/70 from-red-500/20 text-red-200 shadow-[0_0_18px_rgba(255,70,50,0.25)]"
        className={centrado}
      >
        <Cifra valor={stats.criticos} color="#ff8a7a" brillo="rgba(255,70,50,0.8)" />
      </Zona>

      {/* Inventario (ámbar), pantallas grandes: botón invisible sobre toda la tarjeta dibujada */}
      <Zona x={820} y={730} w={440} h={200} className="hidden lg:block">
        <button
          type="button"
          onClick={irInventario}
          aria-label="Abrir el pañol de la enfermería"
          className="h-full w-full rounded-xl bg-transparent text-transparent transition hover:bg-amber-300/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]"
        >
          Ver inventario
        </button>
      </Zona>

      {/* Inventario: número (en pantallas grandes no captura clics, pasan al botón de arriba) */}
      <Zona
        x={890}
        y={755}
        w={350}
        h={120}
        etiqueta="Inventario general"
        icono={Package}
        tarjeta="border-amber-400/70 from-amber-500/20 text-amber-200 shadow-[0_0_18px_rgba(255,170,40,0.25)]"
        className={`${centrado} lg:pointer-events-none`}
      >
        <Cifra
          valor={stats.inventario != null ? `${stats.inventario}%` : null}
          color="#ffd978"
          brillo="rgba(255,170,40,0.8)"
        />
        {/* Solo pantallas pequeñas: enlace al pañol */}
        <button
          type="button"
          onClick={irInventario}
          className="mt-2 text-xs font-bold uppercase tracking-wide text-amber-200 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a] lg:hidden"
        >
          Ver inventario →
        </button>
      </Zona>

      {/* Sistema up-time (verde): entre la brújula y el pulso dibujado */}
      <Zona
        x={1530}
        y={755}
        w={290}
        h={120}
        etiqueta="Sistema up-time"
        icono={Activity}
        tarjeta="border-emerald-400/70 from-emerald-500/20 text-emerald-200 shadow-[0_0_18px_rgba(60,230,110,0.25)]"
        className={centrado}
      >
        <Cifra valor={stats.uptime} color="#7dffa0" brillo="rgba(60,230,110,0.8)" />
      </Zona>

      {/* Aviso si el backend no responde */}
      {stats.error && (
        <Zona x={680} y={982} w={1240} h={30} className={centrado}>
          <p className="text-center text-sm font-semibold text-red-300 lg:text-[1.05em]" role="status">
            {stats.error}
          </p>
        </Zona>
      )}

      {/* Botones. En pantallas pequeñas "Registrar paciente" va primero (acción principal). */}

      <Zona x={1650} y={1205} w={400} h={135} className="w-full h-full rounded-full border-2 border-[#c18a45] bg-gradient-to-b from-[#49301b] via-[#2a190e] to-[#160c06] px-4 py-3 text-sm font-extrabold uppercase tracking-wider text-[#f3d58a] shadow-[inset_0_1px_0_rgba(255,220,150,0.25),0_0_16px_rgba(193,138,69,0.25)] transition-all duration-300 hover:border-[#ffd36a] hover:bg-[#51351c] hover:text-[#ffe8a8] hover:shadow-[0_0_22px_rgba(255,190,80,0.4)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]">
        <button
          type="button"
          onClick={irTratamientos}
          className="w-full rounded-full border-2 border-[#ffb25c] bg-gradient-to-b from-[#f59b2c] via-[#d9641a] to-[#a8360e] px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a] lg:h-full"
        >
          <ClipboardList size={20} className="mr-2 inline" />
          Gestión de tratamientos
        </button>
      </Zona>

      <Zona x={1010} y={1060} w={580} h={120} className="order-2 lg:order-none">
        <button type="button" className={estilos.botonSecundario} onClick={handleVolverLogin}>
          Volver al login
        </button>
      </Zona>

      <Zona x={990} y={1205} w={620} h={135} className="order-1 lg:order-none">
        <button
          type="button"
          className={estilos.boton}
          onClick={() => navigate(RUTA_REGISTRO_PACIENTE)}
        >
          Registrar paciente
        </button>
      </Zona>
    </DashboardGrandLine>
  );
}
