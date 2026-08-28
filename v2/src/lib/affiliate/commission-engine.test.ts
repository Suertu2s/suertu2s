import { describe, expect, it } from "vitest";
import {
  AFFILIATE_PROGRAM,
  calculateCommissionEntries,
  sellerRateForTickets,
} from "./commission-engine";
import type { DbAffiliate } from "@/lib/db/types";

const seller: DbAffiliate = {
  id: "seller",
  code: "SELLER",
  name: "Vendedor",
  email: null,
  phone: null,
  commission_type: "percent",
  commission_value: 10,
  active: true,
  notes: null,
  password_hash: null,
  referred_by_affiliate_id: "referrer",
  invitation_status: "active",
  invite_token_hash: null,
  invite_expires_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const referrer: DbAffiliate = {
  ...seller,
  id: "referrer",
  code: "REFERRER",
  name: "Invitador",
  referred_by_affiliate_id: null,
};

describe("affiliate commission engine", () => {
  it("starts at 10% and upgrades to 12% after 500 tickets", () => {
    expect(sellerRateForTickets(499)).toBe(10);
    expect(sellerRateForTickets(500)).toBe(12);
  });

  it("adds only one direct referral commission and never exceeds 15%", () => {
    const entries = calculateCommissionEntries({
      order: { id: "order-1", total_clp: 10000 },
      seller,
      directReferrer: referrer,
      directTicketsBefore: AFFILIATE_PROGRAM.escalationTickets,
      createdAt: "2026-08-27T00:00:00.000Z",
    });

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.rate_percent)).toEqual([12, 3]);
    expect(
      entries.reduce((total, entry) => total + entry.rate_percent, 0),
    ).toBe(15);
    expect(entries.map((entry) => entry.amount_clp)).toEqual([1200, 300]);
  });

  it("does not award a self-referral", () => {
    const entries = calculateCommissionEntries({
      order: { id: "order-2", total_clp: 10000 },
      seller,
      directReferrer: seller,
      directTicketsBefore: 0,
    });
    expect(entries).toHaveLength(1);
  });
});
