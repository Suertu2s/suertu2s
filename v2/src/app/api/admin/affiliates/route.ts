import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthorized, parseDateRange } from "@/lib/admin/auth";
import { ensureCatalogSynced } from "@/lib/admin/ensure-catalog";
import {
  buildAffiliateStats,
  buildOrphanReferralStats,
} from "@/lib/admin/analytics";
import { publicAffiliate, publicAffiliates } from "@/lib/affiliate/public";
import {
  listAffiliates,
  listOrders,
  listPayouts,
  upsertAffiliate,
} from "@/lib/db/orders";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await ensureCatalogSynced();
    const { from, to } = parseDateRange(req);
    const [affiliates, orders, payouts] = await Promise.all([
      listAffiliates(),
      listOrders(),
      listPayouts(),
    ]);

    const stats = buildAffiliateStats(
      affiliates,
      orders,
      payouts,
      from,
      to,
    ).map((s) => ({
      ...s,
      affiliate: publicAffiliate(s.affiliate),
    }));

    return NextResponse.json({
      affiliates: publicAffiliates(affiliates),
      stats,
      orphanCodes: buildOrphanReferralStats(affiliates, orders, from, to),
      payouts,
      from: from.toISOString(),
      to: to.toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al cargar afiliados";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const upsertSchema = z.object({
  code: z.string().min(2).max(32),
  name: z.string().min(2),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  commission_type: z.enum(["percent", "fixed"]).default("percent"),
  commission_value: z.number().nonnegative().default(10),
  active: z.boolean().default(true),
  notes: z.string().optional().nullable(),
  password: z.string().min(6).max(120).optional().nullable(),
});

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = upsertSchema.parse(await req.json());
    const email = body.email?.trim() || null;
    const password = body.password?.trim() || null;

    if (email && password && password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 },
      );
    }

    // El acceso al portal exige email y contraseña al habilitarlo
    const existing = (await listAffiliates()).find(
      (a) => a.code.toUpperCase() === body.code.toUpperCase().trim(),
    );
    if (!existing && email && !password) {
      return NextResponse.json(
        {
          error:
            "Al crear un afiliado con correo, define una contraseña para el portal.",
        },
        { status: 400 },
      );
    }

    const affiliate = await upsertAffiliate({
      ...body,
      email,
      password: password || undefined,
    });

    return NextResponse.json({ affiliate: publicAffiliate(affiliate) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo guardar afiliado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
