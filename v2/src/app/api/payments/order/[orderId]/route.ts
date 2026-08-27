import { NextRequest, NextResponse } from "next/server";
import { getOrderDetail, getOrderPackIds } from "@/lib/db/orders";
import { getPackById, getRaffle } from "@/lib/catalog/store";
import { ticketDisplayCode } from "@/lib/tickets/codes";
import { logServerError, publicError } from "@/lib/security/errors";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resumen público de un pedido pagado (página /pago/exito).
 * Solo expone datos de confirmación si el pedido está paid.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> },
) {
  try {
    const limited = rateLimit({
      key: `order-confirm:${clientIp(req)}`,
      limit: 60,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Demasiadas consultas" },
        { status: 429 },
      );
    }

    const { orderId } = await ctx.params;
    if (!orderId || orderId.length > 80) {
      return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
    }

    const detail = await getOrderDetail(orderId);
    if (!detail) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (detail.order.status !== "paid") {
      return NextResponse.json({
        ok: true,
        paid: false,
        status: detail.order.status,
        orderId: detail.order.id,
      });
    }

    const raffle = getRaffle();
    const packIds = await getOrderPackIds(orderId);
    const packs = packIds
      .map((id) => getPackById(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image.replace(/\.webp$/i, "-email.jpg"),
        ticketCount: p.ticketCount,
      }));

    return NextResponse.json({
      ok: true,
      paid: true,
      orderId: detail.order.id,
      email: detail.order.email,
      totalClp: detail.order.total_clp,
      paidAt: detail.order.paid_at,
      raffleTitle: raffle.title,
      prizeName: raffle.prizeName,
      packs,
      tickets: detail.tickets.map((t) => ({
        code: ticketDisplayCode(t, raffle.code || "ST"),
      })),
    });
  } catch (error) {
    logServerError("payments/order-confirmation", error);
    return NextResponse.json(
      { error: publicError(error, "No se pudo cargar la confirmación") },
      { status: 500 },
    );
  }
}
