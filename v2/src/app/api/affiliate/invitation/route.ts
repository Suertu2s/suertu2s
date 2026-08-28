import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedAffiliate } from "@/lib/affiliate/auth";
import { createAffiliateInviteToken } from "@/lib/affiliate/invite";
import { upsertAffiliate } from "@/lib/db/orders";
import { logServerError } from "@/lib/security/errors";

export const runtime = "nodejs";

function siteUrl(req: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  const affiliate = await getAuthorizedAffiliate(req);
  if (!affiliate) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const invite = createAffiliateInviteToken();
    const updated = await upsertAffiliate({
      ...affiliate,
      code: affiliate.code,
      name: affiliate.name,
      invite_token_hash: invite.tokenHash,
      invite_expires_at: invite.expiresAt,
    });
    return NextResponse.json({
      inviteUrl: `${siteUrl(req)}/afiliados/registro?token=${encodeURIComponent(invite.token)}`,
      expiresAt: updated.invite_expires_at,
    });
  } catch (error) {
    logServerError("affiliate/invitation", error);
    return NextResponse.json(
      { error: "No se pudo crear el enlace de invitación" },
      { status: 500 },
    );
  }
}
