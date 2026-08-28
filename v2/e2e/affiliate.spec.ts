import { expect, test } from "@playwright/test";

test.describe("portal de afiliados", () => {
  test("muestra el acceso sin exponer datos privados", async ({ page }) => {
    await page.goto("/afiliados");
    await expect(
      page.getByRole("heading", { name: /bienvenido, embajador/i }),
    ).toBeVisible();
    await expect(page.getByText("Contraseña", { exact: true })).toBeVisible();
  });

  test("rechaza una página de registro sin invitación", async ({ page }) => {
    await page.goto("/afiliados/registro");
    await expect(
      page.getByRole("heading", { name: /invitación no válida/i }),
    ).toBeVisible();
  });
});
