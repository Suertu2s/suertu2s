"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { Field, Panel } from "@/components/admin/ui";

type PackForm = {
  id: string;
  name: string;
  priceClp: string;
  ticketCount: string;
  featured?: boolean;
};

type PrizeForm = {
  id: string;
  name: string;
  costClp: string;
};

type SettingsData = {
  raffle: {
    id: string;
    title: string;
    prizeName: string;
    endsAt: string;
    code: string;
    ticketMin: number;
    ticketMax: number;
    estimatedPrizeCostClp: number;
    estimatedOpsCostClp: number;
    ticketGoal?: number;
    liveStreamUrl?: string;
    raffleStatus?: "open" | "closed";
    winnerTicketCode?: string;
    winnerName?: string;
    winnerNote?: string;
  };
  prizes: Array<{
    id: string;
    name: string;
    costClp: number;
  }>;
  packs: Array<{
    id: string;
    name: string;
    priceClp: number;
    ticketCount: number;
    featured?: boolean;
  }>;
  env: {
    paymentsMock: boolean;
    dbConfigured: boolean;
    supabaseConfigured?: boolean;
    adminAuthConfigured: boolean;
    mercadoPagoConfigured: boolean;
    webpayConfigured: boolean;
    flowConfigured?: boolean;
    emailConfigured?: boolean;
    adminSessionSecretConfigured?: boolean;
    adminPasswordHashed?: boolean;
    productionIssues?: Array<{ level: string; key: string; message: string }>;
    flowEnv?: string;
    siteUrl?: string;
    adminEmailsCount: number;
    adminEmailsMasked: string[];
  };
};

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function newPrizeId() {
  return `prize-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function mapPrizes(prizes: SettingsData["prizes"]): PrizeForm[] {
  return prizes.map((p) => ({
    id: p.id,
    name: p.name,
    costClp: String(p.costClp),
  }));
}

export default function AdminSettingsPage() {
  const { authed, adminFetch, readJson, setError, refreshKey, bumpRefresh } =
    useAdmin();
  const [data, setData] = useState<SettingsData | null>(null);
  const [raffleForm, setRaffleForm] = useState({
    title: "",
    prizeName: "",
    endsAt: "",
    code: "",
    ticketMin: "",
    ticketMax: "",
    estimatedOpsCostClp: "",
    ticketGoal: "",
    liveStreamUrl: "",
    raffleStatus: "open" as "open" | "closed",
    winnerTicketCode: "",
    winnerName: "",
    winnerNote: "",
  });
  const [prizesForm, setPrizesForm] = useState<PrizeForm[]>([]);
  const [packsForm, setPacksForm] = useState<PackForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const res = await adminFetch("/api/admin/settings");
        const json = await readJson<SettingsData>(res, "Ajustes");
        if (cancelled) return;
        setData(json);
        setRaffleForm({
          title: json.raffle.title,
          prizeName: json.raffle.prizeName,
          endsAt: toDatetimeLocal(json.raffle.endsAt),
          code: json.raffle.code || "",
          ticketMin: String(json.raffle.ticketMin),
          ticketMax: String(json.raffle.ticketMax),
          estimatedOpsCostClp: String(json.raffle.estimatedOpsCostClp),
          ticketGoal: String(json.raffle.ticketGoal ?? 1000),
          liveStreamUrl: json.raffle.liveStreamUrl || "",
          raffleStatus:
            json.raffle.raffleStatus === "closed" ? "closed" : "open",
          winnerTicketCode: json.raffle.winnerTicketCode || "",
          winnerName: json.raffle.winnerName || "",
          winnerNote: json.raffle.winnerNote || "",
        });
        setPrizesForm(
          mapPrizes(
            json.prizes?.length
              ? json.prizes
              : [
                  {
                    id: "prize-legacy",
                    name: json.raffle.prizeName,
                    costClp: json.raffle.estimatedPrizeCostClp,
                  },
                ],
          ),
        );
        setPacksForm(
          json.packs.map((p) => ({
            id: p.id,
            name: p.name,
            priceClp: String(p.priceClp),
            ticketCount: String(p.ticketCount),
            featured: p.featured,
          })),
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los ajustes",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, refreshKey]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    setError(null);
    try {
      if (!prizesForm.length) {
        throw new Error("Agrega al menos un premio para la meta de Analítica");
      }
      const endsIso = new Date(raffleForm.endsAt).toISOString();
      if (Number.isNaN(new Date(endsIso).getTime())) {
        throw new Error("La fecha de cierre no es válida");
      }
      const res = await adminFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          raffle: {
            title: raffleForm.title.trim(),
            prizeName: raffleForm.prizeName.trim(),
            endsAt: endsIso,
            code: raffleForm.code.trim().toUpperCase(),
            ticketMin: Number(raffleForm.ticketMin),
            ticketMax: Number(raffleForm.ticketMax),
            estimatedOpsCostClp: Number(raffleForm.estimatedOpsCostClp),
            ticketGoal: Number(raffleForm.ticketGoal),
            liveStreamUrl: raffleForm.liveStreamUrl.trim(),
            raffleStatus: raffleForm.raffleStatus,
            winnerTicketCode: raffleForm.winnerTicketCode.trim().toUpperCase(),
            winnerName: raffleForm.winnerName.trim(),
            winnerNote: raffleForm.winnerNote.trim(),
          },
          prizes: prizesForm.map((p) => ({
            id: p.id,
            name: p.name.trim(),
            costClp: Number(p.costClp),
          })),
          packs: packsForm.map((p) => ({
            id: p.id,
            name: p.name.trim(),
            priceClp: Number(p.priceClp),
            ticketCount: Number(p.ticketCount),
            featured: Boolean(p.featured),
          })),
        }),
      });
      const json = await readJson<SettingsData & { ok?: boolean }>(
        res,
        "Guardar ajustes",
      );
      setData(json);
      setRaffleForm((f) => ({
        ...f,
        liveStreamUrl: json.raffle.liveStreamUrl || "",
        raffleStatus: json.raffle.raffleStatus === "closed" ? "closed" : "open",
        code: json.raffle.code || "",
        winnerTicketCode: json.raffle.winnerTicketCode || "",
        winnerName: json.raffle.winnerName || "",
        winnerNote: json.raffle.winnerNote || "",
      }));
      setPrizesForm(mapPrizes(json.prizes));
      setPacksForm(
        json.packs.map((p) => ({
          id: p.id,
          name: p.name,
          priceClp: String(p.priceClp),
          ticketCount: String(p.ticketCount),
          featured: p.featured,
        })),
      );
      setSavedMsg(
        "Cambios guardados. Ya se ven en la web, el pago y Analítica.",
      );
      bumpRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!authed) return null;
  if (!data) {
    return <p className="text-brand-muted text-sm">Cargando ajustes…</p>;
  }

  const prizesTotal = prizesForm.reduce(
    (a, p) => a + (Number(p.costClp) || 0),
    0,
  );

  return (
    <form onSubmit={onSave} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-title text-2xl font-black text-white m-0">
            Ajustes
          </h2>
          <p className="text-sm text-brand-muted m-0 mt-1">
            Acá puedes cambiar el sorteo, los premios a cubrir, y los precios de
            los packs. Guarda para aplicar.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-greenBright text-black font-bold text-sm px-5 py-2.5 rounded-lg border-none cursor-pointer disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>

      {savedMsg && (
        <p className="text-brand-greenBright text-sm border border-brand-greenBright/30 rounded-lg p-3 m-0">
          {savedMsg}
        </p>
      )}

      <Panel title="Sorteo (lo que ve la gente)">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Título del sorteo"
            value={raffleForm.title}
            onChange={(v) => setRaffleForm((f) => ({ ...f, title: v }))}
            required
          />
          <Field
            label="Nombre del premio (público)"
            value={raffleForm.prizeName}
            onChange={(v) => setRaffleForm((f) => ({ ...f, prizeName: v }))}
            required
          />
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-[11px] text-brand-muted uppercase font-semibold">
              Fecha y hora de cierre
            </span>
            <input
              type="datetime-local"
              required
              value={raffleForm.endsAt}
              onChange={(e) =>
                setRaffleForm((f) => ({ ...f, endsAt: e.target.value }))
              }
              className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold/50"
            />
          </label>
          <Field
            label="Código del sorteo"
            value={raffleForm.code}
            onChange={(v) =>
              setRaffleForm((f) => ({
                ...f,
                code: v.toUpperCase().replace(/[^A-Z0-9]/g, ""),
              }))
            }
            required
            placeholder="ej. S2S26"
          />
          <div className="sm:col-span-2 text-xs text-brand-muted space-y-1">
            <p className="m-0">
              Cada participación ={" "}
              <strong className="text-white">código del sorteo</strong> +{" "}
              <strong className="text-white">5 dígitos aleatorios</strong> (ej.{" "}
              {raffleForm.code || "S2S26"}48291). No son correlativos ni revelan
              cuántas ventas hay.
            </p>
          </div>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-[11px] text-brand-muted uppercase font-semibold">
              Link de la transmisión en vivo
            </span>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=… o canal de Twitch"
              value={raffleForm.liveStreamUrl}
              onChange={(e) =>
                setRaffleForm((f) => ({
                  ...f,
                  liveStreamUrl: e.target.value,
                }))
              }
              className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold/50"
            />
            <span className="text-xs text-brand-muted block">
              Cuando el contador llegue a 0, en la portada se ocultan la foto y
              el contador, y aparece el reproductor con este live. Puedes
              dejarlo vacío hasta tener el enlace listo.
            </span>
          </label>
        </div>
      </Panel>

      <Panel title="Cierre y ganador">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-[11px] text-brand-muted uppercase font-semibold">
              Estado del sorteo
            </span>
            <select
              value={raffleForm.raffleStatus}
              onChange={(e) =>
                setRaffleForm((f) => ({
                  ...f,
                  raffleStatus: e.target.value === "closed" ? "closed" : "open",
                }))
              }
              className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold/50"
            >
              <option value="open">Abierto</option>
              <option value="closed">Cerrado</option>
            </select>
          </label>
          <Field
            label="Código ganador (completo)"
            value={raffleForm.winnerTicketCode}
            onChange={(v) =>
              setRaffleForm((f) => ({
                ...f,
                winnerTicketCode: v.toUpperCase().replace(/[^A-Z0-9]/g, ""),
              }))
            }
            placeholder={`ej. ${raffleForm.code || "S2S26"}48291`}
          />
          <Field
            label="Nombre del ganador (público)"
            value={raffleForm.winnerName}
            onChange={(v) => setRaffleForm((f) => ({ ...f, winnerName: v }))}
            placeholder="Opcional"
          />
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-[11px] text-brand-muted uppercase font-semibold">
              Nota pública (opcional)
            </span>
            <textarea
              value={raffleForm.winnerNote}
              onChange={(e) =>
                setRaffleForm((f) => ({ ...f, winnerNote: e.target.value }))
              }
              rows={2}
              maxLength={300}
              placeholder="Ej. ¡Felicitaciones! Te contactaremos por correo."
              className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold/50 resize-y"
            />
            <span className="text-xs text-brand-muted block">
              Si el sorteo está cerrado y hay código ganador, se muestra en la
              portada.
            </span>
          </label>
        </div>
      </Panel>

      <Panel
        title="Premios a cubrir (para Analítica)"
        actions={
          <button
            type="button"
            onClick={() =>
              setPrizesForm((list) => [
                ...list,
                { id: newPrizeId(), name: "", costClp: "0" },
              ])
            }
            className="text-xs font-bold text-brand-greenBright bg-transparent border border-brand-greenBright/40 rounded-lg px-3 py-1.5 cursor-pointer"
          >
            + Agregar premio
          </button>
        }
      >
        <div className="p-4 space-y-4">
          {prizesForm.map((prize, idx) => (
            <div
              key={prize.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-3 border border-white/10 rounded-xl p-3 items-end"
            >
              <Field
                label="Nombre del premio"
                value={prize.name}
                onChange={(v) =>
                  setPrizesForm((list) =>
                    list.map((p, i) => (i === idx ? { ...p, name: v } : p)),
                  )
                }
                required
              />
              <Field
                label="Costo aprox. CLP"
                value={prize.costClp}
                onChange={(v) =>
                  setPrizesForm((list) =>
                    list.map((p, i) => (i === idx ? { ...p, costClp: v } : p)),
                  )
                }
                type="number"
                required
              />
              <button
                type="button"
                disabled={prizesForm.length <= 1}
                onClick={() =>
                  setPrizesForm((list) => list.filter((_, i) => i !== idx))
                }
                className="text-xs font-bold text-red-300 bg-transparent border border-red-400/30 rounded-lg px-3 py-2 cursor-pointer disabled:opacity-40 mb-0.5"
              >
                Quitar
              </button>
            </div>
          ))}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Field
              label="Otros gastos del sorteo (aprox. CLP)"
              value={raffleForm.estimatedOpsCostClp}
              onChange={(v) =>
                setRaffleForm((f) => ({ ...f, estimatedOpsCostClp: v }))
              }
              type="number"
              required
            />
            <Field
              label="Meta de tickets (Analítica)"
              value={raffleForm.ticketGoal}
              onChange={(v) =>
                setRaffleForm((f) => ({ ...f, ticketGoal: v }))
              }
              type="number"
              required
            />
            <Field
              label="Ticket mínimo (número aleatorio)"
              value={raffleForm.ticketMin}
              onChange={(v) => setRaffleForm((f) => ({ ...f, ticketMin: v }))}
              type="number"
              required
            />
            <Field
              label="Ticket máximo (número aleatorio)"
              value={raffleForm.ticketMax}
              onChange={(v) => setRaffleForm((f) => ({ ...f, ticketMax: v }))}
              type="number"
              required
            />
            <p className="text-xs text-brand-muted m-0 self-end pb-2 sm:col-span-2">
              Suma de premios:{" "}
              <span className="text-brand-gold font-semibold">
                {prizesTotal.toLocaleString("es-CL")} CLP
              </span>
              . La meta principal de Analítica es la cantidad de tickets; la
              cobertura de costos (premios + gastos) queda como dato secundario.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Packs (precios y números de regalo)">
        <div className="p-4 space-y-4">
          {packsForm.map((pack, idx) => (
            <div
              key={pack.id}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border border-white/10 rounded-xl p-3"
            >
              <Field
                label="Nombre"
                value={pack.name}
                onChange={(v) =>
                  setPacksForm((list) =>
                    list.map((p, i) => (i === idx ? { ...p, name: v } : p)),
                  )
                }
                required
              />
              <Field
                label="Precio CLP"
                value={pack.priceClp}
                onChange={(v) =>
                  setPacksForm((list) =>
                    list.map((p, i) => (i === idx ? { ...p, priceClp: v } : p)),
                  )
                }
                type="number"
                required
              />
              <Field
                label="Números de regalo"
                value={pack.ticketCount}
                onChange={(v) =>
                  setPacksForm((list) =>
                    list.map((p, i) =>
                      i === idx ? { ...p, ticketCount: v } : p,
                    ),
                  )
                }
                type="number"
                required
              />
              <label className="flex items-end gap-2 pb-2 cursor-pointer">
                <input
                  type="radio"
                  name="featured-pack"
                  checked={Boolean(pack.featured)}
                  onChange={() =>
                    setPacksForm((list) =>
                      list.map((p, i) => ({
                        ...p,
                        featured: i === idx,
                      })),
                    )
                  }
                />
                <span className="text-sm text-brand-cream">
                  Marcar como “más conveniente”
                </span>
              </label>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Estado del sistema (solo lectura)">
        <div className="p-4 space-y-3 text-sm">
          <Row
            label="Pagos de prueba"
            value={
              data.env.paymentsMock
                ? "Activo (aún sin claves reales)"
                : "Desactivado"
            }
            tone={data.env.paymentsMock ? "warn" : "ok"}
          />
          <Row
            label="Acceso admin"
            value={data.env.adminAuthConfigured ? "Configurado" : "Falta"}
            tone={data.env.adminAuthConfigured ? "ok" : "warn"}
          />
          <Row
            label="Flow.cl"
            value={
              data.env.flowConfigured
                ? `Configurado (${data.env.flowEnv || "sandbox"})`
                : "Sin claves (FLOW_API_KEY / FLOW_SECRET_KEY)"
            }
            tone={
              data.env.flowConfigured && data.env.flowEnv === "production"
                ? "ok"
                : "warn"
            }
          />
          <Row
            label="URL del sitio"
            value={data.env.siteUrl || "No configurada"}
            tone={data.env.siteUrl?.startsWith("https://") ? "ok" : "warn"}
          />
          <Row
            label="Base de datos (Supabase)"
            value={
              data.env.supabaseConfigured
                ? "Supabase PostgreSQL conectada"
                : "Modo demo (memoria local)"
            }
            tone={data.env.dbConfigured ? "ok" : "warn"}
          />
          <Row
            label="Email (Resend)"
            value={
              data.env.emailConfigured ? "Configurado" : "Falta RESEND_API_KEY"
            }
            tone={data.env.emailConfigured ? "ok" : "warn"}
          />
          <Row
            label="Secreto de sesión admin"
            value={
              data.env.adminSessionSecretConfigured
                ? "ADMIN_SESSION_SECRET listo"
                : "Falta (obligatorio en producción)"
            }
            tone={data.env.adminSessionSecretConfigured ? "ok" : "warn"}
          />
          <Row
            label="Contraseña admin"
            value={
              data.env.adminPasswordHashed
                ? "Hash scrypt (recomendado)"
                : "Texto en env (mejor usar hash)"
            }
            tone={data.env.adminPasswordHashed ? "ok" : "warn"}
          />
          {data.env.productionIssues && data.env.productionIssues.length > 0 && (
            <div className="border border-red-400/30 rounded-lg p-3 space-y-1">
              <p className="text-red-300 text-xs font-bold m-0">
                Alertas de producción
              </p>
              {data.env.productionIssues.map((issue) => (
                <p key={issue.key} className="text-xs text-brand-muted m-0">
                  <strong>{issue.key}:</strong> {issue.message}
                </p>
              ))}
            </div>
          )}
          <p className="text-xs text-brand-muted m-0 pt-2">
            Contraseñas, emails admin y claves de pago se cambian en el archivo
            de entorno del servidor (<code>.env</code>), no aquí, por seguridad.
          </p>
        </div>
      </Panel>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-greenBright text-black font-bold text-sm px-5 py-2.5 rounded-lg border-none cursor-pointer disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="flex justify-between gap-3 border-b border-white/5 pb-2">
      <span className="text-brand-muted">{label}</span>
      <span
        className={`text-right ${
          tone === "ok"
            ? "text-brand-greenBright font-semibold"
            : tone === "warn"
              ? "text-brand-gold font-semibold"
              : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
