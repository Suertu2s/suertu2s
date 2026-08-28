import { createHash, randomBytes } from "crypto";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createAffiliateInviteToken() {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashAffiliateInviteToken(token),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
  };
}

export function hashAffiliateInviteToken(token: string) {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function isAffiliateInviteExpired(expiresAt: string | null) {
  return !expiresAt || new Date(expiresAt).getTime() <= Date.now();
}

export function affiliateCodeFromName(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);
  return `${normalized || "COLAB"}${randomBytes(4).toString("hex").toUpperCase()}`;
}
