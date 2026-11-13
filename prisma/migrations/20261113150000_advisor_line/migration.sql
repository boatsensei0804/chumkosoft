ALTER TABLE "Staff" ADD COLUMN "lineUserId" TEXT;
ALTER TABLE "Staff" ADD COLUMN "lineLinkCode" TEXT;
CREATE UNIQUE INDEX "Staff_lineLinkCode_key" ON "Staff"("lineLinkCode");
