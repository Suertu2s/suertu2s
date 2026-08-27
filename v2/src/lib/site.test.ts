import { afterEach, describe, expect, it } from "vitest";
import {
  CONTACT_EMAIL,
  DEFAULT_SITE_URL,
  SITE_DOMAIN,
  absoluteUrl,
  getSiteUrl,
} from "./site";

describe("site", () => {
  const prev = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prev;
  });

  it("usa dominio .cl por defecto", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(SITE_DOMAIN).toBe("suertu2s.cl");
    expect(DEFAULT_SITE_URL).toBe("https://suertu2s.cl");
    expect(getSiteUrl()).toBe("https://suertu2s.cl");
  });

  it("normaliza URL sin barra final", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://suertu2s.cl/";
    expect(getSiteUrl()).toBe("https://suertu2s.cl");
  });

  it("absoluteUrl concatena rutas", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://suertu2s.cl";
    expect(absoluteUrl("/check-tickets")).toBe(
      "https://suertu2s.cl/check-tickets",
    );
  });

  it("contacto usa dominio .cl", () => {
    expect(CONTACT_EMAIL).toContain("@suertu2s.cl");
  });
});
