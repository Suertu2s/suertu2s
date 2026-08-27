import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateReferralCode } from "@/lib/db/orders";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { logServerError, publicError } from "@/lib/security/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().min(2).max(32),
});

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit({
      key: `affiliate-validate:${clientIp(req)}`,
      limit: 60,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Demasiadas consultas" },
        { status: 429 },
      );
    }

    const { code } = schema.parse(await req.json());
    const result = await validateReferralCode(code);
    return NextResponse.json(result);
  } catch (error) {
    logServerError("affiliates/validate", error);
    return NextResponse.json(
      { error: publicError(error, "No se pudo validar", { allowZod: true }) },
      { status: 400 },
    );
  }
}
