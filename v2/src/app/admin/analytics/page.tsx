"use client";

import { useEffect, useState } from "react";
import { formatClp } from "@/data/packs";
import { useAdmin } from "@/components/admin/AdminContext";
import {
  CumulativeRevenueChart,
  CumulativeTicketsChart,
  DonutChart,
  FunnelBars,
  RevenueOrdersChart,
  SimpleBarChart,
} from "@/components/admin/charts";
import { EmptyState, KpiCard, Panel } from "@/components/admin/ui";
import { paymentProviderLabel } from "@/lib/i18n/labels";

type AnalyticsPayload = {
  summary: {
    revenueClp: number;
    ordersPaid: number;
    ordersTotal: number;
    avgOrderClp: number;
    conversionPct: number;
    failRatePct: number;
    ticketsIssued: number;
    ticketsTowardGoal: number;
    ticketGoal: number;
    ticketGoalPct: number;
    gapToTicketGoal: number;
    minTicketGoal: number;
    minTicketGoalPct: number;
    gapToMinTicketGoal: number;
    avgDailyTickets: number;
    projectedTicketsToEnd: number;
    revenuePerTicket: number;
    uniqueCustomers: number;
    repeatCustomers: number;
    repeatRatePct: number;
    commissionsEarnedClp: number;
    commissionsPaidClp: number;
    netAfterCommissionsClp: number;
    organicRevenueClp: number;
    referredRevenueClp: number;
    referralRatePct: number;
    avgDailyRevenueClp: number;
    avgDailyOrders: number;
    daysLeftToRaffle: number;
    breakEvenClp: number;
    breakEvenPct: number;
    gapToBreakEvenClp: number;
    projectedToEndClp: number;
    onTrack: boolean | null;
    onTrackMin: boolean | null;
    onTrackMoney: boolean | null;
    comparison: {
      revenuePct: number;
      ordersPaidPct: number;
      avgOrderPct: number;
    };
  };
  daily: Array<{
    label: string;
    revenue: number;
    orders: number;
    cumulative: number;
  }>;
  dailyTickets: Array<{
    label: string;
    tickets: number;
    cumulative: number;
  }>;
  funnel: Array<{ stage: string; value: number }>;
  packMix: Array<{ name: string; revenue: number; quantity: number }>;
  providerMix: Array<{ provider: string; revenue: number; orders: number }>;
  channelMix: Array<{ name: string; revenue: number; orders: number }>;
  affiliateRoi: Array<{
    code: string;
    name: string;
    salesClp: number;
    commissionEarnedClp: number;
    netClp: number;
    roiMultiple: number | null;
  }>;
  insights: Array<{
    level: "positive" | "neutral" | "warning" | "critical";
    title: string;
    detail: string;
  }>;
  goal: {
    type: "tickets";
    ticketGoal: number;
    minTicketGoal: number;
    label: string;
    minLabel: string;
    name: string;
    prizeId: string;
    prizeCostClp: number;
    opsCostClp: number;
    breakEvenClp: number;
    moneyLabel: string;
    moneyName: string;
  };
  prizes: Array<{ id: string; name: string; costClp: number }>;
  raffle: {
    title: string;
    prizeName: string;
    endsAt: string;
    ticketGoal: number;
    minTicketGoal: number;
    estimatedPrizeCostClp: number;
    estimatedOpsCostClp: number;
  };
};

const insightTone: Record<string, string> = {
  positive: "border-brand-greenBright/40 bg-brand-green/15",
  neutral: "border-white/10 bg-white/5",
  warning: "border-brand-gold/40 bg-brand-gold/10",
  critical: "border-red-400/40 bg-red-500/10",
};

