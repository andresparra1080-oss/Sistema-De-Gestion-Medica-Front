// src/pages/HistoriaClinicaPage.jsx
// Historia clínica de un paciente (KAN-20). Ruta: /pacientes/:id/historia
//
// Consume la API real:
//   GET /api/pacientes/:id          -> { paciente }   (encabezado, opcional)
//   GET /api/pacientes/:id/historia -> { historia }
//   PUT /api/pacientes/:id/historia -> { historia }   (todos los campos son opcionales)
//
// Reglas del back que esta pantalla respeta (ver HistoriaRoutes.cpp):
//  - La historia ya existe: la crea el back al registrar al paciente. Aquí solo se consulta y se edita.
//  - En el PUT, un texto ausente no se toca y uno vacío borra el dato. Por eso solo se envían
//    los campos que cambiaron.
//  - Si se envía "alergias", se manda la lista COMPLETA (reemplaza a la anterior).
//  - Máximo 50 alergias y sin repetir la sustancia.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Apple, ArrowLeft, CheckCircle2, FileText, History, Loader2, Pill,
  Plus, RotateCcw, Save, Scissors, ShieldAlert, ShieldCheck, StickyNote, X,
} from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FondoAmbiente from './FondoAmbiente';
import fondoPacientes from '../images/pacientes.jpg';
import { getMedicalHistory, getPatientById, updateMedicalHistory } from '../services/api';

const RUTA_PACIENTES = '/pacientes/registro';
const FUENTE_TITULO = "'Cinzel', Georgia, serif";
const FONDO_PANEL = '#222838';

const MAX_ALERGIAS = 50;
const MAX_SUSTANCIA = 80;
// Límites de la pantalla (el back no los muestra): ajustar si el esquema dice otra cosa.
const LIMITES = { antecedentes: 1000, cirugias_previas: 1000, observaciones: 500 };

const ESTADOS = {
  CRITICO: { label: 'Crítico', color: '#ff6b5b' },
  EN_RECUPERACION: { label: 'En recuperación', color: '#ffa733' },
  EN_TRATAMIENTO: { label: 'En tratamiento', color: '#4aa8ff' },
  SANO: { label: 'Sano', color: '#4dff88' },
};

// ---- helpers de datos ----

const normalizar = (texto) => texto.trim().replace(/\s+/g, ' ');

// De la respuesta de la API al estado editable (null -> '')
function aEstado(historia) {
  return {
    antecedentes: historia.antecedentes ?? '',
    cirugias_previas: historia.cirugias_previas ?? '',
    observaciones: historia.observaciones ?? '',
    fruta_diablo: Boolean(historia.fruta_diablo),
    alergias_revisadas: Boolean(historia.alergias_revisadas),
    alergias: (historia.alergias ?? []).map((a) => ({
      sustancia: a.sustancia,
      id_medicamento: a.id_medicamento ?? null,
      nombre_medicamento: a.nombre_medicamento ?? null,
    })),
  };
}

// Las alergias vuelven ordenadas por sustancia: se comparan sin depender del orden
const claveAlergias = (lista) =>
  lista
    .map((a) => `${a.sustancia.toLowerCase()}|${a.id_medicamento ?? ''}`)
    .sort()
    .join('\n');

// Solo los campos que cambiaron respecto a lo que trajo el servidor
function calcularCambios(original, actual) {
  const cambios = {};

  ['antecedentes', 'cirugias_previas', 'observaciones'].forEach((campo) => {
    const nuevo = actual[campo].trim();
    if (nuevo !== original[campo].trim()) cambios[campo] = nuevo;
  });

  ['fruta_diablo', 'alergias_revisadas'].forEach((campo) => {
    if (actual[campo] !== original[campo]) cambios[campo] = actual[campo];
  });

  if (claveAlergias(actual.alergias) !== claveAlergias(original.alergias)) {
    // Se conserva el vínculo con el medicamento de las alergias que ya lo tenían
    cambios.alergias = actual.alergias.map(({ sustancia, id_medicamento: idMedicamento }) =>
      idMedicamento != null ? { sustancia, id_medicamento: idMedicamento } : { sustancia },
    );
  }

  return cambios;
}

function formatFecha(valor) {
  if (!valor) return '';
  let texto = String(valor).replace(' ', 'T');
  if (!texto.includes('T')) texto += 'T00:00:00'; // evita el desfase de zona horaria en fechas sin hora
  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
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
      <FileText className="h-4 w-4 text-[#e0b060]" />
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c8933e] to-transparent" />
    </div>
  );
}

function Seccion({ icono: Icono, titulo, children }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#e0b060]">
        <Icono className="h-4 w-4" aria-hidden="true" />
        {titulo}
        <span className="h-px flex-1 bg-gradient-to-r from-[#c8933e]/70 to-transparent" />
      </h2>
      {children}
    </section>
  );
}

