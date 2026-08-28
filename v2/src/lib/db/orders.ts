import { randomUUID } from "crypto";
import { RAFFLE } from "@/data/packs";
import { assertRaffleAcceptsOrders } from "@/lib/catalog/orders-guard";
import { getPackById, getRaffle } from "@/lib/catalog/store";
import { hashPassword } from "@/lib/security/password";
import { calculateCommissionEntries } from "@/lib/affiliate/commission-engine";
import {
  hashAffiliateInviteToken,
  isAffiliateInviteExpired,
} from "@/lib/affiliate/invite";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";
import {
  memoryCreateOrder,
  memoryCreatePayout,
  memoryEnsureOrderCommissions,
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
  memoryListCommissions,
  memoryListPayouts,
  memoryListTickets,
  memoryLookupTickets,
  memoryMarkConfirmationEmailSent,
  memoryMarkFailed,
  memorySeedDemoSales,
  memorySetPaymentExternal,
  memoryUpsertAffiliate,
  memoryAllocateCommissionsToPayout,
} from "./memory";
import type {
  CheckoutInput,
  CommissionType,
  DbAffiliate,
  DbAffiliateCommission,
  DbAffiliatePayout,
  DbOrder,
  DbOrderItem,
  DbTicket,
  OrderStatus,
  PaymentProvider,
} from "./types";

const RAFFLE_UUID = "a0000000-0000-4000-8000-000000000001";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

type DbRow = Record<string, unknown>;

