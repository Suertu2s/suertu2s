import { randomUUID } from "crypto";
import { RAFFLE } from "@/data/packs";
import { assertRaffleAcceptsOrders } from "@/lib/catalog/orders-guard";
import { getPackById } from "@/lib/catalog/store";
import { hashPassword } from "@/lib/security/password";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";
import {
  memoryCreateOrder,
  memoryCreatePayout,
  memoryFindAffiliateByEmail,
  memoryFulfillOrder,
  memoryGetAffiliateById,
  memoryGetOrder,
  memoryGetOrderByPayment,
  memoryGetOrderItems,
  memoryGetOrderTickets,
  memoryListAffiliates,
  memoryListOrderItems,
  memoryListOrders,
  memoryListPayouts,
  memoryListTickets,
  memoryLookupTickets,
  memoryMarkConfirmationEmailSent,
  memoryMarkFailed,
  memorySeedDemoSales,
  memorySetPaymentExternal,
  memoryUpsertAffiliate,
} from "./memory";
import type {
  CheckoutInput,
  CommissionType,
  DbAffiliate,
  DbAffiliatePayout,
  DbOrder,
  DbOrderItem,
  DbTicket,
  OrderStatus,
  PaymentProvider,
} from "./types";

const RAFFLE_UUID = "a0000000-0000-4000-8000-000000000001";

const PACK_UUID: Record<string, string> = {
  "pack-puerto-montt": "b0000000-0000-4000-8000-000000000001",
  "pack-llanquihue": "b0000000-0000-4000-8000-000000000002",
  "pack-chiloe": "b0000000-0000-4000-8000-000000000003",
};

const PACK_ID_BY_UUID: Record<string, string> = Object.fromEntries(
  Object.entries(PACK_UUID).map(([id, uuid]) => [uuid, id]),
);

/**
 * Retorna true si hay una base de datos Supabase configurada.
 */
export function isDbActive(): boolean {
  return isSupabaseConfigured();
}

function mapOrder(row: any): DbOrder {
  return {
    id: String(row.id),
    email: String(row.email),
    full_name: String(row.full_name),
    rut: String(row.rut),
    phone: String(row.phone),
    status: row.status as OrderStatus,
    payment_provider: (row.payment_provider as PaymentProvider) ?? null,
    payment_external_id: row.payment_external_id
      ? String(row.payment_external_id)
      : null,
    total_clp: Number(row.total_clp),
    raffle_id: String(row.raffle_id),
    referral_code: row.referral_code ? String(row.referral_code) : null,
    referral_name: row.referral_name ? String(row.referral_name) : null,
    affiliate_id: row.affiliate_id ? String(row.affiliate_id) : null,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    paid_at: row.paid_at
      ? row.paid_at instanceof Date
        ? row.paid_at.toISOString()
        : String(row.paid_at)
      : null,
    confirmation_email_sent_at: row.confirmation_email_sent_at
      ? row.confirmation_email_sent_at instanceof Date
        ? row.confirmation_email_sent_at.toISOString()
        : String(row.confirmation_email_sent_at)
      : null,
  };
}

function mapOrderItem(row: any): DbOrderItem {
  const rawPackId = String(row.pack_id);
  return {
    id: String(row.id),
    order_id: String(row.order_id),
    // En DB se guarda UUID de packs; en catálogo/UI usamos pack-puerto-montt, etc.
    pack_id: PACK_ID_BY_UUID[rawPackId] || rawPackId,
    quantity: Number(row.quantity),
    unit_price_clp: Number(row.unit_price_clp),
    ticket_count: Number(row.ticket_count),
  };
}

