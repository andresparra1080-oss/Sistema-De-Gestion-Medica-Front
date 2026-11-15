// src/pages/MedicamentosPage.jsx
// KAN-22: catálogo de medicamentos e insumos.
//
// Lista lo que hay en el catálogo, con su stock y el umbral mínimo, y deja
// registrar, editar (incluido el umbral) y eliminar. El back lo guarda en
// /api/inventario. Los lotes y las entradas de stock son de KAN-23.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  createMedication,
  deleteMedication,
  getInventory,
  updateMedication,
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

// Mismos valores que acepta el back (InventarioRoutes.cpp)
const TIPOS = [
  { value: 'MEDICAMENTO', label: 'Medicamento' },
  { value: 'INSUMO', label: 'Insumo' },
];

const UNIDADES = [
  { value: 'UNIDAD', label: 'Unidad' },
  { value: 'TABLETA', label: 'Tableta' },
  { value: 'CAPSULA', label: 'Cápsula' },
  { value: 'AMPOLLA', label: 'Ampolla' },
  { value: 'FRASCO', label: 'Frasco' },
  { value: 'TUBO', label: 'Tubo' },
  { value: 'ROLLO', label: 'Rollo' },
  { value: 'ML', label: 'Mililitro (ml)' },
];

const MAX_NOMBRE = 100;
const MAX_DESCRIPCION = 500;

const FORMULARIO_VACIO = {
  nombre: '',
  tipo_insumo: 'MEDICAMENTO',
  unidad_medida: 'UNIDAD',
  descripcion: '',
  umbral_minimo: '0',
};

const etiquetaDe = (lista, valor) => lista.find((x) => x.value === valor)?.label ?? valor;
const normalizar = (texto) =>
  String(texto ?? '')
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const stockDe = (m) => Number(m.cantidad_total_disponible ?? m.cantidad ?? 0);
const umbralDe = (m) => Number(m.umbral_minimo ?? m.stock_minimo ?? 0);
const estaBajo = (m) => (m.bajo_minimo != null ? Boolean(m.bajo_minimo) : stockDe(m) < umbralDe(m));

function validar(datos, catalogo, idEditando) {
  const errores = {};
  const nombre = datos.nombre.trim();

  if (!nombre) errores.nombre = 'Escribe el nombre.';
  else if (nombre.length > MAX_NOMBRE) errores.nombre = `Máximo ${MAX_NOMBRE} caracteres.`;
  else if (
    catalogo.some(
      (m) => m.id_medicamento !== idEditando && normalizar(m.nombre) === normalizar(nombre),
    )
  ) {
    errores.nombre = 'Ya existe un medicamento con ese nombre.';
  }

  if (datos.descripcion.length > MAX_DESCRIPCION) {
    errores.descripcion = `Máximo ${MAX_DESCRIPCION} caracteres.`;
  }

  const umbral = datos.umbral_minimo.trim();
  if (umbral === '') errores.umbral_minimo = 'Escribe el umbral (puede ser 0).';
  else if (!/^\d+$/.test(umbral)) errores.umbral_minimo = 'Debe ser un número entero de 0 en adelante.';

  return errores;
}

