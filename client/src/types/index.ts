export type Role = 'super_admin' | 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  mustChangePassword?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherProfile {
  id: string;
  userId: string;
  employeeCode: string;
  qualification?: string | null;
  specialization?: string | null;
  departmentId?: string | null;
  dateOfJoining?: string | null;
}

export interface StudentProfile {
  id: string;
  userId: string;
  rollNumber: string;
  admissionNumber: string;
  status: string;
  guardianName?: string | null;
  guardianPhone?: string | null;
  dob?: string | null;
  gender?: string | null;
}

export interface MeResponse {
  user: User;
  profile: TeacherProfile | StudentProfile | null;
  permissions: string[];
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: string[];
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: PageMeta;
}

// ──── Academic types ────

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  headTeacherId?: string | null;
  _count?: { teachers: number; classes: number };
}

export interface Session {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  _count?: { classes: number; enrollments: number };
}

export interface AcademicClass {
  id: string;
  name: string;
  code: string;
  departmentId?: string | null;
  sessionId: string;
  classTeacherId?: string | null;
  room?: string | null;
  strength: number;
  department?: { id: string; name: string; code: string } | null;
  session?: { id: string; name: string };
  classTeacher?: { id: string; user?: { fullName: string } } | null;
  sections?: Section[];
  classSubjects?: ClassSubject[];
  _count?: { sections: number; classSubjects: number; enrollments: number };
}

export interface Section {
  id: string;
  name: string;
  classId: string;
  room?: string | null;
  class?: { id: string; name: string; code: string };
  _count?: { enrollments: number; timetableSlots: number };
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  credits: number;
  isElective: boolean;
  classSubjects?: ClassSubject[];
  _count?: { classSubjects: number; exams: number };
}

export interface ClassSubject {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  class?: { id: string; name: string; code: string };
  subject?: { id: string; name: string; code: string };
  teacher?: { id: string; user?: { fullName: string } };
}

// ──── People types ────

export interface Teacher extends User {
  teacherProfile?: TeacherProfile & {
    department?: { id: string; name: string; code: string } | null;
  } | null;
}

export interface Student extends User {
  studentProfile?: StudentProfile & {
    bloodGroup?: string | null;
    guardianRelation?: string | null;
    address?: string | null;
    photoUrl?: string | null;
    enrollments?: StudentEnrollment[];
  } | null;
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  classId: string;
  sectionId?: string | null;
  sessionId: string;
  status: string;
  class?: { id: string; name: string; code: string };
  section?: { id: string; name: string } | null;
  session?: { id: string; name: string };
}

// ──── Timetable types ────

export interface TimetableSlot {
  id: string;
  classSubjectId: string;
  sectionId?: string | null;
  dayOfWeek: number;
  period: number;
  startTime: string;
  endTime: string;
  room?: string | null;
  classSubject?: ClassSubject & {
    class?: AcademicClass;
    subject?: Subject;
    teacher?: TeacherProfile & { user?: { fullName: string } };
  };
  section?: Section;
}

// ──── Attendance types ────

export interface AttendanceRecord {
  id: string;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  studentId: string;
  teacherId: string;
  sessionId: string;
  timetableSlotId?: string | null;
  date: string;
  period?: number | null;
  status: string;
  remark?: string | null;
  student?: StudentProfile & { user?: { id: string; fullName: string; email: string } };
  subject?: { id: string; name: string; code: string };
  class?: { id: string; name: string; code: string };
  section?: { id: string; name: string } | null;
  teacher?: TeacherProfile & { user?: { id: string; fullName: string } };
  session?: { id: string; name: string };
}

export interface AttendanceOverview {
  todayCount: number;
  thisWeekCount: number;
  totalRecords: number;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  holiday: number;
  percentage: number;
  subjectSummary?: Array<{
    subject: { id: string; name: string; code: string };
    total: number;
    present: number;
    absent: number;
    percentage: number;
  }>;
  studentSummary?: Array<{
    studentId: string;
    studentName: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
  }>;
}

