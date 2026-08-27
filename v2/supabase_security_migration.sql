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
