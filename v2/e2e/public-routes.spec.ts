import { expect, test } from "@playwright/test";

function isProduction(baseURL: string | undefined) {
  return baseURL?.includes("suertu2s.cl") ?? false;
}

test.describe("rutas públicas", () => {
  test("bases legales carga sin aviso de borrador", async ({
    page,
    baseURL,
  }) => {
    await page.goto("/bases-legales");
    await expect(
      page.getByRole("heading", { name: /bases legales/i }),
    ).toBeVisible();
    await expect(page.getByText(/borrador legal/i)).toHaveCount(0);
    if (isProduction(baseURL)) {
      await expect(page.getByText(/suertu2s\.com/i)).toHaveCount(0);
    }
  });

  test("política de privacidad", async ({ page }) => {
    await page.goto("/privacidad");
    await expect(
      page.getByRole("heading", { name: /política de privacidad/i }),
    ).toBeVisible();
    await expect(
      page.locator("main").getByRole("link", {
        name: /contacto@suertu2s\.cl/i,
      }),
    ).toBeVisible();
  });

  test("consultar tickets", async ({ page }) => {
    await page.goto("/check-tickets");
    await expect(
      page.getByRole("heading", { name: /consultar tickets/i }),
    ).toBeVisible();
    await expect(
      page
        .getByPlaceholder("tu@email.com")
        .or(page.getByLabel(/correo/i))
        .first(),
    ).toBeVisible();
  });

  test("/carrito redirige a /checkout", async ({ page }) => {
    await page.goto("/carrito");
    await expect(page).toHaveURL(/\/checkout/);
  });

  test("checkout vacío muestra mensaje", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByText(/carrito está vacío/i)).toBeVisible();
  });

  test("footer enlaza privacidad y bases legales", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(
      footer.getByRole("link", { name: /política de privacidad/i }),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /bases legales/i }),
    ).toBeVisible();
    await expect(footer.getByText(/contacto@suertu2s\.cl/i)).toBeVisible();
  });

  test("robots.txt y sitemap accesibles", async ({ request, baseURL }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    const robotsBody = await robots.text();
    if (!isProduction(baseURL)) {
      expect(robotsBody).toMatch(/sitemap/i);
    }

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toMatch(/suertu2s\.cl|localhost/);
  });
});
