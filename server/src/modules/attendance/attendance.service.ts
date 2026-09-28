import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  CreateAttendanceDto,
  BulkCreateAttendanceDto,
  UpdateAttendanceDto,
  ListAttendanceQuery,
  AttendanceReportQuery,
} from './dto/attendance.dto.js';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ──── Mark single attendance ────

  async markAttendance(dto: CreateAttendanceDto, actor: { id: string; role: string; ip?: string }) {
    await this.validateAttendanceContext(dto.classId, dto.sectionId, dto.subjectId, dto.studentId);

    let teacherId: string;
    if (actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (!profile) throw new BadRequestException('Teacher profile not found');
      const cs = await this.prisma.classSubject.findFirst({
        where: { teacherId: profile.id, classId: dto.classId, subjectId: dto.subjectId },
      });
      if (!cs) throw new BadRequestException('You are not assigned to teach this class-subject combination');
      teacherId = profile.id;
    } else {
      const cs = await this.prisma.classSubject.findFirst({
        where: { classId: dto.classId, subjectId: dto.subjectId },
      });
      if (!cs) throw new BadRequestException('No teacher assigned to this class-subject combination');
      teacherId = cs.teacherId;
    }

    // Check duplicate
    const existing = await this.prisma.attendance.findFirst({
      where: {
        studentId: dto.studentId,
        date: new Date(dto.date),
        subjectId: dto.subjectId,
        period: dto.period ?? null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Attendance already recorded for this student on ${dto.date} (period: ${dto.period ?? 'N/A'})`,
      );
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        classId: dto.classId,
        sectionId: dto.sectionId || null,
        subjectId: dto.subjectId,
        studentId: dto.studentId,
        teacherId,
        sessionId: await this.getActiveSessionId(),
        timetableSlotId: dto.timetableSlotId || null,
        date: new Date(dto.date),
        period: dto.period ?? null,
        status: dto.status,
        remark: dto.remark || null,
      },
      include: {
        student: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
      },
    });

    await this.audit.log('attendance.mark', 'attendance', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: attendance.id,
      meta: { studentId: dto.studentId, subjectId: dto.subjectId, date: dto.date, status: dto.status },
    });

    return attendance;
  }

  // ──── Bulk mark attendance ────

  async bulkMarkAttendance(dto: BulkCreateAttendanceDto, actor: { id: string; role: string; ip?: string }) {
    const sessionId = await this.getActiveSessionId();

    let teacherId: string;
    if (actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (!profile) throw new BadRequestException('Teacher profile not found');
      const cs = await this.prisma.classSubject.findFirst({
        where: { teacherId: profile.id, classId: dto.classId, subjectId: dto.subjectId },
      });
      if (!cs) throw new BadRequestException('You are not assigned to teach this class-subject combination');
      teacherId = profile.id;
    } else {
      const cs = await this.prisma.classSubject.findFirst({
        where: { classId: dto.classId, subjectId: dto.subjectId },
      });
      if (!cs) throw new BadRequestException('No teacher assigned to this class-subject combination');
      teacherId = cs.teacherId;
    }

    // Validate the context class exists
    const cls = await this.prisma.academicClass.findUnique({ where: { id: dto.classId } });
    if (!cls) throw new NotFoundException('Class not found');

    if (dto.sectionId) {
      const sec = await this.prisma.section.findUnique({ where: { id: dto.sectionId } });
      if (!sec) throw new NotFoundException('Section not found');
    }

    const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
    if (!subject) throw new NotFoundException('Subject not found');

    // Check for existing records
    const existingRecords = await this.prisma.attendance.findMany({
      where: {
        date: new Date(dto.date),
        subjectId: dto.subjectId,
        period: dto.period ?? null,
        studentId: { in: dto.records.map((r) => r.studentId) },
      },
    });

    if (existingRecords.length > 0) {
      const existingIds = existingRecords.map((r) => r.studentId);
      throw new ConflictException(
        `Attendance already exists for ${existingIds.length} student(s) on this date/period`,
      );
    }

    // Bulk create in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.attendance.createMany({
        data: dto.records.map((r) => ({
          classId: dto.classId,
          sectionId: dto.sectionId || null,
          subjectId: dto.subjectId,
          studentId: r.studentId,
          teacherId,
          sessionId,
          timetableSlotId: dto.timetableSlotId || null,
          date: new Date(dto.date),
          period: dto.period ?? null,
          status: r.status,
          remark: r.remark || null,
        })),
      });

      return created;
    });

    await this.audit.log('attendance.bulk-mark', 'attendance', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      meta: {
        classId: dto.classId,
        subjectId: dto.subjectId,
        date: dto.date,
        count: result.count,
      },
    });

    return { count: result.count, message: `Marked attendance for ${result.count} student(s)` };
  }

  // ──── Update single attendance ────

  async updateAttendance(id: string, dto: UpdateAttendanceDto, actor: { id: string; role: string; ip?: string }) {
    const existing = await this.prisma.attendance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Attendance record not found');

    if (actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const cs = await this.prisma.classSubject.findFirst({
          where: { teacherId: profile.id, classId: existing.classId, subjectId: existing.subjectId },
        });
        if (!cs) throw new NotFoundException('Attendance record not found');
      }
    }

    const attendance = await this.prisma.attendance.update({
      where: { id },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
      },
      include: {
        student: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
      },
    });

    await this.audit.log('attendance.edit', 'attendance', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: id,
      meta: { changes: dto },
    });

    return attendance;
  }

  // ──── List attendance records ────

  async listAttendance(query: ListAttendanceQuery, actor: { id: string; role: string }) {
    const where: Record<string, unknown> = {};

    if (query.classId) where.classId = query.classId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.status) where.status = query.status;

    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) (where.date as Record<string, unknown>).gte = new Date(query.dateFrom);
      if (query.dateTo) (where.date as Record<string, unknown>).lte = new Date(query.dateTo);
    }

    // Student can only see their own
    if (actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (profile) where.studentId = profile.id;
    }

    // Teacher can only see attendance for their assigned class-subjects
    if (actor.role === 'teacher') {
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

    const [items, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        orderBy: [{ date: 'desc' }, { period: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          student: { include: { user: { select: { id: true, fullName: true, email: true } } } },
          subject: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true } },
          teacher: { include: { user: { select: { id: true, fullName: true } } } },
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  // ──── Get attendance by ID ────

  async getAttendanceById(id: string, actor?: { id: string; role: string }) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        student: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
        teacher: { include: { user: { select: { id: true, fullName: true } } } },
        session: { select: { id: true, name: true } },
      },
    });

    if (!attendance) throw new NotFoundException('Attendance record not found');

    if (actor && actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (!profile || attendance.studentId !== profile.id) {
        throw new NotFoundException('Attendance record not found');
      }
    }

    // Teachers can only access attendance for their assigned class-subjects
    if (actor && actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const cs = await this.prisma.classSubject.findFirst({
          where: { teacherId: profile.id, classId: attendance.classId, subjectId: attendance.subjectId },
        });
        if (!cs) throw new NotFoundException('Attendance record not found');
      }
    }

    return attendance;
  }

  // ──── Student attendance summary ────

  async getStudentSummary(studentId: string, query: AttendanceReportQuery, actor?: { id: string; role: string }) {
    if (actor && actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (!profile || studentId !== profile.id) {
        throw new ForbiddenException('You can only view your own attendance');
      }
    }

    const where: Record<string, unknown> = { studentId };

    if (query.classId) where.classId = query.classId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.sessionId) where.sessionId = query.sessionId;

    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) (where.date as Record<string, unknown>).gte = new Date(query.dateFrom);
      if (query.dateTo) (where.date as Record<string, unknown>).lte = new Date(query.dateTo);
    }

    const records = await this.prisma.attendance.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true, code: true } },
      },
      orderBy: { date: 'desc' },
    });

    return this.buildSummaryResponse(records);
  }

  // ──── Class attendance summary ────

  async getClassSummary(classId: string, query: AttendanceReportQuery) {
    const where: Record<string, unknown> = { classId };

    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.sessionId) where.sessionId = query.sessionId;

    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) (where.date as Record<string, unknown>).gte = new Date(query.dateFrom);
      if (query.dateTo) (where.date as Record<string, unknown>).lte = new Date(query.dateTo);
    }

    const records = await this.prisma.attendance.findMany({
      where,
      include: {
        student: { include: { user: { select: { id: true, fullName: true } } } },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: { date: 'desc' },
    });

    return this.buildClassSummaryResponse(records);
  }

  // ──── Subject-wise attendance ────

  async getSubjectAttendance(classId: string, query: AttendanceReportQuery) {
    const where: Record<string, unknown> = { classId };

    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.sessionId) where.sessionId = query.sessionId;

    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) (where.date as Record<string, unknown>).gte = new Date(query.dateFrom);
      if (query.dateTo) (where.date as Record<string, unknown>).lte = new Date(query.dateTo);
    }

    const records = await this.prisma.attendance.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        student: { include: { user: { select: { id: true, fullName: true } } } },
      },
    });

    // Group by subject
    const subjectMap = new Map<string, {
      subject: { id: string; name: string; code: string };
      total: number;
      present: number;
      absent: number;
      late: number;
      leave: number;
      holiday: number;
    }>();

    for (const r of records) {
      const key = r.subjectId;
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          subject: r.subject,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          holiday: 0,
        });
      }
      const entry = subjectMap.get(key)!;
      entry.total++;
      if (r.status === 'PRESENT') entry.present++;
      else if (r.status === 'ABSENT') entry.absent++;
      else if (r.status === 'LATE') entry.late++;
      else if (r.status === 'LEAVE') entry.leave++;
      else if (r.status === 'HOLIDAY') entry.holiday++;
    }

    return Array.from(subjectMap.values()).map((s) => ({
      ...s,
      percentage: s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100 * 100) / 100 : 0,
    }));
  }

  // ──── Attendance overview counts ────

  async getOverviewCounts(actor: { id: string; role: string }) {
    const where: Record<string, unknown> = {};

    if (actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (profile) where.studentId = profile.id;
    } else if (actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) where.teacherId = profile.id;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayCount, thisWeekCount, totalRecords] = await Promise.all([
      this.prisma.attendance.count({
        where: { ...where, date: { gte: today, lt: tomorrow } },
      }),
      this.prisma.attendance.count({
        where: {
          ...where,
          date: {
            gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
            lt: tomorrow,
          },
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return { todayCount, thisWeekCount, totalRecords };
  }

  // ──── Delete attendance record ────

  async deleteAttendance(id: string, actor: { id: string; role: string; ip?: string }) {
    const existing = await this.prisma.attendance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Attendance record not found');

    if (actor.role === 'teacher') {
      const profile = await this.prisma.teacherProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const cs = await this.prisma.classSubject.findFirst({
          where: { teacherId: profile.id, classId: existing.classId, subjectId: existing.subjectId },
        });
        if (!cs) throw new NotFoundException('Attendance record not found');
      }
    }

    await this.prisma.attendance.delete({ where: { id } });

    await this.audit.log('attendance.delete', 'attendance', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: id,
      meta: { studentId: existing.studentId, date: existing.date },
    });

    return { message: 'Attendance record deleted' };
  }

  // ──── Helper: Validate context ────

  private async validateAttendanceContext(
    classId: string,
    sectionId: string | undefined,
    subjectId: string,
    studentId: string,
  ) {
    const cls = await this.prisma.academicClass.findUnique({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');

    if (sectionId) {
      const sec = await this.prisma.section.findUnique({ where: { id: sectionId } });
      if (!sec) throw new NotFoundException('Section not found');
    }

    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new NotFoundException('Subject not found');

    const student = await this.prisma.studentProfile.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    // Verify student is enrolled in the class
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: { studentId, classId, status: 'ACTIVE' },
    });
    if (!enrollment) {
      throw new BadRequestException('Student is not enrolled in this class');
    }
  }

  // ──── Helper: Get teacher profile ────

  private async getTeacherProfile(userId: string, role: string) {
    if (role === 'super_admin') return null;
    const profile = await this.prisma.teacherProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('Teacher profile not found');
    return profile;
  }

  // ──── Helper: Get active session ────

  private async getActiveSessionId(): Promise<string> {
    const session = await this.prisma.session.findFirst({ where: { isActive: true } });
    if (!session) throw new BadRequestException('No active academic session found');
    return session.id;
  }

  // ──── Helper: Build summary response ────

  private buildSummaryResponse(records: Array<{
    status: string;
    date: Date;
    subject: { id: string; name: string; code: string };
    class: { id: string; name: string; code: string };
  }>) {
    const total = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const leave = records.filter((r) => r.status === 'LEAVE').length;
    const holiday = records.filter((r) => r.status === 'HOLIDAY').length;

    const percentage = total > 0 ? Math.round(((present + late) / total) * 100 * 100) / 100 : 0;

    // Group by subject
    const bySubject = new Map<string, {
      subject: { id: string; name: string; code: string };
      total: number;
      present: number;
      absent: number;
      percentage: number;
    }>();

    for (const r of records) {
      const key = r.subject.id;
      if (!bySubject.has(key)) {
        bySubject.set(key, { subject: r.subject, total: 0, present: 0, absent: 0, percentage: 0 });
      }
      const entry = bySubject.get(key)!;
      entry.total++;
      if (r.status === 'PRESENT' || r.status === 'LATE') entry.present++;
      else entry.absent++;
    }

    const subjectSummary = Array.from(bySubject.values()).map((s) => ({
      ...s,
      percentage: s.total > 0 ? Math.round((s.present / s.total) * 100 * 100) / 100 : 0,
    }));

    return {
      total,
      present,
      absent,
      late,
      leave,
      holiday,
      percentage,
      subjectSummary,
    };
  }

  // ──── Helper: Build class summary response ────

  private buildClassSummaryResponse(records: Array<{
    status: string;
    date: Date;
    studentId: string;
    student: { user: { fullName: string } };
    subject: { id: string; name: string; code: string };
  }>) {
    const total = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const leave = records.filter((r) => r.status === 'LEAVE').length;
    const holiday = records.filter((r) => r.status === 'HOLIDAY').length;

    const percentage = total > 0 ? Math.round(((present + late) / total) * 100 * 100) / 100 : 0;

    // Group by student
    const byStudent = new Map<string, {
      studentId: string;
      studentName: string;
      total: number;
      present: number;
      absent: number;
      late: number;
      percentage: number;
    }>();

    for (const r of records) {
      const key = r.studentId;
      if (!byStudent.has(key)) {
        byStudent.set(key, {
          studentId: key,
          studentName: r.student.user.fullName,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          percentage: 0,
        });
      }
      const entry = byStudent.get(key)!;
      entry.total++;
      if (r.status === 'PRESENT') entry.present++;
      else if (r.status === 'ABSENT') entry.absent++;
      else if (r.status === 'LATE') entry.late++;
    }

    const studentSummary = Array.from(byStudent.values()).map((s) => ({
      ...s,
      percentage: s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100 * 100) / 100 : 0,
    }));

    return {
      total,
      present,
      absent,
      late,
      leave,
      holiday,
      percentage,
      studentSummary,
    };
  }
}
