"use client";

import type { ReactNode } from "react";
import { orderStatusLabel } from "@/lib/i18n/labels";

export function KpiCard({
  label,
  value,
  hint,
  accent,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  delta?: number;
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
      <div className="mt-2 flex items-center gap-2 min-h-[1rem]">
        {typeof delta === "number" && (
          <span
            className={`text-[11px] font-bold ${
              delta > 0
                ? "text-brand-greenBright"
                : delta < 0
                  ? "text-red-300"
                  : "text-brand-muted"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta}% vs período anterior
          </span>
        )}
        {hint && <span className="text-[11px] text-brand-muted">{hint}</span>}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-brand-green/30 text-brand-greenBright border-brand-greenBright/30",
    pending: "bg-brand-gold/15 text-brand-gold border-brand-gold/30",
    failed: "bg-red-500/15 text-red-300 border-red-400/30",
    cancelled: "bg-white/5 text-brand-muted border-white/10",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
        styles[status] || styles.cancelled
      }`}
    >
      {orderStatusLabel(status)}
    </span>
  );
}

export function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="py-12 text-center">
      <p className="text-white font-bold m-0">{title}</p>
      {subtitle && (
        <p className="text-brand-muted text-sm m-0 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border border-white/10 rounded-2xl overflow-hidden bg-brand-bgLight/30">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-white font-bold text-sm m-0 uppercase tracking-wide">
          {title}
        </h2>
        {actions}
      </div>
      <div className="p-0">{children}</div>
    </section>
  );
}

export function exportCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  // BOM para que Excel abra bien acentos en CSV
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Exporta filas limpias a .xlsx (Excel). */
export async function exportXlsx(filename: string, rows: string[][]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Ancho de columna aproximado según contenido
  const colCount = Math.max(0, ...rows.map((r) => r.length));
  ws["!cols"] = Array.from({ length: colCount }, (_, i) => {
    let max = 10;
    for (const row of rows) {
      const cell = row[i];
      if (cell == null) continue;
      max = Math.max(max, Math.min(48, String(cell).length + 2));
    }
    return { wch: max };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  const name = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, name);
}

export function ExportButtons({
  filenameBase,
  rows,
}: {
  /** Nombre sin extensión, ej. pedidos_2026-01-01_2026-01-31 */
  filenameBase: string;
  rows: string[][];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => exportCsv(`${filenameBase}.csv`, rows)}
        className="text-xs text-black bg-brand-gold font-bold px-3 py-2 rounded-lg border-none cursor-pointer"
      >
        Exportar CSV
      </button>
      <button
        type="button"
        onClick={() => {
          void exportXlsx(`${filenameBase}.xlsx`, rows);
        }}
        className="text-xs text-black bg-brand-greenBright font-bold px-3 py-2 rounded-lg border-none cursor-pointer"
      >
        Exportar Excel
      </button>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] text-brand-muted uppercase font-semibold tracking-wide">
        {label}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-brand-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand-gold/50 disabled:opacity-60"
        autoComplete="off"
      />
    </label>
  );
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
