"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatClp } from "@/data/packs";
import { useAdmin } from "@/components/admin/AdminContext";
import { EmptyState, KpiCard, Panel, StatusBadge } from "@/components/admin/ui";
import type { DashboardData } from "@/components/admin/types";

export default function AdminDashboardPage() {
  const { authed, adminFetch, readJson, setError, refreshKey, from, to } =
    useAdmin();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const res = await adminFetch("/api/admin/dashboard");
        const json = await readJson<DashboardData>(res, "Resumen");
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el resumen",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, adminFetch, readJson, setError, refreshKey, from, to]);

  const maxSeries = useMemo(
    () => Math.max(1, ...(data?.kpis.series.map((s) => s.revenue) || [1])),
    [data],
  );

  if (!authed) return null;
  if (!data) {
    return <p className="text-brand-muted text-sm">Cargando resumen…</p>;
  }

  const {
    kpis,
    alerts,
    packMix,
    providerMix,
    affiliateStats,
    orphanCodes,
    ops,
  } = data;

  const opsItems = ops
    ? [
        {
          label: "Pagos de prueba",
          ok: !ops.paymentsMock,
          detail: ops.paymentsMock
            ? "Activo (apágalo en producción)"
            : "Desactivado",
        },
        {
          label: "Flow.cl",
          ok: Boolean(ops.flowConfigured),
          detail: ops.flowConfigured
            ? "API Key + Secret Key listas"
            : "Falta configurar FLOW_API_KEY",
        },
        {
          label: "Base de datos",
          ok: Boolean(ops.dbConfigured),
          detail: ops.supabaseConfigured
            ? "Supabase PostgreSQL conectada"
            : "Modo demo (memoria local)",
        },
        {
          label: "Email (Resend)",
          ok: ops.emailConfigured,
          detail: ops.emailConfigured ? "Configurado" : "Sin RESEND_API_KEY",
        },
        {
          label: "Link del live",
          ok: true,
          detail: ops.liveStreamConfigured
            ? "Configurado"
            : "Opcional — agrégalo en Ajustes antes del sorteo en vivo",
        },
        {
          label: "Estado del sorteo",
          ok: ops.raffleStatus === "open" || ops.winnerConfigured,
          detail:
            ops.raffleStatus === "closed"
              ? ops.winnerConfigured
                ? "Cerrado (con ganador)"
                : "Cerrado sin ganador anunciado"
              : "Abierto",
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-title text-2xl md:text-3xl font-black text-white m-0">
          Resumen
        </h2>
        <p className="text-sm text-brand-muted m-0 mt-1">
          Indicadores de ventas, referidos y operación del período seleccionado.
        </p>
      </div>

      {data.raffle && (
        <Panel
          title="Sorteo activo"
          actions={
            <Link
              href="/admin/raffles"
              className="text-xs text-brand-gold no-underline font-semibold"
            >
              Crear nuevo sorteo
            </Link>
          }
        >
          <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white font-bold m-0 truncate">
                {data.raffle.title}
              </p>
              <p className="text-brand-muted text-sm m-0 truncate">
                {data.raffle.prizeName}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm shrink-0">
              <div>
                <p className="text-brand-muted text-[11px] uppercase font-semibold m-0">
                  Código
                </p>
                <p className="text-brand-greenBright font-bold m-0">
                  {data.raffle.code}
                </p>
              </div>
              <div>
                <p className="text-brand-muted text-[11px] uppercase font-semibold m-0">
                  Cierre
                </p>
                <p className="text-white m-0">
                  {new Date(data.raffle.endsAt).toLocaleDateString("es-CL", {
                    dateStyle: "medium",
                  })}
                </p>
              </div>
              <span
                className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full border ${
                  data.raffle.raffleStatus === "closed"
                    ? "bg-red-500/15 text-red-300 border-red-400/30"
                    : "bg-brand-green/30 text-brand-greenBright border-brand-greenBright/30"
                }`}
              >
                {data.raffle.raffleStatus === "closed" ? "Cerrado" : "Abierto"}
              </span>
            </div>
          </div>
        </Panel>
      )}

      {opsItems.length > 0 && (
        <Panel
          title="Listo para operar"
          actions={
            <Link
              href="/admin/settings"
              className="text-xs font-bold text-brand-greenBright no-underline"
            >
              Ir a Ajustes
            </Link>
          }
        >
          <ul className="m-0 p-4 list-none grid grid-cols-1 sm:grid-cols-2 gap-2">
            {opsItems.map((item) => (
              <li
                key={item.label}
                className="flex items-start justify-between gap-3 border border-white/5 rounded-lg px-3 py-2"
              >
                <div>
                  <p className="text-white text-sm font-semibold m-0">
                    {item.label}
                  </p>
                  <p className="text-xs text-brand-muted m-0 mt-0.5">
                    {item.detail}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-bold uppercase shrink-0 ${
                    item.ok ? "text-brand-greenBright" : "text-brand-gold"
                  }`}
                >
                  {item.ok ? "OK" : "Revisar"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {(alerts.pendingOrders > 0 ||
        alerts.orphanCodes > 0 ||
        alerts.unpaidCommissions > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {alerts.pendingOrders > 0 && (
            <AlertCard
              title="Pedidos pendientes"
              value={String(alerts.pendingOrders)}
              href="/admin/orders"
            />
          )}
          {alerts.unpaidCommissions > 0 && (
            <AlertCard
              title="Afiliados con saldo"
              value={String(alerts.unpaidCommissions)}
              href="/admin/affiliates"
            />
          )}
          {alerts.orphanCodes > 0 && (
            <AlertCard
              title="Códigos sin ficha"
              value={String(alerts.orphanCodes)}
              href="/admin/affiliates"
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Ingresos pagados (CLP)"
          value={formatClp(kpis.revenueClp)}
          delta={kpis.comparison.revenuePct}
          hint="Suma de dinero cobrado"
          accent
        />
        <KpiCard
          label="# Pedidos pagados"
          value={String(kpis.ordersPaid)}
          delta={kpis.comparison.ordersPaidPct}
          hint="Cantidad de pedidos cobrados"
        />
        <KpiCard
          label="Promedio por compra"
          value={formatClp(kpis.avgOrderClp)}
          delta={kpis.comparison.avgOrderPct}
          hint="Ingresos ÷ cantidad de pedidos"
        />
        <KpiCard
          label="Saldo comisiones"
          value={formatClp(kpis.commissionsOwedClp)}
          hint={`Devengado ${formatClp(kpis.commissionsEarnedClp)}`}
        />
        <KpiCard label="Pedidos totales" value={String(kpis.ordersTotal)} />
        <KpiCard label="Pendientes" value={String(kpis.ordersPending)} />
        <KpiCard label="Fallidos" value={String(kpis.ordersFailed)} />
        <KpiCard
          label="Códigos emitidos"
          value={String(kpis.ticketsIssued)}
          hint={`${kpis.referralRatePct}% con referido`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3">
        <p className="text-sm text-brand-muted m-0">
          ¿Quieres ver si alcanza la plata para cada premio, qué pack vende más
          y cómo van los códigos de amigos?
        </p>
        <Link
          href="/admin/analytics"
          className="text-sm font-bold text-black bg-brand-greenBright px-4 py-2 rounded-lg no-underline"
        >
          Ver Analítica
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Panel title="Ventas por día">
            <div className="p-4">
              {!kpis.series.length ? (
                <EmptyState title="Sin ventas pagadas en el período" />
              ) : (
                <div className="flex items-end gap-1.5 h-44">
                  {kpis.series.map((s) => (
                    <div
                      key={s.date}
                      className="flex-1 min-w-[6px] flex flex-col justify-end items-center gap-1"
                      title={`${s.date}: ${formatClp(s.revenue)} · ${s.orders} pedidos`}
                    >
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-brand-goldDark to-brand-gold"
                        style={{
                          height: `${Math.max(8, (s.revenue / maxSeries) * 100)}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </div>

        <Panel title="Pasarelas">
          <ul className="m-0 p-0 list-none divide-y divide-white/5">
            {providerMix.map((p) => (
              <li
                key={p.provider}
                className="px-4 py-3 flex justify-between gap-3 text-sm"
              >
                <span className="text-white font-semibold capitalize">
                  {p.provider}
                </span>
                <span className="text-brand-muted text-right">
                  {p.orders} · {formatClp(p.revenue)}
                </span>
              </li>
            ))}
            {!providerMix.length && (
              <li className="p-4">
                <EmptyState title="Sin datos" />
              </li>
            )}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          title="Ventas por pack"
          actions={
            <Link
              href="/admin/orders"
              className="text-xs text-brand-gold no-underline font-semibold"
            >
              Ver pedidos
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-brand-muted text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-2 font-semibold">Pack</th>
                  <th className="px-4 py-2 font-semibold">Cant.</th>
                  <th className="px-4 py-2 font-semibold">Ingresos</th>
                  <th className="px-4 py-2 font-semibold">Números</th>
                </tr>
              </thead>
              <tbody>
                {packMix.map((p) => (
                  <tr key={p.packId} className="border-t border-white/5">
                    <td className="px-4 py-2.5 text-white">{p.name}</td>
                    <td className="px-4 py-2.5 text-brand-muted">
                      {p.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-white">
                      {formatClp(p.revenue)}
                    </td>
                    <td className="px-4 py-2.5 text-brand-muted">
                      {p.tickets}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Top afiliados"
          actions={
            <Link
              href="/admin/affiliates"
              className="text-xs text-brand-gold no-underline font-semibold"
            >
              Gestionar
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-brand-muted text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-2 font-semibold">Código</th>
                  <th className="px-4 py-2 font-semibold">Usos</th>
                  <th className="px-4 py-2 font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {affiliateStats.map((s) => (
                  <tr key={s.affiliate.id} className="border-t border-white/5">
                    <td className="px-4 py-2.5">
                      <div className="text-brand-greenBright font-bold">
                        {s.affiliate.code}
                      </div>
                      <div className="text-[11px] text-brand-muted">
                        {s.affiliate.name}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-white">{s.uses}</td>
                    <td className="px-4 py-2.5 text-brand-gold font-bold">
                      {formatClp(s.commissionBalanceClp)}
                    </td>
                  </tr>
                ))}
                {!affiliateStats.length && (
                  <tr>
                    <td colSpan={3}>
                      <EmptyState title="Sin afiliados en el período" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!!orphanCodes.length && (
            <div className="px-4 py-3 border-t border-white/10 text-xs text-brand-muted">
              Códigos huérfanos: {orphanCodes.map((c) => c.code).join(", ")}
            </div>
          )}
        </Panel>
      </div>

      <div className="text-[11px] text-brand-muted flex gap-3 items-center">
        <StatusBadge status="paid" />
        <span>Solo los pedidos pagados cuentan en ingresos y comisiones.</span>
      </div>
    </div>
  );
}

function AlertCard({
  title,
  value,
  href,
}: {
  title: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 no-underline flex justify-between items-center"
    >
      <span className="text-sm text-brand-cream">{title}</span>
      <span className="text-lg font-black text-brand-gold">{value}</span>
    </Link>
  );
}
