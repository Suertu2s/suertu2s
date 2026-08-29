import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isManualSalesAuthorized } from "@/lib/admin/auth";
import { getSessionFromRequest } from "@/lib/admin/session";
import { ensureCatalogSynced } from "@/lib/admin/ensure-catalog";
import { createOrder, fulfillOrder } from "@/lib/db/orders";
import { deliverOrderConfirmation } from "@/lib/email/deliver-confirmation";
import { logServerError, publicError } from "@/lib/security/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8).max(50),
  packId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(100),
});

export async function POST(req: NextRequest) {
  if (!getSessionFromRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isManualSalesAuthorized(req)) {
    return NextResponse.json(
      { error: "Solo Admin 1 y Admin 2 pueden registrar ventas POS." },
      { status: 403 },
    );
  }

  try {
    const body = schema.parse(await req.json());
    await ensureCatalogSynced();

    const fullName = `${body.firstName} ${body.lastName}`.trim();
    const created = await createOrder({
      email: body.email,
      fullName,
      // Las ventas POS no requieren RUT en este formulario administrativo.
      rut: "VENTA-POS",
      phone: body.phone,
      items: [{ packId: body.packId, quantity: body.quantity }],
      provider: "manual",
    });

    const fulfilled = await fulfillOrder(created.order.id);
    const email = await deliverOrderConfirmation(created.order.id);

    return NextResponse.json(
      {
        ok: true,
        order: fulfilled.order,
        tickets: fulfilled.tickets,
        emailSent: email.sent,
        emailReason: email.sent ? undefined : email.reason,
        message: email.sent
          ? "Venta registrada, tickets emitidos y correo enviado."
          : "Venta registrada y tickets emitidos, pero el correo debe reenviarse.",
      },
      { status: 201 },
    );
  } catch (error) {
    logServerError("admin/manual-sales", error);
    return NextResponse.json(
      {
        error: publicError(error, "No se pudo registrar la venta manual"),
      },
      { status: 400 },
    );
  }
}
