import { expect, test } from "@playwright/test";
test("capture, multi-tag filtering, grouping, rename/delete, sorting and Ask fallback", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(120000);
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "New here? Create an account" })
    .click();
  await page
    .getByLabel("Username", { exact: true })
    .fill("product_" + Date.now().toString(36));
  await page
    .getByLabel("Password", { exact: true })
    .fill("product-browser-check-password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByText("Just for you", { exact: true })).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Filter by source", exact: true })
      .getByRole("link", { name: "Instagram", exact: true }),
  ).not.toBeVisible();
  await page.locator(".source-filter summary").click();
  await expect(
    page
      .getByRole("navigation", { name: "Filter by source", exact: true })
      .getByRole("link", { name: "Instagram", exact: true }),
  ).toBeVisible();
  await page.locator(".source-filter summary").click();
  const empty = await context.request.post("/api/ask", {
    headers: { origin: baseURL! },
    data: { question: "What have I saved?" },
  });
  expect((await empty.json()).mode).toBe("empty");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("button", { name: "Manage tags", exact: true }).click();
  for (const tag of ["Pitch Deck", "Marketing"]) {
    await page.getByLabel("New tag", { exact: true }).fill(tag);
    await page.getByRole("button", { name: "Create tag", exact: true }).click();
    await expect(
      page.getByLabel(`Rename ${tag.toLowerCase()}`, { exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Close tag manager", exact: true })
    .click();
  await expect(
    page
      .getByRole("navigation", { name: "Your tags", exact: true })
      .getByRole("link", { name: "Pitch Deck", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add link", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await page
    .getByLabel("URL", { exact: true })
    .fill("https://example.com/pitch-reference");
  await page.getByLabel("Title Optional").fill("My pitch reference");
  await page
    .getByLabel("Notes Optional")
    .fill("Pricing plan: Starter costs $12 monthly. Annual plans save 20%.");
  await dialog.getByRole("button", { name: "Pitch Deck", exact: true }).click();
  await dialog.getByRole("button", { name: "Marketing", exact: true }).click();
  await dialog.getByRole("button", { name: "Add a tag", exact: true }).click();
  await page.getByLabel("New tag", { exact: true }).fill("capture-only");
  await page.getByRole("button", { name: "Create tag", exact: true }).click();
  await page.getByRole("button", { name: "Save link", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My pitch reference", exact: true }),
  ).not.toHaveCount(0);
  // Tags created in capture must be manageable without a full page reload.
  await expect(
    page
      .getByRole("navigation", { name: "Your tags", exact: true })
      .getByRole("link", { name: "Capture-Only", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Manage tags", exact: true }).click();
  await expect(
    page.getByLabel("Rename capture-only", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove capture-only", exact: true })
    .click();
  await page.getByRole("button", { name: "Remove tag", exact: true }).click();
  await expect(
    page.getByLabel("Rename capture-only", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Close tag manager", exact: true })
    .click();
  const second = await context.request.post("/api/items", {
    headers: { origin: baseURL! },
    data: {
      url: "https://example.com/marketing-reference",
      title: "Marketing reference",
      tags: ["marketing"],
    },
  });
  expect(second.status()).toBe(201);
  await page.reload();
  await expect(page.getByTestId("saved-link")).toHaveCount(3);
  await expect(
    page.getByRole("heading", { name: "Pitch Deck", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Marketing", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Your tags", exact: true })
    .getByRole("link", { name: "Pitch Deck", exact: true })
    .click();
  await expect(page).toHaveURL(/tag=pitch/);
  await expect(page.getByTestId("saved-link")).toHaveCount(1);
  await page
    .getByRole("navigation", { name: "Library organization", exact: true })
    .getByRole("link", { name: "All links", exact: true })
    .click();
  await expect(page.getByTestId("saved-link")).toHaveCount(3);
  await page.getByLabel("Sort by", { exact: true }).selectOption("title");
  await expect(
    page.getByTestId("saved-link").first().getByRole("heading"),
  ).toHaveText("Marketing reference");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByLabel("View", { exact: true }).selectOption("all");
  await page.getByRole("checkbox", { name: "Pitch Deck", exact: true }).check();
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page.getByTestId("saved-link")).toHaveCount(1);
  await page.getByRole("checkbox", { name: "Marketing", exact: true }).check();
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page.getByTestId("saved-link")).toHaveCount(2);
  await page.getByLabel("View", { exact: true }).selectOption("tags");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page.getByTestId("saved-link")).toHaveCount(3);
  expect(
    (await (await context.request.get("/api/items")).json()).items,
  ).toHaveLength(2);
  await page.getByRole("button", { name: "Manage tags", exact: true }).click();
  await page.getByLabel("Rename pitch deck", { exact: true }).fill("founders");
  await page
    .getByRole("button", { name: "Save pitch deck", exact: true })
    .click();
  await expect(
    page.getByLabel("Rename founders", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/tag=founders/);
  await page
    .getByRole("button", { name: "Remove founders", exact: true })
    .click();
  await page.getByRole("button", { name: "Remove tag", exact: true }).click();
  await expect(page.getByLabel("Rename founders", { exact: true })).toHaveCount(
    0,
  );
  const records = (await (await context.request.get("/api/items")).json())
    .items;
  expect(records).toHaveLength(2);
  expect(
    records.some((item: { user_note: string }) =>
      item.user_note?.includes("$12"),
    ),
  ).toBe(true);
  expect(
    records.every(
      (item: { tags: string[] }) => !item.tags.includes("founders"),
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Close tag manager", exact: true })
    .click();
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await expect(page.getByTestId("saved-link")).toHaveCount(2);
  await page.getByRole("link", { name: "Ask Stash", exact: true }).click();
  await page
    .getByLabel("What would you like to find or understand?")
    .fill("What did I save about pricing?");
  await page.getByRole("button", { name: "Ask Stash", exact: true }).click();
  const answer = page.getByRole("region", {
    name: "Stash answer",
    exact: true,
  });
  await expect(answer).toContainText("AI is unavailable");
  await expect(
    answer.getByRole("link", { name: /My pitch reference/ }),
  ).toHaveAttribute("href", "https://example.com/pitch-reference");
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
