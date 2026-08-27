import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertRaffleAcceptsOrders } from "@/lib/catalog/orders-guard";
import { syncCatalogFromDb } from "@/lib/catalog/store";
import {
  createOrder,
  paymentsMockEnabled,
  setPaymentExternal,
} from "@/lib/db/orders";
import { createFlowPayment } from "@/lib/payments/flow";
import { isMockProviderAllowed } from "@/lib/payments/mock-guard";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { logServerError, publicError } from "@/lib/security/errors";
import { isValidCheckoutPhone } from "@/lib/validation/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  rut: z.string().min(3).max(32),
  phone: z
    .string()
    .trim()
    .min(1, "El teléfono es obligatorio")
    .max(32)
    .refine(isValidCheckoutPhone, {
      message: "Ingresa un teléfono válido (mínimo 8 dígitos)",
    }),
  provider: z.enum(["flow", "mock"]),
  referralCode: z.string().max(32).optional(),
  referralName: z.string().max(120).optional(),
  items: z
    .array(
      z.object({
        packId: z.string().max(64),
        quantity: z.number().int().positive().max(20),
      }),
    )
    .min(1)
    .max(10),
});

export async function POST(req: NextRequest) {
  try {
    await syncCatalogFromDb();
    const limited = rateLimit({
      key: `checkout:${clientIp(req)}`,
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta más tarde." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    const body = schema.parse(await req.json());

    try {
      assertRaffleAcceptsOrders();
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error ? err.message : "El sorteo ya está cerrado",
        },
        { status: 403 },
      );
    }

    let provider = body.provider;

    if (!isMockProviderAllowed(provider)) {
      return NextResponse.json(
        { error: "El proveedor de pago de prueba no está habilitado" },
        { status: 400 },
      );
    }

    if (paymentsMockEnabled()) {
      if (
        provider === "flow" &&
        (!process.env.FLOW_API_KEY || !process.env.FLOW_SECRET_KEY)
      ) {
        provider = "mock";
      }
    }

    if (provider !== "mock") {
      if (
        provider === "flow" &&
        (!process.env.FLOW_API_KEY || !process.env.FLOW_SECRET_KEY)
      ) {
        return NextResponse.json(
          { error: "Flow no está configurado aún" },
          { status: 503 },
        );
      }
    }

    const { order } = await createOrder({ ...body, provider });
    const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    if (provider === "mock") {
      await setPaymentExternal(order.id, `mock_${order.id}`, "mock");
      const { createMockConfirmToken } =
        await import("@/lib/payments/mock-token");
      const token = createMockConfirmToken(order.id);
      return NextResponse.json({
        orderId: order.id,
        redirectUrl: `${site}/api/payments/mock/confirm?orderId=${encodeURIComponent(order.id)}&token=${encodeURIComponent(token)}`,
        mock: true,
      });
    }

    const flowRes = await createFlowPayment({
      commerceOrder: order.id,
      subject: "Ilustraciones Suertu2s",
      amount: order.total_clp,
      email: order.email,
    });
    await setPaymentExternal(order.id, flowRes.token, "flow");
    return NextResponse.json({
      orderId: order.id,
      redirectUrl: flowRes.redirectUrl,
    });
  } catch (error) {
    logServerError("checkout", error);
    return NextResponse.json(
      {
        error: publicError(error, "No se pudo iniciar el pago", {
          allowZod: true,
        }),
      },
      { status: 400 },
    );
  }
}
