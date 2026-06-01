import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const ENV_FILE = path.join(PROJECT_ROOT, "e2e", ".env.e2e");

const SEED_SCRIPT = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const profile = await prisma.profile.upsert({
    where: { id: 'e2e-test-profile' },
    update: {},
    create: { id: 'e2e-test-profile', name: 'e2e-test', avatar: '🤖' },
  });
  console.log(JSON.stringify({ id: profile.id }));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
`.trim().replace(/\n/g, " ");

export default async function globalSetup() {
  let profileId: string;

  try {
    const raw = execSync(
      `docker compose exec -T web node -e "${SEED_SCRIPT.replace(/"/g, '\\"')}"`,
      { cwd: PROJECT_ROOT, timeout: 30_000 }
    )
      .toString()
      .trim();

    const jsonLine = raw.split("\n").find((l) => l.trim().startsWith("{"));
    if (!jsonLine) throw new Error(`No JSON in output:\n${raw}`);
    const parsed = JSON.parse(jsonLine.trim()) as { id: string };
    profileId = parsed.id;
  } catch (err) {
    console.warn(
      "[e2e global-setup] Could not seed profile via docker compose exec:",
      (err as Error).message
    );
    profileId = "e2e-test-profile";
  }

  fs.writeFileSync(ENV_FILE, `E2E_PROFILE_ID=${profileId}\n`, "utf8");

  process.env.E2E_PROFILE_ID = profileId;

  console.log(`[e2e global-setup] test profile id: ${profileId}`);
}
