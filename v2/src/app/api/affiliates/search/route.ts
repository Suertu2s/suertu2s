import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchAffiliatesByName } from "@/lib/db/orders";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { logServerError, publicError } from "@/lib/security/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  q: z.string().min(2).max(80),
});

export async function GET(req: NextRequest) {
  try {
    const limited = rateLimit({
      key: `affiliate-search:${clientIp(req)}`,
      limit: 40,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Demasiadas consultas" },
        { status: 429 },
      );
    }

    const q = req.nextUrl.searchParams.get("q") || "";
    const { q: query } = schema.parse({ q });
    const results = await searchAffiliatesByName(query);
    return NextResponse.json({ results });
  } catch (error) {
    logServerError("affiliates/search", error);
    return NextResponse.json(
      { error: publicError(error, "No se pudo buscar", { allowZod: true }) },
      { status: 400 },
    );
  }
}
