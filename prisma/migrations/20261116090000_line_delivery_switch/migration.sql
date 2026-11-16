CREATE TABLE "LineDeliverySetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LineDeliverySetting_pkey" PRIMARY KEY ("id")
);