function mapTicket(row: any): DbTicket {
  return {
    id: String(row.id),
    raffle_id: String(row.raffle_id),
    order_id: String(row.order_id),
    number: Number(row.number),
    code: String(row.code),
    email: String(row.email),
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

function mapAffiliate(row: any): DbAffiliate {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    commission_type: row.commission_type as CommissionType,
    commission_value: Number(row.commission_value),
    active: Boolean(row.active),
    notes: row.notes ? String(row.notes) : null,
    password_hash: row.password_hash ? String(row.password_hash) : null,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}

function mapPayout(row: any): DbAffiliatePayout {
  return {
    id: String(row.id),
    affiliate_id: String(row.affiliate_id),
    amount_clp: Number(row.amount_clp),
    period_from:
      row.period_from instanceof Date
        ? row.period_from.toISOString().slice(0, 10)
        : String(row.period_from).slice(0, 10),
    period_to:
      row.period_to instanceof Date
        ? row.period_to.toISOString().slice(0, 10)
        : String(row.period_to).slice(0, 10),
    note: row.note ? String(row.note) : null,
    paid_at:
      row.paid_at instanceof Date
        ? row.paid_at.toISOString()
        : String(row.paid_at),
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

/** Solo asocia un afiliado existente; no crea fichas desde la compra pública. */
async function resolveAffiliateId(code?: string) {
  if (!code?.trim()) {
    return {
      affiliateId: null as string | null,
      code: null as string | null,
    };
  }
  const normalized = code.toUpperCase().trim();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("affiliates")
      .select("id, code")
      .ilike("code", normalized)
      .eq("active", true)
      .maybeSingle();

    if (data) {
      return {
        affiliateId: String(data.id),
        code: String(data.code),
      };
    }
    return { affiliateId: null, code: normalized };
  }

  const { memoryFindAffiliateByCode } = await import("./memory");
  const aff = memoryFindAffiliateByCode(normalized);
  return { affiliateId: aff?.id ?? null, code: normalized };
}

export async function createOrder(input: CheckoutInput) {
  assertRaffleAcceptsOrders();

  let total = 0;
  let ticketTotal = 0;
  const lines: Array<{
    id: string;
    pack_id: string;
    quantity: number;
    unit_price_clp: number;
    ticket_count: number;
  }> = [];

  for (const item of input.items) {
    const pack = getPackById(item.packId);
    if (!pack || item.quantity <= 0)
      throw new Error(`Paquete inválido: ${item.packId}`);
    const packUuid = PACK_UUID[pack.id];
    if (!packUuid) throw new Error(`Paquete no mapeado: ${pack.id}`);
    total += pack.priceClp * item.quantity;
    const tickets = pack.ticketCount * item.quantity;
    ticketTotal += tickets;
    lines.push({
      id: randomUUID(),
      pack_id: packUuid,
      quantity: item.quantity,
      unit_price_clp: pack.priceClp,
      ticket_count: tickets,
    });
  }

  if (!lines.length) throw new Error("Carrito vacío");

  const referral = await resolveAffiliateId(input.referralCode);
  const orderId = randomUUID();
  const createdAt = new Date().toISOString();

  // Supabase Handler
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();

    const { error: orderError } = await supabase.from("orders").insert({
      id: orderId,
      email: input.email.toLowerCase().trim(),
      full_name: input.fullName.trim(),
      rut: input.rut.trim(),
      phone: input.phone.trim(),
      status: "pending",
      payment_provider: input.provider,
      total_clp: total,
      raffle_id: RAFFLE_UUID,
      referral_code: referral.code,
      referral_name: input.referralName?.trim() || null,
      affiliate_id: referral.affiliateId,
      created_at: createdAt,
    });

    if (orderError) {
      throw new Error(`Error al crear orden en Supabase: ${orderError.message}`);
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      lines.map((l) => ({
        id: l.id,
        order_id: orderId,
        pack_id: l.pack_id,
        quantity: l.quantity,
        unit_price_clp: l.unit_price_clp,
        ticket_count: l.ticket_count,
      })),
    );

    if (itemsError) {
      throw new Error(
        `Error al crear items de orden en Supabase: ${itemsError.message}`,
      );
    }

    const createdOrder = await getOrder(orderId);
    if (!createdOrder) {
      throw new Error("No se pudo obtener el pedido creado en Supabase");
    }

    return { order: createdOrder, ticketTotal, items: lines };
  }

  // Memory Fallback
  return memoryCreateOrder(input);
}

export async function getOrder(id: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Error al obtener orden de Supabase: ${error.message}`);
    }
    return data ? mapOrder(data) : null;
  }

  return memoryGetOrder(id);
}

export async function setPaymentExternal(
  orderId: string,
  externalId: string,
  provider: PaymentProvider,
) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("orders")
      .update({
        payment_external_id: externalId,
        payment_provider: provider,
      })
      .eq("id", orderId);

    if (error) {
      throw new Error(
        `Error al actualizar pago externo en Supabase: ${error.message}`,
      );
    }
    const order = await getOrder(orderId);
    if (!order) throw new Error("Pedido no encontrado");
    return order;
  }

  return memorySetPaymentExternal(orderId, externalId, provider);
}

export async function fulfillOrder(orderId: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();

    // 1. Intentar procedimiento atómico PostgreSQL si está disponible
    try {
      const { data, error } = await supabase.rpc(
        "fulfill_order_and_generate_tickets",
        {
          p_order_id: orderId,
        },
      );

      if (!error && data) {
        return {
          order: mapOrder(data.order),
          tickets: (data.tickets || []).map(mapTicket),
          alreadyPaid: Boolean(data.alreadyPaid),
          assignedCodes: data.assignedCodes as string[] | undefined,
        };
      }
    } catch {
      // Continuar con la lógica TypeScript si RPC no está configurado
    }

    // 2. Lógica TypeScript directa con Supabase
    const { data: orderRow, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !orderRow) {
      throw new Error("Pedido no encontrado");
    }

    const order = mapOrder(orderRow);

    if (order.status === "paid") {
      const { data: tickets } = await supabase
        .from("tickets")
        .select("*")
        .eq("order_id", orderId)
        .order("number");

      return {
        order,
        tickets: (tickets || []).map(mapTicket),
        alreadyPaid: true,
      };
    }

    // pending = normal; failed = recuperar si Flow confirmó después (p. ej. return llegó antes que el webhook)
    if (order.status !== "pending" && order.status !== "failed") {
      throw new Error("El pedido no está pendiente de pago");
    }

    const paidAt = new Date().toISOString();

    // Marcar como pagado
    const { error: updateErr } = await supabase
      .from("orders")
      .update({ status: "paid", paid_at: paidAt })
      .eq("id", orderId)
      .in("status", ["pending", "failed"]);

    if (updateErr) {
      throw new Error(`Error al actualizar estado del pedido: ${updateErr.message}`);
    }

    // Comprobar si ya existen tickets
    const { data: existingTickets } = await supabase
      .from("tickets")
      .select("*")
      .eq("order_id", orderId)
      .order("number");

    if (existingTickets && existingTickets.length > 0) {
      return {
        order: { ...order, status: "paid" as const, paid_at: paidAt },
        tickets: existingTickets.map(mapTicket),
        alreadyPaid: false,
      };
    }

    // Obtener ítems
    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    const totalTickets = (items || []).reduce(
      (acc, item) => acc + Number(item.ticket_count),
      0,
    );

    // Obtener sorteo
    const { data: raffleData } = await supabase
      .from("raffles")
      .select("code, ticket_min, ticket_max")
      .eq("id", order.raffle_id)
      .maybeSingle();

    const raffleCode = raffleData?.code || "ST";
    const ticketMin = raffleData?.ticket_min ?? 0;
    const ticketMax = raffleData?.ticket_max ?? 99999;

    const assignedCodes: string[] = [];
    const ticketsToInsert: DbTicket[] = [];

    for (let i = 0; i < totalTickets; i++) {
      let attempts = 0;
      let inserted = false;

      while (!inserted) {
        attempts++;
        if (attempts > 150) {
          throw new Error("No se pudo asignar código único de boleto");
        }

        const suffix =
          Math.floor(Math.random() * (ticketMax - ticketMin + 1)) + ticketMin;
        const ticketCode = raffleCode + String(suffix).padStart(5, "0");
        const ticketId = randomUUID();

        const { error: insertErr } = await supabase.from("tickets").insert({
          id: ticketId,
          raffle_id: order.raffle_id,
          order_id: orderId,
          number: suffix,
          code: ticketCode,
          email: order.email,
        });

        if (!insertErr) {
          assignedCodes.push(ticketCode);
          ticketsToInsert.push({
            id: ticketId,
            raffle_id: order.raffle_id,
            order_id: orderId,
            number: suffix,
            code: ticketCode,
            email: order.email,
            created_at: paidAt,
          });
          inserted = true;
        }
      }
    }

    const { data: finalTickets } = await supabase
      .from("tickets")
      .select("*")
      .eq("order_id", orderId)
      .order("code");

    return {
      order: { ...order, status: "paid" as const, paid_at: paidAt },
      tickets: (finalTickets || ticketsToInsert).map(mapTicket),
      alreadyPaid: false,
      assignedCodes,
    };
  }

  return memoryFulfillOrder(orderId);
}

export async function lookupTicketsByEmail(email: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .ilike("email", email.trim())
      .order("number");

    return (data || []).map(mapTicket);
  }

  return memoryLookupTickets(email);
}

function ensureDemoSeed() {
  if (!isDbActive()) memorySeedDemoSales();
}

export async function listOrders() {
  ensureDemoSeed();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    return (data || []).map(mapOrder);
  }

  return memoryListOrders();
}

export async function listOrderItems() {
  ensureDemoSeed();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from("order_items").select("*").limit(5000);
    return (data || []).map(mapOrderItem);
  }

  return memoryListOrderItems();
}

export async function listTickets() {
  ensureDemoSeed();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .order("number", { ascending: false })
      .limit(5000);

    return (data || []).map(mapTicket);
  }

  return memoryListTickets();
}

export async function getOrderPackIds(orderId: string): Promise<string[]> {
  const detail = await getOrderDetail(orderId);
  if (!detail) return [];
  const ids = new Set<string>();
  for (const item of detail.items) {
    // mapOrderItem ya normaliza UUID → pack-*; por si llega UUID crudo:
    const catalogId = PACK_ID_BY_UUID[item.pack_id] || item.pack_id;
    if (getPackById(catalogId)) {
      ids.add(catalogId);
      continue;
    }
    // Último recurso: coincidencia parcial por id
    for (const [uuid, id] of Object.entries(PACK_ID_BY_UUID)) {
      if (item.pack_id === uuid || item.pack_id.includes(id)) {
        ids.add(id);
      }
    }
  }
  return [...ids];
}

export async function getOrderDetail(orderId: string) {
  ensureDemoSeed();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const [orderRes, itemsRes, ticketsRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", orderId),
      supabase
        .from("tickets")
        .select("*")
        .eq("order_id", orderId)
        .order("number"),
    ]);

    if (!orderRes.data) return null;

    return {
      order: mapOrder(orderRes.data),
      items: (itemsRes.data || []).map(mapOrderItem),
      tickets: (ticketsRes.data || []).map(mapTicket),
    };
  }

  const order = memoryGetOrder(orderId);
  if (!order) return null;
  return {
    order,
    items: memoryGetOrderItems(orderId),
    tickets: memoryGetOrderTickets(orderId),
  };
}

export async function listAffiliates() {
  ensureDemoSeed();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("affiliates")
      .select("*")
      .order("code");

    return (data || []).map(mapAffiliate);
  }

  return memoryListAffiliates();
}

export async function getAffiliateById(id: string) {
  ensureDemoSeed();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("affiliates")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    return data ? mapAffiliate(data) : null;
  }

  return memoryGetAffiliateById(id);
}

export async function findAffiliateByEmail(email: string) {
  ensureDemoSeed();
  const normalized = email.toLowerCase().trim();
  if (!normalized) return null;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("affiliates")
      .select("*")
      .ilike("email", normalized)
      .maybeSingle();

    return data ? mapAffiliate(data) : null;
  }

  return memoryFindAffiliateByEmail(normalized);
}

export async function listPayouts() {
  ensureDemoSeed();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("affiliate_payouts")
      .select("*")
      .order("paid_at", { ascending: false })
      .limit(1000);

    return (data || []).map(mapPayout);
  }

  return memoryListPayouts();
}

export async function createPayout(input: {
  affiliate_id: string;
  amount_clp: number;
  period_from: string;
  period_to: string;
  note?: string | null;
}) {
  const payoutId = randomUUID();
  const paidAt = new Date().toISOString();
  const amount = Math.round(input.amount_clp);
  const from = input.period_from.slice(0, 10);
  const to = input.period_to.slice(0, 10);
  const note = input.note?.trim() || null;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("affiliate_payouts")
      .insert({
        id: payoutId,
        affiliate_id: input.affiliate_id,
        amount_clp: amount,
        period_from: from,
        period_to: to,
        note,
        paid_at: paidAt,
        created_at: paidAt,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Error al crear payout en Supabase: ${error?.message}`);
    }
    return mapPayout(data);
  }

  return memoryCreatePayout(input);
}

