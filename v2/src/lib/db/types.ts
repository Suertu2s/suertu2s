export type OrderStatus = "pending" | "paid" | "failed" | "cancelled";
export type PaymentProvider = "flow" | "mock" | "manual";
export type CommissionType = "percent" | "fixed";
export type AffiliateCommissionKind = "seller" | "direct_referral";
export type AffiliateCommissionStatus = "pending" | "paid" | "reversed";

export type DbAffiliate = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  commission_type: CommissionType;
  commission_value: number;
  active: boolean;
  notes: string | null;
  /** scrypt hash for portal login — never send to clients */
  password_hash: string | null;
  referred_by_affiliate_id: string | null;
  invitation_status: "active" | "pending";
  invite_token_hash: string | null;
  invite_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbOrder = {
  id: string;
  email: string;
  full_name: string;
  rut: string;
  phone: string;
  status: OrderStatus;
  payment_provider: PaymentProvider | null;
  payment_external_id: string | null;
  is_test: boolean;
  total_clp: number;
  raffle_id: string;
  referral_code: string | null;
  referral_name: string | null;
  affiliate_id: string | null;
  created_at: string;
  paid_at: string | null;
  /** ISO timestamp cuando se envió el email de confirmación */
  confirmation_email_sent_at: string | null;
};

export type DbOrderItem = {
  id: string;
  order_id: string;
  pack_id: string;
  quantity: number;
  unit_price_clp: number;
  ticket_count: number;
};

export type DbTicket = {
  id: string;
  raffle_id: string;
  order_id: string;
  /** Sufijo aleatorio 0..99999 (no secuencial). */
  number: number;
  /** Código completo: código del sorteo + 5 dígitos (ej. S2S2648291). */
  code: string;
  email: string;
  created_at: string;
};

export type DbAffiliatePayout = {
  id: string;
  affiliate_id: string;
  amount_clp: number;
  period_from: string;
  period_to: string;
  note: string | null;
  paid_at: string;
  created_at: string;
};

export type DbAffiliateCommission = {
  id: string;
  order_id: string;
  affiliate_id: string;
  kind: AffiliateCommissionKind;
  rate_percent: number;
  base_clp: number;
  amount_clp: number;
  direct_tickets_before: number;
  status: AffiliateCommissionStatus;
  payout_id: string | null;
  created_at: string;
};

export type CheckoutInput = {
  email: string;
  fullName: string;
  rut: string;
  phone: string;
  items: Array<{ packId: string; quantity: number }>;
  provider: PaymentProvider;
  referralCode?: string;
  referralName?: string;
};
