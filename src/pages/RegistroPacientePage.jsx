// src/pages/RegistroPacientePage.jsx
// Pantalla "Admitir nuevo paciente", conectada a la API en C++.
//
// El formulario se coloca justo debajo de las cabeceras dibujadas en la imagen
// (EXPEDIENTE / AFILIACIÓN / SANGRE / RECOMPENSA / ESTADO / ACCIONES), así cada
// campo queda alineado con su columna. Debajo se listan los pacientes que
// devuelve GET /api/pacientes, con buscador y paginación.
//
// Los nombres del formulario son los de la pantalla; al guardar se traducen a
// los de la base (ver aPayload). La columna dibujada "AFILIACIÓN" se tapa y se
// reetiqueta como "Rango / cargo", que es lo que la tabla guarda de verdad.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Anchor, ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ClipboardList,
  Coins, Compass, Droplet, FileText, Fingerprint, HeartPulse, Pencil, Save, Search, StickyNote, User,
  UserPlus, X,
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PacientesGrandLine, { Zona } from './PacientesGrandLine';
import { createPatient, getPatients, updatePatient } from '../services/api';
import { notifyPatientsChanged } from '../services/patientEvents';

// Ruta del dashboard (a donde vuelve el botón "Atrás")
const RUTA_DASHBOARD = '/dashboard';

// Ruta de la historia clínica de un paciente (KAN-20)
const rutaHistoria = (idPaciente) => `/pacientes/${idPaciente}/historia`;

// Color del panel de la imagen, usado para tapar textos dibujados que cambian
// (subtítulo, cabecera de la columna de rango y contador).
// Si se nota una costura, ajusta este valor.
const FONDO_PANEL = '#222838';
const PAGE_SIZE = 5;

const SANGRES = ['F', 'S', 'X', 'XF'];

// Los cuatro valores que acepta el CHECK de la tabla pacientes. No inventar
// otros: la base rechaza cualquier cosa fuera de esta lista.
const ESTADOS = [
  { value: 'CRITICO', label: 'Crítico', color: '#ff6b5b' },
  { value: 'EN_RECUPERACION', label: 'En recuperación', color: '#ffa733' },
  { value: 'EN_TRATAMIENTO', label: 'En tratamiento', color: '#4aa8ff' },
  { value: 'SANO', label: 'Sano', color: '#4dff88' },
];

const FORM_VACIO = {
  nombre: '',
  rango: '',
  sangre: '',
  recompensa: '',
  estado: '',
  documento: '',
  nacimiento: '',
  notas: '',
};

const ERRORES_VACIOS = Object.fromEntries(Object.keys(FORM_VACIO).map((k) => [k, '']));

const estadoDe = (value) => ESTADOS.find((e) => e.value === value);

// Ojo con el cero: una recompensa de 0 es un dato válido y hay que mostrarla,
// así que no vale con comprobar si el valor es "falsy".
const formatBerries = (digitos) => {
  if (digitos === '' || digitos === null || digitos === undefined) return '';
  return Number(digitos).toLocaleString('es-CO');
};

// Devuelve un mensaje por campo ('' = sin error)
function validar(form) {
  const errores = { ...ERRORES_VACIOS };

  if (form.nombre.trim().length < 2) errores.nombre = 'Mínimo 2 caracteres.';
  if (!form.rango.trim()) errores.rango = 'Indica el rango o cargo.';
  if (!form.sangre) errores.sangre = 'Elige tipo.';
  if (form.recompensa === '') errores.recompensa = 'Ingresa un monto (0 si no tiene).';
  if (!form.estado) errores.estado = 'Elige estado.';
  if (!form.documento.trim()) errores.documento = 'Obligatorio y único (ej. HP-005).';
  if (!form.nacimiento) errores.nacimiento = 'Indica la fecha.';
  if (form.notas.length > 500) errores.notas = 'Máximo 500 caracteres.';

  return errores;
}

const hayErrores = (errores) => Object.values(errores).some(Boolean);

// Del formulario a los nombres que espera la API / la base
function aPayload(form) {
  return {
    documento_identidad: form.documento.trim(),
    nombre_completo: form.nombre.trim(),
    fecha_nacimiento: form.nacimiento,
    tipo_sangre: form.sangre,
    rango_cargo: form.rango.trim(),
    recompensa: Number(form.recompensa || 0),
    estado_salud: form.estado,
    observaciones: form.notas.trim(),
  };
}

// De la respuesta de la API al formulario (para editar)
function aFormulario(paciente) {
  return {
    nombre: paciente.nombre_completo ?? '',
    rango: paciente.rango_cargo ?? '',
    sangre: paciente.tipo_sangre ?? '',
    recompensa: String(paciente.recompensa ?? ''),
    estado: paciente.estado_salud ?? '',
    documento: paciente.documento_identidad ?? '',
    nacimiento: paciente.fecha_nacimiento ?? '',
    notas: paciente.observaciones ?? '',
  };
}