function mapOrder(row: DbRow): DbOrder {
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
    is_test: Boolean(row.is_test),
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

function mapOrderItem(row: DbRow): DbOrderItem {
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

function mapTicket(row: DbRow): DbTicket {
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

function mapAffiliate(row: DbRow): DbAffiliate {
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
    referred_by_affiliate_id: row.referred_by_affiliate_id
      ? String(row.referred_by_affiliate_id)
      : null,
    invitation_status:
      row.invitation_status === "pending" ? "pending" : "active",
    invite_token_hash: row.invite_token_hash
      ? String(row.invite_token_hash)
      : null,
    invite_expires_at: row.invite_expires_at
      ? row.invite_expires_at instanceof Date
        ? row.invite_expires_at.toISOString()
        : String(row.invite_expires_at)
      : null,
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

function mapCommission(row: DbRow): DbAffiliateCommission {
  return {
    id: String(row.id),
    order_id: String(row.order_id),
    affiliate_id: String(row.affiliate_id),
    kind: row.kind === "direct_referral" ? "direct_referral" : "seller",
    rate_percent: Number(row.rate_percent),
    base_clp: Number(row.base_clp),
    amount_clp: Number(row.amount_clp),
    direct_tickets_before: Number(row.direct_tickets_before || 0),
    status:
      row.status === "paid" || row.status === "reversed"
        ? row.status
        : "pending",
    payout_id: row.payout_id ? String(row.payout_id) : null,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

function mapPayout(row: DbRow): DbAffiliatePayout {
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
      valid: true as boolean,
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
        valid: true,
      };
    }
    return { affiliateId: null, code: normalized, valid: false };
  }

  const { memoryFindAffiliateByCode } = await import("./memory");
  const aff = memoryFindAffiliateByCode(normalized);
  return {
    affiliateId: aff?.id ?? null,
    code: normalized,
    valid: Boolean(aff),
  };
}

/** Busca afiliado activo por nombre (coincidencia parcial). */
async function resolveAffiliateByName(name?: string) {
  if (!name?.trim()) {
    return {
      affiliateId: null as string | null,
      code: null as string | null,
      valid: true as boolean,
    };
  }
  const query = name.trim();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("affiliates")
      .select("id, code, name")
      .eq("active", true)
      .ilike("name", `%${query}%`)
      .limit(2);

    if (!data?.length) {
      return { affiliateId: null, code: null, valid: false };
    }
    if (data.length > 1) {
      return {
        affiliateId: null,
        code: null,
        valid: false,
        ambiguous: true as const,
      };
    }
    return {
      affiliateId: String(data[0].id),
      code: String(data[0].code),
      valid: true,
    };
  }

  const affiliates = await listAffiliates();
  const matches = affiliates.filter(
    (a) => a.active && a.name.toLowerCase().includes(query.toLowerCase()),
  );
  if (matches.length !== 1) {
    return {
      affiliateId: null,
      code: null,
      valid: false,
      ambiguous: matches.length > 1,
    };
  }
  return {
    affiliateId: matches[0].id,
    code: matches[0].code,
    valid: true,
  };
}

export async function validateReferralCode(code: string) {
  const result = await resolveAffiliateId(code);
  return { valid: result.valid, code: result.code };
}

export async function searchAffiliatesByName(name: string) {
  const query = name.trim();
  if (!query || query.length < 2) return [];

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("affiliates")
      .select("id, code, name")
      .eq("active", true)
      .ilike("name", `%${query}%`)
      .order("name")
      .limit(8);
    return (data || []).map((row) => ({
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
    }));
  }

  const affiliates = await listAffiliates();
  return affiliates
    .filter(
      (a) => a.active && a.name.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 8)
    .map((a) => ({ id: a.id, code: a.code, name: a.name }));
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

  let referral = await resolveAffiliateId(input.referralCode);
  if (!input.referralCode?.trim() && input.referralName?.trim()) {
    const byName = await resolveAffiliateByName(input.referralName);
    if (byName.valid && byName.code) {
      referral = {
        affiliateId: byName.affiliateId,
        code: byName.code,
        valid: true,
      };
    } else if (!byName.valid) {
      throw new Error(
        byName.ambiguous
          ? "Hay varios embajadores con ese nombre. Usa el código exacto."
          : "No encontramos un embajador con ese nombre.",
      );
    }
  } else if (input.referralCode?.trim() && !referral.valid) {
    throw new Error("El código de embajador no es válido o está inactivo.");
  }

  const activeRaffleId = getRaffle().id;
  const raffleUuid = UUID_REGEX.test(activeRaffleId)
    ? activeRaffleId
    : RAFFLE_UUID;
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
      is_test: input.provider === "mock",
      total_clp: total,
      raffle_id: raffleUuid,
      referral_code: referral.code,
      referral_name: input.referralName?.trim() || null,
      affiliate_id: referral.affiliateId,
      created_at: createdAt,
    });

    if (orderError) {
      throw new Error(
        `Error al crear orden en Supabase: ${orderError.message}`,
      );
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
        await ensureOrderCommissionsSafely(orderId);
        return {
          order: mapOrder(data.order),
          tickets: (data.tickets || []).map(mapTicket),
          alreadyPaid: Boolean(data.alreadyPaid),
          assignedCodes: data.assignedCodes as string[] | undefined,
        };
      }

      if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
        throw new Error(
          error?.message ||
            "RPC fulfill_order_and_generate_tickets no disponible — ejecuta supabase_security_migration.sql",
        );
      }
    } catch (rpcErr) {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
        throw rpcErr instanceof Error ? rpcErr : new Error(String(rpcErr));
      }
      // Sin service role (dev local): continuar con fallback TS
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

      await ensureOrderCommissionsSafely(orderId);
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
      throw new Error(
        `Error al actualizar estado del pedido: ${updateErr.message}`,
      );
    }

    // Comprobar si ya existen tickets
    const { data: existingTickets } = await supabase
      .from("tickets")
      .select("*")
      .eq("order_id", orderId)
      .order("number");

    if (existingTickets && existingTickets.length > 0) {
      await ensureOrderCommissionsSafely(orderId);
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

  const fulfilled = memoryFulfillOrder(orderId);
  await ensureOrderCommissionsSafely(orderId);
  return fulfilled;
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

export async function hasPaidTicketsForEmail(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { count } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .ilike("email", normalized);
    return (count ?? 0) > 0;
  }

  return memoryLookupTickets(email).length > 0;
}

export type RecentPurchaseRow = {
  orderId: string;
  fullName: string;
  paidAt: string;
  packId: string;
  ticketCount: number;
};

