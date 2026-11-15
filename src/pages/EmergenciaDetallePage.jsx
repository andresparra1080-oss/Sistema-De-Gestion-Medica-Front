// src/pages/EmergenciaDetallePage.jsx
// Detalle de una emergencia médica (KAN-52 y KAN-54). Ruta: /emergencias/:id
//
// Qué muestra y permite:
//  - Resumen: tipo, nivel de urgencia, estado, fechas, síntomas, lesiones y diagnóstico inicial.
//  - Cambiar el estado: ACTIVA -> EN_ATENCION -> FINALIZADA (RF-21).
//  - Pacientes involucrados.
//  - Acciones de atención: listar y registrar (RF-20).
//  - Historial de cambios: quién cambió qué y cuándo (KAN-54, RF-23).
//
// Los nombres de campos son los de la base (Database/heartmed_sqlite.sql) y los de EmergenciaRoutes.cpp.
//
// Rutas que consume (ver src/services/api.js; todas existen en EmergenciaRoutes.cpp):
//   GET  /api/emergencias/{id}            detalle con pacientes
//   GET  /api/emergencias/{id}/acciones   acciones de atención
//   POST /api/emergencias/{id}/acciones   registrar una acción
//   PUT  /api/emergencias/{id}/estado     ACTIVA -> EN_ATENCION
//   PUT  /api/emergencias/{id}/finalizar  EN_ATENCION -> FINALIZADA (fecha de cierre automática)
//   GET  /api/emergencias/{id}/historial  historial de cambios
// Si el JSON de alguna cambia, solo hay que tocar los normalizadores de abajo (aEmergencia, listaDe).
import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, AlertTriangle, ArrowLeft, CheckCircle2, Clock, Flag, History, Info, Loader2,
  Play, Plus, RefreshCw, Siren, User, Users, ClipboardList,
} from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FondoAmbiente from './FondoAmbiente';
import fondoPacientes from '../images/pacientes.jpg';
import * as api from '../services/api';

const RUTA_DASHBOARD = '/dashboard';
const FUENTE_TITULO = "'Cinzel', Georgia, serif";
const FONDO_PANEL = '#222838';
const MAX_ACCION = 500; // límite de la pantalla; el esquema no define máximo

// ---- catálogos (valores EXACTOS de los CHECK de la base) ----

const TIPOS = {
  TRAUMATISMO: 'Traumatismo',
  HEMORRAGIA: 'Hemorragia',
  INTOXICACION: 'Intoxicación',
  QUEMADURA: 'Quemadura',
  OTRO: 'Otro',
};

// El nivel se distingue por ícono y texto, no solo por color (RNF-11 y RNF-15)
const URGENCIAS = {
  CRITICA: { label: 'Crítica', color: '#ff6b5b', Icono: Siren },
  ALTA: { label: 'Alta', color: '#ffa733', Icono: AlertTriangle },
  MEDIA: { label: 'Media', color: '#f0c675', Icono: AlertCircle },
  BAJA: { label: 'Baja', color: '#4aa8ff', Icono: Info },
};

const ESTADOS = {
  ACTIVA: { label: 'Activa', color: '#ff7a5c' },
  EN_ATENCION: { label: 'En atención', color: '#4aa8ff' },
  FINALIZADA: { label: 'Finalizada', color: '#4dff88' },
};

// Cambios de estado permitidos desde cada estado. Criterio 2 de KAN-32:
// ACTIVA -> EN_ATENCION -> FINALIZADA (no se salta ningún paso).
const TRANSICIONES = {
  ACTIVA: [{ estado: 'EN_ATENCION', texto: 'Iniciar atención', Icono: Play }],
  EN_ATENCION: [{ estado: 'FINALIZADA', texto: 'Finalizar', Icono: Flag, confirmar: true }],
  FINALIZADA: [],
};

// El back responde "Token ausente o inválido" cuando la sesión venció
const esSesionVencida = (texto) => /token/i.test(texto ?? '');

const ETIQUETA_ACCION_LOG = { INSERT: 'Registro', UPDATE: 'Cambio', DELETE: 'Eliminación' };

// ---- helpers de datos ----

// El back puede responder { clave: [...] } o directamente [...]
const listaDe = (respuesta, clave) =>
  (Array.isArray(respuesta) ? respuesta : respuesta?.[clave] ?? []);

