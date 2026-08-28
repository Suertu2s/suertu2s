import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedAffiliate } from "@/lib/affiliate/auth";
import { buildAffiliatePortalDashboard } from "@/lib/affiliate/dashboard";
import {
  listAffiliates,
  listCommissions,
  listOrders,
  listOrdersByAffiliate,
  listPayouts,
  listTickets,
} from "@/lib/db/orders";
import { logServerError, publicError } from "@/lib/security/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteUrl(req: NextRequest) {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export async function GET(req: NextRequest) {
  const affiliate = await getAuthorizedAffiliate(req);
  if (!affiliate) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const [orders, payouts, affiliates, commissions, allOrders, tickets] =
      await Promise.all([
        listOrdersByAffiliate(affiliate.id),
        listPayouts(),
        listAffiliates(),
        listCommissions(),
        listOrders(),
        listTickets(),
      ]);
    const dashboard = buildAffiliatePortalDashboard(
      affiliate,
      orders,
      payouts,
      siteUrl(req),
      affiliates,
      commissions,
      allOrders,
      tickets,
    );
    return NextResponse.json(dashboard);
  } catch (error) {
    logServerError("affiliate/dashboard", error);
    return NextResponse.json(
      { error: publicError(error, "No se pudo cargar el portal") },
      { status: 500 },
    );
  }
}
