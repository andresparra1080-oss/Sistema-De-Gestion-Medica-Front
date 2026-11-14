// src/pages/LotesPage.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createLote, createMovement, getInventory, getLotes } from '../services/api';
import fondo from '../images/inicio.jpg';

const DIAS_VENCIMIENTO_PROXIMO = 30;

const FORM_LOTE_VACIO = {
  id_medicamento: '',
  num_lote: '',
  ubicacion: '',
  fecha_vencimiento: '',
  cantidad_inicial: '',
  motivo: '',
};

const FORM_ENTRADA_VACIO = {
  id_lote: '',
  cantidad: '',
  motivo: '',
};

const numero = (valor) => Number(valor ?? 0).toLocaleString('es-CO');

function diasHasta(fechaIso) {
  if (!fechaIso) return null;
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  if (!anio || !mes || !dia) return null;

  const objetivo = Date.UTC(anio, mes - 1, dia);
  const hoy = new Date();
  const hoyUtc = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((objetivo - hoyUtc) / 86400000);
}

function estadoVencimiento(fechaIso) {
  const dias = diasHasta(fechaIso);
  if (dias === null) return { texto: 'Sin fecha', color: '#8a7a60', critico: false };
  if (dias < 0) return { texto: `Vencido (hace ${Math.abs(dias)} d)`, color: '#ff6b5b', critico: true };
  if (dias === 0) return { texto: 'Vence hoy', color: '#ff6b5b', critico: true };
  if (dias <= DIAS_VENCIMIENTO_PROXIMO) {
    return { texto: `Próximo (${dias} días)`, color: '#ffa733', critico: true };
  }
  return { texto: `Vigente (${dias} días)`, color: '#7dffa0', critico: false };
}

const claseCampo =
  'h-10 w-full rounded-md border border-[#b07a3a]/50 bg-[#0f141d] px-3 text-sm text-[#fbe9c0] ' +
  'placeholder-[#7d7560] outline-none [color-scheme:dark] focus:ring-2 focus:ring-[#ffd36a]';
