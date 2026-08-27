import fs from "fs";
import path from "path";
import { Resend } from "resend";
import type { DbOrder, DbTicket } from "@/lib/db/types";
import { getPackById, getRaffle } from "@/lib/catalog/store";
import { escapeHtml } from "@/lib/security/html";
import { ticketDisplayCode } from "@/lib/tickets/codes";

export function formatClp(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-CL")}`;
}

/** Ruta pública JPG compatible con clientes de correo (WebP suele fallar). */
function packEmailImagePath(packImage: string) {
  if (!packImage) return "";
  if (/\.webp$/i.test(packImage)) {
    return packImage.replace(/\.webp$/i, "-email.jpg");
  }
  return packImage;
}

function absoluteSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  let raw =
    fromEnv ||
    (fromVercel
      ? fromVercel.startsWith("http")
        ? fromVercel
        : `https://${fromVercel}`
      : "") ||
    "https://suertu2s.com";
  raw = raw.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  return raw;
}

export async function sendOrderConfirmation(
  order: DbOrder,
  tickets: DbTicket[],
  packIds: string[],
) {
  const raffle = getRaffle();
  const raffleCode = raffle.code || "ST";
  const siteUrl = absoluteSiteUrl();

  const packs = packIds
    .map((id) => getPackById(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const safeName = escapeHtml(order.full_name || "Cliente");
  const safeOrderId = escapeHtml(order.id);
  const safePrizeName = escapeHtml(
    raffle.prizeName || "MOTORRAD CORSA R150 0km 2026",
  );
  const safeRaffleCode = escapeHtml(raffleCode);
  const formattedTotal = formatClp(order.total_clp || 0);
  const formattedDate = new Date().toLocaleDateString("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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

  type InlineAttachment = {
    filename: string;
    content: Buffer;
    contentId: string;
  };
  const inlineAttachments: InlineAttachment[] = [];

  const illustrationsHtml = packs.length
    ? packs
        .map((p, idx) => {
          const emailRel = packEmailImagePath(p.image);
          const absUrl = emailRel.startsWith("http")
            ? emailRel
            : `${siteUrl}${emailRel.startsWith("/") ? "" : "/"}${emailRel}`;
          const contentId = `pack${idx}@suertu2s`;
          const diskPath = path.join(
            process.cwd(),
            "public",
            emailRel.replace(/^\//, ""),
          );
          if (fs.existsSync(diskPath)) {
            inlineAttachments.push({
              filename: path.basename(diskPath),
              content: fs.readFileSync(diskPath),
              contentId,
            });
          }
          const imgSrc = fs.existsSync(diskPath)
            ? `cid:${contentId}`
            : escapeHtml(absUrl);
          const safePackName = escapeHtml(p.name);
          const ticketText =
            p.ticketCount === 1
              ? "1 ticket de participación"
              : `${p.ticketCount} tickets de participación`;
          const safeAbs = escapeHtml(absUrl);

          return `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;background:#071a0e;border:1px solid rgba(255,255,255,0.12);border-radius:14px;">
              <tr>
                <td style="padding:14px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="100" style="vertical-align:middle;text-align:center;padding-right:14px;">
                        <img src="${imgSrc}" alt="${safePackName}" width="90" style="width:90px;max-width:90px;height:auto;border-radius:8px;border:1px solid rgba(247,198,75,0.3);display:block;" />
                      </td>
                      <td style="vertical-align:middle;">
                        <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#ffffff;">${safePackName}</p>
                        <p style="margin:0 0 8px;font-size:12px;color:#36f073;font-weight:bold;">✦ Incluye ${ticketText}</p>
                        <a href="${safeAbs}" target="_blank" style="display:inline-block;background:#153d22;color:#36f073;text-decoration:none;font-size:12px;font-weight:bold;padding:6px 12px;border-radius:6px;border:1px solid #36f073;">Ver / descargar ilustración</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          `;
        })
        .join("")
    : `
      <div style="background:#071a0e;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:14px;color:#d8c28a;font-size:13px;">
        Tus ilustraciones quedan asociadas a este pedido. También puedes verlas en la web con tu correo.
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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#05140a;border:1px solid rgba(54,240,115,0.25);border-radius:20px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg, #062312 0%, #030f07 100%);padding:30px 24px;text-align:center;border-bottom:1px solid rgba(54,240,115,0.2);">
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                SUERTU<span style="color:#36f073;">2</span>S
              </h1>
              <p style="margin:6px 0 0;color:#f7c64b;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;font-weight:bold;">
                Compra confirmada · Boletos e ilustraciones
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#ffffff;">
                ¡Pago confirmado, ${safeName}!
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#d1d5db;">
                Tu pago por <strong>${formattedTotal}</strong> quedó acreditado. Aquí van tus <strong>ilustraciones</strong> y tus <strong>códigos de participación</strong>.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#030d06;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;margin-bottom:24px;font-size:13px;">
                <tr>
                  <td style="color:#9ca3af;padding:4px 0;">N° de Pedido:</td>
                  <td align="right" style="color:#ffffff;font-weight:bold;font-family:monospace;">${safeOrderId.slice(0, 13)}</td>
                </tr>
                <tr>
                  <td style="color:#9ca3af;padding:4px 0;">Fecha de Pago:</td>
                  <td align="right" style="color:#ffffff;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="color:#9ca3af;padding:4px 0;">Sorteo:</td>
                  <td align="right" style="color:#f7c64b;font-weight:bold;">${safePrizeName}</td>
                </tr>
              </table>

              <div style="margin-bottom:28px;">
                <h2 style="margin:0 0 12px;font-size:16px;color:#f7c64b;text-transform:uppercase;letter-spacing:1px;font-weight:bold;border-bottom:1px solid rgba(247,198,75,0.2);padding-bottom:6px;">
                  Tus ilustraciones
                </h2>
                ${illustrationsHtml}
              </div>

              <div style="margin-bottom:28px;text-align:center;">
                <div style="background:linear-gradient(90deg, transparent, rgba(54,240,115,0.15), transparent);padding:8px;border-radius:8px;margin-bottom:12px;">
                  <h2 style="margin:0;font-size:18px;color:#36f073;text-transform:uppercase;letter-spacing:1px;font-weight:900;">
                    Tus números de participación
                  </h2>
                </div>
                <p style="margin:0 0 14px;font-size:12px;color:#9ca3af;line-height:1.5;">
                  Guarda estos códigos. Están registrados a tu correo:
                </p>
                <div style="text-align:center;margin-bottom:14px;">
                  ${ticketsCardsHtml}
                </div>
                <p style="margin:0;font-size:11px;color:#a3e635;">
                  Total: ${tickets.length} boleto(s) · Sorteo ${safeRaffleCode}
                </p>
              </div>

              <div style="text-align:center;margin:32px 0 16px;">
                <a href="${siteUrl}/check-tickets" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #f7c64b 0%, #d49b1a 100%);color:#000000;text-decoration:none;font-size:15px;font-weight:900;padding:14px 28px;border-radius:50px;text-transform:uppercase;letter-spacing:0.5px;">
                  Verificar mis boletos
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#030a05;padding:20px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#6b7280;line-height:1.6;">
              <p style="margin:0 0 6px;color:#9ca3af;">
                <strong>Suertu2s</strong> · ¿Dudas? <a href="mailto:contacto@suertu2s.com" style="color:#36f073;text-decoration:none;">contacto@suertu2s.com</a>
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
      packCount: packs.length,
    });
    return { mocked: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const primaryFrom =
    process.env.EMAIL_FROM || "Suertu2s <onboarding@resend.dev>";
  const fallbackFrom = "Suertu2s <onboarding@resend.dev>";
  const attachments = inlineAttachments.map((a) => ({
    filename: a.filename,
    content: a.content,
    contentId: a.contentId,
  }));

  try {
    const result = await resend.emails.send({
      from: primaryFrom,
      to: order.email,
      subject: `¡Pago confirmado! Tus boletos e ilustraciones Suertu2s (${safeOrderId.slice(0, 8)})`,
      html,
      attachments: attachments.length ? attachments : undefined,
    });

    if (result.error) {
      console.warn("[email:primary_failed]", result.error.message);
      if (primaryFrom !== fallbackFrom) {
        const retryResult = await resend.emails.send({
          from: fallbackFrom,
          to: order.email,
          subject: `¡Pago confirmado! Tus boletos e ilustraciones Suertu2s (${safeOrderId.slice(0, 8)})`,
          html,
          attachments: attachments.length ? attachments : undefined,
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
