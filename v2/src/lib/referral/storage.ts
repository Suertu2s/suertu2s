const STORAGE_KEY = "suertu2s_ref_code";
const LOCK_KEY = "suertu2s_ref_locked";

/** Códigos tipo STJP48 / DEMO01 — letras y números, 2–32. */
export function normalizeReferralCode(raw: string | null | undefined) {
  if (!raw) return null;
  const code = raw.toUpperCase().trim();
  if (!/^[A-Z0-9_-]{2,32}$/.test(code)) return null;
  return code;
}

export function saveReferralCode(
  code: string,
  opts?: { locked?: boolean },
) {
  const normalized = normalizeReferralCode(code);
  if (!normalized || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, normalized);
    if (opts?.locked) {
      window.localStorage.setItem(LOCK_KEY, "1");
    }
  } catch {
    // ignore quota / private mode
  }
}

export function readReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeReferralCode(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** True si el código llegó por QR / ?ref= y no debe borrarse. */
export function isReferralCodeLocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(LOCK_KEY) !== "1") return false;
    return Boolean(readReferralCode());
  } catch {
    return false;
  }
}
