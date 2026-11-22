import { expect, test } from "@playwright/test";
test("tag capture, live filters, views, selection, undo and Ask handoff", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(180000);
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "New here? Create an account" })
    .click();
  await page
    .getByLabel("Username", { exact: true })
    .fill("controls_" + Date.now().toString(36));
  await page
    .getByLabel("Password", { exact: true })
    .fill("controls-check-password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/library/);
  await page.getByRole("button", { name: "Manage tags", exact: true }).click();
  for (const tag of ["research", "recipes"]) {
    await page.getByLabel("New tag", { exact: true }).fill(tag);
    await page.getByRole("button", { name: "Create tag", exact: true }).click();
    await expect(
      page.getByLabel(`Rename ${tag}`, { exact: true }),
    ).toBeVisible();
  }
  await page.getByLabel("Color for research").selectOption("purple");
  await page.getByRole("button", { name: "Close tag manager" }).click();
  await page.getByRole("button", { name: "Add link", exact: true }).click();
  await page
    .getByLabel("URL", { exact: true })
    .fill("https://example.com/research");
  await page.getByLabel("Title Optional").fill("Research notes");
  await page
    .getByLabel("Notes Optional")
    .fill("Pricing starts at twelve dollars per month.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Research", exact: true })
    .click();
  await page.getByRole("button", { name: "Save link", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Research notes", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await page.reload();
  await expect(
    page
      .getByRole("navigation", { name: "Your tags" })
      .getByRole("link", { name: "Research 1", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.getByRole("searchbox").fill("nonexistent");
  await expect(
    page.getByRole("heading", { name: "No matching links." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByLabel("Saved after").fill("2099-01-01");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByTestId("saved-link")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(page.getByTestId("saved-link")).toHaveCount(1);
  await page.getByTestId("saved-link").hover();
  await page.getByLabel("Select Research notes", { exact: true }).check();
  await page.getByRole("button", { name: "Add tag", exact: true }).click();
  await page.getByLabel("Tag to add").fill("recipes");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add tag", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await (await context.request.get("/api/items")).json()).items[0].tags,
    )
    .toEqual(["research", "recipes"]);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByLabel("View", { exact: true }).selectOption("all");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.getByTestId("saved-link").hover();
  await page
    .getByRole("button", { name: "Delete Research notes", exact: true })
    .click();
  await expect(page.getByTestId("saved-link")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByTestId("saved-link")).toHaveCount(1);
  await page.getByTestId("saved-link").hover();
  await page.getByLabel("Select Research notes", { exact: true }).check();
  await page
    .getByRole("button", { name: "Ask Stash about these (1)", exact: true })
    .click();
  await expect(
    page.getByLabel("What would you like to find or understand?"),
  ).toHaveValue(/Research notes/);
  await page.getByRole("button", { name: "Ask Stash", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Stash answer" })
      .getByRole("link", { name: /Research notes/ }),
  ).toHaveAttribute("href", "https://example.com/research");
  const empty = await context.request.post("/api/ask", {
    headers: { origin: baseURL! },
    data: { question: "pricing" },
  });
  expect(empty.ok()).toBe(true);
});

test("sidebar counts, usage order, overflow filter, colors and tag lifecycle", async ({
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
    .fill("sidebar_" + Date.now().toString(36));
  await page
    .getByLabel("Password", { exact: true })
    .fill("sidebar-check-password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/library/);
  for (let i = 0; i < 10; i++) {
    const response = await context.request.post("/api/tags", {
      headers: { origin: baseURL! },
      data: { tag: `topic ${i}` },
    });
    expect(response.ok()).toBe(true);
  }
  for (let i = 0; i < 2; i++) {
    const response = await context.request.post("/api/items", {
      headers: { origin: baseURL! },
      data: {
        url: `https://example.com/sidebar-${i}`,
        title: `Reference ${i}`,
        note: "Retain this personal note.",
        tags: ["topic 9"],
      },
    });
    expect(response.status()).toBe(201);
  }
  await page.reload();
  const nav = page.getByRole("navigation", { name: "Your tags", exact: true });
  await expect(nav.getByRole("link").first()).toHaveText("Topic 92");
  await expect(nav.getByRole("link")).toHaveCount(8);
  await page
    .getByRole("button", { name: "Show more (2)", exact: true })
    .click();
  await expect(nav.getByRole("link")).toHaveCount(10);
  await page.getByLabel("Filter tags", { exact: true }).fill("topic 9");
  await expect(nav.getByRole("link")).toHaveCount(1);
  await page.getByRole("button", { name: "Manage tags", exact: true }).click();
  await page.getByLabel("Color for topic 9").selectOption("blue");
  await page.getByLabel("Rename topic 9", { exact: true }).fill("references");
  await page.getByRole("button", { name: "Save topic 9", exact: true }).click();
  await expect(
    page.getByLabel("Rename references", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Color for references").selectOption("green");
  await page.getByRole("button", { name: "Close tag manager" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Manage tags", exact: true }).click();
  await expect(page.getByLabel("Color for references")).toHaveValue("green");
  await page
    .getByRole("button", { name: "Remove references", exact: true })
    .click();
  await page.getByRole("button", { name: "Remove tag", exact: true }).click();
  await expect(
    page.getByLabel("Rename references", { exact: true }),
  ).toHaveCount(0);
  const records = (await (await context.request.get("/api/items")).json())
    .items;
  expect(records).toHaveLength(2);
  expect(
    records.every(
      (item: { tags: string[]; user_note: string }) =>
        item.tags.length === 0 &&
        item.user_note === "Retain this personal note.",
    ),
  ).toBe(true);
});
