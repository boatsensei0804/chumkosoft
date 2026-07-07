-- SchoolEntry late flag
ALTER TABLE "SchoolEntry" ADD COLUMN "isLate" BOOLEAN NOT NULL DEFAULT false;

-- ScanSetting singleton
CREATE TABLE "ScanSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "scanStartTime" TEXT NOT NULL DEFAULT '06:30',
    "lateAfterTime" TEXT NOT NULL DEFAULT '08:00',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanSetting_pkey" PRIMARY KEY ("id")
);
