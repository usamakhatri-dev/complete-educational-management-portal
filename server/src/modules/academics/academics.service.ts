import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreateSessionDto,
  UpdateSessionDto,
  CreateClassDto,
  UpdateClassDto,
  CreateSectionDto,
  UpdateSectionDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  ListAcademicQuery,
} from './dto/academic.dto.js';

@Injectable()
export class AcademicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ──────────────────── Departments ────────────────────

  async createDepartment(
    dto: CreateDepartmentDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    const existing = await this.prisma.department.findFirst({
      where: { OR: [{ name: dto.name }, { code: dto.code }] },
    });
    if (existing)
      throw new ConflictException('A department with this name or code already exists');

    const dept = await this.prisma.department.create({ data: dto });
    await this.audit.log('academic.department.create', 'academic', actor, {
      entityId: dept.id,
      meta: { name: dept.name, code: dept.code },
    });
    return dept;
  }

  async listDepartments(query: PaginationDto & { search?: string }) {
    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { code: { contains: query.search.toUpperCase() } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { _count: { select: { teachers: true, classes: true } } },
      }),
      this.prisma.department.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async findOneDepartment(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { teachers: true, classes: true } } },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async updateDepartment(
    id: string,
    dto: UpdateDepartmentDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    await this.findOneDepartment(id);
    if (dto.code || dto.name) {
      const conflict = await this.prisma.department.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(dto.name ? [{ name: dto.name }] : []),
            ...(dto.code ? [{ code: dto.code }] : []),
          ],
        },
      });
      if (conflict) throw new ConflictException('Another department with this name or code exists');
    }
    const updated = await this.prisma.department.update({ where: { id }, data: dto });
    await this.audit.log('academic.department.update', 'academic', actor, { entityId: id });
    return updated;
  }

  async removeDepartment(id: string, actor: { id: string; role: string; ip?: string }) {
    const dept = await this.findOneDepartment(id);
    if (dept._count.teachers > 0 || dept._count.classes > 0) {
      throw new BadRequestException('Cannot delete a department that has teachers or classes');
    }
    await this.prisma.department.delete({ where: { id } });
    await this.audit.log('academic.department.delete', 'academic', actor, { entityId: id });
    return { success: true };
  }

  // ──────────────────── Sessions ────────────────────

  async createSession(
    dto: CreateSessionDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    const existing = await this.prisma.session.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('A session with this name already exists');

    const session = await this.prisma.session.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isActive: dto.isActive ?? false,
      },
    });

    if (session.isActive) {
      await this.prisma.session.updateMany({
        where: { id: { not: session.id } },
        data: { isActive: false },
      });
    }

    await this.audit.log('academic.session.create', 'academic', actor, {
      entityId: session.id,
      meta: { name: session.name },
    });
    return session;
  }

  async listSessions(query: PaginationDto & { search?: string }) {
    const where: Record<string, unknown> = {};
    if (query.search) {
      where.name = { contains: query.search };
    }

    const [data, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { _count: { select: { classes: true, enrollments: true } } },
      }),
      this.prisma.session.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async findOneSession(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: { _count: { select: { classes: true, enrollments: true, exams: true } } },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async updateSession(
    id: string,
    dto: UpdateSessionDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    await this.findOneSession(id);
    if (dto.name) {
      const conflict = await this.prisma.session.findFirst({
        where: { id: { not: id }, name: dto.name },
      });
      if (conflict) throw new ConflictException('Another session with this name exists');
    }

    const data: Record<string, unknown> = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    const updated = await this.prisma.session.update({ where: { id }, data });

    if (dto.isActive === true) {
      await this.prisma.session.updateMany({
        where: { id: { not: id } },
        data: { isActive: false },
      });
    }

    await this.audit.log('academic.session.update', 'academic', actor, { entityId: id });
    return updated;
  }

  async removeSession(id: string, actor: { id: string; role: string; ip?: string }) {
    const session = await this.findOneSession(id);
    if (session._count.classes > 0 || session._count.enrollments > 0) {
      throw new BadRequestException('Cannot delete a session that has classes or enrollments');
    }
    await this.prisma.session.delete({ where: { id } });
    await this.audit.log('academic.session.delete', 'academic', actor, { entityId: id });
    return { success: true };
  }

  // ──────────────────── Classes ────────────────────

  async createClass(
    dto: CreateClassDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    const conflict = await this.prisma.academicClass.findFirst({
      where: { code: dto.code },
    });
    if (conflict) throw new ConflictException('A class with this code already exists');

    const session = await this.prisma.session.findUnique({ where: { id: dto.sessionId } });
    if (!session) throw new BadRequestException('Session not found');

    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      if (!dept) throw new BadRequestException('Department not found');
    }

    const cls = await this.prisma.academicClass.create({
      data: {
        name: dto.name,
        code: dto.code,
        departmentId: dto.departmentId || null,
        sessionId: dto.sessionId,
        classTeacherId: dto.classTeacherId || null,
        room: dto.room || null,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        session: { select: { id: true, name: true } },
        _count: { select: { sections: true, classSubjects: true, enrollments: true } },
      },
    });

    await this.audit.log('academic.class.create', 'academic', actor, {
      entityId: cls.id,
      meta: { name: cls.name, code: cls.code },
    });
    return cls;
  }

  async listClasses(query: ListAcademicQuery) {
    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { code: { contains: query.search.toUpperCase() } },
      ];
    }
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.departmentId) where.departmentId = query.departmentId;

    const [data, total] = await Promise.all([
      this.prisma.academicClass.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          department: { select: { id: true, name: true, code: true } },
          session: { select: { id: true, name: true } },
          classTeacher: { select: { id: true, user: { select: { fullName: true } } } },
          _count: { select: { sections: true, classSubjects: true, enrollments: true } },
        },
      }),
      this.prisma.academicClass.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async findOneClass(id: string) {
    const cls = await this.prisma.academicClass.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true, code: true } },
        session: { select: { id: true, name: true } },
        classTeacher: { select: { id: true, user: { select: { fullName: true } } } },
        sections: true,
        classSubjects: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
            teacher: { select: { id: true, user: { select: { fullName: true } } } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!cls) throw new NotFoundException('Class not found');
    return cls;
  }

  async updateClass(
    id: string,
    dto: UpdateClassDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    await this.findOneClass(id);
    if (dto.code) {
      const conflict = await this.prisma.academicClass.findFirst({
        where: { id: { not: id }, code: dto.code },
      });
      if (conflict) throw new ConflictException('Another class with this code exists');
    }
    const updated = await this.prisma.academicClass.update({ where: { id }, data: dto });
    await this.audit.log('academic.class.update', 'academic', actor, { entityId: id });
    return this.findOneClass(updated.id);
  }

  async removeClass(id: string, actor: { id: string; role: string; ip?: string }) {
    const cls = await this.findOneClass(id);
    if (cls._count.enrollments > 0) {
      throw new BadRequestException('Cannot delete a class that has enrollments');
    }
    await this.prisma.academicClass.delete({ where: { id } });
    await this.audit.log('academic.class.delete', 'academic', actor, { entityId: id });
    return { success: true };
  }

  // ──────────────────── Sections ────────────────────

  async createSection(
    dto: CreateSectionDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    const cls = await this.prisma.academicClass.findUnique({ where: { id: dto.classId } });
    if (!cls) throw new BadRequestException('Class not found');

    const conflict = await this.prisma.section.findFirst({
      where: { name: dto.name, classId: dto.classId },
    });
    if (conflict) throw new ConflictException('A section with this name already exists in this class');

    const section = await this.prisma.section.create({
      data: { name: dto.name, classId: dto.classId, room: dto.room || null },
      include: { class: { select: { id: true, name: true, code: true } } },
    });

    await this.audit.log('academic.section.create', 'academic', actor, {
      entityId: section.id,
      meta: { name: section.name, classId: dto.classId },
    });
    return section;
  }

  async listSections(query: ListAcademicQuery) {
    const where: Record<string, unknown> = {};
    if (query.classId) where.classId = query.classId;
    if (query.search) {
      where.name = { contains: query.search };
    }

    const [data, total] = await Promise.all([
      this.prisma.section.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          class: { select: { id: true, name: true, code: true } },
          _count: { select: { enrollments: true, timetableSlots: true } },
        },
      }),
      this.prisma.section.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async findOneSection(id: string) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true, code: true } },
        _count: { select: { enrollments: true, timetableSlots: true } },
      },
    });
    if (!section) throw new NotFoundException('Section not found');
    return section;
  }

  async updateSection(
    id: string,
    dto: UpdateSectionDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    await this.findOneSection(id);
    if (dto.name && dto.classId) {
      const conflict = await this.prisma.section.findFirst({
        where: { id: { not: id }, name: dto.name, classId: dto.classId },
      });
      if (conflict) throw new ConflictException('Another section with this name exists in that class');
    }
    const updated = await this.prisma.section.update({ where: { id }, data: dto });
    await this.audit.log('academic.section.update', 'academic', actor, { entityId: id });
    return this.findOneSection(updated.id);
  }

  async removeSection(id: string, actor: { id: string; role: string; ip?: string }) {
    const section = await this.findOneSection(id);
    if (section._count.enrollments > 0) {
      throw new BadRequestException('Cannot delete a section that has enrollments');
    }
    await this.prisma.section.delete({ where: { id } });
    await this.audit.log('academic.section.delete', 'academic', actor, { entityId: id });
    return { success: true };
  }

  // ──────────────────── Subjects ────────────────────

  async createSubject(
    dto: CreateSubjectDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    const existing = await this.prisma.subject.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('A subject with this code already exists');

    const subject = await this.prisma.subject.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description || null,
        credits: dto.credits ?? 1,
        isElective: dto.isElective ?? false,
      },
    });

    await this.audit.log('academic.subject.create', 'academic', actor, {
      entityId: subject.id,
      meta: { name: subject.name, code: subject.code },
    });
    return subject;
  }

  async listSubjects(query: ListAcademicQuery) {
    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { code: { contains: query.search.toUpperCase() } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.subject.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { _count: { select: { classSubjects: true, exams: true } } },
      }),
      this.prisma.subject.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async findOneSubject(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        classSubjects: {
          include: {
            class: { select: { id: true, name: true, code: true } },
            teacher: { select: { id: true, user: { select: { fullName: true } } } },
          },
        },
        _count: { select: { exams: true, assignments: true, quizzes: true } },
      },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  async updateSubject(
    id: string,
    dto: UpdateSubjectDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    await this.findOneSubject(id);
    if (dto.code) {
      const conflict = await this.prisma.subject.findFirst({
        where: { id: { not: id }, code: dto.code },
      });
      if (conflict) throw new ConflictException('Another subject with this code exists');
    }
    const updated = await this.prisma.subject.update({ where: { id }, data: dto });
    await this.audit.log('academic.subject.update', 'academic', actor, { entityId: id });
    return this.findOneSubject(updated.id);
  }

  async removeSubject(id: string, actor: { id: string; role: string; ip?: string }) {
    const subject = await this.findOneSubject(id);
    if (subject._count.exams > 0 || subject._count.assignments > 0 || subject._count.quizzes > 0) {
      throw new BadRequestException('Cannot delete a subject that has exams, assignments, or quizzes');
    }
    await this.prisma.subject.delete({ where: { id } });
    await this.audit.log('academic.subject.delete', 'academic', actor, { entityId: id });
    return { success: true };
  }

  // ──────────────────── ClassSubjects (assign teacher to subject in class) ────────────────────

  async assignSubjectToClass(
    classId: string,
    subjectId: string,
    teacherId: string,
    actor: { id: string; role: string; ip?: string },
  ) {
    const cls = await this.prisma.academicClass.findUnique({ where: { id: classId } });
    if (!cls) throw new BadRequestException('Class not found');

    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new BadRequestException('Subject not found');

    const teacher = await this.prisma.teacherProfile.findUnique({ where: { id: teacherId } });
    if (!teacher) throw new BadRequestException('Teacher not found');

    const existing = await this.prisma.classSubject.findUnique({
      where: { classId_subjectId: { classId, subjectId } },
    });

    if (existing) {
      const updated = await this.prisma.classSubject.update({
        where: { id: existing.id },
        data: { teacherId },
        include: {
          class: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
          teacher: { select: { id: true, user: { select: { fullName: true } } } },
        },
      });
      await this.audit.log('academic.classSubject.update', 'academic', actor, {
        entityId: updated.id,
        meta: { classId, subjectId, teacherId },
      });
      return updated;
    }

    const cs = await this.prisma.classSubject.create({
      data: { classId, subjectId, teacherId },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, user: { select: { fullName: true } } } },
      },
    });

    await this.audit.log('academic.classSubject.create', 'academic', actor, {
      entityId: cs.id,
      meta: { classId, subjectId, teacherId },
    });
    return cs;
  }

  async removeSubjectFromClass(
    classId: string,
    subjectId: string,
    actor: { id: string; role: string; ip?: string },
  ) {
    const existing = await this.prisma.classSubject.findUnique({
      where: { classId_subjectId: { classId, subjectId } },
    });
    if (!existing) throw new NotFoundException('Subject assignment not found');

    await this.prisma.classSubject.delete({ where: { id: existing.id } });
    await this.audit.log('academic.classSubject.delete', 'academic', actor, {
      entityId: existing.id,
      meta: { classId, subjectId },
    });
    return { success: true };
  }

  // ──────────────────── Sections by class ────────────────────

  async getSectionsByClass(classId: string) {
    return this.prisma.section.findMany({
      where: { classId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { enrollments: true, timetableSlots: true } } },
    });
  }

  // ──────────────────── Subjects by class (via ClassSubject) ────────────────────

  async getSubjectsByClass(classId: string) {
    const classSubjects = await this.prisma.classSubject.findMany({
      where: { classId },
      include: { subject: true },
      orderBy: { subject: { name: 'asc' } },
    });
    return classSubjects.map((cs) => cs.subject);
  }

  async getClassSubjects(classId?: string) {
    const where: Record<string, unknown> = {};
    if (classId) where.classId = classId;
    return this.prisma.classSubject.findMany({
      where,
      include: {
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: { include: { user: { select: { id: true, fullName: true } } } },
      },
      orderBy: { subject: { name: 'asc' } },
    });
  }

  // ──────────────────── Overview counts ────────────────────

  async getOverviewCounts() {
    const [departments, sessions, classes, sections, subjects] = await Promise.all([
      this.prisma.department.count(),
      this.prisma.session.count(),
      this.prisma.academicClass.count(),
      this.prisma.section.count(),
      this.prisma.subject.count(),
    ]);
    return { departments, sessions, classes, sections, subjects };
  }

  // ──────────────────── Teacher-scoped data ────────────────────

  async getTeacherClassSubjects(userId: string) {
    const profile = await this.prisma.teacherProfile.findUnique({ where: { userId } });
    if (!profile) return { classes: [], subjects: [] };

    const classSubjects = await this.prisma.classSubject.findMany({
      where: { teacherId: profile.id },
      include: {
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    const classMap = new Map<string, { id: string; name: string; code: string }>();
    const subjectMap = new Map<string, { id: string; name: string; code: string }>();

    for (const cs of classSubjects) {
      classMap.set(cs.class.id, cs.class);
      subjectMap.set(cs.subject.id, cs.subject);
    }

    return {
      classes: Array.from(classMap.values()),
      subjects: Array.from(subjectMap.values()),
    };
  }
}
