import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  CreateQuizDto,
  UpdateQuizDto,
  ListQuizQuery,
  SubmitQuizDto,
  GradeSubmissionDto,
  ListSubmissionQuery,
} from './dto/quiz.dto.js';

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ──── Quiz CRUD ────

  async createQuiz(dto: CreateQuizDto, actor: { id: string; role: string; ip?: string }) {
    const teacherProfile = await this.getTeacherProfile(actor.id, actor.role);
    const cls = await this.prisma.academicClass.findUnique({ where: { id: dto.classId } });
    if (!cls) throw new NotFoundException('Class not found');
    const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
    if (!subject) throw new NotFoundException('Subject not found');

    if (teacherProfile) {
      await this.assertClassSubjectScope(teacherProfile.id, dto.classId, dto.subjectId);
    }

    const quiz = await this.prisma.quiz.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        classId: dto.classId,
        sectionId: dto.sectionId || null,
        subjectId: dto.subjectId,
        teacherId: teacherProfile?.id ?? null,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        durationMinutes: dto.durationMinutes ?? 15,
        totalMarks: dto.totalMarks ?? 10,
        passMarks: dto.passMarks ?? 5,
        questionsJson: dto.questionsJson,
        isPublished: dto.isPublished ?? false,
        shuffleQuestions: dto.shuffleQuestions ?? false,
      },
      include: {
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
    });

    await this.audit.log('quizzes.create', 'quizzes', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: quiz.id,
      meta: { title: dto.title, subjectId: dto.subjectId },
    });

    return quiz;
  }

  async listQuizzes(query: ListQuizQuery, actor: { id: string; role: string }) {
    const where: Record<string, unknown> = {};

    if (actor.role === 'teacher') {
      const profile = await this.getTeacherProfile(actor.id, actor.role);
      if (profile) where.teacherId = profile.id;
    } else if (actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const enrollments = await this.prisma.studentEnrollment.findMany({
          where: { studentId: profile.id, status: 'ACTIVE' },
          select: { classId: true },
        });
        if (enrollments.length === 0) {
          return { data: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
        }
        where.classId = { in: enrollments.map((e) => e.classId) };
        where.isPublished = true;
      }
    }

    if (query.classId) where.classId = query.classId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          class: { select: { id: true, name: true, code: true } },
          subject: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true } },
          _count: { select: { submissions: true } },
        },
      }),
      this.prisma.quiz.count({ where }),
    ]);

    return {
      data: items,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async getQuizById(id: string, actor: { id: string; role: string }) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    // Teachers can only access their own quizzes
    if (actor.role === 'teacher') {
      const profile = await this.getTeacherProfile(actor.id, actor.role);
      if (profile && quiz.teacherId !== profile.id) {
        throw new NotFoundException('Quiz not found');
      }
    }

    // Students only see published quizzes for their enrolled classes
    if (actor.role === 'student') {
      if (!quiz.isPublished) throw new NotFoundException('Quiz not found');
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const enrollment = await this.prisma.studentEnrollment.findFirst({
          where: { studentId: profile.id, classId: quiz.classId, status: 'ACTIVE' },
        });
        if (!enrollment) throw new NotFoundException('Quiz not found');
      }
    }

    // For students, strip answer data from questions
    if (actor.role === 'student') {
      try {
        const questions = JSON.parse(quiz.questionsJson);
        const sanitized = questions.map((q: Record<string, unknown>) => {
          const { answer, ...rest } = q;
          return rest;
        });
        return { ...quiz, questionsJson: JSON.stringify(sanitized) };
      } catch {
        // ignore parse errors
      }
    }

    return quiz;
  }

  async updateQuiz(id: string, dto: UpdateQuizDto, actor: { id: string; role: string; ip?: string }) {
    const existing = await this.prisma.quiz.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Quiz not found');

    if (actor.role === 'teacher') {
      const profile = await this.getTeacherProfile(actor.id, actor.role);
      if (profile && existing.teacherId !== profile.id) {
        throw new BadRequestException('You can only edit your own quizzes');
      }
    }

    const quiz = await this.prisma.quiz.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startAt !== undefined && { startAt: dto.startAt ? new Date(dto.startAt) : null }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.totalMarks !== undefined && { totalMarks: dto.totalMarks }),
        ...(dto.passMarks !== undefined && { passMarks: dto.passMarks }),
        ...(dto.questionsJson !== undefined && { questionsJson: dto.questionsJson }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
        ...(dto.shuffleQuestions !== undefined && { shuffleQuestions: dto.shuffleQuestions }),
      },
      include: {
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    await this.audit.log('quizzes.update', 'quizzes', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: id,
      meta: { changes: dto },
    });

    return quiz;
  }

  async deleteQuiz(id: string, actor: { id: string; role: string; ip?: string }) {
    const existing = await this.prisma.quiz.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Quiz not found');

    if (actor.role === 'teacher') {
      const profile = await this.getTeacherProfile(actor.id, actor.role);
      if (profile && existing.teacherId !== profile.id) {
        throw new BadRequestException('You can only delete your own quizzes');
      }
    }

    const hasSubmissions = await this.prisma.quizSubmission.count({ where: { quizId: id } });
    if (hasSubmissions > 0) {
      throw new BadRequestException('Cannot delete quiz with existing submissions');
    }

    await this.prisma.quiz.delete({ where: { id } });

    await this.audit.log('quizzes.delete', 'quizzes', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: id,
      meta: { title: existing.title },
    });

    return { message: 'Quiz deleted' };
  }

  // ──── Quiz Submissions ────

  async submitQuiz(quizId: string, dto: SubmitQuizDto, actor: { id: string; role: string; ip?: string }) {
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
    if (!profile) throw new BadRequestException('Student profile not found');

    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (!quiz.isPublished) throw new BadRequestException('Quiz is not published');

    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: { studentId: profile.id, classId: quiz.classId, status: 'ACTIVE' },
    });
    if (!enrollment) throw new BadRequestException('You are not enrolled in this quizs class');

    // Check if already submitted
    const existing = await this.prisma.quizSubmission.findUnique({
      where: { quizId_studentId: { quizId, studentId: profile.id } },
    });
    if (existing) throw new ConflictException('You have already submitted this quiz');

    // Auto-grade if possible
    let score = 0;
    try {
      const questions = JSON.parse(quiz.questionsJson);
      const answers = JSON.parse(dto.answersJson);
      for (const q of questions) {
        const ans = answers[q.id];
        if (ans && ans === q.answer) {
          score += q.marks ?? 1;
        }
      }
    } catch {
      // Manual grading needed
    }

    const percentage = quiz.totalMarks > 0 ? Math.round((score / quiz.totalMarks) * 100 * 100) / 100 : 0;

    const submission = await this.prisma.quizSubmission.create({
      data: {
        quizId,
        studentId: profile.id,
        answersJson: dto.answersJson,
        score,
        percentage,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: {
        quiz: { select: { id: true, title: true, totalMarks: true, passMarks: true } },
        student: { include: { user: { select: { id: true, fullName: true } } } },
      },
    });

    await this.audit.log('quizzes.attempt', 'quizzes', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: quizId,
      meta: { score, percentage },
    });

    return submission;
  }

  async listSubmissions(query: ListSubmissionQuery, actor?: { id: string; role: string }) {
    const where: Record<string, unknown> = {};
    if (query.quizId) where.quizId = query.quizId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.status) where.status = query.status;

    // Teachers can only see submissions for their own quizzes
    if (actor && actor.role === 'teacher') {
      const profile = await this.getTeacherProfile(actor.id, actor.role);
      if (profile) {
        const teacherQuizIds = await this.prisma.quiz.findMany({
          where: { teacherId: profile.id },
          select: { id: true },
        });
        where.quizId = { in: teacherQuizIds.map((q) => q.id) };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.quizSubmission.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          quiz: { select: { id: true, title: true, totalMarks: true, passMarks: true } },
          student: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        },
      }),
      this.prisma.quizSubmission.count({ where }),
    ]);

    return {
      data: items,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async gradeSubmission(id: string, dto: GradeSubmissionDto, actor: { id: string; role: string; ip?: string }) {
    const existing = await this.prisma.quizSubmission.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Submission not found');

    // Teachers can only grade submissions for their own quizzes
    if (actor.role === 'teacher') {
      const quiz = await this.prisma.quiz.findUnique({ where: { id: existing.quizId } });
      const profile = await this.getTeacherProfile(actor.id, actor.role);
      if (profile && (!quiz || quiz.teacherId !== profile.id)) {
        throw new NotFoundException('Submission not found');
      }
    }

    const submission = await this.prisma.quizSubmission.update({
      where: { id },
      data: {
        ...(dto.score !== undefined && { score: dto.score }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        quiz: { select: { id: true, title: true, totalMarks: true } },
        student: { include: { user: { select: { id: true, fullName: true } } } },
      },
    });

    await this.audit.log('quizzes.grade', 'quizzes', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: id,
      meta: { changes: dto },
    });

    return submission;
  }

  // ──── Helpers ────

  private async getTeacherProfile(userId: string, role: string) {
    if (role === 'super_admin') return null;
    const profile = await this.prisma.teacherProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('Teacher profile not found');
    return profile;
  }

  private async assertClassSubjectScope(teacherProfileId: string, classId: string, subjectId: string) {
    const cs = await this.prisma.classSubject.findFirst({
      where: { teacherId: teacherProfileId, classId, subjectId },
    });
    if (!cs) throw new BadRequestException('You are not assigned to teach this class-subject combination');
  }
}
