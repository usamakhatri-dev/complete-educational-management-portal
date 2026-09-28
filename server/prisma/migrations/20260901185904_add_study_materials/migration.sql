/*
  Warnings:

  - Added the required column `updatedAt` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "StudyMaterial" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "fileIds" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyMaterial_classId_subjectId_idx" ON "StudyMaterial"("classId", "subjectId");

-- CreateIndex
CREATE INDEX "StudyMaterial_teacherId_idx" ON "StudyMaterial"("teacherId");

-- CreateIndex
CREATE INDEX "StudyMaterial_isPublished_idx" ON "StudyMaterial"("isPublished");

-- AddForeignKey
ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
