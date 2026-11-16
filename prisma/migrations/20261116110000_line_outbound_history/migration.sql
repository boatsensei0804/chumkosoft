CREATE TYPE "LineOutboundStatus" AS ENUM ('ACCEPTED', 'FAILED');
CREATE TABLE "LineOutboundMessage" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "recipientLabel" TEXT,
  "status" "LineOutboundStatus" NOT NULL,
  "errorCode" TEXT,
  "retryKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LineOutboundMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LineOutboundMessage_retryKey_key" ON "LineOutboundMessage"("retryKey");
CREATE INDEX "LineOutboundMessage_createdAt_idx" ON "LineOutboundMessage"("createdAt");
CREATE INDEX "LineOutboundMessage_status_createdAt_idx" ON "LineOutboundMessage"("status", "createdAt");
