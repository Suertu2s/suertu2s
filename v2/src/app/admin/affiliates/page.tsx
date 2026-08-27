"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatClp } from "@/data/packs";
import { useAdmin } from "@/components/admin/AdminContext";
import {
  EmptyState,
  ExportButtons,
  Field,
  formatDate,
  Panel,
} from "@/components/admin/ui";
import type { Affiliate, AffiliateStat } from "@/components/admin/types";

type Payout = {
  id: string;
  affiliate_id: string;
  amount_clp: number;
  period_from: string;
  period_to: string;
  note: string | null;
  paid_at: string;
  affiliate_code?: string | null;
  affiliate_name?: string | null;
};

export default function AdminAffiliatesPage() {
  const {
    authed,
    adminFetch,
    readJson,
    setError,
    refreshKey,
    bumpRefresh,
    from,
    to,
  } = useAdmin();
  const [stats, setStats] = useState<AffiliateStat[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [orphanCodes, setOrphanCodes] = useState<
    Array<{ code: string; uses: number; salesClp: number }>
  >([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [affForm, setAffForm] = useState({
    code: "",
    name: "",
    email: "",
    password: "",
    commission_type: "percent" as "percent" | "fixed",
    commission_value: 10,
    active: true,
  });
  const [payoutForm, setPayoutForm] = useState({
    affiliate_id: "",
    amount_clp: "",
    note: "",
  });

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const [affRes, payRes] = await Promise.all([
          adminFetch("/api/admin/affiliates"),
          adminFetch("/api/admin/affiliates/payouts"),
        ]);
        const aff = await readJson<{
          affiliates: Affiliate[];
          stats: AffiliateStat[];
          orphanCodes: Array<{ code: string; uses: number; salesClp: number }>;
        }>(affRes, "Afiliados");
        const pay = await readJson<{ payouts: Payout[] }>(
          payRes,
          "Liquidaciones",
        );
        if (!cancelled) {
          setAffiliates(aff.affiliates || []);
          setStats(aff.stats || []);
          setOrphanCodes(aff.orphanCodes || []);
          setPayouts(pay.payouts || []);
          if (!payoutForm.affiliate_id && aff.affiliates?.[0]) {
            setPayoutForm((f) => ({
              ...f,
              affiliate_id: aff.affiliates[0].id,
            }));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los afiliados",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, adminFetch, readJson, setError, refreshKey, from, to]);

  async function saveAffiliate(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await adminFetch("/api/admin/affiliates", {
        method: "POST",
        body: JSON.stringify({
          code: affForm.code,
          name: affForm.name,
          email: affForm.email || null,
          password: affForm.password || null,
          commission_type: affForm.commission_type,
          commission_value: Number(affForm.commission_value),
          active: affForm.active,
        }),
      });
      await readJson(res, "Guardar afiliado");
      setAffForm({
        code: "",
        name: "",
        email: "",
        password: "",
        commission_type: "percent",
        commission_value: 10,
        active: true,
      });
      bumpRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  async function savePayout(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await adminFetch("/api/admin/affiliates/payouts", {
        method: "POST",
        body: JSON.stringify({
          affiliate_id: payoutForm.affiliate_id,
          amount_clp: Number(payoutForm.amount_clp),
          period_from: from,
          period_to: to,
          note: payoutForm.note || null,
        }),
      });
      await readJson(res, "Registrar liquidación");
      setPayoutForm((f) => ({ ...f, amount_clp: "", note: "" }));
      bumpRefresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo registrar pago",
      );
    }
  }

  if (!authed) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-title text-2xl font-black text-white m-0">
            Afiliados & liquidaciones
          </h2>
          <p className="text-sm text-brand-muted m-0 mt-1">
            Usos de códigos, comisiones devengadas, pagos y saldo a pagar.
          </p>
        </div>
        <ExportButtons
          filenameBase={`afiliados_${from}_${to}`}
          rows={[
            [
              "ranking",
              "codigo",
              "nombre",
              "usos",
              "ventas",
              "devengado",
              "pagado",
              "saldo",
              "regla",
            ],
            ...stats.map((s, index) => [
              String(index + 1),
              s.affiliate.code,
              s.affiliate.name,
              String(s.uses),
              String(s.salesClp),
              String(s.commissionEarnedClp),
              String(s.commissionPaidClp),
              String(s.commissionBalanceClp),
              s.affiliate.commission_type === "percent"
                ? `${s.affiliate.commission_value}%`
                : String(s.affiliate.commission_value),
            ]),
          ]}
        />
      </div>

      <form
        onSubmit={saveAffiliate}
        className="border border-white/10 rounded-2xl p-5 bg-brand-bgLight/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        <h3 className="sm:col-span-2 lg:col-span-3 text-white font-bold m-0 text-sm uppercase tracking-wide">
          Crear / actualizar afiliado
        </h3>
        <Field
          label="Código"
          value={affForm.code}
          onChange={(v) => setAffForm((f) => ({ ...f, code: v.toUpperCase() }))}
          placeholder="STJP48"
          required
        />
        <Field
          label="Nombre"
          value={affForm.name}
          onChange={(v) => setAffForm((f) => ({ ...f, name: v }))}
          required
        />
        <Field
          label="Correo (portal afiliado)"
          value={affForm.email}
          onChange={(v) => setAffForm((f) => ({ ...f, email: v }))}
          type="email"
        />
        <div className="space-y-1">
          <Field
            label="Contraseña portal (crear o cambiar)"
            value={affForm.password}
            onChange={(v) => setAffForm((f) => ({ ...f, password: v }))}
            type="password"
            placeholder="Mín. 6 caracteres"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const chars =
                  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                let pass = "";
                const bytes = new Uint8Array(10);
                crypto.getRandomValues(bytes);
                for (const b of bytes) pass += chars[b % chars.length];
                setAffForm((f) => ({ ...f, password: pass }));
              }}
              className="text-xs font-bold text-brand-greenBright bg-transparent border border-brand-greenBright/40 rounded-lg px-3 py-1.5 cursor-pointer"
            >
              Generar clave temporal
            </button>
            <button
              type="button"
              disabled={!affForm.password}
              onClick={() => {
                void navigator.clipboard
                  .writeText(affForm.password)
                  .catch(() => {
                    setError("No se pudo copiar la clave");
                  });
              }}
              className="text-xs font-bold text-brand-gold bg-transparent border border-brand-gold/40 rounded-lg px-3 py-1.5 cursor-pointer disabled:opacity-40"
            >
              Copiar clave
            </button>
          </div>
        </div>
        <label className="block space-y-1">
          <span className="text-[11px] text-brand-muted uppercase font-semibold">
            Tipo comisión
          </span>
          <select
            value={affForm.commission_type}
            onChange={(e) =>
              setAffForm((f) => ({
                ...f,
                commission_type: e.target.value as "percent" | "fixed",
              }))
            }
            className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="percent">Porcentaje (%)</option>
            <option value="fixed">Monto fijo (CLP)</option>
          </select>
        </label>
        <Field
          label={
            affForm.commission_type === "percent"
              ? "% Comisión"
              : "Comisión fija CLP"
          }
          value={String(affForm.commission_value)}
          onChange={(v) =>
            setAffForm((f) => ({ ...f, commission_value: Number(v) || 0 }))
          }
          type="number"
          required
        />
        <label className="flex items-center gap-2 text-sm text-brand-muted sm:col-span-2">
          <input
            type="checkbox"
            checked={affForm.active}
            onChange={(e) =>
              setAffForm((f) => ({ ...f, active: e.target.checked }))
            }
            className="size-4 accent-brand-greenBright"
          />
          Afiliado activo (acepta referidos en checkout)
        </label>
        <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-end justify-between gap-3">
          <p className="text-xs text-brand-muted m-0 max-w-xl">
            Con email + contraseña el afiliado entra a{" "}
            <code className="text-brand-gold">/afiliados</code> a ver ventas y
            saldo. Si actualizas uno existente, deja la contraseña vacía para no
            cambiarla.
          </p>
          <button
            type="submit"
            className="bg-brand-greenBright text-black font-bold uppercase py-2.5 px-5 rounded-lg border-none cursor-pointer"
          >
            Guardar afiliado
          </button>
        </div>
      </form>

      <Panel title="Ranking de colaboradores (por ventas)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-brand-muted text-[11px] uppercase">
              <tr>
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Usos</th>
                <th className="px-3 py-2">Ventas</th>
                <th className="px-3 py-2">Devengado</th>
                <th className="px-3 py-2">Pagado</th>
                <th className="px-3 py-2">Saldo</th>
                <th className="px-3 py-2">Regla</th>
                <th className="px-3 py-2">Último uso</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, index) => (
                <tr key={s.affiliate.id} className="border-t border-white/5">
                  <td className="px-3 py-2.5 text-brand-gold font-black tabular-nums">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-brand-greenBright font-bold">
                      {s.affiliate.code}
                    </div>
                    <div className="text-[11px] text-brand-muted">
                      {s.affiliate.name}
                      {!s.affiliate.active && " · inactivo"}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-white">{s.uses}</td>
                  <td className="px-3 py-2.5 text-white">
                    {formatClp(s.salesClp)}
                  </td>
                  <td className="px-3 py-2.5 text-white">
                    {formatClp(s.commissionEarnedClp)}
                  </td>
                  <td className="px-3 py-2.5 text-brand-muted">
                    {formatClp(s.commissionPaidClp)}
                  </td>
                  <td className="px-3 py-2.5 text-brand-gold font-bold">
                    {formatClp(s.commissionBalanceClp)}
                  </td>
                  <td className="px-3 py-2.5 text-brand-muted">
                    {s.affiliate.commission_type === "percent"
                      ? `${s.affiliate.commission_value}%`
                      : formatClp(Number(s.affiliate.commission_value))}
                  </td>
                  <td className="px-3 py-2.5 text-brand-muted whitespace-nowrap">
                    {formatDate(s.lastUsedAt)}
                  </td>
                </tr>
              ))}
              {!stats.length && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState title="Sin afiliados" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form
          onSubmit={savePayout}
          className="border border-white/10 rounded-2xl p-5 bg-brand-bgLight/30 space-y-3"
        >
          <h3 className="text-white font-bold m-0 text-sm uppercase tracking-wide">
            Registrar liquidación
          </h3>
          <label className="block space-y-1">
            <span className="text-[11px] text-brand-muted uppercase font-semibold">
              Afiliado
            </span>
            <select
              required
              value={payoutForm.affiliate_id}
              onChange={(e) =>
                setPayoutForm((f) => ({ ...f, affiliate_id: e.target.value }))
              }
              className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            >
              {affiliates.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Monto CLP"
            value={payoutForm.amount_clp}
            onChange={(v) => setPayoutForm((f) => ({ ...f, amount_clp: v }))}
            type="number"
            required
          />
          <Field
            label="Nota"
            value={payoutForm.note}
            onChange={(v) => setPayoutForm((f) => ({ ...f, note: v }))}
            placeholder="Transferencia, efectivo…"
          />
          <p className="text-[11px] text-brand-muted m-0">
            Período asociado: {from} → {to}
          </p>
          <button
            type="submit"
            className="w-full bg-brand-gold text-black font-bold uppercase py-2.5 rounded-lg border-none cursor-pointer"
          >
            Registrar pago
          </button>
        </form>

        <Panel title="Historial de liquidaciones">
          <ul className="m-0 p-0 list-none divide-y divide-white/5 max-h-80 overflow-auto">
            {payouts.map((p) => (
              <li key={p.id} className="px-4 py-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-brand-greenBright font-bold">
                    {p.affiliate_code || p.affiliate_id.slice(0, 8)}
                  </span>
                  <span className="text-brand-gold font-bold">
                    {formatClp(p.amount_clp)}
                  </span>
                </div>
                <div className="text-[11px] text-brand-muted mt-1">
                  {formatDate(p.paid_at)} · {p.period_from} → {p.period_to}
                  {p.note ? ` · ${p.note}` : ""}
                </div>
              </li>
            ))}
            {!payouts.length && (
              <li className="p-4">
                <EmptyState title="Sin liquidaciones registradas" />
              </li>
            )}
          </ul>
        </Panel>
      </div>

      {!!orphanCodes.length && (
        <Panel title="Códigos usados sin ficha de afiliado">
          <ul className="m-0 p-0 list-none divide-y divide-white/5">
            {orphanCodes.map((c) => (
              <li
                key={c.code}
                className="px-4 py-3 flex justify-between text-sm"
              >
                <span className="font-bold text-brand-greenBright">
                  {c.code}
                </span>
                <span className="text-brand-muted">
                  {c.uses} usos · {formatClp(c.salesClp)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
