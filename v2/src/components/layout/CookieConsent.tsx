"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "suertu2s_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed bottom-0 inset-x-0 z-[1200] p-4 sm:p-6 pointer-events-none"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-brand-gold/25 bg-[#07130a]/96 backdrop-blur-md p-4 sm:p-5 shadow-2xl pointer-events-auto">
        <p className="m-0 text-sm text-brand-muted leading-relaxed">
          Usamos cookies técnicas para el carrito, sesiones de administración y
          afiliados. Al continuar navegando aceptas su uso conforme a nuestra{" "}
          <Link href="/privacidad" className="text-brand-greenBright underline">
            política de privacidad
          </Link>
          .
        </p>
        <div className="mt-3 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(STORAGE_KEY, "accepted");
              } catch {
                // ignore
              }
              setVisible(false);
            }}
            className="cursor-pointer rounded-full bg-brand-greenBright text-black font-bold uppercase text-xs px-5 py-2.5 border-none"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
