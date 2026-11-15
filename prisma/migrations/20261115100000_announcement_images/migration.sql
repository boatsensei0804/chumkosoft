ALTER TABLE "LineAnnouncement"
  ADD COLUMN "imageId" TEXT,
  ADD COLUMN "imageKey" TEXT,
  ADD COLUMN "imagePreviewKey" TEXT,
  ADD COLUMN "imageSha256" TEXT;
CREATE UNIQUE INDEX "LineAnnouncement_imageId_key" ON "LineAnnouncement"("imageId");
