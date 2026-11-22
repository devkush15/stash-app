import { test, expect } from "@playwright/test";

test.skip(
  !process.env.STASH_UI_TESTS,
  "Run npm run test:ui to create the temporary dev-only fixture route.",
);
for (const width of [320, 390, 768, 1440]) {
  for (const data of ["demo", "worst", "empty", "one"]) {
    test(`library ${data} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/dev-qa?data=${data}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Library",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.getByRole("button", { name: "Add link", exact: true }),
      ).toBeVisible();
      if (data === "empty")
        await expect(
          page.getByRole("heading", { name: "Save your first link." }),
        ).toBeVisible();
      else {
        expect(await page.getByTestId("saved-link").count()).toBe(
          data === "one" ? 1 : data === "worst" ? 6 : 3,
        );
        const cardLinks = page.getByTestId("saved-link").getByRole("link");
        expect(await cardLinks.first().getAttribute("target")).toBe("_blank");
        await page
          .getByRole("button", { name: /^Actions for / })
          .first()
          .click();
        await page
          .getByRole("menuitem", { name: "Delete link", exact: true })
          .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page
          .getByRole("button", { name: "Keep link", exact: true })
          .click();
        await expect(page.getByRole("dialog")).not.toBeVisible();
      }
      await page.getByRole("button", { name: "Add link", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(page.getByLabel("URL", { exact: true })).toBeFocused();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    });
  }
}
test("dashboard supports large text and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev-qa?data=worst");
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("invalid URL feedback retains the pasted link and title", async ({
  page,
}) => {
  await page.goto("/dev-qa?data=empty");
  await page.getByRole("button", { name: "Add link", exact: true }).click();
  await page
    .getByLabel("URL", { exact: true })
    .fill("ftp://example.com/reference");
  await page.getByLabel("Title Optional").fill("Keep my title");
  await page.getByRole("button", { name: "Save link", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Enter a complete" }),
  ).toBeVisible();
  await expect(page.getByLabel("URL", { exact: true })).toHaveValue(
    "ftp://example.com/reference",
  );
  await expect(page.getByLabel("Title Optional")).toHaveValue("Keep my title");
});

test("large library stays paginated", async ({ page }) => {
  await page.goto("/dev-qa?data=many");
  await expect(page.getByTestId("saved-link")).toHaveCount(24);
  await expect(
    page.getByRole("navigation", { name: "Library pages" }),
  ).toContainText("Page 1 of 21");
});

for (const width of [320, 1440]) {
  test(`dark library and capture dialog at ${width}px`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/dev-qa?data=worst");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator(".workspace-shell")).toHaveCSS(
      "background-color",
      "rgb(25, 26, 29)",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`dark-library-${width}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Add link", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCSS(
      "background-color",
      "rgb(36, 37, 41)",
    );
    await page.screenshot({
      path: info.outputPath(`dark-dialog-${width}.png`),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Switch to light mode", exact: true })
      .click();
    await expect(page.locator(".workspace-shell")).toHaveCSS(
      "background-color",
      "rgb(249, 248, 245)",
    );
  });
}
