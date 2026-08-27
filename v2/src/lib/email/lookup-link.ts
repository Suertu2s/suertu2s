import { Resend } from "resend";
import { absoluteUrl, CONTACT_EMAIL } from "@/lib/site";

export async function sendTicketLookupLink(email: string, token: string) {
  const link = absoluteUrl(`/check-tickets?token=${encodeURIComponent(token)}`);
  const html = `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#030a05;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030a05;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#0a1a0f;border:1px solid #36f07333;border-radius:16px;padding:28px;">
          <tr>
            <td style="color:#f5f0e6;font-size:18px;font-weight:bold;padding-bottom:12px;">
              Consulta tus códigos — Suertu2s
            </td>
          </tr>
          <tr>
            <td style="color:#b8c4b8;font-size:14px;line-height:1.6;padding-bottom:20px;">
              Haz clic en el botón para ver tus tickets de participación. Este enlace expira en 30 minutos.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <a href="${link}" style="display:inline-block;background:#36f073;color:#000;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:999px;">
                Ver mis códigos
              </a>
            </td>
          </tr>
          <tr>
            <td style="color:#7a8a7a;font-size:12px;line-height:1.5;">
              Si no solicitaste esto, ignora este correo. ¿Dudas? ${CONTACT_EMAIL}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  if (!process.env.RESEND_API_KEY?.trim()) {
    console.info("[email:lookup_link_mock]", { to: email, link });
    return { mocked: true };
  }

  const from =
    process.env.EMAIL_FROM?.trim() ||
    (process.env.NODE_ENV === "production"
      ? `Suertu2s <${CONTACT_EMAIL}>`
      : "Suertu2s <onboarding@resend.dev>");

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from,
    to: email,
    subject: "Tu enlace seguro para consultar tickets — Suertu2s",
    html,
  });

  if (result.error) {
    console.error("[email:lookup_link_failed]", result.error.message);
    return { error: result.error.message };
  }

  return { mocked: false, id: result.data?.id };
}
