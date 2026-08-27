/** Cuenta solo dígitos (ignora espacios, +, guiones). */
export function phoneDigitCount(value: string): number {
  return value.replace(/\D/g, "").length;
}

/** Teléfono de contacto válido para checkout (mín. 8 dígitos). */
export function isValidCheckoutPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /^s\/?n$/i.test(trimmed)) return false;
  return phoneDigitCount(trimmed) >= 8;
}
