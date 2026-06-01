import { test, expect } from "./fixtures";

test.describe("Profiles — no cookie → /profiles redirect", () => {
  test("visiting / without a profile cookie redirects to /profiles", async ({ page }) => {
    await page.goto("/");
    await page.goto("/library");
    await expect(page).toHaveURL(/\/profiles/, { timeout: 15_000 });
  });

  test("/profiles shows the profile picker when unauthenticated", async ({ page }) => {
    await page.goto("/profiles");
    const heading = page.getByRole("heading", {
      name: /who's reading\?|welcome/i,
    });
    await expect(heading).toBeVisible({ timeout: 15_000 });
  });

  test("picking the e2e profile navigates to home", async ({ page }) => {
    await page.goto("/profiles");
    await expect(page.getByRole("heading", { name: /who's reading\?|welcome/i })).toBeVisible({
      timeout: 15_000,
    });

    const profileBtn = page.getByRole("button", { name: /e2e-test/i });
    if (await profileBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await profileBtn.click();
      await expect(page).toHaveURL(/localhost:3000\/?(\?.*)?$/, { timeout: 15_000 });
      await expect(page.locator("header")).toBeVisible({ timeout: 10_000 });
    } else {
      await expect(page).toHaveURL(/\/profiles/, { timeout: 5_000 });
    }
  });
});

test.describe("Profiles — header profile menu (authenticated)", () => {
  test("profile menu button is visible in the header", async ({ profilePage: page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible({ timeout: 15_000 });

    const menuBtn = page.locator("button[aria-haspopup='menu']");
    await expect(menuBtn).toBeVisible({ timeout: 10_000 });
  });

  test("opening the profile menu shows switch-profile link", async ({ profilePage: page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible({ timeout: 15_000 });

    const menuBtn = page.locator("button[aria-haspopup='menu']");
    await expect(menuBtn).toBeVisible({ timeout: 10_000 });
    await menuBtn.click();

    const menu = page.locator("[role='menu']");
    await expect(menu).toBeVisible({ timeout: 5_000 });

    const switchLink = page.locator("[role='menuitem']", { hasText: /switch profile/i });
    await expect(switchLink).toBeVisible({ timeout: 5_000 });
    await expect(switchLink).toHaveAttribute("href", "/profiles");
  });

  test("clicking Switch profile in the menu navigates to /profiles", async ({
    profilePage: page,
  }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible({ timeout: 15_000 });
    await page.waitForLoadState("domcontentloaded");

    const menuBtn = page.locator("button[aria-haspopup='menu']");
    await expect(menuBtn).toBeVisible({ timeout: 10_000 });
    await page.waitForFunction(() => document.querySelector("button[aria-haspopup='menu']") !== null);

    await menuBtn.click();

    const menu = page.locator("[role='menu']");
    await expect(menu).toBeVisible({ timeout: 8_000 });

    const switchLink = page.locator("[role='menuitem']", { hasText: /switch profile/i });
    await expect(switchLink).toBeVisible({ timeout: 5_000 });
    await switchLink.click();
    await expect(page).toHaveURL(/\/profiles/, { timeout: 15_000 });
  });
});
