import { OrderLookupCard } from "@/components/home/OrderLookupCard";

export default function CheckTicketsPage() {
  return (
    <main className="max-w-xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="font-title text-3xl md:text-4xl font-black text-white">
          Consultar tickets
        </h1>
        <p className="text-brand-muted text-sm">
          Ingresa el correo usado en la compra para ver tus códigos de
          participación.
        </p>
      </div>
      <OrderLookupCard />
    </main>
  );
}
