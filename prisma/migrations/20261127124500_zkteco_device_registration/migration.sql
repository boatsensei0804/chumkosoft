ALTER TABLE "ScannerDevice"
  ADD COLUMN "admsSerial" TEXT,
  ADD COLUMN "admsLocation" TEXT,
  ADD COLUMN "admsEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "admsLastSeenAt" TIMESTAMP(3),
  ADD COLUMN "admsLastSyncAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "ScannerDevice_admsSerial_key" ON "ScannerDevice"("admsSerial");
