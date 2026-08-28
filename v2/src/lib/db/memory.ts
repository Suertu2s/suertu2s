import { randomInt, randomUUID } from "crypto";
import { assertRaffleAcceptsOrders } from "@/lib/catalog/orders-guard";
import { getPackById, getPacks, getRaffle } from "@/lib/catalog/store";
import { hashPassword } from "@/lib/security/password";
import {
  TICKET_SUFFIX_MAX,
  formatTicketCode,
  normalizeRaffleCode,
} from "@/lib/tickets/codes";
import type {
  CheckoutInput,
  DbAffiliate,
  DbAffiliateCommission,
  DbAffiliatePayout,
  DbOrder,
  DbOrderItem,
  DbTicket,
  PaymentProvider,
} from "./types";

type Store = {
  orders: DbOrder[];
  items: DbOrderItem[];
  tickets: DbTicket[];
  affiliates: DbAffiliate[];
  commissions: DbAffiliateCommission[];
  payouts: DbAffiliatePayout[];
  demoSeeded: boolean;
};

const globalStore = globalThis as unknown as { __suertuStore?: Store };

function demoAffiliatePassword() {
  return process.env.AFFILIATE_DEMO_PASSWORD || "afiliado-demo";
}

function seedAffiliates(): DbAffiliate[] {
  return [];
}

function store(): Store {
  if (!globalStore.__suertuStore) {
    globalStore.__suertuStore = {
      orders: [],
      items: [],
      tickets: [],
      affiliates: seedAffiliates(),
      commissions: [],
      payouts: [],
      demoSeeded: false,
    };
  }

  const s = globalStore.__suertuStore as Store;
  if (!Array.isArray(s.affiliates)) s.affiliates = seedAffiliates();
  if (!Array.isArray(s.commissions)) s.commissions = [];
  if (!Array.isArray(s.orders)) s.orders = [];
  if (!Array.isArray(s.items)) s.items = [];
  if (!Array.isArray(s.tickets)) s.tickets = [];
  if (!Array.isArray(s.payouts)) s.payouts = [];
  if (typeof s.demoSeeded !== "boolean") {
    s.demoSeeded = s.orders.some((o) => o.email.startsWith("demo+"));
  }
  // Backfill códigos en tickets viejos en memoria
  const raffleCode = normalizeRaffleCode(getRaffle().code);
  for (const t of s.tickets) {
    if (!t.code) {
      t.code = formatTicketCode(raffleCode, t.number);
    }
  }
  // Stores en memoria sin password_hash (recargas en desarrollo)
  for (const a of s.affiliates) {
    if (a.password_hash === undefined) {
      a.password_hash = null;
    }
    if (!a.password_hash && (a.code === "STJP48" || a.code === "DEMO01")) {
      a.password_hash = hashPassword(demoAffiliatePassword());
    }
  }

  return s;
}

export function memoryFindAffiliateByCode(code: string) {
  const normalized = code.toUpperCase().trim();
  return (
    store().affiliates.find(
      (a) => a.active && a.code.toUpperCase() === normalized,
    ) ?? null
  );
}

export function memoryEnsureAffiliate(code: string, name?: string) {
  const existing = memoryFindAffiliateByCode(code);
  if (existing) return existing;
  const now = new Date().toISOString();
  const affiliate: DbAffiliate = {
    id: randomUUID(),
    code: code.toUpperCase().trim(),
    name: name?.trim() || code.toUpperCase().trim(),
    email: null,
    phone: null,
    commission_type: "percent",
    commission_value: 10,
    active: true,
    notes: "Creado automáticamente al usarse en una compra",
    password_hash: null,
    referred_by_affiliate_id: null,
    invitation_status: "active",
    invite_token_hash: null,
    invite_expires_at: null,
    created_at: now,
    updated_at: now,
  };
  store().affiliates.push(affiliate);
  return affiliate;
}

export function memoryListAffiliates() {
  return [...store().affiliates].sort((a, b) => a.code.localeCompare(b.code));
}

export function memoryUpsertAffiliate(
  input: Partial<DbAffiliate> & {
    code: string;
    name: string;
    password_hash?: string | null;
  },
) {
  const s = store();
  const code = input.code.toUpperCase().trim();
  const existing = s.affiliates.find((a) => a.code.toUpperCase() === code);
  const now = new Date().toISOString();

  if (existing) {
    existing.name = input.name;
    existing.email = input.email ?? existing.email;
    existing.phone = input.phone ?? existing.phone;
    existing.commission_type =
      input.commission_type ?? existing.commission_type;
    existing.commission_value =
      input.commission_value ?? existing.commission_value;
    existing.active = input.active ?? existing.active;
    existing.notes = input.notes ?? existing.notes;
    existing.referred_by_affiliate_id =
      input.referred_by_affiliate_id ?? existing.referred_by_affiliate_id;
    existing.invitation_status =
      input.invitation_status ?? existing.invitation_status;
    existing.invite_token_hash =
      input.invite_token_hash ?? existing.invite_token_hash;
    existing.invite_expires_at =
      input.invite_expires_at ?? existing.invite_expires_at;
    if (input.password_hash !== undefined) {
      existing.password_hash = input.password_hash;
    }
    existing.updated_at = now;
    return existing;
  }

  const created: DbAffiliate = {
    id: randomUUID(),
    code,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    commission_type: input.commission_type ?? "percent",
    commission_value: input.commission_value ?? 10,
    active: input.active ?? true,
    notes: input.notes ?? null,
    password_hash: input.password_hash ?? null,
    referred_by_affiliate_id: input.referred_by_affiliate_id ?? null,
    invitation_status: input.invitation_status ?? "active",
    invite_token_hash: input.invite_token_hash ?? null,
    invite_expires_at: input.invite_expires_at ?? null,
    created_at: now,
    updated_at: now,
  };
  s.affiliates.push(created);
  return created;
}

