import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createAdminSessionToken,
  getSessionFromRequest,
  setAdminSessionCookie,
  updateAdminPassword,
} from "@/lib/admin/session";
import { hashPassword } from "@/lib/security/password";
import { logServerError, publicError } from "@/lib/security/errors";

const schema = z
  .object({
    password: z.string().min(12).max(120),
    passwordConfirmation: z.string().min(12).max(120),
  })
  .refine((body) => body.password === body.passwordConfirmation, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirmation"],
  });

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());
    const account = await updateAdminPassword(
      session.email,
      hashPassword(body.password),
    );
    const token = createAdminSessionToken(account.email, {
      mustChangePassword: false,
      canManualSales: account.can_manual_sales,
    });
    const response = NextResponse.json({
      ok: true,
      email: account.email,
      displayName: account.display_name,
      mustChangePassword: false,
      canManualSales: account.can_manual_sales,
    });
    setAdminSessionCookie(response, token);
    return response;
  } catch (error) {
    logServerError("admin/change-password", error);
    return NextResponse.json(
      {
        error: publicError(error, "No se pudo cambiar la contraseña", {
          allowZod: true,
        }),
      },
      { status: 400 },
    );
  }
}
