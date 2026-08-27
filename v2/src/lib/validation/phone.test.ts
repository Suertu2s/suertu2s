import { describe, expect, it } from "vitest";
import { isValidCheckoutPhone, phoneDigitCount } from "./phone";

describe("phone validation", () => {
  it("cuenta dígitos ignorando formato", () => {
    expect(phoneDigitCount("+56 9 1234 5678")).toBe(11);
  });

  it("acepta teléfono móvil chileno", () => {
    expect(isValidCheckoutPhone("+56 9 8765 4321")).toBe(true);
    expect(isValidCheckoutPhone("987654321")).toBe(true);
  });

  it("rechaza vacío, s/n o muy corto", () => {
    expect(isValidCheckoutPhone("")).toBe(false);
    expect(isValidCheckoutPhone("s/n")).toBe(false);
    expect(isValidCheckoutPhone("12345")).toBe(false);
  });
});
