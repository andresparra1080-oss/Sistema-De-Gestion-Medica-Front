// src/pages/TratamientosPage.jsx
// Gestión de tratamientos: asignar un medicamento a un paciente y seguir su estado
// (ACTIVO -> SUSPENDIDO -> ACTIVO, o FINALIZADO).
//
// Mismo estilo que EmergenciasPage: usa los componentes compartidos de PanelEnfermeria,
// formulario a la izquierda y lista ordenada a la derecha. La lógica (llamadas a la API
// y datos que se envían) es la misma de antes.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  createMovement,
  createTreatment,
  getInventory,
  getPatients,
  getTreatments,
  updateTreatmentStatus,
} from '../services/api';
import {
  ErrorCampo,
  Insignia,
  MensajeError,
  PaginaEnfermeria,
  Seccion,
  claseBotonPrimario,
  claseBotonSecundario,
  claseCampo,
  claseEtiqueta,
  mensajeDeError,
} from '../components/PanelEnfermeria';

// Valores EXACTOS del campo estado_tratamiento. El color sigue el de las insignias de emergencias.
const ESTADOS_TRATAMIENTO = {
  ACTIVO: { label: 'Activo', color: '#7dffa0', orden: 0 },
  SUSPENDIDO: { label: 'Suspendido', color: '#ffa733', orden: 1 },
  FINALIZADO: { label: 'Finalizado', color: '#4aa8ff', orden: 2 },
};

const estadoDe = (estado) =>
  ESTADOS_TRATAMIENTO[String(estado ?? '').toUpperCase()] ?? {
    label: String(estado ?? '—'),
    color: '#a58a5a',
    orden: 3,
  };

const claseAccion =
  'text-xs font-bold uppercase tracking-wide underline underline-offset-4 transition ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a] disabled:opacity-50';

function obtenerLista(respuesta, posiblesClaves) {
  if (Array.isArray(respuesta)) return respuesta;

  for (const clave of posiblesClaves) {
    if (Array.isArray(respuesta?.[clave])) {
      return respuesta[clave];
    }
  }

  return [];
}

function fechaHoy() {
  return new Date().toISOString().split('T')[0];
}

const formVacio = () => ({
  id_paciente: '',
  id_medicamento: '',
  dosis: '',
  frecuencia: '',
  intervalo_horas: '',
  fecha_inicio: fechaHoy(),
  fecha_fin: '',
});

// Primero los activos, luego suspendidos y finalizados; dentro de cada grupo, los más recientes.
function ordenarTratamientos(lista) {
  return [...lista].sort((a, b) => {
    const porEstado = estadoDe(a.estado_tratamiento).orden - estadoDe(b.estado_tratamiento).orden;
    if (porEstado !== 0) return porEstado;
    return String(b.fecha_inicio).localeCompare(String(a.fecha_inicio));
  });
}

