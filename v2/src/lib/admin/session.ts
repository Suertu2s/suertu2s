import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { hmacSign, hmacVerify } from "@/lib/security/hmac";
import { verifyPassword } from "@/lib/security/password";
import { getAdminSessionSecret } from "@/lib/security/session-secrets";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase";

import { ADMIN_COOKIE } from "@/lib/admin/session-edge";

export { ADMIN_COOKIE };
const MAX_AGE_SEC = 60 * 60 * 8; // 8h

export type AdminSession = {
  email: string;
  exp: number;
  mustChangePassword: boolean;
  canManualSales: boolean;
};

export const DEFAULT_ADMIN_EMAILS = [
  "admin1@suertu2s.cl",
  "admin2@suertu2s.cl",
  "admin3@suertu2s.cl",
] as const;

export type AdminAccount = {
  email: string;
  display_name: string;
  password_hash: string;
  must_change_password: boolean;
  can_manual_sales: boolean;
  active: boolean;
};

function sessionSecret() {
  return getAdminSessionSecret();
}

export function getAllowedAdminEmails() {
  return (process.env.ADMIN_EMAILS || DEFAULT_ADMIN_EMAILS.join(","))
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function adminAuthConfigured() {
  const hasPassword = Boolean(
    process.env.ADMIN_PASSWORD_HASH?.trim() ||
    process.env.ADMIN_PASSWORD?.trim(),
  );
  const hasAdminDatabase = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() && isSupabaseConfigured(),
  );
  return Boolean(
    getAllowedAdminEmails().length && (hasPassword || hasAdminDatabase),
  );
}

export async function getAdminAccount(email: string) {
  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    !isSupabaseConfigured()
  ) {
    return null;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_accounts")
    .select(
      "email, display_name, password_hash, must_change_password, can_manual_sales, active",
    )
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error) {
    if (error.code === "PGRST205") {
      // Compatibilidad hasta que se ejecute la migración multiadmin.
      return null;
    }
    throw new Error(`Error al consultar cuenta admin: ${error.message}`);
  }
  return (data as AdminAccount | null) || null;
}

export async function updateAdminPassword(email: string, passwordHash: string) {
  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    !isSupabaseConfigured()
  ) {
    throw new Error("Las cuentas admin requieren Supabase service role.");
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_accounts")
    .update({
      password_hash: passwordHash,
      must_change_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email.toLowerCase().trim())
    .eq("active", true)
    .select(
      "email, display_name, password_hash, must_change_password, can_manual_sales, active",
    )
    .maybeSingle();
  if (error || !data) {
    throw new Error(
      error?.message || "No se pudo actualizar la contraseña admin.",
    );
  }
  return data as AdminAccount;
}

export function createAdminSessionToken(
  email: string,
  options?: Partial<
    Pick<AdminSession, "mustChangePassword" | "canManualSales">
  >,
) {
  const normalizedEmail = email.toLowerCase().trim();
  const payload: AdminSession = {
    email: normalizedEmail,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
    mustChangePassword: options?.mustChangePassword ?? false,
    canManualSales: options?.canManualSales ?? false,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmacSign(sessionSecret(), body)}`;
}

export function verifyAdminSessionToken(
  token: string | undefined | null,
): AdminSession | null {
  if (!token || !token.includes(".")) return null;
  try {
    const secret = sessionSecret();
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    if (!hmacVerify(secret, body, sig)) return null;
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as AdminSession;
    if (!payload?.email || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    const allowed = getAllowedAdminEmails();
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

export function verifyAdminPassword(password: string, storedHash?: string) {
  const hash = storedHash?.trim() || process.env.ADMIN_PASSWORD_HASH?.trim();
  if (hash) {
    return verifyPassword(password, hash);
  }

  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || !password) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(Buffer.from(expected), Buffer.from(expected));
    return false;
  }
  return timingSafeEqual(a, b);
}

export function setAdminSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export function clearAdminSessionCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function getSessionFromRequest(req: NextRequest): AdminSession | null {
  return verifyAdminSessionToken(req.cookies.get(ADMIN_COOKIE)?.value);
}

export async function getSessionFromCookies(): Promise<AdminSession | null> {
  const jar = await cookies();
  return verifyAdminSessionToken(jar.get(ADMIN_COOKIE)?.value);
}
