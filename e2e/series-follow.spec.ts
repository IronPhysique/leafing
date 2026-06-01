import { test, expect } from "./fixtures";

const MD_SLUG = "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0";
const SERIES_URL = `/series/mangadex/${MD_SLUG}`;

test.describe.configure({ mode: "serial" });

test.describe("Series follow — MangaDex", () => {
  async function ensureUnfollowed(page: import("@playwright/test").Page) {
    await page.goto(SERIES_URL);
    await page.waitForFunction(
      () => {
        const btns = Array.from(document.querySelectorAll("button"));
        return btns.some((b) => b.textContent?.includes("Follow") || b.textContent?.includes("Following"));
      },
      { timeout: 30_000 },
    );
    const followBtn = page.locator("button", { hasText: /Follow/i }).first();
    const text = await followBtn.textContent({ timeout: 5_000 });
    if (text && /following/i.test(text)) {
      await followBtn.click();
      await expect(page.locator("button", { hasText: "+ Follow" })).toBeVisible({
        timeout: 15_000,
      });
    }
  }

  test.beforeEach(async ({ profilePage: page }) => {
    await ensureUnfollowed(page);
  });

  test.afterEach(async ({ profilePage: page }) => {
    await ensureUnfollowed(page);
  });

  test("series page loads with a Follow button", async ({ profilePage: page }) => {
    await page.goto(SERIES_URL);

    await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/application error/i)).not.toBeVisible({ timeout: 5_000 });

    const followBtn = page.locator("button", { hasText: /Follow/i });
    await expect(followBtn).toBeVisible({ timeout: 30_000 });
  });

  test("clicking Follow toggles the button to Following and shows a toast", async ({
    profilePage: page,
  }) => {
    await page.goto(SERIES_URL);
    await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });

    const followBtn = page.locator("button", { hasText: "+ Follow" });
    await expect(followBtn).toBeVisible({ timeout: 30_000 });

    await followBtn.click();

    const followingBtn = page.locator("button", { hasText: "Following" });
    await expect(followingBtn).toBeVisible({ timeout: 10_000 });

    const toastItem = page.locator("[data-sonner-toaster] li");
    await expect(toastItem.first()).toBeVisible({ timeout: 8_000 });
    await expect(toastItem.first()).toContainText(/followed/i, { timeout: 5_000 });
  });

  test("followed series appears in /library", async ({ profilePage: page }) => {
    await page.goto(SERIES_URL);
    await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });

    const followBtn = page.locator("button", { hasText: "+ Follow" });
    await expect(followBtn).toBeVisible({ timeout: 30_000 });
    await followBtn.click();
    await expect(page.locator("button", { hasText: "Following" })).toBeVisible({ timeout: 10_000 });

    await page.goto("/library");
    await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });

    const seriesLink = page.locator(`a[href*='/series/mangadex/${MD_SLUG}']`);
    await expect(seriesLink.first()).toBeVisible({ timeout: 15_000 });
  });

  test("clicking Following again unfollows and shows Unfollowed toast", async ({
    profilePage: page,
  }) => {
    await page.goto(SERIES_URL);
    await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });

    const followBtn = page.locator("button", { hasText: "+ Follow" });
    await expect(followBtn).toBeVisible({ timeout: 30_000 });
    await followBtn.click();
    await expect(page.locator("button", { hasText: "Following" })).toBeVisible({ timeout: 10_000 });

    await page.locator("button", { hasText: "Following" }).click();
    await expect(page.locator("button", { hasText: "+ Follow" })).toBeVisible({ timeout: 10_000 });

    const toastItem = page.locator("[data-sonner-toaster] li");
    await expect(toastItem.first()).toBeVisible({ timeout: 8_000 });
    await expect(toastItem.first()).toContainText(/unfollowed/i, { timeout: 5_000 });
  });
});
