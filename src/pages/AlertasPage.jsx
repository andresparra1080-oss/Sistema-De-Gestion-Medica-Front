// src/pages/AlertasPage.jsx
// KAN-58: panel de alertas del inventario y de los tratamientos.
//
// Muestra las alertas sin resolver, de la más grave a la menos grave, y deja
// marcarlas como leídas (columna `notificada` de la tabla alertas). Resolver
// una alerta (reponer stock, dar de baja un lote) se hace en el inventario;
// las de tipo EMERGENCIA llevan a la pantalla de emergencias.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAlerts, markAlertRead, markAllAlertsRead } from '../services/api';
import {
  Insignia,
  MensajeError,
  PaginaEnfermeria,
  Seccion,
  claseBotonSecundario,
  formatFechaHora,
  mensajeDeError,
  nivelDe,
} from '../components/PanelEnfermeria';

const REFRESCO_MS = 30000;

const TIPOS_ALERTA = {
  STOCK_BAJO: { label: 'Stock bajo', destino: '/inventario' },
  VENCIMIENTO_PROXIMO: { label: 'Vencimiento próximo', destino: '/inventario' },
  DOSIS_PENDIENTE: { label: 'Dosis pendiente', destino: null },
  // La crea el back al registrar una emergencia (POST /api/emergencias)
  EMERGENCIA: { label: 'Emergencia', destino: '/emergencias', textoDestino: 'Emergencias' },
};

const FILTROS = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'STOCK_BAJO', label: 'Stock bajo' },
  { value: 'VENCIMIENTO_PROXIMO', label: 'Vencimiento' },
  { value: 'DOSIS_PENDIENTE', label: 'Dosis' },
  { value: 'EMERGENCIA', label: 'Emergencias' },
];

const esLeida = (alerta) => Number(alerta.notificada) === 1;

function ordenar(lista) {
  return [...lista].sort((a, b) => {
    // No leídas primero, luego prioridad, luego la más reciente
    if (esLeida(a) !== esLeida(b)) return esLeida(a) ? 1 : -1;
    const porNivel = nivelDe(a.prioridad).orden - nivelDe(b.prioridad).orden;
    if (porNivel !== 0) return porNivel;
    return String(b.fecha_generacion).localeCompare(String(a.fecha_generacion));
  });
}

