CREATE TYPE "LeaveKind" AS ENUM ('SICK', 'PERSONAL');
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "BehaviorPointSource" AS ENUM ('MANUAL', 'LATE_ENTRY');

CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "parentLineUserId" TEXT NOT NULL,
    "lineMessageId" TEXT NOT NULL,
    "kind" "LeaveKind" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "advisorLineTargets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "advisorNotifyRetryKey" TEXT NOT NULL,
    "advisorNotifiedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BehaviorPointEntry" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "source" "BehaviorPointSource" NOT NULL,
    "sourceKey" TEXT,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BehaviorPointEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeaveRequest_lineMessageId_key" ON "LeaveRequest"("lineMessageId");
CREATE UNIQUE INDEX "LeaveRequest_advisorNotifyRetryKey_key" ON "LeaveRequest"("advisorNotifyRetryKey");
CREATE INDEX "LeaveRequest_status_createdAt_idx" ON "LeaveRequest"("status", "createdAt");
CREATE INDEX "LeaveRequest_studentId_startDate_idx" ON "LeaveRequest"("studentId", "startDate");
CREATE INDEX "LeaveRequest_classroomId_status_idx" ON "LeaveRequest"("classroomId", "status");
CREATE UNIQUE INDEX "BehaviorPointEntry_sourceKey_key" ON "BehaviorPointEntry"("sourceKey");
CREATE INDEX "BehaviorPointEntry_termId_studentId_createdAt_idx" ON "BehaviorPointEntry"("termId", "studentId", "createdAt");

ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BehaviorPointEntry" ADD CONSTRAINT "BehaviorPointEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BehaviorPointEntry" ADD CONSTRAINT "BehaviorPointEntry_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
