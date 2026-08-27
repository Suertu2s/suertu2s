"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ExitoContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const token = params.get("token");
  const initiallyPending = params.get("pending") === "1";
  const [pending, setPending] = useState(initiallyPending);
  const [confirming, setConfirming] = useState(initiallyPending);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!initiallyPending || !orderId) {
      setConfirming(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12;

    const tick = async () => {
      attempts += 1;
      try {
        const res = await fetch("/api/payments/flow/reconcile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            ...(token ? { token } : {}),
          }),
        });
        const data = (await res.json()) as {
          paid?: boolean;
          error?: string;
          email?: { sent?: boolean; reason?: string };
        };

        if (cancelled) return;

        if (data.paid) {
          setPending(false);
          setConfirming(false);
          setMessage(
            data.email?.sent === false
              ? "Pago confirmado y códigos emitidos. Si no llega el correo en unos minutos, revisa spam o Contáctanos."
              : null,
          );
          // Quitar pending de la URL sin recargar fuerte
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("pending");
            url.searchParams.delete("token");
            window.history.replaceState({}, "", url.toString());
          }
          return;
        }
      } catch {
        // reintentar
      }

      if (cancelled) return;
      if (attempts >= maxAttempts) {
        setConfirming(false);
        setMessage(
          "Tu pago sigue en confirmación. En cuanto Flow lo acredite, los códigos se envían solos por correo y la venta aparece en el panel.",
        );
        return;
      }
      window.setTimeout(() => {
        void tick();
      }, 2500);
    };

    void tick();
    return () => {
      cancelled = true;
    };
  }, [initiallyPending, orderId, token]);

  return (
    <main className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
      <h1 className="font-title text-4xl font-black text-brand-greenBright">
        {pending ? "Confirmando tu pago…" : "¡Pago exitoso!"}
      </h1>
      <p className="text-brand-muted leading-relaxed">
        {pending
          ? confirming
            ? "Flow reportó el pago. Estamos emitiendo tus códigos y enviando el correo automáticamente — no necesitas que un admin lo apruebe."
            : "Tu pago está siendo confirmado. En cuanto se acredite, el sistema envía los códigos por correo y registra la venta solo."
          : "Gracias por tu compra. Tus ilustraciones y tickets de participación fueron enviados a tu correo."}
      </p>
      {message ? (
        <p className="text-sm text-brand-gold leading-relaxed m-0">{message}</p>
      ) : null}
      {orderId ? (
        <p className="text-xs text-brand-muted/80">Pedido: {orderId}</p>
      ) : null}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/check-tickets"
          className="bg-gradient-to-r from-brand-gold to-brand-goldDark text-black font-bold uppercase px-6 py-3 rounded-full no-underline"
        >
          Consultar tickets
        </Link>
        <Link
          href="/"
          className="border border-brand-gold/30 text-brand-cream font-bold uppercase px-6 py-3 rounded-full no-underline"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}

export default function PagoExitoPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-brand-muted">Cargando…</p>
        </main>
      }
    >
      <ExitoContent />
    </Suspense>
  );
}
