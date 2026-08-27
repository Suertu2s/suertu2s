import { afterEach, describe, expect, it } from "vitest";
import {
  createTicketLookupToken,
  verifyTicketLookupToken,
} from "./lookup-token";

describe("lookup-token", () => {
  const prev = process.env.ADMIN_SESSION_SECRET;

  afterEach(() => {
    if (prev === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = prev;
  });

  it("crea y verifica token de email", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret-for-lookup-token-32chars";
    const token = createTicketLookupToken("Comprador@Email.cl");
    expect(verifyTicketLookupToken(token)).toBe("comprador@email.cl");
  });

  it("rechaza token alterado", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret-for-lookup-token-32chars";
    const token = createTicketLookupToken("a@b.cl");
    expect(verifyTicketLookupToken(`${token}x`)).toBeNull();
  });
});