// ──── Exam types ────

export interface Exam {
  id: string;
  name: string;
  type: string;
  sessionId: string;
  classId: string;
  subjectId: string;
  sectionId?: string | null;
  startDate: string;
  endDate: string;
  totalMarks: number;
  passMarks: number;
  weight: number;
  isPublished: boolean;
  gradingMode: string;
  createdById?: string | null;
  session?: { id: string; name: string };
  class?: { id: string; name: string; code: string };
  subject?: { id: string; name: string; code: string };
  section?: { id: string; name: string } | null;
  _count?: { results: number; schedules: number };
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  marksObtained?: number | null;
  grade?: string | null;
  remark?: string | null;
  status: string;
  enteredById?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  exam?: { id: string; name: string; type: string; totalMarks: number; passMarks: number };
  student?: StudentProfile & { user?: { id: string; fullName: string; email: string } };
}

export interface ExamStats {
  total: number;
  published: number;
  drafted: number;
  passed: number;
  failed: number;
  average: number;
}

// ──── Quiz types ────

export interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  teacherId: string;
  startAt?: string | null;
  durationMinutes: number;
  totalMarks: number;
  passMarks: number;
  questionsJson: string;
  isPublished: boolean;
  shuffleQuestions: boolean;
  createdAt: string;
  class?: { id: string; name: string; code: string };
  subject?: { id: string; name: string; code: string };
  section?: { id: string; name: string } | null;
  _count?: { submissions: number };
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  studentId: string;
  answersJson: string;
  score: number;
  percentage?: number | null;
  status: string;
  startedAt: string;
  submittedAt?: string | null;
  quiz?: { id: string; title: string; totalMarks: number; passMarks: number };
  student?: StudentProfile & { user?: { id: string; fullName: string; email: string } };
}

// ──── Assignment types ────

export interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  teacherId: string;
  dueDate?: string | null;
  totalMarks: number;
  allowLate: boolean;
  attachmentIds?: string | null;
  createdAt: string;
  class?: { id: string; name: string; code: string };
  subject?: { id: string; name: string; code: string };
  section?: { id: string; name: string } | null;
  _count?: { submissions: number };
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submissionText?: string | null;
  attachmentIds?: string | null;
  submittedAt: string;
  isLate: boolean;
  marks?: number | null;
  grade?: string | null;
  feedback?: string | null;
  status: string;
  gradedById?: string | null;
  gradedAt?: string | null;
  assignment?: { id: string; title: string; totalMarks: number; dueDate?: string | null };
  student?: StudentProfile & { user?: { id: string; fullName: string; email: string } };
}

// ──── Results types ────

export interface GradeBoundary {
  min: number;
  max: number;
  grade: string;
  gpa: number;
}

export interface ResultItem {
  type: 'EXAM' | 'QUIZ' | 'ASSIGNMENT';
  id: string;
  assessmentId: string;
  assessmentName: string;
  assessmentType: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  marksObtained: number | null;
  totalMarks: number;
  percentage: number | null;
  grade: string | null;
  gpa: number | null;
  status: string;
  subject?: { id: string; name: string; code: string };
  class?: { id: string; name: string; code: string };
  session?: { id: string; name: string } | null;
  date?: { startDate?: string; submittedAt?: string } | null;
  weight?: number;
}

