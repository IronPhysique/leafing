import { test as base, expect, type Page, type BrowserContext } from "@playwright/test";
import path from "path";
import fs from "fs";

function getTestProfileId(): string {
  if (process.env.E2E_PROFILE_ID) return process.env.E2E_PROFILE_ID;

  const envFile = path.resolve(__dirname, ".env.e2e");
  if (fs.existsSync(envFile)) {
    const line = fs
      .readFileSync(envFile, "utf8")
      .split("\n")
      .find((l) => l.startsWith("E2E_PROFILE_ID="));
    if (line) return line.split("=")[1].trim();
  }

  return "e2e-test-profile";
}

type Fixtures = {
  profilePage: Page;
  profileContext: BrowserContext;
};

export const test = base.extend<Fixtures>({
  profileContext: async ({ browser }, use) => {
    const profileId = getTestProfileId();
    const baseURL = (test.info().project.use as { baseURL?: string }).baseURL ?? "http://localhost:3000";

    const parsed = new URL(baseURL);

    const ctx = await browser.newContext({ baseURL });
    await ctx.addCookies([
      {
        name: "mr_profile",
        value: profileId,
        domain: parsed.hostname,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    await use(ctx);
    await ctx.close();
  },

  profilePage: async ({ profileContext }, use) => {
    const page = await profileContext.newPage();
    await use(page);
    await page.close();
  },
});

export { expect };
