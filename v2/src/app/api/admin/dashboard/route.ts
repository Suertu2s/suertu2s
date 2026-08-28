import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, parseDateRange } from "@/lib/admin/auth";
import {
  buildAffiliateStats,
  buildOrphanReferralStats,
  buildPackMix,
  buildProviderMix,
  buildSalesKpis,
} from "@/lib/admin/analytics";
import { getRaffle, syncCatalogFromDb } from "@/lib/catalog/store";
import {
  listAffiliates,
  listCommissions,
  listOrderItems,
  listOrders,
  listPayouts,
  listTickets,
  paymentsMockEnabled,
} from "@/lib/db/orders";
import { isSupabaseConfigured } from "@/lib/db/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await syncCatalogFromDb();

    const { from, to } = parseDateRange(req);
    const [orders, affiliates, items, payouts, tickets, commissions] =
      await Promise.all([
        listOrders(),
        listAffiliates(),
        listOrderItems(),
        listPayouts(),
        listTickets(),
        listCommissions(),
      ]);

    const kpis = buildSalesKpis(orders, from, to);
    const affiliateStats = buildAffiliateStats(
      affiliates,
      orders,
      payouts,
      from,
      to,
      commissions,
      tickets,
    );
    const orphanCodes = buildOrphanReferralStats(affiliates, orders, from, to);
    const providerMix = buildProviderMix(orders, from, to);
    const packMix = buildPackMix(orders, items, from, to);
    const totalBalance = affiliateStats.reduce(
      (acc, a) => acc + a.commissionBalanceClp,
      0,
    );
    const totalEarned = affiliateStats.reduce(
      (acc, a) => acc + a.commissionEarnedClp,
      0,
    );

    const raffle = getRaffle();
    const supabaseOk = isSupabaseConfigured();
    const ops = {
      paymentsMock: paymentsMockEnabled(),
      flowConfigured: Boolean(
        process.env.FLOW_API_KEY && process.env.FLOW_SECRET_KEY,
      ),
      dbConfigured: supabaseOk,
      supabaseConfigured: supabaseOk,
      emailConfigured: Boolean(process.env.RESEND_API_KEY),
      liveStreamConfigured: Boolean(raffle.liveStreamUrl?.trim()),
      raffleStatus: raffle.raffleStatus === "closed" ? "closed" : "open",
      winnerConfigured: Boolean(raffle.winnerTicketCode?.trim()),
    };

    return NextResponse.json(
      {
        kpis: {
          ...kpis,
          commissionsOwedClp: totalBalance,
          commissionsEarnedClp: totalEarned,
          ticketsIssued: tickets.filter((t) => {
            const order = orders.find((o) => o.id === t.order_id);
            if (!order || order.status !== "paid") return false;
            const ts = new Date(order.paid_at || order.created_at).getTime();
            return ts >= from.getTime() && ts <= to.getTime();
          }).length,
        },
        affiliateStats: affiliateStats.slice(0, 5),
        orphanCodes,
        providerMix,
        packMix,
        ops,
        raffle: {
          title: raffle.title,
          prizeName: raffle.prizeName,
          code: raffle.code,
          endsAt: raffle.endsAt,
          raffleStatus: raffle.raffleStatus === "closed" ? "closed" : "open",
          winnerTicketCode: raffle.winnerTicketCode,
        },
        alerts: {
          pendingOrders: kpis.ordersPending,
          orphanCodes: orphanCodes.length,
          unpaidCommissions: affiliateStats.filter(
            (a) => a.commissionBalanceClp > 0,
          ).length,
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al cargar el resumen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
