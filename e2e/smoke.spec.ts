import { test, expect } from "./fixtures";

test.describe("Home page (authenticated)", () => {
  test("renders the Leafing header", async ({ profilePage: page }) => {
    await page.goto("/");

    await expect(page.locator("header")).toBeVisible({ timeout: 30_000 });

    const brand = page.getByRole("link", { name: /leafing/i });
    await expect(brand).toBeVisible({ timeout: 10_000 });
  });

  test("renders the Popular section heading", async ({ profilePage: page }) => {
    await page.goto("/");

    const popularHeading = page.getByRole("heading", { name: /popular/i });
    await expect(popularHeading).toBeVisible({ timeout: 45_000 });
  });

  test("Popular section contains at least one source shelf heading", async ({ profilePage: page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /popular/i })).toBeVisible({
      timeout: 45_000,
    });

    const main = page.locator("main");
    const shelfHeadings = main.locator("h3");
    await expect(shelfHeadings.first()).toBeVisible({ timeout: 30_000 });
    const count = await shelfHeadings.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("page title includes Leafing", async ({ profilePage: page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/leafing/i, { timeout: 15_000 });
  });
});

test.describe("/profiles — unauthenticated", () => {
  test("shows the profile picker page", async ({ page }) => {
    await page.goto("/profiles");

    const heading = page.getByRole("heading", {
      name: /who's reading\?|welcome/i,
    });
    await expect(heading).toBeVisible({ timeout: 15_000 });
  });

  test("home redirects to /profiles when cookie is absent", async ({ page }) => {
    await page.goto("/library");
    await expect(page).toHaveURL(/\/profiles/, { timeout: 15_000 });
  });

  test("/profiles page title includes Leafing", async ({ page }) => {
    await page.goto("/profiles");
    await expect(page).toHaveTitle(/leafing/i, { timeout: 15_000 });
  });
});

test.describe("Navigation (authenticated)", () => {
  test("nav links are present in the header", async ({ profilePage: page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible({ timeout: 15_000 });

    const nav = page.locator("header nav");
    await expect(nav.getByRole("link", { name: /library/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /browse/i })).toBeVisible();
  });

  test("Browse page loads without errors", async ({ profilePage: page }) => {
    await page.goto("/search");
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/application error/i)).not.toBeVisible();
  });

  test("Library page renders (may be empty)", async ({ profilePage: page }) => {
    await page.goto("/library");
    await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/application error/i)).not.toBeVisible();
  });
});
