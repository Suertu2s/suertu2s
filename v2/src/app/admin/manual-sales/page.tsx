"use client";

import { useEffect, useMemo, useState } from "react";
import { formatClp } from "@/data/packs";
import { useCatalog } from "@/hooks/useCatalog";
import { useAdmin } from "@/components/admin/AdminContext";
import type { Affiliate } from "@/components/admin/types";
import { Panel } from "@/components/admin/ui";

type ManualSaleForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  packId: string;
  quantity: string;
  affiliateId: string;
};

type ManualSaleResult = {
  order: { id: string; total_clp: number };
  tickets: Array<{ code: string; number: number }>;
  emailSent: boolean;
  emailReason?: string;
  message: string;
};

const INITIAL_FORM: ManualSaleForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  packId: "",
  quantity: "1",
  affiliateId: "",
};

export default function AdminManualSalesPage() {
  const {
    authed,
    canManualSales,
    adminFetch,
    readJson,
    setError,
    bumpRefresh,
  } = useAdmin();
  const { packs, acceptsOrders, loaded } = useCatalog();
  const [form, setForm] = useState<ManualSaleForm>(INITIAL_FORM);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [affiliatesLoaded, setAffiliatesLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ManualSaleResult | null>(null);

  useEffect(() => {
    if (!authed || !canManualSales) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await adminFetch("/api/admin/affiliates");
        const data = await readJson<{ affiliates?: Affiliate[] }>(
          response,
          "Cargar afiliados",
        );
        if (!cancelled) {
          setAffiliates(
            (data.affiliates || [])
              .filter((affiliate) => affiliate.active)
              .sort((a, b) => a.name.localeCompare(b.name, "es")),
          );
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los afiliados",
          );
        }
      } finally {
        if (!cancelled) setAffiliatesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, canManualSales, adminFetch, readJson, setError]);

  const selectedPack = useMemo(
    () => packs.find((pack) => pack.id === form.packId) || null,
    [packs, form.packId],
  );
  const selectedAffiliate = useMemo(
    () =>
      affiliates.find((affiliate) => affiliate.id === form.affiliateId) || null,
    [affiliates, form.affiliateId],
  );
  const quantity = Math.max(1, Number(form.quantity) || 1);
  const total = selectedPack ? selectedPack.priceClp * quantity : 0;
  const ticketCount = selectedPack ? selectedPack.ticketCount * quantity : 0;

  function updateField(field: keyof ManualSaleForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitSale(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/manual-sales", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          quantity,
          affiliateId: form.affiliateId || undefined,
        }),
      });
      const data = await readJson<ManualSaleResult>(
        response,
        "Registrar venta POS",
      );
      setResult(data);
      setForm(INITIAL_FORM);
      bumpRefresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la venta",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!authed) return null;
  if (!canManualSales) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6">
        <h2 className="font-title text-2xl font-black text-white m-0">
          Acceso restringido
        </h2>
        <p className="text-sm text-red-100/80 m-0 mt-2">
          Solo Admin 1 y Admin 2 pueden registrar ventas POS.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-title text-2xl font-black text-white m-0">
          Venta manual POS
        </h2>
        <p className="text-sm text-brand-muted m-0 mt-1">
          Registra ventas realizadas presencialmente y envía los tickets al
          correo del cliente.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <Panel title="Datos del cliente y pack">
          <form onSubmit={submitSale} className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-[11px] text-brand-muted uppercase font-semibold">
                  Nombre
                </span>
                <input
                  required
                  minLength={2}
                  value={form.firstName}
                  onChange={(event) =>
                    updateField("firstName", event.target.value)
                  }
                  className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white"
                  autoComplete="given-name"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-brand-muted uppercase font-semibold">
                  Apellido
                </span>
                <input
                  required
                  minLength={2}
                  value={form.lastName}
                  onChange={(event) =>
                    updateField("lastName", event.target.value)
                  }
                  className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white"
                  autoComplete="family-name"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-[11px] text-brand-muted uppercase font-semibold">
                  Correo
                </span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white"
                  autoComplete="email"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-brand-muted uppercase font-semibold">
                  Teléfono
                </span>
                <input
                  required
                  minLength={8}
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white"
                  autoComplete="tel"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_140px] gap-3">
              <label className="block space-y-1">
                <span className="text-[11px] text-brand-muted uppercase font-semibold">
                  Pack vendido
                </span>
                <select
                  required
                  value={form.packId}
                  onChange={(event) =>
                    updateField("packId", event.target.value)
                  }
                  className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">
                    {loaded ? "Selecciona un pack" : "Cargando packs…"}
                  </option>
                  {packs.map((pack) => (
                    <option key={pack.id} value={pack.id}>
                      {pack.name} — {formatClp(pack.priceClp)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-brand-muted uppercase font-semibold">
                  Cantidad
                </span>
                <input
                  required
                  type="number"
                  min={1}
                  max={100}
                  value={form.quantity}
                  onChange={(event) =>
                    updateField("quantity", event.target.value)
                  }
                  className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-[11px] text-brand-muted uppercase font-semibold">
                Afiliado (opcional)
              </span>
              <select
                value={form.affiliateId}
                onChange={(event) =>
                  updateField("affiliateId", event.target.value)
                }
                className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="">
                  {affiliatesLoaded
                    ? "Sin afiliado / venta directa"
                    : "Cargando afiliados…"}
                </option>
                {affiliates.map((affiliate) => (
                  <option key={affiliate.id} value={affiliate.id}>
                    {affiliate.code} — {affiliate.name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-brand-muted">
                Si eliges un afiliado, la venta generará su comisión según el
                modelo vigente.
              </span>
            </label>

            <button
              type="submit"
              disabled={busy || !acceptsOrders || !selectedPack}
              className="w-full sm:w-auto bg-brand-greenBright text-black font-bold uppercase px-5 py-2.5 rounded-lg border-none cursor-pointer disabled:opacity-50"
            >
              {busy ? "Registrando…" : "Registrar venta y enviar tickets"}
            </button>
            {!acceptsOrders && (
              <p className="text-amber-200 text-sm m-0">
                El sorteo está cerrado y no acepta nuevas ventas.
              </p>
            )}
          </form>
        </Panel>

        <Panel title="Resumen">
          <div className="p-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-brand-muted">Pack</span>
              <strong className="text-white text-right">
                {selectedPack?.name || "—"}
              </strong>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-brand-muted">Tickets a emitir</span>
              <strong className="text-brand-greenBright">
                {ticketCount || "—"}
              </strong>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-brand-muted">Afiliado</span>
              <strong className="text-white text-right">
                {selectedAffiliate
                  ? `${selectedAffiliate.code} — ${selectedAffiliate.name}`
                  : "Sin asignar"}
              </strong>
            </div>
            <div className="flex justify-between gap-3 border-t border-white/10 pt-3">
              <span className="text-brand-muted">Total registrado</span>
              <strong className="text-brand-gold">
                {total ? formatClp(total) : "—"}
              </strong>
            </div>
            <p className="text-xs text-brand-muted m-0 pt-2">
              La venta queda marcada como Venta POS. Si asignas un afiliado, se
              registrará su comisión automáticamente al emitir los tickets.
            </p>
          </div>
        </Panel>
      </div>

      {result && (
        <Panel title="Venta registrada">
          <div className="p-4 space-y-3">
            <p className="text-brand-greenBright font-semibold m-0">
              {result.message}
            </p>
            <p className="text-sm text-brand-muted m-0">
              Orden {result.order.id} · {result.tickets.length} ticket
              {result.tickets.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap gap-2">
              {result.tickets.map((ticket) => (
                <span
                  key={ticket.code}
                  className="rounded-lg border border-brand-gold/30 bg-brand-gold/10 px-3 py-1.5 font-mono text-sm text-brand-gold"
                >
                  {ticket.code}
                </span>
              ))}
            </div>
            {!result.emailSent && (
              <p className="text-amber-200 text-sm m-0">
                El correo no se confirmó:{" "}
                {result.emailReason ||
                  "revisa el pedido y reenvíalo desde Pedidos"}
                .
              </p>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
