CREATE TYPE "DailyRollCallStatus" AS ENUM (
    'PRESENT',
    'LATE',
    'ABSENT',
    'SICK_LEAVE',
    'PERSONAL_LEAVE'
);

CREATE TABLE "DailyAttendance" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "DailyRollCallStatus" NOT NULL,
    "note" TEXT,
    "recordedById" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyAttendance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DailyAttendance_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DailyAttendance_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DailyAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DailyAttendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DailyAttendance_termId_studentId_date_key" ON "DailyAttendance"("termId", "studentId", "date");
CREATE INDEX "DailyAttendance_termId_date_classroomId_idx" ON "DailyAttendance"("termId", "date", "classroomId");
