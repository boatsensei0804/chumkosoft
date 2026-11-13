CREATE TYPE "LineAnnouncementKind" AS ENUM ('NEWS', 'EMERGENCY');
CREATE TYPE "LineAnnouncementBatchStatus" AS ENUM ('PENDING', 'ACCEPTED', 'FAILED');

CREATE TABLE "LineAnnouncement" (
    "id" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "kind" "LineAnnouncementKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LineAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LineAnnouncementBatch" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "batchNumber" INTEGER NOT NULL,
    "recipients" JSONB NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "retryKey" TEXT NOT NULL,
    "status" "LineAnnouncementBatchStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LineAnnouncementBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LineAnnouncement_requestKey_key" ON "LineAnnouncement"("requestKey");
CREATE INDEX "LineAnnouncement_createdAt_idx" ON "LineAnnouncement"("createdAt");
CREATE UNIQUE INDEX "LineAnnouncementBatch_retryKey_key" ON "LineAnnouncementBatch"("retryKey");
CREATE UNIQUE INDEX "LineAnnouncementBatch_announcementId_batchNumber_key" ON "LineAnnouncementBatch"("announcementId", "batchNumber");

ALTER TABLE "LineAnnouncementBatch" ADD CONSTRAINT "LineAnnouncementBatch_announcementId_fkey"
    FOREIGN KEY ("announcementId") REFERENCES "LineAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
