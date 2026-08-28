import { describe, expect, it } from "vitest";
import {
  buildAffiliateStats,
  buildCustomers,
  buildSalesKpis,
  calcCommission,
  compareAffiliateStatsBySales,
  filterOrdersByRange,
} from "./analytics";
import type { DbAffiliate, DbAffiliatePayout, DbOrder } from "@/lib/db/types";

const affiliate: DbAffiliate = {
  id: "aff-1",
  code: "TEST10",
  name: "Tester",
  email: null,
  phone: null,
  commission_type: "percent",
  commission_value: 10,
  active: true,
  notes: null,
  password_hash: null,
  referred_by_affiliate_id: null,
  invitation_status: "active",
  invite_token_hash: null,
  invite_expires_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function order(
  partial: Partial<DbOrder> & Pick<DbOrder, "id" | "total_clp">,
): DbOrder {
  return {
    email: "a@test.cl",
    full_name: "A",
    rut: "1-9",
    phone: "+569",
    status: "paid",
    payment_provider: "mock",
    payment_external_id: null,
    is_test: false,
    raffle_id: "r1",
    referral_code: "TEST10",
    referral_name: "Tester",
    affiliate_id: "aff-1",
    created_at: "2026-08-01T12:00:00.000Z",
    paid_at: "2026-08-01T12:00:00.000Z",
    confirmation_email_sent_at: null,
    ...partial,
  };
}

describe("calcCommission", () => {
  it("calcula porcentaje redondeado", () => {
    expect(calcCommission(10000, affiliate)).toBe(1000);
  });

  it("calcula monto fijo", () => {
    expect(
      calcCommission(10000, {
        ...affiliate,
        commission_type: "fixed",
        commission_value: 500,
      }),
    ).toBe(500);
  });
});

describe("buildSalesKpis", () => {
  it("agrega ingresos y pedidos pagados del rango", () => {
    const from = new Date("2026-08-01T00:00:00.000Z");
    const to = new Date("2026-08-31T23:59:59.999Z");
    const orders = [
      order({ id: "1", total_clp: 5000 }),
      order({
        id: "2",
        total_clp: 8000,
        status: "pending",
        paid_at: null,
      }),
      order({
        id: "3",
        total_clp: 10000,
        paid_at: "2026-07-01T00:00:00.000Z",
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    ];

    const kpis = buildSalesKpis(orders, from, to);
    expect(kpis.ordersPaid).toBe(1);
    expect(kpis.ordersPending).toBe(1);
    expect(kpis.revenueClp).toBe(5000);
    expect(kpis.comparison).toBeDefined();
  });
});

describe("buildAffiliateStats", () => {
  it("resta liquidaciones del saldo", () => {
    const from = new Date("2026-08-01T00:00:00.000Z");
    const to = new Date("2026-08-31T23:59:59.999Z");
    const orders = [order({ id: "1", total_clp: 10000 })];
    const payouts: DbAffiliatePayout[] = [
      {
        id: "p1",
        affiliate_id: "aff-1",
        amount_clp: 400,
        period_from: "2026-08-01",
        period_to: "2026-08-31",
        note: null,
        paid_at: "2026-08-10T00:00:00.000Z",
        created_at: "2026-08-10T00:00:00.000Z",
      },
    ];

    const [stat] = buildAffiliateStats([affiliate], orders, payouts, from, to);
    expect(stat.commissionEarnedClp).toBe(1000);
    expect(stat.commissionPaidClp).toBe(400);
    expect(stat.commissionBalanceClp).toBe(600);
  });

  it("ordena afiliados por ventas del período (mayor primero)", () => {
    const from = new Date("2026-08-01T00:00:00.000Z");
    const to = new Date("2026-08-31T23:59:59.999Z");
    const affA: DbAffiliate = {
      ...affiliate,
      id: "aff-a",
      code: "AAA",
      name: "Bajo",
    };
    const affB: DbAffiliate = {
      ...affiliate,
      id: "aff-b",
      code: "BBB",
      name: "Alto",
    };
    const orders = [
      order({
        id: "1",
        affiliate_id: "aff-a",
        referral_code: "AAA",
        total_clp: 5000,
      }),
      order({
        id: "2",
        affiliate_id: "aff-b",
        referral_code: "BBB",
        total_clp: 20000,
      }),
    ];

    const stats = buildAffiliateStats([affA, affB], orders, [], from, to);
    expect(stats.map((s) => s.affiliate.code)).toEqual(["BBB", "AAA"]);
    expect(compareAffiliateStatsBySales(stats[0], stats[1])).toBeLessThan(0);
  });
});

describe("buildCustomers / filterOrdersByRange", () => {
  it("agrupa clientes y filtra por rango", () => {
    const from = new Date("2026-08-01T00:00:00.000Z");
    const to = new Date("2026-08-31T23:59:59.999Z");
    const orders = [
      order({
        id: "1",
        total_clp: 5000,
        email: "ana@test.cl",
        full_name: "Ana",
      }),
      order({
        id: "2",
        total_clp: 8000,
        email: "ana@test.cl",
        full_name: "Ana",
        paid_at: "2026-08-05T00:00:00.000Z",
      }),
    ];

    const inRange = filterOrdersByRange(orders, from, to, true);
    expect(inRange).toHaveLength(2);

    const customers = buildCustomers(orders);
    expect(customers).toHaveLength(1);
    expect(customers[0].totalSpentClp).toBe(13000);
    expect(customers[0].paidCount).toBe(2);
  });
});
