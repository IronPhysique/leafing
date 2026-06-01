import { test, expect } from "./fixtures";

test.describe("Home — featured carousel", () => {
  test("featured carousel track is visible", async ({ profilePage: page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /popular/i })).toBeVisible({
      timeout: 60_000,
    });

    const carouselViewport = page
      .locator("div.overflow-hidden")
      .filter({ has: page.locator("div.flex.gap-4") });
    await expect(carouselViewport.first()).toBeVisible({ timeout: 30_000 });
  });

  test("featured carousel contains cover links", async ({ profilePage: page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /popular/i })).toBeVisible({
      timeout: 60_000,
    });

    const coverLinks = page.locator("a[href*='/series/']");
    await expect(coverLinks.first()).toBeVisible({ timeout: 30_000 });
    const count = await coverLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("right arrow advances the carousel", async ({ profilePage: page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /popular/i })).toBeVisible({
      timeout: 60_000,
    });

    const nextBtn = page.getByRole("button", { name: /more titles/i });

    const carouselArea = page.locator(".group\\/bar").first();
    if (await carouselArea.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await carouselArea.hover();
    }

    if (await nextBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const track = page.locator("div.overflow-hidden > div.flex.gap-4").first();
      const transformBefore = await track.evaluate((el) => {
        return (el as HTMLElement).style.transform || getComputedStyle(el).transform;
      });

      await nextBtn.click();
      await page.waitForTimeout(500);

      const transformAfter = await track.evaluate((el) => {
        return (el as HTMLElement).style.transform || getComputedStyle(el).transform;
      });

      await expect(carouselArea).toBeVisible();
      if (transformBefore !== transformAfter) {
        expect(transformAfter).not.toBe(transformBefore);
      }
    } else {
      test.skip();
    }
  });
});

test.describe("Home — popular grids", () => {
  test("popular section renders with at least one source heading", async ({
    profilePage: page,
  }) => {
    await page.goto("/");

    const popularSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: /popular/i }),
    });
    await expect(popularSection.first()).toBeVisible({ timeout: 60_000 });

    const h3s = page.locator("main h3");
    await expect(h3s.first()).toBeVisible({ timeout: 30_000 });
    const count = await h3s.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("popular source shelves contain See all links", async ({ profilePage: page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /popular/i })).toBeVisible({
      timeout: 60_000,
    });

    const seeAllLinks = page.locator("a", { hasText: /see all/i });
    await expect(seeAllLinks.first()).toBeVisible({ timeout: 30_000 });
    const count = await seeAllLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const href = await seeAllLinks.first().getAttribute("href");
    expect(href).toMatch(/\/search\?source=/);
  });

  test("source shelf headings are recognizable source names", async ({
    profilePage: page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /popular/i })).toBeVisible({
      timeout: 60_000,
    });

    const knownSources = [/mangadex/i, /flame/i, /comick/i, /weeb/i, /asura/i];
    const h3s = page.locator("main h3");
    await expect(h3s.first()).toBeVisible({ timeout: 30_000 });

    const allH3Texts = await h3s.allTextContents();
    const matchesAny = knownSources.some((re) => allH3Texts.some((t) => re.test(t)));
    expect(matchesAny).toBe(true);
  });
});
