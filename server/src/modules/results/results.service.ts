import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  ListResultsQuery,
  StudentResultQuery,
  ClassResultsQuery,
  SubjectResultsQuery,
} from './dto/result.dto.js';

export interface GradeBoundary {
  min: number;
  max: number;
  grade: string;
  gpa: number;
}

const DEFAULT_GRADE_SCALE: GradeBoundary[] = [
  { min: 90, max: 100, grade: 'A+', gpa: 4.0 },
  { min: 80, max: 89.99, grade: 'A', gpa: 3.7 },
  { min: 70, max: 79.99, grade: 'B+', gpa: 3.3 },
  { min: 60, max: 69.99, grade: 'B', gpa: 3.0 },
  { min: 50, max: 59.99, grade: 'C+', gpa: 2.7 },
  { min: 40, max: 49.99, grade: 'C', gpa: 2.0 },
  { min: 30, max: 39.99, grade: 'D', gpa: 1.0 },
  { min: 0, max: 29.99, grade: 'F', gpa: 0.0 },
];

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  getGradeForPercentage(pct: number): { grade: string; gpa: number } {
    for (const b of DEFAULT_GRADE_SCALE) {
      if (pct >= b.min && pct <= b.max) return { grade: b.grade, gpa: b.gpa };
    }
    return { grade: 'F', gpa: 0 };
  }

  async getGradeScale() {
    return DEFAULT_GRADE_SCALE;
  }

  async listResults(query: ListResultsQuery, actor: { id: string; role: string }) {
    const examWhere: Record<string, unknown> = {};
    const quizWhere: Record<string, unknown> = {};
    const assignmentWhere: Record<string, unknown> = {};

    // Teacher scope: only show results for assigned class-subjects
    if (actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const classSubjects = await this.prisma.classSubject.findMany({
          where: { teacherId: profile.id },
          select: { classId: true, subjectId: true },
        });
        if (classSubjects.length > 0) {
          examWhere.exam = { OR: classSubjects.map((cs) => ({ classId: cs.classId, subjectId: cs.subjectId })) };
          quizWhere.quiz = { OR: classSubjects.map((cs) => ({ classId: cs.classId, subjectId: cs.subjectId })) };
          assignmentWhere.assignment = { OR: classSubjects.map((cs) => ({ classId: cs.classId, subjectId: cs.subjectId })) };
        } else {
          return { data: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
        }
      }
    }

    if (query.sessionId) {
      examWhere.exam = { sessionId: query.sessionId };
    }
    if (query.classId) {
      examWhere.exam = { ...examWhere.exam as Record<string, unknown>, classId: query.classId };
      quizWhere.quiz = { classId: query.classId };
      assignmentWhere.assignment = { classId: query.classId };
    }
    if (query.sectionId) {
      examWhere.exam = { ...examWhere.exam as Record<string, unknown>, sectionId: query.sectionId };
      quizWhere.quiz = { ...quizWhere.quiz as Record<string, unknown>, sectionId: query.sectionId };
      assignmentWhere.assignment = { ...assignmentWhere.assignment as Record<string, unknown>, sectionId: query.sectionId };
    }
    if (query.subjectId) {
      examWhere.exam = { ...examWhere.exam as Record<string, unknown>, subjectId: query.subjectId };
      quizWhere.quiz = { ...quizWhere.quiz as Record<string, unknown>, subjectId: query.subjectId };
      assignmentWhere.assignment = { ...assignmentWhere.assignment as Record<string, unknown>, subjectId: query.subjectId };
    }
    if (query.studentId) {
      examWhere.studentId = query.studentId;
      quizWhere.studentId = query.studentId;
      assignmentWhere.studentId = query.studentId;
    }

    if (actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        examWhere.studentId = profile.id;
        quizWhere.studentId = profile.id;
        assignmentWhere.studentId = profile.id;
      }
    }

    const limit = Math.min(query.limit, 100);
    const page = query.page;
    const fetchLimit = Math.min(page * limit, 500);

    const [examResults, quizSubmissions, assignmentSubmissions, examCount, quizCount, assignmentCount] = await Promise.all([
      this.prisma.examResult.findMany({
        where: examWhere,
        include: {
          exam: { select: { id: true, name: true, type: true, totalMarks: true, passMarks: true, weight: true, subjectId: true, classId: true, sessionId: true, subject: { select: { id: true, name: true, code: true } }, class: { select: { id: true, name: true, code: true } }, session: { select: { id: true, name: true } } } },
          student: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        },
        orderBy: { id: 'desc' },
        take: fetchLimit,
      }),
      this.prisma.quizSubmission.findMany({
        where: quizWhere,
        include: {
          quiz: { select: { id: true, title: true, totalMarks: true, passMarks: true, subjectId: true, classId: true, subject: { select: { id: true, name: true, code: true } }, class: { select: { id: true, name: true, code: true } } } },
          student: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        },
        orderBy: { submittedAt: 'desc' },
        take: fetchLimit,
      }),
      this.prisma.assignmentSubmission.findMany({
        where: assignmentWhere,
        include: {
          assignment: { select: { id: true, title: true, totalMarks: true, subjectId: true, classId: true, subject: { select: { id: true, name: true, code: true } }, class: { select: { id: true, name: true, code: true } } } },
          student: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        },
        orderBy: { submittedAt: 'desc' },
        take: fetchLimit,
      }),
      this.prisma.examResult.count({ where: examWhere }),
      this.prisma.quizSubmission.count({ where: quizWhere }),
      this.prisma.assignmentSubmission.count({ where: assignmentWhere }),
    ]);

    const items: Array<Record<string, unknown>> = [];

    for (const r of examResults) {
      const pct = r.exam.totalMarks > 0 && r.marksObtained != null
        ? Math.round((r.marksObtained / r.exam.totalMarks) * 100 * 100) / 100
        : null;
      const gradeInfo = pct != null ? this.getGradeForPercentage(pct) : null;
      items.push({
        type: 'EXAM',
        id: r.id,
        assessmentId: r.examId,
        assessmentName: r.exam.name,
        assessmentType: r.exam.type,
        studentId: r.studentId,
        studentName: r.student.user?.fullName || 'Unknown',
        studentEmail: r.student.user?.email || '',
        marksObtained: r.marksObtained,
        totalMarks: r.exam.totalMarks,
        percentage: pct,
        grade: r.grade || gradeInfo?.grade || null,
        gpa: gradeInfo?.gpa ?? null,
        status: r.status,
        subject: r.exam.subject,
        class: r.exam.class,
        session: r.exam.session,
        date: r.exam,
        weight: r.exam.weight,
      });
    }

    for (const r of quizSubmissions) {
      const pct = r.quiz.totalMarks > 0 && r.score != null
        ? Math.round((r.score / r.quiz.totalMarks) * 100 * 100) / 100
        : null;
      const gradeInfo = pct != null ? this.getGradeForPercentage(pct) : null;
      items.push({
        type: 'QUIZ',
        id: r.id,
        assessmentId: r.quizId,
        assessmentName: r.quiz.title,
        assessmentType: 'QUIZ',
        studentId: r.studentId,
        studentName: r.student.user?.fullName || 'Unknown',
        studentEmail: r.student.user?.email || '',
        marksObtained: r.score,
        totalMarks: r.quiz.totalMarks,
        percentage: pct,
        grade: gradeInfo?.grade || null,
        gpa: gradeInfo?.gpa ?? null,
        status: r.status === 'GRADED' ? 'PUBLISHED' : 'DRAFT',
        subject: r.quiz.subject,
        class: r.quiz.class,
        session: null,
        date: r.submittedAt,
        weight: 1,
      });
    }

    for (const r of assignmentSubmissions) {
      const totalM = r.assignment.totalMarks;
      const pct = totalM > 0 && r.marks != null
        ? Math.round((r.marks / totalM) * 100 * 100) / 100
        : null;
      const gradeInfo = pct != null ? this.getGradeForPercentage(pct) : null;
      items.push({
        type: 'ASSIGNMENT',
        id: r.id,
        assessmentId: r.assignmentId,
        assessmentName: r.assignment.title,
        assessmentType: 'ASSIGNMENT',
        studentId: r.studentId,
        studentName: r.student.user?.fullName || 'Unknown',
        studentEmail: r.student.user?.email || '',
        marksObtained: r.marks,
        totalMarks: totalM,
        percentage: pct,
        grade: r.grade || gradeInfo?.grade || null,
        gpa: gradeInfo?.gpa ?? null,
        status: r.status === 'GRADED' ? 'PUBLISHED' : 'DRAFT',
        subject: r.assignment.subject,
        class: r.assignment.class,
        session: null,
        date: r.submittedAt,
        weight: 1,
      });
    }

    if (query.status) {
      const s = query.status;
      const filtered = items.filter((i) => i.status === s);
      items.length = 0;
      items.push(...filtered);
    }

    if (query.search) {
      const q = query.search.toLowerCase();
      const filtered = items.filter(
        (i) =>
          (i.assessmentName as string)?.toLowerCase().includes(q) ||
          (i.studentName as string)?.toLowerCase().includes(q),
      );
      items.length = 0;
      items.push(...filtered);
    }

    items.sort((a, b) => {
      const dateA = (a.date as { startDate?: string; submittedAt?: string } | null);
      const dateB = (b.date as { startDate?: string; submittedAt?: string } | null);
      const ta = dateA?.startDate ? new Date(dateA.startDate).getTime() : dateA?.submittedAt ? new Date(dateA.submittedAt).getTime() : 0;
      const tb = dateB?.startDate ? new Date(dateB.startDate).getTime() : dateB?.submittedAt ? new Date(dateB.submittedAt).getTime() : 0;
      return tb - ta;
    });

    const total = examCount + quizCount + assignmentCount;
    const skip = (page - 1) * limit;
    const paged = items.slice(skip, skip + limit);

    return {
      data: paged,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStudentResult(query: StudentResultQuery, actor: { id: string; role: string }) {
    let studentId = query.studentId;

    if (actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (!profile) throw new BadRequestException('Student profile not found');
      if (profile.id !== studentId) throw new BadRequestException('Cannot view other students results');
      studentId = profile.id;
    }

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { id: true, fullName: true, email: true } }, enrollments: { where: { status: 'ACTIVE' }, include: { class: { select: { id: true, name: true } }, section: { select: { id: true, name: true } }, session: { select: { id: true, name: true } } } } },
    });
    if (!student) throw new NotFoundException('Student not found');

    const examWhere: Record<string, unknown> = { studentId };
    if (query.sessionId) examWhere.exam = { sessionId: query.sessionId };
    if (query.classId) examWhere.exam = { ...examWhere.exam as Record<string, unknown>, classId: query.classId };
    if (query.subjectId) examWhere.exam = { ...examWhere.exam as Record<string, unknown>, subjectId: query.subjectId };

    const quizWhere: Record<string, unknown> = { studentId };
    if (query.classId) quizWhere.quiz = { classId: query.classId };
    if (query.subjectId) quizWhere.quiz = { ...quizWhere.quiz as Record<string, unknown>, subjectId: query.subjectId };

    const assignmentWhere: Record<string, unknown> = { studentId };
    if (query.classId) assignmentWhere.assignment = { classId: query.classId };
    if (query.subjectId) assignmentWhere.assignment = { ...assignmentWhere.assignment as Record<string, unknown>, subjectId: query.subjectId };

    const [examResults, quizSubs, assignmentSubs] = await Promise.all([
      this.prisma.examResult.findMany({
        where: examWhere,
        include: { exam: { select: { id: true, name: true, type: true, totalMarks: true, passMarks: true, weight: true, subject: { select: { id: true, name: true, code: true } }, class: { select: { id: true, name: true } }, session: { select: { id: true, name: true } } } } },
      }),
      this.prisma.quizSubmission.findMany({
        where: quizWhere,
        include: { quiz: { select: { id: true, title: true, totalMarks: true, passMarks: true, subject: { select: { id: true, name: true, code: true } }, class: { select: { id: true, name: true } } } } },
      }),
      this.prisma.assignmentSubmission.findMany({
        where: assignmentWhere,
        include: { assignment: { select: { id: true, title: true, totalMarks: true, subject: { select: { id: true, name: true, code: true } }, class: { select: { id: true, name: true } } } } },
      }),
    ]);

    const subjectMap = new Map<string, {
      subject: { id: string; name: string; code: string };
      exams: Array<{ name: string; marks: number; total: number; pct: number; grade: string; weight: number }>;
      quizzes: Array<{ name: string; marks: number; total: number; pct: number; grade: string }>;
      assignments: Array<{ name: string; marks: number; total: number; pct: number; grade: string }>;
      totalWeightedPct: number;
      totalWeight: number;
      totalMarks: number;
      obtainedMarks: number;
    }>();

    for (const r of examResults) {
      const subj = r.exam.subject;
      if (!subjectMap.has(subj.id)) {
        subjectMap.set(subj.id, { subject: subj, exams: [], quizzes: [], assignments: [], totalWeightedPct: 0, totalWeight: 0, totalMarks: 0, obtainedMarks: 0 });
      }
      const entry = subjectMap.get(subj.id)!;
      const pct = r.exam.totalMarks > 0 && r.marksObtained != null ? Math.round((r.marksObtained / r.exam.totalMarks) * 100 * 100) / 100 : 0;
      const gradeInfo = this.getGradeForPercentage(pct);
      entry.exams.push({ name: r.exam.name, marks: r.marksObtained ?? 0, total: r.exam.totalMarks, pct, grade: r.grade || gradeInfo.grade, weight: r.exam.weight });
      entry.totalWeightedPct += pct * r.exam.weight;
      entry.totalWeight += r.exam.weight;
      entry.totalMarks += r.exam.totalMarks;
      entry.obtainedMarks += r.marksObtained ?? 0;
    }

    for (const r of quizSubs) {
      const subj = r.quiz.subject;
      if (!subjectMap.has(subj.id)) {
        subjectMap.set(subj.id, { subject: subj, exams: [], quizzes: [], assignments: [], totalWeightedPct: 0, totalWeight: 0, totalMarks: 0, obtainedMarks: 0 });
      }
      const entry = subjectMap.get(subj.id)!;
      const pct = r.quiz.totalMarks > 0 ? Math.round((r.score / r.quiz.totalMarks) * 100 * 100) / 100 : 0;
      const gradeInfo = this.getGradeForPercentage(pct);
      entry.quizzes.push({ name: r.quiz.title, marks: r.score, total: r.quiz.totalMarks, pct, grade: gradeInfo.grade });
      entry.totalMarks += r.quiz.totalMarks;
      entry.obtainedMarks += r.score;
    }

    for (const r of assignmentSubs) {
      const subj = r.assignment.subject;
      if (!subjectMap.has(subj.id)) {
        subjectMap.set(subj.id, { subject: subj, exams: [], quizzes: [], assignments: [], totalWeightedPct: 0, totalWeight: 0, totalMarks: 0, obtainedMarks: 0 });
      }
      const entry = subjectMap.get(subj.id)!;
      const pct = r.assignment.totalMarks > 0 && r.marks != null ? Math.round((r.marks / r.assignment.totalMarks) * 100 * 100) / 100 : 0;
      const gradeInfo = this.getGradeForPercentage(pct);
      entry.assignments.push({ name: r.assignment.title, marks: r.marks ?? 0, total: r.assignment.totalMarks, pct, grade: r.grade || gradeInfo.grade });
      entry.totalMarks += r.assignment.totalMarks;
      entry.obtainedMarks += r.marks ?? 0;
    }

    const subjectResults = Array.from(subjectMap.values()).map((s) => {
      const subjectPct = s.totalMarks > 0 ? Math.round((s.obtainedMarks / s.totalMarks) * 100 * 100) / 100 : 0;
      const gradeInfo = this.getGradeForPercentage(subjectPct);
      return {
        ...s,
        percentage: subjectPct,
        grade: gradeInfo.grade,
        gpa: gradeInfo.gpa,
      };
    });

    const totalMarks = subjectResults.reduce((a, s) => a + s.totalMarks, 0);
    const obtainedMarks = subjectResults.reduce((a, s) => a + s.obtainedMarks, 0);
    const overallPct = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100 * 100) / 100 : 0;
    const overallGrade = this.getGradeForPercentage(overallPct);

    const totalExams = examResults.length;
    const passedExams = examResults.filter((r) => r.marksObtained != null && r.exam.passMarks > 0 && r.marksObtained >= r.exam.passMarks).length;

    return {
      student: {
        id: student.id,
        userId: student.userId,
        name: student.user.fullName,
        email: student.user.email,
        rollNumber: student.rollNumber,
        enrollments: student.enrollments,
      },
      summary: {
        totalSubjects: subjectResults.length,
        totalAssessments: examResults.length + quizSubs.length + assignmentSubs.length,
        totalMarks,
        obtainedMarks,
        percentage: overallPct,
        grade: overallGrade.grade,
        gpa: overallGrade.gpa,
        totalExams,
        passedExams,
        failedExams: totalExams - passedExams,
        passRate: totalExams > 0 ? Math.round((passedExams / totalExams) * 100 * 100) / 100 : 0,
      },
      subjects: subjectResults,
    };
  }

  async getClassResults(query: ClassResultsQuery, actor: { id: string; role: string }) {
    const cls = await this.prisma.academicClass.findUnique({
      where: { id: query.classId },
      include: { sections: true },
    });
    if (!cls) throw new NotFoundException('Class not found');

    if (actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const cs = await this.prisma.classSubject.findFirst({
          where: { teacherId: profile.id, classId: query.classId },
        });
        if (!cs) throw new BadRequestException('You are not assigned to teach this class');
      }
    }

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        classId: query.classId,
        status: 'ACTIVE',
        ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      },
      include: {
        student: { include: { user: { select: { id: true, fullName: true } } } },
        section: { select: { id: true, name: true } },
      },
    });

    const studentIds = enrollments.map((e) => e.studentId);

    const examWhere: Record<string, unknown> = { studentId: { in: studentIds }, exam: { classId: query.classId } };
    if (query.subjectId) examWhere.exam = { ...examWhere.exam as Record<string, unknown>, subjectId: query.subjectId };
    if (query.sessionId) examWhere.exam = { ...examWhere.exam as Record<string, unknown>, sessionId: query.sessionId };

    const quizWhere: Record<string, unknown> = { studentId: { in: studentIds }, quiz: { classId: query.classId } };
    if (query.subjectId) quizWhere.quiz = { ...quizWhere.quiz as Record<string, unknown>, subjectId: query.subjectId };

    const assignmentWhere: Record<string, unknown> = { studentId: { in: studentIds }, assignment: { classId: query.classId } };
    if (query.subjectId) assignmentWhere.assignment = { ...assignmentWhere.assignment as Record<string, unknown>, subjectId: query.subjectId };

    const [examResults, quizSubs, assignmentSubs] = await Promise.all([
      this.prisma.examResult.findMany({
        where: examWhere,
        include: { exam: { select: { id: true, name: true, totalMarks: true, passMarks: true, weight: true, subject: { select: { id: true, name: true } } } } },
      }),
      this.prisma.quizSubmission.findMany({
        where: quizWhere,
        include: { quiz: { select: { id: true, title: true, totalMarks: true, subject: { select: { id: true, name: true } } } } },
      }),
      this.prisma.assignmentSubmission.findMany({
        where: assignmentWhere,
        include: { assignment: { select: { id: true, title: true, totalMarks: true, subject: { select: { id: true, name: true } } } } },
      }),
    ]);

    const studentMap = new Map<string, {
      studentId: string;
      studentName: string;
      sectionName: string | null;
      totalMarks: number;
      obtainedMarks: number;
      examCount: number;
      passedExams: number;
    }>();

    for (const e of enrollments) {
      studentMap.set(e.studentId, {
        studentId: e.studentId,
        studentName: e.student.user.fullName,
        sectionName: e.section?.name || null,
        totalMarks: 0,
        obtainedMarks: 0,
        examCount: 0,
        passedExams: 0,
      });
    }

    for (const r of examResults) {
      const entry = studentMap.get(r.studentId);
      if (!entry) continue;
      entry.totalMarks += r.exam.totalMarks;
      entry.obtainedMarks += r.marksObtained ?? 0;
      entry.examCount += 1;
      if (r.marksObtained != null && r.marksObtained >= r.exam.passMarks) entry.passedExams += 1;
    }

    for (const r of quizSubs) {
      const entry = studentMap.get(r.studentId);
      if (!entry) continue;
      entry.totalMarks += r.quiz.totalMarks;
      entry.obtainedMarks += r.score;
    }

    for (const r of assignmentSubs) {
      const entry = studentMap.get(r.studentId);
      if (!entry) continue;
      entry.totalMarks += r.assignment.totalMarks;
      entry.obtainedMarks += r.marks ?? 0;
    }

    const students = Array.from(studentMap.values()).map((s) => {
      const pct = s.totalMarks > 0 ? Math.round((s.obtainedMarks / s.totalMarks) * 100 * 100) / 100 : 0;
      const gradeInfo = this.getGradeForPercentage(pct);
      return { ...s, percentage: pct, grade: gradeInfo.grade, gpa: gradeInfo.gpa };
    });

    students.sort((a, b) => b.percentage - a.percentage);

    const totalStudents = students.length;
    const totalPct = students.reduce((a, s) => a + s.percentage, 0);
    const avgPct = totalStudents > 0 ? Math.round((totalPct / totalStudents) * 100) / 100 : 0;
    const passed = students.filter((s) => s.percentage >= 40).length;
    const gradeDistribution: Record<string, number> = {};
    for (const s of students) {
      gradeDistribution[s.grade] = (gradeDistribution[s.grade] || 0) + 1;
    }

    return {
      class: { id: cls.id, name: cls.name, code: cls.code, sections: cls.sections },
      summary: {
        totalStudents,
        averagePercentage: avgPct,
        passed,
        failed: totalStudents - passed,
        passRate: totalStudents > 0 ? Math.round((passed / totalStudents) * 100 * 100) / 100 : 0,
        gradeDistribution,
        highestPercentage: students.length > 0 ? students[0].percentage : 0,
        lowestPercentage: students.length > 0 ? students[students.length - 1].percentage : 0,
      },
      students,
    };
  }

  async getSubjectResults(query: SubjectResultsQuery, actor: { id: string; role: string }) {
    const subject = await this.prisma.subject.findUnique({ where: { id: query.subjectId } });
    if (!subject) throw new NotFoundException('Subject not found');

    if (actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const cs = await this.prisma.classSubject.findFirst({
          where: { teacherId: profile.id, subjectId: query.subjectId, ...(query.classId ? { classId: query.classId } : {}) },
        });
        if (!cs) throw new BadRequestException('You are not assigned to teach this subject');
      }
    }

    const examWhere: Record<string, unknown> = { subjectId: query.subjectId };
    if (query.classId) examWhere.classId = query.classId;
    if (query.sessionId) examWhere.sessionId = query.sessionId;

    const [examResults, quizSubs, assignmentSubs] = await Promise.all([
      this.prisma.examResult.findMany({
        where: { exam: examWhere },
        include: {
          exam: { select: { id: true, name: true, type: true, totalMarks: true, passMarks: true, weight: true, class: { select: { id: true, name: true } } } },
          student: { include: { user: { select: { id: true, fullName: true } } } },
        },
      }),
      this.prisma.quizSubmission.findMany({
        where: { quiz: { subjectId: query.subjectId, ...(query.classId ? { classId: query.classId } : {}) } },
        include: {
          quiz: { select: { id: true, title: true, totalMarks: true, class: { select: { id: true, name: true } } } },
          student: { include: { user: { select: { id: true, fullName: true } } } },
        },
      }),
      this.prisma.assignmentSubmission.findMany({
        where: { assignment: { subjectId: query.subjectId, ...(query.classId ? { classId: query.classId } : {}) } },
        include: {
          assignment: { select: { id: true, title: true, totalMarks: true, class: { select: { id: true, name: true } } } },
          student: { include: { user: { select: { id: true, fullName: true } } } },
        },
      }),
    ]);

    const studentMap = new Map<string, {
      studentId: string;
      studentName: string;
      className: string;
      exams: Array<{ name: string; marks: number; total: number; pct: number; grade: string }>;
      quizzes: Array<{ name: string; marks: number; total: number; pct: number }>;
      assignments: Array<{ name: string; marks: number; total: number; pct: number }>;
      totalMarks: number;
      obtainedMarks: number;
    }>();

    for (const r of examResults) {
      const sid = r.studentId;
      if (!studentMap.has(sid)) {
        studentMap.set(sid, { studentId: sid, studentName: r.student.user?.fullName || 'Unknown', className: r.exam.class?.name || '', exams: [], quizzes: [], assignments: [], totalMarks: 0, obtainedMarks: 0 });
      }
      const entry = studentMap.get(sid)!;
      const pct = r.exam.totalMarks > 0 && r.marksObtained != null ? Math.round((r.marksObtained / r.exam.totalMarks) * 100 * 100) / 100 : 0;
      entry.exams.push({ name: r.exam.name, marks: r.marksObtained ?? 0, total: r.exam.totalMarks, pct, grade: r.grade || this.getGradeForPercentage(pct).grade });
      entry.totalMarks += r.exam.totalMarks;
      entry.obtainedMarks += r.marksObtained ?? 0;
    }

    for (const r of quizSubs) {
      const sid = r.studentId;
      if (!studentMap.has(sid)) {
        studentMap.set(sid, { studentId: sid, studentName: r.student.user?.fullName || 'Unknown', className: r.quiz.class?.name || '', exams: [], quizzes: [], assignments: [], totalMarks: 0, obtainedMarks: 0 });
      }
      const entry = studentMap.get(sid)!;
      const pct = r.quiz.totalMarks > 0 ? Math.round((r.score / r.quiz.totalMarks) * 100 * 100) / 100 : 0;
      entry.quizzes.push({ name: r.quiz.title, marks: r.score, total: r.quiz.totalMarks, pct });
      entry.totalMarks += r.quiz.totalMarks;
      entry.obtainedMarks += r.score;
    }

    for (const r of assignmentSubs) {
      const sid = r.studentId;
      if (!studentMap.has(sid)) {
        studentMap.set(sid, { studentId: sid, studentName: r.student.user?.fullName || 'Unknown', className: r.assignment.class?.name || '', exams: [], quizzes: [], assignments: [], totalMarks: 0, obtainedMarks: 0 });
      }
      const entry = studentMap.get(sid)!;
      const pct = r.assignment.totalMarks > 0 && r.marks != null ? Math.round((r.marks / r.assignment.totalMarks) * 100 * 100) / 100 : 0;
      entry.assignments.push({ name: r.assignment.title, marks: r.marks ?? 0, total: r.assignment.totalMarks, pct });
      entry.totalMarks += r.assignment.totalMarks;
      entry.obtainedMarks += r.marks ?? 0;
    }

    const students = Array.from(studentMap.values()).map((s) => {
      const pct = s.totalMarks > 0 ? Math.round((s.obtainedMarks / s.totalMarks) * 100 * 100) / 100 : 0;
      const gradeInfo = this.getGradeForPercentage(pct);
      return { ...s, percentage: pct, grade: gradeInfo.grade, gpa: gradeInfo.gpa };
    });

    students.sort((a, b) => b.percentage - a.percentage);

    const totalStudents = students.length;
    const avgPct = totalStudents > 0 ? Math.round(students.reduce((a, s) => a + s.percentage, 0) / totalStudents * 100) / 100 : 0;
    const passed = students.filter((s) => s.percentage >= 40).length;
    const gradeDistribution: Record<string, number> = {};
    for (const s of students) {
      gradeDistribution[s.grade] = (gradeDistribution[s.grade] || 0) + 1;
    }

    return {
      subject: { id: subject.id, name: subject.name, code: subject.code },
      summary: {
        totalStudents,
        averagePercentage: avgPct,
        passed,
        failed: totalStudents - passed,
        passRate: totalStudents > 0 ? Math.round((passed / totalStudents) * 100 * 100) / 100 : 0,
        gradeDistribution,
        totalExams: examResults.length,
        totalQuizzes: quizSubs.length,
        totalAssignments: assignmentSubs.length,
      },
      students,
    };
  }

  async getOverviewStats(actor: { id: string; role: string }) {
    const examCountWhere: Record<string, unknown> = {};
    const resultWhere: Record<string, unknown> = {};
    const publishedWhere: Record<string, unknown> = { status: 'PUBLISHED', marksObtained: { not: null } };

    if (actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const classSubjects = await this.prisma.classSubject.findMany({
          where: { teacherId: profile.id },
          select: { classId: true, subjectId: true },
        });
        if (classSubjects.length > 0) {
          const examScope = { OR: classSubjects.map((cs) => ({ classId: cs.classId, subjectId: cs.subjectId })) };
          examCountWhere.classId = { in: classSubjects.map((cs) => cs.classId) };
          resultWhere.exam = examScope;
          publishedWhere.exam = examScope;
        } else {
          return { totalExams: 0, totalExamResults: 0, publishedExamResults: 0, totalQuizSubmissions: 0, totalAssignmentSubmissions: 0, totalResults: 0, passRate: 0, averagePercentage: 0, passed: 0, failed: 0 };
        }
      }
    }

    const [totalExams, totalExamResults, publishedExamResults, totalQuizSubs, totalAssignmentSubs] = await Promise.all([
      this.prisma.exam.count({ where: examCountWhere }),
      this.prisma.examResult.count({ where: resultWhere }),
      this.prisma.examResult.count({ where: publishedWhere }),
      this.prisma.quizSubmission.count(),
      this.prisma.assignmentSubmission.count(),
    ]);

    const publishedResults = await this.prisma.examResult.findMany({
      where: publishedWhere,
      select: { marksObtained: true, exam: { select: { totalMarks: true, passMarks: true } } },
    });

    let passed = 0;
    let failed = 0;
    let totalPct = 0;
    let count = 0;
    for (const r of publishedResults) {
      if (r.marksObtained != null && r.exam.totalMarks > 0) {
        const pct = (r.marksObtained / r.exam.totalMarks) * 100;
        totalPct += pct;
        count++;
        if (r.marksObtained >= r.exam.passMarks) passed++;
        else failed++;
      }
    }

    return {
      totalExams,
      totalExamResults,
      publishedExamResults,
      totalQuizSubmissions: totalQuizSubs,
      totalAssignmentSubmissions: totalAssignmentSubs,
      totalResults: totalExamResults + totalQuizSubs + totalAssignmentSubs,
      passRate: count > 0 ? Math.round((passed / count) * 100 * 100) / 100 : 0,
      averagePercentage: count > 0 ? Math.round((totalPct / count) * 100) / 100 : 0,
      passed,
      failed,
    };
  }
}
