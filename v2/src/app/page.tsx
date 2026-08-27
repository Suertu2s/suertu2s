import { Marquee } from "@/components/layout/Marquee";
import { TicketLookupMini } from "@/components/layout/TicketLookupMini";
import { Hero } from "@/components/home/Hero";
import { Team } from "@/components/home/Team";
import { PrizeShowcase } from "@/components/home/PrizeShowcase";
import { Packs } from "@/components/home/Packs";
import { HowItWorks } from "@/components/home/HowItWorks";
import { FAQ } from "@/components/home/FAQ";
import { PACKS } from "@/data/packs";
import { absoluteUrl } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Packs de Ilustración del Sur de Chile",
  description:
    "Adquiere ilustraciones digitales de paisajes del sur de Chile y participa por una MOTORRAD CORSA R150 0km 2026.",
  brand: { "@type": "Brand", name: "Suertudos Premios" },
  offers: {
    "@type": "Offer",
    priceCurrency: "CLP",
    availability: "https://schema.org/InStock",
    offers: PACKS.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: p.priceClp,
      priceCurrency: "CLP",
      url: absoluteUrl("/#comprar"),
      itemOffered: {
        "@type": "Product",
        name: p.name,
        image: absoluteUrl(p.image),
      },
    })),
  },
};

const divider = <hr className="section-divider" aria-hidden="true" />;

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Marquee />
      <main className="w-full block">
        <Hero />
        {divider}
        <PrizeShowcase />
        {divider}
        <Packs />
        {divider}
        <Team />
        {divider}
        <HowItWorks />
        {divider}
        <section id="consulta-codigos" className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card rounded-3xl p-6 sm:p-10 text-center">
              <h2 className="reveal display-title text-3xl md:text-5xl font-black font-title text-white">
                ¿Ya participaste?
              </h2>
              <p className="reveal reveal-delay-1 text-brand-muted text-sm md:text-base max-w-xl mx-auto mt-3">
                Consulta tus códigos de participación con el correo que usaste
                en tu compra:
              </p>
              <div className="max-w-xl mx-auto">
                <TicketLookupMini large />
              </div>
            </div>
          </div>
        </section>
        <FAQ />
      </main>
    </>
  );
}
