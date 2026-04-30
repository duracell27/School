-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."EmploymentStatus" AS ENUM ('WORKING', 'FIRED');

-- CreateEnum
CREATE TYPE "public"."LessonStatus" AS ENUM ('PLANNED', 'CONDUCTED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "public"."PaymentLessonType" AS ENUM ('DEBT', 'PREPAID');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'TEACHER');

-- CreateEnum
CREATE TYPE "public"."SchoolTransactionReason" AS ENUM ('OVERPAYMENT_WRITEOFF', 'UNDERPAYMENT_TOPUP');

-- CreateTable
CREATE TABLE "public"."Child" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'UA',
    "avatar" TEXT,
    "hireDate" TIMESTAMP(3),
    "graduationDate" TIMESTAMP(3),
    "parentContacts" JSONB NOT NULL DEFAULT '[]',
    "timezone" TEXT NOT NULL,
    "teacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lesson" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "status" "public"."LessonStatus" NOT NULL DEFAULT 'PLANNED',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "originalStartDate" TIMESTAMP(3),
    "originalEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LessonPrice" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentLesson" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "type" "public"."PaymentLessonType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SchoolTransaction" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reason" "public"."SchoolTransactionReason" NOT NULL,
    "paymentId" TEXT,
    "adminId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'TEACHER',
    "avatar" TEXT,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hireDate" TIMESTAMP(3),
    "status" "public"."EmploymentStatus" NOT NULL DEFAULT 'WORKING',
    "terminationDate" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lesson_childId_idx" ON "public"."Lesson"("childId" ASC);

-- CreateIndex
CREATE INDEX "Lesson_teacherId_startDate_idx" ON "public"."Lesson"("teacherId" ASC, "startDate" ASC);

-- CreateIndex
CREATE INDEX "LessonPrice_childId_teacherId_effectiveDate_idx" ON "public"."LessonPrice"("childId" ASC, "teacherId" ASC, "effectiveDate" ASC);

-- CreateIndex
CREATE INDEX "Payment_childId_teacherId_idx" ON "public"."Payment"("childId" ASC, "teacherId" ASC);

-- CreateIndex
CREATE INDEX "Payment_date_idx" ON "public"."Payment"("date" ASC);

-- CreateIndex
CREATE INDEX "Payment_teacherId_idx" ON "public"."Payment"("teacherId" ASC);

-- CreateIndex
CREATE INDEX "PaymentLesson_lessonId_idx" ON "public"."PaymentLesson"("lessonId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLesson_paymentId_lessonId_key" ON "public"."PaymentLesson"("paymentId" ASC, "lessonId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."Child" ADD CONSTRAINT "Child_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lesson" ADD CONSTRAINT "Lesson_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lesson" ADD CONSTRAINT "Lesson_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LessonPrice" ADD CONSTRAINT "LessonPrice_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LessonPrice" ADD CONSTRAINT "LessonPrice_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentLesson" ADD CONSTRAINT "PaymentLesson_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "public"."Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentLesson" ADD CONSTRAINT "PaymentLesson_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SchoolTransaction" ADD CONSTRAINT "SchoolTransaction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SchoolTransaction" ADD CONSTRAINT "SchoolTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
