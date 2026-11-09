ALTER TABLE "FaceTemplate"
ADD COLUMN "modelId" TEXT NOT NULL DEFAULT 'face-api-v1',
ADD COLUMN "uploadId" TEXT;

CREATE UNIQUE INDEX "FaceTemplate_uploadId_key" ON "FaceTemplate"("uploadId");
