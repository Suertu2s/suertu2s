import Link from "next/link";

export default function NotFound() {
  return (
    <main className="max-w-lg mx-auto px-4 py-20 text-center space-y-6">
      <p className="m-0 text-brand-gold text-xs font-bold uppercase tracking-[0.2em]">
        Suertu2s
      </p>
      <h1 className="font-title text-5xl font-black text-white m-0">404</h1>
      <p className="text-brand-muted m-0">
        Esta página no existe o fue movida.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/"
          className="bg-gradient-to-r from-brand-gold to-brand-goldDark text-black font-bold uppercase px-6 py-3 rounded-full no-underline"
        >
          Ir al inicio
        </Link>
        <Link
          href="/check-tickets"
          className="border border-brand-gold/30 text-brand-cream font-bold uppercase px-6 py-3 rounded-full no-underline"
        >
          Consultar tickets
        </Link>
      </div>
    </main>
  );
}
