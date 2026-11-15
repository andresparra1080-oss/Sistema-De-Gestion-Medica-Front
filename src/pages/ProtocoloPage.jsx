// src/pages/ProtocoloPage.jsx
// KAN-50: modo emergencia. Muestra el protocolo de un tipo de emergencia paso
// a paso, en letra grande, para seguirlo mientras se atiende al paciente.
//
// Ruta: /emergencias/protocolo/:tipo  (opcional ?emergencia=<id>)
// Con ?emergencia la cabecera muestra a qué emergencia y pacientes se aplica.
//
// Los pasos marcados como hechos solo viven en esta pantalla: dejar constancia
// de lo que se hizo es "registrar acciones" (KAN-52), que va en el detalle de
// la emergencia.
import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEmergency, getProtocol } from '../services/api';
import {
  Insignia,
  MensajeError,
  PaginaEnfermeria,
  TIPOS_EMERGENCIA,
  claseBotonPrimario,
  claseBotonSecundario,
  etiquetaTipo,
  formatFechaHora,
  mensajeDeError,
  nivelDe,
} from '../components/PanelEnfermeria';

function CabeceraEmergencia({ emergencia }) {
  const nivel = nivelDe(emergencia.nivel_urgencia);
  const pacientes = emergencia.pacientes ?? [];

  return (
    <div
      className="mb-4 rounded-xl border bg-[#141a26]/90 px-4 py-3 backdrop-blur-sm"
      style={{ borderColor: `${nivel.color}99` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-[#f2c48a]">Emergencia #{emergencia.id_emergencia}</span>
        <Insignia color={nivel.color}>{nivel.label}</Insignia>
        <span className="text-xs text-[#8a7a60]">desde {formatFechaHora(emergencia.fecha_inicio)}</span>
      </div>
      <p className="mt-1 text-sm text-[#cbb391]">{emergencia.diagnostico_inicial}</p>
      {pacientes.length > 0 && (
        <p className="mt-1 text-xs text-[#a58a5a]">
          {pacientes.map((p) => p.nombre_completo ?? `Paciente ${p.id_paciente}`).join(', ')}
        </p>
      )}
    </div>
  );
}

export default function ProtocoloPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tipo } = useParams();
  const [searchParams] = useSearchParams();
  const idEmergencia = searchParams.get('emergencia');

  const [protocolo, setProtocolo] = useState(null);
  const [emergencia, setEmergencia] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [actual, setActual] = useState(0);
  const [hechos, setHechos] = useState(() => new Set());

  useEffect(() => {
    if (!user) return;
    let vigente = true;
    setCargando(true);
    setError('');
    setActual(0);
    setHechos(new Set());

    getProtocol(tipo)
      .then((respuesta) => {
        if (!vigente) return;
        const datos = respuesta?.protocolo ?? respuesta;
        const pasos = [...(datos?.pasos ?? [])].sort((a, b) => a.numero - b.numero);
        setProtocolo({ ...datos, pasos });
      })
      .catch((e) => vigente && setError(mensajeDeError(e, 'el servicio de protocolos')))
      .finally(() => vigente && setCargando(false));

    return () => {
      vigente = false;
    };
  }, [user, tipo]);

  useEffect(() => {
    if (!user || !idEmergencia) return;
    getEmergency(idEmergencia)
      .then((r) => setEmergencia(r?.emergencia ?? null))
      .catch(() => setEmergencia(null)); // la cabecera es un extra; el protocolo sirve igual
  }, [user, idEmergencia]);

  const pasos = protocolo?.pasos ?? [];
  const total = pasos.length;

  const ir = useCallback(
    (indice) => setActual(Math.max(0, Math.min(total - 1, indice))),
    [total],
  );

  const marcarYSeguir = () => {
    setHechos((prev) => new Set(prev).add(actual));
    if (actual < total - 1) ir(actual + 1);
  };

  const alternarHecho = (indice) =>
    setHechos((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(indice)) nuevo.delete(indice);
      else nuevo.add(indice);
      return nuevo;
    });

  // Flechas del teclado para avanzar sin buscar el botón
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') ir(actual + 1);
      if (e.key === 'ArrowLeft') ir(actual - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actual, ir]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const paso = pasos[actual];
  const completados = hechos.size;
  const terminado = total > 0 && completados === total;

  const cambiarTipo = (nuevo) =>
    navigate(`/emergencias/protocolo/${nuevo}${idEmergencia ? `?emergencia=${idEmergencia}` : ''}`);

  return (
    <PaginaEnfermeria titulo="Modo emergencia" volverA="/emergencias">
      {emergencia && <CabeceraEmergencia emergencia={emergencia} />}

      {/* Cambiar de protocolo: el diagnóstico puede cambiar durante la atención */}
      <nav aria-label="Tipo de emergencia" className="mb-4 flex flex-wrap gap-2">
        {TIPOS_EMERGENCIA.map((t) => {
          const activo = t.value === tipo;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => cambiarTipo(t.value)}
              aria-current={activo ? 'page' : undefined}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a] ${
                activo
                  ? 'border-[#ffd36a] bg-[#e8a93c] text-[#2a1507]'
                  : 'border-[#b07a3a]/60 bg-[#1b1208]/80 text-[#f2c48a] hover:bg-[#2d1b0e]'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {error ? (
        <MensajeError>{error}</MensajeError>
      ) : cargando ? (
        <p className="py-16 text-center text-sm text-[#a58a5a]" role="status">
          Cargando protocolo…
        </p>
      ) : total === 0 ? (
        <p className="py-16 text-center text-sm text-[#a58a5a]">
          El protocolo de {etiquetaTipo(tipo).toLowerCase()} no tiene pasos registrados.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          {/* ── Paso actual ── */}
          <section
            aria-live="polite"
            className="flex flex-col rounded-xl border border-[#b07a3a]/60 bg-[#141a26]/90 p-5 shadow-[0_0_2em_rgba(0,0,0,0.6)] backdrop-blur-sm sm:p-7"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e0b060]">
              {protocolo.nombre}
            </p>

            <div className="mt-3 flex items-center gap-3">
              <div
                className="h-2 flex-1 overflow-hidden rounded-full bg-[#0d1119]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={completados}
                aria-label="Pasos completados"
              >
                <div
                  className="h-full bg-[#7dffa0] transition-[width] duration-300"
                  style={{ width: `${(completados / total) * 100}%` }}
                />
              </div>
              <span className="tabular-nums text-xs text-[#a58a5a]">
                {completados}/{total}
              </span>
            </div>

            <p className="mt-6 text-sm font-bold uppercase tracking-wider text-[#a58a5a]">
              Paso {paso.numero} de {total}
              {hechos.has(actual) && <span className="ml-2 text-[#7dffa0]">✓ hecho</span>}
            </p>
            <p className="mt-2 min-h-[6rem] text-2xl font-semibold leading-snug text-[#fbe9c0] sm:text-3xl">
              {paso.descripcion}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className={claseBotonSecundario}
                onClick={() => ir(actual - 1)}
                disabled={actual === 0}
              >
                ← Anterior
              </button>
              <button type="button" className={`${claseBotonPrimario} flex-1`} onClick={marcarYSeguir}>
                {actual < total - 1 ? 'Hecho, siguiente paso →' : 'Hecho'}
              </button>
              <button
                type="button"
                className={claseBotonSecundario}
                onClick={() => ir(actual + 1)}
                disabled={actual === total - 1}
              >
                Saltar →
              </button>
            </div>

            {terminado && (
              <p className="mt-4 rounded-md border border-[#7dffa0]/40 px-3 py-2 text-sm font-semibold text-[#7dffa0]" role="status">
                Protocolo completo. Registra en la emergencia las acciones realizadas.
              </p>
            )}
          </section>

          {/* ── Todos los pasos ── */}
          <section className="rounded-xl border border-[#b07a3a]/60 bg-[#141a26]/90 shadow-[0_0_2em_rgba(0,0,0,0.6)] backdrop-blur-sm">
            <h2 className="border-b border-[#b07a3a]/40 px-4 py-3 text-sm font-bold uppercase tracking-wider text-[#e0b060]">
              Todos los pasos
            </h2>
            <ol>
              {pasos.map((p, indice) => {
                const hecho = hechos.has(indice);
                const esActual = indice === actual;
                return (
                  <li
                    key={p.id_paso ?? p.numero}
                    className={`flex items-start gap-3 border-b border-[#b07a3a]/20 px-4 py-3 last:border-b-0 ${
                      esActual ? 'bg-[#e8a93c]/10' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#7dffa0]"
                      checked={hecho}
                      onChange={() => alternarHecho(indice)}
                      aria-label={`Paso ${p.numero} hecho`}
                    />
                    <button
                      type="button"
                      onClick={() => ir(indice)}
                      className={`text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a] ${
                        hecho ? 'text-[#8a7a60] line-through' : esActual ? 'text-[#fbe9c0]' : 'text-[#cbb391]'
                      }`}
                    >
                      <span className="mr-1 font-bold tabular-nums text-[#e0b060]">{p.numero}.</span>
                      {p.descripcion}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      )}
    </PaginaEnfermeria>
  );
}
