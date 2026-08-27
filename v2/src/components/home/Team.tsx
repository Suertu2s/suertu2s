import Image from "next/image";
import { LEGAL_BASES_SHORT } from "@/lib/site";

export function Team() {
  return (
    <section
      id="quienes-somos"
      className="py-12 md:py-20 px-4 max-w-6xl mx-auto"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
        <div className="relative group order-2 md:order-1">
          <div className="relative glass-card rounded-3xl overflow-hidden shadow-2xl p-2">
            <Image
              src="/images/equipo-suertudos.jpg"
              alt="Equipo Suertu2s"
              width={900}
              height={1200}
              className="w-full h-auto object-cover rounded-2xl"
              priority
            />
          </div>
        </div>

        <div className="order-1 md:order-2 space-y-6">
          <span className="reveal text-xs uppercase tracking-widest text-brand-greenBright font-bold block">
            Transparencia y Confianza
          </span>
          <h2 className="reveal reveal-delay-1 display-title text-4xl md:text-5xl font-black font-title text-white leading-tight">
            ¿Quiénes estamos detrás de{" "}
            <span className="text-brand-gold">Suertu2s</span>?
          </h2>
          <p className="reveal reveal-delay-2 text-brand-muted text-base leading-relaxed">
            Somos un equipo de emprendedores de Puerto Montt que busca compartir
            el arte y los paisajes del sur de Chile a través de ilustraciones
            digitales.
          </p>
          <p className="reveal reveal-delay-2 text-brand-muted text-base leading-relaxed">
            En Suertu2s vendemos ilustraciones digitales originales. Como
            beneficio adicional, algunas compras pueden incluir participaciones
            promocionales sin costo adicional en campañas con premios, sujetas a
            sus respectivas bases legales.
          </p>
          <p className="reveal reveal-delay-2 text-brand-muted text-base leading-relaxed">
            Nuestro compromiso es mantener un proceso claro, transparente y con
            las mismas condiciones para todos los participantes.
          </p>
          <ul className="space-y-3 mt-4">
            {[
              `Bases legales publicadas ${LEGAL_BASES_SHORT}`,
              "Entrega garantizada del premio",
              "Transmisión en vivo de la premiación",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-brand-greenBright flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm text-brand-cream">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
