CREATE TABLE "ScannerDevice" (
  "id" UUID NOT NULL,
  "kioskUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'เครื่องสแกน',
  "cameraIndex" INTEGER NOT NULL DEFAULT 0,
  "detectionIntervalSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
  "repeatCooldownSeconds" INTEGER NOT NULL DEFAULT 10,
  "lastSeenAt" TIMESTAMP(3),
  "lastSyncAt" TIMESTAMP(3),
  "pendingCount" INTEGER NOT NULL DEFAULT 0,
  "cameraActive" BOOLEAN NOT NULL DEFAULT false,
  "modelVersion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScannerDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScannerSyncEvent" (
  "eventId" UUID NOT NULL,
  "deviceId" UUID NOT NULL,
  "studentId" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "result" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScannerSyncEvent_pkey" PRIMARY KEY ("eventId")
);

CREATE INDEX "ScannerDevice_kioskUserId_idx" ON "ScannerDevice"("kioskUserId");
CREATE INDEX "ScannerSyncEvent_deviceId_capturedAt_idx" ON "ScannerSyncEvent"("deviceId", "capturedAt");

ALTER TABLE "ScannerDevice" ADD CONSTRAINT "ScannerDevice_kioskUserId_fkey"
  FOREIGN KEY ("kioskUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScannerSyncEvent" ADD CONSTRAINT "ScannerSyncEvent_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "ScannerDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