// De la respuesta del back a lo que usa la pantalla
function aEmergencia(respuesta) {
  const e = respuesta?.emergencia ?? respuesta;
  if (!e || typeof e !== 'object' || e.id_emergencia === undefined) return null;
  return { ...e, pacientes: e.pacientes ?? [] };
}

// Lo más reciente primero. Las fechas son 'AAAA-MM-DD HH:MM:SS', así que se ordenan como texto.
const ordenarReciente = (lista, campoFecha, campoId) =>
  [...lista].sort(
    (a, b) =>
      String(b[campoFecha] ?? '').localeCompare(String(a[campoFecha] ?? '')) ||
      (Number(b[campoId]) || 0) - (Number(a[campoId]) || 0),
  );

// Las fechas llegan en hora de Colombia, sin zona horaria
function aFecha(valor) {
  if (!valor) return null;
  const fecha = new Date(String(valor).replace(' ', 'T'));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function formatFechaHora(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return valor ?? '';
  return fecha.toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDuracion(inicio, fin) {
  const desde = aFecha(inicio);
  const hasta = fin ? aFecha(fin) : new Date();
  if (!desde || !hasta) return '';
  let minutos = Math.max(0, Math.round((hasta - desde) / 60000));
  const dias = Math.floor(minutos / 1440);
  minutos -= dias * 1440;
  const horas = Math.floor(minutos / 60);
  return [dias && `${dias} d`, horas && `${horas} h`, `${minutos % 60} min`].filter(Boolean).join(' ');
}

// ---- estilos (los mismos de la pantalla de pacientes) ----

const claseCampo =
  'w-full rounded-lg border border-[#b07a3a]/50 bg-[#10151f] px-3 text-base text-[#fbe9c0] ' +
  'placeholder-[#6f6955] outline-none shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)] [color-scheme:dark] ' +
  'transition focus:border-[#ffd36a] focus:ring-2 focus:ring-[#ffd36a]/70';

const claseBotonSecundario =
  'flex h-12 items-center justify-center gap-2 rounded-xl border border-[#b07a3a]/60 bg-[#141a26] px-4 ' +
  'text-sm font-semibold uppercase tracking-wide text-[#e9c7a0] transition hover:bg-[#1c2536] ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a] disabled:cursor-not-allowed disabled:opacity-40';

const claseBotonPrimario =
  'flex h-12 items-center justify-center gap-2 rounded-xl border border-[#ffd36a]/70 bg-gradient-to-b ' +
  'from-[#f2b44a] via-[#d9822b] to-[#a8480f] px-5 text-sm font-extrabold uppercase tracking-wide text-[#2a1507] ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_0_20px_rgba(255,150,40,0.4)] transition hover:brightness-110 ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a] disabled:cursor-not-allowed disabled:opacity-50';

// ---- piezas visuales ----

// Marco de bronce con remaches (igual que MarcoMovil en RegistroPacientePage)
function Marco({ children }) {
  const remache =
    'absolute h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#ffe3a3] to-[#8a5a22] shadow-[0_1px_2px_rgba(0,0,0,0.8)]';
  return (
    <div
      className="relative rounded-2xl p-[3px] shadow-[0_12px_40px_rgba(0,0,0,0.65),0_0_30px_rgba(200,140,60,0.18)]"
      style={{ background: 'linear-gradient(135deg, #f0c675 0%, #8a5a22 32%, #d9a24f 58%, #6b4219 100%)' }}
    >
      <div
        className="relative rounded-[13px] p-4 pt-5 md:p-6"
        style={{
          background: `radial-gradient(120% 70% at 50% 0%, #2d3548 0%, ${FONDO_PANEL} 55%, #171b26 100%)`,
        }}
      >
        <span className={`${remache} left-2 top-2`} aria-hidden="true" />
        <span className={`${remache} right-2 top-2`} aria-hidden="true" />
        <span className={`${remache} bottom-2 left-2`} aria-hidden="true" />
        <span className={`${remache} bottom-2 right-2`} aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

function Divisor() {
  return (
    <div className="my-3 flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c8933e] to-transparent" />
      <Siren className="h-4 w-4 text-[#e0b060]" />
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c8933e] to-transparent" />
    </div>
  );
}

function Seccion({ icono: Icono, titulo, derecha, children }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#e0b060]">
        <Icono className="h-4 w-4" aria-hidden="true" />
        {titulo}
        <span className="h-px flex-1 bg-gradient-to-r from-[#c8933e]/70 to-transparent" />
        {derecha}
      </h2>
      {children}
    </section>
  );
}

function Insignia({ color, Icono, children }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
      style={{ color, borderColor: color, boxShadow: `0 0 10px ${color}66, inset 0 0 8px ${color}33` }}
    >
      {Icono && <Icono className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}

function Dato({ etiqueta, children }) {
  return (
    <div className="rounded-lg border border-[#b07a3a]/30 bg-black/30 p-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#cdb68a]">{etiqueta}</p>
      <div className="whitespace-pre-line text-sm text-[#fbe9c0]">{children}</div>
    </div>
  );
}

function Aviso({ tipo, children }) {
  const estilos = {
    ok: 'border-emerald-400/60 bg-emerald-500/10 text-emerald-300',
    error: 'border-red-400/60 bg-red-500/10 text-red-300',
    info: 'border-amber-400/60 bg-amber-500/10 text-amber-200',
  };
  const Icono = tipo === 'ok' ? CheckCircle2 : AlertTriangle;
  return (
    <p
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-sm font-semibold ${estilos[tipo]}`}
    >
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

// Fondo y centrado comunes a todos los estados de la pantalla
function Pagina({ children }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#140b05]">
      <FondoAmbiente respaldo={fondoPacientes} />
      <img
        src={fondoPacientes}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 hidden h-full w-full scale-110 select-none object-cover blur-2xl brightness-[0.6] lg:block"
      />
      <div className="relative z-10 mx-auto w-full max-w-3xl space-y-4 px-4 py-4 pb-10">{children}</div>
    </div>
  );
}

function BotonAtras({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Volver"
      className="inline-flex h-11 items-center gap-2 rounded-full border border-[#b07a3a]/70 bg-[#1b1208]/80 px-4 text-sm font-bold uppercase tracking-wide text-[#f2c48a] shadow-[0_0_12px_rgba(0,0,0,0.5)] backdrop-blur-sm transition hover:bg-[#2d1b0e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Atrás
    </button>
  );
}

// ---- pantalla ----

export default function EmergenciaDetallePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const idValido = /^\d+$/.test(id ?? '');

  const [emergencia, setEmergencia] = useState(null);
  const [acciones, setAcciones] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [errorHistorial, setErrorHistorial] = useState('');
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [mensaje, setMensaje] = useState(null); // { tipo: 'ok' | 'error', texto }
  const [nuevaAccion, setNuevaAccion] = useState('');
  const [errorAccion, setErrorAccion] = useState('');
  const [guardandoAccion, setGuardandoAccion] = useState(false);
  const [confirmando, setConfirmando] = useState(null); // estado que espera confirmación
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [actualizando, setActualizando] = useState(false);

  // `silencioso`: recarga sin tapar la pantalla (después de guardar algo)
  const cargar = useCallback(
    async (silencioso = false) => {
      if (!idValido) {
        setErrorCarga('El identificador de la emergencia no es válido.');
        setCargando(false);
        return;
      }

      if (!silencioso) setCargando(true);
      try {
        // El historial es secundario: si falla, la emergencia y sus acciones se muestran igual
        const [rEmergencia, rAcciones, rHistorial] = await Promise.allSettled([
          api.getEmergency(id),
          api.getEmergencyActions(id),
          api.getEmergencyHistory(id),
        ]);

        if (rEmergencia.status === 'rejected') throw rEmergencia.reason;
        if (rAcciones.status === 'rejected') throw rAcciones.reason;

        const datos = aEmergencia(rEmergencia.value);
        if (!datos) throw new Error('La respuesta del servidor no incluye la emergencia.');

        setEmergencia(datos);
        setAcciones(ordenarReciente(listaDe(rAcciones.value, 'acciones'), 'fecha_hora', 'id_accion'));

        if (rHistorial.status === 'fulfilled') {
          setHistorial(
            ordenarReciente(listaDe(rHistorial.value, 'historial'), 'fecha_modificacion', 'id_log'),
          );
          setErrorHistorial('');
        } else {
          setHistorial([]);
          // Si el historial falla por sesión vencida, también se cierra la sesión
          setErrorHistorial(
            esSesionVencida(rHistorial.reason?.message)
              ? rHistorial.reason.message
              : 'No se pudo cargar el historial de cambios.',
          );
        }
        setErrorCarga('');
      } catch (error) {
        const texto = error.message || 'No se pudo cargar la emergencia.';
        if (silencioso) setMensaje({ tipo: 'error', texto });
        else setErrorCarga(texto);
      } finally {
        setCargando(false);
      }
    },
    [id, idValido],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Sesión vencida: se cierra y se vuelve al login (igual que "Volver al login" del dashboard)
  useEffect(() => {
    const textos = [
      errorCarga,
      errorAccion,
      errorHistorial,
      mensaje?.tipo === 'error' ? mensaje.texto : '',
    ];
    if (textos.some(esSesionVencida)) {
      if (typeof logout === 'function') logout();
      navigate('/login', { replace: true });
    }
  }, [errorCarga, errorAccion, errorHistorial, mensaje, logout, navigate]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const volver = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(RUTA_DASHBOARD);
  };

  const actualizar = async () => {
    setActualizando(true);
    await cargar(true);
    setActualizando(false);
  };

  const registrarAccion = async () => {
    const descripcion = nuevaAccion.trim();
    if (!descripcion) {
      setErrorAccion('Describe la acción realizada.');
      return;
    }

    setGuardandoAccion(true);
    setErrorAccion('');
    setMensaje(null);
    try {
      // La fecha y quién la registra los pone el back (DEFAULT de la base y el token)
      await api.createEmergencyAction(id, { descripcion });
      setNuevaAccion('');
      setMensaje({ tipo: 'ok', texto: 'Acción registrada' });
      await cargar(true);
    } catch (error) {
      setErrorAccion(error.message || 'No se pudo registrar la acción.');
    } finally {
      setGuardandoAccion(false);
    }
  };

  const cambiarEstado = async (nuevoEstado) => {
    setCambiandoEstado(true);
    setConfirmando(null);
    setMensaje(null);
    try {
      // api.js manda FINALIZADA a PUT .../finalizar y el resto a PUT .../estado
      const respuesta = await api.updateEmergencyStatus(id, nuevoEstado);

      // Los PUT devuelven la emergencia ya actualizada: se muestra sin esperar otra consulta
      const actualizada = aEmergencia(respuesta);
      if (actualizada) setEmergencia(actualizada);

      setMensaje({
        tipo: 'ok',
        texto: respuesta?.message || `Estado actualizado: ${ESTADOS[nuevoEstado]?.label ?? nuevoEstado}`,
      });
      await cargar(true);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo cambiar el estado.' });
    } finally {
      setCambiandoEstado(false);
    }
  };

  // ---- estados de carga y error ----

  if (cargando) {
    return (
      <Pagina>
        <BotonAtras onClick={volver} />
        <Marco>
          <p className="flex items-center justify-center gap-3 py-10 text-sm text-[#e6c9a0]" role="status">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Cargando emergencia…
          </p>
        </Marco>
      </Pagina>
    );
  }

  if (errorCarga || !emergencia) {
    return (
      <Pagina>
        <BotonAtras onClick={volver} />
        <Marco>
          <div className="space-y-4 py-6 text-center" role="alert">
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-red-300">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              {errorCarga || 'No se pudo cargar la emergencia.'}
            </p>
            {idValido && (
              <button type="button" onClick={() => cargar()} className={`${claseBotonSecundario} mx-auto`}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Reintentar
              </button>
            )}
          </div>
        </Marco>
      </Pagina>
    );
  }

  // ---- pantalla principal ----

  const estado = ESTADOS[emergencia.estado] ?? { label: emergencia.estado, color: '#cdb68a' };
  const urgencia = URGENCIAS[emergencia.nivel_urgencia];
  const finalizada = emergencia.estado === 'FINALIZADA';
  const transiciones = TRANSICIONES[emergencia.estado] ?? [];
  const ocupado = cambiandoEstado || guardandoAccion;

  return (
    <Pagina>
      <BotonAtras onClick={volver} />

      <Marco>
        <header className="text-center">
          <div
            className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#d9a24f]"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #3b2a16, #140c05)',
              boxShadow: '0 0 22px rgba(255,170,60,0.4), inset 0 0 12px rgba(0,0,0,0.7)',
            }}
          >
            <Siren className="h-8 w-8 text-[#f0c675]" strokeWidth={1.6} aria-hidden="true" />
          </div>
          <h1
            className="bg-gradient-to-b from-[#ffe3a3] via-[#f0b25a] to-[#b8691f] bg-clip-text text-xl font-extrabold uppercase leading-tight tracking-wide text-transparent drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
            style={{ fontFamily: FUENTE_TITULO }}
          >
            Emergencia #{emergencia.id_emergencia}
          </h1>
          <Divisor />
        </header>

        <div className="space-y-6">
          {/* Resumen y estado */}
          <Seccion
            icono={Siren}
            titulo="Resumen"
            derecha={
              <button
                type="button"
                onClick={actualizar}
                disabled={actualizando}
                aria-label="Actualizar datos"
                title="Actualizar"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#c8933e]/60 text-[#f3c97a] transition hover:bg-[#523818] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a] disabled:opacity-40"
              >
                <RefreshCw className={`h-4 w-4 ${actualizando ? 'animate-spin' : ''}`} aria-hidden="true" />
              </button>
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <Insignia color="#e0b060">{TIPOS[emergencia.tipo] ?? emergencia.tipo}</Insignia>
              {urgencia && (
                <Insignia color={urgencia.color} Icono={urgencia.Icono}>
                  Urgencia {urgencia.label}
                </Insignia>
              )}
              <Insignia color={estado.color}>{estado.label}</Insignia>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Dato etiqueta="Inicio">{formatFechaHora(emergencia.fecha_inicio)}</Dato>
              <Dato etiqueta={finalizada ? 'Fin y duración' : 'Duración hasta ahora'}>
                {finalizada
                  ? `${formatFechaHora(emergencia.fecha_fin)} · ${formatDuracion(emergencia.fecha_inicio, emergencia.fecha_fin)}`
                  : formatDuracion(emergencia.fecha_inicio, null)}
              </Dato>
              <Dato etiqueta="Síntomas">{emergencia.sintomas}</Dato>
              <Dato etiqueta="Lesiones">{emergencia.lesiones || 'Sin lesiones registradas'}</Dato>
            </div>
            <Dato etiqueta="Diagnóstico inicial">{emergencia.diagnostico_inicial}</Dato>

            {/* Cambio de estado */}
            {finalizada ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Emergencia finalizada: ya no admite cambios de estado ni nuevas acciones.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  {transiciones.map((t, i) => (
                    <button
                      key={t.estado}
                      type="button"
                      disabled={ocupado}
                      onClick={() => (t.confirmar ? setConfirmando(t.estado) : cambiarEstado(t.estado))}
                      className={`${i === 0 ? claseBotonPrimario : claseBotonSecundario} flex-1`}
                    >
                      {cambiandoEstado && confirmando === null && i === 0 ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <t.Icono className="h-4 w-4" aria-hidden="true" />
                      )}
                      {t.texto}
                    </button>
                  ))}
                </div>

                {confirmando && (
                  <div
                    role="group"
                    aria-label="Confirmar cambio de estado"
                    className="space-y-3 rounded-xl border border-amber-400/60 bg-amber-500/10 p-3"
                  >
                    <p className="flex items-start gap-2 text-sm font-semibold text-amber-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      ¿Finalizar la emergencia? Se registrará la fecha de cierre y ya no se podrán agregar acciones.
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setConfirmando(null)}
                        className={`${claseBotonSecundario} flex-1`}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => cambiarEstado(confirmando)}
                        className={`${claseBotonPrimario} flex-[2]`}
                      >
                        <Flag className="h-4 w-4" aria-hidden="true" /> Sí, finalizar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
          </Seccion>

          {/* Pacientes.
              Sin enlace a la historia clínica: la ruta /pacientes/:id/historia todavía
              no existe en App.jsx (llevaría al 404). Cuando exista esa página, envuelve
              el contenido del <li> en <Link to={`/pacientes/${p.id_paciente}/historia`}>. */}
          <Seccion icono={Users} titulo="Pacientes involucrados">
            {emergencia.pacientes.length === 0 ? (
              <p className="text-sm text-[#a58a5a]">Esta emergencia no tiene pacientes asociados.</p>
            ) : (
              <ul className="flex flex-wrap gap-2" aria-label="Pacientes involucrados">
                {emergencia.pacientes.map((p) => (
                  <li key={p.id_paciente}>
                    <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#b07a3a]/50 bg-black/30 px-4 py-1 text-sm text-[#fbe9c0]">
                      <User className="h-4 w-4 text-[#b07a3a]" aria-hidden="true" />
                      <span className="font-bold uppercase text-[#f2c48a]">
                        {p.nombre_completo ?? `Paciente ${p.id_paciente}`}
                      </span>
                      {p.documento_identidad && (
                        <span className="text-xs text-[#a58a5a]">{p.documento_identidad}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>

          {/* Acciones de atención */}
          <Seccion icono={ClipboardList} titulo={`Acciones de atención (${acciones.length})`}>
            {finalizada ? (
              <p className="flex items-center gap-2 text-sm text-[#a58a5a]">
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                La emergencia está finalizada: ya no admite nuevas acciones.
              </p>
            ) : (
              <div className="space-y-2">
                <label htmlFor="nueva-accion" className="sr-only">Nueva acción de atención</label>
                <textarea
                  id="nueva-accion"
                  rows={3}
                  maxLength={MAX_ACCION}
                  value={nuevaAccion}
                  aria-invalid={Boolean(errorAccion)}
                  placeholder="Ej. Se inmovilizó el brazo y se administró analgésico…"
                  onChange={(e) => {
                    setNuevaAccion(e.target.value);
                    setErrorAccion('');
                  }}
                  className={`${claseCampo} min-h-[5.5rem] resize-y py-3`}
                />
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-red-300" role={errorAccion ? 'alert' : undefined}>
                    {errorAccion}
                  </p>
                  <span className="shrink-0 text-xs text-[#a58a5a]">{nuevaAccion.length}/{MAX_ACCION}</span>
                </div>
                <button
                  type="button"
                  onClick={registrarAccion}
                  disabled={ocupado}
                  className={`${claseBotonPrimario} w-full`}
                >
                  {guardandoAccion ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  )}
                  {guardandoAccion ? 'Registrando…' : 'Registrar acción'}
                </button>
              </div>
            )}

            {acciones.length === 0 ? (
              <p className="text-sm text-[#a58a5a]">Todavía no hay acciones registradas.</p>
            ) : (
              <ul className="space-y-2" aria-label="Acciones registradas, de la más reciente a la más antigua">
                {acciones.map((a, i) => (
                  <li key={a.id_accion ?? i} className="rounded-xl border border-[#b07a3a]/30 bg-black/30 p-3">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#a58a5a]">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatFechaHora(a.fecha_hora)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" aria-hidden="true" />
                        {a.nombre_ejecutor ?? `Usuario ${a.id_usuario_ejecutor}`}
                      </span>
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-[#fbe9c0]">{a.descripcion_accion}</p>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>

          {/* Historial de cambios (KAN-54) */}
          <Seccion icono={History} titulo="Historial de cambios">
            {errorHistorial ? (
              <Aviso tipo="error">{errorHistorial}</Aviso>
            ) : historial.length === 0 ? (
              <p className="text-sm text-[#a58a5a]">Todavía no hay cambios registrados.</p>
            ) : (
              <ol
                className="space-y-3 border-l border-[#c8933e]/40 pl-4"
                aria-label="Cambios de la emergencia, del más reciente al más antiguo"
              >
                {historial.map((h, i) => (
                  <li key={h.id_log ?? i} className="relative">
                    <span
                      className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#e0b060]"
                      aria-hidden="true"
                    />
                    <p className="text-xs text-[#a58a5a]">
                      {formatFechaHora(h.fecha_modificacion)} · {h.nombre_usuario ?? `Usuario ${h.id_usuario}`} ·{' '}
                      {ETIQUETA_ACCION_LOG[h.accion] ?? h.accion}
                    </p>
                    <p className="text-sm text-[#fbe9c0]">
                      {h.detalle_cambio || `${h.tabla_afectada}${h.id_registro ? ` #${h.id_registro}` : ''}`}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Seccion>
        </div>
      </Marco>
    </Pagina>
  );
}