-- CreateIndex
CREATE INDEX "AcademicClass_classTeacherId_idx" ON "AcademicClass"("classTeacherId");

-- CreateIndex
CREATE INDEX "Announcement_classId_idx" ON "Announcement"("classId");

-- CreateIndex
CREATE INDEX "Announcement_sectionId_idx" ON "Announcement"("sectionId");

-- CreateIndex
CREATE INDEX "Assignment_teacherId_idx" ON "Assignment"("teacherId");

-- CreateIndex
CREATE INDEX "File_uploadedById_idx" ON "File"("uploadedById");

-- CreateIndex
CREATE INDEX "Quiz_teacherId_idx" ON "Quiz"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherProfile_departmentId_idx" ON "TeacherProfile"("departmentId");

-- CreateIndex
CREATE INDEX "TimetableSlot_sectionId_idx" ON "TimetableSlot"("sectionId");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
