import { expect, test } from "@playwright/test";

test("Instagram fallback, canonical duplicates, editing and description search", async ({
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
    .fill("instagram_" + Date.now().toString(36));
  await page
    .getByLabel("Password", { exact: true })
    .fill("instagram-browser-check-password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/library$/);
  await page.getByRole("button", { name: "Add link", exact: true }).click();
  await page
    .getByLabel("URL", { exact: true })
    .fill(
      "https://instagram.com/reels/StashMissing2026/?utm_source=copy&igsh=tracking",
    );
  await page.getByRole("button", { name: "Save link", exact: true }).click();
  const card = page.getByTestId("saved-link");
  await expect(card.getByRole("heading")).toHaveText(
    "Name this Instagram Reel",
  );
  await expect(
    card.getByRole("button", { name: "Add a note", exact: true }),
  ).toBeVisible();
  await expect(card).not.toContainText("igsh");
  await expect(card.getByRole("heading")).not.toContainText("instagram.com");
  await expect(card).toContainText("Public content unavailable");
  expect(await card.getByRole("link").getAttribute("href")).toBe(
    "https://www.instagram.com/reel/StashMissing2026/",
  );
  const item = (await (await context.request.get("/api/items")).json())
    .items[0];
  const duplicate = await context.request.post("/api/items", {
    headers: { origin: baseURL! },
    data: {
      url: "https://www.instagram.com/reel/StashMissing2026/?utm_medium=test",
    },
  });
  expect(duplicate.status()).toBe(409);
  const repeated = await context.request.post(`/api/items/${item.id}/index`, {
    headers: { origin: baseURL! },
  });
  expect((await repeated.json()).item.processing_started_at).toBe(
    item.processing_started_at,
  );
  await expect(
    card.getByRole("button", { name: "Analyze", exact: true }),
  ).toHaveCount(0);
  await card.getByRole("button", { name: "Add a note", exact: true }).click();
  await page.getByLabel("Title Optional").fill("Dinner idea");
  await page
    .getByLabel("Notes Optional")
    .fill("My reminder to cook tomato pasta with basil for dinner.");
  for (const tag of ["weeknight", "dinner"]) {
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add a tag", exact: true })
      .click();
    await page.getByLabel("New tag", { exact: true }).fill(tag);
    await page.getByRole("button", { name: "Create tag", exact: true }).click();
  }
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(card.getByRole("heading")).toHaveText("Dinner idea");
  await page.reload();
  await page
    .getByRole("button", { name: "Actions for Dinner idea", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Edit link", exact: true }).click();
  await expect(page.getByLabel("Notes Optional")).toHaveValue(
    "My reminder to cook tomato pasta with basil for dinner.",
  );
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Weeknight", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Dinner", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const search = await context.request.post("/api/search", {
    headers: { origin: baseURL! },
    data: { q: "Find the basil dinner reminder", mode: "keyword" },
  });
  expect(
    (await search.json()).items.map((i: { id: string }) => i.id),
  ).toContain(item.id);
});
