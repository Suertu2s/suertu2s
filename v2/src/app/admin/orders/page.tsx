"use client";

import { useEffect, useMemo, useState } from "react";
import { formatClp, getPackById } from "@/data/packs";
import { useAdmin } from "@/components/admin/AdminContext";
import {
  EmptyState,
  ExportButtons,
  Field,
  formatDate,
  Panel,
  StatusBadge,
} from "@/components/admin/ui";
import type { OrderRow } from "@/components/admin/types";
import { orderStatusLabel, paymentProviderLabel } from "@/lib/i18n/labels";

type OrderDetail = {
  order: OrderRow;
  items: Array<{
    pack_id: string;
    pack_name: string;
    quantity: number;
    unit_price_clp: number;
    ticket_count: number;
  }>;
  tickets: Array<{ id: string; number: number; code?: string; email: string }>;
};

const PAGE_SIZE = 15;

export default function AdminOrdersPage() {
  const { authed, adminFetch, readJson, setError, refreshKey, from, to } =
    useAdmin();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const params = new URLSearchParams({
          from,
          to,
          status,
          provider,
          q,
        });
        const res = await adminFetch(`/api/admin/orders?${params}`);
        const json = await readJson<{ orders: OrderRow[] }>(res, "Órdenes");
        if (!cancelled) {
          setOrders(json.orders || []);
          setPage(0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los pedidos",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    authed,
    adminFetch,
    readJson,
    setError,
    refreshKey,
    from,
    to,
    status,
    provider,
    q,
  ]);

  useEffect(() => {
    if (!authed || !selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(`/api/admin/orders/${selectedId}`);
        const json = await readJson<OrderDetail>(res, "Detalle pedido");
        if (!cancelled) setDetail(json);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el detalle",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, selectedId, adminFetch, readJson, setError, refreshKey]);

  const pageCount = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => orders.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [orders, page],
  );

  async function runOrderAction(
    id: string,
    action: "mark_failed" | "fulfill" | "resend_email",
    confirmText: string,
  ) {
    if (!window.confirm(confirmText)) return;
    setActionBusy(true);
    setActionMsg(null);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/orders", {
        method: "PATCH",
        body: JSON.stringify({ id, action }),
      });
      const json = await readJson<{
        order: OrderRow;
        message?: string;
        tickets?: OrderDetail["tickets"];
      }>(res, "Actualizar pedido");

      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...json.order } : o)),
      );
      setActionMsg(json.message || "Listo");

      if (action === "mark_failed") {
        setSelectedId(null);
        setDetail(null);
      } else if (selectedId === id) {
        const detailRes = await adminFetch(`/api/admin/orders/${id}`);
        const detailJson = await readJson<OrderDetail>(
          detailRes,
          "Detalle pedido",
        );
        setDetail(detailJson);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setActionBusy(false);
    }
  }

  if (!authed) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-title text-2xl font-black text-white m-0">
            Pedidos
          </h2>
          <p className="text-sm text-brand-muted m-0 mt-1">
            {orders.length} resultados en el rango
          </p>
        </div>
        <ExportButtons
          filenameBase={`pedidos_${from}_${to}`}
          rows={[
            [
              "id",
              "fecha",
              "cliente",
              "correo",
              "total",
              "estado",
              "pasarela",
              "referido",
            ],
            ...orders.map((o) => [
              o.id,
              o.paid_at || o.created_at,
              o.full_name,
              o.email,
              String(o.total_clp),
              orderStatusLabel(o.status),
              paymentProviderLabel(o.payment_provider),
              o.referral_code || "",
            ]),
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field
          label="Buscar"
          value={q}
          onChange={setQ}
          placeholder="correo, nombre, id…"
        />
        <label className="block space-y-1">
          <span className="text-[11px] text-brand-muted uppercase font-semibold">
            Estado
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="all">Todos</option>
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
            <option value="failed">Fallido</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] text-brand-muted uppercase font-semibold">
            Pasarela
          </span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="all">Todas</option>
            <option value="flow">Flow</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3">
          <Panel title="Listado">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-brand-muted text-[11px] uppercase">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Ref.</th>
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => {
                        setSelectedId(o.id);
                        setActionMsg(null);
                      }}
                      className={`border-t border-white/5 cursor-pointer hover:bg-white/5 ${
                        selectedId === o.id ? "bg-brand-green/10" : ""
                      }`}
                    >
                      <td className="px-3 py-2.5 text-brand-muted whitespace-nowrap">
                        {formatDate(o.paid_at || o.created_at)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-white font-semibold">
                          {o.full_name}
                        </div>
                        <div className="text-[11px] text-brand-muted">
                          {o.email}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-white">
                        {formatClp(o.total_clp)}
                      </td>
                      <td className="px-3 py-2.5 text-brand-greenBright font-semibold">
                        {o.referral_code || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                  {!pageRows.length && (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState title="Sin pedidos con estos filtros" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 border-t border-white/10 flex items-center justify-between text-xs text-brand-muted">
              <span>
                Página {page + 1} / {pageCount}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-2 py-1 rounded border border-white/15 bg-transparent text-white cursor-pointer disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  className="px-2 py-1 rounded border border-white/15 bg-transparent text-white cursor-pointer disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </Panel>
        </div>

        <div className="xl:col-span-2">
          <Panel title="Detalle del pedido">
            {!detail ? (
              <div className="p-4">
                <EmptyState
                  title="Selecciona un pedido"
                  subtitle="Verás productos, números e identificadores de pago."
                />
              </div>
            ) : (
              <div className="p-4 space-y-4 text-sm">
                <div className="flex justify-between gap-2 items-start">
                  <div>
                    <p className="text-white font-bold m-0">
                      {detail.order.full_name}
                    </p>
                    <p className="text-brand-muted m-0 text-xs">
                      {detail.order.email}
                    </p>
                  </div>
                  <StatusBadge status={detail.order.status} />
                </div>
                <dl className="grid grid-cols-2 gap-2 m-0 text-xs">
                  <div>
                    <dt className="text-brand-muted m-0">Total</dt>
                    <dd className="text-white font-bold m-0">
                      {formatClp(detail.order.total_clp)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-muted m-0">Pasarela</dt>
                    <dd className="text-white m-0 capitalize">
                      {paymentProviderLabel(detail.order.payment_provider)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-muted m-0">Referido</dt>
                    <dd className="text-brand-greenBright font-bold m-0">
                      {detail.order.referral_code || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-muted m-0">Pago externo</dt>
                    <dd className="text-white m-0 break-all">
                      {detail.order.payment_external_id || "—"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-brand-muted m-0">ID</dt>
                    <dd className="text-white m-0 break-all text-[11px]">
                      {detail.order.id}
                    </dd>
                  </div>
                </dl>

                <div>
                  <p className="text-xs uppercase text-brand-muted font-bold m-0 mb-2">
                    Items
                  </p>
                  <ul className="m-0 p-0 list-none space-y-2">
                    {detail.items.map((item, idx) => (
                      <li
                        key={`${item.pack_id}-${idx}`}
                        className="flex justify-between gap-2 border border-white/5 rounded-lg px-3 py-2"
                      >
                        <span className="text-white">
                          {item.pack_name ||
                            getPackById(item.pack_id)?.name ||
                            item.pack_id}{" "}
                          × {item.quantity}
                        </span>
                        <span className="text-brand-muted">
                          {formatClp(item.unit_price_clp * item.quantity)} ·{" "}
                          {item.ticket_count} códigos
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs uppercase text-brand-muted font-bold m-0 mb-2">
                    Códigos ({detail.tickets.length})
                  </p>
                  {detail.tickets.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {detail.tickets.map((t) => (
                        <span
                          key={t.id}
                          className="px-2 py-1 rounded bg-brand-bg border border-brand-gold/20 text-brand-gold text-xs font-bold tracking-wide"
                        >
                          {t.code || `#${String(t.number).padStart(5, "0")}`}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-brand-muted text-xs m-0">
                      Sin códigos asignados.
                    </p>
                  )}
                </div>

                {actionMsg && (
                  <p className="text-brand-greenBright text-xs m-0 border border-brand-greenBright/30 rounded-lg p-2">
                    {actionMsg}
                  </p>
                )}

                <div className="space-y-2 pt-1">
                  {detail.order.status === "pending" && (
                    <>
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() =>
                          void runOrderAction(
                            detail.order.id,
                            "fulfill",
                            "¿Marcar este pedido como pagado y emitir los números? Úsalo solo si confirmaste el pago fuera del sistema.",
                          )
                        }
                        className="w-full border-none bg-brand-greenBright text-black py-2 rounded-lg cursor-pointer text-sm font-bold disabled:opacity-50"
                      >
                        Marcar pagado / emitir números
                      </button>
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() =>
                          void runOrderAction(
                            detail.order.id,
                            "mark_failed",
                            "¿Marcar este pedido como fallido?",
                          )
                        }
                        className="w-full border border-red-400/40 text-red-300 bg-transparent py-2 rounded-lg cursor-pointer text-sm font-semibold disabled:opacity-50"
                      >
                        Marcar como fallido
                      </button>
                    </>
                  )}
                  {detail.order.status === "paid" && (
                    <button
                      type="button"
                      disabled={actionBusy || !detail.tickets.length}
                      onClick={() =>
                        void runOrderAction(
                          detail.order.id,
                          "resend_email",
                          `¿Reenviar el email de confirmación a ${detail.order.email}?`,
                        )
                      }
                      className="w-full border border-brand-gold/40 text-brand-gold bg-transparent py-2 rounded-lg cursor-pointer text-sm font-semibold disabled:opacity-50"
                    >
                      Reenviar email
                    </button>
                  )}
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
