// src/pages/DashboardPage.jsx
//
// Responsive:
//  - lg (1024px o más): los datos van sobre la imagen dibujada, en las <Zona> de siempre,
//    y el módulo clínico va en una barra propia debajo de la imagen (no se encima con el dibujo).
//  - Menos de 1024px: la imagen es solo ambiente y los mismos elementos se ven como
//    tarjetas (2 por fila), saludo y botones grandes. `etiqueta` y `tarjeta` solo afectan a ese modo.
import { Activity, Bell, ClipboardList, HeartPulse, Package, Pill, Siren, Users } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useDashboardStats from '../hooks/useDashboardStats';
import DashboardGrandLine, { Zona, estilos } from './DashboardGrandLine';

// ⚠️ Debe coincidir con las rutas definidas en App.jsx.
const RUTA_REGISTRO_PACIENTE = '/pacientes/registro';
const RUTA_INVENTARIO = '/inventario';
const RUTA_TRATAMIENTOS = '/tratamientos';
const RUTA_EMERGENCIAS = '/emergencias';
const RUTA_ALERTAS = '/alertas';
const RUTA_MEDICAMENTOS = '/medicamentos';

// Número con brillo neón; `valor` null = todavía sin dato.
// Tamaño: fijo en pantallas pequeñas, proporcional a la imagen (em) en pantallas grandes.
function Cifra({ valor, color, brillo }) {
  const texto = valor ?? '—';
  const esLargo = String(texto).length > 5; // "ONLINE" / "OFFLINE" necesitan letra más chica

  return (
    <span
      className={`font-bold leading-none tabular-nums ${
        esLargo ? 'text-2xl lg:text-[3.1em]' : 'text-5xl lg:text-[4.6em]'
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

// Accesos del módulo clínico. Cada uno toma el color de neón de las tarjetas del tablero.
// `rgb` se usa para el brillo; `color` para el texto y el icono.
// 💡 Para que la letra se vea condensada como la del dibujo, agrega en index.html:
//    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&display=swap" rel="stylesheet" />
const FUENTE_ROTULO = "'Oswald', 'Bebas Neue', Impact, 'Arial Narrow', sans-serif";

const ACCESOS = [
  { ruta: RUTA_EMERGENCIAS, titulo: 'Emergencias', detalle: 'Atender ahora', Icono: Siren, color: '#ff8a7a', rgb: '255,70,50' },
  { ruta: RUTA_ALERTAS, titulo: 'Alertas', detalle: 'Avisos pendientes', Icono: Bell, color: '#ffd978', rgb: '255,170,40' },
  { ruta: RUTA_TRATAMIENTOS, titulo: 'Tratamientos', detalle: 'Planes de cuidado', Icono: ClipboardList, color: '#8fdcff', rgb: '70,170,255' },
  { ruta: RUTA_MEDICAMENTOS, titulo: 'Medicamentos', detalle: 'Catálogo y umbrales', Icono: Pill, color: '#7dffa0', rgb: '60,230,110' },
];

// Módulo clínico. Dos variantes del mismo componente:
//  - 'escritorio': barra horizontal (título + un botón grande por acceso) bajo la imagen.
//  - 'movil': panel a todo el ancho, con los botones apilados y su descripción.
function ModuloClinico({ variante, onIr }) {
  const escritorio = variante === 'escritorio';

  return (
    <nav
      aria-label="Módulo clínico"
      className={
        escritorio
          ? 'flex h-[calc(100%_-_8px)] w-[min(96vw,1500px)] items-center gap-5 rounded-2xl border-2 border-[#b07a3a]/80 px-5 shadow-[0_8px_30px_rgba(0,0,0,0.65),0_0_24px_rgba(200,140,60,0.2)]'
          : 'rounded-2xl border-2 border-[#b07a3a]/80 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_26px_rgba(200,140,60,0.18)]'
      }
      style={{
        background: 'linear-gradient(180deg, rgba(40,47,66,0.94), rgba(16,20,30,0.96))',
        fontFamily: FUENTE_ROTULO,
      }}
    >
      {/* Título: en escritorio va a la izquierda con un separador; en móvil, centrado arriba */}
      <div className={escritorio ? 'flex shrink-0 items-center gap-5' : ''}>
        <p
          className={`text-center font-bold uppercase text-[#e0b060] ${
            escritorio ? 'text-[length:clamp(0.95rem,2.2vh,1.5rem)] leading-tight tracking-[0.14em]' : 'text-sm tracking-[0.25em]'
          }`}
        >
          {escritorio ? (
            <>
              Módulo
              <br />
              clínico
            </>
          ) : (
            'Módulo clínico'
          )}
        </p>
        {escritorio ? (
          <span
            className="h-3/5 min-h-[3.5rem] w-px bg-gradient-to-b from-transparent via-[#c8933e] to-transparent"
            aria-hidden="true"
          />
        ) : (
          <div className="my-2 flex items-center gap-2" aria-hidden="true">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c8933e] to-transparent" />
            <span className="text-xs text-[#e0b060]">✦</span>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c8933e] to-transparent" />
          </div>
        )}
      </div>

      <div className={escritorio ? 'flex h-full min-w-0 flex-1 items-stretch gap-4 py-3' : 'flex flex-col gap-3'}>
        {ACCESOS.map(({ ruta, titulo, detalle, Icono, color, rgb }) => (
          <button
            key={titulo}
            type="button"
            onClick={() => onIr(ruta)}
            className={`group relative flex min-w-0 flex-1 items-center overflow-hidden rounded-xl text-left transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a] ${
              escritorio ? 'justify-center gap-3 px-4' : 'min-h-[4.5rem] gap-3 px-4'
            }`}
            style={{
              border: `1px solid rgba(${rgb},0.8)`,
              background: `linear-gradient(90deg, rgba(${rgb},0.28) 0%, rgba(10,12,18,0.72) 80%)`,
              boxShadow: `0 0 16px rgba(${rgb},0.35), inset 0 0 12px rgba(${rgb},0.18)`,
            }}
          >
            {/* Franja de color a la izquierda, como en las tarjetas de pacientes */}
            <span
              className="absolute inset-y-0 left-0 w-2"
              style={{ background: color, boxShadow: `0 0 12px ${color}` }}
              aria-hidden="true"
            />
            <Icono
              className={`shrink-0 ${escritorio ? 'h-[clamp(1.5rem,3.6vh,2.5rem)] w-[clamp(1.5rem,3.6vh,2.5rem)]' : 'ml-1 h-8 w-8'}`}
              style={{ color, filter: `drop-shadow(0 0 6px rgba(${rgb},0.85))` }}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span
                className={`block truncate font-bold uppercase leading-none tracking-wide ${
                  escritorio ? 'text-[length:clamp(1.1rem,2.8vh,1.9rem)]' : 'text-2xl'
                }`}
                style={{ color, textShadow: `0 0 10px rgba(${rgb},0.7)` }}
              >
                {titulo}
              </span>
              <span
                className={`mt-1 block truncate uppercase tracking-wider text-[#cdb68a] ${
                  escritorio ? 'text-[length:clamp(0.65rem,1.4vh,0.85rem)]' : 'text-xs'
                }`}
              >
                {detalle}
              </span>
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

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

  return (
    // En pantallas grandes el módulo clínico va en la barra inferior (prop `barra`)
    <DashboardGrandLine barra={<ModuloClinico variante="escritorio" onIr={navigate} />}>
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

      {/* Módulo clínico en pantallas pequeñas: panel a todo el ancho debajo de las tarjetas.
          (En pantallas grandes va en la barra inferior de DashboardGrandLine.) */}
      <div className="col-span-2 order-3 lg:hidden">
        <ModuloClinico variante="movil" onIr={navigate} />
      </div>

      {/* Botones dibujados en la imagen (invisibles en pantallas grandes).
          En pantallas pequeñas "Registrar paciente" va primero (acción principal). */}
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