// src/components/HistorialAuditoria.jsx
// Historial de auditoría (KAN-54, RF-05, RF-23 y RNF-04): quién cambió qué y cuándo.
// Se usa en el detalle del paciente (historia clínica) y puede usarse en el de la emergencia.
//
// Cada registro es una fila de logs_auditoria:
//   { id_log, id_usuario, nombre_usuario, accion, tabla_afectada, id_registro,
//     detalle_cambio, fecha_modificacion }
// La acción y el tipo de registro se distinguen con texto, no solo con color (RNF-15).
import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, History, Loader2, RefreshCw } from 'lucide-react';

const VISIBLES = 6; // cuántos se ven antes de pulsar "Ver todo"

const ACCIONES = {
  INSERT: { texto: 'Registro', color: '#4dff88' },
  UPDATE: { texto: 'Cambio', color: '#4aa8ff' },
  DELETE: { texto: 'Eliminación', color: '#ff6b5b' },
};

// Qué registro tocó el cambio (tabla_afectada)
const TABLAS = {
  pacientes: 'Paciente',
  historias_clinicas: 'Historia clínica',
  alergias: 'Alergia',
  eventos_medicos: 'Evento médico',
  controles_evolucion: 'Control de evolución',
  tratamientos: 'Tratamiento',
  emergencias: 'Emergencia',
  emergencia_paciente: 'Paciente de la emergencia',
  acciones_emergencia: 'Acción de atención',
};

function formatFechaHora(valor) {
  if (!valor) return '';
  const fecha = new Date(String(valor).replace(' ', 'T')); // llegan en hora de Colombia, sin zona
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function HistorialAuditoria({
  titulo = 'Historial de auditoría',
  registros = [],
  cargando = false,
  error = '',
  onActualizar,
  vacio = 'Todavía no hay cambios registrados.',
}) {
  const [verTodo, setVerTodo] = useState(false);

  // Lo más reciente primero
  const ordenados = useMemo(
    () =>
      [...registros].sort(
        (a, b) =>
          String(b.fecha_modificacion ?? '').localeCompare(String(a.fecha_modificacion ?? '')) ||
          (Number(b.id_log) || 0) - (Number(a.id_log) || 0),
      ),
    [registros],
  );

  const visibles = verTodo ? ordenados : ordenados.slice(0, VISIBLES);
  const hayMas = ordenados.length > VISIBLES;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#e0b060]">
        <History className="h-4 w-4" aria-hidden="true" />
        {titulo}
        {ordenados.length > 0 && <span className="text-[#a58a5a]">({ordenados.length})</span>}
        <span className="h-px flex-1 bg-gradient-to-r from-[#c8933e]/70 to-transparent" />
        {onActualizar && (
          <button
            type="button"
            onClick={onActualizar}
            disabled={cargando}
            aria-label="Actualizar el historial de auditoría"
            title="Actualizar"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#c8933e]/60 text-[#f3c97a] transition hover:bg-[#523818] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a] disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        )}
      </h2>

      {error && (
        <p
          role="alert"
          className="flex items-center justify-center gap-2 rounded-lg border border-red-400/60 bg-red-500/10 px-3 py-2 text-center text-sm font-semibold text-red-300"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {cargando && ordenados.length === 0 && !error && (
        <p className="flex items-center gap-2 text-sm text-[#a58a5a]" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando historial…
        </p>
      )}

      {!cargando && !error && ordenados.length === 0 && (
        <p className="text-sm text-[#a58a5a]">{vacio}</p>
      )}

      {visibles.length > 0 && (
        <ol
          className="space-y-4 border-l border-[#c8933e]/40 pl-4"
          aria-label="Cambios registrados, del más reciente al más antiguo"
        >
          {visibles.map((r, i) => {
            const accion = ACCIONES[r.accion] ?? { texto: r.accion, color: '#cdb68a' };
            return (
              <li key={r.id_log ?? i} className="relative">
                <span
                  className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full"
                  style={{ background: accion.color }}
                  aria-hidden="true"
                />
                <p className="text-xs text-[#a58a5a]">
                  {formatFechaHora(r.fecha_modificacion)} · {r.nombre_usuario ?? `Usuario ${r.id_usuario}`}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: accion.color, borderColor: accion.color }}
                  >
                    {accion.texto}
                  </span>
                  <span className="rounded-full border border-[#b07a3a]/40 bg-black/30 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#cdb68a]">
                    {TABLAS[r.tabla_afectada] ?? r.tabla_afectada}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-[#fbe9c0]">
                  {r.detalle_cambio || `${TABLAS[r.tabla_afectada] ?? r.tabla_afectada}${r.id_registro ? ` #${r.id_registro}` : ''}`}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {hayMas && (
        <button
          type="button"
          onClick={() => setVerTodo((v) => !v)}
          aria-expanded={verTodo}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#b07a3a]/60 bg-[#141a26] px-4 text-sm font-semibold uppercase tracking-wide text-[#e9c7a0] transition hover:bg-[#1c2536] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]"
        >
          {verTodo ? (
            <>
              <ChevronUp className="h-4 w-4" aria-hidden="true" /> Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" aria-hidden="true" /> Ver todo ({ordenados.length})
            </>
          )}
        </button>
      )}
    </section>
  );
}