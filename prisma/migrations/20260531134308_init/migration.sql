-- CreateTable
CREATE TABLE "LibraryEntry" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverUrl" TEXT,
    "coverReferer" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "LibraryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadProgress" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "chapterRef" TEXT NOT NULL,
    "chapterNumber" TEXT,
    "page" INTEGER NOT NULL DEFAULT 0,
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Download" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "chapterRef" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "pageCount" INTEGER,
    "localDir" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Download_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceCache" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceCache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "LibraryEntry_lastReadAt_idx" ON "LibraryEntry"("lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryEntry_sourceId_slug_key" ON "LibraryEntry"("sourceId", "slug");

-- CreateIndex
CREATE INDEX "ReadProgress_sourceId_slug_idx" ON "ReadProgress"("sourceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ReadProgress_sourceId_slug_chapterRef_key" ON "ReadProgress"("sourceId", "slug", "chapterRef");

-- CreateIndex
CREATE INDEX "Download_sourceId_slug_idx" ON "Download"("sourceId", "slug");

-- CreateIndex
CREATE INDEX "Download_status_idx" ON "Download"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Download_sourceId_slug_chapterRef_key" ON "Download"("sourceId", "slug", "chapterRef");

-- CreateIndex
CREATE INDEX "SourceCache_expiresAt_idx" ON "SourceCache"("expiresAt");
