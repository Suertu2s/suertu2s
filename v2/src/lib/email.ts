import { Resend } from "resend";
import type { DbOrder, DbTicket } from "@/lib/db/types";
import { getPackById, getRaffle } from "@/lib/catalog/store";
import { escapeHtml } from "@/lib/security/html";
import { ticketDisplayCode } from "@/lib/tickets/codes";

export function formatClp(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-CL")}`;
}

export async function sendOrderConfirmation(
  order: DbOrder,
  tickets: DbTicket[],
  packIds: string[],
) {
  const raffle = getRaffle();
  const raffleCode = raffle.code || "ST";
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://suertu2s.vercel.app").replace(/\/$/, "");

  const packs = packIds
    .map((id) => getPackById(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const safeName = escapeHtml(order.full_name || "Cliente");
  const safeEmail = escapeHtml(order.email);
  const safeRut = escapeHtml(order.rut || "No registrado");
  const safeOrderId = escapeHtml(order.id);
  const safeRaffleTitle = escapeHtml(raffle.title || "Gran Sorteo Oficial");
  const safePrizeName = escapeHtml(raffle.prizeName || "MOTORRAD CORSA R150 0km 2026");
  const safeRaffleCode = escapeHtml(raffleCode);
  const formattedTotal = formatClp(order.total_clp || 0);
  const formattedDate = new Date().toLocaleDateString("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Generación de tarjetas de boletos / tickets
  const ticketsCardsHtml = tickets.length
    ? tickets
        .map((t, idx) => {
          const code = escapeHtml(ticketDisplayCode(t, raffleCode));
          return `
            <div style="display:inline-block;margin:6px 6px;padding:12px 18px;background:#062312;border:2px solid #36f073;border-radius:12px;text-align:center;min-width:140px;">
              <span style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#a3e635;font-weight:bold;">Boleto Oficial #${idx + 1}</span>
              <span style="display:block;font-size:22px;font-weight:900;color:#ffffff;font-family:monospace;letter-spacing:2px;margin-top:2px;">${code}</span>
            </div>
          `;
        })
        .join("")
    : `<p style="font-size:16px;color:#f7c64b;font-weight:bold;margin:0;">Tickets en proceso de asignación</p>`;

  // Generación de ilustraciones adquiridas
  const illustrationsHtml = packs.length
    ? packs
        .map((p) => {
          const rawSrc = p.image?.startsWith("http") ? p.image : `${siteUrl}${p.image}`;
          const safeSrc = escapeHtml(rawSrc);
          const safePackName = escapeHtml(p.name);
          const ticketText = p.ticketCount === 1 ? "1 ticket de participación" : `${p.ticketCount} tickets de participación`;

          return `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;background:#071a0e;border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:14px;">
              <tr>
                <td width="90" style="vertical-align:middle;text-align:center;padding-right:14px;">
                  <img src="${safeSrc}" alt="${safePackName}" width="80" height="106" style="width:80px;height:auto;border-radius:8px;border:1px solid rgba(247,198,75,0.3);display:block;" />
                </td>
                <td style="vertical-align:middle;">
                  <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#ffffff;">${safePackName}</p>
                  <p style="margin:0 0 8px;font-size:12px;color:#36f073;font-weight:bold;">✦ Incluye ${ticketText}</p>
                  <a href="${safeSrc}" target="_blank" style="display:inline-block;background:#153d22;color:#36f073;text-decoration:none;font-size:12px;font-weight:bold;padding:6px 12px;border-radius:6px;border:1px solid #36f073;">Descargar Imagen HD</a>
                </td>
              </tr>
            </table>
          `;
        })
        .join("")
    : `
      <div style="background:#071a0e;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:14px;color:#d8c28a;font-size:13px;">
        Tus ilustraciones quedan asociadas a este pedido. Puedes descargarlas directamente desde la plataforma.
      </div>
    `;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprobante de Compra y Boletos Suertu2s</title>
</head>
<body style="margin:0;padding:0;background-color:#020804;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#020804;padding:24px 12px;">
    <tr>
      <td align="center">
        <!-- Contenedor Principal -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#05140a;border:1px solid rgba(54,240,115,0.25);border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.8);">
          
          <!-- Encabezado / Branding -->
          <tr>
            <td style="background:linear-gradient(135deg, #062312 0%, #030f07 100%);padding:30px 24px;text-align:center;border-bottom:1px solid rgba(54,240,115,0.2);">
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                SUERTU<span style="color:#36f073;">2</span>S
              </h1>
              <p style="margin:6px 0 0;color:#f7c64b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;font-weight:bold;">
                Comprobante Oficial de Compra y Boletos
              </p>
            </td>
          </tr>

          <!-- Cuerpo del Correo -->
          <tr>
            <td style="padding:28px 24px;">
              
              <!-- Saludo y confirmación -->
              <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#ffffff;">
                ¡Muchas gracias por tu compra, ${safeName}!
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#d1d5db;">
                Tu pago por <strong>${formattedTotal}</strong> ha sido confirmado exitosamente. A continuación encontrarás tus <strong>ilustraciones digitales</strong> adquiridas y tus <strong>boletos oficiales</strong> para participar por el gran premio.
              </p>

              <!-- Resumen del Pedido -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#030d06;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;margin-bottom:24px;font-size:13px;">
                <tr>
                  <td style="color:#9ca3af;padding:4px 0;">N° de Pedido:</td>
                  <td align="right" style="color:#ffffff;font-weight:bold;font-family:monospace;">${safeOrderId.slice(0, 13)}</td>
                </tr>
                <tr>
                  <td style="color:#9ca3af;padding:4px 0;">RUT del Titular:</td>
                  <td align="right" style="color:#ffffff;font-weight:bold;">${safeRut}</td>
                </tr>
                <tr>
                  <td style="color:#9ca3af;padding:4px 0;">Fecha de Pago:</td>
                  <td align="right" style="color:#ffffff;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="color:#9ca3af;padding:4px 0;">Sorteo Asociado:</td>
                  <td align="right" style="color:#f7c64b;font-weight:bold;">${safePrizeName}</td>
                </tr>
              </table>

              <!-- SECCIÓN TICKETS -->
              <div style="margin-bottom:28px;text-align:center;">
                <div style="background:linear-gradient(90deg, transparent, rgba(54,240,115,0.15), transparent);padding:8px;border-radius:8px;margin-bottom:12px;">
                  <h2 style="margin:0;font-size:18px;color:#36f073;text-transform:uppercase;letter-spacing:1px;font-weight:900;">
                    🎟️ Tus Números de Participación
                  </h2>
                </div>
                <p style="margin:0 0 14px;font-size:12px;color:#9ca3af;line-height:1.5;">
                  Cada uno de los siguientes códigos es único, está registrado a tu nombre y participa en la tómbola oficial:
                </p>
                <div style="text-align:center;margin-bottom:14px;">
                  ${ticketsCardsHtml}
                </div>
                <p style="margin:0;font-size:11px;color:#a3e635;">
                  ✦ Total asignado: ${tickets.length} boleto(s) oficiales para el sorteo ${safeRaffleCode}
                </p>
              </div>

              <!-- SECCIÓN ILUSTRACIONES -->
              <div style="margin-bottom:28px;">
                <h2 style="margin:0 0 12px;font-size:16px;color:#f7c64b;text-transform:uppercase;letter-spacing:1px;font-weight:bold;border-bottom:1px solid rgba(247,198,75,0.2);padding-bottom:6px;">
                  🎨 Tus Ilustraciones Digitales
                </h2>
                ${illustrationsHtml}
              </div>

              <!-- BOTÓN CTA -->
              <div style="text-align:center;margin:32px 0 16px;">
                <a href="${siteUrl}/check-tickets" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #f7c64b 0%, #d49b1a 100%);color:#000000;text-decoration:none;font-size:15px;font-weight:900;padding:14px 28px;border-radius:50px;text-transform:uppercase;letter-spacing:0.5px;box-shadow:0 4px 15px rgba(247,198,75,0.35);">
                  Verificar mis Boletos en Línea
                </a>
                <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">
                  También puedes consultarlos siempre en <a href="${siteUrl}/check-tickets" style="color:#36f073;text-decoration:none;">suertu2s.com/check-tickets</a> con tu RUT o email.
                </p>
              </div>

            </td>
          </tr>

          <!-- Pie de Página -->
          <tr>
            <td style="background:#030a05;padding:20px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#6b7280;line-height:1.6;">
              <p style="margin:0 0 6px;color:#9ca3af;">
                <strong>Suertu2s Premios</strong> · Sorteos transparentes y protocolizados ante notario.
              </p>
              <p style="margin:0;">
                ¿Tienes dudas con tu compra? Escríbenos a <a href="mailto:contacto@suertu2s.com" style="color:#36f073;text-decoration:none;">contacto@suertu2s.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  if (!process.env.RESEND_API_KEY) {
    console.info("[email:mock_no_api_key]", {
      to: order.email,
      orderId: order.id,
      ticketCount: tickets.length,
    });
    return { mocked: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const primaryFrom = process.env.EMAIL_FROM || "Suertu2s <onboarding@resend.dev>";
  const fallbackFrom = "Suertu2s <onboarding@resend.dev>";

  try {
    const result = await resend.emails.send({
      from: primaryFrom,
      to: order.email,
      subject: `¡Pago Confirmado! Tus Boletos e Ilustraciones Suertu2s (Pedido ${safeOrderId.slice(0, 8)})`,
      html,
    });

    if (result.error) {
      console.warn("[email:primary_failed]", result.error.message);
      // Si falló por verificación de dominio personalizado, reintentar con el remitente seguro de onboarding
      if (primaryFrom !== fallbackFrom) {
        const retryResult = await resend.emails.send({
          from: fallbackFrom,
          to: order.email,
          subject: `¡Pago Confirmado! Tus Boletos e Ilustraciones Suertu2s (Pedido ${safeOrderId.slice(0, 8)})`,
          html,
        });
        if (retryResult.error) {
          return { error: retryResult.error.message };
        }
        return { mocked: false, fallbackUsed: true, id: retryResult.data?.id };
      }
      return { error: result.error.message };
    }

    return { mocked: false, id: result.data?.id };
  } catch (err: unknown) {
    console.error("[email:exception]", err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
