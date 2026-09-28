import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  CreateExamDto,
  UpdateExamDto,
  ListExamQuery,
  BulkEnterResultsDto,
  UpdateResultDto,
  ListResultQuery,
} from './dto/exam.dto.js';

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ──── Exam CRUD ────

  async createExam(dto: CreateExamDto, actor: { id: string; role: string; ip?: string }) {
    const session = await this.prisma.session.findUnique({ where: { id: dto.sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    const cls = await this.prisma.academicClass.findUnique({ where: { id: dto.classId } });
    if (!cls) throw new NotFoundException('Class not found');
    const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
    if (!subject) throw new NotFoundException('Subject not found');

    if (dto.sectionId) {
      const sec = await this.prisma.section.findUnique({ where: { id: dto.sectionId } });
      if (!sec) throw new NotFoundException('Section not found');
    }

    if (actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const cs = await this.prisma.classSubject.findFirst({
          where: { teacherId: profile.id, classId: dto.classId, subjectId: dto.subjectId },
        });
        if (!cs) throw new BadRequestException('You are not assigned to teach this class-subject combination');
      }
    }

    const exam = await this.prisma.exam.create({
      data: {
        name: dto.name,
        type: dto.type,
        sessionId: dto.sessionId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        sectionId: dto.sectionId || null,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        totalMarks: dto.totalMarks ?? 100,
        passMarks: dto.passMarks ?? 33,
        weight: dto.weight ?? 1,
        gradingMode: dto.gradingMode ?? 'PERCENTAGE',
        createdById: actor.id,
      },
      include: {
        session: { select: { id: true, name: true } },
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    await this.audit.log('exams.create', 'exams', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: exam.id,
      meta: { name: dto.name, type: dto.type, subjectId: dto.subjectId },
    });

    return exam;
  }

  async listExams(query: ListExamQuery, actor?: { id: string; role: string }) {
    const where: Record<string, unknown> = {};
    if (query.classId) where.classId = query.classId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.type) where.type = query.type;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

    // Teachers can only see exams for their assigned class-subjects
    if (actor && actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const classSubjects = await this.prisma.classSubject.findMany({
          where: { teacherId: profile.id },
          select: { classId: true, subjectId: true },
        });
        if (classSubjects.length === 0) {
          return { data: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
        }
        where.OR = classSubjects.map((cs) => ({ classId: cs.classId, subjectId: cs.subjectId }));
      }
    }

    // Students can only see published exams for their enrolled classes
    if (actor && actor.role === 'student') {
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

    const [items, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          session: { select: { id: true, name: true } },
          class: { select: { id: true, name: true, code: true } },
          subject: { select: { id: true, name: true, code: true } },
          _count: { select: { results: true, schedules: true } },
        },
      }),
      this.prisma.exam.count({ where }),
    ]);

    return {
      data: items,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async getExamById(id: string, actor?: { id: string; role: string }) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        session: { select: { id: true, name: true } },
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
        schedules: { include: { subject: { select: { id: true, name: true } } } },
        _count: { select: { results: true } },
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    // Teachers can only access exams for their assigned class-subjects
    if (actor && actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const classSubject = await this.prisma.classSubject.findFirst({
          where: { teacherId: profile.id, classId: exam.classId, subjectId: exam.subjectId },
        });
        if (!classSubject) throw new NotFoundException('Exam not found');
      }
    }

    // Students can only access published exams for their enrolled classes
    if (actor && actor.role === 'student') {
      if (!exam.isPublished) throw new NotFoundException('Exam not found');
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const enrollment = await this.prisma.studentEnrollment.findFirst({
          where: { studentId: profile.id, classId: exam.classId, status: 'ACTIVE' },
        });
        if (!enrollment) throw new NotFoundException('Exam not found');
      }
    }

    return exam;
  }

  async updateExam(id: string, dto: UpdateExamDto, actor: { id: string; role: string; ip?: string }) {
    const existing = await this.prisma.exam.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Exam not found');

    // Teachers can only update exams for their assigned class-subjects
    if (actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const classSubject = await this.prisma.classSubject.findFirst({
          where: { teacherId: profile.id, classId: existing.classId, subjectId: existing.subjectId },
        });
        if (!classSubject) throw new BadRequestException('You can only update exams for your assigned classes');
      }
    }

    const exam = await this.prisma.exam.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.totalMarks !== undefined && { totalMarks: dto.totalMarks }),
        ...(dto.passMarks !== undefined && { passMarks: dto.passMarks }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.gradingMode !== undefined && { gradingMode: dto.gradingMode }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
      include: {
        session: { select: { id: true, name: true } },
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    await this.audit.log('exams.update', 'exams', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: id,
      meta: { changes: dto },
    });

    return exam;
  }

  async deleteExam(id: string, actor: { id: string; role: string; ip?: string }) {
    const existing = await this.prisma.exam.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Exam not found');

    // Teachers can only delete exams for their assigned class-subjects
    if (actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const classSubject = await this.prisma.classSubject.findFirst({
          where: { teacherId: profile.id, classId: existing.classId, subjectId: existing.subjectId },
        });
        if (!classSubject) throw new BadRequestException('You can only delete exams for your assigned classes');
      }
    }

    const hasResults = await this.prisma.examResult.count({ where: { examId: id } });
    if (hasResults > 0) {
      throw new BadRequestException('Cannot delete exam with existing results');
    }

    await this.prisma.exam.delete({ where: { id } });

    await this.audit.log('exams.delete', 'exams', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: id,
      meta: { name: existing.name },
    });

    return { message: 'Exam deleted' };
  }

  // ──── Exam Results ────

  async enterResults(examId: string, dto: BulkEnterResultsDto, actor: { id: string; role: string; ip?: string }) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');

    // Teachers can only enter results for their assigned class-subjects
    if (actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const classSubject = await this.prisma.classSubject.findFirst({
          where: { teacherId: profile.id, classId: exam.classId, subjectId: exam.subjectId },
        });
        if (!classSubject) throw new BadRequestException('You can only enter results for your assigned classes');
      }
    }

    const results = await this.prisma.$transaction(async (tx) => {
      const created: Array<{ id: string }> = [];
      for (const r of dto.results) {
        const existing = await tx.examResult.findUnique({
          where: { examId_studentId: { examId, studentId: r.studentId } },
        });

        if (existing) {
          const updated = await tx.examResult.update({
            where: { id: existing.id },
            data: {
              marksObtained: r.marksObtained ?? existing.marksObtained,
              grade: r.grade ?? existing.grade,
              remark: r.remark ?? existing.remark,
              status: 'DRAFT',
              enteredById: actor.id,
            },
          });
          created.push(updated);
        } else {
          const result = await tx.examResult.create({
            data: {
              examId,
              studentId: r.studentId,
              marksObtained: r.marksObtained ?? null,
              grade: r.grade ?? null,
              remark: r.remark ?? null,
              status: 'DRAFT',
              enteredById: actor.id,
            },
          });
          created.push(result);
        }
      }
      return created;
    });

    await this.audit.log('exams.enter-marks', 'exams', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: examId,
      meta: { count: results.length },
    });

    return { count: results.length, message: `Entered ${results.length} result(s)` };
  }

  async listResults(query: ListResultQuery, actor?: { id: string; role: string }) {
    const where: Record<string, unknown> = {};
    if (query.examId) where.examId = query.examId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.status) where.status = query.status;

    // Teachers can only see results for their assigned class-subjects
    if (actor && actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const classSubjects = await this.prisma.classSubject.findMany({
          where: { teacherId: profile.id },
          select: { classId: true, subjectId: true },
        });
        if (classSubjects.length === 0) {
          return { data: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
        }
        const examIds = await this.prisma.exam.findMany({
          where: { OR: classSubjects.map((cs) => ({ classId: cs.classId, subjectId: cs.subjectId })) },
          select: { id: true },
        });
        where.examId = { in: examIds.map((e) => e.id) };
      }
    }

    // Students can only see their own results
    if (actor && actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        where.studentId = profile.id;
      } else {
        return { data: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.examResult.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          exam: { select: { id: true, name: true, type: true, totalMarks: true, passMarks: true } },
          student: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        },
      }),
      this.prisma.examResult.count({ where }),
    ]);

    return {
      data: items,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async updateResult(id: string, dto: UpdateResultDto, actor: { id: string; role: string; ip?: string }) {
    const existing = await this.prisma.examResult.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Result not found');

    // Teachers can only update results for their assigned class-subjects
    if (actor.role === 'teacher') {
      const exam = await this.prisma.exam.findUnique({ where: { id: existing.examId } });
      if (exam) {
        const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
        if (profile) {
          const classSubject = await this.prisma.classSubject.findFirst({
            where: { teacherId: profile.id, classId: exam.classId, subjectId: exam.subjectId },
          });
          if (!classSubject) throw new BadRequestException('You can only update results for your assigned classes');
        }
      }
    }

    const result = await this.prisma.examResult.update({
      where: { id },
      data: {
        ...(dto.marksObtained !== undefined && { marksObtained: dto.marksObtained }),
        ...(dto.grade !== undefined && { grade: dto.grade }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        exam: { select: { id: true, name: true, totalMarks: true } },
        student: { include: { user: { select: { id: true, fullName: true } } } },
      },
    });

    await this.audit.log('exams.approve', 'exams', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: id,
      meta: { changes: dto },
    });

    return result;
  }

  async publishResults(examId: string, actor: { id: string; role: string; ip?: string }) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');

    // Teachers can only publish results for their assigned class-subjects
    if (actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const classSubject = await this.prisma.classSubject.findFirst({
          where: { teacherId: profile.id, classId: exam.classId, subjectId: exam.subjectId },
        });
        if (!classSubject) throw new BadRequestException('You can only publish results for your assigned classes');
      }
    }

    const count = await this.prisma.examResult.updateMany({
      where: { examId, status: { in: ['DRAFT', 'APPROVED'] } },
      data: { status: 'PUBLISHED' },
    });

    await this.prisma.exam.update({ where: { id: examId }, data: { isPublished: true } });

    await this.audit.log('exams.publish', 'exams', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: examId,
      meta: { count: count.count },
    });

    return { count: count.count, message: `Published ${count.count} result(s)` };
  }

  async getExamStats(examId: string, actor?: { id: string; role: string }) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');

    if (actor && actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const cs = await this.prisma.classSubject.findFirst({
          where: { teacherId: profile.id, classId: exam.classId, subjectId: exam.subjectId },
        });
        if (!cs) throw new NotFoundException('Exam not found');
      }
    }

    // Students should not have access to aggregate exam stats
    if (actor && actor.role === 'student') {
      throw new NotFoundException('Exam not found');
    }

    const results = await this.prisma.examResult.findMany({
      where: { examId },
      select: { marksObtained: true, status: true },
    });

    const total = results.length;
    const published = results.filter((r) => r.status === 'PUBLISHED').length;
    const drafted = results.filter((r) => r.status === 'DRAFT').length;
    const passed = results.filter((r) => r.marksObtained !== null && r.marksObtained >= exam.passMarks).length;
    const avg = total > 0 ? results.reduce((sum, r) => sum + (r.marksObtained ?? 0), 0) / total : 0;

    return { total, published, drafted, passed, failed: total - passed, average: Math.round(avg * 100) / 100 };
  }

  async getOverviewCounts(actor: { id: string; role: string }) {
    const where: Record<string, unknown> = {};
    if (actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const classSubjects = await this.prisma.classSubject.findMany({ where: { teacherId: profile.id }, select: { id: true } });
        where.classId = { in: classSubjects.map((cs) => { const parts = cs.id.split('_'); return parts[0]; }) };
      }
    }

    const now = new Date();
    const [upcoming, total, totalResults] = await Promise.all([
      this.prisma.exam.count({ where: { ...where, startDate: { gte: now } } }),
      this.prisma.exam.count({ where }),
      this.prisma.examResult.count(),
    ]);

    return { upcoming, total, totalResults };
  }
}