const claseEtiqueta = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[#e0b060]';

export default function LotesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [medicamentos, setMedicamentos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [fuenteRespaldo, setFuenteRespaldo] = useState(false);

  // Filtros de la tabla
  const [filtroMedicamento, setFiltroMedicamento] = useState('');
  const [soloPorVencer, setSoloPorVencer] = useState(false);

  // Formulario: Nuevo Lote
  const [formLote, setFormLote] = useState(FORM_LOTE_VACIO);
  const [erroresLote, setErroresLote] = useState({});
  const [guardandoLote, setGuardandoLote] = useState(false);
  const [avisoLote, setAvisoLote] = useState(null);

  // Formulario: Registrar Entrada a Lote Existente
  const [formEntrada, setFormEntrada] = useState(FORM_ENTRADA_VACIO);
  const [erroresEntrada, setErroresEntrada] = useState({});
  const [guardandoEntrada, setGuardandoEntrada] = useState(false);
  const [avisoEntrada, setAvisoEntrada] = useState(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const inv = await getInventory();
      const listaMeds = inv?.items ?? [];
      setMedicamentos(listaMeds);

      // Intentamos GET /api/lotes (KAN-23); si aún no está integrado en el back,
      // extraemos los lotes desde el inventario para no bloquear la pantalla.
      try {
        const resLotes = await getLotes();
        const lista = Array.isArray(resLotes) ? resLotes : resLotes?.lotes ?? [];
        setLotes(lista);
        setFuenteRespaldo(false);
      } catch {
        const lotesExtraidos = listaMeds.flatMap((med) =>
          (med.lotes ?? []).map((l) => ({
            ...l,
            id_medicamento: med.id_medicamento,
            nombre_medicamento: med.nombre,
            unidad_medida: med.unidad_medida,
          })),
        );
        setLotes(lotesExtraidos);
        setFuenteRespaldo(true);
      }

      setErrorCarga('');
    } catch (error) {
      setErrorCarga(error.message || 'No se pudieron cargar los lotes e insumos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const lotesFiltrados = useMemo(() => {
    return lotes.filter((lote) => {
      if (filtroMedicamento && String(lote.id_medicamento) !== String(filtroMedicamento)) {
        return false;
      }
      if (soloPorVencer) {
        const dias = diasHasta(lote.fecha_vencimiento);
        if (dias === null || dias > DIAS_VENCIMIENTO_PROXIMO) return false;
      }
      return true;
    });
  }, [lotes, filtroMedicamento, soloPorVencer]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // --- Handlers Formulario 1: Crear Lote ---
  const handleChangeLote = (e) => {
    const { name } = e.target;
    let { value } = e.target;
    if (name === 'cantidad_inicial') value = value.replace(/\D/g, '').slice(0, 9);
    if (name === 'num_lote') value = value.toUpperCase();

    setFormLote((prev) => ({ ...prev, [name]: value }));
    setErroresLote((prev) => ({ ...prev, [name]: '' }));
    setAvisoLote(null);
  };

  const handleSubmitLote = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!formLote.id_medicamento) errs.id_medicamento = 'Selecciona un medicamento o insumo.';
    if (!formLote.num_lote.trim()) errs.num_lote = 'Ingresa el código del lote (ej. IBU-2610).';
    if (!formLote.ubicacion.trim()) errs.ubicacion = 'Indica la ubicación física.';
    if (!formLote.fecha_vencimiento) errs.fecha_vencimiento = 'Selecciona la fecha de vencimiento.';
    if (formLote.cantidad_inicial && Number(formLote.cantidad_inicial) <= 0) {
      errs.cantidad_inicial = 'La cantidad inicial debe ser mayor a 0.';
    }

    setErroresLote(errs);
    if (Object.keys(errs).length > 0) return;

    setGuardandoLote(true);
    setAvisoLote(null);
    try {
      const payload = {
        id_medicamento: Number(formLote.id_medicamento),
        num_lote: formLote.num_lote.trim(),
        ubicacion: formLote.ubicacion.trim(),
        fecha_vencimiento: formLote.fecha_vencimiento,
      };
      if (formLote.cantidad_inicial) {
        payload.cantidad_inicial = Number(formLote.cantidad_inicial);
      }
      if (formLote.motivo.trim()) {
        payload.motivo = formLote.motivo.trim();
      }

      const res = await createLote(payload);
      const idNuevoLote = res?.lote?.id_lote ?? res?.id_lote;

      // Si el backend creó el lote en 0 (regla REV #6 de la BD) pero el usuario indicó
      // una cantidad inicial, registramos automáticamente el movimiento ENTRADA.
      if (
        formLote.cantidad_inicial &&
        Number(formLote.cantidad_inicial) > 0 &&
        idNuevoLote &&
        Number(res?.lote?.cantidad ?? 0) === 0
      ) {
        await createMovement({
          id_lote: Number(idNuevoLote),
          tipo_movimiento: 'ENTRADA',
          cantidad: Number(formLote.cantidad_inicial),
          motivo: formLote.motivo.trim() || `Entrada inicial del lote ${payload.num_lote}`,
        });
      }

      setAvisoLote({
        tipo: 'ok',
        texto: `Lote ${payload.num_lote} registrado correctamente.`,
      });
      setFormLote(FORM_LOTE_VACIO);
      await cargarDatos();
    } catch (error) {
      setAvisoLote({
        tipo: 'error',
        texto: error.message || 'No se pudo registrar el lote.',
      });
    } finally {
      setGuardandoLote(false);
    }
  };

  // --- Handlers Formulario 2: Entrada de Stock ---
  const handleChangeEntrada = (e) => {
    const { name } = e.target;
    let { value } = e.target;
    if (name === 'cantidad') value = value.replace(/\D/g, '').slice(0, 9);

    setFormEntrada((prev) => ({ ...prev, [name]: value }));
    setErroresEntrada((prev) => ({ ...prev, [name]: '' }));
    setAvisoEntrada(null);
  };

  const handleSubmitEntrada = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!formEntrada.id_lote) errs.id_lote = 'Selecciona el lote que recibe unidades.';
    if (!formEntrada.cantidad || Number(formEntrada.cantidad) <= 0) {
      errs.cantidad = 'Ingresa una cantidad mayor a cero.';
    }
    if (formEntrada.motivo.length > 300) errs.motivo = 'Máximo 300 caracteres.';

    setErroresEntrada(errs);
    if (Object.keys(errs).length > 0) return;

    setGuardandoEntrada(true);
    setAvisoEntrada(null);
    try {
      const res = await createMovement({
        id_lote: Number(formEntrada.id_lote),
        tipo_movimiento: 'ENTRADA',
        cantidad: Number(formEntrada.cantidad),
        motivo: formEntrada.motivo.trim() || 'Entrada de abastecimiento',
      });

      const stock = res?.stock;
      setAvisoEntrada({
        tipo: 'ok',
        texto: stock
          ? `Entrada registrada. ${stock.nombre_medicamento}: ${numero(stock.cantidad_total_disponible)} en total.`
          : 'Entrada de inventario registrada con éxito.',
      });
      setFormEntrada(FORM_ENTRADA_VACIO);
      await cargarDatos();
    } catch (error) {
      setAvisoEntrada({
        tipo: 'error',
        texto: error.message || 'No se pudo registrar la entrada.',
      });
    } finally {
      setGuardandoEntrada(false);
    }
  };

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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/inventario')}
              className="rounded-lg border border-[#b07a3a]/70 bg-[#1b1208]/80 px-3 py-2 text-sm font-bold uppercase tracking-wide text-[#f2c48a] transition hover:bg-[#2d1b0e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]"
            >
              <span aria-hidden="true">←</span> Volver al Pañol
            </button>
            <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-[#f2c48a] sm:text-2xl">
              Lotes y Entradas de Inventario
            </h1>
          </div>

          <p className="text-sm text-[#cbb391]">
            Total de lotes registrados:{' '}
            <span className="font-bold text-[#fbe9c0]">{lotes.length}</span>
          </p>
        </header>

        {fuenteRespaldo && (
          <p className="mb-4 rounded-lg border border-amber-400/40 bg-[#261b0d]/90 px-4 py-2 text-xs text-[#ffd978]">
            Mostrando lotes desde el catálogo de inventario (esperando integración de GET /api/lotes).
          </p>
        )}

        {errorCarga && (
          <p
            className="mb-4 rounded-lg border border-red-400/50 bg-[#2a1115]/90 px-4 py-3 text-sm font-semibold text-red-300"
            role="alert"
          >
            {errorCarga}
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          {/* ── Columna Izquierda: Tabla de Lotes ── */}
          <section
            aria-labelledby="titulo-tabla-lotes"
            className="rounded-xl border border-[#b07a3a]/60 bg-[#141a26]/90 shadow-[0_0_2em_rgba(0,0,0,0.6)] backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#b07a3a]/40 px-4 py-3">
              <h2
                id="titulo-tabla-lotes"
                className="text-sm font-bold uppercase tracking-wider text-[#e0b060]"
              >
                Lotes registrados
              </h2>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  aria-label="Filtrar por medicamento"
                  value={filtroMedicamento}
                  onChange={(e) => setFiltroMedicamento(e.target.value)}
                  className="h-8 rounded border border-[#b07a3a]/50 bg-[#0f141d] px-2 text-xs text-[#fbe9c0] outline-none focus:ring-2 focus:ring-[#ffd36a]"
                >
                  <option value="">Todos los insumos</option>
                  {medicamentos.map((m) => (
                    <option key={m.id_medicamento} value={m.id_medicamento}>
                      {m.nombre}
                    </option>
                  ))}
                </select>

                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[#cbb391]">
                  <input
                    type="checkbox"
                    checked={soloPorVencer}
                    onChange={(e) => setSoloPorVencer(e.target.checked)}
                    className="accent-[#e8a93c]"
                  />
                  Vencen ≤ {DIAS_VENCIMIENTO_PROXIMO} días
                </label>
              </div>
            </div>

            {cargando ? (
              <p className="px-4 py-10 text-center text-sm text-[#a58a5a]" role="status">
                Cargando lotes…
              </p>
            ) : lotesFiltrados.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#a58a5a]">
                No hay lotes que coincidan con el filtro seleccionado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#b07a3a]/30 text-xs uppercase tracking-wider text-[#a58a5a]">
                      <th className="px-4 py-3">Lote</th>
                      <th className="px-4 py-3">Medicamento / Insumo</th>
                      <th className="px-4 py-3 text-right">Stock</th>
                      <th className="px-4 py-3">Ubicación</th>
                      <th className="px-4 py-3">Vencimiento</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#b07a3a]/20">
                    {lotesFiltrados.map((lote) => {
                      const estado = estadoVencimiento(lote.fecha_vencimiento);
                      const medInfo = medicamentos.find(
                        (m) => Number(m.id_medicamento) === Number(lote.id_medicamento),
                      );
                      const nombreMed = lote.nombre_medicamento || medInfo?.nombre || `Insumo #${lote.id_medicamento}`;
                      const unidad = lote.unidad_medida || medInfo?.unidad_medida || '';

                      return (
                        <tr key={lote.id_lote} className="transition hover:bg-[#1c2434]/60">
                          <td className="px-4 py-3 font-mono font-semibold text-[#e0b060]">
                            {lote.num_lote}
                          </td>
                          <td className="px-4 py-3 font-medium text-[#f2c48a]">{nombreMed}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-[#fbe9c0]">
                            <span className="font-bold">{numero(lote.cantidad)}</span>{' '}
                            <span className="text-xs text-[#8a7a60]">{unidad}</span>
                          </td>
                          <td className="px-4 py-3 text-[#b9a383]">{lote.ubicacion}</td>
                          <td className="px-4 py-3 tabular-nums text-[#cbb391]">
                            {lote.fecha_vencimiento}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
                              style={{
                                color: estado.color,
                                backgroundColor: `${estado.color}1a`,
                                border: `1px solid ${estado.color}44`,
                              }}
                            >
                              {estado.texto}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Columna Derecha: Formularios ── */}
          <div className="space-y-5">
            {/* Formulario 1: Crear Nuevo Lote */}
            <section
              aria-labelledby="titulo-nuevo-lote"
              className="rounded-xl border border-[#b07a3a]/60 bg-[#141a26]/90 shadow-[0_0_2em_rgba(0,0,0,0.6)] backdrop-blur-sm"
            >
              <h2
                id="titulo-nuevo-lote"
                className="border-b border-[#b07a3a]/40 px-4 py-3 text-sm font-bold uppercase tracking-wider text-[#e0b060]"
              >
                Registrar nuevo lote
              </h2>

              <form onSubmit={handleSubmitLote} noValidate className="space-y-3 p-4">
                <div>
                  <label htmlFor="lote-medicamento" className={claseEtiqueta}>
                    Medicamento o Insumo
                  </label>
                  <select
                    id="lote-medicamento"
                    name="id_medicamento"
                    className={claseCampo}
                    value={formLote.id_medicamento}
                    onChange={handleChangeLote}
                    aria-invalid={Boolean(erroresLote.id_medicamento)}
                  >
                    <option value="">Selecciona el insumo</option>
                    {medicamentos.map((m) => (
                      <option key={m.id_medicamento} value={m.id_medicamento}>
                        {m.nombre} ({m.unidad_medida})
                      </option>
                    ))}
                  </select>
                  {erroresLote.id_medicamento && (
                    <p className="mt-1 text-xs font-semibold text-red-300">
                      {erroresLote.id_medicamento}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="lote-codigo" className={claseEtiqueta}>
                      Número de lote
                    </label>
                    <input
                      id="lote-codigo"
                      name="num_lote"
                      className={claseCampo}
                      placeholder="Ej. IBU-2611"
                      value={formLote.num_lote}
                      onChange={handleChangeLote}
                      aria-invalid={Boolean(erroresLote.num_lote)}
                    />
                    {erroresLote.num_lote && (
                      <p className="mt-1 text-xs font-semibold text-red-300">
                        {erroresLote.num_lote}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lote-vencimiento" className={claseEtiqueta}>
                      Fecha vencimiento
                    </label>
                    <input
                      id="lote-vencimiento"
                      name="fecha_vencimiento"
                      type="date"
                      className={claseCampo}
                      value={formLote.fecha_vencimiento}
                      onChange={handleChangeLote}
                      aria-invalid={Boolean(erroresLote.fecha_vencimiento)}
                    />
                    {erroresLote.fecha_vencimiento && (
                      <p className="mt-1 text-xs font-semibold text-red-300">
                        {erroresLote.fecha_vencimiento}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="lote-ubicacion" className={claseEtiqueta}>
                      Ubicación
                    </label>
                    <input
                      id="lote-ubicacion"
                      name="ubicacion"
                      className={claseCampo}
                      placeholder="Ej. Enfermería - Estante A"
                      value={formLote.ubicacion}
                      onChange={handleChangeLote}
                      aria-invalid={Boolean(erroresLote.ubicacion)}
                    />
                    {erroresLote.ubicacion && (
                      <p className="mt-1 text-xs font-semibold text-red-300">
                        {erroresLote.ubicacion}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lote-cantidad" className={claseEtiqueta}>
                      Entrada inicial (opc.)
                    </label>
                    <input
                      id="lote-cantidad"
                      name="cantidad_inicial"
                      inputMode="numeric"
                      className={claseCampo}
                      placeholder="0"
                      value={formLote.cantidad_inicial}
                      onChange={handleChangeLote}
                      aria-invalid={Boolean(erroresLote.cantidad_inicial)}
                    />
                    {erroresLote.cantidad_inicial && (
                      <p className="mt-1 text-xs font-semibold text-red-300">
                        {erroresLote.cantidad_inicial}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="lote-motivo" className={claseEtiqueta}>
                    Observación / Motivo de entrada (opcional)
                  </label>
                  <input
                    id="lote-motivo"
                    name="motivo"
                    className={claseCampo}
                    maxLength={300}
                    placeholder="Compra, abastecimiento en puerto…"
                    value={formLote.motivo}
                    onChange={handleChangeLote}
                  />
                </div>

                <button
                  type="submit"
                  disabled={guardandoLote}
                  className="h-10 w-full rounded-lg border border-[#ffd36a]/70 bg-gradient-to-b from-[#e8a93c] to-[#a8611a] text-sm font-bold uppercase tracking-wide text-[#2a1507] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a] disabled:cursor-wait disabled:opacity-60"
                >
                  {guardandoLote ? 'Guardando lote…' : 'Crear lote'}
                </button>

                {avisoLote && (
                  <p
                    className="text-sm font-semibold"
                    style={{ color: avisoLote.tipo === 'ok' ? '#7dffa0' : '#ff8a7a' }}
                    role={avisoLote.tipo === 'error' ? 'alert' : 'status'}
                  >
                    {avisoLote.texto}
                  </p>
                )}
              </form>
            </section>

            {/* Formulario 2: Registrar Entrada a Lote Existente */}
            <section
              aria-labelledby="titulo-entrada-lote"
              className="rounded-xl border border-[#b07a3a]/60 bg-[#141a26]/90 shadow-[0_0_2em_rgba(0,0,0,0.6)] backdrop-blur-sm"
            >
              <h2
                id="titulo-entrada-lote"
                className="border-b border-[#b07a3a]/40 px-4 py-3 text-sm font-bold uppercase tracking-wider text-[#e0b060]"
              >
                Registrar entrada a lote existente
              </h2>

              <form onSubmit={handleSubmitEntrada} noValidate className="space-y-3 p-4">
                <div>
                  <label htmlFor="entrada-lote" className={claseEtiqueta}>
                    Lote destino
                  </label>
                  <select
                    id="entrada-lote"
                    name="id_lote"
                    className={claseCampo}
                    value={formEntrada.id_lote}
                    onChange={handleChangeEntrada}
                    aria-invalid={Boolean(erroresEntrada.id_lote)}
                  >
                    <option value="">Selecciona el lote</option>
                    {lotes.map((lote) => {
                      const medInfo = medicamentos.find(
                        (m) => Number(m.id_medicamento) === Number(lote.id_medicamento),
                      );
                      const nombre = lote.nombre_medicamento || medInfo?.nombre || '';
                      return (
                        <option key={lote.id_lote} value={lote.id_lote}>
                          {lote.num_lote} · {nombre} (Actual: {numero(lote.cantidad)})
                        </option>
                      );
                    })}
                  </select>
                  {erroresEntrada.id_lote && (
                    <p className="mt-1 text-xs font-semibold text-red-300">
                      {erroresEntrada.id_lote}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="entrada-cantidad" className={claseEtiqueta}>
                    Cantidad que ingresa
                  </label>
                  <input
                    id="entrada-cantidad"
                    name="cantidad"
                    inputMode="numeric"
                    className={claseCampo}
                    placeholder="0"
                    value={formEntrada.cantidad}
                    onChange={handleChangeEntrada}
                    aria-invalid={Boolean(erroresEntrada.cantidad)}
                  />
                  {erroresEntrada.cantidad && (
                    <p className="mt-1 text-xs font-semibold text-red-300">
                      {erroresEntrada.cantidad}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="entrada-motivo" className={claseEtiqueta}>
                    Motivo de entrada (opcional)
                  </label>
                  <input
                    id="entrada-motivo"
                    name="motivo"
                    className={claseCampo}
                    maxLength={300}
                    placeholder="Reposición, compra, donación…"
                    value={formEntrada.motivo}
                    onChange={handleChangeEntrada}
                  />
                </div>

                <button
                  type="submit"
                  disabled={guardandoEntrada}
                  className="h-10 w-full rounded-lg border border-[#7dffa0]/60 bg-[#173628] text-sm font-bold uppercase tracking-wide text-[#7dffa0] transition hover:bg-[#1f4936] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7dffa0] disabled:cursor-wait disabled:opacity-60"
                >
                  {guardandoEntrada ? 'Registrando entrada…' : 'Sumar entrada al lote'}
                </button>

                {avisoEntrada && (
                  <p
                    className="text-sm font-semibold"
                    style={{ color: avisoEntrada.tipo === 'ok' ? '#7dffa0' : '#ff8a7a' }}
                    role={avisoEntrada.tipo === 'error' ? 'alert' : 'status'}
                  >
                    {avisoEntrada.texto}
                  </p>
                )}
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}