import { expect, test } from "@playwright/test";
test("create tags, choose tags while saving, and browse grouped links", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(90000);
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "New here? Create an account" })
    .click();
  await page
    .getByLabel("Username", { exact: true })
    .fill("tags_" + Date.now().toString(36));
  await page
    .getByLabel("Password", { exact: true })
    .fill("tag-browser-check-password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/library$/);
  const tags = page.getByRole("region", { name: "Tags", exact: true });
  await tags.getByRole("button", { name: "Add a tag", exact: true }).click();
  await page.getByLabel("New tag", { exact: true }).fill("Pitch Deck");
  await page.getByRole("button", { name: "Create tag", exact: true }).click();
  await expect(
    tags.getByRole("button", { name: "Pitch Deck", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    tags.getByRole("button", { name: "Pitch Deck", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add link", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await page
    .getByLabel("URL", { exact: true })
    .fill("https://example.com/pitch-reference");
  await page.getByLabel("Title Optional").fill("My pitch reference");
  await dialog.getByRole("button", { name: "Pitch Deck", exact: true }).click();
  await page.getByRole("button", { name: "Save link", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pitch Deck", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "My pitch reference", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pitch Deck", exact: true }),
  ).toBeVisible();
  await tags.getByRole("button", { name: "Pitch Deck", exact: true }).click();
  await expect(page).toHaveURL(/tag=pitch\+deck/);
  await expect(page.getByTestId("saved-link")).toHaveCount(1);
  const filtered = await context.request.post("/api/search", {
    headers: { origin: baseURL! },
    data: { q: "reference", tag: "other", mode: "keyword" },
  });
  expect((await filtered.json()).items).toEqual([]);
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
