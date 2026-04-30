-- CreateIndex: SchoolTransaction(lessonId, reason) for fast LESSON_SCHOOL_SHARE deletes
CREATE INDEX "SchoolTransaction_lessonId_reason_idx" ON "SchoolTransaction"("lessonId", "reason");

-- DropIndex: replace plain index with unique constraint on TeacherCommission(teacherId, effectiveFrom)
DROP INDEX "TeacherCommission_teacherId_effectiveFrom_idx";

-- CreateUnique: enforces deterministic commission lookup by (teacherId, effectiveFrom)
CREATE UNIQUE INDEX "TeacherCommission_teacherId_effectiveFrom_key" ON "TeacherCommission"("teacherId", "effectiveFrom");
