export type OrderRow = {
  id: string;
  email: string;
  full_name: string;
  rut?: string;
  phone?: string;
  status: string;
  total_clp: number;
  payment_provider: string | null;
  payment_external_id?: string | null;
  referral_code: string | null;
  referral_name?: string | null;
  created_at: string;
  paid_at: string | null;
};

export type Affiliate = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone?: string | null;
  commission_type: "percent" | "fixed";
  commission_value: number;
  active: boolean;
  notes: string | null;
  referred_by_affiliate_id?: string | null;
  invitation_status?: "active" | "pending";
};

export type AffiliateStat = {
  affiliate: Affiliate;
  uses: number;
  ordersPaid: number;
  salesClp: number;
  commissionEarnedClp: number;
  commissionPaidClp: number;
  commissionBalanceClp: number;
  directTickets?: number;
  directReferrals?: number;
  sellerCommissionClp?: number;
  directReferralCommissionClp?: number;
  levelRatePercent?: number;
  rank?: number;
  lastUsedAt: string | null;
};

export type DashboardData = {
  kpis: {
    ordersTotal: number;
    ordersPaid: number;
    ordersPending: number;
    ordersFailed: number;
    revenueClp: number;
    avgOrderClp: number;
    referralOrders: number;
    referralRatePct: number;
    commissionsOwedClp: number;
    commissionsEarnedClp: number;
    ticketsIssued: number;
    series: Array<{ date: string; orders: number; revenue: number }>;
    comparison: {
      revenuePct: number;
      ordersPaidPct: number;
      avgOrderPct: number;
    };
  };
  affiliateStats: AffiliateStat[];
  orphanCodes: Array<{ code: string; uses: number; salesClp: number }>;
  providerMix: Array<{ provider: string; orders: number; revenue: number }>;
  packMix: Array<{
    packId: string;
    name: string;
    quantity: number;
    revenue: number;
    tickets: number;
  }>;
  alerts: {
    pendingOrders: number;
    orphanCodes: number;
    unpaidCommissions: number;
  };
  ops?: {
    paymentsMock: boolean;
    flowConfigured?: boolean;
    dbConfigured: boolean;
    supabaseConfigured?: boolean;
    emailConfigured: boolean;
    liveStreamConfigured: boolean;
    raffleStatus: "open" | "closed";
    winnerConfigured: boolean;
  };
  raffle?: {
    title: string;
    prizeName: string;
    code: string;
    endsAt: string;
    raffleStatus: "open" | "closed";
    winnerTicketCode?: string;
  };
};
