// src/pages/EmergenciasPage.jsx
// KAN-48: registrar una emergencia médica y ver las que siguen abiertas.
//
// En una emergencia lo que importa es actuar rápido, así que el formulario
// pide lo mínimo que exige la base (tipo, urgencia, pacientes, síntomas y
// diagnóstico inicial) y, al guardar, ofrece abrir el protocolo de ese tipo.
// La lista de la derecha ordena por urgencia y luego por antigüedad: lo más
// grave y lo que lleva más tiempo esperando va arriba.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createEmergency, getEmergencies, getPatients } from '../services/api';
import {
  ESTADOS_EMERGENCIA,
  ErrorCampo,
  Insignia,
  MensajeError,
  NIVELES,
  PaginaEnfermeria,
  Seccion,
  TIPOS_EMERGENCIA,
  claseBotonPrimario,
  claseBotonSecundario,
  claseCampo,
  claseEtiqueta,
  etiquetaTipo,
  formatFechaHora,
  mensajeDeError,
  nivelDe,
} from '../components/PanelEnfermeria';

const ESTADOS_ABIERTOS = ['ACTIVA', 'EN_ATENCION'];
const REFRESCO_MS = 30000;

const FORM_VACIO = {
  tipo: '',
  nivel_urgencia: '',
  pacientes: [],
  sintomas: '',
  lesiones: '',
  diagnostico_inicial: '',
};

export const rutaProtocolo = (tipo, idEmergencia) =>
  `/emergencias/protocolo/${tipo}${idEmergencia ? `?emergencia=${idEmergencia}` : ''}`;

function ordenarPorUrgencia(lista) {
  return [...lista].sort((a, b) => {
    const porNivel = nivelDe(a.nivel_urgencia).orden - nivelDe(b.nivel_urgencia).orden;
    if (porNivel !== 0) return porNivel;
    return String(a.fecha_inicio).localeCompare(String(b.fecha_inicio));
  });
}

