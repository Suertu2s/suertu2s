import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrder } from "@/lib/db/orders";
import { confirmFlowPaymentByToken } from "@/lib/payments/flow-confirm";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { logServerError, publicError } from "@/lib/security/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  orderId: z.string().min(1).max(80),
  token: z.string().min(1).max(200).optional(),
});

/**
 * Reconcilia un pedido pendiente contra Flow.
 * Lo usa la página de éxito cuando el return llega antes que el webhook.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit({
      key: `flow-reconcile:${clientIp(req)}`,
      limit: 40,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Demasiadas consultas. Intenta más tarde." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    const body = schema.parse(await req.json());
    const order = await getOrder(body.orderId);
    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (order.status === "paid") {
      return NextResponse.json({
        ok: true,
        paid: true,
        alreadyPaid: true,
        orderId: order.id,
      });
    }

    const token = (body.token || order.payment_external_id || "").trim();
    if (!token || order.payment_provider !== "flow") {
      return NextResponse.json(
        {
          ok: true,
          paid: false,
          reason: "Sin token Flow para reconciliar",
          orderId: order.id,
          status: order.status,
        },
        { status: 200 },
      );
    }

    const result = await confirmFlowPaymentByToken(token);
    return NextResponse.json(
      {
        ok: result.ok,
        paid: Boolean(result.paid),
        alreadyPaid: Boolean(result.alreadyPaid),
        orderId: result.orderId || order.id,
        flowStatus: result.status,
        email: result.email,
        error: result.error,
      },
      { status: result.ok || !result.paid ? 200 : result.httpStatus || 500 },
    );
  } catch (error) {
    logServerError("payments/flow/reconcile", error);
    return NextResponse.json(
      {
        error: publicError(error, "No se pudo reconciliar el pago", {
          allowZod: true,
        }),
      },
      { status: 400 },
    );
  }
}