export function memoryGetAffiliateById(id: string) {
  return store().affiliates.find((a) => a.id === id) ?? null;
}

export function memoryFindAffiliateByEmail(email: string) {
  const normalized = email.toLowerCase().trim();
  return (
    store().affiliates.find(
      (a) => a.email && a.email.toLowerCase() === normalized,
    ) ?? null
  );
}

export function memoryCreateOrder(input: CheckoutInput) {
  assertRaffleAcceptsOrders();

  let total = 0;
  let ticketTotal = 0;
  const lineItems: DbOrderItem[] = [];

  for (const item of input.items) {
    const pack = getPackById(item.packId);
    if (!pack || item.quantity <= 0) {
      throw new Error(`Paquete inválido: ${item.packId}`);
    }
    total += pack.priceClp * item.quantity;
    ticketTotal += pack.ticketCount * item.quantity;
    lineItems.push({
      id: randomUUID(),
      order_id: "",
      pack_id: pack.id,
      quantity: item.quantity,
      unit_price_clp: pack.priceClp,
      ticket_count: pack.ticketCount * item.quantity,
    });
  }

  if (!lineItems.length) throw new Error("Carrito vacío");

  let affiliateId: string | null = null;
  let referralCode: string | null = null;
  if (input.referralCode?.trim()) {
    referralCode = input.referralCode.toUpperCase().trim();
    const aff = memoryFindAffiliateByCode(referralCode);
    affiliateId = aff?.id ?? null;
  }

  const order: DbOrder = {
    id: randomUUID(),
    email: input.email.toLowerCase().trim(),
    full_name: input.fullName.trim(),
    rut: input.rut.trim(),
    phone: input.phone.trim(),
    status: "pending",
    payment_provider: input.provider,
    payment_external_id: null,
    is_test: input.provider === "mock",
    total_clp: total,
    raffle_id: getRaffle().id,
    referral_code: referralCode,
    referral_name: input.referralName?.trim() || null,
    affiliate_id: affiliateId,
    created_at: new Date().toISOString(),
    paid_at: null,
    confirmation_email_sent_at: null,
  };

  lineItems.forEach((li) => {
    li.order_id = order.id;
  });

  store().orders.push(order);
  store().items.push(...lineItems);

  return { order, ticketTotal, items: lineItems };
}

export function memoryMarkConfirmationEmailSent(orderId: string) {
  const order = memoryGetOrder(orderId);
  if (!order) return null;
  order.confirmation_email_sent_at = new Date().toISOString();
  return order;
}

export function memoryGetOrder(id: string) {
  const order = store().orders.find((o) => o.id === id) ?? null;
  if (order && order.confirmation_email_sent_at === undefined) {
    order.confirmation_email_sent_at = null;
  }
  return order;
}

export function memoryGetOrderByPayment(externalId: string) {
  return (
    store().orders.find((o) => o.payment_external_id === externalId) ?? null
  );
}

export function memoryGetOrderItems(orderId: string) {
  return store().items.filter((i) => i.order_id === orderId);
}

export function memoryGetOrderTickets(orderId: string) {
  return store()
    .tickets.filter((t) => t.order_id === orderId)
    .sort((a, b) => a.number - b.number);
}

export function memoryListOrderItems() {
  return [...store().items];
}

export function memoryListTickets() {
  return [...store().tickets].sort((a, b) => b.number - a.number);
}

export function memoryListOrders() {
  return [...store().orders].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );
}

export function memoryListPayouts() {
  return [...store().payouts].sort(
    (a, b) => +new Date(b.paid_at) - +new Date(a.paid_at),
  );
}

export function memoryListCommissions() {
  return [...store().commissions].sort(
    (a, b) => +new Date(a.created_at) - +new Date(b.created_at),
  );
}

export function memoryEnsureOrderCommissions(
  entries: Array<Omit<DbAffiliateCommission, "id">>,
) {
  const s = store();
  for (const entry of entries) {
    const existing = s.commissions.find(
      (commission) =>
        commission.order_id === entry.order_id &&
        commission.affiliate_id === entry.affiliate_id &&
        commission.kind === entry.kind,
    );
    if (existing) continue;
    s.commissions.push({ ...entry, id: randomUUID() });
  }
  return s.commissions.filter((commission) =>
    entries.some(
      (entry) =>
        entry.order_id === commission.order_id &&
        entry.affiliate_id === commission.affiliate_id,
    ),
  );
}

