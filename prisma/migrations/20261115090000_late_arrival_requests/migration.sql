ALTER TYPE "LeaveKind" ADD VALUE 'LATE';
ALTER TABLE "LeaveRequest" ADD COLUMN "expectedArrivalTime" TEXT;
