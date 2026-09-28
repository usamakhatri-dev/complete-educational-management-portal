-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "Quiz" DROP CONSTRAINT "Quiz_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "StudyMaterial" DROP CONSTRAINT "StudyMaterial_teacherId_fkey";

-- AlterTable
ALTER TABLE "Assignment" ALTER COLUMN "teacherId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Quiz" ALTER COLUMN "teacherId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "StudyMaterial" ALTER COLUMN "teacherId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