function Alerta({ alerta, onLeer, marcando, onIr }) {
  const nivel = nivelDe(alerta.prioridad);
  const tipo = TIPOS_ALERTA[alerta.tipo_alerta] ?? { label: alerta.tipo_alerta };
  const leida = esLeida(alerta);
  const referencia = [alerta.nombre_medicamento, alerta.num_lote].filter(Boolean).join(' · ');

  return (
    <li
      className={`flex flex-wrap items-start gap-3 border-b border-[#b07a3a]/25 py-3 pl-3 pr-4 last:border-b-0 ${
        leida ? 'opacity-60' : ''
      }`}
      style={{ borderLeft: `4px solid ${leida ? '#3a3328' : nivel.color}` }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {!leida && (
            <span className="h-2 w-2 rounded-full bg-[#ffd36a]" aria-label="No leída" title="No leída" />
          )}
          <Insignia color={nivel.color}>{nivel.label}</Insignia>
          <span className="text-xs font-semibold uppercase tracking-wide text-[#e0b060]">
            {tipo.label}
          </span>
          <span className="ml-auto tabular-nums text-xs text-[#8a7a60]">
            {formatFechaHora(alerta.fecha_generacion)}
          </span>
        </div>
        <p className={`mt-1 text-sm ${leida ? 'text-[#a58a5a]' : 'text-[#fbe9c0]'}`}>{alerta.mensaje}</p>
        {referencia && <p className="mt-0.5 font-mono text-xs text-[#a58a5a]">{referencia}</p>}
      </div>

      <div className="flex shrink-0 gap-3 self-center">
        {tipo.destino && (
          <button
            type="button"
            onClick={() => onIr(tipo.destino)}
            className="text-xs font-bold uppercase tracking-wide text-[#a58a5a] underline underline-offset-4 hover:text-[#f2c48a]"
          >
            {tipo.textoDestino ?? 'Inventario'}
          </button>
        )}
        {!leida && (
          <button
            type="button"
            onClick={() => onLeer(alerta.id_alerta)}
            disabled={marcando}
            className="text-xs font-bold uppercase tracking-wide text-[#ffd36a] underline underline-offset-4 hover:text-[#ffe9a8] disabled:opacity-50"
          >
            {marcando ? 'Marcando…' : 'Marcar leída'}
          </button>
        )}
      </div>
    </li>
  );
}

export default function AlertasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [errorAccion, setErrorAccion] = useState('');
  const [filtro, setFiltro] = useState('TODAS');
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [marcando, setMarcando] = useState(() => new Set());
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const respuesta = await getAlerts();
      setAlertas(respuesta?.alertas ?? []);
      setErrorCarga('');
    } catch (error) {
      setErrorCarga(mensajeDeError(error, 'el servicio de alertas'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    cargar();
    const intervalo = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(intervalo);
  }, [user, cargar]);

  const visibles = useMemo(
    () =>
      ordenar(
        alertas.filter(
          (a) => (filtro === 'TODAS' || a.tipo_alerta === filtro) && (!soloNoLeidas || !esLeida(a)),
        ),
      ),
    [alertas, filtro, soloNoLeidas],
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const noLeidas = alertas.filter((a) => !esLeida(a)).length;
  const criticasNoLeidas = alertas.filter((a) => !esLeida(a) && a.prioridad === 'CRITICA').length;
  const cuenta = (tipo) =>
    alertas.filter((a) => !esLeida(a) && (tipo === 'TODAS' || a.tipo_alerta === tipo)).length;

  // Se marca en pantalla al momento y se deshace si el servidor falla
  const leer = async (id) => {
    setErrorAccion('');
    setMarcando((prev) => new Set(prev).add(id));
    setAlertas((prev) => prev.map((a) => (a.id_alerta === id ? { ...a, notificada: 1 } : a)));
    try {
      await markAlertRead(id);
    } catch (error) {
      setAlertas((prev) => prev.map((a) => (a.id_alerta === id ? { ...a, notificada: 0 } : a)));
      setErrorAccion(mensajeDeError(error, 'el servicio de alertas'));
    } finally {
      setMarcando((prev) => {
        const nuevo = new Set(prev);
        nuevo.delete(id);
        return nuevo;
      });
    }
  };

  const leerTodas = async () => {
    setErrorAccion('');
    setMarcandoTodas(true);
    try {
      await markAllAlertsRead();
      await cargar();
    } catch (error) {
      setErrorAccion(mensajeDeError(error, 'el servicio de alertas'));
    } finally {
      setMarcandoTodas(false);
    }
  };

  return (
    <PaginaEnfermeria
      titulo="Alertas"
      extra={
        !cargando &&
        !errorCarga && (
          <p className="text-sm text-[#cbb391]" role="status">
            {noLeidas === 0 ? (
              <span className="font-semibold text-[#7dffa0]">Todo leído</span>
            ) : (
              <span className="font-semibold text-[#ffd36a]">
                {noLeidas} sin leer
                {criticasNoLeidas > 0 && (
                  <span className="text-[#ff8a7a]">
                    {' '}
                    · {criticasNoLeidas} crítica{criticasNoLeidas === 1 ? '' : 's'}
                  </span>
                )}
              </span>
            )}
          </p>
        )
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => {
          const activo = filtro === f.value;
          const n = cuenta(f.value);
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltro(f.value)}
              aria-pressed={activo}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a] ${
                activo
                  ? 'border-[#ffd36a] bg-[#e8a93c] text-[#2a1507]'
                  : 'border-[#b07a3a]/60 bg-[#1b1208]/80 text-[#f2c48a] hover:bg-[#2d1b0e]'
              }`}
            >
              {f.label}
              {n > 0 && <span className="ml-1.5 tabular-nums">{n}</span>}
            </button>
          );
        })}

        <label className="ml-1 flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#cbb391]">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#e8a93c]"
            checked={soloNoLeidas}
            onChange={(e) => setSoloNoLeidas(e.target.checked)}
          />
          Solo sin leer
        </label>

        <button
          type="button"
          className={`${claseBotonSecundario} ml-auto`}
          onClick={leerTodas}
          disabled={noLeidas === 0 || marcandoTodas}
        >
          {marcandoTodas ? 'Marcando…' : 'Marcar todas leídas'}
        </button>
      </div>

      {errorAccion && (
        <div className="mb-4">
          <MensajeError>{errorAccion}</MensajeError>
        </div>
      )}

      <Seccion id="titulo-alertas" titulo="Alertas sin resolver">
        {errorCarga ? (
          <div className="p-4">
            <MensajeError>{errorCarga}</MensajeError>
          </div>
        ) : cargando ? (
          <p className="px-4 py-10 text-center text-sm text-[#a58a5a]" role="status">
            Cargando alertas…
          </p>
        ) : visibles.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[#a58a5a]">
            {alertas.length === 0
              ? 'No hay alertas pendientes.'
              : 'Ninguna alerta coincide con el filtro.'}
          </p>
        ) : (
          <ul>
            {visibles.map((a) => (
              <Alerta
                key={a.id_alerta}
                alerta={a}
                marcando={marcando.has(a.id_alerta)}
                onLeer={leer}
                onIr={navigate}
              />
            ))}
          </ul>
        )}
      </Seccion>
    </PaginaEnfermeria>
  );
}
