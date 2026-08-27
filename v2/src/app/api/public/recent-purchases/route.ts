import { NextRequest, NextResponse } from "next/server";
import { getPackById } from "@/lib/catalog/store";
import { listRecentPaidPurchases } from "@/lib/db/orders";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function anonymizeName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Comprador";
  const first = parts[0];
  const initial = parts.length > 1 ? `${parts[1]!.charAt(0).toUpperCase()}.` : "";
  return initial ? `${first} ${initial}` : first;
}

function timeAgoLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Hace un momento";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return "Hace un día";
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

  const rows = await listRecentPaidPurchases(12);
  const purchases = rows
    .map((row) => {
      const pack = getPackById(row.packId);
      if (!pack) return null;
      return {
        id: row.orderId,
        name: anonymizeName(row.fullName),
        packName: pack.name,
        tickets: row.ticketCount,
        image: pack.image,
        timeAgo: timeAgoLabel(row.paidAt),
      };
    })
    .filter(Boolean);

  return NextResponse.json(
    { purchases },
    {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    },
  );
}
