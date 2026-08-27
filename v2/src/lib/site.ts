/** Dominio canónico de producción (Chile). */
export const SITE_DOMAIN = "suertu2s.cl";

export const DEFAULT_SITE_URL = `https://${SITE_DOMAIN}`;

export const CONTACT_EMAIL = "contacto@suertu2s.cl";

/** URL pública del sitio (env en Vercel o dominio por defecto). */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  let raw =
    fromEnv ||
    (fromVercel
      ? fromVercel.startsWith("http")
        ? fromVercel
        : `https://${fromVercel}`
      : "") ||
    DEFAULT_SITE_URL;

  raw = raw.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  return raw;
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
