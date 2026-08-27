"use client";

import { useId } from "react";
import { useTicketLookup } from "@/hooks/useTicketLookup";

export function TicketLookupMini({ large = false }: { large?: boolean }) {
  const emailId = useId();
  const { email, setEmail, phase, status, message, tickets, requestLink } =
    useTicketLookup();

  const handleCopyAll = () => {
    if (!tickets || tickets.length === 0) return;
    const allCodes = tickets
      .map((t) => t.code || String(t.number).padStart(5, "0"))
      .join(", ");
    navigator.clipboard.writeText(allCodes);
  };

  return (
    <div className={`w-full ${large ? "mt-6" : "mt-2"}`}>
      <form onSubmit={requestLink} className="space-y-3">
        <label
          htmlFor={emailId}
          className={`block text-brand-muted ${large ? "text-sm" : "text-[11px]"}`}
        >
          Ingresa el correo de tu compra para recibir un enlace seguro:
        </label>
        <div className="flex gap-2">
          <input
            id={emailId}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className={`flex-1 rounded-full border border-brand-gold/30 bg-brand-bgLight/60 text-brand-cream placeholder:text-brand-muted/60 outline-none focus:border-brand-greenBright focus:ring-1 focus:ring-brand-greenBright/30 ${
              large ? "px-4 py-3 text-sm" : "px-3 py-2 text-xs"
            }`}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className={`shrink-0 rounded-full bg-brand-greenBright text-black font-bold uppercase tracking-wide border-none cursor-pointer disabled:opacity-60 ${
              large ? "px-5 py-3 text-xs" : "px-3 py-2 text-[10px]"
            }`}
          >
            {status === "loading" ? "…" : phase === "verified" ? "OK" : "Enviar"}
          </button>
        </div>
      </form>

      {message ? (
        <p
          className={`mt-2 ${large ? "text-sm" : "text-[11px]"} ${
            status === "error" ? "text-red-300" : "text-brand-muted"
          }`}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}

      {tickets && tickets.length > 0 ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {tickets.map((t) => (
              <span
                key={`${t.orderId}-${t.code || t.number}`}
                className="font-mono text-[11px] font-bold text-brand-greenBright bg-brand-green/10 border border-brand-greenBright/30 rounded-lg px-2 py-1"
              >
                {t.code || String(t.number).padStart(5, "0")}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCopyAll}
            className="text-[10px] text-brand-gold underline bg-transparent border-none cursor-pointer p-0"
          >
            Copiar todos
          </button>
        </div>
      ) : null}
    </div>
  );
}
