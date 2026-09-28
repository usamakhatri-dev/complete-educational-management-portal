-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TeacherProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "qualification" TEXT,
    "specialization" TEXT,
    "dateOfJoining" DATETIME,
    "departmentId" TEXT,
    "address" TEXT,
    "isHOD" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "admissionDate" DATETIME,
    "dob" DATETIME,
    "gender" TEXT,
    "bloodGroup" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "guardianRelation" TEXT,
    "address" TEXT,
    "photoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "headTeacherId" TEXT
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "AcademicClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "departmentId" TEXT,
    "sessionId" TEXT NOT NULL,
    "classTeacherId" TEXT,
    "room" TEXT,
    "strength" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AcademicClass_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AcademicClass_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AcademicClass_classTeacherId_fkey" FOREIGN KEY ("classTeacherId") REFERENCES "TeacherProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "room" TEXT,
    CONSTRAINT "Section_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 1,
    "isElective" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "ClassSubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    CONSTRAINT "ClassSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassSubject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT,
    "sessionId" TEXT NOT NULL,
    "teacherId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,
    CONSTRAINT "StudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentEnrollment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudentEnrollment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentEnrollment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimetableSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classSubjectId" TEXT NOT NULL,
    "sectionId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    CONSTRAINT "TimetableSlot_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimetableSlot_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT,
    "subjectId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "remark" TEXT,
    CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "sectionId" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "totalMarks" INTEGER NOT NULL DEFAULT 100,
    "passMarks" INTEGER NOT NULL DEFAULT 33,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "gradingMode" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "createdById" TEXT,
    CONSTRAINT "Exam_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Exam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Exam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    CONSTRAINT "ExamSchedule_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExamSchedule_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "marksObtained" REAL,
    "grade" TEXT,
    "remark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "enteredById" TEXT,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    CONSTRAINT "ExamResult_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExamResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "startAt" DATETIME,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "totalMarks" INTEGER NOT NULL DEFAULT 10,
    "passMarks" INTEGER NOT NULL DEFAULT 5,
    "questionsJson" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quiz_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quiz_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quiz_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answersJson" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "percentage" REAL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    CONSTRAINT "QuizSubmission_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "dueDate" DATETIME,
    "totalMarks" INTEGER NOT NULL DEFAULT 20,
    "allowLate" BOOLEAN NOT NULL DEFAULT false,
    "attachmentIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Assignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Assignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "submissionText" TEXT,
    "attachmentIds" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "marks" REAL,
    "grade" TEXT,
    "feedback" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "gradedById" TEXT,
    "gradedAt" DATETIME,
    CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssignmentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ANNOUNCEMENT',
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "classId" TEXT,
    "sectionId" TEXT,
    "targetRole" TEXT,
    "targetUserId" TEXT,
    "attachmentIds" TEXT,
    "createdById" TEXT NOT NULL,
    "publishDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Announcement_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Announcement_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LetterRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackingNumber" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "leaveFrom" DATETIME,
    "leaveTo" DATETIME,
    "leaveType" TEXT,
    "attachmentIds" TEXT,
    "createdById" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "resolvedById" TEXT,
    CONSTRAINT "LetterRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LetterTimeline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "letterRequestId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "newStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LetterTimeline_letterRequestId_fkey" FOREIGN KEY ("letterRequestId") REFERENCES "LetterRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "replacedById" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "module" TEXT,
    "uploadedById" TEXT NOT NULL,
    CONSTRAINT "File_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoginHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "role" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackupRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FULL',
    "sizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "path" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    PRIMARY KEY ("roleId", "permissionId"),
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_employeeCode_key" ON "TeacherProfile"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_rollNumber_key" ON "StudentProfile"("rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_admissionNumber_key" ON "StudentProfile"("admissionNumber");

-- CreateIndex
CREATE INDEX "StudentProfile_status_idx" ON "StudentProfile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Department_name_idx" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Session_name_key" ON "Session"("name");

-- CreateIndex
CREATE INDEX "Session_isActive_idx" ON "Session"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicClass_code_key" ON "AcademicClass"("code");

-- CreateIndex
CREATE INDEX "AcademicClass_sessionId_idx" ON "AcademicClass"("sessionId");

-- CreateIndex
CREATE INDEX "AcademicClass_departmentId_idx" ON "AcademicClass"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicClass_name_sessionId_key" ON "AcademicClass"("name", "sessionId");

-- CreateIndex
CREATE INDEX "Section_classId_idx" ON "Section"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_name_classId_key" ON "Section"("name", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");

