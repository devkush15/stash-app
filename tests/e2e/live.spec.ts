import { expect, test, type BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";

const configured = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "STASH_TEST_EMAIL_A",
  "STASH_TEST_PASSWORD_A",
  "STASH_TEST_EMAIL_B",
  "STASH_TEST_PASSWORD_B",
].every((name) => process.env[name]);
test.skip(
  !configured,
  "Requires two confirmed dedicated Supabase test accounts; see README.",
);

// Obtain genuine Auth sessions; no mocked API, test auth bypass or service key.
async function authenticate(
  context: BrowserContext,
  origin: string,
  suffix: "A" | "B",
) {
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        async setAll(values) {
          await context.addCookies(
            values.map(({ name, value, options }) => ({
              name,
              value,
              url: origin,
              httpOnly: options.httpOnly ?? false,
              secure: origin.startsWith("https:"),
              sameSite:
                options.sameSite === "strict"
                  ? ("Strict" as const)
                  : options.sameSite === "none"
                    ? ("None" as const)
                    : ("Lax" as const),
            })),
          );
        },
      },
    },
  );
  const { error } = await client.auth.signInWithPassword({
    email: process.env[`STASH_TEST_EMAIL_${suffix}`]!,
    password: process.env[`STASH_TEST_PASSWORD_${suffix}`]!,
  });
  if (error) throw error;
  return client;
}

test("real save → refresh → search → owner isolation → delete → sign out", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(90000);
  const contextA = await browser.newContext({ baseURL });
  const contextB = await browser.newContext({ baseURL });
  const clientA = await authenticate(contextA, baseURL!, "A");
  await authenticate(contextB, baseURL!, "B");
  const marker = randomUUID();
  const title = `Stash verification ${marker}`;
  const url = `https://example.org/stash-browser-test/${marker}`;
  try {
    const page = await contextA.newPage();
    await page.goto("/library");
    await page.getByRole("button", { name: "Add link", exact: true }).click();
    await page.getByLabel("URL", { exact: true }).fill(url);
    await page.getByLabel("Title Optional").fill(title);
    await page.getByRole("button", { name: "Save link", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("searchbox", { name: "Search your saves" })
      .fill(marker);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByTestId("saved-link")).toHaveCount(1);
    await expect(
      page.getByTestId("saved-link").getByRole("link"),
    ).toHaveAttribute("href", url);

    // A second account cannot retrieve the first account's URL through the UI.
    const other = await contextB.newPage();
    await other.goto(`/library?q=${marker}`);
    await expect(other.getByTestId("saved-link")).toHaveCount(0);
    await expect(
      other.getByRole("heading", { name: "No matching links." }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: `Delete ${title}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Delete link", exact: true })
      .click();
    await expect(page.getByTestId("saved-link")).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("saved-link")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Account menu" })
      .filter({ visible: true })
      .click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  } finally {
    await clientA.from("saved_items").delete().eq("original_url", url);
    await contextA.close();
    await contextB.close();
    await clientA.auth.signOut();
  }
});