function TarjetaTratamiento({
  tratamiento,
  paciente,
  medicamento,
  ocupado,
  onCambiarEstado,
  dispensaAbierta,
  lotes,
  formDispensa,
  errorDispensa,
  dispensando,
  onAbrirDispensa,
  onCerrarDispensa,
  onCambiarDispensa,
  onDispensar,
}) {
  const estado = estadoDe(tratamiento.estado_tratamiento);
  const id = tratamiento.id_tratamiento;
  const actual = String(tratamiento.estado_tratamiento ?? '').toUpperCase();
  const sinLotes = lotes.length === 0;

  return (
    <li
      className="border-b border-[#b07a3a]/25 py-3 pl-3 pr-4 last:border-b-0"
      style={{ borderLeft: `4px solid ${estado.color}` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-[#f2c48a]">{medicamento}</h3>
        <Insignia color={estado.color}>{estado.label}</Insignia>
        <span className="ml-auto tabular-nums text-xs text-[#8a7a60]">
          #{id} · {tratamiento.fecha_inicio}
        </span>
      </div>

      <p className="mt-1 text-sm text-[#cbb391]">{paciente}</p>

      <p className="mt-1 text-xs text-[#a58a5a]">
        {tratamiento.dosis} · {tratamiento.frecuencia}
        {tratamiento.intervalo_horas ? ` · cada ${tratamiento.intervalo_horas} h` : ''}
        {tratamiento.fecha_fin ? ` · hasta ${tratamiento.fecha_fin}` : ''}
      </p>

      {actual === 'ACTIVO' && (
        <div className="mt-2 flex flex-wrap gap-4">
          <button
            type="button"
            disabled={ocupado}
            onClick={() => onCambiarEstado(id, 'SUSPENDIDO')}
            className={`${claseAccion} text-[#ffa733] hover:text-[#ffc477]`}
          >
            Suspender
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => onCambiarEstado(id, 'FINALIZADO')}
            className={`${claseAccion} text-[#7dffa0] hover:text-[#b4ffc8]`}
          >
            Finalizar
          </button>
          <button
            type="button"
            disabled={ocupado || dispensando}
            onClick={() => onAbrirDispensa(tratamiento)}
            className={`${claseAccion} text-[#4aa8ff] hover:text-[#8cc8ff]`}
          >
            Dispensar
          </button>
        </div>
      )}

      {actual === 'ACTIVO' && dispensaAbierta && (
        <form
          onSubmit={(e) => onDispensar(e, id)}
          noValidate
          className="mt-3 space-y-3 rounded-md border border-[#4aa8ff]/40 bg-[#0f141d]/60 p-3"
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
            <div>
              <label htmlFor={`disp-lote-${id}`} className={claseEtiqueta}>
                Lote
              </label>
              <select
                id={`disp-lote-${id}`}
                className={`${claseCampo} h-10`}
                value={formDispensa.id_lote}
                onChange={(e) => onCambiarDispensa('id_lote', e.target.value)}
                disabled={sinLotes}
              >
                {sinLotes && <option value="">Sin lotes disponibles</option>}
                {lotes.map((lote) => (
                  <option key={lote.id_lote} value={lote.id_lote}>
                    {lote.num_lote} · vence {lote.fecha_vencimiento || 'sin fecha'} ·{' '}
                    {lote.cantidad} disp.
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={`disp-cantidad-${id}`} className={claseEtiqueta}>
                Cantidad
              </label>
              <input
                id={`disp-cantidad-${id}`}
                type="number"
                min="1"
                step="1"
                className={`${claseCampo} h-10`}
                value={formDispensa.cantidad}
                onChange={(e) => onCambiarDispensa('cantidad', e.target.value)}
                aria-invalid={Boolean(errorDispensa)}
              />
            </div>
          </div>

          {sinLotes && (
            <p className="text-xs font-semibold text-[#ffa733]">
              No hay lotes disponibles y vigentes de este medicamento.
            </p>
          )}

          <ErrorCampo>{errorDispensa}</ErrorCampo>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={dispensando || sinLotes}
              className={claseBotonPrimario}
            >
              {dispensando ? 'Dispensando…' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={onCerrarDispensa}
              disabled={dispensando}
              className={claseBotonSecundario}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {actual === 'SUSPENDIDO' && (
        <div className="mt-2">
          <button
            type="button"
            disabled={ocupado}
            onClick={() => onCambiarEstado(id, 'ACTIVO')}
            className={`${claseAccion} text-[#ffd36a] hover:text-[#ffe9a8]`}
          >
            Reactivar →
          </button>
        </div>
      )}
    </li>
  );
}

export default function TratamientosPage() {
  const { user } = useAuth();

  const [pacientes, setPacientes] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const [form, setForm] = useState(formVacio);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [cambiandoId, setCambiandoId] = useState(null);
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'error', texto }

  // Dispensación: tratamiento con el formulario abierto, sus datos y su error
  const [dispensa, setDispensa] = useState(null);
  const [formDispensa, setFormDispensa] = useState({ id_lote: '', cantidad: '' });
  const [errorDispensa, setErrorDispensa] = useState('');
  const [dispensando, setDispensando] = useState(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);

    try {
      const [respuestaPacientes, respuestaInventario, respuestaTratamientos] = await Promise.all([
        getPatients(),
        getInventory(),
        getTreatments(),
      ]);

      setPacientes(obtenerLista(respuestaPacientes, ['pacientes', 'data']));

      const listaInventario = obtenerLista(respuestaInventario, [
        'items',
        'medicamentos',
        'inventario',
        'data',
      ]);

      setMedicamentos(
        listaInventario.filter(
          (item) => String(item.tipo_insumo || '').toUpperCase() === 'MEDICAMENTO',
        ),
      );

      setTratamientos(obtenerLista(respuestaTratamientos, ['tratamientos', 'data']));
      setErrorCarga('');
    } catch (error) {
      setErrorCarga(mensajeDeError(error, 'el servicio de tratamientos'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    cargarDatos();
  }, [user, cargarDatos]);

  const ordenados = useMemo(() => ordenarTratamientos(tratamientos), [tratamientos]);
  const activos = tratamientos.filter(
    (t) => String(t.estado_tratamiento ?? '').toUpperCase() === 'ACTIVO',
  ).length;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const cambiar = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: '' }));
    setAviso(null);
  };

  const nombrePaciente = (id) => {
    const paciente = pacientes.find((p) => Number(p.id_paciente) === Number(id));
    return paciente?.nombre_completo || `Paciente #${id}`;
  };

  const nombreMedicamento = (id) => {
    const medicamento = medicamentos.find((m) => Number(m.id_medicamento) === Number(id));
    return medicamento?.nombre || `Medicamento #${id}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Mismas reglas de antes, pero cada error sale junto a su campo.
    const nuevos = {};
    if (!form.id_paciente) nuevos.id_paciente = 'Elige el paciente.';
    if (!form.id_medicamento) nuevos.id_medicamento = 'Elige el medicamento.';
    if (!form.dosis.trim()) nuevos.dosis = 'Escribe la dosis.';
    if (!form.frecuencia.trim()) nuevos.frecuencia = 'Escribe la frecuencia.';
    if (!form.fecha_inicio) nuevos.fecha_inicio = 'Indica la fecha de inicio.';
    if (form.intervalo_horas && Number(form.intervalo_horas) < 1) {
      nuevos.intervalo_horas = 'El intervalo debe ser de al menos 1 hora.';
    }
    if (form.fecha_fin && form.fecha_inicio && form.fecha_fin < form.fecha_inicio) {
      nuevos.fecha_fin = 'La fecha final no puede ser anterior a la inicial.';
    }

    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setGuardando(true);
    setAviso(null);

    try {
      await createTreatment({
        id_paciente: Number(form.id_paciente),
        id_medicamento: Number(form.id_medicamento),
        dosis: form.dosis.trim(),
        frecuencia: form.frecuencia.trim(),
        intervalo_horas: form.intervalo_horas ? Number(form.intervalo_horas) : null,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || null,
      });

      setAviso({ tipo: 'ok', texto: 'Tratamiento registrado correctamente.' });
      setForm(formVacio());
      await cargarDatos();
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error, 'el servicio de tratamientos') });
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (id, estado) => {
    setAviso(null);
    setCambiandoId(id);

    try {
      await updateTreatmentStatus(id, {
        estado_tratamiento: estado,
        fecha_finalizacion_efectiva: estado === 'FINALIZADO' ? fechaHoy() : '',
      });

      setAviso({ tipo: 'ok', texto: 'Estado del tratamiento actualizado.' });
      await cargarDatos();
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error, 'el servicio de tratamientos') });
    } finally {
      setCambiandoId(null);
    }
  };

  // Lotes con existencias y no vencidos del medicamento, el que vence primero
  // arriba (sin fecha, al final). "Hoy" es la fecha local, no la UTC.
  const lotesDe = (idMedicamento) => {
    const medicamento = medicamentos.find(
      (m) => Number(m.id_medicamento) === Number(idMedicamento),
    );

    const ahora = new Date();
    const hoy = [
      ahora.getFullYear(),
      String(ahora.getMonth() + 1).padStart(2, '0'),
      String(ahora.getDate()).padStart(2, '0'),
    ].join('-');

    return (medicamento?.lotes ?? [])
      .filter(
        (lote) =>
          Number(lote.cantidad) > 0 &&
          (!lote.fecha_vencimiento || String(lote.fecha_vencimiento).slice(0, 10) >= hoy),
      )
      .sort((a, b) =>
        String(a.fecha_vencimiento || '9999-12-31').localeCompare(
          String(b.fecha_vencimiento || '9999-12-31'),
        ),
      );
  };

  const abrirDispensa = (tratamiento) => {
    const lotes = lotesDe(tratamiento.id_medicamento);

    setAviso(null);
    setErrorDispensa('');
    setDispensa(tratamiento.id_tratamiento);
    setFormDispensa({
      id_lote: lotes[0] ? String(lotes[0].id_lote) : '',
      cantidad: '',
    });
  };

  const cerrarDispensa = () => {
    setDispensa(null);
    setErrorDispensa('');
  };

  const cambiarDispensa = (campo, valor) => {
    setErrorDispensa('');
    setFormDispensa((prev) => ({ ...prev, [campo]: valor }));
  };

  const dispensarDosis = async (event, idTratamiento) => {
    event.preventDefault();
    setErrorDispensa('');
    setAviso(null);

    if (!formDispensa.id_lote) {
      setErrorDispensa('Elige un lote.');
      return;
    }

    const textoCantidad = String(formDispensa.cantidad).trim();
    const cantidad = Number(textoCantidad);

    if (!/^\d+$/.test(textoCantidad) || !Number.isInteger(cantidad) || cantidad <= 0) {
      setErrorDispensa('La cantidad debe ser un número entero mayor que 0.');
      return;
    }

    setDispensando(true);

    try {
      await createMovement({
        id_lote: Number(formDispensa.id_lote),
        tipo_movimiento: 'CONSUMO',
        cantidad,
        id_tratamiento: Number(idTratamiento),
      });

      setDispensa(null);
      setAviso({ tipo: 'ok', texto: 'Dosis dispensada correctamente.' });
      await cargarDatos();
    } catch (err) {
      setErrorDispensa(mensajeDeError(err, 'el servicio de inventario'));
    } finally {
      setDispensando(false);
    }
  };

  return (
    <PaginaEnfermeria
      titulo="Gestión de tratamientos"
      extra={
        !cargando &&
        !errorCarga && (
          <p className="text-sm text-[#cbb391]" role="status">
            {tratamientos.length === 0 ? (
              <span className="font-semibold text-[#a58a5a]">Sin tratamientos registrados</span>
            ) : (
              <span className="font-semibold text-[#7dffa0]">
                {activos} activo{activos === 1 ? '' : 's'} de {tratamientos.length}
              </span>
            )}
          </p>
        )
      }
    >
      {aviso && (
        <div
          className="mb-5 rounded-md border px-3 py-2 text-sm font-semibold"
          style={{
            color: aviso.tipo === 'ok' ? '#7dffa0' : '#ff8a7a',
            borderColor: aviso.tipo === 'ok' ? '#7dffa055' : '#ff8a7a55',
          }}
          role={aviso.tipo === 'error' ? 'alert' : 'status'}
        >
          {aviso.texto}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* ── Asignar ── */}
        <Seccion id="titulo-asignar" titulo="Asignar tratamiento">
          <form onSubmit={handleSubmit} noValidate className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="tr-paciente" className={claseEtiqueta}>
                  Paciente
                </label>
                <select
                  id="tr-paciente"
                  className={`${claseCampo} h-10`}
                  value={form.id_paciente}
                  onChange={(e) => cambiar('id_paciente', e.target.value)}
                  aria-invalid={Boolean(errores.id_paciente)}
                >
                  <option value="">Elige el paciente</option>
                  {pacientes.map((p) => (
                    <option key={p.id_paciente} value={p.id_paciente}>
                      {p.nombre_completo}
                    </option>
                  ))}
                </select>
                <ErrorCampo>{errores.id_paciente}</ErrorCampo>
              </div>

              <div>
                <label htmlFor="tr-medicamento" className={claseEtiqueta}>
                  Medicamento
                </label>
                <select
                  id="tr-medicamento"
                  className={`${claseCampo} h-10`}
                  value={form.id_medicamento}
                  onChange={(e) => cambiar('id_medicamento', e.target.value)}
                  aria-invalid={Boolean(errores.id_medicamento)}
                >
                  <option value="">Elige el medicamento</option>
                  {medicamentos.map((m) => (
                    <option key={m.id_medicamento} value={m.id_medicamento}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
                <ErrorCampo>{errores.id_medicamento}</ErrorCampo>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="tr-dosis" className={claseEtiqueta}>
                  Dosis
                </label>
                <input
                  id="tr-dosis"
                  className={`${claseCampo} h-10`}
                  placeholder="Ej. 500 mg"
                  value={form.dosis}
                  onChange={(e) => cambiar('dosis', e.target.value)}
                  aria-invalid={Boolean(errores.dosis)}
                />
                <ErrorCampo>{errores.dosis}</ErrorCampo>
              </div>

              <div>
                <label htmlFor="tr-frecuencia" className={claseEtiqueta}>
                  Frecuencia
                </label>
                <input
                  id="tr-frecuencia"
                  className={`${claseCampo} h-10`}
                  placeholder="Ej. Cada 8 horas"
                  value={form.frecuencia}
                  onChange={(e) => cambiar('frecuencia', e.target.value)}
                  aria-invalid={Boolean(errores.frecuencia)}
                />
                <ErrorCampo>{errores.frecuencia}</ErrorCampo>
              </div>
            </div>

            <div>
              <label htmlFor="tr-intervalo" className={claseEtiqueta}>
                Intervalo en horas (opcional)
              </label>
              <input
                id="tr-intervalo"
                type="number"
                min="1"
                className={`${claseCampo} h-10`}
                placeholder="Ej. 8"
                value={form.intervalo_horas}
                onChange={(e) => cambiar('intervalo_horas', e.target.value)}
                aria-invalid={Boolean(errores.intervalo_horas)}
              />
              <ErrorCampo>{errores.intervalo_horas}</ErrorCampo>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="tr-inicio" className={claseEtiqueta}>
                  Fecha de inicio
                </label>
                <input
                  id="tr-inicio"
                  type="date"
                  className={`${claseCampo} h-10 [color-scheme:dark]`}
                  value={form.fecha_inicio}
                  onChange={(e) => cambiar('fecha_inicio', e.target.value)}
                  aria-invalid={Boolean(errores.fecha_inicio)}
                />
                <ErrorCampo>{errores.fecha_inicio}</ErrorCampo>
              </div>

              <div>
                <label htmlFor="tr-fin" className={claseEtiqueta}>
                  Fecha de finalización (opcional)
                </label>
                <input
                  id="tr-fin"
                  type="date"
                  className={`${claseCampo} h-10 [color-scheme:dark]`}
                  value={form.fecha_fin}
                  onChange={(e) => cambiar('fecha_fin', e.target.value)}
                  aria-invalid={Boolean(errores.fecha_fin)}
                />
                <ErrorCampo>{errores.fecha_fin}</ErrorCampo>
              </div>
            </div>

            <button type="submit" disabled={guardando} className={`${claseBotonPrimario} w-full`}>
              {guardando ? 'Registrando…' : 'Registrar tratamiento'}
            </button>
          </form>
        </Seccion>

        {/* ── Registrados ── */}
        <Seccion
          id="titulo-registrados"
          titulo="Tratamientos registrados"
          accion={
            <button
              type="button"
              onClick={cargarDatos}
              disabled={cargando}
              className="text-xs font-bold uppercase tracking-wide text-[#a58a5a] hover:text-[#f2c48a] disabled:opacity-50"
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
            ) : cargando && tratamientos.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#a58a5a]" role="status">
                Cargando tratamientos…
              </p>
            ) : ordenados.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#a58a5a]">
                No hay tratamientos registrados.
              </p>
            ) : (
              <ul>
                {ordenados.map((t) => (
                  <TarjetaTratamiento
                    key={t.id_tratamiento}
                    tratamiento={t}
                    paciente={nombrePaciente(t.id_paciente)}
                    medicamento={nombreMedicamento(t.id_medicamento)}
                    ocupado={cambiandoId === t.id_tratamiento}
                    onCambiarEstado={cambiarEstado}
                    dispensaAbierta={dispensa === t.id_tratamiento}
                    lotes={dispensa === t.id_tratamiento ? lotesDe(t.id_medicamento) : []}
                    formDispensa={formDispensa}
                    errorDispensa={errorDispensa}
                    dispensando={dispensando}
                    onAbrirDispensa={abrirDispensa}
                    onCerrarDispensa={cerrarDispensa}
                    onCambiarDispensa={cambiarDispensa}
                    onDispensar={dispensarDosis}
                  />
                ))}
              </ul>
            )}
          </div>
        </Seccion>
      </div>
    </PaginaEnfermeria>
  );
}