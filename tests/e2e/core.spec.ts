import { expect, test, type Page } from "@playwright/test";
const password = "assignment-test-password";
async function register(page: Page, username: string) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "New here? Create an account" })
    .click();
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/library$/);
}
test("register, save, persist, search, isolate, delete, logout and login", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(90000);
  const a = await browser.newContext({ baseURL }),
    b = await browser.newContext({ baseURL });
  const page = await a.newPage(),
    other = await b.newPage();
  const suffix = Date.now().toString(36);
  const username = "alice_" + suffix;
  await register(page, username);
  const cookies = await a.cookies();
  const session = cookies.find((c) => c.name === "stash_session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  await page.getByRole("button", { name: "Add link", exact: true }).click();
  await page
    .getByLabel("URL", { exact: true })
    .fill("https://example.com/pasta-reference");
  await page.getByLabel("Title Optional").fill("Pasta recipe");
  await page.getByRole("button", { name: "Save link", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pasta recipe", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pasta recipe", exact: true }),
  ).toBeVisible();
  const all = await a.request.get("/api/items");
  const saved = (await all.json()).items[0];
  await page.getByRole("searchbox").fill("Find the pasta recipe I saved.");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByTestId("saved-link")).toHaveCount(1);
  await register(other, "bob_" + suffix);
  const forbiddenDelete = await b.request.delete(`/api/items/${saved.id}`, {
    headers: { origin: baseURL! },
  });
  expect(forbiddenDelete.status()).toBe(404);
  const forbiddenIndex = await b.request.post(`/api/items/${saved.id}/index`, {
    headers: { origin: baseURL! },
  });
  expect(forbiddenIndex.status()).toBe(404);
  expect((await (await b.request.get("/api/items")).json()).items).toHaveLength(
    0,
  );
  await page
    .getByRole("button", { name: "Delete Pasta recipe", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete link", exact: true }).click();
  await expect(page.getByTestId("saved-link")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("saved-link")).toHaveCount(0);
  const oldToken = session!.value;
  await page
    .getByRole("button", { name: "Account menu" })
    .filter({ visible: true })
    .click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  const check = await browser.newContext({ baseURL });
  await check.addCookies([
    { name: "stash_session", value: oldToken, url: baseURL! },
  ]);
  expect((await check.request.get("/api/items")).status()).toBe(401);
  await check.close();
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/library$/);
  await a.close();
  await b.close();
});