function CampoTexto({ id, icono, titulo, valor, limite, onChange, placeholder }) {
  return (
    <Seccion icono={icono} titulo={titulo}>
      <label htmlFor={id} className="sr-only">{titulo}</label>
      <textarea
        id={id}
        rows={4}
        maxLength={limite}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${claseCampo} min-h-[7rem] resize-y py-3`}
      />
      <p className="text-right text-xs text-[#a58a5a]">{valor.length}/{limite}</p>
    </Seccion>
  );
}

// El estado se indica con texto (Sí/No) además de la posición y el color
function Interruptor({ id, activo, onChange, etiqueta, descripcion }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#b07a3a]/40 bg-black/30 p-3">
      <div className="min-w-0">
        <p id={`${id}-etiqueta`} className="text-sm font-bold uppercase tracking-wide text-[#f2c48a]">
          {etiqueta}
        </p>
        {descripcion && <p className="text-xs text-[#a58a5a]">{descripcion}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="w-6 text-sm font-bold uppercase text-[#f2c48a]" aria-hidden="true">
          {activo ? 'Sí' : 'No'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={activo}
          aria-labelledby={`${id}-etiqueta`}
          onClick={() => onChange(!activo)}
          className={`relative h-8 w-16 rounded-full border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a] ${
            activo
              ? 'border-[#ffd36a] bg-gradient-to-b from-[#e8a93c] to-[#a8611a]'
              : 'border-[#b07a3a]/50 bg-[#141a26]'
          }`}
        >
          <span
            className={`absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#fbe9c0] shadow transition-all ${
              activo ? 'left-9' : 'left-1'
            }`}
          />
        </button>
      </div>
    </div>
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
      aria-label="Volver a pacientes"
      className="inline-flex h-11 items-center gap-2 rounded-full border border-[#b07a3a]/70 bg-[#1b1208]/80 px-4 text-sm font-bold uppercase tracking-wide text-[#f2c48a] shadow-[0_0_12px_rgba(0,0,0,0.5)] backdrop-blur-sm transition hover:bg-[#2d1b0e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Atrás
    </button>
  );
}

// ---- pantalla ----

export default function HistoriaClinicaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const idValido = /^\d+$/.test(id ?? '');

  const [paciente, setPaciente] = useState(null);
  const [historia, setHistoria] = useState(null); // respuesta cruda (id, nombre, fecha de creación)
  const [original, setOriginal] = useState(null); // lo último que confirmó el servidor
  const [form, setForm] = useState(null); // lo que se está editando
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: 'ok' | 'error', texto }
  const [nuevaAlergia, setNuevaAlergia] = useState('');
  const [errorAlergia, setErrorAlergia] = useState('');

  const cargar = useCallback(async () => {
    if (!idValido) {
      setErrorCarga('El identificador del paciente no es válido.');
      setCargando(false);
      return;
    }

    setCargando(true);
    try {
      // El encabezado es un extra: si falla, la historia se muestra igual
      const [respuestaHistoria, respuestaPaciente] = await Promise.all([
        getMedicalHistory(id),
        getPatientById(id).catch(() => null),
      ]);

      const datos = respuestaHistoria?.historia;
      if (!datos) throw new Error('La respuesta del servidor no incluye la historia clínica.');

      const estado = aEstado(datos);
      setHistoria(datos);
      setOriginal(estado);
      setForm(estado);
      setPaciente(respuestaPaciente?.paciente ?? null);
      setErrorCarga('');
    } catch (error) {
      setErrorCarga(error.message || 'No se pudo cargar la historia clínica.');
    } finally {
      setCargando(false);
    }
  }, [id, idValido]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambios = useMemo(
    () => (original && form ? calcularCambios(original, form) : {}),
    [original, form],
  );
  const hayCambios = Object.keys(cambios).length > 0;

  // Avisa si se intenta cerrar o recargar la pestaña con cambios sin guardar
  useEffect(() => {
    if (!hayCambios) return undefined;
    const avisar = (evento) => {
      evento.preventDefault();
      evento.returnValue = '';
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const volver = () => {
    if (hayCambios && !window.confirm('Tienes cambios sin guardar. ¿Quieres salir de todos modos?')) return;
    navigate(RUTA_PACIENTES);
  };

  const setCampo = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setMensaje(null);
  };

  const agregarAlergia = () => {
    const sustancia = normalizar(nuevaAlergia);

    if (!sustancia) {
      setErrorAlergia('Escribe la sustancia a la que es alérgico.');
      return;
    }
    if (form.alergias.length >= MAX_ALERGIAS) {
      setErrorAlergia(`No se pueden registrar más de ${MAX_ALERGIAS} alergias.`);
      return;
    }
    if (form.alergias.some((a) => a.sustancia.toLowerCase() === sustancia.toLowerCase())) {
      setErrorAlergia('Esa alergia ya está registrada.');
      return;
    }

    setForm((prev) => ({
      ...prev,
      alergias: [...prev.alergias, { sustancia, id_medicamento: null, nombre_medicamento: null }],
      alergias_revisadas: true, // registrar una alergia implica que ya se revisaron
    }));
    setNuevaAlergia('');
    setErrorAlergia('');
    setMensaje(null);
  };

  const quitarAlergia = (sustancia) => {
    setForm((prev) => ({ ...prev, alergias: prev.alergias.filter((a) => a.sustancia !== sustancia) }));
    setMensaje(null);
  };

  const descartar = () => {
    setForm(original);
    setNuevaAlergia('');
    setErrorAlergia('');
    setMensaje(null);
  };

  const guardar = async () => {
    if (!hayCambios) return;

    setGuardando(true);
    setMensaje(null);
    try {
      const respuesta = await updateMedicalHistory(id, cambios);

      if (respuesta?.historia) {
        const estado = aEstado(respuesta.historia);
        setHistoria(respuesta.historia);
        setOriginal(estado);
        setForm(estado);
      } else {
        setOriginal(form);
      }
      setMensaje({ tipo: 'ok', texto: respuesta?.message || 'Historia clínica actualizada' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo guardar la historia clínica.' });
    } finally {
      setGuardando(false);
    }
  };

  // ---- estados de carga y error ----

  if (cargando) {
    return (
      <Pagina>
        <BotonAtras onClick={volver} />
        <Marco>
          <p
            className="flex items-center justify-center gap-3 py-10 text-sm text-[#e6c9a0]"
            role="status"
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Cargando historia clínica…
          </p>
        </Marco>
      </Pagina>
    );
  }

  if (errorCarga || !form) {
    return (
      <Pagina>
        <BotonAtras onClick={volver} />
        <Marco>
          <div className="space-y-4 py-6 text-center" role="alert">
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-red-300">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              {errorCarga || 'No se pudo cargar la historia clínica.'}
            </p>
            {idValido && (
              <button type="button" onClick={cargar} className={`${claseBotonSecundario} mx-auto`}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reintentar
              </button>
            )}
          </div>
        </Marco>
      </Pagina>
    );
  }

  // ---- pantalla principal ----

  const nombre = paciente?.nombre_completo ?? historia.nombre_paciente;
  const estado = ESTADOS[paciente?.estado_salud];
  const color = estado?.color ?? '#cdb68a';
  const totalAlergias = form.alergias.length;

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
            <FileText className="h-8 w-8 text-[#f0c675]" strokeWidth={1.6} aria-hidden="true" />
          </div>
          <h1
            className="bg-gradient-to-b from-[#ffe3a3] via-[#f0b25a] to-[#b8691f] bg-clip-text text-xl font-extrabold uppercase leading-tight tracking-wide text-transparent drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
            style={{ fontFamily: FUENTE_TITULO }}
          >
            Historia clínica
          </h1>
          <Divisor />
        </header>

        {/* Datos del paciente */}
        <div
          className="relative overflow-hidden rounded-xl border border-[#b07a3a]/40"
          style={{ background: `linear-gradient(90deg, ${color}22 0%, transparent 65%), #111723` }}
        >
          <span
            className="absolute inset-y-0 left-0 w-1.5"
            style={{ background: color, boxShadow: `0 0 12px ${color}` }}
            aria-hidden="true"
          />
          <div className="flex items-center gap-3 p-3 pl-5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#d9a24f] text-lg font-extrabold text-[#f0c675]"
              style={{ background: 'radial-gradient(circle at 30% 30%, #3b2a16, #140c05)' }}
              aria-hidden="true"
            >
              {(nombre || '?').trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold uppercase leading-tight text-[#f2c48a]">{nombre}</p>
              <p className="truncate text-[11px] uppercase tracking-widest text-[#a58a5a]">
                {paciente?.documento_identidad ?? `Paciente ${historia.id_paciente}`}
              </p>
            </div>
            {estado && (
              <span
                className="whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                style={{
                  color,
                  borderColor: color,
                  boxShadow: `0 0 10px ${color}66, inset 0 0 8px ${color}33`,
                }}
              >
                {estado.label}
              </span>
            )}
          </div>
          <p className="px-3 pb-3 pl-5 text-xs text-[#a58a5a]">
            Historia abierta el {formatFecha(historia.fecha_creacion)}
          </p>
        </div>

        <div className="mt-5 space-y-6">
          {/* Alergias */}
          <Seccion icono={Pill} titulo="Alergias">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {totalAlergias > 0 ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-red-300">
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  {totalAlergias === 1 ? '1 alergia registrada' : `${totalAlergias} alergias registradas`}
                </p>
              ) : form.alergias_revisadas ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Revisadas: sin alergias conocidas
                </p>
              ) : (
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  Alergias sin revisar
                </p>
              )}
              <span className="text-xs text-[#a58a5a]">{totalAlergias}/{MAX_ALERGIAS}</span>
            </div>

            {totalAlergias > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Alergias registradas">
                {form.alergias.map((a) => (
                  <li
                    key={a.sustancia}
                    className="inline-flex items-center gap-2 rounded-full border border-red-400/60 bg-red-500/10 py-1 pl-3 pr-1 text-sm font-semibold text-red-200"
                  >
                    <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{a.sustancia}</span>
                    {a.nombre_medicamento && (
                      <span className="rounded-full bg-black/30 px-2 py-0.5 text-[11px] font-normal uppercase tracking-wide text-[#e6c9a0]">
                        Medicamento: {a.nombre_medicamento}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => quitarAlergia(a.sustancia)}
                      aria-label={`Quitar alergia a ${a.sustancia}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <label htmlFor="nueva-alergia" className="sr-only">Nueva alergia</label>
              <input
                id="nueva-alergia"
                className={`${claseCampo} h-12 flex-1`}
                placeholder="Ej. Penicilina, látex, maní…"
                maxLength={MAX_SUSTANCIA}
                autoComplete="off"
                value={nuevaAlergia}
                aria-invalid={Boolean(errorAlergia)}
                onChange={(e) => {
                  setNuevaAlergia(e.target.value);
                  setErrorAlergia('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    agregarAlergia();
                  }
                }}
              />
              <button type="button" onClick={agregarAlergia} className={claseBotonSecundario}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Agregar
              </button>
            </div>
            {errorAlergia && (
              <p className="text-xs font-semibold text-red-300" role="alert">{errorAlergia}</p>
            )}

            <Interruptor
              id="alergias-revisadas"
              activo={form.alergias_revisadas}
              onChange={(valor) => setCampo('alergias_revisadas', valor)}
              etiqueta="Alergias revisadas"
              descripcion="Marca que ya se preguntó por alergias, aunque no haya ninguna."
            />
          </Seccion>

          <CampoTexto
            id="antecedentes"
            icono={History}
            titulo="Antecedentes"
            valor={form.antecedentes}
            limite={LIMITES.antecedentes}
            onChange={(valor) => setCampo('antecedentes', valor)}
            placeholder="Enfermedades previas, condiciones crónicas…"
          />

          <CampoTexto
            id="cirugias-previas"
            icono={Scissors}
            titulo="Cirugías previas"
            valor={form.cirugias_previas}
            limite={LIMITES.cirugias_previas}
            onChange={(valor) => setCampo('cirugias_previas', valor)}
            placeholder="Intervenciones realizadas y fechas aproximadas…"
          />

          <CampoTexto
            id="observaciones"
            icono={StickyNote}
            titulo="Observaciones"
            valor={form.observaciones}
            limite={LIMITES.observaciones}
            onChange={(valor) => setCampo('observaciones', valor)}
            placeholder="Notas del personal médico…"
          />

          <Seccion icono={Apple} titulo="Fruta del Diablo">
            <Interruptor
              id="fruta-diablo"
              activo={form.fruta_diablo}
              onChange={(valor) => setCampo('fruta_diablo', valor)}
              etiqueta="Usuario de Fruta del Diablo"
              descripcion="Dato a tener en cuenta en tratamientos y emergencias."
            />
          </Seccion>

          {/* Mensajes y acciones */}
          <div className="space-y-3">
            {mensaje && (
              <p
                role="status"
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-sm font-semibold ${
                  mensaje.tipo === 'ok'
                    ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-300'
                    : 'border-red-400/60 bg-red-500/10 text-red-300'
                }`}
              >
                {mensaje.tipo === 'ok' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                {mensaje.texto}
              </p>
            )}

            {hayCambios && !mensaje && (
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-300" role="status">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Hay cambios sin guardar
              </p>
            )}

            <div className="flex gap-3">
              {hayCambios && (
                <button type="button" onClick={descartar} disabled={guardando} className={`${claseBotonSecundario} flex-1`}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Descartar
                </button>
              )}
              <button
                type="button"
                onClick={guardar}
                disabled={!hayCambios || guardando}
                className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-xl border border-[#ffd36a]/70 bg-gradient-to-b from-[#f2b44a] via-[#d9822b] to-[#a8480f] text-base font-extrabold uppercase tracking-wide text-[#2a1507] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_0_20px_rgba(255,150,40,0.4)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-5 w-5" aria-hidden="true" />
                )}
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      </Marco>
    </Pagina>
  );
}