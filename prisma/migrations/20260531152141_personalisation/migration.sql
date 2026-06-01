-- AlterTable
ALTER TABLE "LibraryEntry" ADD COLUMN     "anilistId" INTEGER,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "titleEnglish" TEXT,
ADD COLUMN     "titleNative" TEXT,
ADD COLUMN     "titleRomaji" TEXT,
ADD COLUMN     "unreadCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ReadProgress" ADD COLUMN     "scrollOffset" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "KnownChapter" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "chapterRef" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnownChapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnownChapter_sourceId_slug_idx" ON "KnownChapter"("sourceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "KnownChapter_sourceId_slug_chapterRef_key" ON "KnownChapter"("sourceId", "slug", "chapterRef");
