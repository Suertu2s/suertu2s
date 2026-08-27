"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  normalizeReferralCode,
  saveReferralCode,
} from "@/lib/referral/storage";

/** Captura ?ref=CODIGO en cualquier página pública. */
export function ReferralCapture() {
  const params = useSearchParams();

  useEffect(() => {
    const ref = normalizeReferralCode(params.get("ref"));
    if (ref) saveReferralCode(ref, { locked: true });
  }, [params]);

  return null;
}
