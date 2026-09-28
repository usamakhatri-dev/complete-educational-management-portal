-- AlterTable: Add new columns to Attendance
ALTER TABLE "Attendance" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "timetableSlotId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "period" INTEGER;

-- Backfill sessionId from the class's session (all existing classes belong to one session)
UPDATE "Attendance" a
SET "sessionId" = c."sessionId"
FROM "AcademicClass" c
WHERE a."classId" = c."id" AND a."sessionId" IS NULL;

-- Make sessionId NOT NULL after backfill
ALTER TABLE "Attendance" ALTER COLUMN "sessionId" SET NOT NULL;

-- Drop old unique constraint
DROP INDEX IF EXISTS "Attendance_studentId_date_subjectId_key";

-- Create new unique constraint with period
CREATE UNIQUE INDEX "Attendance_studentId_date_subjectId_period_key" ON "Attendance"("studentId", "date", "subjectId", "period");

-- Add foreign key constraints for existing columns that were missing FKs
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for new columns
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_timetableSlotId_fkey" FOREIGN KEY ("timetableSlotId") REFERENCES "TimetableSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add new indexes
CREATE INDEX "Attendance_sessionId_idx" ON "Attendance"("sessionId");
CREATE INDEX "Attendance_sectionId_date_idx" ON "Attendance"("sectionId", "date");
CREATE INDEX "Attendance_classId_sectionId_date_idx" ON "Attendance"("classId", "sectionId", "date");
