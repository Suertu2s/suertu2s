import type { Metadata } from "next";
import {
  CONTACT_EMAIL,
  DEFAULT_SITE_URL,
  LEGAL_ADDRESS,
  LEGAL_BUSINESS_NAME,
  LEGAL_RUT,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "Bases legales del sorteo",
  description:
    "Bases de la promoción SUERTU2S: compra de ilustraciones digitales y participación por MOTORRAD CORSA R150 0km 2026.",
  alternates: { canonical: "/bases-legales" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Bases legales — MOTORRAD CORSA R150 0km 2026",
  description:
    "Bases de la premiación promocional SUERTU2S vinculada a la compra de packs de ilustración digital.",
  areaServed: "Chile",
};

export default function BasesLegalesPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="font-title text-3xl md:text-5xl font-black text-white">
        Bases legales del sorteo
      </h1>
      <div className="prose prose-invert space-y-4 text-brand-muted text-sm leading-relaxed border border-brand-gold/20 rounded-2xl p-6 md:p-8 bg-brand-bgLight/40">
        <p>
          <strong className="text-brand-cream">SUERTU2S</strong> comercializa
          productos digitales (ilustraciones fotográficas del sur de Chile y la
          Patagonia). De forma promocional, cada pack incluye tickets de
          participación para el sorteo vigente, conforme a la normativa chilena
          aplicable a promociones comerciales.
        </p>

        <h2 className="text-white font-title text-xl font-bold pt-2">
          Organizador
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-brand-cream">Razón social / marca:</strong>{" "}
            {LEGAL_BUSINESS_NAME}
          </li>
          <li>
            <strong className="text-brand-cream">RUT:</strong> {LEGAL_RUT}
          </li>
          <li>
            <strong className="text-brand-cream">Domicilio:</strong>{" "}
            {LEGAL_ADDRESS}
          </li>
        </ul>

        <h2 className="text-white font-title text-xl font-bold pt-2">
          Premio
        </h2>
        <p>
          El gran premio del ciclo vigente es una{" "}
          <strong className="text-brand-cream">
            MOTORRAD CORSA R150 0km 2026
          </strong>
          , entregada con documentación al día, transferencia a nombre del
          ganador y accesorios indicados en la campaña (casco y guantes cuando
          aplique).
        </p>

        <h2 className="text-white font-title text-xl font-bold pt-2">
          Mecánica de participación
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            La participación está vinculada a la compra de un pack de
            ilustración digital en{" "}
            <a href={DEFAULT_SITE_URL} className="text-brand-greenBright">
              {DEFAULT_SITE_URL.replace("https://", "")}
            </a>
            .
          </li>
          <li>
            Tras confirmarse el pago, se asignan automáticamente códigos de
            participación (prefijo de campaña + 5 dígitos).
          </li>
          <li>
            Cada código es único e intransferible. El comprador recibe sus
            códigos por correo electrónico y puede consultarlos en el sitio.
          </li>
          <li>
            Solo pueden participar personas mayores de 18 años con domicilio en
            Chile, salvo restricciones legales aplicables.
          </li>
        </ul>

        <h2 className="text-white font-title text-xl font-bold pt-2">
          Sorteo y premiación
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            El sorteo se realiza en transmisión en vivo, con ministro de fe,
            mediante tómbola sobre los códigos válidos emitidos en el ciclo.
          </li>
          <li>
            El ganador será contactado al correo registrado en la compra y
            deberá acreditar su identidad para retirar el premio.
          </li>
          <li>
            El plazo para reclamar el premio y la documentación requerida se
            comunicará en la transmisión y por correo al ganador.
          </li>
        </ul>

        <h2 className="text-white font-title text-xl font-bold pt-2">
          Embajadores y referidos
        </h2>
        <p>
          Los códigos de embajadores o vendedores son opcionales al momento de la
          compra. No modifican el valor del pack ni las probabilidades de
          ganar; solo identifican la referencia comercial.
        </p>

        <h2 className="text-white font-title text-xl font-bold pt-2">
          Contacto
        </h2>
        <p>
          Consultas sobre bases, participación o premiación:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-brand-greenBright"
          >
            {CONTACT_EMAIL}
          </a>
          . Política de tratamiento de datos en{" "}
          <a href="/privacidad" className="text-brand-greenBright">
            /privacidad
          </a>
          .
        </p>

        <p className="text-xs text-brand-muted/80 pt-2">
          Última actualización: agosto 2026. SUERTU2S se reserva el derecho de
          modificar estas bases con publicación previa en este sitio cuando la
          normativa o la operación del sorteo lo requieran.
        </p>
      </div>
    </main>
  );
}
