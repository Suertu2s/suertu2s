import { NextRequest, NextResponse } from "next/server";
import { getOrder, markOrderFailed } from "@/lib/db/orders";
import { confirmFlowPaymentByToken } from "@/lib/payments/flow-confirm";
import { getFlowPaymentStatus } from "@/lib/payments/flow";
import { logServerError } from "@/lib/security/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleReturn(req);
}

export async function POST(req: NextRequest) {
  return handleReturn(req);
}

async function handleReturn(req: NextRequest) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    let token = req.nextUrl.searchParams.get("token") || "";

    if (!token && req.method === "POST") {
      try {
        const formData = await req.formData();
        token = String(formData.get("token") || "");
      } catch {
        const json = await req.json().catch(() => ({}));
        token = String(json?.token || "");
      }
    }

    if (!token) {
      return NextResponse.redirect(`${site}/pago/error?reason=no_token`);
    }

    const flowStatus = await getFlowPaymentStatus(token);
    const orderId = flowStatus.commerceOrder;
    const order = await getOrder(orderId);

    if (order?.status === "paid") {
      return NextResponse.redirect(
        `${site}/pago/exito?orderId=${encodeURIComponent(orderId)}`,
      );
    }

    // 2 = pagado → cumplir solo (códigos + correo + panel)
    if (flowStatus.status === 2) {
      const result = await confirmFlowPaymentByToken(token);
      if (result.ok && result.paid) {
        return NextResponse.redirect(
          `${site}/pago/exito?orderId=${encodeURIComponent(orderId)}`,
        );
      }
      logServerError(
        "payments/flow/return",
        new Error(result.error || "confirm_failed_on_paid_status"),
      );
      // Flow dice pagado: no mandar a error genérico; la página puede reconciliar
      return NextResponse.redirect(
        `${site}/pago/exito?orderId=${encodeURIComponent(orderId)}&pending=1`,
      );
    }

    // 1 = pendiente: esperar webhook / reconciliación. Nunca marcar fallido.
    if (flowStatus.status === 1) {
      return NextResponse.redirect(
        `${site}/pago/exito?orderId=${encodeURIComponent(orderId)}&pending=1&token=${encodeURIComponent(token)}`,
      );
    }

    // 3 rechazado / 4 anulado
    await markOrderFailed(orderId);
    return NextResponse.redirect(
      `${site}/pago/error?orderId=${encodeURIComponent(orderId)}&status=${flowStatus.status}`,
    );
  } catch (error) {
    logServerError("payments/flow/return", error);
    return NextResponse.redirect(`${site}/pago/error?reason=flow_error`);
  }
}
