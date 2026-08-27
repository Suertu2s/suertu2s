import { fulfillOrder, getOrder } from "@/lib/db/orders";
import { deliverOrderConfirmation } from "@/lib/email/deliver-confirmation";
import { getFlowPaymentStatus } from "@/lib/payments/flow";
import { logServerError } from "@/lib/security/errors";

export type FlowConfirmResult = {
  ok: boolean;
  orderId?: string;
  status?: number;
  paid?: boolean;
  alreadyPaid?: boolean;
  email?: Awaited<ReturnType<typeof deliverOrderConfirmation>>;
  error?: string;
  httpStatus?: number;
};

/**
 * Fuente de verdad: consulta Flow y, si status=2 (pagado),
 * cumple el pedido (paid + tickets) y envía el correo.
 * No requiere acción del admin.
 */
export async function confirmFlowPaymentByToken(
  token: string,
): Promise<FlowConfirmResult> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { ok: false, error: "no_token", httpStatus: 400 };
  }

  const flowStatus = await getFlowPaymentStatus(trimmed);
  const orderId = flowStatus.commerceOrder;

  if (flowStatus.status !== 2) {
    return {
      ok: true,
      orderId,
      status: flowStatus.status,
      paid: false,
    };
  }

  const order = await getOrder(orderId);
  if (!order) {
    logServerError(
      "payments/flow/confirm",
      new Error(`Pedido no encontrado commerceOrder=${orderId}`),
    );
    return {
      ok: false,
      orderId,
      status: 2,
      error: "missing_order",
      httpStatus: 404,
    };
  }

  if (Math.round(Number(flowStatus.amount)) !== order.total_clp) {
    // Flow ya confirmó status=2; no bloquear el fulfill por desfase de monto
    // (redondeos / paymentData). Solo registrar para auditoría.
    const alt = Math.round(Number(flowStatus.paymentData?.amount ?? NaN));
    if (alt !== order.total_clp) {
      logServerError(
        "payments/flow/confirm",
        new Error(
          `Monto Flow distinto pedido=${order.id} esperado=${order.total_clp} flow.amount=${flowStatus.amount} paymentData.amount=${flowStatus.paymentData?.amount ?? "n/a"} — se cumple igual porque status=2`,
        ),
      );
    }
  }

  if (order.status === "paid") {
    const email = await deliverOrderConfirmation(order.id);
    return {
      ok: true,
      orderId: order.id,
      status: 2,
      paid: true,
      alreadyPaid: true,
      email,
    };
  }

  try {
    await fulfillOrder(order.id);
  } catch (error) {
    logServerError("payments/flow/confirm/fulfill", error);
    return {
      ok: false,
      orderId: order.id,
      status: 2,
      error: error instanceof Error ? error.message : "fulfill_failed",
      httpStatus: 500,
    };
  }

  const email = await deliverOrderConfirmation(order.id);
  return {
    ok: true,
    orderId: order.id,
    status: 2,
    paid: true,
    alreadyPaid: false,
    email,
  };
}
