import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthorized } from "@/lib/admin/auth";
import {
  adminAuthConfigured,
  getAllowedAdminEmails,
} from "@/lib/admin/session";
import {
  getPacks,
  getPrizes,
  getRaffle,
  persistPacksToDb,
  persistPrizesToDb,
  persistRaffleToDb,
  replacePacks,
  replacePrizes,
  syncCatalogFromDb,
  updateRaffle,
} from "@/lib/catalog/store";
import { checkProductionEnv } from "@/lib/env/production-check";
import { paymentsMockEnabled } from "@/lib/db/orders";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase";
import { logServerError, publicError } from "@/lib/security/errors";
import {
  isValidRaffleCode,
  isValidTicketCodeForRaffle,
  normalizeRaffleCode,
} from "@/lib/tickets/codes";

const RAFFLE_UUID = "a0000000-0000-4000-8000-000000000001";

async function syncRaffleCodeToDb(code: string) {
  const norm = normalizeRaffleCode(code);
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from("raffles")
        .update({ code: norm })
        .eq("id", RAFFLE_UUID);
      if (error) throw new Error(error.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `No se pudo sincronizar el código del sorteo en Supabase: ${msg}`,
      );
    }
  }
}

function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function envPayload() {
  const adminEmails = getAllowedAdminEmails();
  const supabaseOk = isSupabaseConfigured();
  return {
    paymentsMock: paymentsMockEnabled(),
    dbConfigured: supabaseOk,
    supabaseConfigured: supabaseOk,
    adminAuthConfigured: adminAuthConfigured(),
    flowConfigured: Boolean(
      process.env.FLOW_API_KEY && process.env.FLOW_SECRET_KEY,
    ),
    emailConfigured: emailConfigured(),
    adminSessionSecretConfigured: Boolean(
      process.env.ADMIN_SESSION_SECRET?.trim(),
    ),
    adminPasswordHashed: Boolean(process.env.ADMIN_PASSWORD_HASH?.trim()),
    adminEmailsCount: adminEmails.length,
    adminEmailsMasked: adminEmails.map((e) => {
      const [user, domain] = e.split("@");
      if (!domain) return "***";
      return `${user.slice(0, 2)}***@${domain}`;
    }),
    productionIssues:
      process.env.NODE_ENV === "production" ? checkProductionEnv() : [],
    flowEnv: process.env.FLOW_ENV || "sandbox",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
  };
}

function settingsPayload() {
  return {
    raffle: getRaffle(),
    prizes: getPrizes(),
    packs: getPacks(),
    env: envPayload(),
  };
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await syncCatalogFromDb();

  return NextResponse.json(settingsPayload(), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

const packSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(120),
  priceClp: z.number().int().positive().max(10_000_000),
  ticketCount: z.number().int().positive().max(1000),
  featured: z.boolean().optional(),
});

const prizeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(200),
  costClp: z.number().int().nonnegative().max(100_000_000),
});

const putSchema = z.object({
  raffle: z
    .object({
      title: z.string().min(3).max(200),
      prizeName: z.string().min(2).max(200),
      endsAt: z.string().min(8),
      code: z
        .string()
        .min(2)
        .max(12)
        .transform((v) => normalizeRaffleCode(v))
        .refine(isValidRaffleCode, "Código de sorteo inválido (A-Z / 0-9)")
        .optional(),
      ticketMin: z.number().int().nonnegative().optional(),
      ticketMax: z.number().int().positive().optional(),
      estimatedOpsCostClp: z.number().int().nonnegative().max(100_000_000),
      ticketGoal: z.number().int().positive().max(10_000_000).optional(),
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
      raffleStatus: z.enum(["open", "closed"]).optional(),
      winnerTicketCode: z.string().max(20).optional().nullable(),
      winnerName: z.string().max(120).optional(),
      winnerNote: z.string().max(300).optional(),
    })
    .optional(),
  prizes: z.array(prizeSchema).min(1).max(30).optional(),
  packs: z.array(packSchema).min(1).max(20).optional(),
});

export async function PUT(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await syncCatalogFromDb();
    const body = putSchema.parse(await req.json());

    if (body.raffle) {
      const ends = new Date(body.raffle.endsAt);
      if (Number.isNaN(ends.getTime())) {
        return NextResponse.json(
          { error: "La fecha de cierre no es válida" },
          { status: 400 },
        );
      }
      if (
        body.raffle.ticketMin != null &&
        body.raffle.ticketMax != null &&
        body.raffle.ticketMin >= body.raffle.ticketMax
      ) {
        return NextResponse.json(
          { error: "El número mínimo debe ser menor al máximo" },
          { status: 400 },
        );
      }

      const current = getRaffle();
      const nextCode = body.raffle.code
        ? normalizeRaffleCode(body.raffle.code)
        : current.code;
      const winnerRaw = body.raffle.winnerTicketCode;
      if (
        winnerRaw != null &&
        String(winnerRaw).trim() !== "" &&
        !isValidTicketCodeForRaffle(String(winnerRaw), nextCode)
      ) {
        return NextResponse.json(
          {
            error: `El código ganador debe ser ${nextCode} seguido de 5 dígitos (ej. ${nextCode}48291)`,
          },
          { status: 400 },
        );
      }

      const updated = updateRaffle({
        ...body.raffle,
        code: nextCode,
        winnerTicketCode:
          winnerRaw == null || String(winnerRaw).trim() === ""
            ? ""
            : String(winnerRaw).trim().toUpperCase(),
        endsAt: ends.toISOString(),
      });

      await persistRaffleToDb(updated);
      if (body.raffle.code) {
        await syncRaffleCodeToDb(updated.code);
      }
    }

    if (body.prizes) {
      const nextPrizes = replacePrizes(body.prizes);
      await persistPrizesToDb(nextPrizes);
    }

    if (body.packs) {
      replacePacks(body.packs);
      await persistPacksToDb(getPacks());
    }

    return NextResponse.json({
      ok: true,
      ...settingsPayload(),
    });
  } catch (error) {
    logServerError("admin/settings", error);
    return NextResponse.json(
      {
        error: publicError(error, "No se pudo guardar", { allowZod: true }),
      },
      { status: 400 },
    );
  }
}
