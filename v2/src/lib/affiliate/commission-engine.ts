import type {
  AffiliateCommissionKind,
  DbAffiliate,
  DbAffiliateCommission,
  DbOrder,
} from "@/lib/db/types";

export const AFFILIATE_PROGRAM = {
  initialRatePercent: 10,
  escalatedRatePercent: 12,
  escalationTickets: 500,
  directReferralRatePercent: 3,
  maximumRatePercent: 15,
} as const;

export function sellerRateForTickets(ticketsBeforeSale: number) {
  return ticketsBeforeSale >= AFFILIATE_PROGRAM.escalationTickets
    ? AFFILIATE_PROGRAM.escalatedRatePercent
    : AFFILIATE_PROGRAM.initialRatePercent;
}

export type CommissionCalculationInput = {
  order: Pick<DbOrder, "id" | "total_clp">;
  seller: DbAffiliate;
  directReferrer?: DbAffiliate | null;
  directTicketsBefore: number;
  createdAt?: string;
};

export function calculateCommissionEntries({
  order,
  seller,
  directReferrer,
  directTicketsBefore,
  createdAt = new Date().toISOString(),
}: CommissionCalculationInput): Array<
  Omit<DbAffiliateCommission, "id" | "payout_id" | "status"> & {
    status: "pending";
    payout_id: null;
  }
> {
  const sellerRate = sellerRateForTickets(directTicketsBefore);
  const sellerAmount = Math.round((order.total_clp * sellerRate) / 100);
  const entries: Array<
    Omit<DbAffiliateCommission, "id" | "payout_id" | "status"> & {
      status: "pending";
      payout_id: null;
    }
  > = [
    {
      order_id: order.id,
      affiliate_id: seller.id,
      kind: "seller",
      rate_percent: sellerRate,
      base_clp: order.total_clp,
      amount_clp: sellerAmount,
      direct_tickets_before: directTicketsBeforeSale(directTicketsBefore),
      created_at: createdAt,
      status: "pending",
      payout_id: null,
    },
  ];

  if (
    directReferrer &&
    directReferrer.id !== seller.id &&
    sellerRate + AFFILIATE_PROGRAM.directReferralRatePercent <=
      AFFILIATE_PROGRAM.maximumRatePercent
  ) {
    entries.push({
      order_id: order.id,
      affiliate_id: directReferrer.id,
      kind: "direct_referral",
      rate_percent: AFFILIATE_PROGRAM.directReferralRatePercent,
      base_clp: order.total_clp,
      amount_clp: Math.round(
        (order.total_clp * AFFILIATE_PROGRAM.directReferralRatePercent) / 100,
      ),
      direct_tickets_before: directTicketsBeforeSale(directTicketsBefore),
      created_at: createdAt,
      status: "pending",
      payout_id: null,
    });
  }

  return entries;
}

function directTicketsBeforeSale(value: number) {
  return Math.max(0, Math.floor(value));
}

export function commissionKindLabel(kind: AffiliateCommissionKind) {
  return kind === "seller" ? "Venta propia" : "Referido directo";
}
