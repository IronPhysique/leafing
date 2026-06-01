-- CreateTable: Profile
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- Seed the default "Reader" profile with a stable cuid-style id.
-- Using gen_random_uuid() cast to text is safe for a local app; we keep
-- the standard cuid prefix pattern for visual consistency.
INSERT INTO "Profile" ("id", "name", "avatar", "createdAt")
VALUES ('default_reader_profile_seed_001', 'Reader', '📖', NOW());

-- ─── LibraryEntry ─────────────────────────────────────────────────────────────
-- Add profileId as nullable, backfill, then make NOT NULL.
ALTER TABLE "LibraryEntry" ADD COLUMN "profileId" TEXT;

UPDATE "LibraryEntry" SET "profileId" = 'default_reader_profile_seed_001' WHERE "profileId" IS NULL;

ALTER TABLE "LibraryEntry" ALTER COLUMN "profileId" SET NOT NULL;

-- Drop old unique constraint and add new one that includes profileId.
DROP INDEX "LibraryEntry_sourceId_slug_key";
CREATE UNIQUE INDEX "LibraryEntry_profileId_sourceId_slug_key" ON "LibraryEntry"("profileId", "sourceId", "slug");
CREATE INDEX "LibraryEntry_profileId_idx" ON "LibraryEntry"("profileId");

-- AddForeignKey for LibraryEntry -> Profile
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── ReadProgress ─────────────────────────────────────────────────────────────
ALTER TABLE "ReadProgress" ADD COLUMN "profileId" TEXT;

UPDATE "ReadProgress" SET "profileId" = 'default_reader_profile_seed_001' WHERE "profileId" IS NULL;

ALTER TABLE "ReadProgress" ALTER COLUMN "profileId" SET NOT NULL;

DROP INDEX "ReadProgress_sourceId_slug_chapterRef_key";
CREATE UNIQUE INDEX "ReadProgress_profileId_sourceId_slug_chapterRef_key" ON "ReadProgress"("profileId", "sourceId", "slug", "chapterRef");
CREATE INDEX "ReadProgress_profileId_idx" ON "ReadProgress"("profileId");

ALTER TABLE "ReadProgress" ADD CONSTRAINT "ReadProgress_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Category ─────────────────────────────────────────────────────────────────
ALTER TABLE "Category" ADD COLUMN "profileId" TEXT;

UPDATE "Category" SET "profileId" = 'default_reader_profile_seed_001' WHERE "profileId" IS NULL;

ALTER TABLE "Category" ALTER COLUMN "profileId" SET NOT NULL;

DROP INDEX "Category_name_key";
CREATE UNIQUE INDEX "Category_profileId_name_key" ON "Category"("profileId", "name");
CREATE INDEX "Category_profileId_idx" ON "Category"("profileId");

ALTER TABLE "Category" ADD CONSTRAINT "Category_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