export function memoryAllocateCommissionsToPayout(
  affiliateId: string,
  payoutId: string,
  amount: number,
) {
  let remaining = Math.round(amount);
  for (const commission of memoryListCommissions()) {
    if (
      remaining <= 0 ||
      commission.affiliate_id !== affiliateId ||
      commission.status !== "pending"
    ) {
      continue;
    }
    if (commission.amount_clp > remaining) continue;
    commission.status = "paid";
    commission.payout_id = payoutId;
    remaining -= commission.amount_clp;
  }
}

export function memoryCreatePayout(input: {
  affiliate_id: string;
  amount_clp: number;
  period_from: string;
  period_to: string;
  note?: string | null;
  paid_at?: string;
}) {
  const affiliate = store().affiliates.find((a) => a.id === input.affiliate_id);
  if (!affiliate) throw new Error("Afiliado no encontrado");
  if (input.amount_clp <= 0) throw new Error("Monto inválido");

  const now = new Date().toISOString();
  const payout: DbAffiliatePayout = {
    id: randomUUID(),
    affiliate_id: input.affiliate_id,
    amount_clp: Math.round(input.amount_clp),
    period_from: input.period_from.slice(0, 10),
    period_to: input.period_to.slice(0, 10),
    note: input.note?.trim() || null,
    paid_at: input.paid_at || now,
    created_at: now,
  };
  store().payouts.push(payout);
  return payout;
}

export function memorySetPaymentExternal(
  orderId: string,
  externalId: string,
  provider: PaymentProvider,
) {
  const order = memoryGetOrder(orderId);
  if (!order) return null;
  order.payment_external_id = externalId;
  order.payment_provider = provider;
  return order;
}

function allocateRandomTickets(
  order: DbOrder,
  count: number,
  createdAt?: string,
): DbTicket[] {
  const s = store();
  const raffleCode = normalizeRaffleCode(getRaffle().code);
  const used = new Set(
    s.tickets
      .filter((t) => t.raffle_id === order.raffle_id)
      .map((t) => t.number),
  );

  if (used.size + count > TICKET_SUFFIX_MAX) {
    throw new Error("No quedan códigos disponibles para este sorteo");
  }

  const tickets: DbTicket[] = [];
  for (let i = 0; i < count; i++) {
    let suffix = -1;
    for (let attempt = 0; attempt < 80; attempt++) {
      const candidate = randomInt(0, TICKET_SUFFIX_MAX);
      if (!used.has(candidate)) {
        suffix = candidate;
        break;
      }
    }
    if (suffix < 0) {
      throw new Error("No se pudo generar un código único");
    }
    used.add(suffix);
    const ticket: DbTicket = {
      id: randomUUID(),
      raffle_id: order.raffle_id,
      order_id: order.id,
      number: suffix,
      code: formatTicketCode(raffleCode, suffix),
      email: order.email,
      created_at: createdAt || new Date().toISOString(),
    };
    s.tickets.push(ticket);
    tickets.push(ticket);
  }
  return tickets;
}

export function memoryFulfillOrder(orderId: string) {
  const s = store();
  const order = s.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("Pedido no encontrado");
  if (order.status === "paid") {
    const existing = s.tickets.filter((t) => t.order_id === orderId);
    return { order, tickets: existing, alreadyPaid: true };
  }
  if (order.status !== "pending" && order.status !== "failed") {
    throw new Error("El pedido no está pendiente de pago");
  }

  const items = s.items.filter((i) => i.order_id === orderId);
  const count = items.reduce((acc, i) => acc + i.ticket_count, 0);
  const existing = s.tickets.filter((t) => t.order_id === orderId);
  const tickets =
    existing.length > 0 ? existing : allocateRandomTickets(order, count);

  order.status = "paid";
  order.paid_at = new Date().toISOString();
  return { order, tickets, alreadyPaid: false };
}

export function memoryLookupTickets(email: string) {
  const normalized = email.toLowerCase().trim();
  return store()
    .tickets.filter((t) => t.email === normalized)
    .sort((a, b) => a.number - b.number);
}

export function memoryMarkFailed(orderId: string) {
  const order = memoryGetOrder(orderId);
  if (order && order.status === "pending") {
    order.status = "failed";
  }
  return order;
}

function packForTotal(total: number) {
  const packs = getPacks();
  if (total >= 15000 && packs.length >= 3) {
    return [
      {
        pack: packs.find((p) => p.id === "pack-chiloe") || packs[2],
        quantity: 1,
      },
      {
        pack: packs.find((p) => p.id === "pack-puerto-montt") || packs[0],
        quantity: 1,
      },
    ];
  }
  const pack = packs.find((p) => p.priceClp === total) || packs[0];
  return [{ pack, quantity: 1 }];
}

/** Pedidos de demostración para previsualizar el admin (desactivado para producción y tests limpios). */
export function memorySeedDemoSales() {
  // No-op: base de datos y memoria inician limpias
}
