/** Etiquetas en español para valores internos (API/DB). */

export const ORDER_STATUS_LABELS: Record<string, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  failed: "Fallido",
  cancelled: "Cancelado",
};

export const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  flow: "Flow",
  mock: "Prueba",
  manual: "Venta POS",
  webpay: "Webpay",
  mercadopago: "Mercado Pago",
  unknown: "Desconocido",
};

export function orderStatusLabel(status: string | null | undefined) {
  if (!status) return "Sin estado";
  return ORDER_STATUS_LABELS[status] || status;
}

export function paymentProviderLabel(provider: string | null | undefined) {
  if (!provider) return "Sin pasarela";
  return PAYMENT_PROVIDER_LABELS[provider] || provider;
}
