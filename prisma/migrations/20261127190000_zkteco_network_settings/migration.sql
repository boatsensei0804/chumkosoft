CREATE TABLE "ZktecoNetworkSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "allowedIps" TEXT[],
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ZktecoNetworkSetting_pkey" PRIMARY KEY ("id")
);
