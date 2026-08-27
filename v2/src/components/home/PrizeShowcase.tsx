import { MotorcycleSplitAssemble } from "./MotorcycleSplitAssemble";
import { MotorcycleVideoPlayer } from "./MotorcycleVideoPlayer";

function formatClp(amount: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Valor comercial de la moto 0 km según concesionarias (referencia). */
const MOTORCYCLE_VALUE_CLP = 2_190_000;

const includes = [
  "Moto CORSA R150",
  "Documentación y transferencia",
  "Casco y guantes",
];

const stats = [
  { value: "R150", label: "Motorrad R150" },
  { value: "2026", label: "Año del modelo" },
  { value: "100%", label: "Transferida a tu nombre" },
  { value: "En vivo", label: "Premiación transmitida en vivo" },
];

export function PrizeShowcase() {
  return (
    <section
      id="premio"
      className="pt-16 pb-6 md:pt-24 md:pb-8 px-4 relative overflow-hidden"
    >
      <div className="max-w-6xl mx-auto text-center relative">
        {/* Título Principal */}
        <span className="reveal text-xs uppercase tracking-widest text-brand-greenBright font-bold block">
          El gran premio
        </span>
        <h2 className="reveal reveal-delay-1 display-title text-4xl sm:text-5xl md:text-7xl font-black font-title text-white mt-4">
          MOTORRAD
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-brand-greenBright to-brand-gold">
            CORSA R150
          </span>{" "}
          2026
        </h2>

        {/* Sección Showcase de 2 Columnas: Foto Animada (Izquierda) + Video HD (Derecha) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center my-10 max-w-5xl mx-auto">
          {/* Columna Izquierda: Animación 4 Partes que se Unen con Scroll */}
          <div className="w-full flex items-center justify-center">
            <MotorcycleSplitAssemble />
          </div>

          {/* Columna Derecha: Video Editado en Vivo */}
          <div className="w-full flex items-center justify-center">
            <MotorcycleVideoPlayer />
          </div>
        </div>

        {/* Información Detallada del Premio (Texto original conservado 100%) */}
        <p className="reveal reveal-delay-2 text-brand-muted max-w-2xl mx-auto mt-6 text-sm md:text-lg leading-relaxed">
          Por cada ilustración que adquieras recibes números de regalo. El
          ganador se lleva la motocicleta completamente pagada, con toda la
          documentación al día y transferida a su nombre.
        </p>

        {/* Valor Comercial y Desglose */}
        <p className="reveal reveal-delay-3 text-xs text-brand-muted mt-3">
          Valor comercial de la moto: {formatClp(MOTORCYCLE_VALUE_CLP)} CLP +
          documentación, casco y guantes incluidos.
        </p>

        {/* Badges de lo que incluye el Premio */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {includes.map((item) => (
            <span
              key={item}
              className="reveal reveal-delay-3 text-xs px-4 py-2 rounded-full border border-white/10 bg-white/5 text-brand-cream hover:border-brand-greenBright/40 transition-colors"
            >
              {item}
            </span>
          ))}
        </div>

        {/* Tarjetas de Estadísticas / Garantías del Premio */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`reveal reveal-delay-${i + 1} glass-card rounded-3xl p-6 space-y-2 hover:border-brand-gold/40 transition-all`}
            >
              <p className="text-xl md:text-2xl font-black text-brand-greenBright m-0">
                {stat.value}
              </p>
              <p className="text-xs text-brand-muted m-0 leading-relaxed">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