export interface StudentResultDetail {
  student: {
    id: string;
    userId: string;
    name: string;
    email: string;
    rollNumber: string;
    enrollments: StudentEnrollment[];
  };
  summary: {
    totalSubjects: number;
    totalAssessments: number;
    totalMarks: number;
    obtainedMarks: number;
    percentage: number;
    grade: string;
    gpa: number;
    totalExams: number;
    passedExams: number;
    failedExams: number;
    passRate: number;
  };
  subjects: Array<{
    subject: { id: string; name: string; code: string };
    exams: Array<{ name: string; marks: number; total: number; pct: number; grade: string; weight: number }>;
    quizzes: Array<{ name: string; marks: number; total: number; pct: number; grade: string }>;
    assignments: Array<{ name: string; marks: number; total: number; pct: number; grade: string }>;
    percentage: number;
    grade: string;
    gpa: number;
    totalMarks: number;
    obtainedMarks: number;
  }>;
}

export interface ClassResultSummary {
  class: { id: string; name: string; code: string; sections: Section[] };
  summary: {
    totalStudents: number;
    averagePercentage: number;
    passed: number;
    failed: number;
    passRate: number;
    gradeDistribution: Record<string, number>;
    highestPercentage: number;
    lowestPercentage: number;
  };
  students: Array<{
    studentId: string;
    studentName: string;
    sectionName: string | null;
    totalMarks: number;
    obtainedMarks: number;
    percentage: number;
    grade: string;
    gpa: number;
    examCount: number;
    passedExams: number;
  }>;
}

export interface SubjectResultSummary {
  subject: { id: string; name: string; code: string };
  summary: {
    totalStudents: number;
    averagePercentage: number;
    passed: number;
    failed: number;
    passRate: number;
    gradeDistribution: Record<string, number>;
    totalExams: number;
    totalQuizzes: number;
    totalAssignments: number;
  };
  students: Array<{
    studentId: string;
    studentName: string;
    className: string;
    exams: Array<{ name: string; marks: number; total: number; pct: number; grade: string }>;
    quizzes: Array<{ name: string; marks: number; total: number; pct: number }>;
    assignments: Array<{ name: string; marks: number; total: number; pct: number }>;
    totalMarks: number;
    obtainedMarks: number;
    percentage: number;
    grade: string;
    gpa: number;
  }>;
}

export interface ResultsOverview {
  totalExams: number;
  totalExamResults: number;
  publishedExamResults: number;
  totalQuizSubmissions: number;
  totalAssignmentSubmissions: number;
  totalResults: number;
  passRate: number;
  averagePercentage: number;
  passed: number;
  failed: number;
}

// ──── Letter / Appeal types ────

export interface LetterRequest {
  id: string;
  trackingNumber: string;
  studentId: string;
  type: string;
  title: string;
  content: string;
  status: string;
  leaveFrom?: string | null;
  leaveTo?: string | null;
  leaveType?: string | null;
  attachmentIds?: string | null;
  createdById: string;
  submittedAt: string;
  resolvedAt?: string | null;
  resolvedById?: string | null;
  student?: StudentProfile & { user?: { id: string; fullName: string; email: string } };
  timeline?: LetterTimeline[];
}

export interface LetterTimeline {
  id: string;
  letterRequestId: string;
  actorRole: string;
  actorId: string;
  message: string;
  newStatus?: string | null;
  createdAt: string;
}

// ──── Announcement types ────

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  audience: string;
  classId?: string | null;
  sectionId?: string | null;
  targetRole?: string | null;
  targetUserId?: string | null;
  attachmentIds?: string | null;
  createdById: string;
  publishDate: string;
  expiresAt?: string | null;
  isPinned: boolean;
  class?: { id: string; name: string; code: string } | null;
  section?: { id: string; name: string } | null;
}

// ──── Notification types ────

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body?: string | null;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

// ──── Message types ────

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  sender?: { id: string; fullName: string; role: string };
  recipient?: { id: string; fullName: string; role: string };
}

// ──── Study Materials ────

export interface StudyMaterial {
  id: string;
  title: string;
  description?: string | null;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  teacherId: string;
  fileIds?: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  class?: { id: string; name: string; code: string };
  subject?: { id: string; name: string; code: string };
  section?: { id: string; name: string } | null;
}

export interface FileRecord {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  module?: string | null;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
}
