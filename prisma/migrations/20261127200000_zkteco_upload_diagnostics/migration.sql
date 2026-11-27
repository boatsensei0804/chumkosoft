ALTER TABLE "ScannerDevice"
  ADD COLUMN "admsLastUploadAt" TIMESTAMP(3),
  ADD COLUMN "admsLastUploadResult" JSONB;
