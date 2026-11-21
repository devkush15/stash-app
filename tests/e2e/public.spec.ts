import { expect, test } from "@playwright/test";

for (const width of [320, 390, 768, 1440]) {
  test(`sign-in fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Your good finds.",
    );
    await expect(
      page.getByRole("button", { name: "Continue with email" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator('input[type="email"]')
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(16);
  });
}
test("private library redirects visitors to sign-in", async ({ page }) => {
  await page.goto("/library?q=private");
  await expect(page).toHaveURL(/\/sign-in$/);
});
test("invalid callbacks fail closed and reject arbitrary redirects", async ({
  page,
}) => {
  await page.goto("/auth/callback?next=https://evil.example");
  await expect(page).toHaveURL(/\/sign-in\?error=expired$/);
  await expect(
    page.getByRole("alert").filter({ hasText: "expired" }),
  ).toBeVisible();
});
test("token confirmation without a token fails closed", async ({ page }) => {
  await page.goto("/auth/confirm?next=//evil.example");
  await expect(page).toHaveURL(/\/sign-in\?error=expired$/);
});