export async function listRecentPaidPurchases(
  limit = 12,
): Promise<RecentPurchaseRow[]> {
  ensureDemoSeed();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: orders } = await supabase
      .from("orders")
      .select("id, full_name, paid_at, order_items(pack_id, ticket_count)")
      .eq("status", "paid")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(limit);

    const rows: RecentPurchaseRow[] = [];
    for (const row of orders || []) {
      const items = (row.order_items || []) as Array<{
        pack_id: string;
        ticket_count: number;
      }>;
      const primary = items[0];
      if (!primary || !row.paid_at) continue;
      const catalogId = PACK_ID_BY_UUID[primary.pack_id] || primary.pack_id;
      rows.push({
        orderId: String(row.id),
        fullName: String(row.full_name || "Comprador"),
        paidAt: String(row.paid_at),
        packId: catalogId,
        ticketCount: Number(primary.ticket_count) || 1,
      });
    }
    return rows;
  }

  return memoryListOrders()
    .filter((o) => o.status === "paid" && o.paid_at)
    .sort((a, b) => (b.paid_at || "").localeCompare(a.paid_at || ""))
    .slice(0, limit)
    .map((o) => ({
      orderId: o.id,
      fullName: o.full_name,
      paidAt: o.paid_at!,
      packId: "pack-chiloe",
      ticketCount: 1,
    }));
}

export async function listOrdersByAffiliate(affiliateId: string) {
  ensureDemoSeed();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false });
    return (data || []).map(mapOrder);
  }

  return memoryListOrders().filter((o) => o.affiliate_id === affiliateId);
}

function ensureDemoSeed() {
  if (!isDbActive()) memorySeedDemoSales();
}

