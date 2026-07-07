-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "degreeBachelor" TEXT,
ADD COLUMN     "degreeMaster" TEXT,
ADD COLUMN     "fieldBachelor" TEXT,
ADD COLUMN     "fieldMaster" TEXT,
ADD COLUMN     "licenseExpiry" TIMESTAMP(3),
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "positionNumber" TEXT,
ADD COLUMN     "salary" INTEGER,
ADD COLUMN     "universityBachelor" TEXT,
ADD COLUMN     "universityMaster" TEXT;
