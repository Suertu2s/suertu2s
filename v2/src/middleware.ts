import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  verifyAdminSessionTokenEdge,
} from "@/lib/admin/session-edge";
import { isSameOriginRequest } from "@/lib/security/origin";

function isMutating(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CSRF: mutaciones admin/afiliado deben ser same-origin
  if (
    isMutating(req.method) &&
    (pathname.startsWith("/api/admin") || pathname.startsWith("/api/affiliate"))
  ) {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json(
        { error: "Origen no permitido" },
        { status: 403 },
      );
    }
  }

  // APIs admin (excepto login/logout): exigir cookie de sesión válida
  if (
    pathname.startsWith("/api/admin") &&
    !pathname.startsWith("/api/admin/login") &&
    !pathname.startsWith("/api/admin/logout")
  ) {
    const secret = process.env.ADMIN_SESSION_SECRET?.trim();
    const devFallback =
      process.env.NODE_ENV !== "production"
        ? process.env.ADMIN_PASSWORD?.trim()
        : "";
    const sessionSecret = secret || devFallback || "";

    if (!sessionSecret) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const session = await verifyAdminSessionTokenEdge(token, sessionSecret);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (
      session.mustChangePassword &&
      !pathname.startsWith("/api/admin/me") &&
      !pathname.startsWith("/api/admin/change-password")
    ) {
      return NextResponse.json(
        { error: "Debes cambiar tu contraseña antes de continuar" },
        { status: 403 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*", "/api/affiliate/:path*"],
};
