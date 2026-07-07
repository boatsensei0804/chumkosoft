-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'KIOSK';

-- AlterTable
ALTER TABLE "Guardian" ADD COLUMN     "lineUserId" TEXT;

-- CreateTable
CREATE TABLE "FaceTemplate" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "imageKey" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaceTemplate_studentId_idx" ON "FaceTemplate"("studentId");

-- AddForeignKey
ALTER TABLE "FaceTemplate" ADD CONSTRAINT "FaceTemplate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
