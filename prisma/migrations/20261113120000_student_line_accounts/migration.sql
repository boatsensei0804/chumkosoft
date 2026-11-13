CREATE TABLE "StudentLineAccount" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lineUserId" TEXT,
    "lineLinkCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentLineAccount_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StudentLineAccount_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StudentLineAccount_lineLinkCode_key" ON "StudentLineAccount"("lineLinkCode");
CREATE INDEX "StudentLineAccount_studentId_idx" ON "StudentLineAccount"("studentId");
CREATE INDEX "StudentLineAccount_lineUserId_idx" ON "StudentLineAccount"("lineUserId");
