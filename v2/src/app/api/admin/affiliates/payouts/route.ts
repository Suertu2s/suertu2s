import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthorized } from "@/lib/admin/auth";
import { buildAffiliateStats } from "@/lib/admin/analytics";
import { ensureCatalogSynced } from "@/lib/admin/ensure-catalog";
import {
  createPayout,
  listAffiliates,
  listOrders,
  listPayouts,
} from "@/lib/db/orders";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await ensureCatalogSynced();
    const [payouts, affiliates] = await Promise.all([
      listPayouts(),
      listAffiliates(),
    ]);
    const affMap = new Map(affiliates.map((a) => [a.id, a]));
    return NextResponse.json({
      payouts: payouts.map((p) => ({
        ...p,
        affiliate_code: affMap.get(p.affiliate_id)?.code ?? null,
        affiliate_name: affMap.get(p.affiliate_id)?.name ?? null,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al cargar liquidaciones";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const schema = z.object({
  affiliate_id: z.string().min(1),
  amount_clp: z.number().positive(),
  period_from: z.string().min(8),
  period_to: z.string().min(8),
  note: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await ensureCatalogSynced();
    const body = schema.parse(await req.json());

    const [affiliates, orders, payouts] = await Promise.all([
      listAffiliates(),
      listOrders(),
      listPayouts(),
    ]);
    const stats = buildAffiliateStats(
      affiliates,
      orders,
      payouts,
      new Date(0),
      new Date(),
    );
    const stat = stats.find((s) => s.affiliate.id === body.affiliate_id);
    if (!stat) {
      return NextResponse.json(
        { error: "Afiliado no encontrado" },
        { status: 404 },
      );
    }
    if (body.amount_clp > stat.commissionBalanceClp) {
      return NextResponse.json(
        {
          error: `El monto excede el saldo disponible (${stat.commissionBalanceClp} CLP)`,
        },
        { status: 400 },
      );
    }

    const duplicate = payouts.some(
      (p) =>
        p.affiliate_id === body.affiliate_id &&
        p.period_from === body.period_from &&
        p.period_to === body.period_to,
    );
    if (duplicate) {
      return NextResponse.json(
        { error: "Ya existe una liquidación para ese período" },
        { status: 400 },
      );
    }

    const payout = await createPayout(body);
    return NextResponse.json({ payout });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo registrar pago";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
