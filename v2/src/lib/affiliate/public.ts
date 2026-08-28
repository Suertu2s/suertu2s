import type { DbAffiliate } from "@/lib/db/types";

export type PublicAffiliate = Omit<
  DbAffiliate,
  "password_hash" | "invite_token_hash" | "invite_expires_at"
>;

export function publicAffiliate(a: DbAffiliate): PublicAffiliate {
  const { password_hash, invite_token_hash, invite_expires_at, ...rest } = a;
  void password_hash;
  void invite_token_hash;
  void invite_expires_at;
  return rest;
}

export function publicAffiliates(list: DbAffiliate[]): PublicAffiliate[] {
  return list.map(publicAffiliate);
}
