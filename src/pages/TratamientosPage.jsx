import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Plus, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getPatients,
  getInventory,
  getTreatments,
  createTreatment,
  updateTreatmentStatus,
} from '../services/api';

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

function TratamientosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pacientes, setPacientes] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [formulario, setFormulario] = useState({
    id_paciente: '',
    id_medicamento: '',
    dosis: '',
    frecuencia: '',
    intervalo_horas: '',
    fecha_inicio: fechaHoy(),
    fecha_fin: '',
  });

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      const [respuestaPacientes, respuestaInventario, respuestaTratamientos] =
        await Promise.all([
          getPatients(),
          getInventory(),
          getTreatments(),
        ]);

      setPacientes(
        obtenerLista(respuestaPacientes, ['pacientes', 'data'])
      );

      const listaInventario = obtenerLista(
        respuestaInventario,
        ['items', 'medicamentos', 'inventario', 'data']
      );

      setMedicamentos(
        listaInventario.filter(
          (item) =>
            String(item.tipo_insumo || '').toUpperCase() === 'MEDICAMENTO'
        )
      );

      setTratamientos(
        obtenerLista(respuestaTratamientos, ['tratamientos', 'data'])
      );
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los datos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const cambiarCampo = (e) => {
    const { name, value } = e.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  const registrarTratamiento = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (
      !formulario.id_paciente ||
      !formulario.id_medicamento ||
      !formulario.dosis.trim() ||
      !formulario.frecuencia.trim() ||
      !formulario.fecha_inicio
    ) {
      setError('Completa todos los campos obligatorios.');
      return;
    }

    if (
      formulario.fecha_fin &&
      formulario.fecha_fin < formulario.fecha_inicio
    ) {
      setError('La fecha final no puede ser anterior a la inicial.');
      return;
    }

    const datos = {
      id_paciente: Number(formulario.id_paciente),
      id_medicamento: Number(formulario.id_medicamento),
      dosis: formulario.dosis.trim(),
      frecuencia: formulario.frecuencia.trim(),
      intervalo_horas: formulario.intervalo_horas
        ? Number(formulario.intervalo_horas)
        : null,
      fecha_inicio: formulario.fecha_inicio,
      fecha_fin: formulario.fecha_fin || null,
    };

    setGuardando(true);

    try {
      await createTreatment(datos);

      setMensaje('Tratamiento registrado correctamente.');

      setFormulario({
        id_paciente: '',
        id_medicamento: '',
        dosis: '',
        frecuencia: '',
        intervalo_horas: '',
        fecha_inicio: fechaHoy(),
        fecha_fin: '',
      });

      await cargarDatos();
    } catch (err) {
      setError(err.message || 'No se pudo registrar el tratamiento.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (id, estado) => {
    setError('');
    setMensaje('');

    try {
      await updateTreatmentStatus(id, {
        estado_tratamiento: estado,
        fecha_finalizacion_efectiva:
          estado === 'FINALIZADO' ? fechaHoy() : '',
      });

      setMensaje('Estado del tratamiento actualizado.');
      await cargarDatos();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el estado.');
    }
  };

  const nombrePaciente = (id) => {
    const paciente = pacientes.find(
      (p) => Number(p.id_paciente) === Number(id)
    );

    return paciente?.nombre_completo || `Paciente #${id}`;
  };

  const nombreMedicamento = (id) => {
    const medicamento = medicamentos.find(
      (m) => Number(m.id_medicamento) === Number(id)
    );

    return medicamento?.nombre || `Medicamento #${id}`;
  };

  const campoClase =
    'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white outline-none focus:border-amber-400';

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-7xl">

        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="mb-3 flex items-center gap-2 text-sm text-slate-400 hover:text-amber-400"
            >
              <ArrowLeft size={17} />
              Volver al panel
            </button>

            <h1 className="text-3xl font-bold text-amber-400">
              Gestión de tratamientos
            </h1>

            <p className="mt-1 text-slate-400">
              Registro y seguimiento de tratamientos médicos.
            </p>
          </div>

          <button
            onClick={cargarDatos}
            disabled={cargando}
            className="flex items-center gap-2 rounded-lg border border-amber-500 px-4 py-2 text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
          >
            <RefreshCw size={17} />
            Actualizar
          </button>
        </header>

        {error && (
          <div className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-300">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mb-5 rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-green-300">
            {mensaje}
          </div>
        )}

        <section className="mb-8 rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
          <div className="mb-5 flex items-center gap-3">
            <Plus className="text-amber-400" />
            <h2 className="text-xl font-semibold">Asignar tratamiento</h2>
          </div>

          <form onSubmit={registrarTratamiento}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

              <label className="text-sm text-slate-300">
                Paciente *
                <select
                  name="id_paciente"
                  value={formulario.id_paciente}
                  onChange={cambiarCampo}
                  className={`${campoClase} mt-2`}
                  required
                >
                  <option value="">Seleccionar paciente</option>
                  {pacientes.map((p) => (
                    <option key={p.id_paciente} value={p.id_paciente}>
                      {p.nombre_completo}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-300">
                Medicamento *
                <select
                  name="id_medicamento"
                  value={formulario.id_medicamento}
                  onChange={cambiarCampo}
                  className={`${campoClase} mt-2`}
                  required
                >
                  <option value="">Seleccionar medicamento</option>
                  {medicamentos.map((m) => (
                    <option key={m.id_medicamento} value={m.id_medicamento}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-300">
                Dosis *
                <input
                  name="dosis"
                  value={formulario.dosis}
                  onChange={cambiarCampo}
                  placeholder="Ej. 500 mg"
                  className={`${campoClase} mt-2`}
                  required
                />
              </label>

              <label className="text-sm text-slate-300">
                Frecuencia *
                <input
                  name="frecuencia"
                  value={formulario.frecuencia}
                  onChange={cambiarCampo}
                  placeholder="Ej. Cada 8 horas"
                  className={`${campoClase} mt-2`}
                  required
                />
              </label>

              <label className="text-sm text-slate-300">
                Intervalo en horas
                <input
                  type="number"
                  min="1"
                  name="intervalo_horas"
                  value={formulario.intervalo_horas}
                  onChange={cambiarCampo}
                  placeholder="Ej. 8"
                  className={`${campoClase} mt-2`}
                />
              </label>

              <label className="text-sm text-slate-300">
                Fecha de inicio *
                <input
                  type="date"
                  name="fecha_inicio"
                  value={formulario.fecha_inicio}
                  onChange={cambiarCampo}
                  className={`${campoClase} mt-2`}
                  required
                />
              </label>

              <label className="text-sm text-slate-300">
                Fecha de finalización
                <input
                  type="date"
                  name="fecha_fin"
                  value={formulario.fecha_fin}
                  onChange={cambiarCampo}
                  className={`${campoClase} mt-2`}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="mt-5 rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {guardando ? 'Registrando...' : 'Registrar tratamiento'}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
          <div className="mb-5 flex items-center gap-3">
            <ClipboardList className="text-amber-400" />
            <h2 className="text-xl font-semibold">
              Tratamientos registrados
            </h2>
          </div>

          {cargando ? (
            <p className="py-8 text-center text-slate-400">
              Cargando tratamientos...
            </p>
          ) : tratamientos.length === 0 ? (
            <p className="py-8 text-center text-slate-400">
              No hay tratamientos registrados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="border-b border-slate-700 text-amber-400">
                  <tr>
                    <th className="p-3">Paciente</th>
                    <th className="p-3">Medicamento</th>
                    <th className="p-3">Dosis</th>
                    <th className="p-3">Frecuencia</th>
                    <th className="p-3">Inicio</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {tratamientos.map((t) => (
                    <tr
                      key={t.id_tratamiento}
                      className="border-b border-slate-800 hover:bg-slate-800/50"
                    >
                      <td className="p-3">
                        {nombrePaciente(t.id_paciente)}
                      </td>
                      <td className="p-3">
                        {nombreMedicamento(t.id_medicamento)}
                      </td>
                      <td className="p-3">{t.dosis}</td>
                      <td className="p-3">{t.frecuencia}</td>
                      <td className="p-3">{t.fecha_inicio}</td>
                      <td className="p-3">
                        <span className="rounded-full bg-slate-700 px-3 py-1 text-xs">
                          {t.estado_tratamiento}
                        </span>
                      </td>
                      <td className="p-3">
                        {t.estado_tratamiento === 'ACTIVO' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                cambiarEstado(
                                  t.id_tratamiento,
                                  'SUSPENDIDO'
                                )
                              }
                              className="text-xs text-yellow-400 hover:underline"
                            >
                              Suspender
                            </button>

                            <button
                              onClick={() =>
                                cambiarEstado(
                                  t.id_tratamiento,
                                  'FINALIZADO'
                                )
                              }
                              className="text-xs text-green-400 hover:underline"
                            >
                              Finalizar
                            </button>
                          </div>
                        )}

                        {t.estado_tratamiento === 'SUSPENDIDO' && (
                          <button
                            onClick={() =>
                              cambiarEstado(
                                t.id_tratamiento,
                                'ACTIVO'
                              )
                            }
                            className="text-xs text-amber-400 hover:underline"
                          >
                            Reactivar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default TratamientosPage;