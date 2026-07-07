/*
  Warnings:

  - Added the required column `roomId` to the `CourseOffering` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CourseOffering" ADD COLUMN     "roomId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
