import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRaffle, syncCatalogFromDb } from "@/lib/catalog/store";
import {
  hasPaidTicketsForEmail,
  lookupTicketsByEmail,
} from "@/lib/db/orders";
import { sendTicketLookupLink } from "@/lib/email/lookup-link";
import { logServerError, publicError } from "@/lib/security/errors";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { ticketDisplayCode } from "@/lib/tickets/codes";
import {
  createTicketLookupToken,
  verifyTicketLookupToken,
} from "@/lib/tickets/lookup-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const requestSchema = z.object({
  email: z.string().email(),
});

const verifySchema = z.object({
  token: z.string().min(10).max(500),
});

const GENERIC_SENT_MESSAGE =
  "Si hay códigos asociados a ese correo, te enviamos un enlace seguro. Revisa bandeja de entrada y spam.";

function mapTicketsResponse(email: string, tickets: Awaited<ReturnType<typeof lookupTicketsByEmail>>) {
  const raffleCode = getRaffle().code;
  return {
    email: email.toLowerCase().trim(),
    raffleCode,
    tickets: tickets.map((t) => ({
      code: ticketDisplayCode(t, raffleCode),
      number: t.number,
      orderId: t.order_id,
      createdAt: t.created_at,
    })),
  };
}

export async function POST(req: NextRequest) {
  try {
    await syncCatalogFromDb();
    const body = await req.json();

    if (body?.token) {
      const limited = rateLimit({
        key: `tickets-verify:${clientIp(req)}`,
        limit: 30,
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

      const { token } = verifySchema.parse(body);
      const email = verifyTicketLookupToken(token);
      if (!email) {
        return NextResponse.json(
          { error: "Enlace inválido o expirado. Solicita uno nuevo." },
          { status: 400 },
        );
      }

      const tickets = await lookupTicketsByEmail(email);
      return NextResponse.json(mapTicketsResponse(email, tickets));
    }

    const emailLimited = rateLimit({
      key: `tickets-lookup-email:${clientIp(req)}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!emailLimited.ok) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta más tarde." },
        {
          status: 429,
          headers: { "Retry-After": String(emailLimited.retryAfterSec) },
        },
      );
    }

    const { email } = requestSchema.parse(body);
    const normalized = email.toLowerCase().trim();

    const perEmailLimited = rateLimit({
      key: `tickets-lookup-target:${normalized}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!perEmailLimited.ok) {
      return NextResponse.json({ message: GENERIC_SENT_MESSAGE });
    }

    const hasTickets = await hasPaidTicketsForEmail(normalized);
    if (hasTickets) {
      const token = createTicketLookupToken(normalized);
      await sendTicketLookupLink(normalized, token);
    }

    return NextResponse.json({ message: GENERIC_SENT_MESSAGE });
  } catch (error) {
    logServerError("tickets/lookup", error);
    return NextResponse.json(
      {
        error: publicError(error, "No se pudo procesar la solicitud", {
          allowZod: true,
        }),
      },
      { status: 400 },
    );
  }
}
