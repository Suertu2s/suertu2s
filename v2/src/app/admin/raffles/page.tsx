"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { formatClp } from "@/data/packs";
import { useAdmin } from "@/components/admin/AdminContext";
import { EmptyState, ExportButtons, Field, Panel, formatDate } from "@/components/admin/ui";

type RaffleDto = {
  id: string;
  title: string;
  prizeName: string;
  endsAt: string;
  code: string;
  ticketMin: number;
  ticketMax: number;
  estimatedPrizeCostClp: number;
  estimatedOpsCostClp: number;
  ticketGoal: number;
  liveStreamUrl?: string;
  raffleStatus: "open" | "closed";
  winnerTicketCode?: string;
  winnerName?: string;
  winnerNote?: string;
};

type ArchivedDto = RaffleDto & {
  archivedAt: string;
  ordersCount: number;
  ticketsCount: number;
};

type RafflesData = {
  active: RaffleDto;
  history: ArchivedDto[];
};

const emptyForm = {
  title: "",
  prizeName: "",
  code: "",
  endsAt: "",
  prizeCostClp: "",
  opsCostClp: "",
  ticketGoal: "",
  liveStreamUrl: "",
};

export default function AdminRafflesPage() {
  const { authed, adminFetch, readJson, setError } = useAdmin();
  const [data, setData] = useState<RafflesData | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [activePast, setActivePast] = useState(false);

  const load = async () => {
    const res = await adminFetch("/api/admin/raffles");
    const json = await readJson<RafflesData>(res, "Sorteos");
    setData(json);
    setActivePast(new Date(json.active.endsAt).getTime() <= Date.now());
  };

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar sorteos",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  if (!authed) return null;
  if (!data) {
    return <p className="text-brand-muted text-sm">Cargando sorteos…</p>;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirm) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await adminFetch("/api/admin/raffles", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          prizeName: form.prizeName,
          code: form.code,
          endsAt: new Date(form.endsAt).toISOString(),
          prizeCostClp: Number(form.prizeCostClp),
          opsCostClp: form.opsCostClp ? Number(form.opsCostClp) : 0,
          ticketGoal: Number(form.ticketGoal),
          liveStreamUrl: form.liveStreamUrl,
        }),
      });
      const json = await readJson<RafflesData>(res, "Nuevo sorteo");
      setData(json);
      setActivePast(new Date(json.active.endsAt).getTime() <= Date.now());
      setForm(emptyForm);
      setConfirm(false);
      setDone(`Sorteo nuevo activo. El ciclo anterior quedó en el historial.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear");
    } finally {
      setBusy(false);
    }
  };

  const set = (key: keyof typeof emptyForm) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const { active, history } = data;

  const historyExportRows: string[][] = [
    [
      "Código",
      "Título",
      "Premio",
      "Cierre",
      "Pedidos",
      "Códigos",
      "Ganador",
      "Nombre ganador",
    ],
    ...history.map((r) => [
      r.code,
      r.title,
      r.prizeName,
      r.endsAt,
      String(r.ordersCount),
      String(r.ticketsCount),
      r.winnerTicketCode || "",
      r.winnerName || "",
    ]),
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-title text-2xl md:text-3xl font-black text-white m-0">
          Sorteos
        </h2>
        <p className="text-sm text-brand-muted m-0 mt-1">
          El ciclo activo recibe pedidos. Al crear uno nuevo, el actual se
          archiva con sus estadísticas y no vuelve a vender.
        </p>
      </div>

      {done && (
        <p className="text-brand-greenBright text-sm border border-brand-greenBright/30 rounded-lg p-3 m-0">
          {done}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          title="Sorteo activo"
          actions={
            <Link
              href="/admin/settings"
              className="text-xs text-brand-gold no-underline font-semibold"
            >
              Editar en Ajustes
            </Link>
          }
        >
          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-white font-bold text-lg m-0 leading-tight">
                  {active.title}
                </p>
                <p className="text-brand-muted text-sm m-0">
                  Premio: {active.prizeName}
                </p>
              </div>
              <span
                className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full border shrink-0 ${
                  active.raffleStatus === "closed"
                    ? "bg-red-500/15 text-red-300 border-red-400/30"
                    : activePast
                      ? "bg-brand-gold/15 text-brand-gold border-brand-gold/30"
                      : "bg-brand-green/30 text-brand-greenBright border-brand-greenBright/30"
                }`}
              >
                {active.raffleStatus === "closed"
                  ? "Cerrado"
                  : activePast
                    ? "Cierre pasado"
                    : "Abierto"}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm m-0">
              <dt className="text-brand-muted text-xs uppercase font-semibold m-0">
                Código
              </dt>
              <dd className="m-0 text-white font-bold">{active.code}</dd>
              <dt className="text-brand-muted text-xs uppercase font-semibold m-0">
                Cierre
              </dt>
              <dd className="m-0 text-white">{formatDate(active.endsAt)}</dd>
              <dt className="text-brand-muted text-xs uppercase font-semibold m-0">
                Costo premio
              </dt>
              <dd className="m-0 text-white">
                {formatClp(active.estimatedPrizeCostClp)}
              </dd>
              <dt className="text-brand-muted text-xs uppercase font-semibold m-0">
                Gastos operación
              </dt>
              <dd className="m-0 text-white">
                {formatClp(active.estimatedOpsCostClp)}
              </dd>
              <dt className="text-brand-muted text-xs uppercase font-semibold m-0">
                Meta de tickets
              </dt>
              <dd className="m-0 text-white font-bold">
                {active.ticketGoal?.toLocaleString("es-CL") ?? "—"}
              </dd>
              <dt className="text-brand-muted text-xs uppercase font-semibold m-0">
                Live
              </dt>
              <dd className="m-0 text-white truncate">
                {active.liveStreamUrl || "—"}
              </dd>
            </dl>

            {active.raffleStatus === "closed" && (
              <p className="text-brand-gold text-sm m-0 pt-2 border-t border-white/10">
                Ganador: {active.winnerTicketCode || "—"} ·{" "}
                {active.winnerName || "Sin nombre"}
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Crear nuevo ciclo de sorteo">
          <form onSubmit={onSubmit} className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Título del sorteo"
                value={form.title}
                onChange={set("title")}
                placeholder="Ej: Sorteo 2s de Septiembre"
                required
              />
              <Field
                label="Premio principal"
                value={form.prizeName}
                onChange={set("prizeName")}
                placeholder="Ej: 2 pasajes + tour a Puerto Montt"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Código del ciclo"
                value={form.code}
                onChange={set("code")}
                placeholder="Ej: S2S26"
                required
              />
              <Field
                label="Fecha de cierre"
                type="datetime-local"
                value={form.endsAt}
                onChange={set("endsAt")}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field
                label="Costo del premio (CLP)"
                type="number"
                value={form.prizeCostClp}
                onChange={set("prizeCostClp")}
                placeholder="150000"
                required
              />
              <Field
                label="Gastos de operación (CLP)"
                type="number"
                value={form.opsCostClp}
                onChange={set("opsCostClp")}
                placeholder="0"
              />
              <Field
                label="Meta de tickets"
                type="number"
                value={form.ticketGoal}
                onChange={set("ticketGoal")}
                placeholder="1000"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Field
                label="Link del live (opcional)"
                value={form.liveStreamUrl}
                onChange={set("liveStreamUrl")}
                placeholder="https://youtube.com/watch?v=…"
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-brand-muted cursor-pointer">
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Entiendo que el sorteo actual se cierra y queda en el historial
                con sus pedidos y códigos.
              </span>
            </label>

            <button
              type="submit"
              disabled={busy || !confirm}
              className="w-full bg-brand-greenBright text-black font-bold uppercase py-3 rounded-xl border-none cursor-pointer disabled:opacity-50"
            >
              {busy ? "Creando…" : "Archivar actual y crear nuevo"}
            </button>
          </form>
        </Panel>
      </div>

      <Panel
        title={`Historial de sorteos (${history.length})`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {history.length > 0 && (
              <ExportButtons
                filenameBase="historial_sorteos"
                rows={historyExportRows}
              />
            )}
            <Link
              href="/admin/tickets"
              className="text-xs text-brand-gold no-underline font-semibold"
            >
              Ver códigos
            </Link>
          </div>
        }
      >
        {!history.length ? (
          <EmptyState
            title="Todavía no hay ciclos anteriores"
            subtitle="Al crear un nuevo sorteo, este ciclo se archivará aquí."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-brand-muted text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-2 font-semibold">Código</th>
                  <th className="px-4 py-2 font-semibold">Sorteo</th>
                  <th className="px-4 py-2 font-semibold">Cierre</th>
                  <th className="px-4 py-2 font-semibold">Pedidos</th>
                  <th className="px-4 py-2 font-semibold">Códigos</th>
                  <th className="px-4 py-2 font-semibold">Ganador</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="px-4 py-2.5 text-brand-greenBright font-bold">
                      {r.code}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-white font-semibold">{r.title}</div>
                      <div className="text-[11px] text-brand-muted">
                        {r.prizeName}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-brand-muted">
                      {formatDate(r.endsAt)}
                    </td>
                    <td className="px-4 py-2.5 text-white">{r.ordersCount}</td>
                    <td className="px-4 py-2.5 text-white">{r.ticketsCount}</td>
                    <td className="px-4 py-2.5 text-brand-gold">
                      {r.winnerTicketCode || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
