// src/pages/PacientesGrandLine.jsx
// Fondo de la pantalla de pacientes (tabla vacía del diseño) + <Zona> para
// poner el formulario y los datos reales encima.
//
// Dos modos, con la misma lógica:
//  - Pantallas grandes (lg, 1024px o más): la imagen completa "contain" (nunca se recorta)
//    sobre una copia difuminada de sí misma, y el contenido de `escritorio` encima con <Zona>.
//  - Pantallas pequeñas: la imagen queda solo de ambiente (difuminada) y se muestra el
//    contenido de `movil`, un panel normal en columna.
//
// Uso:  <PacientesGrandLine escritorio={...} movil={...} />
//
// ⚠️ La imagen debe medir 2576 x 1438, igual que la del dashboard
//    (IMG_W / IMG_H se importan de DashboardGrandLine.jsx).
import fondoPacientes from '../images/pacientes.jpg';
import { IMG_W, IMG_H } from './DashboardGrandLine';
import FondoAmbiente from './FondoAmbiente';

// Zona propia de esta pantalla: siempre posicionada sobre la imagen (píxeles de la imagen).
// Solo se usa dentro de `escritorio`.
export function Zona({ x, y, w, h, className = '', children }) {
  return (
    <div
      className={`absolute ${className}`}
      style={{
        left: `${(x / IMG_W) * 100}%`,
        top: `${(y / IMG_H) * 100}%`,
        width: `${(w / IMG_W) * 100}%`,
        height: `${(h / IMG_H) * 100}%`,
      }}
    >
      {children}
    </div>
  );
}

export default function PacientesGrandLine({ escritorio, movil }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#140b05] md:flex md:items-center lg:block lg:h-screen lg:overflow-hidden">
      {/* Capa 1 (menos de 1024px): fondo propio si existe (fondo-movil / fondo-tablet), o la imagen difuminada */}
      <FondoAmbiente respaldo={fondoPacientes} />

      {/* Capa 1 (1024px o más): la misma imagen a pantalla completa, difuminada y oscurecida */}
      <img
        src={fondoPacientes}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 hidden h-full w-full scale-110 select-none object-cover blur-2xl brightness-[0.6] lg:block"
      />

      {/* Capa 2a: panel en columna para pantallas pequeñas */}
      <div className="relative z-10 mx-auto w-full max-w-md px-4 py-4 md:max-w-4xl lg:hidden">
        {movil}
      </div>

      {/* Capa 2b: composición completa para pantallas grandes */}
      <div
        className="absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
        style={{
          width: `min(100vw, calc(100vh * ${IMG_W} / ${IMG_H}))`,
          height: `min(100vh, calc(100vw * ${IMG_H} / ${IMG_W}))`,
          // 1em = 1% del ancho de la imagen -> los textos escalan junto con ella
          fontSize: `min(1vw, calc(1vh * ${IMG_W} / ${IMG_H}))`,
        }}
      >
        <img
          src={fondoPacientes}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full select-none"
          style={{
            WebkitMaskImage:
              'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent), ' +
              'linear-gradient(to bottom, transparent, #000 5%, #000 95%, transparent)',
            WebkitMaskComposite: 'source-in',
            maskImage:
              'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent), ' +
              'linear-gradient(to bottom, transparent, #000 5%, #000 95%, transparent)',
            maskComposite: 'intersect',
          }}
        />
        {escritorio}
      </div>
    </div>
  );
}