// ---- estilos ----
const claseInput =
  'h-full w-full rounded-md border border-[#b07a3a]/50 bg-[#141a26] px-[3%] text-[1.15em] ' +
  'text-[#fbe9c0] placeholder-[#7d7560] outline-none [color-scheme:dark] ' +
  'focus:ring-2 focus:ring-[#ffd36a]';
const claseInvalido = ' !ring-2 !ring-red-400';

function Err({ x, y, w, children }) {
  if (!children) return null;
  return (
    <Zona x={x} y={y} w={w} h={28} className="flex items-center">
      <p className="truncate text-[0.9em] font-semibold text-red-300" role="alert">
        {children}
      </p>
    </Zona>
  );
}

function Etiqueta({ x, y, w, children }) {
  return (
    <Zona x={x} y={y} w={w} h={28} className="flex items-end">
      <span className="text-[1em] font-semibold uppercase tracking-wider text-[#e0b060]">
        {children}
      </span>
    </Zona>
  );
}

// Select con flecha propia (la nativa desentona con el diseño)
function Selector({ x, y, w, h, className, children, ...props }) {
  return (
    <Zona x={x} y={y} w={w} h={h}>
      <select className={`${className} appearance-none pr-[18%]`} {...props}>
        {children}
      </select>
      <span className="pointer-events-none absolute right-[8%] top-1/2 -translate-y-1/2 text-[1em] text-[#e0b060]">
        ▾
      </span>
    </Zona>
  );
}

// ---- vista móvil (menos de 1024px) ----
const claseBaseMovil =
  'w-full rounded-lg border border-[#b07a3a]/50 bg-[#10151f] pl-10 pr-3 text-base text-[#fbe9c0] ' +
  'placeholder-[#6f6955] outline-none shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)] [color-scheme:dark] ' +
  'transition focus:border-[#ffd36a] focus:ring-2 focus:ring-[#ffd36a]/70';

const FUENTE_TITULO = "'Cinzel', Georgia, serif";

// Marco de bronce con remaches en las esquinas
function MarcoMovil({ children }) {
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

function DivisorMovil() {
  return (
    <div className="my-3 flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c8933e] to-transparent" />
      <Anchor className="h-4 w-4 text-[#e0b060]" />
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c8933e] to-transparent" />
    </div>
  );
}

function SeccionMovil({ icono: Icono, titulo, children }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#e0b060]">
        <Icono className="h-4 w-4" aria-hidden="true" />
        {titulo}
        <span className="h-px flex-1 bg-gradient-to-r from-[#c8933e]/70 to-transparent" />
      </h3>
      {children}
    </section>
  );
}

