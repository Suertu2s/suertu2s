"use client";

import { useState } from "react";
import { LEGAL_BASES_SHORT } from "@/lib/site";

const faqs = [
  {
    q: "¿Cómo sé cuáles son mis tickets de participación?",
    a: "Recibirás tus ilustraciones digitales y tu ticket(s) gratuitos de participación en el premio por la moto. Cada Ticket viene constituido con 5 dígitos aleatorios (no correlativos) acompañado de la abreviatura correspondiente a la campaña activa. También puedes solicitar un enlace seguro en Consultar Ticket con el correo de compra.",
  },
  {
    q: "¿Es legal esta dinámica y premiación en Chile?",
    a: `Sí. Comercializamos productos digitales (ilustraciones fotográficas de la Patagonia). De forma promocional y completamente legal, regalamos tickets de participación ${LEGAL_BASES_SHORT}.`,
  },
  {
    q: "¿Qué incluye la MOTORRAD CORSA R150 2026?",
    a: "Se entrega la motocicleta año 2026, con toda su documentación al día, transferida completamente al nombre del ganador(a), cubierto por el equipo de SUERTU2S.",
  },
  {
    q: "¿Cuáles son los medios de pago disponibles?",
    a: "Aceptamos tarjetas de débito (Redcompra), cuenta RUT y tarjetas de crédito de cualquier banco nacional mediante la pasarela segura de Flow (Webpay, Servipag y tarjetas).",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="reveal display-title text-4xl md:text-5xl font-black font-title text-center text-white mb-10">
          Preguntas Frecuentes
        </h2>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={faq.q}
              className={`faq-item glass-card rounded-2xl overflow-hidden ${
                open === i ? "open" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left cursor-pointer group bg-transparent border-none"
              >
                <span className="text-base font-bold text-brand-cream group-hover:text-brand-gold transition-colors">
                  {faq.q}
                </span>
                <span className="transition-transform duration-300 group-hover:translate-y-0.5 flex-shrink-0 ml-3">
                  <svg
                    className="faq-icon w-5 h-5 text-brand-gold transition-transform duration-300 block"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </button>
              <div className="faq-content">
                <div className="px-5 pb-5 text-sm text-brand-muted leading-relaxed">
                  {faq.a}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