export default function AdminAnalyticsPage() {
  const { authed, adminFetch, readJson, setError, refreshKey, from, to } =
    useAdmin();
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prizeId, setPrizeId] = useState("all");

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLoadError(null);
        const res = await adminFetch(
          `/api/admin/analytics?prizeId=${encodeURIComponent(prizeId)}`,
        );
        const json = await readJson<AnalyticsPayload>(res, "Analítica");
        if (cancelled) return;
        if (!json?.summary || !json?.goal || !Array.isArray(json.prizes)) {
          throw new Error(
            "La respuesta de Analítica vino incompleta. Recarga la página.",
          );
        }
        setData(json);
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : "No se pudo cargar la analítica";
          setError(msg);
          setLoadError(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, adminFetch, readJson, setError, refreshKey, from, to, prizeId]);

  if (!authed) return null;
  if (loadError && !data) {
    return (
      <div className="space-y-3">
        <p className="text-red-300 text-sm m-0 border border-red-400/30 rounded-xl p-4">
          No se pudo cargar Analítica: {loadError}
        </p>
        <p className="text-brand-muted text-sm m-0">
          Prueba pulsar Actualizar arriba. Si sigue fallando, reinicia{" "}
          <code>npm run dev</code>.
        </p>
      </div>
    );
  }
  if (!data) {
    return <p className="text-brand-muted text-sm">Cargando analítica…</p>;
  }

  const { summary: s, raffle, goal, prizes } = data;
  const faltaTickets = s.gapToTicketGoal ?? 0;
  const ticketGoal = s.ticketGoal ?? goal.ticketGoal ?? raffle.ticketGoal ?? 0;
  const minTicketGoal =
    s.minTicketGoal ?? goal.minTicketGoal ?? raffle.minTicketGoal ?? 15_000;
  const ticketPct = s.ticketGoalPct ?? 0;
  const minTicketPct = s.minTicketGoalPct ?? 0;
  const faltaMin = s.gapToMinTicketGoal ?? 0;
  const ticketsSold = s.ticketsTowardGoal ?? 0;
  const moneyName = goal.moneyName || "el premio";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-title text-2xl md:text-3xl font-black text-white m-0">
            Analítica
          </h2>
          <p className="text-sm text-brand-muted m-0 mt-1 max-w-3xl">
            Hay dos metas de tickets: la del ciclo (configurable) y la mínima
            fija de 15.000. También ves plata cobrada, packs y códigos de
            amigos.
          </p>
        </div>
        <label className="block space-y-1 min-w-[220px]">
          <span className="text-[11px] text-brand-muted uppercase font-semibold tracking-wide">
            Ver cobertura de costos de
          </span>
          <select
            value={prizeId}
            onChange={(e) => setPrizeId(e.target.value)}
            className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold/50"
          >
            <option value="all">Todos los premios</option>
            {prizes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-brand-gold/25 bg-brand-gold/5 px-4 py-3 text-sm space-y-2">
        <p className="text-brand-gold font-bold m-0">Para leer esto fácil</p>
        <ul className="m-0 pl-4 text-brand-muted space-y-1">
          <li>
            <strong className="text-white">{goal.label}</strong> = meta del
            sorteo actual (se define al crear el ciclo). Línea dorada.
          </li>
          <li>
            <strong className="text-white">
              {goal.minLabel || "Meta mínima: 15.000"}
            </strong>{" "}
            = piso fijo del negocio. Línea azul.
          </li>
          <li>
            <strong className="text-white">Dinero cobrado</strong> = plata que
            realmente pagaron los clientes.
          </li>
        </ul>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Progreso meta del ciclo"
          value={`${ticketPct}%`}
          hint={
            faltaTickets > 0
              ? `${ticketsSold} de ${ticketGoal.toLocaleString("es-CL")} · faltan ${faltaTickets.toLocaleString("es-CL")}`
              : `${ticketsSold.toLocaleString("es-CL")} de ${ticketGoal.toLocaleString("es-CL")} · cubierta`
          }
          accent={ticketPct >= 100}
        />
        <KpiCard
          label="Progreso meta mínima (15.000)"
          value={`${minTicketPct}%`}
          hint={
            faltaMin > 0
              ? `${ticketsSold.toLocaleString("es-CL")} de ${minTicketGoal.toLocaleString("es-CL")} · faltan ${faltaMin.toLocaleString("es-CL")}`
              : `${ticketsSold.toLocaleString("es-CL")} · mínima cubierta`
          }
          accent={minTicketPct >= 100}
        />
        <KpiCard
          label="Tickets vendidos (ciclo)"
          value={ticketsSold.toLocaleString("es-CL")}
          hint={`Ciclo ${ticketGoal.toLocaleString("es-CL")} · Mín. ${minTicketGoal.toLocaleString("es-CL")}`}
          accent
        />
        <KpiCard
          label="Dinero cobrado"
          value={formatClp(s.revenueClp)}
          delta={s.comparison.revenuePct}
          hint="Suma de todo lo pagado"
        />
        <KpiCard
          label="Cantidad de compras"
          value={String(s.ordersPaid)}
          delta={s.comparison.ordersPaidPct}
          hint={`Promedio por compra: ${formatClp(s.avgOrderClp)}`}
        />
        <KpiCard
          label="Te queda después de pagar afiliados"
          value={formatClp(s.netAfterCommissionsClp)}
          hint={`Comisiones: ${formatClp(s.commissionsEarnedClp)}`}
        />
        <KpiCard
          label="Si sigues así, tickets al final"
          value={(s.projectedTicketsToEnd ?? 0).toLocaleString("es-CL")}
          hint={
            s.onTrack == null && s.onTrackMin == null
              ? `Quedan ${s.daysLeftToRaffle} días`
              : [
                  s.onTrack === false
                    ? "Corto vs ciclo"
                    : s.onTrack
                      ? "Ok ciclo"
                      : null,
                  s.onTrackMin === false
                    ? "corto vs mín."
                    : s.onTrackMin
                      ? "ok mín."
                      : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || `Quedan ${s.daysLeftToRaffle} días`
          }
        />
        <KpiCard
          label="Clientes que compraron más de una vez"
          value={`${s.repeatRatePct}%`}
          hint={`${s.repeatCustomers} de ${s.uniqueCustomers} personas`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="¿Cuántos tickets llevas vs las metas?">
          <div className="p-3">
            {(data.dailyTickets?.length ?? 0) > 0 ? (
              <CumulativeTicketsChart
                data={data.dailyTickets}
                ticketGoal={ticketGoal}
                minTicketGoal={minTicketGoal}
                goalLabel={goal.label}
                minGoalLabel={goal.minLabel || "Meta mínima: 15.000"}
              />
            ) : (
              <EmptyState title="Todavía no hay tickets en estas fechas" />
            )}
            <p className="text-[11px] text-brand-muted px-1 m-0">
              Verde = tickets acumulados. Dorado = meta del ciclo (
              {ticketGoal.toLocaleString("es-CL")}). Azul = meta mínima (
              {minTicketGoal.toLocaleString("es-CL")}).
            </p>
          </div>
        </Panel>
        <Panel title="Dinero del día vs cantidad de compras">
          <div className="p-3">
            {data.daily.length ? (
              <RevenueOrdersChart data={data.daily} />
            ) : (
              <EmptyState title="Todavía no hay ventas en estas fechas" />
            )}
            <p className="text-[11px] text-brand-muted px-1 m-0">
              Las barras verdes son cuántas compras hubo. La línea dorada es
              cuánta plata entró ese día.
            </p>
          </div>
        </Panel>
      </div>

      <Panel title={`¿La plata cubre ${moneyName}? (secundario)`}>
        <div className="p-3">
          {data.daily.length ? (
            <CumulativeRevenueChart
              data={data.daily}
              breakEven={s.breakEvenClp}
              goalLabel={goal.moneyLabel || "Meta de costos"}
            />
          ) : (
            <EmptyState title="Todavía no hay ventas en estas fechas" />
          )}
          <p className="text-[11px] text-brand-muted px-1 m-0">
            Cobertura de costos: {s.breakEvenPct}% ·{" "}
            {s.gapToBreakEvenClp > 0
              ? `faltan ${formatClp(s.gapToBreakEvenClp)}`
              : "costos cubiertos"}{" "}
            · premio {formatClp(goal.prizeCostClp)} + gastos{" "}
            {formatClp(goal.opsCostClp)}.
          </p>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Cómo terminan las compras">
          <div className="p-3">
            <FunnelBars data={data.funnel} />
            <p className="text-[11px] text-brand-muted px-1 m-0">
              Ideal: casi todos los que inician compra, pagan.
            </p>
          </div>
        </Panel>
        <Panel title="Qué pack trae más plata">
          <div className="p-3">
            <DonutChart
              data={data.packMix.map((p) => ({
                name: p.name.replace("Ilustración ", ""),
                revenue: p.revenue,
              }))}
            />
          </div>
        </Panel>
        <Panel title="Compras con o sin código de amigo">
          <div className="p-3">
            <DonutChart data={data.channelMix} />
            <p className="text-[11px] text-brand-muted m-0 px-1">
              Con código: {s.referralRatePct}% de las compras ·{" "}
              {formatClp(s.referredRevenueClp)}
            </p>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Con qué medio te pagan">
          <div className="p-3">
            <SimpleBarChart
              data={data.providerMix.map((p) => ({
                name: paymentProviderLabel(p.provider),
                revenue: p.revenue,
              }))}
              dataKey="revenue"
              valueIsMoney
              color="#f7c64b"
            />
          </div>
        </Panel>
        <Panel title="Cuánta plata te deja cada afiliado">
          <div className="p-3">
            {data.affiliateRoi.length ? (
              <SimpleBarChart
                data={data.affiliateRoi.map((a) => ({
                  name: a.code,
                  netClp: a.netClp,
                }))}
                dataKey="netClp"
                valueIsMoney
                color="#36f073"
              />
            ) : (
              <EmptyState title="Nadie vendió con código en estas fechas" />
            )}
            <p className="text-[11px] text-brand-muted px-1 m-0">
              Es lo que vendió el afiliado menos lo que le debes de comisión.
            </p>
          </div>
        </Panel>
      </div>

      <Panel title="Tabla simple de afiliados">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-brand-muted text-[11px] uppercase">
              <tr>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Vendió</th>
                <th className="px-3 py-2">Le debes / comisión</th>
                <th className="px-3 py-2">Te queda a ti</th>
                <th className="px-3 py-2">Por cada $1 de comisión, vendió</th>
              </tr>
            </thead>
            <tbody>
              {data.affiliateRoi.map((a) => (
                <tr key={a.code} className="border-t border-white/5">
                  <td className="px-3 py-2.5">
                    <div className="text-brand-greenBright font-bold">
                      {a.code}
                    </div>
                    <div className="text-[11px] text-brand-muted">{a.name}</div>
                  </td>
                  <td className="px-3 py-2.5 text-white">
                    {formatClp(a.salesClp)}
                  </td>
                  <td className="px-3 py-2.5 text-brand-muted">
                    {formatClp(a.commissionEarnedClp)}
                  </td>
                  <td className="px-3 py-2.5 text-brand-gold font-bold">
                    {formatClp(a.netClp)}
                  </td>
                  <td className="px-3 py-2.5 text-white">
                    {a.roiMultiple != null ? `$${a.roiMultiple}` : "—"}
                  </td>
                </tr>
              ))}
              {!data.affiliateRoi.length && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState title="Sin ventas de afiliados en estas fechas" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Conclusiones en simple">
        <ul className="m-0 p-4 list-none space-y-3">
          {data.insights.map((ins) => (
            <li
              key={ins.title}
              className={`rounded-xl border px-4 py-3 ${insightTone[ins.level]}`}
            >
              <p className="text-white font-bold text-sm m-0">{ins.title}</p>
              <p className="text-brand-muted text-sm m-0 mt-1">{ins.detail}</p>
            </li>
          ))}
          {!data.insights.length && (
            <EmptyState title="Aún no hay suficientes datos para sacar conclusiones" />
          )}
        </ul>
      </Panel>

      <div className="text-[11px] text-brand-muted border border-white/10 rounded-xl p-3">
        Sorteo: {raffle.prizeName} · Termina el{" "}
        {new Date(raffle.endsAt).toLocaleDateString("es-CL")} · Meta del ciclo:{" "}
        {ticketGoal.toLocaleString("es-CL")} ({ticketPct}%) · Meta mínima:{" "}
        {minTicketGoal.toLocaleString("es-CL")} ({minTicketPct}%) · Avance:{" "}
        {ticketsSold.toLocaleString("es-CL")} · En el rango: {s.ticketsIssued} ·
        Plata promedio por número: {formatClp(s.revenuePerTicket)}
      </div>
    </div>
  );
}
