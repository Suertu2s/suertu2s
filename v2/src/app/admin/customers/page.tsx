"use client";

import { useEffect, useState } from "react";
import { formatClp } from "@/data/packs";
import { useAdmin } from "@/components/admin/AdminContext";
import {
  EmptyState,
  ExportButtons,
  Field,
  formatDate,
  Panel,
} from "@/components/admin/ui";

type Customer = {
  email: string;
  full_name: string;
  rut: string;
  phone: string;
  ordersCount: number;
  paidCount: number;
  totalSpentClp: number;
  lastOrderAt: string | null;
  referralCodes: string[];
};

export default function AdminCustomersPage() {
  const { authed, adminFetch, readJson, setError, refreshKey, from, to } =
    useAdmin();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const res = await adminFetch(
          `/api/admin/customers?q=${encodeURIComponent(q)}`,
        );
        const json = await readJson<{ customers: Customer[] }>(res, "Clientes");
        if (!cancelled) setCustomers(json.customers || []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los clientes",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, adminFetch, readJson, setError, refreshKey, from, to, q]);

  if (!authed) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-title text-2xl font-black text-white m-0">
            Clientes
          </h2>
          <p className="text-sm text-brand-muted m-0 mt-1">
            Agregados desde pedidos del período ({customers.length})
          </p>
        </div>
        <ExportButtons
          filenameBase={`clientes_${from}_${to}`}
          rows={[
            [
              "correo",
              "nombre",
              "rut",
              "telefono",
              "pedidos",
              "pagados",
              "gastado",
              "ultimo",
              "referidos",
            ],
            ...customers.map((c) => [
              c.email,
              c.full_name,
              c.rut,
              c.phone,
              String(c.ordersCount),
              String(c.paidCount),
              String(c.totalSpentClp),
              c.lastOrderAt || "",
              c.referralCodes.join("|"),
            ]),
          ]}
        />
      </div>

      <div className="max-w-md">
        <Field
          label="Buscar"
          value={q}
          onChange={setQ}
          placeholder="correo, nombre, RUT…"
        />
      </div>

      <Panel title="Base de clientes">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-brand-muted text-[11px] uppercase">
              <tr>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Contacto</th>
                <th className="px-3 py-2">Pedidos</th>
                <th className="px-3 py-2">Gastado</th>
                <th className="px-3 py-2">Último</th>
                <th className="px-3 py-2">Referidos</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.email} className="border-t border-white/5">
                  <td className="px-3 py-2.5">
                    <div className="text-white font-semibold">
                      {c.full_name}
                    </div>
                    <div className="text-[11px] text-brand-muted">
                      {c.email}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-brand-muted text-xs">
                    <div>{c.phone || "—"}</div>
                    <div>{c.rut || "—"}</div>
                  </td>
                  <td className="px-3 py-2.5 text-white">
                    {c.paidCount}/{c.ordersCount}
                  </td>
                  <td className="px-3 py-2.5 text-brand-gold font-bold">
                    {formatClp(c.totalSpentClp)}
                  </td>
                  <td className="px-3 py-2.5 text-brand-muted whitespace-nowrap">
                    {formatDate(c.lastOrderAt)}
                  </td>
                  <td className="px-3 py-2.5 text-brand-greenBright text-xs font-semibold">
                    {c.referralCodes.join(", ") || "—"}
                  </td>
                </tr>
              ))}
              {!customers.length && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState title="Sin clientes en el período" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
