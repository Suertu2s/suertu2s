import { NextRequest, NextResponse } from "next/server";
import { confirmFlowPaymentByToken } from "@/lib/payments/flow-confirm";
import { logServerError } from "@/lib/security/errors";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readToken(req: NextRequest): Promise<string> {
  let token = "";
  try {
    const formData = await req.formData();
    token = String(formData.get("token") || "");
  } catch {
    try {
      const json = await req.json();
      token = String(json?.token || "");
    } catch {
      token = "";
    }
  }
  if (!token) {
    token = req.nextUrl.searchParams.get("token") || "";
  }
  return token.trim();
}

/**
 * Notificación de Flow (urlConfirmation).
 * Debe confirmar el pago solo: marcar paid, emitir códigos y enviar correo.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit({
      key: `flow-webhook:${clientIp(req)}`,
      limit: 120,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes" },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    const token = await readToken(req);
    if (!token) {
      // No devolver 200: Flow dejaría de reintentar y el pedido quedaría pendiente
      return NextResponse.json({ error: "no_token" }, { status: 400 });
    }

    const result = await confirmFlowPaymentByToken(token);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "confirm_failed", orderId: result.orderId },
        { status: result.httpStatus || 500 },
      );
    }

    if (!result.paid) {
      // Aún no pagado en Flow (status 1/3/4) — 200 para no saturar reintentos
      return NextResponse.json({
        ok: true,
        status: result.status,
        orderId: result.orderId,
        paid: false,
      });
    }

    return NextResponse.json({
      ok: true,
      paid: true,
      alreadyPaid: Boolean(result.alreadyPaid),
      orderId: result.orderId,
      email: result.email,
    });
  } catch (error) {
    logServerError("payments/flow/webhook", error);
    return NextResponse.json(
      { error: "No se pudo procesar la notificación de pago Flow" },
      { status: 500 },
    );
  }
}
