"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useState, type ReactNode } from "react";
import { useAdmin } from "./AdminContext";

const NAV: Array<{
  href: string;
  label: string;
  exact?: boolean;
  manualOnly?: boolean;
}> = [
  { href: "/admin", label: "Resumen", exact: true },
  { href: "/admin/analytics", label: "Analítica" },
  { href: "/admin/orders", label: "Pedidos" },
  { href: "/admin/manual-sales", label: "Venta POS", manualOnly: true },
  { href: "/admin/customers", label: "Clientes" },
  { href: "/admin/tickets", label: "Códigos" },
  { href: "/admin/raffles", label: "Sorteos" },
  { href: "/admin/affiliates", label: "Afiliados" },
  { href: "/admin/settings", label: "Ajustes" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const {
    authed,
    authReady,
    email,
    displayName,
    mustChangePassword,
    canManualSales,
    from,
    to,
    loading,
    error,
    setFrom,
    setTo,
    setError,
    login,
    changePassword,
    logout,
    bumpRefresh,
  } = useAdmin();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [changePasswordBusy, setChangePasswordBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!authReady) {
    return (
      <div className="admin-app min-h-screen flex items-center justify-center text-brand-muted text-sm">
        Verificando sesión…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="admin-app min-h-screen flex items-center justify-center px-4">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            setLoginBusy(true);
            setError(null);
            void login(loginEmail, loginPassword)
              .catch((err) =>
                setError(
                  err instanceof Error ? err.message : "No se pudo entrar",
                ),
              )
              .finally(() => setLoginBusy(false));
          }}
          className="w-full max-w-md gradient-border border border-white/10 rounded-2xl p-8 bg-brand-bgLight/60 space-y-5"
        >
          <div>
            <p className="text-brand-gold text-xs font-bold uppercase tracking-widest m-0">
              Suertu2s
            </p>
            <h1 className="font-title text-3xl font-black text-white m-0 mt-1">
              Panel administrador
            </h1>
            <p className="text-sm text-brand-muted m-0 mt-2">
              Sesión segura con cuenta individual y contraseña propia.
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase text-brand-muted font-semibold">
              Correo del administrador
            </span>
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white"
              placeholder="admin@suertu2s.cl"
              autoComplete="username"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase text-brand-muted font-semibold">
              Contraseña
            </span>
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>
          <button
            type="submit"
            disabled={loginBusy}
            className="w-full bg-brand-greenBright text-black font-bold uppercase py-3 rounded-full border-none cursor-pointer disabled:opacity-60"
          >
            {loginBusy ? "Entrando…" : "Entrar"}
          </button>
          {error && <p className="text-red-300 text-sm m-0">{error}</p>}
        </form>
      </div>
    );
  }

  if (mustChangePassword) {
    return (
      <div className="admin-app min-h-screen flex items-center justify-center px-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setChangePasswordBusy(true);
            setError(null);
            void changePassword(newPassword, newPasswordConfirmation)
              .catch((err) =>
                setError(
                  err instanceof Error
                    ? err.message
                    : "No se pudo cambiar la contraseña",
                ),
              )
              .finally(() => setChangePasswordBusy(false));
          }}
          className="w-full max-w-md gradient-border border border-white/10 rounded-2xl p-8 bg-brand-bgLight/60 space-y-5"
        >
          <div>
            <p className="text-brand-gold text-xs font-bold uppercase tracking-widest m-0">
              {displayName}
            </p>
            <h1 className="font-title text-3xl font-black text-white m-0 mt-1">
              Cambia tu contraseña
            </h1>
            <p className="text-sm text-brand-muted m-0 mt-2">
              Debes definir una contraseña nueva antes de entrar al panel. Usa
              al menos 12 caracteres.
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase text-brand-muted font-semibold">
              Nueva contraseña
            </span>
            <input
              type="password"
              required
              minLength={12}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white"
              autoComplete="new-password"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase text-brand-muted font-semibold">
              Repite la contraseña
            </span>
            <input
              type="password"
              required
              minLength={12}
              value={newPasswordConfirmation}
              onChange={(event) =>
                setNewPasswordConfirmation(event.target.value)
              }
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white"
              autoComplete="new-password"
            />
          </label>
          <button
            type="submit"
            disabled={changePasswordBusy}
            className="w-full bg-brand-greenBright text-black font-bold uppercase py-3 rounded-full border-none cursor-pointer disabled:opacity-60"
          >
            {changePasswordBusy ? "Guardando…" : "Guardar contraseña"}
          </button>
          {error && <p className="text-red-300 text-sm m-0">{error}</p>}
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full text-xs text-brand-gold bg-transparent border border-brand-gold/30 px-3 py-2 rounded-lg cursor-pointer"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-app min-h-screen flex bg-transparent text-brand-cream">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-white/10 bg-[#041008] p-4 flex flex-col transition-transform md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8">
          <p className="text-brand-gold text-[10px] font-bold uppercase tracking-[0.2em] m-0">
            Suertu2s Ops
          </p>
          <h1 className="font-title text-xl font-black text-white m-0 mt-1">
            Administración
          </h1>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.filter((item) => !item.manualOnly || canManualSales).map(
            (item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-semibold no-underline transition-colors ${
                    active
                      ? "bg-brand-greenBright text-black"
                      : "text-brand-cream/80 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            },
          )}
        </nav>
        <div className="pt-4 border-t border-white/10 space-y-2">
          <p className="text-xs text-brand-muted m-0 truncate">{email}</p>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-xs text-brand-gold bg-transparent border border-brand-gold/30 px-3 py-1.5 rounded-lg cursor-pointer w-full"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-black/60 md:hidden border-none"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex-1 md:ml-64 min-w-0">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-brand-bg/90 backdrop-blur px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden text-sm border border-white/15 rounded-lg px-3 py-1.5 bg-transparent text-white cursor-pointer"
              onClick={() => setMobileOpen(true)}
            >
              Menú
            </button>
            <div>
              <p className="text-xs text-brand-muted m-0">Rango de análisis</p>
              <p className="text-sm text-white font-semibold m-0">
                Operaciones en vivo
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] text-brand-muted">
              Desde
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block bg-brand-bg border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm"
              />
            </label>
            <label className="text-[11px] text-brand-muted">
              Hasta
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block bg-brand-bg border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setError(null);
                bumpRefresh();
              }}
              className="bg-brand-gold text-black font-bold text-sm px-4 py-2 rounded-lg border-none cursor-pointer"
            >
              {loading ? "Cargando…" : "Actualizar"}
            </button>
          </div>
        </header>

        <main className="p-4 md:p-6 space-y-5 max-w-7xl">
          {error && (
            <p className="text-red-300 text-sm border border-red-400/30 rounded-lg p-3 m-0">
              {error}
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
