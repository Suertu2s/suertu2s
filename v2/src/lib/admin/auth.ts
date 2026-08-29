import { NextRequest, NextResponse } from "next/server";
import {
  adminAuthConfigured,
  getSessionFromRequest,
} from "@/lib/admin/session";

export function isAdminAuthorized(req: NextRequest) {
  if (!adminAuthConfigured()) {
    // Sin configuración: denegar acceso admin en cualquier entorno
    return false;
  }
  return Boolean(getSessionFromRequest(req));
}

export function isManualSalesAuthorized(req: NextRequest) {
  if (!adminAuthConfigured()) return false;
  const session = getSessionFromRequest(req);
  return Boolean(
    session && session.canManualSales && !session.mustChangePassword,
  );
}

export function requireAdmin(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}

/** Inicio/fin del día calendario en America/Santiago para un YYYY-MM-DD */
function chileDayBound(ymd: string, endOfDay: boolean) {
  const [y, m, d] = ymd.split("-").map(Number);
  const utcGuess = Date.UTC(
    y,
    m - 1,
    d,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    dtf
      .formatToParts(new Date(utcGuess))
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
  const asIfLocal = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
    endOfDay ? 999 : 0,
  );
  const offset = asIfLocal - utcGuess;
  return new Date(utcGuess - offset);
}

function chileTodayYmd() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Santiago",
  });
}

export function parseDateRange(req: NextRequest) {
  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");

  const toYmd = toParam && toParam.length <= 10 ? toParam : chileTodayYmd();
  let fromYmd = fromParam && fromParam.length <= 10 ? fromParam : "";

  if (!fromYmd) {
    const toDate = chileDayBound(toYmd, false);
    fromYmd = new Date(
      toDate.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  }

  return {
    from: chileDayBound(fromYmd, false),
    to: chileDayBound(toYmd, true),
  };
}
