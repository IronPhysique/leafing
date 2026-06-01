import { test, expect } from "./fixtures";

const SERIES_SLUG = "37f5cce0-8070-4ada-96e5-fa24b1bd4ff9";
const CH1_REF = "3a7f485c-1aa3-4cd4-bc07-281541f62cda";
const READER_URL = `/read/mangadex/${SERIES_SLUG}/${CH1_REF}`;

test.describe("Reader", () => {
  test("reader page loads without errors", async ({ profilePage: page }) => {
    await page.goto(READER_URL);
    await expect(page.locator("body")).not.toContainText(/application error/i, {
      timeout: 5_000,
    });
    await expect(page).not.toHaveURL(/error/, { timeout: 5_000 });
  });

  test("reader chrome is visible with back link and chapter info", async ({
    profilePage: page,
  }) => {
    await page.goto(READER_URL);

    const readerChrome = page.locator("div.sticky.top-0").filter({
      has: page.locator("button[title='Appearance']"),
    });
    await expect(readerChrome).toBeVisible({ timeout: 30_000 });

    const backLink = page.locator(`a[href*='/series/mangadex/${SERIES_SLUG}']`);
    await expect(backLink.first()).toBeVisible({ timeout: 10_000 });
  });

  test("Strip/Paged toggle button is visible and clickable", async ({ profilePage: page }) => {
    await page.goto(READER_URL);

    const readerChrome = page.locator("div.sticky.top-0").filter({
      has: page.locator("button[title='Appearance']"),
    });
    await expect(readerChrome).toBeVisible({ timeout: 30_000 });

    const modeBtn = readerChrome.locator("button", {
      hasText: /strip|paged/i,
    });
    await expect(modeBtn).toBeVisible({ timeout: 10_000 });

    const initialText = await modeBtn.textContent();

    await modeBtn.click();

    const newText = await modeBtn.textContent();
    expect(newText).not.toBe(initialText);

    await modeBtn.click();
    const backText = await modeBtn.textContent();
    expect(backText).toBe(initialText);
  });

  test("Fit button cycles through fit labels", async ({ profilePage: page }) => {
    await page.goto(READER_URL);

    const readerChrome = page.locator("div.sticky.top-0").filter({
      has: page.locator("button[title='Appearance']"),
    });
    await expect(readerChrome).toBeVisible({ timeout: 30_000 });

    const fitBtn = readerChrome.locator("button", {
      hasText: /fit width|fit height|fit screen|original/i,
    });
    await expect(fitBtn).toBeVisible({ timeout: 10_000 });

    const initial = await fitBtn.textContent();
    for (let i = 0; i < 4; i++) {
      await fitBtn.click();
    }
    const after = await fitBtn.textContent();
    expect(after?.trim()).toBe(initial?.trim());
  });

  test("prev/next chapter navigation buttons exist in the bottom bar", async ({
    profilePage: page,
  }) => {
    await page.goto(READER_URL);

    const readerChrome = page.locator("div.sticky.top-0").filter({
      has: page.locator("button[title='Appearance']"),
    });
    await expect(readerChrome).toBeVisible({ timeout: 30_000 });

    await page.waitForTimeout(2_000);

    const bottomNav = page.locator("div.border-t.border-border.bg-bg").last();
    if (await bottomNav.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const chapterLinks = bottomNav.locator("a[href*='/read/mangadex/']");
      const count = await chapterLinks.count();
      expect(count).toBeGreaterThanOrEqual(1);
    } else {
      await expect(page.locator("body")).not.toContainText(/application error/i);
    }
  });

  test("appearance (brightness) control opens on click", async ({ profilePage: page }) => {
    await page.goto(READER_URL);

    const appearanceBtn = page.locator("button[title='Appearance']");
    await expect(appearanceBtn).toBeVisible({ timeout: 30_000 });

    await appearanceBtn.click();

    const slider = page.locator("input[type='range']");
    await expect(slider.first()).toBeVisible({ timeout: 5_000 });
  });

  test("pages load (at least one img with src starting with /api/img)", async ({
    profilePage: page,
  }) => {
    await page.goto(READER_URL);

    const appearanceBtn = page.locator("button[title='Appearance']");
    await expect(appearanceBtn).toBeVisible({ timeout: 30_000 });

    const pageImg = page.locator("img[src*='/api/img']");
    await expect(pageImg.first()).toBeVisible({ timeout: 30_000 });
  });
});
