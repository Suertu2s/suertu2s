"use client";

import Image from "next/image";
import { useId, useState } from "react";

const faqs = [
  {
    q: "¿Cómo sé cuáles son mis tickets?",
    a: "Recibirás tus ilustraciones digitales y tus tickets gratuitos por correo. También puedes consultarlos aquí con el correo de la compra.",
  },
  {
    q: "¿Es legal esta dinámica en Chile?",
    a: "Sí. Vendemos productos digitales y, de forma promocional, regalamos tickets de participación. Las bases están protocolizadas ante notario.",
  },
  {
    q: "¿Qué medios de pago aceptan?",
    a: "Débito, crédito y cuenta RUT vía Flow (Webpay, Servipag y tarjetas).",
  },
];

type Ticket = {
  code: string;
  number: number;
  orderId: string;
};

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
      />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68 6.34 6.34 0 0 0 9.33 22a6.34 6.34 0 0 0 6.34-6.34V9.37a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.85-.8z" />
    </svg>
  );
}

export function OrderLookupCard() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [faqOpen, setFaqOpen] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setStatus("loading");
    setMessage("");
    setTickets(null);
    try {
      const res = await fetch("/api/tickets/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = (await res.json()) as {
        tickets?: Ticket[];
        error?: string;
      };
      if (res.ok && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
        setStatus("done");
        setMessage(
          data.tickets.length > 0
            ? `Encontramos ${data.tickets.length} código${
                data.tickets.length > 1 ? "s" : ""
              }.`
            : "No encontramos códigos con ese correo todavía.",
        );
      } else {
        setStatus("error");
        setMessage(data.error || "No pudimos consultar. Intenta más tarde.");
      }
    } catch {
      setStatus("error");
      setMessage("No pudimos consultar. Intenta más tarde.");
    }
  };

  return (
    <article className="order-lookup-card w-full max-w-[380px] mx-auto rounded-3xl overflow-hidden bg-white text-neutral-900 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
      <header className="flex items-center gap-3 bg-black px-4 py-3.5 text-white">
        <div className="relative size-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/15">
          <Image
            src="/images/packs/chiloe.webp"
            alt=""
            fill
            className="object-cover"
            sizes="44px"
          />
        </div>
        <div className="min-w-0 leading-tight">
          <h2 className="m-0 text-[17px] font-extrabold tracking-tight">
            Consulta tu pedido
          </h2>
          <p className="m-0 mt-0.5 text-[12px] font-medium text-white/70">
            Revisa aquí tus tickets con tu email
          </p>
        </div>
      </header>

      <div className="space-y-3 bg-white px-4 py-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <label
            htmlFor={emailId}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-neutral-800"
          >
            <MailIcon className="size-3.5 text-neutral-700" />
            Email de tu compra
          </label>
          <input
            id={emailId}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-[14px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-800 focus:ring-2 focus:ring-neutral-900/10"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-black py-3.5 text-[14px] font-extrabold uppercase tracking-wide text-white transition hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60"
          >
            <SearchIcon className="size-4" />
            {status === "loading" ? "Buscando…" : "Buscar"}
          </button>
        </form>

        {message ? (
          <p
            className={`m-0 text-[13px] leading-snug ${
              status === "error" ? "text-red-600" : "text-neutral-700"
            }`}
            role={status === "error" ? "alert" : "status"}
          >
            {message}
          </p>
        ) : null}

        {tickets && tickets.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-neutral-100 p-3">
            {tickets.map((t) => (
              <span
                key={`${t.orderId}-${t.code || t.number}`}
                className="rounded-lg bg-black px-2.5 py-1.5 text-[12px] font-bold tracking-wide text-white"
              >
                {t.code || String(t.number).padStart(5, "0")}
              </span>
            ))}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl bg-neutral-100">
          <button
            type="button"
            onClick={() => setFaqOpen((o) => !o)}
            aria-expanded={faqOpen}
            className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-3 text-left text-[13px] font-semibold text-neutral-800"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-300 text-[12px] font-bold text-neutral-800">
              ?
            </span>
            <span className="flex-1">Preguntas frecuentes</span>
            <svg
              className={`size-4 text-neutral-500 transition-transform duration-300 ${
                faqOpen ? "rotate-180" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
              faqOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <ul className="m-0 space-y-3 border-t border-neutral-200 px-3.5 pb-3.5 pt-3">
                {faqs.map((faq) => (
                  <li key={faq.q} className="list-none">
                    <p className="m-0 text-[12px] font-bold text-neutral-900">
                      {faq.q}
                    </p>
                    <p className="m-0 mt-1 text-[12px] leading-relaxed text-neutral-600">
                      {faq.a}
                    </p>
                  </li>
                ))}
                <li className="list-none pt-1">
                  <a
                    href="/#faq"
                    className="text-[12px] font-semibold text-neutral-800 underline underline-offset-2"
                  >
                    Ver todas las preguntas
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-neutral-100 space-y-2">
          <p className="text-center text-[11px] font-bold uppercase tracking-wider text-neutral-400 m-0">
            Síguenos en redes sociales
          </p>
          <div className="grid grid-cols-3 gap-2">
            <a
              href={
                process.env.NEXT_PUBLIC_FACEBOOK_URL ||
                "https://www.facebook.com/profile.php?id=61590580826151"
              }
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1877F2] py-2.5 px-2 text-[12px] font-bold text-white no-underline shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(24,119,242,0.35)] active:translate-y-0"
            >
              <FacebookIcon className="size-4 shrink-0" />
              <span>Facebook</span>
            </a>

            <a
              href={
                process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
                "https://www.instagram.com/suertu2s/"
              }
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] py-2.5 px-2 text-[12px] font-bold text-white no-underline shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(220,39,67,0.35)] active:translate-y-0"
            >
              <InstagramIcon className="size-4 shrink-0" />
              <span>Instagram</span>
            </a>

            <a
              href={
                process.env.NEXT_PUBLIC_TIKTOK_URL ||
                "https://www.tiktok.com/@suertu2s"
              }
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-black border border-neutral-800 py-2.5 px-2 text-[12px] font-bold text-white no-underline shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-600 hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] active:translate-y-0"
            >
              <TikTokIcon className="size-4 shrink-0" />
              <span>TikTok</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
