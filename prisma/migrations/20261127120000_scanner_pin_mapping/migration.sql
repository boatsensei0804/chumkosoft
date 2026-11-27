CREATE TABLE "ScannerPinMapping" (
    "deviceId" UUID NOT NULL,
    "pin" TEXT NOT NULL,
    "studentId" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScannerPinMapping_pkey" PRIMARY KEY ("deviceId", "pin"),
    CONSTRAINT "ScannerPinMapping_pin_check" CHECK ("pin" ~ '^[0-9]{1,9}$')
);

CREATE INDEX "ScannerPinMapping_studentId_idx" ON "ScannerPinMapping"("studentId");
ALTER TABLE "ScannerPinMapping" ADD CONSTRAINT "ScannerPinMapping_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "ScannerDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScannerPinMapping" ADD CONSTRAINT "ScannerPinMapping_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