export async function upsertAffiliate(
  input: Partial<DbAffiliate> & {
    code: string;
    name: string;
    password?: string;
  },
) {
  const password_hash =
    input.password != null && input.password.length > 0
      ? hashPassword(input.password)
      : input.password_hash;

  const code = input.code.toUpperCase().trim();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from("affiliates")
      .select("id")
      .ilike("code", code)
      .maybeSingle();

    if (existing) {
      const affiliateId = String(existing.id);
      const updatePayload: Record<string, unknown> = {
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        commission_type: input.commission_type ?? "percent",
        commission_value: input.commission_value ?? 10,
        active: input.active ?? true,
        notes: input.notes ?? null,
        updated_at: new Date().toISOString(),
      };

      if (password_hash !== undefined) {
        updatePayload.password_hash = password_hash;
      }

      const { error } = await supabase
        .from("affiliates")
        .update(updatePayload)
        .eq("id", affiliateId);

      if (error) {
        throw new Error(`Error al actualizar afiliado en Supabase: ${error.message}`);
      }

      const updated = await getAffiliateById(affiliateId);
      return updated!;
    } else {
      const affiliateId = randomUUID();
      const now = new Date().toISOString();

      const { error } = await supabase.from("affiliates").insert({
        id: affiliateId,
        code,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        commission_type: input.commission_type ?? "percent",
        commission_value: input.commission_value ?? 10,
        active: input.active ?? true,
        notes: input.notes ?? null,
        password_hash: password_hash ?? null,
        created_at: now,
        updated_at: now,
      });

      if (error) {
        throw new Error(`Error al crear afiliado en Supabase: ${error.message}`);
      }

      const created = await getAffiliateById(affiliateId);
      return created!;
    }
  }

  return memoryUpsertAffiliate({
    ...input,
    password_hash: password_hash !== undefined ? password_hash : undefined,
  });
}

