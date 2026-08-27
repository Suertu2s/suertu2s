import {
  getPackById,
  getPacks,
  getPrizeById,
  getPrizes,
  getRaffle,
} from "@/lib/catalog/store";
import type {
  DbAffiliate,
  DbAffiliatePayout,
  DbOrder,
  DbOrderItem,
  DbTicket,
} from "@/lib/db/types";

/** Meta mínima fija del negocio (siempre visible en Analítica). */
export const MIN_TICKET_GOAL = 15_000;

export function calcCommission(orderTotal: number, affiliate: DbAffiliate) {
  if (affiliate.commission_type === "fixed") {
    return Math.round(Number(affiliate.commission_value));
  }
  return Math.round((orderTotal * Number(affiliate.commission_value)) / 100);
}

export function filterOrdersByRange(
  orders: DbOrder[],
  from: Date,
  to: Date,
  onlyPaid = false,
) {
  return orders.filter((o) => {
    const t = new Date(o.paid_at || o.created_at).getTime();
    if (t < from.getTime() || t > to.getTime()) return false;
    if (onlyPaid && o.status !== "paid") return false;
    return true;
  });
}

/** Día calendario en zona Chile (YYYY-MM-DD) */
export function chileDateKey(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
}

export function previousPeriod(from: Date, to: Date) {
  const span = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - span);
  return { from: prevFrom, to: prevTo };
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export function buildSalesKpis(orders: DbOrder[], from: Date, to: Date) {
  const inRange = filterOrdersByRange(orders, from, to);
  const paid = inRange.filter((o) => o.status === "paid");
  const pending = inRange.filter((o) => o.status === "pending");
  const failed = inRange.filter((o) => o.status === "failed");

  const revenue = paid.reduce((acc, o) => acc + o.total_clp, 0);
  const avgTicket = paid.length ? Math.round(revenue / paid.length) : 0;
  const withReferral = paid.filter((o) => o.referral_code).length;
  const referralRate = paid.length
    ? Math.round((withReferral / paid.length) * 100)
    : 0;

  const dayMap = new Map<
    string,
    { date: string; orders: number; revenue: number }
  >();
  for (const o of paid) {
    const d = new Date(o.paid_at || o.created_at);
    const key = chileDateKey(d);
    const row = dayMap.get(key) || { date: key, orders: 0, revenue: 0 };
    row.orders += 1;
    row.revenue += o.total_clp;
    dayMap.set(key, row);
  }
  const series = [...dayMap.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const prev = previousPeriod(from, to);
  const prevKpis = (() => {
    const prevPaid = filterOrdersByRange(orders, prev.from, prev.to, true);
    const prevRevenue = prevPaid.reduce((acc, o) => acc + o.total_clp, 0);
    return {
      revenueClp: prevRevenue,
      ordersPaid: prevPaid.length,
      avgOrderClp: prevPaid.length
        ? Math.round(prevRevenue / prevPaid.length)
        : 0,
    };
  })();

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    ordersTotal: inRange.length,
    ordersPaid: paid.length,
    ordersPending: pending.length,
    ordersFailed: failed.length,
    revenueClp: revenue,
    avgOrderClp: avgTicket,
    referralOrders: withReferral,
    referralRatePct: referralRate,
    series,
    comparison: {
      revenuePct: pctChange(revenue, prevKpis.revenueClp),
      ordersPaidPct: pctChange(paid.length, prevKpis.ordersPaid),
      avgOrderPct: pctChange(avgTicket, prevKpis.avgOrderClp),
      previous: prevKpis,
    },
  };
}

