-- AlterEnum
ALTER TYPE "SchoolTransactionReason" ADD VALUE 'LESSON_SCHOOL_SHARE';

-- DropForeignKey
ALTER TABLE "SchoolTransaction" DROP CONSTRAINT "SchoolTransaction_adminId_fkey";

-- AlterTable
ALTER TABLE "SchoolTransaction" ADD COLUMN     "lessonId" TEXT,
ALTER COLUMN "adminId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TeacherCommission" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "percentage" DECIMAL(65,30) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherEarning" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "paymentLessonId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "percentage" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherPayout" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "adminId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherCommission_teacherId_effectiveFrom_idx" ON "TeacherCommission"("teacherId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherEarning_paymentLessonId_key" ON "TeacherEarning"("paymentLessonId");

-- CreateIndex
CREATE INDEX "TeacherEarning_teacherId_idx" ON "TeacherEarning"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherPayout_teacherId_idx" ON "TeacherPayout"("teacherId");

-- AddForeignKey
ALTER TABLE "SchoolTransaction" ADD CONSTRAINT "SchoolTransaction_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolTransaction" ADD CONSTRAINT "SchoolTransaction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherCommission" ADD CONSTRAINT "TeacherCommission_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherCommission" ADD CONSTRAINT "TeacherCommission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherEarning" ADD CONSTRAINT "TeacherEarning_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherEarning" ADD CONSTRAINT "TeacherEarning_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherEarning" ADD CONSTRAINT "TeacherEarning_paymentLessonId_fkey" FOREIGN KEY ("paymentLessonId") REFERENCES "PaymentLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherPayout" ADD CONSTRAINT "TeacherPayout_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherPayout" ADD CONSTRAINT "TeacherPayout_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
