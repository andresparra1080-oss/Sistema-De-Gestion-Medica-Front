// src/pages/DashboardGrandLine.jsx
// Dos modos con los mismos elementos:
//  - Pantallas grandes (lg, 1024px o más): la imagen completa del dashboard como fondo
//    ("contain", sin recortes) y los datos reales encima, con <Zona>.
//    Coordenadas en píxeles de la imagen original (2576 x 1438).
//  - Pantallas pequeñas (celulares y tabletas): la imagen queda solo de ambiente (difuminada)
//    y el contenido aparece como un panel real: título, bienvenida, tarjetas, botones.
import { Skull } from "lucide-react";
import FondoAmbiente from "./FondoAmbiente";
import fondoDashboard from "../images/inicio.jpg";

export const IMG_W = 2576;
export const IMG_H = 1438;

export const estilos = {
  // Pantallas pequeñas: botón naranja visible. Pantallas grandes: invisible sobre el dibujado.
  boton:
    "w-full rounded-full border-2 border-[#ffb25c] bg-gradient-to-b from-[#f59b2c] via-[#d9641a] to-[#a8360e] " +
    "px-6 py-3 text-base font-extrabold uppercase tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_0_22px_rgba(255,140,40,0.5)] " +
    "transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a] " +
    "lg:h-full lg:border-0 lg:bg-none lg:bg-transparent lg:py-0 lg:text-transparent lg:shadow-none " +
    "lg:hover:bg-orange-300/10 lg:hover:brightness-100",
  botonSecundario:
    "w-full rounded-full border-2 border-[#9a6a30] bg-[#2a190b]/80 px-6 py-3 text-base font-bold uppercase tracking-wide " +
    "text-[#f3d58a] transition hover:bg-[#3b2412] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a] " +
    "lg:h-full lg:border-0 lg:bg-transparent lg:py-0 lg:text-transparent lg:hover:bg-orange-300/10",
};

// Un elemento del dashboard.
//  - Pantallas grandes: se coloca sobre la imagen con x, y, w, h (píxeles de la imagen).
//  - Pantallas pequeñas: queda en el flujo normal. Si lleva `etiqueta`, se ve como tarjeta con su título;
//    `tarjeta` agrega los colores de esa tarjeta (borde y texto).
export function Zona({ x, y, w, h, etiqueta, icono: Icono, tarjeta = "", className = "", children }) {
  const claseTarjeta = etiqueta
    ? `flex-col rounded-2xl border-2 bg-gradient-to-br to-black/60 p-3 text-center lg:border-0 lg:bg-none lg:bg-transparent lg:p-0 lg:shadow-none ${tarjeta}`
    : "";

  // En pantallas pequeñas las tarjetas van de 2 en 2; saludo, avisos y botones ocupan todo el ancho
  const ancho = etiqueta ? "" : "col-span-2 ";

  return (
    <div
      className={
        `${ancho}lg:absolute lg:left-[var(--zx)] lg:top-[var(--zy)] lg:h-[var(--zh)] lg:w-[var(--zw)] ` +
        `${claseTarjeta} ${className}`
      }
      style={{
        "--zx": `${(x / IMG_W) * 100}%`,
        "--zy": `${(y / IMG_H) * 100}%`,
        "--zw": `${(w / IMG_W) * 100}%`,
        "--zh": `${(h / IMG_H) * 100}%`,
      }}
    >
      {etiqueta ? (
        <span className="mb-2 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider lg:hidden">
          {Icono ? <Icono className="h-4 w-4" aria-hidden="true" /> : null}
          {etiqueta}
        </span>
      ) : null}
      {children}
    </div>
  );
}

