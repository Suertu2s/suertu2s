import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  hashAffiliateInviteToken,
  isAffiliateInviteExpired,
  affiliateCodeFromName,
} from "@/lib/affiliate/invite";
import { listAffiliates, upsertAffiliate } from "@/lib/db/orders";
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
    const affiliates = await listAffiliates();
    const inviter = affiliates.find(
      (affiliate) =>
        affiliate.invite_token_hash ===
          hashAffiliateInviteToken(body.invitationToken) &&
        !isAffiliateInviteExpired(affiliate.invite_expires_at) &&
        affiliate.active,
    );
    if (!inviter) {
      return NextResponse.json(
        { error: "El enlace de invitación no es válido o expiró." },
        { status: 400 },
      );
    }

    const normalizedEmail = body.email.toLowerCase().trim();
    if (
      affiliates.some(
        (affiliate) => affiliate.email?.toLowerCase() === normalizedEmail,
      )
    ) {
      return NextResponse.json(
        { error: "Ese correo ya está registrado como colaborador." },
        { status: 409 },
      );
    }

    const code = affiliateCodeFromName(body.name);
    const created = await upsertAffiliate({
      code,
      name: body.name.trim(),
      email: normalizedEmail,
      phone: body.phone.trim(),
      password: body.password,
      commission_type: "percent",
      commission_value: 10,
      active: true,
      invitation_status: "active",
      referred_by_affiliate_id: inviter.id,
      notes: `Invitado por ${inviter.name} (${inviter.code})`,
      invite_token_hash: null,
      invite_expires_at: null,
    });

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
