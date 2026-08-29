import { hmacVerifySubtle } from "@/lib/security/hmac-subtle";

export const ADMIN_COOKIE = "suertu2s_admin_session";

const DEFAULT_ADMIN_EMAILS = [
  "admin1@suertu2s.cl",
  "admin2@suertu2s.cl",
  "admin3@suertu2s.cl",
];

export type AdminSession = {
  email: string;
  exp: number;
  mustChangePassword: boolean;
  canManualSales: boolean;
};

function base64UrlToUtf8(body: string): string {
  const padded = body.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Verificación de sesión admin compatible con Edge Middleware. */
export async function verifyAdminSessionTokenEdge(
  token: string | undefined | null,
  secret: string,
): Promise<AdminSession | null> {
  if (!token || !token.includes(".") || !secret) return null;
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    if (!(await hmacVerifySubtle(secret, body, sig))) return null;

    const payload = JSON.parse(base64UrlToUtf8(body)) as AdminSession;
    if (!payload?.email || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    const allowed = (process.env.ADMIN_EMAILS || DEFAULT_ADMIN_EMAILS.join(","))
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!allowed.includes(payload.email.toLowerCase())) return null;
    return {
      ...payload,
      mustChangePassword: Boolean(payload.mustChangePassword),
      canManualSales: Boolean(payload.canManualSales),
    };
  } catch {
    return null;
  }
}
