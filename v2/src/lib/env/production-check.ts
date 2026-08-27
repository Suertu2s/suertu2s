export type EnvIssue = {
  level: "error" | "warn";
  key: string;
  message: string;
};

/** Valida variables críticas en producción. No lanza — devuelve lista de problemas. */
export function checkProductionEnv(): EnvIssue[] {
  if (process.env.NODE_ENV !== "production") return [];

  const issues: EnvIssue[] = [];

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    issues.push({
      level: "error",
      key: "SUPABASE_SERVICE_ROLE_KEY",
      message: "Sin service role los pedidos no persisten en Supabase.",
    });
  }

  if (!process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")) {
    issues.push({
      level: "error",
      key: "NEXT_PUBLIC_SITE_URL",
      message: "Debe ser HTTPS con el dominio real (callbacks Flow).",
    });
  } else if (
    process.env.NEXT_PUBLIC_SITE_URL.includes("suertu2s.com") ||
    process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")
  ) {
    issues.push({
      level: "warn",
      key: "NEXT_PUBLIC_SITE_URL",
      message: "Usa https://suertu2s.cl en producción (no .com ni localhost).",
    });
  }

  if (process.env.FLOW_ENV !== "production") {
    issues.push({
      level: "error",
      key: "FLOW_ENV",
      message: 'Debe ser "production" para cobros reales.',
    });
  }

  if (!process.env.FLOW_API_KEY || !process.env.FLOW_SECRET_KEY) {
    issues.push({
      level: "error",
      key: "FLOW_API_KEY",
      message: "Flow no configurado — no hay pagos.",
    });
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    issues.push({
      level: "warn",
      key: "RESEND_API_KEY",
      message: "Sin Resend los correos de confirmación no se envían.",
    });
  }

  if (
    !process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET === "change-me-long-random-secret"
  ) {
    issues.push({
      level: "error",
      key: "ADMIN_SESSION_SECRET",
      message: "Clave de sesión admin insegura o ausente.",
    });
  }

  if (process.env.PAYMENTS_MOCK === "true") {
    issues.push({
      level: "error",
      key: "PAYMENTS_MOCK",
      message: "Pagos mock activos en producción.",
    });
  }

  const emailFrom = process.env.EMAIL_FROM?.trim() || "";
  if (!emailFrom || emailFrom.includes("onboarding@resend.dev")) {
    issues.push({
      level: "error",
      key: "EMAIL_FROM",
      message: "Configura un remitente verificado (ej. Suertu2s <contacto@suertu2s.cl>).",
    });
  }

  if (
    !process.env.AFFILIATE_SESSION_SECRET?.trim() ||
    process.env.AFFILIATE_SESSION_SECRET === process.env.ADMIN_SESSION_SECRET
  ) {
    issues.push({
      level: "warn",
      key: "AFFILIATE_SESSION_SECRET",
      message: "Usa un secreto dedicado para sesiones de afiliados.",
    });
  }

  if (!process.env.SENTRY_DSN?.trim() && !process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
    issues.push({
      level: "warn",
      key: "SENTRY_DSN",
      message: "Sin monitoreo de errores (Sentry) en producción.",
    });
  }

  return issues;
}

export function logProductionEnvIssues() {
  const issues = checkProductionEnv();
  for (const issue of issues) {
    const prefix = `[env:${issue.level}] ${issue.key}`;
    if (issue.level === "error") {
      console.error(prefix, issue.message);
    } else {
      console.warn(prefix, issue.message);
    }
  }
}
