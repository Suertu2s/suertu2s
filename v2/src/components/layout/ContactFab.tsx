"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { OrderLookupCard } from "@/components/home/OrderLookupCard";

export function ContactFab() {
  const pathname = usePathname();
  const panelId = useId();
  const [open, setOpen] = useState(false);

  const hidden =
    pathname.startsWith("/admin") || pathname.startsWith("/afiliados");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (hidden) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[1200] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Consulta tu pedido"
          className="origin-bottom-right animate-[fab-panel-in_280ms_cubic-bezier(0.16,1,0.3,1)] w-[min(100vw-1.5rem,380px)]"
        >
          <OrderLookupCard />
        </div>
      ) : null}

      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={
          open ? "Cerrar consulta de pedido" : "Abrir consulta de pedido"
        }
        onClick={() => setOpen((v) => !v)}
        className="group relative size-[58px] sm:size-[64px] cursor-pointer border-none bg-transparent p-0 transition-transform duration-300 ease-out hover:scale-105 active:scale-95"
      >
        <Image
          src="/images/support-fab.png?v=2"
          alt=""
          width={128}
          height={128}
          priority
          unoptimized
          className="pointer-events-none size-full object-contain drop-shadow-[0_8px_22px_rgba(0,0,0,0.45)]"
        />
        <span className="sr-only">
          {open ? "Cerrar" : "Contacto y consulta de pedido"}
        </span>
      </button>
    </div>
  );
}
