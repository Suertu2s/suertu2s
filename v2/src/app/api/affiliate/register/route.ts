import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { affiliateCodeFromName } from "@/lib/affiliate/invite";
import { registerAffiliateFromInvite } from "@/lib/db/orders";
import { logServerError, publicError } from "@/lib/security/errors";

export const runtime = "nodejs";

const schema = z.object({
  invitationToken: z.string().min(20).max(128),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(32),
  password: z.string().min(6).max(120),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    let created = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
      try {
        created = await registerAffiliateFromInvite({
          ...body,
          code: affiliateCodeFromName(body.name),
        });
      } catch (error) {
        lastError = error;
        const message = String(error).toLowerCase();
        const isCodeCollision =
          message.includes("código") || message.includes("affiliates_code");
        if (!isCodeCollision) throw error;
      }
    }
    if (!created) throw lastError || new Error("No se pudo crear el afiliado");

    return NextResponse.json({
      ok: true,
      active: true,
      affiliate: {
        name: created.name,
        code: created.code,
      },
      message:
        "Registro completado. Ya puedes iniciar sesión y comenzar a vender.",
    });
  } catch (error) {
    logServerError("affiliate/register", error);
    return NextResponse.json(
      {
        error: publicError(error, "No se pudo completar el registro", {
          allowZod: true,
        }),
      },
      { status: 400 },
    );
  }
}