export default function DashboardGrandLine({ children }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#140b05] md:flex md:items-center lg:block lg:h-screen lg:overflow-hidden">
      {/* Capa 1 (menos de 1024px): fondo propio si existe (fondo-movil / fondo-tablet), o la imagen difuminada */}
      <FondoAmbiente respaldo={fondoDashboard} />

      {/* Capa 1 (1024px o más): la misma imagen a pantalla completa, difuminada y oscurecida */}
      <img
        src={fondoDashboard}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 hidden h-full w-full scale-110 select-none object-cover blur-2xl brightness-[0.6] lg:block"
      />

      {/* Capa 2: panel apilado en pantallas pequeñas; composición completa en pantallas grandes */}
      <div
        className="relative z-10 mx-auto w-full max-w-md px-4 py-6 md:max-w-4xl lg:absolute lg:left-1/2 lg:top-1/2 lg:h-[var(--bh)] lg:w-[var(--bw)] lg:max-w-none lg:-translate-x-1/2 lg:-translate-y-1/2 lg:p-0 lg:text-[length:var(--fs)]"
        style={{
          "--bw": `min(100vw, calc(100vh * ${IMG_W} / ${IMG_H}))`,
          "--bh": `min(100vh, calc(100vw * ${IMG_H} / ${IMG_W}))`,
          // 1em = 1% del ancho de la imagen -> los textos escalan junto con ella
          "--fs": `min(1vw, calc(1vh * ${IMG_W} / ${IMG_H}))`,
        }}
      >
        <img
          src={fondoDashboard}
          alt=""
          draggable={false}
          className="absolute inset-0 hidden h-full w-full select-none lg:block"
          style={{
            // Bordes que se funden con el fondo difuminado
            WebkitMaskImage:
              "linear-gradient(to right, transparent, #000 5%, #000 95%, transparent), " +
              "linear-gradient(to bottom, transparent, #000 5%, #000 95%, transparent)",
            WebkitMaskComposite: "source-in",
            maskImage:
              "linear-gradient(to right, transparent, #000 5%, #000 95%, transparent), " +
              "linear-gradient(to bottom, transparent, #000 5%, #000 95%, transparent)",
            maskComposite: "intersect",
          }}
        />

        {/* Marco de bronce (solo pantallas pequeñas). Con lg:contents desaparece en pantallas grandes. */}
        <div
          className="rounded-2xl border-2 border-[#b07a3a]/70 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_26px_rgba(200,140,60,0.15)] md:grid md:grid-cols-[15rem_1fr] md:items-center md:gap-6 md:p-6 lg:contents"
          style={{ background: "linear-gradient(180deg, rgba(40,47,66,0.92), rgba(18,22,32,0.95))" }}
        >
          {/* Encabezado solo para pantallas pequeñas (en las grandes ya está dibujado) */}
          <header className="mb-5 text-center md:mb-0 md:border-r md:border-[#b07a3a]/40 md:pr-6 lg:hidden">
            <div
              className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#d9a24f]"
              style={{
                background: "radial-gradient(circle at 30% 30%, #3b2a16, #140c05)",
                boxShadow: "0 0 22px rgba(255,170,60,0.4), inset 0 0 12px rgba(0,0,0,0.7)",
              }}
            >
              <Skull className="h-8 w-8 text-[#f0c675]" strokeWidth={1.6} aria-hidden="true" />
            </div>
            <h1
              className="bg-gradient-to-b from-[#ffe3a3] via-[#f0b25a] to-[#b8691f] bg-clip-text text-2xl font-extrabold uppercase leading-tight tracking-wide text-transparent drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
              style={{ fontFamily: "'Cinzel', Georgia, serif" }}
            >
              Grand Line
              <br />
              Medical Bay
            </h1>
            <div className="my-3 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c8933e] to-transparent" />
              <span className="text-[#e0b060]">✦</span>
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c8933e] to-transparent" />
            </div>
            <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.25)]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" aria-hidden="true" />
              Autenticación validada
            </p>
          </header>

          <div className="grid grid-cols-2 gap-3 lg:contents">{children}</div>
        </div>
      </div>
    </div>
  );
}
