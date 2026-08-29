import { expect, test } from "@playwright/test";

test("admin puede abrir el formulario de venta POS", async ({ page }) => {
  await page.goto("/admin/manual-sales");
  await page.getByPlaceholder("admin@suertu2s.cl").fill("admin@suertu2s.cl");
  await page.locator('input[type="password"]').fill("suertu2s-admin-dev");
  await page.getByRole("button", { name: /entrar/i }).click();

  await expect(
    page.getByRole("heading", { name: /venta manual pos/i }),
  ).toBeVisible();
  await expect(page.getByLabel("Nombre")).toBeVisible();
  await expect(page.getByLabel("Apellido")).toBeVisible();
  await expect(page.getByLabel("Correo")).toBeVisible();
  await expect(page.getByLabel("Teléfono")).toBeVisible();
  await expect(page.getByLabel("Pack vendido")).toBeVisible();
});
