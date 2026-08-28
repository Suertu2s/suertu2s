"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { formatClp } from "@/data/packs";

type PublicAffiliate = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  commission_type: "percent" | "fixed";
  commission_value: number;
};

type Dashboard = {
  affiliate: PublicAffiliate;
  shareUrl: string;
  summary: {
    ordersPaid: number;
    salesClp: number;
    commissionEarnedClp: number;
    commissionPaidClp: number;
    commissionBalanceClp: number;
    commissionLabel: string;
    sellerCommissionClp: number;
    directReferralCommissionClp: number;
    directTickets: number;
    directReferrals: number;
    levelRatePercent: number;
    escalationTickets: number;
    ticketsRemaining: number;
    rank: number;
    totalAffiliates: number;
  };
  recentSales: Array<{
    id: string;
    paidAt: string;
    totalClp: number;
    emailMasked: string;
    commissionClp: number;
    commissionRatePercent: number;
  }>;
  payouts: Array<{
    id: string;
    amountClp: number;
    paidAt: string;
    periodFrom: string;
    periodTo: string;
    note: string | null;
  }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function AffiliatePortalPage() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [copied, setCopied] = useState<"link" | "code" | "qr" | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);

  const loadDashboard = useCallback(async () => {
    const res = await fetch("/api/affiliate/dashboard", {
      credentials: "include",
    });
    if (res.status === 401) {
      setAuthed(false);
      setData(null);
      return;
    }
    const json = (await res.json()) as Dashboard & { error?: string };
    if (!res.ok) throw new Error(json.error || "No se pudo cargar");
    setData(json);
    setAuthed(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetch("/api/affiliate/me", { credentials: "include" });
        if (cancelled) return;
        if (me.ok) {
          await loadDashboard();
        } else {
          setAuthed(false);
        }
      } catch {
        if (!cancelled) setAuthed(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliate/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Credenciales inválidas");
      await loadDashboard();
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
    } finally {
      setLoginBusy(false);
    }
  }

  async function onLogout() {
    await fetch("/api/affiliate/logout", {
      method: "POST",
      credentials: "include",
    });
    setAuthed(false);
    setData(null);
  }

  useEffect(() => {
    if (!data?.shareUrl) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(data.shareUrl, {
      width: 320,
      margin: 2,
      color: { dark: "#020503", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl(null);
          setError("No se pudo generar el código QR.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [data?.shareUrl]);

  function flashCopied(kind: "link" | "code" | "qr") {
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyLink() {
    if (!data?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setError(null);
      flashCopied("link");
    } catch {
      setError("No se pudo copiar el enlace. Cópialo manualmente.");
    }
  }

  async function copyCode() {
    if (!data?.affiliate.code) return;
    try {
      await navigator.clipboard.writeText(data.affiliate.code);
      setError(null);
      flashCopied("code");
    } catch {
      setError("No se pudo copiar el código.");
    }
  }

  async function createInvite() {
    setInviteBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliate/invitation", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as {
        inviteUrl?: string;
        error?: string;
      };
      if (!res.ok || !json.inviteUrl) {
        throw new Error(json.error || "No se pudo crear la invitación");
      }
      setInviteUrl(json.inviteUrl);
      await navigator.clipboard.writeText(json.inviteUrl);
      flashCopied("link");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear el enlace de invitación",
      );
    } finally {
      setInviteBusy(false);
    }
  }

  async function copyQr() {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type || "image/png"]: blob }),
        ]);
        setError(null);
        flashCopied("qr");
        return;
      }
      throw new Error("clipboard-image-unsupported");
    } catch {
      // Fallback: descargar PNG si el navegador no deja copiar imágenes
      downloadQr();
      setError(
        "Tu navegador no permite copiar la imagen. Se descargó el QR como archivo.",
      );
    }
  }

  function downloadQr() {
    if (!qrDataUrl || !data) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `suertu2s-${data.affiliate.code}-qr.png`;
    a.click();
  }

  if (!ready) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16 text-brand-muted text-sm">
        Cargando portal…
      </main>
    );
  }

  if (!authed || !data) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <form
          onSubmit={onLogin}
          className="w-full max-w-md gradient-border border border-white/10 rounded-2xl p-8 bg-brand-bgLight/60 space-y-5"
        >
          <div>
            <p className="text-brand-gold text-xs font-bold uppercase tracking-widest m-0">
              Portal afiliados
            </p>
            <h1 className="font-title text-3xl font-black text-white m-0 mt-1">
              Bienvenido, embajador
            </h1>
            <p className="text-sm text-brand-muted m-0 mt-2">
              Entra con el email y la contraseña que te dio el equipo Suertu2s.
              Aquí ves tus ventas, tu saldo y tu enlace para compartir.
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase text-brand-muted font-semibold">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white"
              placeholder="tu@email.cl"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
      </main>
    );
  }

  const { affiliate, summary, recentSales, payouts, shareUrl } = data;

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-brand-gold text-xs font-bold uppercase tracking-widest m-0">
            Portal afiliados
          </p>
          <h1 className="font-title text-3xl md:text-4xl font-black text-white m-0 mt-1">
            Hola, {affiliate.name}
          </h1>
          <p className="text-sm text-brand-muted m-0 mt-1">
            Código{" "}
            <span className="text-brand-greenBright font-bold">
              {affiliate.code}
            </span>{" "}
            · {summary.commissionLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="text-sm border border-white/15 rounded-lg px-4 py-2 bg-transparent text-white cursor-pointer"
        >
          Salir
        </button>
      </div>

      <section className="gradient-border border border-brand-greenBright/30 rounded-2xl p-5 bg-brand-green/10 space-y-5">
        <div className="space-y-3">
          <h2 className="text-white font-bold text-sm uppercase tracking-wide m-0">
            Comparte tu referido
          </h2>
          <p className="text-sm text-brand-muted m-0">
            Quien compre con este enlace, QR o código queda asociado a ti.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-brand-bg border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm"
            />
            <button
              type="button"
              onClick={() => void copyLink()}
              className="bg-brand-greenBright text-black font-bold text-sm px-5 py-2.5 rounded-lg border-none cursor-pointer"
            >
              {copied === "link" ? "¡Enlace copiado!" : "Copiar enlace"}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={affiliate.code}
              className="flex-1 bg-brand-bg border border-white/10 rounded-lg px-3 py-2.5 text-brand-greenBright font-bold tracking-wider text-sm"
            />
            <button
              type="button"
              onClick={() => void copyCode()}
              className="bg-brand-bg text-brand-gold border border-brand-gold/40 font-bold text-sm px-5 py-2.5 rounded-lg cursor-pointer"
            >
              {copied === "code" ? "¡Código copiado!" : "Copiar código"}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 border-t border-white/10 pt-5">
          <div className="shrink-0 rounded-xl bg-white p-3 border border-white/20">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`Código QR de referido ${affiliate.code}`}
                width={180}
                height={180}
                className="w-[180px] h-[180px] block"
              />
            ) : (
              <div className="w-[180px] h-[180px] flex items-center justify-center text-brand-muted text-xs text-center px-3">
                Generando QR…
              </div>
            )}
          </div>
          <div className="space-y-3 text-center sm:text-left flex-1">
            <h3 className="text-white font-bold text-sm m-0 uppercase tracking-wide">
              Código QR
            </h3>
            <p className="text-sm text-brand-muted m-0">
              Ideal para Stories, afiches o WhatsApp. Quien lo escanee llega a
              tu enlace con el código{" "}
              <strong className="text-white">{affiliate.code}</strong>.
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              <button
                type="button"
                disabled={!qrDataUrl}
                onClick={() => void copyQr()}
                className="bg-brand-greenBright text-black font-bold text-sm px-5 py-2.5 rounded-lg border-none cursor-pointer disabled:opacity-50"
              >
                {copied === "qr" ? "¡QR copiado!" : "Copiar QR"}
              </button>
              <button
                type="button"
                disabled={!qrDataUrl}
                onClick={downloadQr}
                className="bg-brand-bg text-white border border-white/20 font-bold text-sm px-5 py-2.5 rounded-lg cursor-pointer disabled:opacity-50"
              >
                Descargar PNG
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="border border-brand-gold/30 rounded-2xl p-5 bg-brand-gold/5 space-y-3">
        <h2 className="text-white font-bold text-sm uppercase tracking-wide m-0">
          Invita colaboradores
        </h2>
        <p className="text-sm text-brand-muted m-0">
          Invita vendedores directamente. Recibirás 3% de sus ventas, sin
          niveles adicionales.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={inviteUrl || "Genera un enlace único de invitación"}
            className="flex-1 bg-brand-bg border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm"
          />
          <button
            type="button"
            onClick={() => void createInvite()}
            disabled={inviteBusy}
            className="bg-brand-gold text-black font-bold text-sm px-5 py-2.5 rounded-lg border-none cursor-pointer disabled:opacity-60"
          >
            {inviteBusy ? "Generando…" : "Generar y copiar"}
          </button>
        </div>
      </section>

      <section className="border border-brand-gold/30 rounded-2xl p-5 bg-brand-bgLight/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-white font-bold text-sm uppercase tracking-wide m-0">
            Tu nivel comercial
          </h2>
          <span className="text-brand-gold font-black text-lg">
            {summary.levelRatePercent}% por venta
          </span>
        </div>
        <div className="flex justify-between text-sm text-brand-muted">
          <span>{summary.directTickets} tickets directos pagados</span>
          <span>Meta: {summary.escalationTickets}</span>
        </div>
        <div className="h-3 rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full bg-brand-gold transition-all"
            style={{
              width: `${Math.min(
                100,
                (summary.directTickets / summary.escalationTickets) * 100,
              )}%`,
            }}
          />
        </div>
        <p className="text-sm text-brand-muted m-0">
          {summary.ticketsRemaining > 0
            ? `Te faltan ${summary.ticketsRemaining} tickets para subir al 12%.`
            : "Ya alcanzaste el nivel máximo de comisión propia."}{" "}
          Tu posición actual: #{summary.rank} de {summary.totalAffiliates}.
        </p>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Ventas pagadas" value={String(summary.ordersPaid)} />
        <Kpi label="Plata que generaste" value={formatClp(summary.salesClp)} />
        <Kpi
          label="Comisión ganada"
          value={formatClp(summary.commissionEarnedClp)}
        />
        <Kpi
          label="Saldo a cobrar"
          value={formatClp(summary.commissionBalanceClp)}
          accent
          hint={`Ya pagado: ${formatClp(summary.commissionPaidClp)}`}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="Referidos directos"
          value={String(summary.directReferrals)}
        />
        <Kpi
          label="Comisión propia"
          value={formatClp(summary.sellerCommissionClp)}
        />
        <Kpi
          label="Comisión por referidos"
          value={formatClp(summary.directReferralCommissionClp)}
        />
        <Kpi label="Pagado" value={formatClp(summary.commissionPaidClp)} />
      </div>

      {error && (
        <p className="text-red-300 text-sm m-0 border border-red-400/30 rounded-lg p-3">
          {error}
        </p>
      )}

      <section className="border border-white/10 rounded-2xl overflow-hidden bg-brand-bgLight/30">
        <div className="px-4 py-3 border-b border-white/10">
          <h2 className="text-white font-bold text-sm uppercase tracking-wide m-0">
            Últimas ventas con tu código
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-brand-muted text-[11px] uppercase">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Venta</th>
                <th className="px-3 py-2">Tu comisión</th>
                <th className="px-3 py-2">Tasa</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((s) => (
                <tr key={s.id} className="border-t border-white/5">
                  <td className="px-3 py-2.5 text-brand-muted">
                    {formatDate(s.paidAt)}
                  </td>
                  <td className="px-3 py-2.5 text-white">{s.emailMasked}</td>
                  <td className="px-3 py-2.5 text-white">
                    {formatClp(s.totalClp)}
                  </td>
                  <td className="px-3 py-2.5 text-brand-gold font-semibold">
                    {formatClp(s.commissionClp)}
                  </td>
                  <td className="px-3 py-2.5 text-brand-muted">
                    {s.commissionRatePercent}%
                  </td>
                </tr>
              ))}
              {!recentSales.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-10 text-center text-brand-muted"
                  >
                    Aún no hay ventas con tu código. Comparte tu enlace.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border border-white/10 rounded-2xl overflow-hidden bg-brand-bgLight/30">
        <div className="px-4 py-3 border-b border-white/10">
          <h2 className="text-white font-bold text-sm uppercase tracking-wide m-0">
            Liquidaciones que ya te pagaron
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-brand-muted text-[11px] uppercase">
              <tr>
                <th className="px-3 py-2">Fecha pago</th>
                <th className="px-3 py-2">Período</th>
                <th className="px-3 py-2">Monto</th>
                <th className="px-3 py-2">Nota</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="px-3 py-2.5 text-brand-muted">
                    {formatDate(p.paidAt)}
                  </td>
                  <td className="px-3 py-2.5 text-white">
                    {p.periodFrom} → {p.periodTo}
                  </td>
                  <td className="px-3 py-2.5 text-brand-greenBright font-semibold">
                    {formatClp(p.amountClp)}
                  </td>
                  <td className="px-3 py-2.5 text-brand-muted">
                    {p.note || "—"}
                  </td>
                </tr>
              ))}
              {!payouts.length && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-10 text-center text-brand-muted"
                  >
                    Todavía no hay liquidaciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? "gradient-border border-brand-greenBright/40 bg-brand-green/15"
          : "border-white/10 bg-brand-bgLight/50"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wider text-brand-muted m-0 mb-1">
        {label}
      </p>
      <p className="text-white font-black text-xl m-0 leading-tight">{value}</p>
      {hint && <p className="text-[11px] text-brand-muted m-0 mt-2">{hint}</p>}
    </div>
  );
}