export function buildProviderMix(orders: DbOrder[], from: Date, to: Date) {
  const paid = filterOrdersByRange(orders, from, to, true);
  const map = new Map<
    string,
    { provider: string; orders: number; revenue: number }
  >();
  for (const o of paid) {
    const key = o.payment_provider || "unknown";
    const row = map.get(key) || { provider: key, orders: 0, revenue: 0 };
    row.orders += 1;
    row.revenue += o.total_clp;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export function buildPackMix(
  orders: DbOrder[],
  items: DbOrderItem[],
  from: Date,
  to: Date,
) {
  const paidIds = new Set(
    filterOrdersByRange(orders, from, to, true).map((o) => o.id),
  );
  const map = new Map<
    string,
    {
      packId: string;
      name: string;
      quantity: number;
      revenue: number;
      tickets: number;
    }
  >();

  for (const item of items) {
    if (!paidIds.has(item.order_id)) continue;
    const pack = getPackById(item.pack_id);
    const packId = pack?.id || item.pack_id;
    const name = pack?.name || item.pack_id;
    const row = map.get(packId) || {
      packId,
      name,
      quantity: 0,
      revenue: 0,
      tickets: 0,
    };
    row.quantity += item.quantity;
    row.revenue += item.unit_price_clp * item.quantity;
    row.tickets += item.ticket_count;
    map.set(packId, row);
  }

  for (const p of getPacks()) {
    if (!map.has(p.id)) {
      map.set(p.id, {
        packId: p.id,
        name: p.name,
        quantity: 0,
        revenue: 0,
        tickets: 0,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export type AffiliateStat = {
  affiliate: DbAffiliate;
  uses: number;
  ordersPaid: number;
  salesClp: number;
  commissionEarnedClp: number;
  commissionPaidClp: number;
  commissionBalanceClp: number;
  lastUsedAt: string | null;
};

export function buildAffiliateStats(
  affiliates: DbAffiliate[],
  orders: DbOrder[],
  payouts: DbAffiliatePayout[],
  from: Date,
  to: Date,
): AffiliateStat[] {
  const paid = filterOrdersByRange(orders, from, to, true);

  return affiliates
    .map((affiliate) => {
      const code = affiliate.code.toUpperCase();
      const related = paid.filter(
        (o) =>
          o.affiliate_id === affiliate.id ||
          (o.referral_code || "").toUpperCase() === code,
      );
      const salesClp = related.reduce((acc, o) => acc + o.total_clp, 0);
      const commissionEarnedClp = related.reduce(
        (acc, o) => acc + calcCommission(o.total_clp, affiliate),
        0,
      );
      const commissionPaidClp = payouts
        .filter((p) => p.affiliate_id === affiliate.id)
        .filter((p) => {
          const t = new Date(p.paid_at).getTime();
          return t >= from.getTime() && t <= to.getTime();
        })
        .reduce((acc, p) => acc + p.amount_clp, 0);

      const last = related
        .map((o) => o.paid_at || o.created_at)
        .sort()
        .at(-1);

      return {
        affiliate,
        uses: related.length,
        ordersPaid: related.length,
        salesClp,
        commissionEarnedClp,
        commissionPaidClp,
        commissionBalanceClp: commissionEarnedClp - commissionPaidClp,
        lastUsedAt: last || null,
      };
    })
    .sort((a, b) => b.commissionBalanceClp - a.commissionBalanceClp);
}

/** @deprecated alias — commissionOwedClp maps to balance for older callers */
export function withLegacyCommissionField(stats: AffiliateStat[]) {
  return stats.map((s) => ({
    ...s,
    commissionOwedClp: s.commissionBalanceClp,
  }));
}

export function buildOrphanReferralStats(
  affiliates: DbAffiliate[],
  orders: DbOrder[],
  from: Date,
  to: Date,
) {
  const known = new Set(affiliates.map((a) => a.code.toUpperCase()));
  const paid = filterOrdersByRange(orders, from, to, true);
  const map = new Map<
    string,
    { code: string; uses: number; salesClp: number; lastUsedAt: string | null }
  >();

  for (const o of paid) {
    const code = (o.referral_code || "").toUpperCase().trim();
    if (!code || known.has(code)) continue;
    const row = map.get(code) || {
      code,
      uses: 0,
      salesClp: 0,
      lastUsedAt: null as string | null,
    };
    row.uses += 1;
    row.salesClp += o.total_clp;
    row.lastUsedAt = o.paid_at || o.created_at;
    map.set(code, row);
  }

  return [...map.values()].sort((a, b) => b.uses - a.uses);
}

export type CustomerRow = {
  email: string;
  full_name: string;
  rut: string;
  phone: string;
  ordersCount: number;
  paidCount: number;
  totalSpentClp: number;
  lastOrderAt: string | null;
  referralCodes: string[];
};

export function buildCustomers(orders: DbOrder[]): CustomerRow[] {
  const map = new Map<string, CustomerRow>();
  for (const o of orders) {
    const key = o.email.toLowerCase();
    const row = map.get(key) || {
      email: key,
      full_name: o.full_name,
      rut: o.rut,
      phone: o.phone,
      ordersCount: 0,
      paidCount: 0,
      totalSpentClp: 0,
      lastOrderAt: null,
      referralCodes: [],
    };
    row.ordersCount += 1;
    if (o.status === "paid") {
      row.paidCount += 1;
      row.totalSpentClp += o.total_clp;
    }
    if (o.full_name) row.full_name = o.full_name;
    if (o.rut) row.rut = o.rut;
    if (o.phone) row.phone = o.phone;
    const ts = o.paid_at || o.created_at;
    if (!row.lastOrderAt || ts > row.lastOrderAt) row.lastOrderAt = ts;
    if (o.referral_code && !row.referralCodes.includes(o.referral_code)) {
      row.referralCodes.push(o.referral_code);
    }
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.totalSpentClp - a.totalSpentClp);
}

export type Insight = {
  level: "positive" | "neutral" | "warning" | "critical";
  title: string;
  detail: string;
};

export function resolvePrizeGoal(prizeId?: string | null) {
  const prizes = getPrizes();
  const raffle = getRaffle();
  const opsCost =
    Number(process.env.BUSINESS_OPS_COST_CLP) ||
    raffle.estimatedOpsCostClp ||
    0;

  const envPrizeRaw = process.env.BUSINESS_PRIZE_COST_CLP;
  const envPrizeOverride =
    envPrizeRaw != null && envPrizeRaw !== ""
      ? Number(envPrizeRaw)
      : Number.NaN;
  const selectedId = prizeId && prizeId !== "all" ? prizeId : "all";

  if (selectedId !== "all") {
    const prize = getPrizeById(selectedId) || prizes[0];
    if (prize) {
      const prizeCost = Number.isFinite(envPrizeOverride)
        ? envPrizeOverride
        : prize.costClp;
      return {
        prizeId: prize.id,
        goalLabel: `Meta: ${prize.name}`,
        goalName: prize.name,
        prizeCostClp: prizeCost,
        opsCostClp: opsCost,
        breakEvenClp: prizeCost + opsCost,
        prizes,
      };
    }
  }

  const sumPrizes = prizes.reduce((a, p) => a + p.costClp, 0);
  const prizeCost = Number.isFinite(envPrizeOverride)
    ? envPrizeOverride
    : sumPrizes || raffle.estimatedPrizeCostClp || 0;

  return {
    prizeId: "all" as const,
    goalLabel: "Meta: todos los premios",
    goalName: "todos los premios",
    prizeCostClp: prizeCost,
    opsCostClp: opsCost,
    breakEvenClp: prizeCost + opsCost,
    prizes,
  };
}

export function buildBusinessAnalytics(input: {
  orders: DbOrder[];
  items: DbOrderItem[];
  tickets: DbTicket[];
  affiliates: DbAffiliate[];
  payouts: DbAffiliatePayout[];
  from: Date;
  to: Date;
  prizeId?: string | null;
}) {
  const { orders, items, tickets, affiliates, payouts, from, to, prizeId } =
    input;
  const kpis = buildSalesKpis(orders, from, to);
  const packMix = buildPackMix(orders, items, from, to);
  const providerMix = buildProviderMix(orders, from, to);
  const affiliateStats = buildAffiliateStats(
    affiliates,
    orders,
    payouts,
    from,
    to,
  );

  const paid = filterOrdersByRange(orders, from, to, true);
  const inRange = filterOrdersByRange(orders, from, to);

  const revenue = kpis.revenueClp;
  const commissionsEarned = affiliateStats.reduce(
    (a, s) => a + s.commissionEarnedClp,
    0,
  );
  const commissionsPaid = affiliateStats.reduce(
    (a, s) => a + s.commissionPaidClp,
    0,
  );
  const netAfterCommissions = revenue - commissionsEarned;

  const organic = paid.filter((o) => !o.referral_code);
  const referred = paid.filter((o) => o.referral_code);
  const organicRevenue = organic.reduce((a, o) => a + o.total_clp, 0);
  const referredRevenue = referred.reduce((a, o) => a + o.total_clp, 0);

  const customers = buildCustomers(paid);
  const repeatCustomers = customers.filter((c) => c.paidCount >= 2).length;
  const repeatRatePct = customers.length
    ? Math.round((repeatCustomers / customers.length) * 100)
    : 0;

  const conversionPct = inRange.length
    ? Math.round((paid.length / inRange.length) * 100)
    : 0;
  const failRatePct = inRange.length
    ? Math.round((kpis.ordersFailed / inRange.length) * 100)
    : 0;

  let cumulative = 0;
  const daily = kpis.series.map((s) => {
    cumulative += s.revenue;
    return {
      date: s.date,
      label: s.date.slice(5),
      orders: s.orders,
      revenue: s.revenue,
      cumulative,
    };
  });

  const daySpan = Math.max(
    1,
    Math.ceil((to.getTime() - from.getTime()) / 86400000),
  );
  const avgDailyRevenue = Math.round(revenue / daySpan);
  const avgDailyOrders = Number((paid.length / daySpan).toFixed(2));

  const raffle = getRaffle();
  const goal = resolvePrizeGoal(prizeId);
  const { prizeCostClp: prizeCost, opsCostClp: opsCost, breakEvenClp } = goal;
  const breakEvenPct = breakEvenClp
    ? Math.min(100, Math.round((revenue / breakEvenClp) * 100))
    : 0;
  const gapToBreakEven = Math.max(0, breakEvenClp - revenue);

  const endsAt = new Date(raffle.endsAt);
  const daysLeft = Math.max(
    0,
    Math.ceil((endsAt.getTime() - Date.now()) / 86400000),
  );
  const projectedToEnd = revenue + avgDailyRevenue * daysLeft;
  const onTrackMoney = breakEvenClp > 0 ? projectedToEnd >= breakEvenClp : null;

  const ticketsInPeriod = tickets.filter((t) => {
    const order = orders.find((o) => o.id === t.order_id);
    if (!order || order.status !== "paid") return false;
    const ts = new Date(order.paid_at || order.created_at).getTime();
    return ts >= from.getTime() && ts <= to.getTime();
  }).length;

  const ticketGoal = Math.max(1, Math.round(Number(raffle.ticketGoal) || 1000));
  const minTicketGoal = MIN_TICKET_GOAL;
  const raffleIds = new Set(
    [raffle.id, "a0000000-0000-4000-8000-000000000001"].filter(Boolean),
  );
  const isRaffleTicket = (raffleId: string) => raffleIds.has(raffleId);
  const ticketsTowardGoal = tickets.filter((t) => {
    if (!isRaffleTicket(t.raffle_id)) return false;
    const order = orders.find((o) => o.id === t.order_id);
    return order?.status === "paid";
  }).length;
  const ticketGoalPct = Math.min(
    100,
    Math.round((ticketsTowardGoal / ticketGoal) * 100),
  );
  const gapToTicketGoal = Math.max(0, ticketGoal - ticketsTowardGoal);
  const minTicketGoalPct = Math.min(
    100,
    Math.round((ticketsTowardGoal / minTicketGoal) * 100),
  );
  const gapToMinTicketGoal = Math.max(0, minTicketGoal - ticketsTowardGoal);

  let cumulativeTickets = tickets.filter((t) => {
    if (!isRaffleTicket(t.raffle_id)) return false;
    const order = orders.find((o) => o.id === t.order_id);
    if (!order || order.status !== "paid") return false;
    const ts = new Date(order.paid_at || order.created_at).getTime();
    return ts < from.getTime();
  }).length;
  const ticketsByDay = new Map<string, number>();
  for (const t of tickets) {
    if (!isRaffleTicket(t.raffle_id)) continue;
    const order = orders.find((o) => o.id === t.order_id);
    if (!order || order.status !== "paid") continue;
    const ts = new Date(order.paid_at || order.created_at);
    if (ts.getTime() < from.getTime() || ts.getTime() > to.getTime()) continue;
    const key = chileDateKey(ts);
    ticketsByDay.set(key, (ticketsByDay.get(key) || 0) + 1);
  }
  const dailyTickets = kpis.series.map((s) => {
    cumulativeTickets += ticketsByDay.get(s.date) || 0;
    return {
      date: s.date,
      label: s.date.slice(5),
      tickets: ticketsByDay.get(s.date) || 0,
      cumulative: cumulativeTickets,
    };
  });

  const avgDailyTickets = Number((ticketsInPeriod / daySpan).toFixed(2));
  const projectedTicketsToEnd =
    ticketsTowardGoal + Math.round(avgDailyTickets * daysLeft);
  const onTrack =
    ticketGoal > 0 ? projectedTicketsToEnd >= ticketGoal : null;
  const onTrackMin =
    minTicketGoal > 0 ? projectedTicketsToEnd >= minTicketGoal : null;

  const revenuePerTicket = ticketsInPeriod
    ? Math.round(revenue / ticketsInPeriod)
    : 0;

  const topPack = packMix[0];
  const packConcentrationPct =
    revenue && topPack ? Math.round((topPack.revenue / revenue) * 100) : 0;

  const affiliateRoi = affiliateStats
    .filter((s) => s.salesClp > 0)
    .map((s) => ({
      code: s.affiliate.code,
      name: s.affiliate.name,
      salesClp: s.salesClp,
      commissionEarnedClp: s.commissionEarnedClp,
      netClp: s.salesClp - s.commissionEarnedClp,
      roiMultiple:
        s.commissionEarnedClp > 0
          ? Number((s.salesClp / s.commissionEarnedClp).toFixed(1))
          : null,
    }))
    .sort((a, b) => b.netClp - a.netClp);

  const channelMix = [
    {
      name: "Sin código de amigo",
      orders: organic.length,
      revenue: organicRevenue,
    },
    {
      name: "Con código de amigo",
      orders: referred.length,
      revenue: referredRevenue,
    },
  ];

  const funnel = [
    { stage: "Iniciaron compra", value: inRange.length },
    { stage: "Ya pagaron", value: paid.length },
    { stage: "Aún no pagan", value: kpis.ordersPending },
    { stage: "No se pudo pagar", value: kpis.ordersFailed },
  ];

  const insights: Insight[] = [];

  if (ticketGoal > 0) {
    if (ticketGoalPct >= 100) {
      insights.push({
        level: "positive",
        title: "Ya alcanzaste la meta del ciclo",
        detail: `Vendiste ${ticketsTowardGoal} tickets de la meta del ciclo (${ticketGoal}). Buena noticia.`,
      });
    } else if (onTrack) {
      insights.push({
        level: "neutral",
        title: "Vas bien encaminado a la meta del ciclo",
        detail: `Llevas ${ticketsTowardGoal} de ${ticketGoal}. Si sigues cerca de ${avgDailyTickets} tickets por día, al cierre podrías llegar a ~${projectedTicketsToEnd}. Aún faltan ${gapToTicketGoal}.`,
      });
    } else {
      insights.push({
        level: "warning",
        title: "Hay que vender más tickets para la meta del ciclo",
        detail: `Quedan ${daysLeft} días. Hoy vendes cerca de ${avgDailyTickets} tickets al día (${ticketsTowardGoal} de ${ticketGoal}). Si no sube, podrías terminar cerca de ${projectedTicketsToEnd}.`,
      });
    }
  }

  if (minTicketGoal > 0) {
    if (minTicketGoalPct >= 100) {
      insights.push({
        level: "positive",
        title: "Ya alcanzaste la meta mínima de 15.000 tickets",
        detail: `Vendiste ${ticketsTowardGoal} tickets. Superaste el piso de ${minTicketGoal.toLocaleString("es-CL")}.`,
      });
    } else if (onTrackMin) {
      insights.push({
        level: "neutral",
        title: "Vas bien hacia la meta mínima de 15.000",
        detail: `Llevas ${ticketsTowardGoal} de ${minTicketGoal.toLocaleString("es-CL")}. Si mantienes el ritmo, al cierre podrías llegar a ~${projectedTicketsToEnd}. Faltan ${gapToMinTicketGoal}.`,
      });
    } else {
      insights.push({
        level: "warning",
        title: "Aún lejos de la meta mínima de 15.000 tickets",
        detail: `Quedan ${daysLeft} días y llevas ${ticketsTowardGoal} de ${minTicketGoal.toLocaleString("es-CL")}. Al ritmo actual (~${avgDailyTickets}/día) podrías terminar cerca de ${projectedTicketsToEnd}.`,
      });
    }
  }

  if (breakEvenClp > 0 && breakEvenPct >= 100) {
    insights.push({
      level: "positive",
      title: `La plata ya cubre ${goal.goalName}`,
      detail: `Con lo cobrado en este período ya cubres el costo estimado de ${goal.goalName} y los gastos (${formatInsightClp(breakEvenClp)}).`,
    });
  } else if (breakEvenClp > 0 && onTrackMoney === false) {
    insights.push({
      level: "neutral",
      title: `Aun así, mira el costo de ${goal.goalName}`,
      detail: `Además de la meta de tickets, para cubrir costos te faltan ${formatInsightClp(gapToBreakEven)} en este período (meta plata: ${formatInsightClp(breakEvenClp)}).`,
    });
  }

  if (conversionPct < 70 && inRange.length >= 5) {
    insights.push({
      level: "warning",
      title: "Mucha gente inicia compra y no termina de pagar",
      detail: `Solo el ${conversionPct}% de los pedidos del período se pagaron. El ${failRatePct}% falló. Conviene revisar si el pago es fácil o si algo se traba.`,
    });
  } else if (conversionPct >= 85 && paid.length >= 3) {
    insights.push({
      level: "positive",
      title: "La gente que compra suele completar el pago",
      detail: `El ${conversionPct}% de los pedidos de este período se pagaron bien.`,
    });
  }

  if (referred.length && commissionsEarned > 0) {
    const costPct =
      Math.round((commissionsEarned / referredRevenue) * 100) || 0;
    insights.push({
      level: costPct > 20 ? "warning" : "neutral",
      title: "Cuánto te cuesta pagar a los afiliados",
      detail: `De lo vendido con código de amigo, cerca del ${costPct}% se va en comisiones (${formatInsightClp(commissionsEarned)} de ${formatInsightClp(referredRevenue)}).`,
    });
  }

  if (packConcentrationPct >= 60 && topPack) {
    insights.push({
      level: "neutral",
      title: "Un pack vende mucho más que los otros",
      detail: `${topPack.name} concentra el ${packConcentrationPct}% del dinero. Si es el que más quieres impulsar, está bien; si no, conviene empujar los otros packs.`,
    });
  }

  if (repeatRatePct >= 20) {
    insights.push({
      level: "positive",
      title: "Hay clientes que vuelven a comprar",
      detail: `El ${repeatRatePct}% de quienes compraron en este período lo hicieron más de una vez.`,
    });
  } else if (customers.length >= 5) {
    insights.push({
      level: "neutral",
      title: "Casi nadie compra dos veces",
      detail: `Solo el ${repeatRatePct}% vuelve a comprar. Podrías invitar por WhatsApp o correo a quienes ya participaron a sumar otro pack.`,
    });
  }

  if (kpis.comparison.revenuePct <= -20) {
    insights.push({
      level: "critical",
      title: "Vendiste bastante menos que antes",
      detail: `Los ingresos bajaron un ${Math.abs(kpis.comparison.revenuePct)}% respecto al período anterior (misma cantidad de días).`,
    });
  } else if (kpis.comparison.revenuePct >= 20) {
    insights.push({
      level: "positive",
      title: "Vendiste más que el período anterior",
      detail: `Los ingresos subieron un ${kpis.comparison.revenuePct}% respecto al período anterior.`,
    });
  }

  return {
    summary: {
      revenueClp: revenue,
      ordersPaid: paid.length,
      ordersTotal: inRange.length,
      avgOrderClp: kpis.avgOrderClp,
      conversionPct,
      failRatePct,
      ticketsIssued: ticketsInPeriod,
      ticketsTowardGoal,
      ticketGoal,
      ticketGoalPct,
      gapToTicketGoal,
      minTicketGoal,
      minTicketGoalPct,
      gapToMinTicketGoal,
      avgDailyTickets,
      projectedTicketsToEnd,
      revenuePerTicket,
      uniqueCustomers: customers.length,
      repeatCustomers,
      repeatRatePct,
      commissionsEarnedClp: commissionsEarned,
      commissionsPaidClp: commissionsPaid,
      netAfterCommissionsClp: netAfterCommissions,
      organicRevenueClp: organicRevenue,
      referredRevenueClp: referredRevenue,
      referralRatePct: kpis.referralRatePct,
      avgDailyRevenueClp: avgDailyRevenue,
      avgDailyOrders,
      daySpan,
      daysLeftToRaffle: daysLeft,
      breakEvenClp,
      breakEvenPct,
      gapToBreakEvenClp: gapToBreakEven,
      projectedToEndClp: projectedToEnd,
      onTrack,
      onTrackMin,
      onTrackMoney,
      comparison: kpis.comparison,
    },
    daily,
    dailyTickets,
    funnel,
    packMix,
    providerMix,
    channelMix,
    affiliateRoi,
    insights,
    goal: {
      type: "tickets" as const,
      ticketGoal,
      minTicketGoal,
      label: `Meta del ciclo: ${ticketGoal.toLocaleString("es-CL")}`,
      minLabel: `Meta mínima: ${minTicketGoal.toLocaleString("es-CL")}`,
      name: `${ticketGoal.toLocaleString("es-CL")} tickets`,
      prizeId: goal.prizeId,
      prizeCostClp: prizeCost,
      opsCostClp: opsCost,
      breakEvenClp,
      moneyLabel: goal.goalLabel,
      moneyName: goal.goalName,
    },
    prizes: goal.prizes,
    raffle: {
      title: raffle.title,
      prizeName: raffle.prizeName,
      endsAt: raffle.endsAt,
      ticketGoal,
      minTicketGoal,
      estimatedPrizeCostClp: prizeCost,
      estimatedOpsCostClp: opsCost,
    },
  };
}

function formatInsightClp(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}
