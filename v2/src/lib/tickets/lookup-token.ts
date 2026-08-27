import { hmacSign, hmacVerify } from "@/lib/security/hmac";
import { getAdminSessionSecret } from "@/lib/security/session-secrets";

const MAX_AGE_SEC = 60 * 30; // 30 minutos

type LookupPayload = {
  email: string;
  exp: number;
};

function lookupSecret() {
  return getAdminSessionSecret();
}

export function createTicketLookupToken(email: string): string {
  const payload: LookupPayload = {
    email: email.toLowerCase().trim(),
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmacSign(lookupSecret(), body)}`;
}

export function verifyTicketLookupToken(
  token: string | null | undefined,
): string | null {
  if (!token || !token.includes(".")) return null;
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    if (!hmacVerify(lookupSecret(), body, sig)) return null;
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as LookupPayload;
    if (!payload?.email || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.email;
  } catch {
    return null;
  }
}