function Formulario({ editando, catalogo, onGuardado, onCancelar }) {
  const [datos, setDatos] = useState(FORMULARIO_VACIO);
  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setErrores({});
    setErrorServidor('');
    setDatos(
      editando
        ? {
            nombre: editando.nombre ?? '',
            tipo_insumo: editando.tipo_insumo ?? 'MEDICAMENTO',
            unidad_medida: editando.unidad_medida ?? 'UNIDAD',
            descripcion: editando.descripcion ?? '',
            umbral_minimo: String(umbralDe(editando)),
          }
        : FORMULARIO_VACIO,
    );
  }, [editando]);

  const cambiar = (campo) => (e) => {
    setDatos((prev) => ({ ...prev, [campo]: e.target.value }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setErrorServidor('');
    const encontrados = validar(datos, catalogo, editando?.id_medicamento);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    // El back espera umbral_minimo entero y descripcion como texto (no null)
    const cuerpo = {
      nombre: datos.nombre.trim(),
      tipo_insumo: datos.tipo_insumo,
      unidad_medida: datos.unidad_medida,
      descripcion: datos.descripcion.trim(),
      umbral_minimo: Number(datos.umbral_minimo),
    };

    setGuardando(true);
    try {
      if (editando) await updateMedication(editando.id_medicamento, cuerpo);
      else await createMedication(cuerpo);
      onGuardado(editando ? `«${cuerpo.nombre}» actualizado.` : `«${cuerpo.nombre}» registrado.`);
      if (!editando) setDatos(FORMULARIO_VACIO);
    } catch (error) {
      setErrorServidor(mensajeDeError(error, 'el servicio de inventario'));
    } finally {
      setGuardando(false);
    }
  };

  const idCampo = (campo) => `medicamento-${campo}`;

  return (
    <Seccion
      id="titulo-formulario-medicamento"
      titulo={editando ? `Editar: ${editando.nombre}` : 'Registrar medicamento'}
    >
      <form onSubmit={guardar} noValidate className="space-y-4 p-4">
        <div>
          <label htmlFor={idCampo('nombre')} className={claseEtiqueta}>
            Nombre
          </label>
          <input
            id={idCampo('nombre')}
            className={`${claseCampo} h-10`}
            value={datos.nombre}
            onChange={cambiar('nombre')}
            maxLength={MAX_NOMBRE}
            placeholder="Ej. Ibuprofeno 400 mg"
            aria-invalid={Boolean(errores.nombre)}
            autoComplete="off"
          />
          <ErrorCampo>{errores.nombre}</ErrorCampo>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={idCampo('tipo')} className={claseEtiqueta}>
              Tipo
            </label>
            <select
              id={idCampo('tipo')}
              className={`${claseCampo} h-10`}
              value={datos.tipo_insumo}
              onChange={cambiar('tipo_insumo')}
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={idCampo('unidad')} className={claseEtiqueta}>
              Unidad de medida
            </label>
            <select
              id={idCampo('unidad')}
              className={`${claseCampo} h-10`}
              value={datos.unidad_medida}
              onChange={cambiar('unidad_medida')}
            >
              {UNIDADES.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor={idCampo('umbral')} className={claseEtiqueta}>
            Umbral mínimo
          </label>
          <input
            id={idCampo('umbral')}
            className={`${claseCampo} h-10`}
            value={datos.umbral_minimo}
            onChange={cambiar('umbral_minimo')}
            inputMode="numeric"
            aria-invalid={Boolean(errores.umbral_minimo)}
            aria-describedby={idCampo('umbral-ayuda')}
          />
          <p id={idCampo('umbral-ayuda')} className="mt-1 text-xs text-[#a58a5a]">
            Si el stock queda por debajo de esta cantidad, el medicamento se marca como bajo mínimo.
          </p>
          <ErrorCampo>{errores.umbral_minimo}</ErrorCampo>
        </div>

        <div>
          <label htmlFor={idCampo('descripcion')} className={claseEtiqueta}>
            Descripción <span className="normal-case tracking-normal text-[#a58a5a]">(opcional)</span>
          </label>
          <textarea
            id={idCampo('descripcion')}
            className={`${claseCampo} min-h-[5.5rem] py-2`}
            value={datos.descripcion}
            onChange={cambiar('descripcion')}
            maxLength={MAX_DESCRIPCION}
            aria-invalid={Boolean(errores.descripcion)}
          />
          <p className="mt-1 text-right text-xs tabular-nums text-[#7d7560]">
            {datos.descripcion.length}/{MAX_DESCRIPCION}
          </p>
          <ErrorCampo>{errores.descripcion}</ErrorCampo>
        </div>

        {errorServidor && <MensajeError>{errorServidor}</MensajeError>}

        <div className="flex flex-wrap gap-2">
          <button type="submit" className={`${claseBotonPrimario} flex-1`} disabled={guardando}>
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar'}
          </button>
          {editando && (
            <button type="button" className={claseBotonSecundario} onClick={onCancelar} disabled={guardando}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </Seccion>
  );
}

function Fila({ medicamento, seleccionado, onEditar, onEliminar }) {
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const bajo = estaBajo(medicamento);

  const eliminar = async () => {
    setEliminando(true);
    const ok = await onEliminar(medicamento);
    if (!ok) {
      setEliminando(false);
      setConfirmando(false);
    }
  };

  return (
    <tr className={`border-b border-[#b07a3a]/20 last:border-b-0 ${seleccionado ? 'bg-[#e8a93c]/10' : ''}`}>
      <td className="px-4 py-3 align-top">
        <p className="font-semibold text-[#fbe9c0]">{medicamento.nombre}</p>
        {medicamento.descripcion && (
          <p className="mt-0.5 line-clamp-2 text-xs text-[#a58a5a]">{medicamento.descripcion}</p>
        )}
      </td>
      <td className="hidden px-3 py-3 align-top text-xs text-[#cbb391] sm:table-cell">
        {etiquetaDe(TIPOS, medicamento.tipo_insumo)}
        <span className="block text-[#8a7a60]">{etiquetaDe(UNIDADES, medicamento.unidad_medida)}</span>
      </td>
      <td className="px-3 py-3 text-right align-top tabular-nums text-[#fbe9c0]">{stockDe(medicamento)}</td>
      <td className="px-3 py-3 text-right align-top tabular-nums text-[#cbb391]">{umbralDe(medicamento)}</td>
      <td className="whitespace-nowrap px-3 py-3 align-top">
        {bajo ? <Insignia color="#ff8a7a">Bajo mínimo</Insignia> : <Insignia color="#7dffa0">OK</Insignia>}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right align-top">
        {confirmando ? (
          <span className="inline-flex flex-col items-end gap-2 text-xs font-bold uppercase tracking-wide">
            <span className="normal-case tracking-normal text-[#cbb391]">¿Eliminar?</span>
            <button
              type="button"
              onClick={eliminar}
              disabled={eliminando}
              className="text-red-300 underline underline-offset-4 hover:text-red-200 disabled:opacity-50"
            >
              {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={eliminando}
              className="text-[#a58a5a] underline underline-offset-4 hover:text-[#f2c48a]"
            >
              No
            </button>
          </span>
        ) : (
          <span className="inline-flex flex-col items-end gap-2 text-xs font-bold uppercase tracking-wide">
            <button
              type="button"
              onClick={() => onEditar(medicamento)}
              className="text-[#ffd36a] underline underline-offset-4 hover:text-[#ffe9a8]"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="text-[#a58a5a] underline underline-offset-4 hover:text-red-300"
            >
              Eliminar
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}

export default function MedicamentosPage() {
  const { user } = useAuth();

  const [catalogo, setCatalogo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [errorAccion, setErrorAccion] = useState('');
  const [aviso, setAviso] = useState('');
  const [editando, setEditando] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('TODOS');
  const [soloBajos, setSoloBajos] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const respuesta = await getInventory();
      setCatalogo(respuesta?.items ?? []);
      setErrorCarga('');
    } catch (error) {
      setErrorCarga(mensajeDeError(error, 'el servicio de inventario'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (user) cargar();
  }, [user, cargar]);

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda);
    return catalogo
      .filter(
        (m) =>
          (tipo === 'TODOS' || m.tipo_insumo === tipo) &&
          (!soloBajos || estaBajo(m)) &&
          (!texto || normalizar(`${m.nombre} ${m.descripcion ?? ''}`).includes(texto)),
      )
      .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
  }, [catalogo, busqueda, tipo, soloBajos]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const bajos = catalogo.filter(estaBajo).length;

  const guardado = async (mensaje) => {
    setAviso(mensaje);
    setErrorAccion('');
    setEditando(null);
    await cargar();
  };

  const editar = (medicamento) => {
    setAviso('');
    setErrorAccion('');
    setEditando(medicamento);
    // En pantallas pequeñas el formulario queda debajo de la lista
    if (window.matchMedia('(max-width: 1023px)').matches) {
      document.getElementById('formulario-medicamento')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Devuelve true si se eliminó; si no, la fila vuelve a mostrar sus botones
  const eliminar = async (medicamento) => {
    setAviso('');
    setErrorAccion('');
    try {
      await deleteMedication(medicamento.id_medicamento);
      if (editando?.id_medicamento === medicamento.id_medicamento) setEditando(null);
      setAviso(`«${medicamento.nombre}» eliminado.`);
      await cargar();
      return true;
    } catch (error) {
      setErrorAccion(mensajeDeError(error, 'el servicio de inventario'));
      return false;
    }
  };

  return (
    <PaginaEnfermeria
      titulo="Medicamentos"
      extra={
        !cargando &&
        !errorCarga && (
          <p className="text-sm text-[#cbb391]" role="status">
            <span className="font-semibold text-[#fbe9c0]">{catalogo.length}</span> en el catálogo
            {bajos > 0 && <span className="font-semibold text-[#ff8a7a]"> · {bajos} bajo mínimo</span>}
          </p>
        )
      }
    >
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="buscar-medicamento" className="sr-only">
              Buscar medicamento
            </label>
            <input
              id="buscar-medicamento"
              type="search"
              className={`${claseCampo} h-10 min-w-[12rem] flex-1`}
              placeholder="Buscar por nombre o descripción"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {[{ value: 'TODOS', label: 'Todos' }, ...TIPOS].map((t) => {
              const activo = tipo === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  aria-pressed={activo}
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
            <label className="ml-1 flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#cbb391]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#e8a93c]"
                checked={soloBajos}
                onChange={(e) => setSoloBajos(e.target.checked)}
              />
              Solo bajo mínimo
            </label>
          </div>

          {aviso && (
            <p
              className="rounded-lg border border-[#7dffa0]/40 bg-[#0f1d14]/90 px-4 py-3 text-sm font-semibold text-[#7dffa0]"
              role="status"
            >
              {aviso}
            </p>
          )}
          {errorAccion && <MensajeError>{errorAccion}</MensajeError>}

          <Seccion id="titulo-catalogo" titulo="Catálogo">
            {errorCarga ? (
              <div className="p-4">
                <MensajeError>{errorCarga}</MensajeError>
              </div>
            ) : cargando ? (
              <p className="px-4 py-10 text-center text-sm text-[#a58a5a]" role="status">
                Cargando catálogo…
              </p>
            ) : visibles.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#a58a5a]">
                {catalogo.length === 0
                  ? 'Todavía no hay medicamentos registrados.'
                  : 'Ningún medicamento coincide con la búsqueda.'}
              </p>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full sm:min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-[#b07a3a]/40 text-left text-[11px] font-bold uppercase tracking-wider text-[#a58a5a]">
                      <th scope="col" className="px-4 py-2">Nombre</th>
                      <th scope="col" className="hidden px-3 py-2 sm:table-cell">Tipo / unidad</th>
                      <th scope="col" className="px-3 py-2 text-right">Stock</th>
                      <th scope="col" className="px-3 py-2 text-right">Umbral</th>
                      <th scope="col" className="px-3 py-2">Estado</th>
                      <th scope="col" className="px-4 py-2 text-right">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((m) => (
                      <Fila
                        key={m.id_medicamento}
                        medicamento={m}
                        seleccionado={editando?.id_medicamento === m.id_medicamento}
                        onEditar={editar}
                        onEliminar={eliminar}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Seccion>
        </div>

        <div id="formulario-medicamento" className="scroll-mt-4 lg:sticky lg:top-6">
          <Formulario
            editando={editando}
            catalogo={catalogo}
            onGuardado={guardado}
            onCancelar={() => setEditando(null)}
          />
        </div>
      </div>
    </PaginaEnfermeria>
  );
}
