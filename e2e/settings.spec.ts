import { test, expect } from "./fixtures";

test.describe("Settings page", () => {
  test("settings page renders without errors", async ({ profilePage: page }) => {
    await page.goto("/settings");
    await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/application error/i)).not.toBeVisible({ timeout: 5_000 });

    await expect(page.getByRole("heading", { name: /^Settings$/i })).toBeVisible({ timeout: 10_000 });
  });

  test("accent presets section renders with clickable preset buttons", async ({
    profilePage: page,
  }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /^Settings$/i })).toBeVisible({ timeout: 10_000 });

    const violetBtn = page.getByRole("button", { name: /violet/i });
    await expect(violetBtn).toBeVisible({ timeout: 10_000 });
  });

  test("clicking an accent preset changes the --accent CSS variable", async ({
    profilePage: page,
  }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /^Settings$/i })).toBeVisible({ timeout: 10_000 });

    const accentBefore = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()
    );

    const skyBtn = page.getByRole("button", { name: /^Sky$/i });
    await expect(skyBtn).toBeVisible({ timeout: 5_000 });
    await skyBtn.click();

    await page.waitForTimeout(300);

    const accentAfter = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()
    );

    expect(accentAfter).not.toBe(accentBefore);
    expect(accentAfter.length).toBeGreaterThan(0);

    const violetBtn = page.getByRole("button", { name: /^Violet$/i });
    if (await violetBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await violetBtn.click();
    }
  });

  test("toggling OLED background mode changes --bg CSS variable", async ({
    profilePage: page,
  }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /^Settings$/i })).toBeVisible({ timeout: 10_000 });

    const darkGrayBtn = page.getByRole("button", { name: /dark gray/i });
    const oledBtn = page.getByRole("button", { name: /oled black/i });

    await expect(oledBtn).toBeVisible({ timeout: 5_000 });

    const bgBefore = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()
    );

    await oledBtn.click();
    await page.waitForTimeout(300);

    const bgAfter = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()
    );

    expect(bgAfter).not.toBe(bgBefore);
    expect(bgAfter).toMatch(/#000|rgb\(0,\s*0,\s*0\)/i);

    await darkGrayBtn.click();
    await page.waitForTimeout(300);

    const bgReset = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()
    );
    expect(bgReset).not.toMatch(/#000000$|^#000$/);
  });

  test("pressing '?' opens the shortcut overlay", async ({ profilePage: page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /^Settings$/i })).toBeVisible({ timeout: 10_000 });

    await page.locator("body").click();

    await page.keyboard.press("?");

    const overlay = page.locator("[role='dialog'][aria-label='Keyboard shortcuts']");
    await expect(overlay).toBeVisible({ timeout: 5_000 });

    await expect(overlay.getByText(/cycle fit/i)).toBeVisible({ timeout: 3_000 });
  });

  test("shortcut overlay closes on Esc", async ({ profilePage: page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /^Settings$/i })).toBeVisible({ timeout: 10_000 });

    await page.locator("body").click();
    await page.keyboard.press("?");

    const overlay = page.locator("[role='dialog'][aria-label='Keyboard shortcuts']");
    await expect(overlay).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press("Escape");
    await expect(overlay).not.toBeVisible({ timeout: 5_000 });
  });

  test("shortcut overlay closes on backdrop click", async ({ profilePage: page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /^Settings$/i })).toBeVisible({ timeout: 10_000 });

    await page.locator("body").click();
    await page.keyboard.press("?");

    const overlay = page.locator("[role='dialog'][aria-label='Keyboard shortcuts']");
    await expect(overlay).toBeVisible({ timeout: 5_000 });

    await page.mouse.click(5, 5);
    await expect(overlay).not.toBeVisible({ timeout: 5_000 });
  });

  test("keyboard shortcuts table is visible in the Keyboard shortcuts section", async ({
    profilePage: page,
  }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /^Settings$/i })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/keyboard shortcuts/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/cycle page fit/i)).toBeVisible({ timeout: 5_000 });
  });
});
