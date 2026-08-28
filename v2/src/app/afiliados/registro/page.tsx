"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function RegistrationContent() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/affiliate/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationToken: token, ...form }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(data.error || "No se pudo registrar");
      setMessage(data.message || "Registro recibido.");
      setForm({ name: "", email: "", phone: "", password: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-title text-3xl font-black text-white m-0">
            Invitación no válida
          </h1>
          <p className="text-brand-muted m-0">
            Necesitas abrir esta página desde el enlace que te compartió un
            colaborador Suertudos.
          </p>
          <Link href="/afiliados" className="text-brand-gold no-underline">
            Ir al portal de afiliados
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg gradient-border border border-white/10 rounded-2xl p-8 bg-brand-bgLight/60 space-y-5"
      >
        <div>
          <p className="text-brand-gold text-xs font-bold uppercase tracking-widest m-0">
            Invitación Suertudos
          </p>
          <h1 className="font-title text-3xl font-black text-white m-0 mt-1">
            Únete como colaborador
          </h1>
          <p className="text-sm text-brand-muted m-0 mt-2">
            Completa tus datos y comienza a vender inmediatamente con tu propio
            código y enlace.
          </p>
        </div>
        {(["name", "email", "phone", "password"] as const).map((field) => (
          <label key={field} className="block space-y-1.5">
            <span className="text-xs uppercase text-brand-muted font-semibold">
              {field === "name"
                ? "Nombre completo"
                : field === "email"
                  ? "Email"
                  : field === "phone"
                    ? "Teléfono"
                    : "Contraseña"}
            </span>
            <input
              required
              type={
                field === "email"
                  ? "email"
                  : field === "phone"
                    ? "tel"
                    : field === "password"
                      ? "password"
                      : "text"
              }
              value={form[field]}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [field]: event.target.value,
                }))
              }
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white"
              autoComplete={field === "password" ? "new-password" : field}
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-brand-greenBright text-black font-bold uppercase py-3 rounded-full border-none cursor-pointer disabled:opacity-60"
        >
          {busy ? "Registrando…" : "Crear mi cuenta"}
        </button>
        {message && (
          <p className="text-brand-greenBright text-sm m-0">{message}</p>
        )}
        {error && <p className="text-red-300 text-sm m-0">{error}</p>}
      </form>
    </main>
  );
}

export default function AffiliateRegistrationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <p className="text-brand-muted">Cargando invitación…</p>
        </main>
      }
    >
      <RegistrationContent />
    </Suspense>
  );
}