async function fetchAllRows<T>(
  table: string,
  select: string,
  orderCol: string,
  ascending = false,
): Promise<T[]> {
  const supabase = getSupabaseAdmin();
  const pageSize = 1000;
  const all: T[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(orderCol, { ascending })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Error al listar ${table}: ${error.message}`);
    }

    const batch = (data || []) as T[];
    all.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

export async function listOrders() {
  ensureDemoSeed();

  if (isSupabaseConfigured()) {
    const data = await fetchAllRows<Record<string, unknown>>(
      "orders",
      "*",
      "created_at",
      false,
    );
    return data.map(mapOrder);
  }

  return memoryListOrders();
}

export async function listOrderItems() {
  ensureDemoSeed();

  if (isSupabaseConfigured()) {
    const data = await fetchAllRows<Record<string, unknown>>(
      "order_items",
      "*",
      "id",
      true,
    );
    return data.map(mapOrderItem);
  }

  return memoryListOrderItems();
}

export async function listTickets() {
  ensureDemoSeed();

  if (isSupabaseConfigured()) {
    const data = await fetchAllRows<Record<string, unknown>>(
      "tickets",
      "*",
      "number",
      false,
    );
    return data.map(mapTicket);
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

export async function listCommissions() {
  ensureDemoSeed();

  if (isSupabaseConfigured()) {
    try {
      const data = await fetchAllRows<Record<string, unknown>>(
        "affiliate_commissions",
        "*",
        "created_at",
        true,
      );
      return data.map(mapCommission);
    } catch (error) {
      // Permite que la app siga funcionando mientras se ejecuta la migración
      // comercial en Supabase; el trigger SQL será la fuente definitiva.
      if (String(error).includes("affiliate_commissions")) return [];
      throw error;
    }
  }

  return memoryListCommissions();
}

/**
 * Garantiza la comisión para pedidos pagados creados antes de instalar el
 * trigger SQL o para el fallback local. Las restricciones únicas hacen que
 * webhook, retorno y reintentos sean idempotentes.
 */
export async function ensureOrderCommissions(orderId: string) {
  const detail = await getOrderDetail(orderId);
  if (
    !detail ||
    detail.order.status !== "paid" ||
    detail.order.is_test ||
    !detail.tickets.length
  ) {
    return [];
  }

  const seller = detail.order.affiliate_id
    ? await getAffiliateById(detail.order.affiliate_id)
    : null;
  if (!seller) return [];

  const [affiliates, orders, tickets, existing] = await Promise.all([
    listAffiliates(),
    listOrders(),
    listTickets(),
    listCommissions(),
  ]);
  const directTicketsBefore = tickets.filter((ticket) => {
    if (ticket.order_id === orderId) return false;
    const sourceOrder = orders.find((order) => order.id === ticket.order_id);
    return (
      sourceOrder?.status === "paid" &&
      !sourceOrder.is_test &&
      sourceOrder.affiliate_id === seller.id
    );
  }).length;
  const directReferrer = seller.referred_by_affiliate_id
    ? affiliates.find(
        (affiliate) =>
          affiliate.id === seller.referred_by_affiliate_id && affiliate.active,
      )
    : null;
  const entries = calculateCommissionEntries({
    order: detail.order,
    seller,
    directReferrer,
    directTicketsBefore,
    createdAt: detail.order.paid_at || detail.order.created_at,
  });
  const missing = entries.filter(
    (entry) =>
      !existing.some(
        (commission) =>
          commission.order_id === entry.order_id &&
          commission.affiliate_id === entry.affiliate_id &&
          commission.kind === entry.kind,
      ),
  );
  if (!missing.length) {
    return existing.filter((commission) => commission.order_id === orderId);
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("affiliate_commissions").upsert(
      missing.map((entry) => ({
        id: randomUUID(),
        ...entry,
      })),
      { onConflict: "order_id,affiliate_id,kind", ignoreDuplicates: true },
    );
    if (error) {
      throw new Error(
        `Error al registrar comisiones en Supabase: ${error.message}`,
      );
    }
    return (await listCommissions()).filter(
      (commission) => commission.order_id === orderId,
    );
  }

  return memoryEnsureOrderCommissions(
    missing.map((entry) => ({ id: randomUUID(), ...entry })),
  );
}

async function ensureOrderCommissionsSafely(orderId: string) {
  try {
    return await ensureOrderCommissions(orderId);
  } catch (error) {
    if (String(error).includes("affiliate_commissions")) return [];
    throw error;
  }
}

async function allocateCommissionsToPayout(
  affiliateId: string,
  payoutId: string,
  amount: number,
) {
  const commissions = (await listCommissions())
    .filter(
      (commission) =>
        commission.affiliate_id === affiliateId &&
        commission.status === "pending",
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const selected = selectCommissionsForPayout(commissions, amount);
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    for (const commission of selected) {
      const { error } = await supabase
        .from("affiliate_commissions")
        .update({ status: "paid", payout_id: payoutId })
        .eq("id", commission.id)
        .eq("status", "pending");
      if (error)
        throw new Error(`Error al asignar comisión pagada: ${error.message}`);
    }
  } else {
    memoryAllocateCommissionsToPayout(affiliateId, payoutId, amount);
  }
}

function selectCommissionsForPayout(
  commissions: DbAffiliateCommission[],
  amount: number,
) {
  const requested = Math.round(amount);
  if (requested <= 0) throw new Error("Monto inválido");
  const available = commissions.reduce(
    (total, commission) => total + commission.amount_clp,
    0,
  );
  if (requested > available) {
    throw new Error(
      `El pago supera el saldo disponible (${available.toLocaleString("es-CL")})`,
    );
  }

  let remaining = requested;
  const selected: DbAffiliateCommission[] = [];
  for (const commission of commissions) {
    if (remaining <= 0) break;
    if (commission.amount_clp <= remaining) {
      selected.push(commission);
      remaining -= commission.amount_clp;
    }
  }
  if (remaining !== 0) {
    throw new Error(
      "El monto debe coincidir con una o más comisiones completas pendientes.",
    );
  }
  return selected;
}

const memoryPayoutLocks = new Map<string, Promise<void>>();

async function withMemoryPayoutLock<T>(
  affiliateId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = memoryPayoutLocks.get(affiliateId) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  memoryPayoutLocks.set(affiliateId, current);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (memoryPayoutLocks.get(affiliateId) === current) {
      memoryPayoutLocks.delete(affiliateId);
    }
  }
}

export async function createPayout(input: {
  affiliate_id: string;
  amount_clp: number;
  period_from: string;
  period_to: string;
  note?: string | null;
}) {
  const amount = Math.round(input.amount_clp);
  const from = input.period_from.slice(0, 10);
  const to = input.period_to.slice(0, 10);
  const note = input.note?.trim() || null;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc(
      "create_affiliate_payout_atomic",
      {
        p_affiliate_id: input.affiliate_id,
        p_amount_clp: amount,
        p_period_from: from,
        p_period_to: to,
        p_note: note,
      },
    );
    if (error || !data?.payout) {
      throw new Error(
        `Error al crear liquidación atómica: ${
          error?.message || "respuesta inválida del servidor"
        }`,
      );
    }
    return mapPayout(data.payout);
  }

  return withMemoryPayoutLock(input.affiliate_id, async () => {
    const pendingCommissions = (await listCommissions())
      .filter(
        (commission) =>
          commission.affiliate_id === input.affiliate_id &&
          commission.status === "pending",
      )
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    selectCommissionsForPayout(pendingCommissions, amount);
    const payout = memoryCreatePayout(input);
    await allocateCommissionsToPayout(
      input.affiliate_id,
      payout.id,
      payout.amount_clp,
    );
    return payout;
  });
}

export async function registerAffiliateFromInvite(input: {
  invitationToken: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  const tokenHash = hashAffiliateInviteToken(input.invitationToken);
  const passwordHash = hashPassword(input.password);
  const code = input.code.toUpperCase().trim();
  const email = input.email.toLowerCase().trim();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc(
      "register_affiliate_from_invite",
      {
        p_token_hash: tokenHash,
        p_code: code,
        p_name: input.name.trim(),
        p_email: email,
        p_phone: input.phone.trim(),
        p_password_hash: passwordHash,
      },
    );
    if (error || !data?.id) {
      throw new Error(
        error?.message || "No se pudo completar el registro de afiliado",
      );
    }
    const created = await getAffiliateById(String(data.id));
    if (!created) throw new Error("No se pudo obtener el afiliado creado");
    return created;
  }

  const affiliates = memoryListAffiliates();
  const inviter = affiliates.find(
    (affiliate) =>
      affiliate.invite_token_hash === tokenHash &&
      affiliate.active &&
      !isAffiliateInviteExpired(affiliate.invite_expires_at),
  );
  if (!inviter)
    throw new Error("El enlace de invitación no es válido o expiró.");
  if (
    affiliates.some((affiliate) => affiliate.email?.toLowerCase() === email)
  ) {
    throw new Error("Ese correo ya está registrado como colaborador.");
  }
  if (affiliates.some((affiliate) => affiliate.code.toUpperCase() === code)) {
    throw new Error("El código generado ya existe. Intenta nuevamente.");
  }

  // El consumo ocurre antes de crear la cuenta: dos solicitudes concurrentes
  // no pueden reutilizar el mismo token en el fallback local.
  inviter.invite_token_hash = null;
  inviter.invite_expires_at = null;
  return memoryUpsertAffiliate({
    code,
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
    password_hash: passwordHash,
    commission_type: "percent",
    commission_value: 10,
    active: true,
    invitation_status: "active",
    referred_by_affiliate_id: inviter.id,
    notes: `Invitado por ${inviter.name} (${inviter.code})`,
  });
}

export async function upsertAffiliate(
  input: Partial<DbAffiliate> & {
    code: string;
    name: string;
    password?: string;
    createOnly?: boolean;
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
      if (input.createOnly) {
        throw new Error("El código de afiliado ya existe.");
      }
      const affiliateId = String(existing.id);
      const updatePayload: Record<string, unknown> = {
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        commission_type: input.commission_type ?? "percent",
        commission_value: input.commission_value ?? 10,
        active: input.active ?? true,
        notes: input.notes ?? null,
        referred_by_affiliate_id: input.referred_by_affiliate_id ?? null,
        invitation_status: input.invitation_status ?? "active",
        invite_token_hash: input.invite_token_hash ?? null,
        invite_expires_at: input.invite_expires_at ?? null,
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
        throw new Error(
          `Error al actualizar afiliado en Supabase: ${error.message}`,
        );
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
        referred_by_affiliate_id: input.referred_by_affiliate_id ?? null,
        invitation_status: input.invitation_status ?? "active",
        invite_token_hash: input.invite_token_hash ?? null,
        invite_expires_at: input.invite_expires_at ?? null,
        created_at: now,
        updated_at: now,
      });

      if (error) {
        throw new Error(
          `Error al crear afiliado en Supabase: ${error.message}`,
        );
      }

      const created = await getAffiliateById(affiliateId);
      return created!;
    }
  }

  if (
    input.createOnly &&
    memoryListAffiliates().some(
      (affiliate) => affiliate.code.toUpperCase() === code,
    )
  ) {
    throw new Error("El código de afiliado ya existe.");
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
