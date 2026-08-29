import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { getPackById } from "@/lib/catalog/store";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYNTHETIC_NAMES = [
  "Camila R.",
  "Javier M.",
  "Sofía P.",
  "Matías G.",
  "Valentina C.",
  "Diego A.",
  "Antonia V.",
  "Nicolás T.",
  "Fernanda L.",
  "Sebastián D.",
  "Daniela F.",
  "Tomás B.",
];

const PACK_IDS = [
  "pack-puerto-montt",
  "pack-llanquihue",
  "pack-chiloe",
];

function syntheticPurchases() {
  return [...SYNTHETIC_NAMES]
    .sort(() => Math.random() - 0.5)
    .slice(0, 8)
    .map((name, index) => {
      const pack = getPackById(PACK_IDS[randomInt(PACK_IDS.length)]!);
      if (!pack) return null;
      const minutesAgo = randomInt(45) + 1;
      return {
        id: `activity-${Date.now()}-${index}-${randomInt(1_000_000)}`,
        name,
        packName: pack.name,
        tickets: pack.ticketCount,
        image: pack.image,
        timeAgo: `Hace ${minutesAgo} min`,
      };
    })
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  const limited = rateLimit({
    key: `recent-purchases:${clientIp(req)}`,
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json({ purchases: [] }, { status: 200 });
  }

  return NextResponse.json(
    { purchases: syntheticPurchases() },
    {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    },
  );
}
