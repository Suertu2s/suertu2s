import { NextRequest, NextResponse } from "next/server";
import {
  getOrder,
  getOrderByPaymentExternal,
  markOrderFailed,
} from "@/lib/db/orders";
import { confirmFlowPaymentByToken } from "@/lib/payments/flow-confirm";
import { getFlowPaymentStatus } from "@/lib/payments/flow";
import { logServerError } from "@/lib/security/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Preferir el host real del return (usuario ya está ahí) sobre env desactualizado. */
function resolveSiteUrl(req: NextRequest) {
  try {
    const fromReq = new URL(req.url);
    if (
      fromReq.hostname &&
      fromReq.hostname !== "localhost" &&
      fromReq.hostname !== "127.0.0.1"
    ) {
      return fromReq.origin;
    }
  } catch {
    // ignore
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function redirectExito(
  site: string,
  orderId: string,
  opts?: { pending?: boolean },
) {
  const url = new URL(`${site}/pago/exito`);
  if (orderId) url.searchParams.set("orderId", orderId);
  if (opts?.pending) url.searchParams.set("pending", "1");
  return NextResponse.redirect(url.toString());
}

export async function GET(req: NextRequest) {
  return handleReturn(req);
}

export async function POST(req: NextRequest) {
  return handleReturn(req);
}

async function handleReturn(req: NextRequest) {
  const site = resolveSiteUrl(req);
  let token = "";

  try {
    token = req.nextUrl.searchParams.get("token") || "";

    if (!token && req.method === "POST") {
      try {
        const formData = await req.formData();
        token = String(formData.get("token") || "");
      } catch {
        const json = await req.json().catch(() => ({}));
        token = String((json as { token?: string })?.token || "");
      }
    }

    token = token.trim();

    if (!token) {
      // Sin token no podemos confirmar; no digamos "pago fallido" si pudo cobrarse
      return NextResponse.redirect(`${site}/pago/error?reason=no_token`);
    }

    let flowStatus: Awaited<ReturnType<typeof getFlowPaymentStatus>>;
    try {
      flowStatus = await getFlowPaymentStatus(token);
    } catch (statusErr) {
      logServerError("payments/flow/return/status", statusErr);
      const byToken = await getOrderByPaymentExternal(token);
      // El cobro pudo existir: manda a éxito pendiente para reconciliar
      return redirectExito(site, byToken?.id || "", {
        pending: true,
      });
    }

    const orderId = String(flowStatus.commerceOrder || "");
    const order =
      (orderId ? await getOrder(orderId) : null) ||
      (await getOrderByPaymentExternal(token));

    if (order?.status === "paid") {
      return redirectExito(site, order.id);
    }

    // 2 = pagado → cumplir (códigos + correo) y página de éxito
    if (flowStatus.status === 2) {
      const result = await confirmFlowPaymentByToken(token);
      const confirmedId = result.orderId || order?.id || orderId;
      if (result.ok && result.paid) {
        return redirectExito(site, confirmedId);
      }
      logServerError(
        "payments/flow/return",
        new Error(result.error || "confirm_failed_on_paid_status"),
      );
      // Flow cobró: nunca mandar a error genérico
      return redirectExito(site, confirmedId, { pending: true });
    }

    // 1 = pendiente: esperar webhook / reconcile
    if (flowStatus.status === 1) {
      return redirectExito(site, order?.id || orderId, {
        pending: true,
      });
    }

    // 3 rechazado / 4 anulado
    if (orderId) {
      try {
        await markOrderFailed(orderId);
      } catch (markErr) {
        logServerError("payments/flow/return/mark-failed", markErr);
      }
    }
    return NextResponse.redirect(
      `${site}/pago/error?orderId=${encodeURIComponent(orderId)}&status=${flowStatus.status}`,
    );
  } catch (error) {
    logServerError("payments/flow/return", error);
    // Ante fallo de infra, si hay token → éxito pendiente (el dinero pudo cobrarse)
    if (token) {
      const byToken = await getOrderByPaymentExternal(token).catch(() => null);
      return redirectExito(site, byToken?.id || "", {
        pending: true,
      });
    }
    return NextResponse.redirect(`${site}/pago/error?reason=flow_error`);
  }
}
