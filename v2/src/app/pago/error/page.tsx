"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CONTACT_EMAIL } from "@/lib/site";

const REASON_MESSAGES: Record<string, string> = {
  mock_disabled: "Los pagos de prueba no están habilitados en este momento.",
  rate_limit: "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
};

function ErrorContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const reason = params.get("reason");
  const detail =
    (reason && REASON_MESSAGES[reason]) ||
    (reason === "no_token"
      ? `No recibimos el comprobante de Flow. Si te descontaron el dinero, escribe a ${CONTACT_EMAIL} con el comprobante y te ayudamos.`
      : reason === "flow_error"
        ? "Hubo un problema técnico al volver de Flow. Si te cobraron, no vuelvas a pagar: contáctanos con el comprobante."
        : "Hubo un problema al procesar el pago. Si te descontaron el dinero, no reintentes: contáctanos.");


  return (
    <main className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
      <h1 className="font-title text-4xl font-black text-red-300">
        Pago no completado
      </h1>
      <p className="text-brand-muted leading-relaxed">{detail}</p>
      {orderId ? (
        <p className="text-xs text-brand-muted/80">Pedido: {orderId}</p>
      ) : null}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/checkout"
          className="bg-gradient-to-r from-brand-gold to-brand-goldDark text-black font-bold uppercase px-6 py-3 rounded-full no-underline"
        >
          Reintentar
        </Link>
        <Link
          href="/checkout"
          className="border border-brand-gold/30 text-brand-cream font-bold uppercase px-6 py-3 rounded-full no-underline"
        >
          Volver al checkout
        </Link>
      </div>
    </main>
  );
}

export default function PagoErrorPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-brand-muted">Cargando…</p>
        </main>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
