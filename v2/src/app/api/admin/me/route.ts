import { NextRequest, NextResponse } from "next/server";
import {
  adminAuthConfigured,
  getSessionFromRequest,
} from "@/lib/admin/session";

export async function GET(req: NextRequest) {
  if (!adminAuthConfigured()) {
    return NextResponse.json(
      { authenticated: false, configured: false },
      { status: 503 },
    );
  }
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ authenticated: false, configured: true });
  }
  return NextResponse.json({
    authenticated: true,
    configured: true,
    email: session.email,
    mustChangePassword: session.mustChangePassword,
    canManualSales: session.canManualSales,
  });
}
