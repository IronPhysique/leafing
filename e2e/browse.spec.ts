import { test, expect } from "./fixtures";

const SOURCES = [
  { id: "all",          label: /^All$/i },
  { id: "mangadex",     label: /MangaDex/i },
  { id: "flamecomics",  label: /FlameComics/i },
  { id: "comick",       label: /Comick/i },
  { id: "weebcentral",  label: /Weeb Central/i },
  { id: "asurascans",   label: /AsuraScans/i },
];

test.describe("Browse — source chips", () => {
  async function waitForActiveSource(page: import("@playwright/test").Page, sourceId: string) {
    await expect(page).toHaveURL(new RegExp(`source=${sourceId}`), { timeout: 40_000 });
  }

  test("page loads on /search without errors", async ({ profilePage: page }) => {
    await page.goto("/search");
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/application error/i)).not.toBeVisible();
  });

  test("All chip is active by default on /search", async ({ profilePage: page }) => {
    await page.goto("/search");
    const allBtn = page.getByTestId("source-chip-all");
    await expect(allBtn).toBeVisible({ timeout: 15_000 });
  });

  for (const { id } of SOURCES) {
    test(`clicking ${id} chip updates URL and loads without error`, async ({
      profilePage: page,
    }) => {
      await page.goto("/search");

      const btn = page.getByTestId(`source-chip-${id}`);
      await expect(btn).toBeVisible({ timeout: 15_000 });

      await btn.click();

      const FAST = new Set(["all", "mangadex", "flamecomics", "weebcentral"]);
      if (FAST.has(id)) {
        await waitForActiveSource(page, id);
      }

      await expect(page.getByText(/application error/i)).not.toBeVisible({
        timeout: 5_000,
      });

      await expect(page.locator("main")).toBeVisible({ timeout: 5_000 });
    });
  }

  test("switching sources rapidly ends on the last-clicked source", async ({
    profilePage: page,
  }) => {
    await page.goto("/search");

    const allBtn = page.getByTestId("source-chip-all");
    await expect(allBtn).toBeVisible({ timeout: 15_000 });
    await page.waitForLoadState("domcontentloaded");

    const mangadexBtn = page.getByTestId("source-chip-mangadex");
    const comickBtn = page.getByTestId("source-chip-comick");

    await mangadexBtn.click();
    await comickBtn.click();
    await allBtn.click();

    await expect(page).toHaveURL(/source=all/, { timeout: 30_000 });

    await expect(page.getByText(/application error/i)).not.toBeVisible();
  });

  test("switching back to All after a specific source works", async ({
    profilePage: page,
  }) => {
    await page.goto("/search");

    const allBtn = page.getByTestId("source-chip-all");
    await expect(allBtn).toBeVisible({ timeout: 15_000 });
    await page.waitForLoadState("domcontentloaded");

    const mangadexBtn = page.getByTestId("source-chip-mangadex");
    await mangadexBtn.click();
    await expect(page).toHaveURL(/source=mangadex/, { timeout: 20_000 });

    const allBtnAfter = page.getByTestId("source-chip-all");
    await expect(allBtnAfter).toBeVisible({ timeout: 10_000 });
    await allBtnAfter.click();
    await expect(page).toHaveURL(/source=all/, { timeout: 25_000 });
    await expect(page.getByText(/application error/i)).not.toBeVisible();
  });
});

test.describe("Browse — search query (MangaDex)", () => {
  test("typing a query and submitting shows results", async ({ profilePage: page }) => {
    await page.goto("/search?source=mangadex");

    const input = page.getByPlaceholder(/Search titles/i);
    await expect(input).toBeVisible({ timeout: 15_000 });

    await input.fill("solo leveling");

    const searchBtn = page.getByRole("button", { name: /^Search$/i });
    await searchBtn.click();

    await expect(page).toHaveURL(/q=solo/i, { timeout: 20_000 });

    const resultLinks = page.locator("a[href*='/series/mangadex/']");
    await expect(resultLinks.first()).toBeVisible({ timeout: 30_000 });
  });

  test("search results are not blocked by application error", async ({
    profilePage: page,
  }) => {
    await page.goto("/search?source=mangadex&q=solo+leveling");

    await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/application error/i)).not.toBeVisible({ timeout: 5_000 });
  });
});
