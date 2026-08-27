import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, parseDateRange } from "@/lib/admin/auth";
import { filterOrdersByRange } from "@/lib/admin/analytics";
import { ensureCatalogSynced } from "@/lib/admin/ensure-catalog";
import {
  fulfillOrder,
  getOrder,
  listOrders,
  markOrderFailed,
} from "@/lib/db/orders";
import { deliverOrderConfirmation } from "@/lib/email/deliver-confirmation";
import { logServerError, publicError } from "@/lib/security/errors";

const ACTIONS = ["mark_failed", "fulfill", "resend_email"] as const;
type OrderAction = (typeof ACTIONS)[number];

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await ensureCatalogSynced();
    const { from, to } = parseDateRange(req);
    const status = req.nextUrl.searchParams.get("status");
    const referral = req.nextUrl.searchParams.get("referral");
    const provider = req.nextUrl.searchParams.get("provider");
    const q = (req.nextUrl.searchParams.get("q") || "").toLowerCase().trim();

    let orders = await listOrders();
    orders = filterOrdersByRange(orders, from, to);

    if (status && status !== "all") {
      orders = orders.filter((o) => o.status === status);
    }
    if (referral) {
      const code = referral.toUpperCase();
      orders = orders.filter(
        (o) => (o.referral_code || "").toUpperCase() === code,
      );
    }
    if (provider && provider !== "all") {
      orders = orders.filter((o) => o.payment_provider === provider);
    }
    if (q) {
      orders = orders.filter(
        (o) =>
          o.email.includes(q) ||
          o.full_name.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          (o.payment_external_id || "").toLowerCase().includes(q),
      );
    }

    return NextResponse.json({
      orders,
      from: from.toISOString(),
      to: to.toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al cargar pedidos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await ensureCatalogSynced();
    const body = (await req.json()) as { id?: string; action?: string };
    if (
      !body.id ||
      !body.action ||
      !ACTIONS.includes(body.action as OrderAction)
    ) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const action = body.action as OrderAction;

    if (action === "mark_failed") {
      const order = await markOrderFailed(body.id);
      if (!order) {
        return NextResponse.json(
          { error: "Pedido no encontrado o no está pendiente" },
          { status: 404 },
        );
      }
      return NextResponse.json({
        order,
        message: "Pedido marcado como fallido",
      });
    }

    if (action === "fulfill") {
      const current = await getOrder(body.id);
      if (!current) {
        return NextResponse.json(
          { error: "Pedido no encontrado" },
          { status: 404 },
        );
      }
      if (current.status !== "pending" && current.status !== "failed") {
        return NextResponse.json(
          {
            error:
              "Solo se pueden marcar como pagados los pedidos pendientes o fallidos",
          },
          { status: 400 },
        );
      }

      const result = await fulfillOrder(body.id);
      const email = await deliverOrderConfirmation(body.id);

      return NextResponse.json({
        order: result.order,
        tickets: result.tickets,
        emailMocked: Boolean(email.mocked),
        message: result.alreadyPaid
          ? "El pedido ya estaba pagado"
          : email.sent
            ? "Pedido marcado como pagado, números emitidos y email enviado"
            : "Pedido marcado como pagado y números emitidos",
      });
    }

    // resend_email
    const detailOrder = await getOrder(body.id);
    if (!detailOrder) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 },
      );
    }
    if (detailOrder.status !== "paid") {
      return NextResponse.json(
        { error: "Solo se puede reenviar el email de pedidos pagados" },
        { status: 400 },
      );
    }

    const email = await deliverOrderConfirmation(body.id, { force: true });
    if (!email.sent) {
      return NextResponse.json(
        { error: email.reason || "No se pudo reenviar el email" },
        { status: 400 },
      );
    }

    const refreshed = await getOrder(body.id);
    return NextResponse.json({
      order: refreshed || detailOrder,
      emailMocked: Boolean(email.mocked),
      message: email.mocked
        ? "Email simulado (sin RESEND_API_KEY); revisa la consola del servidor"
        : "Email de confirmación reenviado",
    });
  } catch (error) {
    logServerError("admin/orders", error);
    return NextResponse.json(
      {
        error: publicError(error, "Error al actualizar pedido", {
          allowZod: false,
        }),
      },
      { status: 500 },
    );
  }
}