function CampoMovil({ etiqueta, icono: Icono, error, arriba = false, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#cdb68a]">
        {etiqueta}
      </span>
      <span className="relative block">
        {Icono ? (
          <Icono
            aria-hidden="true"
            className={`pointer-events-none absolute left-3 z-10 h-4 w-4 text-[#b07a3a] ${
              arriba ? 'top-3.5' : 'top-1/2 -translate-y-1/2'
            }`}
          />
        ) : null}
        {children}
      </span>
      {error ? (
        <span className="mt-1 block text-xs font-semibold text-red-300" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

// Select con flecha propia, igual que en escritorio
function SelectMovil({ className, children, ...props }) {
  return (
    <div className="relative">
      <select className={`${className} appearance-none pr-9`} {...props}>
        {children}
      </select>
      <span
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#e0b060]"
        aria-hidden="true"
      >
        ▾
      </span>
    </div>
  );
}

export default function RegistroPacientePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nombreRef = useRef(null);
  const nombreMovilRef = useRef(null);

  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState(ERRORES_VACIOS);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: 'ok' | 'error', texto }
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [editandoId, setEditandoId] = useState(null); // id_paciente en edición (null = alta nueva)
  const [pestana, setPestana] = useState('admision'); // vista móvil: 'admision' | 'registros'

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await getPatients();
      const lista = Array.isArray(respuesta) ? respuesta : respuesta?.pacientes ?? [];
      setPacientes(lista);
      setErrorCarga('');
    } catch (error) {
      setPacientes([]);
      setErrorCarga(error.message || 'No se pudo cargar la lista de pacientes.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return pacientes;
    return pacientes.filter((p) =>
      [p.nombre_completo, p.documento_identidad, p.rango_cargo, p.recompensa]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [pacientes, busqueda]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * PAGE_SIZE;
  const visibles = filtrados.slice(inicio, inicio + PAGE_SIZE);
  const desde = filtrados.length ? inicio + 1 : 0;
  const hasta = inicio + visibles.length;

  // Enfoca el campo "Nombre" de la vista que está visible (escritorio o móvil)
  const enfocarNombre = () => {
    const visible = [nombreRef.current, nombreMovilRef.current].find(
      (n) => n && n.offsetParent !== null,
    );
    if (!visible) return;
    visible.focus();
    // En móvil se lleva la vista hasta el formulario
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      visible.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleChange = (event) => {
    const { name } = event.target;
    let { value } = event.target;
    if (name === 'recompensa') value = value.replace(/\D/g, '').slice(0, 12);

    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: '' }));
    setMensaje(null);
  };

  const limpiar = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setErrores(ERRORES_VACIOS);
    setMensaje(null);
    enfocarNombre();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMensaje(null);

    const nuevos = validar(form);
    setErrores(nuevos);
    if (hayErrores(nuevos)) return;

    setGuardando(true);
    try {
      const datos = aPayload(form);

      if (editandoId) {
        const respuesta = await updatePatient(editandoId, datos);
        const nombre = respuesta?.paciente?.nombre_completo ?? datos.nombre_completo;
        setMensaje({ tipo: 'ok', texto: `✔ ${nombre} actualizado` });
      } else {
        const respuesta = await createPatient(datos);
        const nombre = respuesta?.paciente?.nombre_completo ?? datos.nombre_completo;
        setPagina(1);
        setBusqueda('');
        setMensaje({ tipo: 'ok', texto: `✔ ${nombre} admitido` });
      }

      // El dashboard escucha este aviso y actualiza sus contadores al instante
      notifyPatientsChanged();
      await cargar();

      setEditandoId(null);
      setForm(FORM_VACIO);
      enfocarNombre();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudo registrar al paciente.' });
    } finally {
      setGuardando(false);
    }
  };

  // Carga el paciente en el formulario para modificarlo
  const handleEditar = (p) => {
    setForm(aFormulario(p));
    setErrores(ERRORES_VACIOS);
    setMensaje(null);
    setEditandoId(p.id_paciente);
    enfocarNombre();
  };

  const campo = (name) => claseInput + (errores[name] ? claseInvalido : '');

  const claseCampoMovil = (name, extra = 'h-12') =>
    `${claseBaseMovil} ${extra}` + (errores[name] ? claseInvalido : '');

  const mensajeLista = cargando
    ? 'Cargando pacientes…'
    : errorCarga
      ? errorCarga
      : pacientes.length === 0
        ? 'Aún no hay pacientes registrados.'
        : visibles.length === 0
          ? 'Ningún paciente coincide con la búsqueda.'
          : '';

  const paginacionMovil = [
    { etiqueta: 'Primera página', Icono: ChevronsLeft, ir: () => setPagina(1), off: paginaActual === 1 },
    { etiqueta: 'Página anterior', Icono: ChevronLeft, ir: () => setPagina(paginaActual - 1), off: paginaActual === 1 },
    { etiqueta: 'Página siguiente', Icono: ChevronRight, ir: () => setPagina(paginaActual + 1), off: paginaActual === totalPaginas },
  ];

  // Desde una tarjeta: carga el paciente y cambia a la pestaña del formulario
  const editarMovil = (p) => {
    handleEditar(p);
    setPestana('admision');
    setTimeout(enfocarNombre, 60);
  };

  const pestanas = [
    { id: 'admision', Icono: UserPlus, texto: editandoId ? 'Editando' : 'Admisión' },
    { id: 'registros', Icono: ClipboardList, texto: 'Registros', total: pacientes.length },
  ];

  // Mismos datos, estado y funciones que la vista de escritorio; solo cambia cómo se dibuja
  const vistaMovil = (
    <div className="space-y-4 pb-8">
      <button
        type="button"
        onClick={() => navigate(RUTA_DASHBOARD)}
        aria-label="Volver al dashboard"
        className="inline-flex h-11 items-center gap-2 rounded-full border border-[#b07a3a]/70 bg-[#1b1208]/80 px-4 text-sm font-bold uppercase tracking-wide text-[#f2c48a] shadow-[0_0_12px_rgba(0,0,0,0.5)] backdrop-blur-sm transition hover:bg-[#2d1b0e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Atrás
      </button>

      <MarcoMovil>
        <header className="text-center">
          <div
            className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#d9a24f]"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #3b2a16, #140c05)',
              boxShadow: '0 0 22px rgba(255,170,60,0.4), inset 0 0 12px rgba(0,0,0,0.7)',
            }}
          >
            <Compass className="h-8 w-8 text-[#f0c675]" strokeWidth={1.6} aria-hidden="true" />
          </div>
          <h1
            className="bg-gradient-to-b from-[#ffe3a3] via-[#f0b25a] to-[#b8691f] bg-clip-text text-xl font-extrabold uppercase leading-tight tracking-wide text-transparent drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
            style={{ fontFamily: FUENTE_TITULO }}
          >
            Base de datos de registro de pacientes
          </h1>
          <DivisorMovil />
        </header>

        {/* Pestañas */}
        <div
          role="tablist"
          className="grid grid-cols-2 gap-1 rounded-xl border border-[#b07a3a]/40 bg-black/40 p-1 md:hidden"
        >
          {pestanas.map(({ id, Icono, texto, total }) => {
            const activa = pestana === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => setPestana(id)}
                className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a] ${
                  activa
                    ? 'bg-gradient-to-b from-[#e8a93c] to-[#a8611a] text-[#2a1507] shadow-[0_0_14px_rgba(255,170,40,0.35)]'
                    : 'text-[#cdb68a] hover:bg-white/5'
                }`}
              >
                <Icono className="h-4 w-4" aria-hidden="true" />
                {texto}
                {total !== undefined && (
                  <span
                    className={`rounded-full px-2 text-xs ${
                      activa ? 'bg-black/25 text-[#2a1507]' : 'bg-[#b07a3a]/30 text-[#f2c48a]'
                    }`}
                  >
                    {total}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="md:mt-5 md:grid md:grid-cols-2 md:items-start md:gap-6">
          <div
            className={`mt-4 md:mt-0 ${pestana === 'admision' ? '' : 'hidden md:block'}`}
            role="tabpanel"
          >
            <p
              className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.18em] text-[#f2c48a]"
              style={{ fontFamily: FUENTE_TITULO }}
            >
              {editandoId ? 'Editando paciente' : 'Admitir nuevo paciente'}
            </p>

            {mensaje && (
              <p
                role="status"
                className={`mb-4 rounded-lg border px-3 py-2 text-center text-sm font-semibold ${
                  mensaje.tipo === 'ok'
                    ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.2)]'
                    : 'border-red-400/60 bg-red-500/10 text-red-300'
                }`}
              >
                {mensaje.tipo === 'ok' ? mensaje.texto : `✖ ${mensaje.texto}`}
              </p>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <SeccionMovil icono={Fingerprint} titulo="Identificación">
                <CampoMovil etiqueta="Nombre completo" icono={User} error={errores.nombre}>
                  <input
                    ref={nombreMovilRef}
                    className={claseCampoMovil('nombre')}
                    name="nombre"
                    placeholder="Nombre completo"
                    aria-label="Nombre completo del paciente"
                    aria-invalid={Boolean(errores.nombre)}
                    maxLength={150}
                    autoComplete="off"
                    value={form.nombre}
                    onChange={handleChange}
                  />
                </CampoMovil>

                <CampoMovil etiqueta="Documento" icono={Fingerprint} error={errores.documento}>
                  <input
                    className={claseCampoMovil('documento')}
                    name="documento"
                    placeholder="Ej. HP-005"
                    aria-label="Documento de identidad"
                    aria-invalid={Boolean(errores.documento)}
                    maxLength={50}
                    autoComplete="off"
                    value={form.documento}
                    onChange={handleChange}
                  />
                </CampoMovil>

                <CampoMovil etiqueta="Fecha de nacimiento" icono={CalendarDays} error={errores.nacimiento}>
                  <input
                    type="date"
                    className={claseCampoMovil('nacimiento')}
                    name="nacimiento"
                    aria-label="Fecha de nacimiento"
                    aria-invalid={Boolean(errores.nacimiento)}
                    value={form.nacimiento}
                    onChange={handleChange}
                  />
                </CampoMovil>
              </SeccionMovil>

              <SeccionMovil icono={Anchor} titulo="Perfil de tripulación">
                <CampoMovil etiqueta="Rango o cargo" icono={Anchor} error={errores.rango}>
                  <input
                    className={claseCampoMovil('rango')}
                    name="rango"
                    placeholder="Ej. Capitán"
                    aria-label="Rango o cargo"
                    aria-invalid={Boolean(errores.rango)}
                    maxLength={50}
                    autoComplete="off"
                    value={form.rango}
                    onChange={handleChange}
                  />
                </CampoMovil>

                <div className="grid grid-cols-2 gap-3">
                  <CampoMovil etiqueta="Sangre" icono={Droplet} error={errores.sangre}>
                    <SelectMovil
                      className={claseCampoMovil('sangre')}
                      name="sangre"
                      aria-label="Tipo de sangre"
                      aria-invalid={Boolean(errores.sangre)}
                      value={form.sangre}
                      onChange={handleChange}
                    >
                      <option value="">Tipo</option>
                      {SANGRES.map((s) => (
                        <option key={s} value={s}>Type {s}</option>
                      ))}
                    </SelectMovil>
                  </CampoMovil>

                  <CampoMovil etiqueta="Estado" icono={HeartPulse} error={errores.estado}>
                    <SelectMovil
                      className={claseCampoMovil('estado')}
                      name="estado"
                      aria-label="Estado de salud"
                      aria-invalid={Boolean(errores.estado)}
                      value={form.estado}
                      onChange={handleChange}
                    >
                      <option value="">Estado</option>
                      {ESTADOS.map((e) => (
                        <option key={e.value} value={e.value}>{e.label}</option>
                      ))}
                    </SelectMovil>
                  </CampoMovil>
                </div>

                <CampoMovil etiqueta="Recompensa (฿)" icono={Coins} error={errores.recompensa}>
                  <input
                    className={claseCampoMovil('recompensa')}
                    name="recompensa"
                    inputMode="numeric"
                    placeholder="฿ 0"
                    aria-label="Recompensa en berries"
                    aria-invalid={Boolean(errores.recompensa)}
                    autoComplete="off"
                    value={formatBerries(form.recompensa)}
                    onChange={handleChange}
                  />
                </CampoMovil>
              </SeccionMovil>

              <SeccionMovil icono={StickyNote} titulo="Notas clínicas (opcional)">
                <CampoMovil etiqueta="Observaciones" icono={StickyNote} arriba error={errores.notas}>
                  <textarea
                    rows={3}
                    className={claseCampoMovil('notas', 'py-3')}
                    name="notas"
                    placeholder="Heridas, alergias, observaciones…"
                    aria-label="Notas clínicas"
                    aria-invalid={Boolean(errores.notas)}
                    maxLength={500}
                    value={form.notas}
                    onChange={handleChange}
                  />
                </CampoMovil>
              </SeccionMovil>

              <div className="flex gap-3 pt-1">
                {editandoId && (
                  <button
                    type="button"
                    onClick={limpiar}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[#b07a3a]/60 bg-[#141a26] text-sm font-semibold uppercase tracking-wide text-[#e9c7a0] transition hover:bg-[#1c2536] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" /> Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-xl border border-[#ffd36a]/70 bg-gradient-to-b from-[#f2b44a] via-[#d9822b] to-[#a8480f] text-base font-extrabold uppercase tracking-wide text-[#2a1507] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_0_20px_rgba(255,150,40,0.4)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a] disabled:cursor-wait disabled:opacity-60"
                >
                  <Save className="h-5 w-5" aria-hidden="true" />
                  {guardando ? 'Guardando…' : editandoId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>

          <div
            className={`mt-4 space-y-3 md:mt-0 ${pestana === 'registros' ? '' : 'hidden md:block'}`}
            role="tabpanel"
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b07a3a]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPagina(1);
                }}
                placeholder="Buscar nombre, documento…"
                aria-label="Buscar pacientes registrados"
                className={`${claseBaseMovil} h-12`}
              />
            </div>

            {mensajeLista ? (
              <p
                className={`rounded-xl border border-[#b07a3a]/30 bg-black/30 p-6 text-center text-sm ${
                  errorCarga ? 'text-red-300' : 'text-[#a58a5a]'
                }`}
                role={errorCarga ? 'alert' : 'status'}
              >
                {mensajeLista}
              </p>
            ) : (
              <ul className="space-y-3">
                {visibles.map((p) => {
                  const estado = estadoDe(p.estado_salud);
                  const color = estado?.color ?? '#cdb68a';
                  const editando = p.id_paciente === editandoId;
                  return (
                    <li
                      key={p.id_paciente}
                      className={`relative overflow-hidden rounded-xl border ${
                        editando ? 'border-[#ffd36a]' : 'border-[#b07a3a]/40'
                      }`}
                      style={{
                        background: `linear-gradient(90deg, ${color}22 0%, transparent 65%), #111723`,
                      }}
                    >
                      {/* Franja de color del estado */}
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
                          {(p.nombre_completo || '?').trim().charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-bold uppercase leading-tight text-[#f2c48a]">
                            {p.nombre_completo}
                          </p>
                          <p className="truncate text-[11px] uppercase tracking-widest text-[#a58a5a]">
                            {p.documento_identidad}
                          </p>
                        </div>

                        {/* Historia clínica (KAN-20) */}
                        <button
                          type="button"
                          onClick={() => navigate(rutaHistoria(p.id_paciente))}
                          aria-label={`Ver historia clínica de ${p.nombre_completo}`}
                          title="Historia clínica"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#c8933e] bg-[#3a2812] text-[#f3c97a] transition hover:bg-[#523818] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a]"
                        >
                          <FileText className="h-5 w-5" aria-hidden="true" />
                        </button>

                        {/* Sin botón de eliminar: el esquema no permite borrar pacientes */}
                        <button
                          type="button"
                          onClick={() => editarMovil(p)}
                          aria-label={`Editar ${p.nombre_completo}`}
                          title="Editar"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#c8933e] bg-[#3a2812] text-[#f3c97a] transition hover:bg-[#523818] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a]"
                        >
                          <Pencil className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 px-3 pb-3 pl-5 text-xs text-[#fbe9c0]">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b07a3a]/40 bg-black/30 px-2.5 py-1">
                          <Anchor className="h-3.5 w-3.5 text-[#b07a3a]" aria-hidden="true" />
                          {p.rango_cargo}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b07a3a]/40 bg-black/30 px-2.5 py-1">
                          <Droplet className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
                          Type {p.tipo_sangre}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d9a24f]/50 bg-[#d9a24f]/10 px-2.5 py-1 font-semibold tabular-nums text-[#f0c675]">
                          <Coins className="h-3.5 w-3.5" aria-hidden="true" />
                          ฿ {formatBerries(p.recompensa)}
                        </span>
                        <span
                          className="ml-auto whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                          style={{
                            color,
                            borderColor: color,
                            boxShadow: `0 0 10px ${color}66, inset 0 0 8px ${color}33`,
                            textShadow: `0 0 8px ${color}99`,
                          }}
                        >
                          {estado?.label ?? p.estado_salud}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Contador + paginación */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#b07a3a]/30 bg-black/30 px-3 py-2">
              <p className="text-xs text-[#e6c9a0]" role="status">
                Mostrando {desde}-{hasta} de {filtrados.length} Registros
              </p>
              <div className="flex gap-2">
                {paginacionMovil.map((b) => (
                  <button
                    key={b.etiqueta}
                    type="button"
                    onClick={b.ir}
                    disabled={b.off}
                    aria-label={b.etiqueta}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#c8933e] bg-[#3a2812] text-[#f3c97a] transition hover:bg-[#523818] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <b.Icono className="h-5 w-5" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </MarcoMovil>
    </div>
  );

  return (
    <PacientesGrandLine
      movil={vistaMovil}
      escritorio={
        <>
      {/* ── Botón "Atrás": esquina superior izquierda de la pantalla ── */}
      <Zona x={100} y={16} w={190} h={50}>
        <button
          type="button"
          onClick={() => navigate(RUTA_DASHBOARD)}
          aria-label="Volver al dashboard"
          className="flex h-full w-full items-center justify-center gap-[0.4em] rounded-lg border border-[#b07a3a]/70 bg-[#1b1208]/80 text-[1.2em] font-bold uppercase tracking-wide text-[#f2c48a] backdrop-blur-sm transition hover:bg-[#2d1b0e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]"
        >
          <span aria-hidden="true">←</span> Atrás
        </button>
      </Zona>

      <form onSubmit={handleSubmit} noValidate className="contents">
        {/* ── Subtítulo (tapa "VISTA PRINCIPAL..." y muestra título / resultado) ── */}
        <Zona x={462} y={304} w={1180} h={58} className="flex items-center">
          <div
            className="absolute inset-0 rounded"
            style={{ background: FONDO_PANEL }}
            aria-hidden="true"
          />
          <p
            className="relative z-10 truncate text-[1.5em] font-semibold uppercase leading-none"
            style={{
              color:
                mensaje?.tipo === 'ok' ? '#7dffa0' : mensaje?.tipo === 'error' ? '#ff8a7a' : '#f2c48a',
            }}
            role={mensaje ? 'status' : undefined}
          >
            {mensaje ? mensaje.texto : editandoId ? 'Editando paciente' : 'Admitir nuevo paciente'}
          </p>
        </Zona>

        {/* ── Cancelar edición (solo visible mientras se edita) ── */}
        {editandoId && (
          <Zona x={1440} y={308} w={200} h={50}>
            <button
              type="button"
              onClick={limpiar}
              className="h-full w-full rounded-lg border border-[#b07a3a]/60 bg-[#141a26] text-[1.05em] font-semibold uppercase tracking-wide text-[#e9c7a0] transition hover:bg-[#1c2536] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]"
            >
              ✕ Cancelar
            </button>
          </Zona>
        )}

        {/* ── Botón dibujado "ADMITIR NUEVO PACIENTE" -> limpia el formulario ── */}
        <Zona x={2092} y={98} w={440} h={84}>
          <button
            type="button"
            onClick={limpiar}
            aria-label="Admitir nuevo paciente (limpiar formulario)"
            className="h-full w-full rounded-lg bg-transparent text-transparent transition hover:bg-orange-300/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]"
          >
            Admitir nuevo paciente
          </button>
        </Zona>

        {/* ── Buscador (filtra la lista de abajo) ── */}
        <Zona x={1245} y={163} w={368} h={48}>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar nombre, documento…"
            aria-label="Buscar pacientes registrados"
            className="h-full w-full rounded-md border-0 bg-[#2d1b0e] px-[3%] text-[1.05em] text-[#fbe9c0] placeholder-[#a58a5a] outline-none focus:ring-2 focus:ring-[#ffd36a]"
          />
        </Zona>

        {/* ── La imagen dibuja "AFILIACIÓN" sobre esta columna, pero lo que se
               guarda es el rango o cargo. Se tapa la cabecera y se reetiqueta. ── */}
        <Zona x={550} y={392} w={205} h={70} className="flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: FONDO_PANEL }} aria-hidden="true" />
          <span className="relative z-10 rounded-full border border-[#b07a3a]/70 bg-[#2d1b0e] px-[6%] py-[2%] text-[0.95em] font-bold uppercase tracking-wider text-[#f2c48a]">
            Rango
          </span>
        </Zona>

        {/* ── Fila 1: campos bajo cada cabecera de columna ── */}
        <Zona x={185} y={480} w={355} h={54}>
          <input
            ref={nombreRef}
            className={campo('nombre')}
            name="nombre"
            placeholder="Nombre completo"
            aria-label="Nombre completo del paciente"
            aria-invalid={Boolean(errores.nombre)}
            maxLength={150}
            autoComplete="off"
            value={form.nombre}
            onChange={handleChange}
          />
        </Zona>
        <Zona x={550} y={480} w={205} h={54}>
          <input
            className={campo('rango')}
            name="rango"
            placeholder="Ej. Capitán"
            aria-label="Rango o cargo"
            aria-invalid={Boolean(errores.rango)}
            maxLength={50}
            autoComplete="off"
            value={form.rango}
            onChange={handleChange}
          />
        </Zona>
        <Selector
          x={765}
          y={480}
          w={150}
          h={54}
          className={campo('sangre')}
          name="sangre"
          aria-label="Tipo de sangre"
          aria-invalid={Boolean(errores.sangre)}
          value={form.sangre}
          onChange={handleChange}
        >
          <option value="">Tipo</option>
          {SANGRES.map((s) => (
            <option key={s} value={s}>Type {s}</option>
          ))}
        </Selector>
        <Zona x={927} y={480} w={263} h={54}>
          <input
            className={campo('recompensa')}
            name="recompensa"
            inputMode="numeric"
            placeholder="฿ 0"
            aria-label="Recompensa en berries"
            aria-invalid={Boolean(errores.recompensa)}
            autoComplete="off"
            value={formatBerries(form.recompensa)}
            onChange={handleChange}
          />
        </Zona>
        <Selector
          x={1200}
          y={480}
          w={175}
          h={54}
          className={campo('estado')}
          name="estado"
          aria-label="Estado de salud"
          aria-invalid={Boolean(errores.estado)}
          value={form.estado}
          onChange={handleChange}
        >
          <option value="">Estado</option>
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </Selector>
        <Zona x={1385} y={480} w={252} h={54}>
          <button
            type="submit"
            disabled={guardando}
            className="h-full w-full rounded-lg border border-[#ffd36a]/70 bg-gradient-to-b from-[#e8a93c] to-[#a8611a] text-[1.3em] font-bold uppercase tracking-wide text-[#2a1507] shadow-[0_0_1.2em_rgba(255,170,40,0.35)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a] disabled:cursor-wait disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : editandoId ? 'Actualizar' : 'Guardar'}
          </button>
        </Zona>

        <Err x={185} y={536} w={355}>{errores.nombre}</Err>
        <Err x={550} y={536} w={205}>{errores.rango}</Err>
        <Err x={765} y={536} w={150}>{errores.sangre}</Err>
        <Err x={927} y={536} w={263}>{errores.recompensa}</Err>
        <Err x={1200} y={536} w={175}>{errores.estado}</Err>

        {/* ── Fila 2: los campos que la tabla exige y no caben arriba ── */}
        <Etiqueta x={185} y={566} w={355}>Documento</Etiqueta>
        <Etiqueta x={550} y={566} w={365}>Fecha de nacimiento</Etiqueta>
        <Etiqueta x={927} y={566} w={710}>Notas clínicas (opcional)</Etiqueta>

        <Zona x={185} y={598} w={355} h={54}>
          <input
            className={campo('documento')}
            name="documento"
            placeholder="Ej. HP-005"
            aria-label="Documento de identidad"
            aria-invalid={Boolean(errores.documento)}
            maxLength={50}
            autoComplete="off"
            value={form.documento}
            onChange={handleChange}
          />
        </Zona>
        <Zona x={550} y={598} w={365} h={54}>
          <input
            type="date"
            className={campo('nacimiento')}
            name="nacimiento"
            aria-label="Fecha de nacimiento"
            aria-invalid={Boolean(errores.nacimiento)}
            value={form.nacimiento}
            onChange={handleChange}
          />
        </Zona>
        <Zona x={927} y={598} w={710} h={54}>
          <input
            className={campo('notas')}
            name="notas"
            placeholder="Heridas, alergias, observaciones…"
            aria-label="Notas clínicas"
            aria-invalid={Boolean(errores.notas)}
            maxLength={500}
            autoComplete="off"
            value={form.notas}
            onChange={handleChange}
          />
        </Zona>

        <Err x={185} y={654} w={355}>{errores.documento}</Err>
        <Err x={550} y={654} w={365}>{errores.nacimiento}</Err>
        <Err x={927} y={654} w={710}>{errores.notas}</Err>
      </form>

      {/* ── Lista de pacientes (mismas columnas que las cabeceras) ── */}
      <Zona x={185} y={692} w={1452} h={500}>
        {cargando || errorCarga || visibles.length === 0 ? (
          <p
            className={`flex h-full items-center justify-center text-[1.3em] ${
              errorCarga ? 'text-red-300' : 'text-[#a58a5a]'
            }`}
            role={errorCarga ? 'alert' : 'status'}
          >
            {cargando
              ? 'Cargando pacientes…'
              : errorCarga
                ? errorCarga
                : pacientes.length === 0
                  ? 'Aún no hay pacientes registrados.'
                  : 'Ningún paciente coincide con la búsqueda.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-[0.5em]">
            {visibles.map((p) => {
              const estado = estadoDe(p.estado_salud);
              return (
                <li
                  key={p.id_paciente}
                  className={`grid h-[3.1em] items-center rounded-lg border px-[0.8em] ${
                    p.id_paciente === editandoId
                      ? 'border-[#ffd36a] bg-[#2a2314]/90'
                      : 'border-[#b07a3a]/40 bg-[#141a26]/85'
                  }`}
                  style={{ gridTemplateColumns: '355fr 205fr 150fr 263fr 175fr 252fr', columnGap: '0.5em' }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[1.3em] font-bold uppercase leading-tight text-[#f2c48a]">
                      {p.nombre_completo}
                    </p>
                    <p className="truncate text-[0.85em] uppercase leading-tight text-[#a58a5a]">
                      {p.documento_identidad}
                    </p>
                  </div>
                  <span className="truncate text-[1.15em] text-[#fbe9c0]">{p.rango_cargo}</span>
                  <span className="text-[1.15em] text-[#fbe9c0]">Type {p.tipo_sangre}</span>
                  <span className="truncate text-[1.15em] tabular-nums text-[#fbe9c0]">฿ {formatBerries(p.recompensa)}</span>
                  {/* El badge puede ocupar parte de la columna de acciones (no se parte en dos líneas) */}
                  <span
                    className="justify-self-start whitespace-nowrap rounded-full border px-[0.6em] py-[0.1em] text-[0.85em] font-bold uppercase"
                    style={{ color: estado?.color, borderColor: estado?.color, boxShadow: `0 0 0.6em ${estado?.color}55` }}
                  >
                    {estado?.label ?? p.estado_salud}
                  </span>
                  {/* Sin botón de eliminar: el esquema no permite borrar pacientes
                      (historias_clinicas tiene ON DELETE RESTRICT). */}
                  <div className="flex justify-self-end gap-[0.4em]">
                    {/* Historia clínica (KAN-20) */}
                    <button
                      type="button"
                      onClick={() => navigate(rutaHistoria(p.id_paciente))}
                      aria-label={`Ver historia clínica de ${p.nombre_completo}`}
                      title="Historia clínica"
                      className="rounded-md border border-[#b07a3a]/50 bg-[#2a2314] px-[0.6em] py-[0.25em] text-[1.05em] transition hover:bg-[#40341a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a]"
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditar(p)}
                      aria-label={`Editar ${p.nombre_completo}`}
                      title="Editar"
                      className="rounded-md border border-[#b07a3a]/50 bg-[#2a2314] px-[0.6em] py-[0.25em] text-[1.05em] transition hover:bg-[#40341a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a]"
                    >
                      ✏️
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Zona>

      {/* ── Contador (tapa "Mostrando 0-0 de 0 Registros") ── */}
      <Zona x={245} y={1240} w={700} h={62} className="flex items-center">
        <div className="absolute inset-0" style={{ background: FONDO_PANEL }} aria-hidden="true" />
        <p className="relative z-10 whitespace-nowrap text-[1.35em] text-[#e6c9a0]" role="status">
          Mostrando {desde}-{hasta} de {filtrados.length} Registros
        </p>
      </Zona>

      {/* ── Botones de paginación dibujados (invisibles encima) ── */}
      {[
        { x: 1325, etiqueta: 'Primera página', ir: () => setPagina(1), off: paginaActual === 1 },
        { x: 1397, etiqueta: 'Página anterior', ir: () => setPagina(paginaActual - 1), off: paginaActual === 1 },
        { x: 1468, etiqueta: 'Página siguiente', ir: () => setPagina(paginaActual + 1), off: paginaActual === totalPaginas },
      ].map((b) => (
        <Zona key={b.etiqueta} x={b.x} y={1243} w={58} h={54}>
          <button
            type="button"
            onClick={b.ir}
            disabled={b.off}
            aria-label={b.etiqueta}
            className="h-full w-full rounded-md bg-transparent text-transparent transition hover:bg-orange-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a] disabled:cursor-not-allowed"
          >
            {b.etiqueta}
          </button>
        </Zona>
      ))}
        </>
      }
    />
  );
}