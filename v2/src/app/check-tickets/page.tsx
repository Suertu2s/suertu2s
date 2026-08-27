"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { OrderLookupCard } from "@/components/home/OrderLookupCard";

function CheckTicketsContent() {
  const params = useSearchParams();
  const token = params.get("token");

  return (
    <main className="max-w-xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="font-title text-3xl md:text-4xl font-black text-white">
          Consultar tickets
        </h1>
        <p className="text-brand-muted text-sm">
          Ingresa el correo usado en la compra. Te enviaremos un enlace seguro
          para ver tus códigos de participación.
        </p>
      </div>
      <OrderLookupCard lookupToken={token} />
    </main>
  );
}

export default function CheckTicketsPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-xl mx-auto px-4 py-12 text-center text-brand-muted">
          Cargando…
        </main>
      }
    >
      <CheckTicketsContent />
    </Suspense>
  );
}
