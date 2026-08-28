-- =============================================================================
-- Migración de seguridad Suertu2s — ejecutar en Supabase SQL Editor
-- =============================================================================

-- 1. Restringir RPC fulfill a service_role únicamente
REVOKE ALL ON FUNCTION fulfill_order_and_generate_tickets(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION fulfill_order_and_generate_tickets(UUID) FROM anon;
REVOKE ALL ON FUNCTION fulfill_order_and_generate_tickets(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION fulfill_order_and_generate_tickets(UUID) TO service_role;

-- 2. Quitar lectura pública de todos los tickets (lookup vía API backend)
DROP POLICY IF EXISTS "Public can view tickets" ON tickets;

-- 3. Índice único en payment_external_id (evita duplicados de pago)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_external_id_unique
  ON orders (payment_external_id)
  WHERE payment_external_id IS NOT NULL;

-- 4. Meta de tickets (si no se aplicó antes)
ALTER TABLE raffles
  ADD COLUMN IF NOT EXISTS ticket_goal INT NOT NULL DEFAULT 1000;

-- 5. Modelo comercial de afiliados Suertudos
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS referred_by_affiliate_id UUID
    REFERENCES affiliates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invitation_status TEXT NOT NULL DEFAULT 'active'
    CHECK (invitation_status IN ('active', 'pending')),
  ADD COLUMN IF NOT EXISTS invite_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE orders
SET is_test = TRUE
WHERE payment_provider = 'mock' AND is_test = FALSE;

UPDATE affiliates
SET commission_type = 'percent',
    commission_value = 10.00
WHERE commission_type <> 'percent';

CREATE INDEX IF NOT EXISTS idx_affiliates_referred_by
  ON affiliates(referred_by_affiliate_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_invite_token_hash
  ON affiliates(invite_token_hash)
  WHERE invite_token_hash IS NOT NULL;

-- Cada línea congela la tasa aplicada en la venta y evita recalcular el pasado.
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('seller', 'direct_referral')),
  rate_percent NUMERIC(5, 2) NOT NULL CHECK (rate_percent >= 0 AND rate_percent <= 15),
  base_clp INT NOT NULL CHECK (base_clp >= 0),
  amount_clp INT NOT NULL CHECK (amount_clp >= 0),
  direct_tickets_before INT NOT NULL DEFAULT 0 CHECK (direct_tickets_before >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'reversed')),
  payout_id UUID REFERENCES affiliate_payouts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT affiliate_commissions_unique_line
    UNIQUE (order_id, affiliate_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_status
  ON affiliate_commissions(affiliate_id, status);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_order
  ON affiliate_commissions(order_id);

ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on affiliate_commissions"
  ON affiliate_commissions;
CREATE POLICY "Service role full access on affiliate_commissions"
  ON affiliate_commissions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Registra las comisiones una sola vez. El lock evita que dos pagos cercanos
-- al ticket 500 reciban el nivel equivocado.
CREATE OR REPLACE FUNCTION record_affiliate_commissions(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_seller affiliates%ROWTYPE;
  v_referrer affiliates%ROWTYPE;
  v_tickets_before INT := 0;
  v_rate NUMERIC(5, 2);
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
    AND status = 'paid'
    AND COALESCE(is_test, FALSE) = FALSE;
  IF NOT FOUND OR v_order.affiliate_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_seller
  FROM affiliates
  WHERE id = v_order.affiliate_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_seller.id::TEXT, 0));

  SELECT COALESCE(COUNT(*), 0)::INT INTO v_tickets_before
  FROM tickets t
  JOIN orders o ON o.id = t.order_id
  WHERE o.affiliate_id = v_seller.id
    AND o.status = 'paid'
    AND COALESCE(o.is_test, FALSE) = FALSE
    AND t.order_id <> p_order_id;

  v_rate := CASE
    WHEN v_tickets_before >= 500 THEN 12
    ELSE 10
  END;

  INSERT INTO affiliate_commissions (
    order_id, affiliate_id, kind, rate_percent, base_clp,
    amount_clp, direct_tickets_before, status
  )
  VALUES (
    p_order_id, v_seller.id, 'seller', v_rate, v_order.total_clp,
    ROUND(v_order.total_clp * v_rate / 100)::INT, v_tickets_before, 'pending'
  )
  ON CONFLICT (order_id, affiliate_id, kind) DO NOTHING;

  IF v_seller.referred_by_affiliate_id IS NOT NULL
     AND v_seller.referred_by_affiliate_id <> v_seller.id THEN
    SELECT * INTO v_referrer
    FROM affiliates
    WHERE id = v_seller.referred_by_affiliate_id
      AND active = TRUE;

    IF FOUND THEN
      INSERT INTO affiliate_commissions (
        order_id, affiliate_id, kind, rate_percent, base_clp,
        amount_clp, direct_tickets_before, status
      )
      VALUES (
        p_order_id, v_referrer.id, 'direct_referral', 3, v_order.total_clp,
        ROUND(v_order.total_clp * 3 / 100)::INT, v_tickets_before, 'pending'
      )
      ON CONFLICT (order_id, affiliate_id, kind) DO NOTHING;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION record_affiliate_commissions(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_affiliate_commissions(UUID) FROM anon;
REVOKE ALL ON FUNCTION record_affiliate_commissions(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION record_affiliate_commissions(UUID) TO service_role;

CREATE OR REPLACE FUNCTION trigger_record_affiliate_commissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM record_affiliate_commissions(NEW.order_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_record_affiliate_commissions ON tickets;
CREATE TRIGGER tickets_record_affiliate_commissions
AFTER INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION trigger_record_affiliate_commissions();

-- Carga inicial idempotente para pedidos pagados existentes.
DO $$
DECLARE
  paid_order RECORD;
BEGIN
  FOR paid_order IN SELECT id FROM orders WHERE status = 'paid' LOOP
    PERFORM record_affiliate_commissions(paid_order.id);
  END LOOP;
END;
$$;
