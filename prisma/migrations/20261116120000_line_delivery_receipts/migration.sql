ALTER TABLE "LineOutboundMessage"
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "requestId" TEXT,
  ADD COLUMN "acceptedRequestId" TEXT;
