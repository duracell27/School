-- DropForeignKey
ALTER TABLE "SchoolTransaction" DROP CONSTRAINT "SchoolTransaction_lessonId_fkey";

-- AddForeignKey
ALTER TABLE "SchoolTransaction" ADD CONSTRAINT "SchoolTransaction_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
