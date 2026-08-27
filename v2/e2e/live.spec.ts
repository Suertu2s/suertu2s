import { expect, test } from "@playwright/test";

/**
 * Smoke contra https://suertu2s.cl (código desplegado).
 * Tras un nuevo deploy de v2, ejecuta también `npm run test:e2e` en local
 * o amplía las aserciones estrictas aquí.
 */
test.describe("producción suertu2s.cl", () => {
  test("home carga y muestra packs", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#comprar")).toBeVisible();
    await expect(page.getByRole("link", { name: /comprar/i }).first()).toBeVisible();
  });

  test("consultar tickets accesible", async ({ page }) => {
    await page.goto("/check-tickets");
    await expect(
      page.getByRole("heading", { name: /consultar tickets/i }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("tu@email.com")).toBeVisible();
  });

  test("bases legales carga", async ({ page }) => {
    await page.goto("/bases-legales");
    await expect(
      page.getByRole("heading", { name: /bases legales/i }),
    ).toBeVisible();
  });

  test("checkout responde", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/checkout/);
  });
});

test.describe("post-deploy (fallará hasta nuevo deploy en Vercel)", () => {
  test("privacidad publicada", async ({ page }) => {
    const res = await page.goto("/privacidad");
    expect(res?.status()).toBeLessThan(400);
    await expect(
      page.getByRole("heading", { name: /política de privacidad/i }),
    ).toBeVisible();
  });

  test("dominio .cl en footer y sin .com en bases", async ({ page }) => {
    await page.goto("/bases-legales");
    await expect(page.getByText(/borrador legal/i)).toHaveCount(0);
    await expect(page.getByText(/suertu2s\.com/i)).toHaveCount(0);

    await page.goto("/");
    const footer = page.locator("footer");
    await expect(
      footer.getByRole("link", { name: /política de privacidad/i }),
    ).toBeVisible();
    await expect(footer.getByText(/contacto@suertu2s\.cl/i)).toBeVisible();
  });

  test("/carrito redirige a checkout", async ({ page }) => {
    await page.goto("/carrito");
    await expect(page).toHaveURL(/\/checkout/);
  });

  test("sitemap.xml de la app", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toMatch(/suertu2s\.cl/);
  });
});
