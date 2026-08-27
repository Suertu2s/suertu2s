import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("home carga marca y packs", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /suertu/i }).first(),
    ).toBeVisible();
    await expect(page.locator("#comprar")).toBeVisible();
  });

  test("admin login y dashboard", async ({ page, baseURL }) => {
    test.skip(
      baseURL?.includes("suertu2s.cl") ?? false,
      "No ejecutar login admin contra producción",
    );
    await page.goto("/admin");
    await page.getByPlaceholder("admin@suertu2s.cl").fill("admin@suertu2s.cl");
    await page
      .locator('input[type="password"]')
      .fill(process.env.ADMIN_PASSWORD || "suertu2s-admin-dev");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(
      page.getByRole("heading", { name: /resumen/i }),
    ).toBeVisible();
    await expect(page.getByText(/ingresos pagados/i)).toBeVisible();
  });
});
