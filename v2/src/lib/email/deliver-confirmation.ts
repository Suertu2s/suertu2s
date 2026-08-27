import {
  getOrderDetail,
  getOrderPackIds,
  markConfirmationEmailSent,
} from "@/lib/db/orders";
import { sendOrderConfirmation } from "@/lib/email";
import { logServerError } from "@/lib/security/errors";

/**
 * Envía el email de confirmación si aún no se marcó como enviado.
 * Los reintentos de webhook llaman esto aunque alreadyPaid=true.
 * Nunca bloquea el fulfill: si el mail falla, el pedido igual queda paid.
 */
export async function deliverOrderConfirmation(
  orderId: string,
  opts?: { force?: boolean },
): Promise<{
  sent: boolean;
  alreadySent?: boolean;
  mocked?: boolean;
  reason?: string;
}> {
  const detail = await getOrderDetail(orderId);
  if (!detail) return { sent: false, reason: "Pedido no encontrado" };
  if (detail.order.status !== "paid") {
    return { sent: false, reason: "Pedido no pagado" };
  }
  if (!detail.tickets.length) {
    return { sent: false, reason: "Sin números" };
  }

  if (!opts?.force && detail.order.confirmation_email_sent_at) {
    return { sent: false, alreadySent: true };
  }

  try {
    const packIds = await getOrderPackIds(orderId);
    const result = await sendOrderConfirmation(
      detail.order,
      detail.tickets,
      packIds,
    );

    if ("error" in result && result.error) {
      return { sent: false, reason: String(result.error) };
    }

    // En producción no marcar como enviado si solo fue mock (sin API key)
    if (result.mocked && process.env.NODE_ENV === "production") {
      logServerError(
        "email/deliver-confirmation",
        new Error("RESEND_API_KEY ausente en producción; correo no enviado"),
      );
      return { sent: false, mocked: true, reason: "resend_not_configured" };
    }

    await markConfirmationEmailSent(orderId);
    return { sent: true, mocked: Boolean(result.mocked) };
  } catch (error) {
    logServerError("email/deliver-confirmation", error);
    return {
      sent: false,
      reason:
        error instanceof Error ? error.message : "No se pudo enviar el email",
    };
  }
}
