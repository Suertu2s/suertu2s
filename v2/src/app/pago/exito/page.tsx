"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { formatClp } from "@/data/packs";

type ConfirmPayload = {
  ok?: boolean;
  paid?: boolean;
  status?: string;
  orderId?: string;
  email?: string;
  totalClp?: number;
  packs?: Array<{
    id: string;
    name: string;
    image: string;
    ticketCount: number;
  }>;
  tickets?: Array<{ code: string }>;
  prizeName?: string;
  error?: string;
};

function ExitoContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const token = params.get("token");
  const initiallyPending = params.get("pending") === "1";
  const [pending, setPending] = useState(initiallyPending);
  const [confirming, setConfirming] = useState(initiallyPending);
  const [message, setMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConfirmPayload | null>(null);

  async function loadConfirmation(id: string) {
    try {
      const res = await fetch(`/api/payments/order/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as ConfirmPayload;
      if (data.paid) {
        setDetail(data);
        setPending(false);
        setConfirming(false);
      }
      return data;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (!orderId) return;
    void loadConfirmation(orderId);
  }, [orderId]);

  useEffect(() => {
    if (!initiallyPending || !orderId) {
      setConfirming(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 16;

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
          await loadConfirmation(orderId);
          setPending(false);
          setConfirming(false);
          setMessage(
            data.email?.sent === false
              ? "Pago confirmado y códigos emitidos. Si no llega el correo en unos minutos, revisa spam o Contáctanos."
              : "Te enviamos un correo con tus ilustraciones y códigos.",
          );
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
          "Tu pago está en confirmación. En cuanto Flow lo acredite, los códigos llegan solos por correo.",
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

  const paid = Boolean(detail?.paid) && !pending;

  return (
    <main className="max-w-2xl mx-auto px-4 py-12 sm:py-16 space-y-8">
      <div className="text-center space-y-3">
        <p className="m-0 text-brand-gold text-xs font-bold uppercase tracking-[0.2em]">
          Suertu2s
        </p>
        <h1 className="font-title text-4xl sm:text-5xl font-black text-brand-greenBright m-0">
          {pending ? "Confirmando tu pago…" : "¡Compra confirmada!"}
        </h1>
        <p className="text-brand-muted leading-relaxed m-0 max-w-lg mx-auto">
          {pending
            ? confirming
              ? "Flow reportó el cobro. Estamos emitiendo tus códigos y enviando el correo con tus ilustraciones."
              : "Tu pago está siendo confirmado. En cuanto se acredite, verás tus boletos aquí y en tu correo."
            : "Gracias por confiar en Suertu2s. Abajo tienes el resumen de tu compra, tus ilustraciones y tus códigos."}
        </p>
      </div>

      {message ? (
        <p className="text-sm text-brand-gold leading-relaxed m-0 text-center border border-brand-gold/25 rounded-xl px-4 py-3 bg-brand-gold/5">
          {message}
        </p>
      ) : null}

      {paid && detail ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-brand-greenBright/25 bg-brand-green/10 px-5 py-4 space-y-2">
            <p className="m-0 text-white font-bold text-lg">Resumen</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm m-0">
              <dt className="text-brand-muted m-0">Total pagado</dt>
              <dd className="m-0 text-brand-greenBright font-bold text-right">
                {formatClp(detail.totalClp || 0)}
              </dd>
              <dt className="text-brand-muted m-0">Correo</dt>
              <dd className="m-0 text-white text-right break-all">
                {detail.email}
              </dd>
              {detail.prizeName ? (
                <>
                  <dt className="text-brand-muted m-0">Sorteo</dt>
                  <dd className="m-0 text-brand-gold text-right">
                    {detail.prizeName}
                  </dd>
                </>
              ) : null}
            </dl>
          </section>

          {detail.packs && detail.packs.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-title text-xl font-black text-white m-0">
                Tus ilustraciones
              </h2>
              <ul className="m-0 p-0 list-none space-y-3">
                {detail.packs.map((p) => (
                  <li
                    key={p.id}
                    className="flex gap-4 items-center rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-20 h-auto rounded-lg border border-brand-gold/30"
                    />
                    <div>
                      <p className="m-0 text-white font-bold">{p.name}</p>
                      <p className="m-0 text-sm text-brand-greenBright">
                        Incluye {p.ticketCount} ticket
                        {p.ticketCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {detail.tickets && detail.tickets.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-title text-xl font-black text-white m-0">
                Tus códigos de participación
              </h2>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {detail.tickets.map((t) => (
                  <span
                    key={t.code}
                    className="inline-block font-mono text-lg font-black tracking-wider text-white bg-[#062312] border-2 border-brand-greenBright rounded-xl px-4 py-3"
                  >
                    {t.code}
                  </span>
                ))}
              </div>
              <p className="text-xs text-brand-muted m-0">
                También te los enviamos al correo junto con las ilustraciones.
              </p>
            </section>
          ) : null}
        </div>
      ) : null}

      {orderId ? (
        <p className="text-xs text-brand-muted/80 text-center m-0">
          Pedido: {orderId}
        </p>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/check-tickets"
          className="bg-gradient-to-r from-brand-gold to-brand-goldDark text-black font-bold uppercase px-6 py-3 rounded-full no-underline text-center"
        >
          Consultar tickets
        </Link>
        <Link
          href="/"
          className="border border-brand-gold/30 text-brand-cream font-bold uppercase px-6 py-3 rounded-full no-underline text-center"
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
          <p className="text-brand-muted">Cargando confirmación…</p>
        </main>
      }
    >
      <ExitoContent />
    </Suspense>
  );
}
