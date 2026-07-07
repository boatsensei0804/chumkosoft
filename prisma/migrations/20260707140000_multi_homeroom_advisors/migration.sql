-- CreateTable: homeroom-advisor join (a classroom may have more than one ครูที่ปรึกษา)
CREATE TABLE "ClassroomAdvisor" (
    "classroomId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomAdvisor_pkey" PRIMARY KEY ("classroomId","staffId")
);

-- CreateIndex
CREATE INDEX "ClassroomAdvisor_staffId_idx" ON "ClassroomAdvisor"("staffId");

-- Preserve existing single homeroom teacher: copy into the new join before dropping the column.
INSERT INTO "ClassroomAdvisor" ("classroomId", "staffId", "assignedAt")
SELECT "id", "homeroomTeacherId", CURRENT_TIMESTAMP
FROM "Classroom"
WHERE "homeroomTeacherId" IS NOT NULL;

-- DropForeignKey + DropColumn: retire the single-teacher column
ALTER TABLE "Classroom" DROP CONSTRAINT "Classroom_homeroomTeacherId_fkey";
ALTER TABLE "Classroom" DROP COLUMN "homeroomTeacherId";

-- AddForeignKey
ALTER TABLE "ClassroomAdvisor" ADD CONSTRAINT "ClassroomAdvisor_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassroomAdvisor" ADD CONSTRAINT "ClassroomAdvisor_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
