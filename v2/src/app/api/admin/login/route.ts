import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  adminAuthConfigured,
  createAdminSessionToken,
  getAdminAccount,
  getAllowedAdminEmails,
  setAdminSessionCookie,
  verifyAdminPassword,
} from "@/lib/admin/session";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { logServerError, publicError } from "@/lib/security/errors";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit({
      key: `admin-login:${clientIp(req)}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta más tarde." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    if (!adminAuthConfigured()) {
      return NextResponse.json(
        {
          error:
            "Admin no configurado. Ejecuta la migración de cuentas admin o define las variables de entorno.",
        },
        { status: 503 },
      );
    }

    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase().trim();
    const allowed = getAllowedAdminEmails();
    const account = await getAdminAccount(email);

    const validCredentials = account
      ? account.active &&
        allowed.includes(email) &&
        verifyAdminPassword(body.password, account.password_hash)
      : allowed.includes(email) && verifyAdminPassword(body.password);

    if (!validCredentials) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 },
      );
    }

    const accountIndex = allowed.indexOf(email);
    const token = createAdminSessionToken(email, {
      mustChangePassword: account?.must_change_password ?? false,
      canManualSales:
        account?.can_manual_sales ?? (accountIndex === 0 || accountIndex === 1),
    });
    const res = NextResponse.json({
      ok: true,
      email,
      displayName: account?.display_name || email,
      mustChangePassword: account?.must_change_password ?? false,
      canManualSales:
        account?.can_manual_sales ?? (accountIndex === 0 || accountIndex === 1),
    });
    setAdminSessionCookie(res, token);
    return res;
  } catch (error) {
    logServerError("admin/login", error);
    return NextResponse.json(
      {
        error: publicError(error, "No se pudo iniciar sesión", {
          allowZod: true,
        }),
      },
      { status: 400 },
    );
  }
}
