import { expect, test } from "@playwright/test";
test("theme follows the device initially and remembers an explicit choice", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/sign-in");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(25, 26, 29)",
  );
  const toggle = page.getByRole("button", {
    name: "Switch to light mode",
    exact: true,
  });
  await expect(toggle).toBeEnabled();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await expect(page.getByLabel("Username", { exact: true })).toHaveCSS(
    "background-color",
    "rgb(36, 37, 41)",
  );
});
for (const width of [320, 390, 768, 1440])
  test(`sign-in fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Welcome back.",
    );
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .getByLabel("Username", { exact: true })
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(16);
  });
test("private library requires a session", async ({ page }) => {
  await page.goto("/library");
  await expect(page).toHaveURL(/\/sign-in$/);
});
test("API rejects unauthenticated and cross-origin writes", async ({
  request,
  baseURL,
}) => {
  const anonymous = await request.post("/api/items", {
    headers: { origin: baseURL! },
    data: { url: "https://example.com" },
  });
  expect(anonymous.status()).toBe(401);
  const cross = await request.post("/api/auth/register", {
    headers: { origin: "https://evil.example" },
    data: { username: "intruder", password: "not-a-real-password" },
  });
  expect(cross.status()).toBe(403);
});
