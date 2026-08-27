-- =============================================================================
-- Suertu2s — Esquema SQL para Supabase (PostgreSQL)
--
-- INSTRUCCIONES PARA SUPABASE:
-- 1. Inicia sesión en https://supabase.com y entra a tu proyecto.
-- 2. En el menú lateral izquierdo, ve a "SQL Editor" -> "New query".
-- 3. Copia y pega TODO este contenido y haz clic en "Run" (o presiona Ctrl + Enter).
-- 4. En el menú "Project Settings" -> "API", copia:
--      - Project URL -> NEXT_PUBLIC_SUPABASE_URL
--      - anon / public key -> NEXT_PUBLIC_SUPABASE_ANON_KEY
--      - service_role key -> SUPABASE_SERVICE_ROLE_KEY (¡Mantener secreta!)
-- 5. Agrégalas en tu archivo .env.local y en las Variables de Entorno de Vercel.
-- =============================================================================

-- Habilitar extensión pgcrypto para generación de UUIDs y funciones criptográficas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Tabla de Sorteos (Raffles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  prize_name TEXT NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft', 'archived')),
  code VARCHAR(12) NOT NULL UNIQUE,
  ticket_min INT NOT NULL DEFAULT 0,
  ticket_max INT NOT NULL DEFAULT 99999,
  live_stream_url TEXT DEFAULT '',
  winner_ticket_code VARCHAR(20) DEFAULT '',
  winner_name TEXT DEFAULT '',
  winner_note TEXT DEFAULT '',
  estimated_ops_cost_clp INT DEFAULT 400000,
  prizes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. Tabla de Paquetes de Ilustraciones (Packs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  price_clp INT NOT NULL CHECK (price_clp > 0),
  ticket_count INT NOT NULL CHECK (ticket_count > 0),
  image_url TEXT NOT NULL,
  illustration_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packs_raffle_id ON packs(raffle_id);
CREATE INDEX IF NOT EXISTS idx_packs_active_sort ON packs(active, sort_order);

-- -----------------------------------------------------------------------------
-- 3. Tabla de Afiliados / Vendedores
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone VARCHAR(50),
  commission_type TEXT NOT NULL DEFAULT 'percent' CHECK (commission_type IN ('percent', 'fixed')),
  commission_value NUMERIC(12, 2) NOT NULL DEFAULT 10.00,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_affiliates_email ON affiliates(email);

-- -----------------------------------------------------------------------------
-- 4. Tabla de Pedidos (Orders)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  rut VARCHAR(20) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  payment_provider TEXT CHECK (payment_provider IN ('flow', 'mock', 'transbank', 'mercadopago')),
  payment_external_id TEXT,
  total_clp INT NOT NULL,
  raffle_id UUID NOT NULL REFERENCES raffles(id),
  referral_code VARCHAR(50),
  referral_name TEXT,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  confirmation_email_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_orders_status_paid_at ON orders(status, paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_external_id ON orders(payment_external_id);
CREATE INDEX IF NOT EXISTS idx_orders_referral_code ON orders(referral_code);
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_id ON orders(affiliate_id);

-- -----------------------------------------------------------------------------
-- 5. Tabla de Ítems por Pedido (Order Items)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES packs(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_clp INT NOT NULL,
  ticket_count INT NOT NULL CHECK (ticket_count > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_pack_id ON order_items(pack_id);

-- -----------------------------------------------------------------------------
-- 6. Tabla de Boletos Emitidos (Tickets)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  number INT NOT NULL,
  code VARCHAR(50) NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tickets_raffle_number_unique UNIQUE (raffle_id, number),
  CONSTRAINT tickets_raffle_code_unique UNIQUE (raffle_id, code)
);

CREATE INDEX IF NOT EXISTS idx_tickets_email ON tickets(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code);
CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_raffle_id ON tickets(raffle_id);

-- -----------------------------------------------------------------------------
-- 7. Tabla de Pagos/Liquidaciones a Afiliados (Affiliate Payouts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount_clp INT NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  note TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_paid_at ON affiliate_payouts(paid_at);

-- -----------------------------------------------------------------------------
-- 8. Row Level Security (RLS) Policies
-- -----------------------------------------------------------------------------
ALTER TABLE raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública para datos del catálogo
DROP POLICY IF EXISTS "Public can view raffles" ON raffles;
CREATE POLICY "Public can view raffles" ON raffles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view active packs" ON packs;
CREATE POLICY "Public can view active packs" ON packs FOR SELECT USING (active = true);

-- Políticas de tickets: público puede consultar por código o email
DROP POLICY IF EXISTS "Public can view tickets" ON tickets;
CREATE POLICY "Public can view tickets" ON tickets FOR SELECT USING (true);

-- Acceso total para Service Role (Backend Next.js) en todas las tablas
DROP POLICY IF EXISTS "Service role full access on raffles" ON raffles;
CREATE POLICY "Service role full access on raffles" ON raffles FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on packs" ON packs;
CREATE POLICY "Service role full access on packs" ON packs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on affiliates" ON affiliates;
CREATE POLICY "Service role full access on affiliates" ON affiliates FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on orders" ON orders;
CREATE POLICY "Service role full access on orders" ON orders FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on order_items" ON order_items;
CREATE POLICY "Service role full access on order_items" ON order_items FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on tickets" ON tickets;
CREATE POLICY "Service role full access on tickets" ON tickets FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on affiliate_payouts" ON affiliate_payouts;
CREATE POLICY "Service role full access on affiliate_payouts" ON affiliate_payouts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 9. Procedimiento Almacenado Atómico para Fulfill Order y Boletos
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fulfill_order_and_generate_tickets(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_raffle raffles%ROWTYPE;
  v_total_tickets INT := 0;
  v_item RECORD;
  v_num INT;
  v_ticket_code VARCHAR(50);
  v_ticket_id UUID;
  v_attempts INT;
  v_inserted BOOLEAN;
  v_assigned_codes TEXT[] := ARRAY[]::TEXT[];
  v_tickets_json JSONB;
BEGIN
  -- 1. Bloquear y obtener la orden
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;

  -- 2. Si ya está pagado, retornar tickets existentes de forma idempotente
  IF v_order.status = 'paid' THEN
    SELECT jsonb_agg(to_jsonb(t) ORDER BY t.code) INTO v_tickets_json
    FROM tickets t WHERE t.order_id = p_order_id;

    RETURN jsonb_build_object(
      'order', to_jsonb(v_order),
      'tickets', COALESCE(v_tickets_json, '[]'::jsonb),
      'alreadyPaid', true
    );
  END IF;

  IF v_order.status <> 'pending' AND v_order.status <> 'failed' THEN
    RAISE EXCEPTION 'El pedido no está pendiente de pago (estado: %)', v_order.status;
  END IF;

  -- 3. Obtener el sorteo
  SELECT * INTO v_raffle FROM raffles WHERE id = v_order.raffle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sorteo no encontrado para la orden';
  END IF;

  -- 4. Actualizar estado de la orden
  UPDATE orders
  SET status = 'paid', paid_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- 5. Calcular total de boletos a emitir
  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
    v_total_tickets := v_total_tickets + v_item.ticket_count;
  END LOOP;

  IF v_total_tickets <= 0 THEN
    RAISE EXCEPTION 'La orden no tiene boletos asociados';
  END IF;

  -- 6. Generar números aleatorios únicos (0..99999) con reintentos
  FOR i IN 1..v_total_tickets LOOP
    v_attempts := 0;
    v_inserted := false;

    WHILE NOT v_inserted LOOP
      v_attempts := v_attempts + 1;
      IF v_attempts > 150 THEN
        RAISE EXCEPTION 'No se pudo asignar un código único de boleto tras 150 intentos';
      END IF;

      -- Generar número aleatorio entre ticket_min y ticket_max
      v_num := FLOOR(RANDOM() * (v_raffle.ticket_max - v_raffle.ticket_min + 1) + v_raffle.ticket_min)::INT;
      v_ticket_code := v_raffle.code || LPAD(v_num::TEXT, 5, '0');
      v_ticket_id := gen_random_uuid();

      BEGIN
        INSERT INTO tickets (id, raffle_id, order_id, number, code, email, created_at)
        VALUES (v_ticket_id, v_order.raffle_id, p_order_id, v_num, v_ticket_code, v_order.email, NOW());

        v_assigned_codes := array_append(v_assigned_codes, v_ticket_code);
        v_inserted := true;
      EXCEPTION
        WHEN unique_violation THEN
          -- Reintentar con otro número
          v_inserted := false;
      END;
    END LOOP;
  END LOOP;

  -- 7. Obtener todos los tickets generados
  SELECT jsonb_agg(to_jsonb(t) ORDER BY t.code) INTO v_tickets_json
  FROM tickets t WHERE t.order_id = p_order_id;

  RETURN jsonb_build_object(
    'order', to_jsonb(v_order),
    'tickets', COALESCE(v_tickets_json, '[]'::jsonb),
    'alreadyPaid', false,
    'assignedCodes', to_jsonb(v_assigned_codes)
  );
END;
$$;

-- =============================================================================
-- SEED DE DATOS INICIALES (Sorteo + Packs + Afiliados Demo)
-- =============================================================================

INSERT INTO raffles (
  id, title, prize_name, ends_at, status, code, ticket_min, ticket_max
) VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Sorteo MOTORRAD CORSA R150 0km 2026',
  'MOTORRAD CORSA R150 2026',
  '2026-12-01 03:00:00+00',
  'active',
  'S2S26',
  0,
  99999
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  prize_name = EXCLUDED.prize_name;

INSERT INTO packs (
  id, raffle_id, name, slug, price_clp, ticket_count,
  image_url, illustration_urls, featured, sort_order
) VALUES
  (
    'b0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Ilustración Puerto Montt',
    'puerto-montt',
    5000,
    1,
    '/images/packs/puertomontt.webp',
    '["/images/packs/puertomontt.webp"]'::jsonb,
    false,
    1
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Ilustración Llanquihue',
    'llanquihue',
    8000,
    2,
    '/images/packs/llanquihue.webp',
    '["/images/packs/llanquihue.webp"]'::jsonb,
    false,
    3
  ),
  (
    'b0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'Ilustración Chiloé',
    'chiloe',
    10000,
    3,
    '/images/packs/chiloe.webp',
    '["/images/packs/chiloe.webp"]'::jsonb,
    true,
    2
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_clp = EXCLUDED.price_clp,
  ticket_count = EXCLUDED.ticket_count;

INSERT INTO affiliates (
  id, code, name, email, commission_type, commission_value, notes
) VALUES
  (
    'c0000000-0000-4000-8000-000000000001',
    'STJP48',
    'Embajador Sur',
    'embajador@suertu2s.cl',
    'percent',
    10.00,
    'Cuenta demo — clave se setea en panel admin'
  ),
  (
    'c0000000-0000-4000-8000-000000000002',
    'DEMO01',
    'Vendedor Demo',
    'demo@suertu2s.cl',
    'fixed',
    1000.00,
    'Comisión fija $1.000 — clave se setea en panel admin'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name;
