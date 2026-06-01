import { test, expect } from "./fixtures";

test.describe("Command palette", () => {
  test("Cmd-K opens the command palette", async ({ profilePage: page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible({ timeout: 15_000 });

    await page.keyboard.press("Control+k");

    const input = page.locator("input[placeholder*='Search']");
    await expect(input).toBeVisible({ timeout: 5_000 });
  });

  test("palette can be opened via the search bar click", async ({ profilePage: page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible({ timeout: 15_000 });

    const searchBarBtn = page.locator("header button[aria-label='Open search']");
    await expect(searchBarBtn).toBeVisible({ timeout: 10_000 });
    await searchBarBtn.click();

    const input = page.locator("input[placeholder*='Search']");
    await expect(input).toBeVisible({ timeout: 5_000 });
  });

  test("'/' key opens the palette when not in a text field", async ({ profilePage: page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible({ timeout: 15_000 });

    await page.locator("body").click();
    await page.keyboard.press("/");

    const input = page.locator("input[placeholder*='Search']");
    await expect(input).toBeVisible({ timeout: 5_000 });
  });

  test("typing 'solo' shows a Manga group with results", async ({ profilePage: page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible({ timeout: 15_000 });

    await page.keyboard.press("Control+k");

    const input = page.locator("input[placeholder*='Search']");
    await expect(input).toBeVisible({ timeout: 5_000 });

    await input.fill("solo");

    const mangaGroup = page.locator("[cmdk-group-heading]", { hasText: /manga/i });
    await expect(mangaGroup).toBeVisible({ timeout: 20_000 });

    const mangaItems = page.locator("[cmdk-item]").filter({ hasNot: page.locator("[cmdk-group-heading]") });
    const count = await mangaItems.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("selecting a result from the palette navigates to a series page", async ({
    profilePage: page,
  }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible({ timeout: 15_000 });

    await page.keyboard.press("Control+k");

    const input = page.locator("input[placeholder*='Search']");
    await expect(input).toBeVisible({ timeout: 5_000 });

    await input.fill("solo leveling");

    const mangaGroup = page.locator("[cmdk-group-heading]", { hasText: /manga/i });
    await expect(mangaGroup).toBeVisible({ timeout: 20_000 });

    const mangaGroupContainer = page.locator("[cmdk-group]").filter({
      has: page.locator("[cmdk-group-heading]", { hasText: /manga/i }),
    });
    const firstMangaItem = mangaGroupContainer.locator("[cmdk-item]").first();
    await expect(firstMangaItem).toBeVisible({ timeout: 5_000 });
    await firstMangaItem.click();

    await expect(page).toHaveURL(/\/series\//, { timeout: 15_000 });
  });

  test("clicking the backdrop closes the palette", async ({ profilePage: page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible({ timeout: 15_000 });

    await page.keyboard.press("Control+k");

    const input = page.locator("input[placeholder*='Search']");
    await expect(input).toBeVisible({ timeout: 5_000 });

    await page.mouse.click(10, 10);

    await expect(input).not.toBeVisible({ timeout: 5_000 });
  });
});
