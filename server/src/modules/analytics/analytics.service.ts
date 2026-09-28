import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AnalyticsQuery } from './dto/analytics.dto.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getManagementDashboard() {
    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSections,
      totalSubjects,
      activeSession,
      totalExams,
      publishedExams,
      totalQuizzes,
      totalAssignments,
      totalExamResults,
      totalQuizSubmissions,
      totalAssignmentSubmissions,
      totalAttendance,
      presentAttendance,
      totalLetters,
      pendingLetters,
      totalAnnouncements,
      unreadNotifications,
    ] = await Promise.all([
      this.prisma.studentProfile.count(),
      this.prisma.teacherProfile.count(),
      this.prisma.academicClass.count(),
      this.prisma.section.count(),
      this.prisma.subject.count(),
      this.prisma.session.findFirst({ where: { isActive: true }, select: { id: true, name: true } }),
      this.prisma.exam.count(),
      this.prisma.exam.count({ where: { isPublished: true } }),
      this.prisma.quiz.count(),
      this.prisma.assignment.count(),
      this.prisma.examResult.count(),
      this.prisma.quizSubmission.count(),
      this.prisma.assignmentSubmission.count(),
      this.prisma.attendance.count(),
      this.prisma.attendance.count({ where: { status: 'PRESENT' } }),
      this.prisma.letterRequest.count(),
      this.prisma.letterRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.announcement.count(),
      this.prisma.notification.count({ where: { isRead: false } }),
    ]);

    const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100 * 100) / 100 : 0;

    const examPerformance = await this.getExamPerformanceSummary();
    const gradeDistribution = await this.getGradeDistribution();
    const classPerformance = await this.getClassPerformanceSummary();
    const subjectPerformance = await this.getSubjectPerformanceSummary();
    const recentActivity = await this.getRecentActivity(5);

    return {
      overview: {
        totalStudents,
        totalTeachers,
        totalClasses,
        totalSections,
        totalSubjects,
        activeSession,
        totalExams,
        publishedExams,
        totalQuizzes,
        totalAssignments,
        totalResults: totalExamResults + totalQuizSubmissions + totalAssignmentSubmissions,
        attendanceRate,
        pendingLetters,
        totalLetters,
        totalAnnouncements,
        unreadNotifications,
      },
      examPerformance,
      gradeDistribution,
      classPerformance,
      subjectPerformance,
      recentActivity,
    };
  }

  async getTeacherDashboard(teacherUserId: string) {
    const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: teacherUserId } });
    if (!profile) return { overview: {}, classPerformance: [], subjectPerformance: [], recentActivity: [] };

    const classSubjects = await this.prisma.classSubject.findMany({
      where: { teacherId: profile.id },
      include: { class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } },
    });

    const classIds = [...new Set(classSubjects.map((cs) => cs.classId))];
    const subjectIds = classSubjects.map((cs) => cs.subjectId);

    const [totalStudentsInClasses, attendanceCount, presentCount, pendingGrading] = await Promise.all([
      this.prisma.studentEnrollment.count({ where: { classId: { in: classIds }, status: 'ACTIVE' } }),
      this.prisma.attendance.count({ where: { teacherId: profile.id } }),
      this.prisma.attendance.count({ where: { teacherId: profile.id, status: 'PRESENT' } }),
      this.prisma.assignmentSubmission.count({ where: { assignment: { teacherId: profile.id }, status: 'SUBMITTED' } }),
    ]);

    const attendanceRate = attendanceCount > 0 ? Math.round((presentCount / attendanceCount) * 100 * 100) / 100 : 0;

    const examResults = await this.prisma.examResult.findMany({
      where: { exam: { subjectId: { in: subjectIds } } },
      include: { exam: { select: { totalMarks: true, passMarks: true, subjectId: true, subject: { select: { name: true } } } } },
    });

    let totalMarks = 0;
    let obtainedMarks = 0;
    let passed = 0;
    for (const r of examResults) {
      totalMarks += r.exam.totalMarks;
      obtainedMarks += r.marksObtained ?? 0;
      if (r.marksObtained != null && r.marksObtained >= r.exam.passMarks) passed++;
    }
    const avgPct = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100 * 100) / 100 : 0;

    const subjectPerf = classSubjects.map((cs) => {
      const results = examResults.filter((r) => r.exam.subjectId === cs.subjectId);
      const sTotal = results.reduce((a, r) => a + r.exam.totalMarks, 0);
      const sObtained = results.reduce((a, r) => a + (r.marksObtained ?? 0), 0);
      return {
        subject: cs.subject,
        class: cs.class,
        studentCount: results.length,
        avgPercentage: sTotal > 0 ? Math.round((sObtained / sTotal) * 100 * 100) / 100 : 0,
      };
    });

    return {
      overview: {
        totalStudents: totalStudentsInClasses,
        classesCount: classIds.length,
        subjectsCount: subjectIds.length,
        attendanceRate,
        pendingGrading,
        totalExamResults: examResults.length,
        avgPercentage: avgPct,
        passRate: examResults.length > 0 ? Math.round((passed / examResults.length) * 100 * 100) / 100 : 0,
      },
      subjectPerformance: subjectPerf,
    };
  }

  async getStudentDashboard(studentUserId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: studentUserId },
      include: { user: { select: { fullName: true } } },
    });
    if (!profile) return { overview: {}, subjectPerformance: [], recentActivity: [] };

    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: { studentId: profile.id, status: 'ACTIVE' },
      include: { class: { select: { name: true } }, section: { select: { name: true } } },
    });

    const [attendanceCount, presentCount, examResults, quizSubs, assignmentSubs] = await Promise.all([
      this.prisma.attendance.count({ where: { studentId: profile.id } }),
      this.prisma.attendance.count({ where: { studentId: profile.id, status: 'PRESENT' } }),
      this.prisma.examResult.findMany({
        where: { studentId: profile.id },
        include: { exam: { select: { name: true, totalMarks: true, passMarks: true, subject: { select: { id: true, name: true } } } } },
      }),
      this.prisma.quizSubmission.findMany({
        where: { studentId: profile.id },
        include: { quiz: { select: { title: true, totalMarks: true, subject: { select: { id: true, name: true } } } } },
      }),
      this.prisma.assignmentSubmission.findMany({
        where: { studentId: profile.id },
        include: { assignment: { select: { title: true, totalMarks: true, subject: { select: { id: true, name: true } } } } },
      }),
    ]);

    const attendanceRate = attendanceCount > 0 ? Math.round((presentCount / attendanceCount) * 100 * 100) / 100 : 0;

    let totalMarks = 0;
    let obtainedMarks = 0;
    let passed = 0;
    for (const r of examResults) {
      totalMarks += r.exam.totalMarks;
      obtainedMarks += r.marksObtained ?? 0;
      if (r.marksObtained != null && r.marksObtained >= r.exam.passMarks) passed++;
    }

    const subjectMap = new Map<string, { name: string; total: number; obtained: number }>();
    for (const r of examResults) {
      const sId = r.exam.subject.id;
      if (!subjectMap.has(sId)) subjectMap.set(sId, { name: r.exam.subject.name, total: 0, obtained: 0 });
      const e = subjectMap.get(sId)!;
      e.total += r.exam.totalMarks;
      e.obtained += r.marksObtained ?? 0;
    }
    for (const r of quizSubs) {
      const sId = r.quiz.subject.id;
      if (!subjectMap.has(sId)) subjectMap.set(sId, { name: r.quiz.subject.name, total: 0, obtained: 0 });
      const e = subjectMap.get(sId)!;
      e.total += r.quiz.totalMarks;
      e.obtained += r.score;
    }
    for (const r of assignmentSubs) {
      const sId = r.assignment.subject.id;
      if (!subjectMap.has(sId)) subjectMap.set(sId, { name: r.assignment.subject.name, total: 0, obtained: 0 });
      const e = subjectMap.get(sId)!;
      e.total += r.assignment.totalMarks;
      e.obtained += r.marks ?? 0;
    }

    const overallPct = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100 * 100) / 100 : 0;

    return {
      overview: {
        student: { id: profile.id, name: profile.user?.fullName, rollNumber: profile.rollNumber },
        enrollment: enrollment ? { class: enrollment.class?.name, section: enrollment.section?.name } : null,
        attendanceRate,
        totalExams: examResults.length,
        avgPercentage: overallPct,
        passRate: examResults.length > 0 ? Math.round((passed / examResults.length) * 100 * 100) / 100 : 0,
        totalQuizzes: quizSubs.length,
        totalAssignments: assignmentSubs.length,
      },
      subjectPerformance: Array.from(subjectMap.values()).map((s) => ({
        subject: { name: s.name },
        percentage: s.total > 0 ? Math.round((s.obtained / s.total) * 100 * 100) / 100 : 0,
      })),
    };
  }

  private async getExamPerformanceSummary() {
    const results = await this.prisma.examResult.findMany({
      where: { marksObtained: { not: null } },
      include: { exam: { select: { totalMarks: true, passMarks: true } } },
    });
    let total = 0;
    let obtained = 0;
    let passed = 0;
    for (const r of results) {
      total += r.exam.totalMarks;
      obtained += r.marksObtained ?? 0;
      if (r.marksObtained != null && r.marksObtained >= r.exam.passMarks) passed++;
    }
    return {
      totalResults: results.length,
      avgPercentage: total > 0 ? Math.round((obtained / total) * 100 * 100) / 100 : 0,
      passRate: results.length > 0 ? Math.round((passed / results.length) * 100 * 100) / 100 : 0,
    };
  }

  private async getGradeDistribution() {
    const results = await this.prisma.examResult.findMany({
      where: { status: 'PUBLISHED', marksObtained: { not: null } },
      include: { exam: { select: { totalMarks: true } } },
    });
    const dist: Record<string, number> = {};
    for (const r of results) {
      if (r.marksObtained != null && r.exam.totalMarks > 0) {
        const pct = (r.marksObtained / r.exam.totalMarks) * 100;
        let grade = 'F';
        if (pct >= 90) grade = 'A+';
        else if (pct >= 80) grade = 'A';
        else if (pct >= 70) grade = 'B+';
        else if (pct >= 60) grade = 'B';
        else if (pct >= 50) grade = 'C+';
        else if (pct >= 40) grade = 'C';
        else if (pct >= 30) grade = 'D';
        dist[grade] = (dist[grade] || 0) + 1;
      }
    }
    return dist;
  }

  private async getClassPerformanceSummary() {
    const classes = await this.prisma.academicClass.findMany({
      include: {
        enrollments: { where: { status: 'ACTIVE' }, select: { studentId: true } },
      },
    });
    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      strength: c.enrollments.length,
    }));
  }

  private async getSubjectPerformanceSummary() {
    const subjects = await this.prisma.subject.findMany({
      include: { classSubjects: { select: { id: true } } },
    });
    return subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      credits: s.credits,
      classCount: s.classSubjects.length,
    }));
  }

  private async getRecentActivity(limit: number) {
    return this.prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, action: true, module: true, createdAt: true, user: { select: { fullName: true } } },
    });
  }
}
