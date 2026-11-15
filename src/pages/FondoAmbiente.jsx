// src/pages/FondoAmbiente.jsx
// Fondo de las pantallas que NO son de escritorio (menos de 1024px).
//
// Si existen estos archivos en src/images/, se usan automáticamente (sin tocar código):
//   fondo-movil.jpg    (o .jpeg / .png / .webp)  -> celulares (menos de 768px)  · vertical 9:16, ej. 1080 x 1920
//   fondo-tablet.jpg   (o .jpeg / .png / .webp)  -> pantallas medianas (768px a 1023px) · horizontal, ej. 1920 x 1200
//
// Si no existen, se usa la imagen del escritorio difuminada, como hasta ahora.
// Si solo existe fondo-movil, también se usa en las pantallas medianas.

const FONDO_MOVIL = Object.values(
  import.meta.glob('../images/fondo-movil.{jpg,jpeg,png,webp,gif}', { eager: true, import: 'default' }),
)[0];

const FONDO_TABLET = Object.values(
  import.meta.glob('../images/fondo-tablet.{jpg,jpeg,png,webp}', { eager: true, import: 'default' }),
)[0];

export default function FondoAmbiente({ respaldo }) {
  const capas = [
    { src: FONDO_MOVIL, visible: 'md:hidden' },
    { src: FONDO_TABLET || FONDO_MOVIL, visible: 'hidden md:block lg:hidden' },
  ];

  return (
    <>
      {capas.map(({ src, visible }) =>
        src ? (
          // Imagen propia: nítida y un poco oscurecida para que el panel se lea bien
          <img
            key={visible}
            src={src}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`pointer-events-none fixed inset-0 h-full w-full select-none object-cover brightness-[0.75] ${visible}`}
          />
        ) : (
          // Sin imagen propia: la del escritorio, difuminada
          <img
            key={visible}
            src={respaldo}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`pointer-events-none fixed inset-0 h-full w-full scale-110 select-none object-cover blur-xl brightness-[0.45] ${visible}`}
          />
        ),
      )}
    </>
  );
}
