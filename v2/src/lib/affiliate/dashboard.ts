import { calcCommission } from "@/lib/admin/analytics";
import type {
  DbAffiliate,
  DbAffiliateCommission,
  DbAffiliatePayout,
  DbOrder,
  DbTicket,
} from "@/lib/db/types";
import { publicAffiliate } from "./public";

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}***@${domain}`;
}

export function buildAffiliatePortalDashboard(
  affiliate: DbAffiliate,
  orders: DbOrder[],
  payouts: DbAffiliatePayout[],
  siteUrl: string,
  allAffiliates: DbAffiliate[] = [affiliate],
  commissions: DbAffiliateCommission[] = [],
  allOrders: DbOrder[] = orders,
  tickets: DbTicket[] = [],
) {
  const code = affiliate.code.toUpperCase();
  const related = orders
    .filter((o) => o.status === "paid")
    .filter(
      (o) =>
        o.affiliate_id === affiliate.id ||
        (o.referral_code && o.referral_code.toUpperCase() === code),
    )
    .sort((a, b) => {
      const ta = new Date(a.paid_at || a.created_at).getTime();
      const tb = new Date(b.paid_at || b.created_at).getTime();
      return tb - ta;
    });

  const salesClp = related.reduce((a, o) => a + o.total_clp, 0);
  const legacyCommissionEarnedClp = related.reduce(
    (a, o) => a + calcCommission(o.total_clp, affiliate),
    0,
  );

  const myPayouts = payouts
    .filter((p) => p.affiliate_id === affiliate.id)
    .sort(
      (a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime(),
    );
  const commissionPaidClp = myPayouts.reduce((a, p) => a + p.amount_clp, 0);
  const myCommissions = commissions.filter(
    (commission) =>
      commission.affiliate_id === affiliate.id &&
      commission.status !== "reversed",
  );
  const ledgerCommissionEarnedClp = myCommissions.reduce(
    (total, commission) => total + commission.amount_clp,
    0,
  );
  const sellerCommissionClp = myCommissions
    .filter((commission) => commission.kind === "seller")
    .reduce((total, commission) => total + commission.amount_clp, 0);
  const directReferralCommissionClp = myCommissions
    .filter((commission) => commission.kind === "direct_referral")
    .reduce((total, commission) => total + commission.amount_clp, 0);
  const commissionEarnedClp =
    myCommissions.length > 0
      ? ledgerCommissionEarnedClp
      : legacyCommissionEarnedClp;
  const sellerCommissionTotalClp =
    myCommissions.length > 0 ? sellerCommissionClp : legacyCommissionEarnedClp;
  const directTickets = tickets.filter((ticket) =>
    related.some((order) => order.id === ticket.order_id),
  ).length;
  const directReferrals = allAffiliates.filter(
    (candidate) =>
      candidate.active && candidate.referred_by_affiliate_id === affiliate.id,
  ).length;
  const activeAffiliates = allAffiliates.filter(
    (candidate) => candidate.active,
  );
  const ranking = activeAffiliates
    .map((candidate) => {
      const candidateOrders = allOrders.filter(
        (order) =>
          order.status === "paid" && order.affiliate_id === candidate.id,
      );
      return {
        id: candidate.id,
        salesClp: candidateOrders.reduce(
          (total, order) => total + order.total_clp,
          0,
        ),
      };
    })
    .sort((a, b) => b.salesClp - a.salesClp || a.id.localeCompare(b.id));
  const rank = Math.max(
    1,
    ranking.findIndex((candidate) => candidate.id === affiliate.id) + 1,
  );

  const base = siteUrl.replace(/\/$/, "");
  const shareUrl = `${base}/?ref=${encodeURIComponent(code)}`;

  return {
    affiliate: publicAffiliate(affiliate),
    shareUrl,
    summary: {
      ordersPaid: related.length,
      salesClp,
      commissionEarnedClp,
      commissionPaidClp,
      commissionBalanceClp: commissionEarnedClp - commissionPaidClp,
      directReferralCommissionClp,
      sellerCommissionClp: sellerCommissionTotalClp,
      directTickets,
      directReferrals,
      levelRatePercent: directTickets >= 500 ? 12 : 10,
      escalationTickets: 500,
      ticketsRemaining: Math.max(0, 500 - directTickets),
      rank,
      totalAffiliates: activeAffiliates.length,
      commissionLabel: `${directTickets >= 500 ? 12 : 10}% por venta propia`,
    },
    recentSales: related.slice(0, 25).map((o) => ({
      id: o.id,
      paidAt: o.paid_at || o.created_at,
      totalClp: o.total_clp,
      emailMasked: maskEmail(o.email),
      commissionClp:
        myCommissions.find(
          (commission) =>
            commission.order_id === o.id && commission.kind === "seller",
        )?.amount_clp || calcCommission(o.total_clp, affiliate),
      commissionRatePercent:
        myCommissions.find(
          (commission) =>
            commission.order_id === o.id && commission.kind === "seller",
        )?.rate_percent || (directTickets >= 500 ? 12 : 10),
    })),
    payouts: myPayouts.map((p) => ({
      id: p.id,
      amountClp: p.amount_clp,
      paidAt: p.paid_at,
      periodFrom: p.period_from,
      periodTo: p.period_to,
      note: p.note,
    })),
  };
}