function TarjetaEmergencia({ emergencia, onProtocolo }) {
  const nivel = nivelDe(emergencia.nivel_urgencia);
  const estado = ESTADOS_EMERGENCIA[emergencia.estado] ?? ESTADOS_EMERGENCIA.ACTIVA;
  const pacientes = emergencia.pacientes ?? [];

  return (
    <li
      className="border-b border-[#b07a3a]/25 py-3 pl-3 pr-4 last:border-b-0"
      style={{ borderLeft: `4px solid ${nivel.color}` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-[#f2c48a]">{etiquetaTipo(emergencia.tipo)}</h3>
        <Insignia color={nivel.color}>{nivel.label}</Insignia>
        <Insignia color={estado.color}>{estado.label}</Insignia>
        <span className="ml-auto tabular-nums text-xs text-[#8a7a60]">
          #{emergencia.id_emergencia} · {formatFechaHora(emergencia.fecha_inicio)}
        </span>
      </div>

      <p className="mt-1 text-sm text-[#cbb391]">{emergencia.diagnostico_inicial}</p>

      <p className="mt-1 text-xs text-[#a58a5a]">
        {pacientes.length === 0
          ? 'Sin pacientes asociados'
          : pacientes.map((p) => p.nombre_completo ?? `Paciente ${p.id_paciente}`).join(', ')}
      </p>

      <button
        type="button"
        onClick={() => onProtocolo(emergencia)}
        className="mt-2 text-xs font-bold uppercase tracking-wide text-[#ffd36a] underline underline-offset-4 hover:text-[#ffe9a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a]"
      >
        Ver protocolo →
      </button>
    </li>
  );
}

function SelectorPacientes({ pacientes, seleccionados, onCambiar, error }) {
  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return pacientes;
    return pacientes.filter(
      (p) =>
        p.nombre_completo?.toLowerCase().includes(texto) ||
        String(p.documento_identidad ?? '').toLowerCase().includes(texto),
    );
  }, [busqueda, pacientes]);

  const alternar = (id) =>
    onCambiar(
      seleccionados.includes(id) ? seleccionados.filter((s) => s !== id) : [...seleccionados, id],
    );

  return (
    <fieldset>
      <legend className={claseEtiqueta}>
        Pacientes involucrados{' '}
        {seleccionados.length > 0 && (
          <span className="text-[#fbe9c0]">({seleccionados.length})</span>
        )}
      </legend>
      <input
        type="search"
        className={`${claseCampo} h-9`}
        placeholder="Buscar por nombre o documento"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        aria-label="Buscar paciente"
      />
      <ul
        className="mt-2 max-h-44 overflow-y-auto rounded-md border border-[#b07a3a]/40 bg-[#0f141d]"
        aria-invalid={Boolean(error)}
      >
        {filtrados.length === 0 ? (
          <li className="px-3 py-3 text-sm text-[#7d7560]">
            {pacientes.length === 0 ? 'No hay pacientes registrados.' : 'Ningún paciente coincide.'}
          </li>
        ) : (
          filtrados.map((p) => (
            <li key={p.id_paciente}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm text-[#fbe9c0] hover:bg-[#1b2333]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#e8a93c]"
                  checked={seleccionados.includes(p.id_paciente)}
                  onChange={() => alternar(p.id_paciente)}
                />
                <span className="min-w-0 flex-1 truncate">{p.nombre_completo}</span>
                <span className="shrink-0 text-xs text-[#8a7a60]">{String(p.estado_salud ?? '').replace(/_/g, ' ')}</span>
              </label>
            </li>
          ))
        )}
      </ul>
      <ErrorCampo>{error}</ErrorCampo>
    </fieldset>
  );
}

export default function EmergenciasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [emergencias, setEmergencias] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'error', texto, emergencia? }

  const cargarEmergencias = useCallback(async () => {
    try {
      const respuesta = await getEmergencies(ESTADOS_ABIERTOS);
      setEmergencias(respuesta?.emergencias ?? []);
      setErrorCarga('');
    } catch (error) {
      setErrorCarga(mensajeDeError(error, 'el servicio de emergencias'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    cargarEmergencias();
    getPatients()
      .then((r) => setPacientes(r?.pacientes ?? []))
      .catch(() => setPacientes([]));

    // Otra persona puede registrar o cerrar emergencias desde otro puesto
    const intervalo = setInterval(cargarEmergencias, REFRESCO_MS);
    return () => clearInterval(intervalo);
  }, [user, cargarEmergencias]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const cambiar = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: '' }));
    setAviso(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Las mismas reglas que la tabla emergencias, para que el error salga
    // junto al campo y no como un fallo genérico del servidor.
    const nuevos = {};
    if (!form.tipo) nuevos.tipo = 'Elige el tipo de emergencia.';
    if (!form.nivel_urgencia) nuevos.nivel_urgencia = 'Elige el nivel de urgencia.';
    if (form.pacientes.length === 0) nuevos.pacientes = 'Asocia al menos un paciente.';
    if (!form.sintomas.trim()) nuevos.sintomas = 'Describe los síntomas.';
    if (!form.diagnostico_inicial.trim()) nuevos.diagnostico_inicial = 'Escribe el diagnóstico inicial.';

    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setGuardando(true);
    setAviso(null);
    try {
      const respuesta = await createEmergency({
        tipo: form.tipo,
        nivel_urgencia: form.nivel_urgencia,
        pacientes: form.pacientes,
        sintomas: form.sintomas.trim(),
        lesiones: form.lesiones.trim() || null,
        diagnostico_inicial: form.diagnostico_inicial.trim(),
      });

      const creada = respuesta?.emergencia;
      setAviso({
        tipo: 'ok',
        texto: creada
          ? `Emergencia #${creada.id_emergencia} registrada.`
          : 'Emergencia registrada.',
        emergencia: creada ?? { tipo: form.tipo },
      });
      setForm(FORM_VACIO);
      await cargarEmergencias();
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error, 'el servicio de emergencias') });
    } finally {
      setGuardando(false);
    }
  };

  const abrirProtocolo = (emergencia) =>
    navigate(rutaProtocolo(emergencia.tipo, emergencia.id_emergencia));

  const ordenadas = ordenarPorUrgencia(emergencias);
  const criticas = emergencias.filter((e) => e.nivel_urgencia === 'CRITICA').length;

  return (
    <PaginaEnfermeria
      titulo="Emergencias médicas"
      extra={
        !cargando &&
        !errorCarga && (
          <p className="text-sm text-[#cbb391]" role="status">
            {emergencias.length === 0 ? (
              <span className="font-semibold text-[#7dffa0]">Sin emergencias abiertas</span>
            ) : (
              <span className="font-semibold text-[#ff8a7a]">
                {emergencias.length} abierta{emergencias.length === 1 ? '' : 's'}
                {criticas > 0 && ` · ${criticas} crítica${criticas === 1 ? '' : 's'}`}
              </span>
            )}
          </p>
        )
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* ── Registrar ── */}
        <Seccion id="titulo-registrar" titulo="Registrar emergencia">
          <form onSubmit={handleSubmit} noValidate className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="em-tipo" className={claseEtiqueta}>
                  Tipo
                </label>
                <select
                  id="em-tipo"
                  className={`${claseCampo} h-10`}
                  value={form.tipo}
                  onChange={(e) => cambiar('tipo', e.target.value)}
                  aria-invalid={Boolean(errores.tipo)}
                >
                  <option value="">Elige el tipo</option>
                  {TIPOS_EMERGENCIA.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ErrorCampo>{errores.tipo}</ErrorCampo>
              </div>

              <fieldset>
                <legend className={claseEtiqueta}>Urgencia</legend>
                <div className="grid grid-cols-4 gap-1" role="radiogroup">
                  {NIVELES.map((n) => {
                    const activo = form.nivel_urgencia === n.value;
                    return (
                      <button
                        key={n.value}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => cambiar('nivel_urgencia', n.value)}
                        className="h-10 rounded-md border text-[11px] font-bold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a]"
                        style={{
                          color: activo ? '#140b05' : n.color,
                          borderColor: `${n.color}99`,
                          background: activo ? n.color : `${n.color}12`,
                        }}
                      >
                        {n.label}
                      </button>
                    );
                  })}
                </div>
                <ErrorCampo>{errores.nivel_urgencia}</ErrorCampo>
              </fieldset>
            </div>

            <SelectorPacientes
              pacientes={pacientes}
              seleccionados={form.pacientes}
              onCambiar={(lista) => cambiar('pacientes', lista)}
              error={errores.pacientes}
            />

            <div>
              <label htmlFor="em-sintomas" className={claseEtiqueta}>
                Síntomas
              </label>
              <textarea
                id="em-sintomas"
                rows={2}
                className={`${claseCampo} py-2`}
                placeholder="Qué presenta el paciente"
                value={form.sintomas}
                onChange={(e) => cambiar('sintomas', e.target.value)}
                aria-invalid={Boolean(errores.sintomas)}
              />
              <ErrorCampo>{errores.sintomas}</ErrorCampo>
            </div>

            <div>
              <label htmlFor="em-lesiones" className={claseEtiqueta}>
                Lesiones (opcional)
              </label>
              <textarea
                id="em-lesiones"
                rows={2}
                className={`${claseCampo} py-2`}
                placeholder="Heridas, fracturas, quemaduras visibles…"
                value={form.lesiones}
                onChange={(e) => cambiar('lesiones', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="em-diagnostico" className={claseEtiqueta}>
                Diagnóstico inicial
              </label>
              <textarea
                id="em-diagnostico"
                rows={2}
                className={`${claseCampo} py-2`}
                placeholder="Primera valoración"
                value={form.diagnostico_inicial}
                onChange={(e) => cambiar('diagnostico_inicial', e.target.value)}
                aria-invalid={Boolean(errores.diagnostico_inicial)}
              />
              <ErrorCampo>{errores.diagnostico_inicial}</ErrorCampo>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={guardando} className={`${claseBotonPrimario} flex-1`}>
                {guardando ? 'Registrando…' : 'Registrar emergencia'}
              </button>
              {form.tipo && (
                <button
                  type="button"
                  className={claseBotonSecundario}
                  onClick={() => navigate(rutaProtocolo(form.tipo))}
                >
                  Ver protocolo
                </button>
              )}
            </div>

            {aviso && (
              <div
                className="rounded-md border px-3 py-2 text-sm font-semibold"
                style={{
                  color: aviso.tipo === 'ok' ? '#7dffa0' : '#ff8a7a',
                  borderColor: aviso.tipo === 'ok' ? '#7dffa055' : '#ff8a7a55',
                }}
                role={aviso.tipo === 'error' ? 'alert' : 'status'}
              >
                {aviso.texto}
                {aviso.tipo === 'ok' && aviso.emergencia && (
                  <button
                    type="button"
                    onClick={() => abrirProtocolo(aviso.emergencia)}
                    className="ml-2 font-bold text-[#ffd36a] underline underline-offset-4"
                  >
                    Abrir protocolo de {etiquetaTipo(aviso.emergencia.tipo).toLowerCase()} →
                  </button>
                )}
              </div>
            )}
          </form>
        </Seccion>

        {/* ── Abiertas ── */}
        <Seccion
          id="titulo-activas"
          titulo="Emergencias abiertas"
          accion={
            <button
              type="button"
              onClick={cargarEmergencias}
              className="text-xs font-bold uppercase tracking-wide text-[#a58a5a] hover:text-[#f2c48a]"
            >
              Actualizar
            </button>
          }
        >
          <div className="max-h-[42rem] overflow-y-auto">
            {errorCarga ? (
              <div className="p-4">
                <MensajeError>{errorCarga}</MensajeError>
              </div>
            ) : cargando ? (
              <p className="px-4 py-10 text-center text-sm text-[#a58a5a]" role="status">
                Cargando emergencias…
              </p>
            ) : ordenadas.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#a58a5a]">
                No hay emergencias activas ni en atención.
              </p>
            ) : (
              <ul>
                {ordenadas.map((e) => (
                  <TarjetaEmergencia key={e.id_emergencia} emergencia={e} onProtocolo={abrirProtocolo} />
                ))}
              </ul>
            )}
          </div>
        </Seccion>
      </div>
    </PaginaEnfermeria>
  );
}