export async function markOrderFailed(orderId: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("id", orderId)
      .eq("status", "pending");
    return getOrder(orderId);
  }

  return memoryMarkFailed(orderId);
}

export async function getOrderByPaymentExternal(externalId: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("payment_external_id", externalId)
      .maybeSingle();

    return data ? mapOrder(data) : null;
  }

  return memoryGetOrderByPayment(externalId);
}

export async function markConfirmationEmailSent(orderId: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("orders")
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq("id", orderId);

    return getOrder(orderId);
  }

  return memoryMarkConfirmationEmailSent(orderId);
}

export function paymentsMockEnabled() {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.PAYMENTS_MOCK === "false") return false;
  if (process.env.PAYMENTS_MOCK === "true") return true;
  return true;
}

export async function getRaffleCycleStats(raffleId: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const [ordersRes, ticketsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("raffle_id", raffleId),
      supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("raffle_id", raffleId),
    ]);

    return {
      ordersCount: ordersRes.count ?? 0,
      ticketsCount: ticketsRes.count ?? 0,
    };
  }

  return {
    ordersCount: memoryListOrders().filter((o) => o.raffle_id === raffleId)
      .length,
    ticketsCount: memoryListTickets().filter((t) => t.raffle_id === raffleId)
      .length,
  };
}

export { RAFFLE, RAFFLE_UUID };
