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
  CreateTimetableSlotDto,
  UpdateTimetableSlotDto,
  ListTimetableQuery,
} from './dto/timetable.dto.js';

@Injectable()
export class TimetableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ──────────────────── Teacher Scope ────────────────────

  private async assertTeacherClassSubjectScope(
    teacherUserId: string,
    classSubjectId: string,
  ) {
    const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: teacherUserId } });
    if (!profile) throw new BadRequestException('Teacher profile not found');
    const cs = await this.prisma.classSubject.findUnique({ where: { id: classSubjectId } });
    if (!cs) throw new NotFoundException('Class-subject assignment not found');
    if (cs.teacherId !== profile.id) {
      throw new BadRequestException('You can only manage timetable slots for your assigned class-subjects');
    }
  }

  // ──────────────────── Conflict Detection ────────────────────

  private async checkConflicts(
    classSubjectId: string,
    sectionId: string | undefined,
    dayOfWeek: number,
    period: number,
    room: string | undefined,
    excludeId?: string,
  ) {
    // 1. Same classSubject at same day+period
    const classSubjectConflict = await this.prisma.timetableSlot.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        classSubjectId,
        dayOfWeek,
        period,
      },
      include: {
        classSubject: {
          include: { class: true, subject: true, teacher: { include: { user: true } } },
        },
      },
    });
    if (classSubjectConflict) {
      throw new ConflictException(
        `This class-subject is already scheduled at day ${dayOfWeek} period ${period}`,
      );
    }

    // 2. Teacher conflict — same teacher, same day, same period
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: { teacher: { include: { user: true } } },
    });
    if (!classSubject) {
      throw new NotFoundException('Class-subject assignment not found');
    }

    const teacherConflict = await this.prisma.timetableSlot.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        dayOfWeek,
        period,
        classSubject: { teacherId: classSubject.teacherId },
      },
      include: {
        classSubject: {
          include: { class: true, subject: true, teacher: { include: { user: true } } },
        },
      },
    });
    if (teacherConflict) {
      const teacherName = classSubject.teacher.user?.fullName || 'Unknown';
      throw new ConflictException(
        `Teacher "${teacherName}" is already assigned at day ${dayOfWeek} period ${period} (class ${teacherConflict.classSubject.class.name}, subject ${teacherConflict.classSubject.subject.name})`,
      );
    }

    // 3. Section conflict — same section, same day, same period
    if (sectionId) {
      const sectionConflict = await this.prisma.timetableSlot.findFirst({
        where: {
          id: excludeId ? { not: excludeId } : undefined,
          sectionId,
          dayOfWeek,
          period,
        },
        include: {
          classSubject: { include: { class: true, subject: true } },
          section: true,
        },
      });
      if (sectionConflict) {
        throw new ConflictException(
          `Section is already scheduled at day ${dayOfWeek} period ${period} (subject: ${sectionConflict.classSubject.subject.name})`,
        );
      }
    }

    // 4. Room conflict — same room, same day, same period
    if (room) {
      const roomConflict = await this.prisma.timetableSlot.findFirst({
        where: {
          id: excludeId ? { not: excludeId } : undefined,
          room,
          dayOfWeek,
          period,
        },
        include: {
          classSubject: { include: { class: true, subject: true } },
        },
      });
      if (roomConflict) {
        throw new ConflictException(
          `Room "${room}" is already booked at day ${dayOfWeek} period ${period} (class ${roomConflict.classSubject.class.name}, subject ${roomConflict.classSubject.subject.name})`,
        );
      }
    }
  }

  // ──────────────────── CRUD ────────────────────

  async createSlot(
    dto: CreateTimetableSlotDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    // Teachers can only create slots for their assigned class-subjects
    if (actor.role === 'teacher') {
      await this.assertTeacherClassSubjectScope(actor.id, dto.classSubjectId);
    }

    await this.checkConflicts(
      dto.classSubjectId,
      dto.sectionId,
      dto.dayOfWeek,
      dto.period,
      dto.room,
    );

    const slot = await this.prisma.timetableSlot.create({
      data: {
        classSubjectId: dto.classSubjectId,
        sectionId: dto.sectionId,
        dayOfWeek: dto.dayOfWeek,
        period: dto.period,
        startTime: dto.startTime,
        endTime: dto.endTime,
        room: dto.room,
      },
      include: {
        classSubject: {
          include: {
            class: true,
            subject: true,
            teacher: { include: { user: true } },
          },
        },
        section: true,
      },
    });

    await this.audit.log('timetable.slot.create', 'timetable', actor, {
      entityId: slot.id,
      meta: { dayOfWeek: dto.dayOfWeek, period: dto.period, room: dto.room },
    });

    return slot;
  }

  async listSlots(query: ListTimetableQuery) {
    const where: Record<string, unknown> = {};

    if (query.classId) {
      where.classSubject = {
        ...where.classSubject as Record<string, unknown>,
        classId: query.classId,
      };
    }

    if (query.teacherId) {
      where.classSubject = {
        ...where.classSubject as Record<string, unknown>,
        teacherId: query.teacherId,
      };
    }

    if (query.sectionId) {
      where.sectionId = query.sectionId;
    }

    if (query.dayOfWeek !== undefined) {
      where.dayOfWeek = query.dayOfWeek;
    }

    if (query.sessionId) {
      where.classSubject = {
        ...where.classSubject as Record<string, unknown>,
        class: {
          ...(where.classSubject as Record<string, unknown>)?.class as Record<string, unknown>,
          sessionId: query.sessionId,
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.timetableSlot.findMany({
        where,
        orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          classSubject: {
            include: {
              class: true,
              subject: true,
              teacher: { include: { user: true } },
            },
          },
          section: true,
        },
      }),
      this.prisma.timetableSlot.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async findOneSlot(id: string) {
    const slot = await this.prisma.timetableSlot.findUnique({
      where: { id },
      include: {
        classSubject: {
          include: {
            class: true,
            subject: true,
            teacher: { include: { user: true } },
          },
        },
        section: true,
      },
    });
    if (!slot) throw new NotFoundException('Timetable slot not found');
    return slot;
  }

  async updateSlot(
    id: string,
    dto: UpdateTimetableSlotDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    const existing = await this.findOneSlot(id);

    // Teachers can only update slots for their assigned class-subjects
    if (actor.role === 'teacher') {
      const classSubjectId = dto.classSubjectId ?? existing.classSubjectId;
      await this.assertTeacherClassSubjectScope(actor.id, classSubjectId);
    }

    const classSubjectId = dto.classSubjectId ?? existing.classSubjectId;
    const sectionId = dto.sectionId !== undefined ? dto.sectionId : (existing.sectionId ?? undefined);
    const dayOfWeek = dto.dayOfWeek ?? existing.dayOfWeek;
    const period = dto.period ?? existing.period;
    const room = dto.room !== undefined ? dto.room : (existing.room ?? undefined);

    await this.checkConflicts(classSubjectId, sectionId, dayOfWeek, period, room, id);

    const slot = await this.prisma.timetableSlot.update({
      where: { id },
      data: {
        ...(dto.classSubjectId !== undefined && { classSubjectId: dto.classSubjectId }),
        ...(dto.sectionId !== undefined && { sectionId: dto.sectionId }),
        ...(dto.dayOfWeek !== undefined && { dayOfWeek: dto.dayOfWeek }),
        ...(dto.period !== undefined && { period: dto.period }),
        ...(dto.startTime !== undefined && { startTime: dto.startTime }),
        ...(dto.endTime !== undefined && { endTime: dto.endTime }),
        ...(dto.room !== undefined && { room: dto.room }),
      },
      include: {
        classSubject: {
          include: {
            class: true,
            subject: true,
            teacher: { include: { user: true } },
          },
        },
        section: true,
      },
    });

    await this.audit.log('timetable.slot.update', 'timetable', actor, {
      entityId: id,
      meta: { changes: Object.keys(dto) },
    });

    return slot;
  }

  async removeSlot(
    id: string,
    actor: { id: string; role: string; ip?: string },
  ) {
    const existing = await this.findOneSlot(id);

    // Teachers can only delete slots for their assigned class-subjects
    if (actor.role === 'teacher') {
      await this.assertTeacherClassSubjectScope(actor.id, existing.classSubjectId);
    }

    await this.prisma.timetableSlot.delete({ where: { id } });

    await this.audit.log('timetable.slot.delete', 'timetable', actor, {
      entityId: id,
    });

    return { deleted: true };
  }

  // ──────────────────── Bulk Operations ────────────────────

  async bulkCreateSlots(
    slots: CreateTimetableSlotDto[],
    actor: { id: string; role: string; ip?: string },
  ) {
    const created: string[] = [];
    const errors: { slot: CreateTimetableSlotDto; error: string }[] = [];

    for (const slot of slots) {
      try {
        // Teachers can only create slots for their assigned class-subjects
        if (actor.role === 'teacher') {
          await this.assertTeacherClassSubjectScope(actor.id, slot.classSubjectId);
        }

        await this.checkConflicts(
          slot.classSubjectId,
          slot.sectionId,
          slot.dayOfWeek,
          slot.period,
          slot.room,
        );
        const result = await this.prisma.timetableSlot.create({
          data: {
            classSubjectId: slot.classSubjectId,
            sectionId: slot.sectionId,
            dayOfWeek: slot.dayOfWeek,
            period: slot.period,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room,
          },
        });
        created.push(result.id);
      } catch (err) {
        errors.push({
          slot,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    await this.audit.log('timetable.slot.bulk-create', 'timetable', actor, {
      meta: { created: created.length, failed: errors.length },
    });

    return { created: created.length, errors, total: slots.length };
  }

  // ──────────────────── Overview ────────────────────

  async getOverviewCounts() {
    const totalSlots = await this.prisma.timetableSlot.count();
    const byDay = await this.prisma.timetableSlot.groupBy({
      by: ['dayOfWeek'],
      _count: { id: true },
      orderBy: { dayOfWeek: 'asc' },
    });

    return {
      totalSlots,
      byDay: byDay.map((d) => ({ dayOfWeek: d.dayOfWeek, count: d._count.id })),
    };
  }
}
