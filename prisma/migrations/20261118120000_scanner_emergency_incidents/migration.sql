CREATE TYPE "EmergencyIncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

CREATE TABLE "EmergencyIncident" (
    "id" TEXT NOT NULL,
    "requestId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "deviceNameSnapshot" TEXT NOT NULL,
    "reportedByKioskId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "detail" TEXT,
    "status" "EmergencyIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "lineTargetCount" INTEGER NOT NULL DEFAULT 0,
    "lineAcceptedCount" INTEGER NOT NULL DEFAULT 0,
    "lineFailedCount" INTEGER NOT NULL DEFAULT 0,
    "acknowledgedById" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyIncident_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmergencyIncident_requestId_key" ON "EmergencyIncident"("requestId");
CREATE INDEX "EmergencyIncident_status_createdAt_idx" ON "EmergencyIncident"("status", "createdAt");
CREATE INDEX "EmergencyIncident_deviceId_createdAt_idx" ON "EmergencyIncident"("deviceId", "createdAt");

ALTER TABLE "EmergencyIncident" ADD CONSTRAINT "EmergencyIncident_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "ScannerDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmergencyIncident" ADD CONSTRAINT "EmergencyIncident_reportedByKioskId_fkey"
    FOREIGN KEY ("reportedByKioskId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmergencyIncident" ADD CONSTRAINT "EmergencyIncident_acknowledgedById_fkey"
    FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmergencyIncident" ADD CONSTRAINT "EmergencyIncident_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LineOutboundMessage" ADD COLUMN "emergencyIncidentId" TEXT;
CREATE INDEX "LineOutboundMessage_emergencyIncidentId_status_idx"
    ON "LineOutboundMessage"("emergencyIncidentId", "status");
ALTER TABLE "LineOutboundMessage" ADD CONSTRAINT "LineOutboundMessage_emergencyIncidentId_fkey"
    FOREIGN KEY ("emergencyIncidentId") REFERENCES "EmergencyIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
