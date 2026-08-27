import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthorized } from "@/lib/admin/auth";
import {
  createNewRaffle,
  getRaffle,
  getRaffleHistory,
  persistNewRaffleToDb,
  syncCatalogFromDb,
} from "@/lib/catalog/store";
import { getRaffleCycleStats } from "@/lib/db/orders";
import { isValidRaffleCode, normalizeRaffleCode } from "@/lib/tickets/codes";
import { logServerError, publicError } from "@/lib/security/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function payload() {
  const active = getRaffle();
  return {
    active,
    history: getRaffleHistory(),
  };
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  await syncCatalogFromDb();
  return NextResponse.json(payload(), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

const createSchema = z.object({
  title: z.string().min(3).max(200),
  prizeName: z.string().min(2).max(200),
  code: z
    .string()
    .min(2)
    .max(12)
    .transform((v) => normalizeRaffleCode(v))
    .refine(isValidRaffleCode, "Código de sorteo inválido (A-Z / 0-9)"),
  endsAt: z.string().min(8),
  prizeCostClp: z.number().int().positive().max(100_000_000),
  opsCostClp: z.number().int().nonnegative().max(100_000_000).optional(),
  ticketGoal: z.number().int().positive().max(10_000_000),
  liveStreamUrl: z
    .string()
    .max(500)
    .refine(
      (v) =>
        !v.trim() ||
        /^https?:\/\//i.test(v.trim()) ||
        /^[\w.-]+\.[a-z]{2,}/i.test(v.trim()),
      "El link del live no es válido",
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await syncCatalogFromDb();
    const body = createSchema.parse(await req.json());
    const current = getRaffle();
    const stats = await getRaffleCycleStats(current.id);

    const created = createNewRaffle(
      {
        title: body.title,
        prizeName: body.prizeName,
        code: body.code,
        endsAt: body.endsAt,
        prizeCostClp: body.prizeCostClp,
        opsCostClp: body.opsCostClp ?? 0,
        ticketGoal: body.ticketGoal,
        liveStreamUrl: body.liveStreamUrl ?? "",
      },
      stats,
    );

    await persistNewRaffleToDb(created);

    return NextResponse.json({ ok: true, ...payload() });
  } catch (error) {
    logServerError("admin/raffles", error);
    return NextResponse.json(
      {
        error: publicError(error, "No se pudo crear el sorteo", {
          allowZod: true,
        }),
      },
      { status: 400 },
    );
  }
}
