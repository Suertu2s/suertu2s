import { CONTACT_EMAIL } from "@/lib/site";

export default function PrivacidadPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <h1 className="font-title text-3xl md:text-5xl font-black text-white">
        Política de privacidad
      </h1>
      <div className="prose prose-invert space-y-4 text-brand-muted text-sm leading-relaxed border border-brand-gold/20 rounded-2xl p-6 md:p-8 bg-brand-bgLight/40">
        <p>
          En <strong className="text-brand-cream">SUERTU2S</strong> tratamos tus
          datos personales conforme a la Ley N° 19.628 sobre Protección de la
          Vida Privada y normativa complementaria en Chile.
        </p>

        <h2 className="text-white font-title text-xl font-bold pt-2">
          Datos que recopilamos
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Correo electrónico (obligatorio para la compra y entrega de códigos).</li>
          <li>Nombre completo, RUT y teléfono (cuando los proporciones).</li>
          <li>Datos de transacción: monto, fecha, método de pago (vía Flow.cl).</li>
          <li>Código de embajador referido (opcional).</li>
        </ul>

        <h2 className="text-white font-title text-xl font-bold pt-2">
          Finalidad del tratamiento
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Procesar tu compra y emitir tickets de participación.</li>
          <li>Enviar confirmaciones, códigos e ilustraciones adquiridas.</li>
          <li>Gestionar el sorteo, contactar al ganador y cumplir obligaciones legales.</li>
          <li>Atender consultas y soporte al cliente.</li>
        </ul>

        <h2 className="text-white font-title text-xl font-bold pt-2">
          Conservación y seguridad
        </h2>
        <p>
          Conservamos los datos el tiempo necesario para cumplir las finalidades
          descritas y las obligaciones legales. Utilizamos proveedores con
          estándares de seguridad (Supabase, Flow.cl, Resend) y medidas técnicas
          razonables para proteger la información.
        </p>

        <h2 className="text-white font-title text-xl font-bold pt-2">
          Tus derechos
        </h2>
        <p>
          Puedes solicitar acceso, rectificación, cancelación u oposición al
          tratamiento de tus datos escribiendo a{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-brand-greenBright"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>

        <p className="text-xs text-brand-muted/80 pt-2">
          Última actualización: agosto 2026.
        </p>
      </div>
    </main>
  );
}
