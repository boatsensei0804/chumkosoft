-- Student: PDPA face consent
ALTER TABLE "Student" ADD COLUMN "faceConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Student" ADD COLUMN "faceConsentAt" TIMESTAMP(3);

-- Guardian: one-time LINE link code
ALTER TABLE "Guardian" ADD COLUMN "lineLinkCode" TEXT;
CREATE UNIQUE INDEX "Guardian_lineLinkCode_key" ON "Guardian"("lineLinkCode");