-- CreateIndex
CREATE INDEX "Subject_name_idx" ON "Subject"("name");

-- CreateIndex
CREATE INDEX "ClassSubject_teacherId_idx" ON "ClassSubject"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubject_classId_subjectId_key" ON "ClassSubject"("classId", "subjectId");

-- CreateIndex
CREATE INDEX "StudentEnrollment_studentId_status_idx" ON "StudentEnrollment"("studentId", "status");

-- CreateIndex
CREATE INDEX "StudentEnrollment_classId_sectionId_idx" ON "StudentEnrollment"("classId", "sectionId");

-- CreateIndex
CREATE INDEX "StudentEnrollment_sessionId_idx" ON "StudentEnrollment"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableSlot_classSubjectId_dayOfWeek_period_key" ON "TimetableSlot"("classSubjectId", "dayOfWeek", "period");

-- CreateIndex
CREATE INDEX "Attendance_classId_date_idx" ON "Attendance"("classId", "date");

-- CreateIndex
CREATE INDEX "Attendance_studentId_date_idx" ON "Attendance"("studentId", "date");

-- CreateIndex
CREATE INDEX "Attendance_teacherId_date_idx" ON "Attendance"("teacherId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_date_subjectId_key" ON "Attendance"("studentId", "date", "subjectId");

-- CreateIndex
CREATE INDEX "Exam_sessionId_classId_idx" ON "Exam"("sessionId", "classId");

-- CreateIndex
CREATE INDEX "Exam_subjectId_idx" ON "Exam"("subjectId");

-- CreateIndex
CREATE INDEX "ExamSchedule_examId_idx" ON "ExamSchedule"("examId");

-- CreateIndex
CREATE INDEX "ExamResult_studentId_idx" ON "ExamResult"("studentId");

-- CreateIndex
CREATE INDEX "ExamResult_status_idx" ON "ExamResult"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ExamResult_examId_studentId_key" ON "ExamResult"("examId", "studentId");

-- CreateIndex
CREATE INDEX "Quiz_classId_subjectId_idx" ON "Quiz"("classId", "subjectId");

-- CreateIndex
CREATE INDEX "QuizSubmission_studentId_idx" ON "QuizSubmission"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizSubmission_quizId_studentId_key" ON "QuizSubmission"("quizId", "studentId");

-- CreateIndex
CREATE INDEX "Assignment_classId_subjectId_idx" ON "Assignment"("classId", "subjectId");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_studentId_idx" ON "AssignmentSubmission"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_studentId_key" ON "AssignmentSubmission"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "Announcement_audience_publishDate_idx" ON "Announcement"("audience", "publishDate");

-- CreateIndex
CREATE INDEX "Announcement_createdById_idx" ON "Announcement"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "LetterRequest_trackingNumber_key" ON "LetterRequest"("trackingNumber");

-- CreateIndex
CREATE INDEX "LetterRequest_studentId_status_idx" ON "LetterRequest"("studentId", "status");

-- CreateIndex
CREATE INDEX "LetterRequest_status_idx" ON "LetterRequest"("status");

-- CreateIndex
CREATE INDEX "LetterTimeline_letterRequestId_idx" ON "LetterTimeline"("letterRequestId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "File_storedName_key" ON "File"("storedName");

-- CreateIndex
CREATE INDEX "LoginHistory_userId_createdAt_idx" ON "LoginHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_module_createdAt_idx" ON "ActivityLog"("module", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE UNIQUE INDEX "BackupRecord_filename_key" ON "BackupRecord"("filename");

-- CreateIndex
CREATE INDEX "BackupRecord_createdAt_idx" ON "BackupRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "Setting_category_idx" ON "Setting"("category");
