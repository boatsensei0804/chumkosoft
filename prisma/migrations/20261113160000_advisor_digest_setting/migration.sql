CREATE TABLE "AdvisorDigestSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "sendTime" TEXT NOT NULL DEFAULT '09:00',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdvisorDigestSetting_pkey" PRIMARY KEY ("id")
);
