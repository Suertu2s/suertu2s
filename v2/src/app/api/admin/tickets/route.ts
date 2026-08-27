import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, parseDateRange } from "@/lib/admin/auth";
import { ensureCatalogSynced } from "@/lib/admin/ensure-catalog";
import { listOrders, listTickets } from "@/lib/db/orders";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await ensureCatalogSynced();
    const { from, to } = parseDateRange(req);
    const q = (req.nextUrl.searchParams.get("q") || "").toLowerCase().trim();
    const [tickets, orders] = await Promise.all([listTickets(), listOrders()]);
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    let rows = tickets
      .map((t) => {
        const order = orderMap.get(t.order_id);
        return {
          ...t,
          order_status: order?.status ?? null,
          order_total_clp: order?.total_clp ?? null,
          full_name: order?.full_name ?? null,
          paid_at: order?.paid_at ?? null,
        };
      })
      .filter((t) => {
        const ts = new Date(t.paid_at || t.created_at).getTime();
        return ts >= from.getTime() && ts <= to.getTime();
      });

    if (q) {
      rows = rows.filter(
        (t) =>
          String(t.number).includes(q) ||
          (t.code || "").toLowerCase().includes(q) ||
          t.email.includes(q) ||
          (t.full_name || "").toLowerCase().includes(q) ||
          t.order_id.toLowerCase().includes(q),
      );
    }

    return NextResponse.json({
      tickets: rows,
      total: rows.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al cargar números";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
