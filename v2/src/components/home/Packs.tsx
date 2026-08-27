"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatClp, type Pack } from "@/data/packs";
import { useCatalog } from "@/hooks/useCatalog";
import { useCart } from "@/store/cart";
import { triggerLuckEffect } from "@/components/ui/GoldenCloverEffect";
import { PaymentBadges } from "./PaymentBadges";
import { Tilt3D } from "@/components/ui/Tilt3D";

const TRUST_ITEMS = [
  "Bases legales publicadas en esta web",
  "Pago 100% seguro con Flow",
  "Premio garantizado y entregado en transmisión en vivo",
];

function TrustRibbon() {
  return (
    <div
      className="reveal reveal-delay-1 flex flex-wrap justify-center gap-x-5 gap-y-1.5 mb-6"
      aria-label="Garantías"
    >
      {TRUST_ITEMS.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1.5 text-[11px] text-brand-muted tracking-wide"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className="w-3.5 h-3.5 text-brand-greenBright shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm3.28 7.72a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-1.5-1.5a.75.75 0 1 1 1.06-1.06l.97.97 2.97-2.97a.75.75 0 0 1 1.06 0Z"
              clipRule="evenodd"
            />
          </svg>
          {item}
        </span>
      ))}
    </div>
  );
}

export function Packs() {
  const addPack = useCart((s) => s.addPack);
  const router = useRouter();
  const { packs } = useCatalog();
  const [lightbox, setLightbox] = useState<Pack | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  const handleBuy = (e: React.MouseEvent, pack: Pack) => {
    if (buyingId) return;
    triggerLuckEffect(e.clientX, e.clientY);
    addPack(pack.id, 1);
    setBuyingId(pack.id);
    window.setTimeout(() => router.push("/checkout"), 700);
  };

  return (
    <section
      id="comprar"
      className="pt-2 pb-12 md:pt-4 md:pb-16 px-4 scroll-mt-24"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-2 mb-4">
          <h2 className="reveal display-title text-3xl md:text-5xl font-black font-title text-white">
            Adquiere tus{" "}
            <span className="text-brand-gold">Packs de Ilustración</span>
          </h2>
          <p className="reveal reveal-delay-1 text-brand-muted max-w-lg mx-auto text-xs md:text-sm leading-relaxed">
            Elige uno de nuestros 3 paquetes oficiales. Con cada pack recibirás
            espectaculares ilustraciones digitales de paisajes del sur de Chile
            y participaciones gratuitas para tener la oportunidad de llevarte
            una moto.
          </p>
        </div>

        <TrustRibbon />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto items-stretch">
          {packs.map((pack, i) => {
            const isBuying = buyingId === pack.id;
            const orderCls =
              pack.order === 1
                ? "md:order-1"
                : pack.order === 2
                  ? "md:order-2"
                  : "md:order-3";
            return (
              <div
                key={pack.id}
                className={`group pack-card glass-card flex flex-col justify-between p-5 md:p-6 rounded-3xl text-center cursor-pointer relative ${orderCls} ${
                  i === 0 ? "reveal" : `reveal reveal-delay-${i}`
                } ${pack.featured ? "gradient-border" : ""}`}
              >
                {pack.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-greenBright text-black py-0.5 px-3 rounded-full text-[10px] font-extrabold uppercase tracking-wider z-20 shadow-md">
                    MÁS CONVENIENTE
                  </div>
                )}

                <div className="mb-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setLightbox(pack)}
                    aria-label={`Ver ${pack.name} en grande`}
                    className="w-full max-w-[210px] sm:max-w-[230px] mx-auto cursor-zoom-in group-hover:scale-105 transition-transform duration-300"
                  >
                    <Tilt3D className="w-full rounded-2xl overflow-hidden bg-transparent">
                      <Image
                        src={pack.image}
                        alt={pack.name}
                        width={600}
                        height={800}
                        className="w-full h-auto max-h-[220px] object-contain mx-auto rounded-2xl filter drop-shadow-xl"
                        priority={i === 0}
                      />
                    </Tilt3D>
                  </button>
                </div>

                <div>
                  <h3 className="text-lg md:text-xl font-black text-white">
                    {pack.name}
                  </h3>
                  <p className="text-xs text-brand-muted mt-1">
                    +{pack.ticketCount} ticket
                    {pack.ticketCount > 1 ? "s" : ""} gratis
                  </p>
                  <p className="text-white font-extrabold text-2xl md:text-3xl mt-3">
                    {formatClp(pack.priceClp)}{" "}
                    <span className="text-xs text-brand-cream/60">CLP</span>
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isBuying}
                  onClick={(e) => handleBuy(e, pack)}
                  aria-live="polite"
                  className={`btn-buy mt-4 w-full py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer block text-center bg-white/5 text-brand-gold border border-white/15 group-hover:bg-brand-greenBright group-hover:text-black group-hover:border-brand-greenBright group-hover:shadow-[0_10px_25px_rgba(54,240,115,0.35)] ${
                    isBuying
                      ? "!bg-brand-greenBright !text-black !border-brand-greenBright cursor-default"
                      : ""
                  }`}
                >
                  {isBuying ? (
                    <span className="inline-flex items-center justify-center gap-1.5 check-pop">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                        className="w-3.5 h-3.5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm3.28 7.72a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-1.5-1.5a.75.75 0 1 1 1.06-1.06l.97.97 2.97-2.97a.75.75 0 0 1 1.06 0Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      ¡Listo! En carrito
                    </span>
                  ) : (
                    "Comprar"
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <PaymentBadges />
      </div>

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.name}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Cerrar"
              className="absolute -top-12 right-0 sm:-right-2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white hover:bg-brand-greenBright hover:text-black transition-colors cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
            <Image
              src={lightbox.image}
              alt={lightbox.name}
              width={1000}
              height={1333}
              className="w-full h-auto max-h-[75vh] object-contain rounded-2xl mx-auto"
            />
            <p className="text-center text-white mt-3 text-sm font-semibold">
              {lightbox.name} · {formatClp(lightbox.priceClp)} CLP
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
