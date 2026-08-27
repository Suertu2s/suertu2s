import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, parseDateRange } from "@/lib/admin/auth";
import { ensureCatalogSynced } from "@/lib/admin/ensure-catalog";
import { buildBusinessAnalytics } from "@/lib/admin/analytics";
import {
  listAffiliates,
  listOrderItems,
  listOrders,
  listPayouts,
  listTickets,
} from "@/lib/db/orders";
import { logServerError, publicError } from "@/lib/security/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await ensureCatalogSynced();
    const { from, to } = parseDateRange(req);
    const prizeId = req.nextUrl.searchParams.get("prizeId");
    const [orders, items, tickets, affiliates, payouts] = await Promise.all([
      listOrders(),
      listOrderItems(),
      listTickets(),
      listAffiliates(),
      listPayouts(),
    ]);

    const analytics = buildBusinessAnalytics({
      orders,
      items,
      tickets,
      affiliates,
      payouts,
      from,
      to,
      prizeId,
    });

    return NextResponse.json(analytics);
  } catch (error) {
    logServerError("admin/analytics", error);
    return NextResponse.json(
      { error: publicError(error, "Error al cargar analítica") },
      { status: 500 },
    );
  }
}
