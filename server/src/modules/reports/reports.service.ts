import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ReportQuery } from './dto/report.dto.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(query: ReportQuery, actor: { id: string; role: string }) {
    switch (query.type) {
      case 'student': return this.studentReport(query, actor);
      case 'class': return this.classReport(query, actor);
      case 'subject': return this.subjectReport(query, actor);
      case 'attendance': return this.attendanceReport(query, actor);
      case 'summary':
        if (actor.role === 'student') {
          return { type: 'SUMMARY', data: null, error: 'Students cannot access institution-level reports' };
        }
        return this.summaryReport(query, actor);
      default:
        if (actor.role === 'student') {
          return { type: 'SUMMARY', data: null, error: 'Students cannot access institution-level reports' };
        }
        return this.summaryReport(query, actor);
    }
  }

  private async summaryReport(query: ReportQuery, actor: { id: string; role: string }) {
    const [totalStudents, totalTeachers, totalClasses, totalExams, totalQuizzes, totalAssignments, totalAttendance, presentAttendance] = await Promise.all([
      this.prisma.studentProfile.count(),
      this.prisma.teacherProfile.count(),
      this.prisma.academicClass.count(),
      this.prisma.exam.count(),
      this.prisma.quiz.count(),
      this.prisma.assignment.count(),
      this.prisma.attendance.count(),
      this.prisma.attendance.count({ where: { status: 'PRESENT' } }),
    ]);

    const examResults = await this.prisma.examResult.findMany({
      where: { marksObtained: { not: null } },
      include: { exam: { select: { totalMarks: true, passMarks: true } } },
    });

    let totalPct = 0;
    let passed = 0;
    for (const r of examResults) {
      if (r.marksObtained != null && r.exam.totalMarks > 0) {
        totalPct += (r.marksObtained / r.exam.totalMarks) * 100;
        if (r.marksObtained >= r.exam.passMarks) passed++;
      }
    }

    return {
      type: 'SUMMARY',
      generatedAt: new Date().toISOString(),
      data: {
        totalStudents,
        totalTeachers,
        totalClasses,
        totalExams,
        totalQuizzes,
        totalAssignments,
        attendanceRate: totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100 * 100) / 100 : 0,
        avgPercentage: examResults.length > 0 ? Math.round((totalPct / examResults.length) * 100) / 100 : 0,
        passRate: examResults.length > 0 ? Math.round((passed / examResults.length) * 100 * 100) / 100 : 0,
      },
    };
  }

  private async studentReport(query: ReportQuery, actor: { id: string; role: string }) {
    let studentId = query.studentId;
    if (actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (!profile) return { type: 'STUDENT', data: null };
      studentId = profile.id;
    }
    if (!studentId) return { type: 'STUDENT', data: null };

    const [student, examResults, quizSubs, assignmentSubs, attendanceCount, presentCount] = await Promise.all([
      this.prisma.studentProfile.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { fullName: true, email: true } },
          enrollments: { where: { status: 'ACTIVE' }, include: { class: { select: { name: true } }, section: { select: { name: true } } } },
        },
      }),
      this.prisma.examResult.findMany({
        where: { studentId },
        include: { exam: { select: { name: true, totalMarks: true, passMarks: true, subject: { select: { name: true } } } } },
      }),
      this.prisma.quizSubmission.findMany({
        where: { studentId },
        include: { quiz: { select: { title: true, totalMarks: true, subject: { select: { name: true } } } } },
      }),
      this.prisma.assignmentSubmission.findMany({
        where: { studentId },
        include: { assignment: { select: { title: true, totalMarks: true, subject: { select: { name: true } } } } },
      }),
      this.prisma.attendance.count({ where: { studentId } }),
      this.prisma.attendance.count({ where: { studentId, status: 'PRESENT' } }),
    ]);

    let totalMarks = 0;
    let obtainedMarks = 0;
    let passed = 0;
    for (const r of examResults) {
      totalMarks += r.exam.totalMarks;
      obtainedMarks += r.marksObtained ?? 0;
      if (r.marksObtained != null && r.marksObtained >= r.exam.passMarks) passed++;
    }

    return {
      type: 'STUDENT',
      generatedAt: new Date().toISOString(),
      student: student ? {
        name: student.user.fullName,
        email: student.user.email,
        rollNumber: student.rollNumber,
        class: student.enrollments[0]?.class?.name,
        section: student.enrollments[0]?.section?.name,
      } : null,
      data: {
        attendanceRate: attendanceCount > 0 ? Math.round((presentCount / attendanceCount) * 100 * 100) / 100 : 0,
        totalExams: examResults.length,
        avgPercentage: totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100 * 100) / 100 : 0,
        passRate: examResults.length > 0 ? Math.round((passed / examResults.length) * 100 * 100) / 100 : 0,
        totalQuizzes: quizSubs.length,
        totalAssignments: assignmentSubs.length,
        exams: examResults.map((r) => ({
          name: r.exam.name,
          subject: r.exam.subject.name,
          marks: r.marksObtained,
          total: r.exam.totalMarks,
          grade: r.grade,
        })),
        quizzes: quizSubs.map((r) => ({
          name: r.quiz.title,
          subject: r.quiz.subject.name,
          score: r.score,
          total: r.quiz.totalMarks,
        })),
        assignments: assignmentSubs.map((r) => ({
          name: r.assignment.title,
          subject: r.assignment.subject.name,
          marks: r.marks,
          total: r.assignment.totalMarks,
        })),
      },
    };
  }

  private async classReport(query: ReportQuery, actor: { id: string; role: string }) {
    if (actor.role === 'student') {
      return { type: 'CLASS', data: null, error: 'Students cannot access class-level reports' };
    }
    if (!query.classId) return { type: 'CLASS', data: null };

    const cls = await this.prisma.academicClass.findUnique({
      where: { id: query.classId },
      include: { sections: true },
    });
    if (!cls) return { type: 'CLASS', data: null };

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: { classId: query.classId, status: 'ACTIVE', ...(query.sectionId ? { sectionId: query.sectionId } : {}) },
      include: { student: { include: { user: { select: { fullName: true } } } }, section: { select: { name: true } } },
    });

    const studentIds = enrollments.map((e) => e.studentId);
    const examResults = await this.prisma.examResult.findMany({
      where: { studentId: { in: studentIds }, exam: { classId: query.classId } },
      include: { exam: { select: { totalMarks: true, passMarks: true } } },
    });

    let totalPct = 0;
    let count = 0;
    let passed = 0;
    for (const r of examResults) {
      if (r.marksObtained != null && r.exam.totalMarks > 0) {
        totalPct += (r.marksObtained / r.exam.totalMarks) * 100;
        count++;
        if (r.marksObtained >= r.exam.passMarks) passed++;
      }
    }

    return {
      type: 'CLASS',
      generatedAt: new Date().toISOString(),
      class: { id: cls.id, name: cls.name, code: cls.code },
      data: {
        totalStudents: enrollments.length,
        avgPercentage: count > 0 ? Math.round((totalPct / count) * 100) / 100 : 0,
        passRate: count > 0 ? Math.round((passed / count) * 100 * 100) / 100 : 0,
        students: enrollments.map((e) => ({
          name: e.student.user.fullName,
          section: e.section?.name,
        })),
      },
    };
  }

  private async subjectReport(query: ReportQuery, actor: { id: string; role: string }) {
    if (actor.role === 'student') {
      return { type: 'SUBJECT', data: null, error: 'Students cannot access subject-level reports' };
    }
    if (!query.subjectId) return { type: 'SUBJECT', data: null };

    const subject = await this.prisma.subject.findUnique({ where: { id: query.subjectId } });
    if (!subject) return { type: 'SUBJECT', data: null };

    const examResults = await this.prisma.examResult.findMany({
      where: { exam: { subjectId: query.subjectId, ...(query.classId ? { classId: query.classId } : {}) } },
      include: { exam: { select: { totalMarks: true, passMarks: true, name: true } }, student: { include: { user: { select: { fullName: true } } } } },
    });

    let totalPct = 0;
    let count = 0;
    let passed = 0;
    for (const r of examResults) {
      if (r.marksObtained != null && r.exam.totalMarks > 0) {
        totalPct += (r.marksObtained / r.exam.totalMarks) * 100;
        count++;
        if (r.marksObtained >= r.exam.passMarks) passed++;
      }
    }

    return {
      type: 'SUBJECT',
      generatedAt: new Date().toISOString(),
      subject: { id: subject.id, name: subject.name, code: subject.code },
      data: {
        totalResults: examResults.length,
        avgPercentage: count > 0 ? Math.round((totalPct / count) * 100) / 100 : 0,
        passRate: count > 0 ? Math.round((passed / count) * 100 * 100) / 100 : 0,
        results: examResults.map((r) => ({
          student: r.student.user.fullName,
          exam: r.exam.name,
          marks: r.marksObtained,
          total: r.exam.totalMarks,
          grade: r.grade,
        })),
      },
    };
  }

  private async attendanceReport(query: ReportQuery, actor: { id: string; role: string }) {
    const where: Record<string, unknown> = {};
    if (actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (profile) where.studentId = profile.id;
    } else {
      if (query.classId) where.classId = query.classId;
      if (query.sectionId) where.sectionId = query.sectionId;
      if (query.subjectId) where.subjectId = query.subjectId;
      if (query.studentId) where.studentId = query.studentId;
    }

    const [total, present, absent, late, leave] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.count({ where: { ...where, status: 'PRESENT' } }),
      this.prisma.attendance.count({ where: { ...where, status: 'ABSENT' } }),
      this.prisma.attendance.count({ where: { ...where, status: 'LATE' } }),
      this.prisma.attendance.count({ where: { ...where, status: 'LEAVE' } }),
    ]);

    return {
      type: 'ATTENDANCE',
      generatedAt: new Date().toISOString(),
      data: {
        total,
        present,
        absent,
        late,
        leave,
        attendanceRate: total > 0 ? Math.round((present / total) * 100 * 100) / 100 : 0,
      },
    };
  }
}
