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
  CreateTeacherDto,
  UpdateTeacherDto,
  CreateStudentDto,
  UpdateStudentDto,
  ListPeopleQuery,
} from './dto/people.dto.js';
import bcrypt from 'bcryptjs';

const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class PeopleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ──────────────────── Teachers ────────────────────

  async createTeacher(
    dto: CreateTeacherDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) throw new ConflictException('Email already in use');

    const existingCode = await this.prisma.teacherProfile.findUnique({
      where: { employeeCode: dto.employeeCode },
    });
    if (existingCode) throw new ConflictException('Employee code already in use');

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);

    const teacher = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          role: 'teacher',
          phone: dto.phone,
          isActive: true,
        },
      });

      const profile = await tx.teacherProfile.create({
        data: {
          userId: user.id,
          employeeCode: dto.employeeCode,
          qualification: dto.qualification,
          specialization: dto.specialization,
          dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : undefined,
          departmentId: dto.departmentId,
          address: dto.address,
        },
      });

      return { user, profile };
    });

    await this.audit.log('teachers.create', 'teachers', actor, {
      entityId: teacher.user.id,
      meta: { email: dto.email, employeeCode: dto.employeeCode },
    });

    return teacher;
  }

  async listTeachers(query: ListPeopleQuery) {
    const where: Record<string, unknown> = { role: 'teacher' };

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { teacherProfile: { employeeCode: { contains: query.search.toUpperCase() } } },
      ];
    }

    if (query.departmentId) {
      where.teacherProfile = {
        ...where.teacherProfile as Record<string, unknown>,
        departmentId: query.departmentId,
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { fullName: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          teacherProfile: {
            include: { department: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async findOneTeacher(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        teacherProfile: {
          include: { department: true },
        },
      },
    });
    if (!user || user.role !== 'teacher') throw new NotFoundException('Teacher not found');
    return user;
  }

  async updateTeacher(
    id: string,
    dto: UpdateTeacherDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    const existing = await this.findOneTeacher(id);

    if (dto.employeeCode && dto.employeeCode !== existing.teacherProfile?.employeeCode) {
      const conflict = await this.prisma.teacherProfile.findUnique({
        where: { employeeCode: dto.employeeCode },
      });
      if (conflict) throw new ConflictException('Employee code already in use');
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.fullName || dto.phone !== undefined || dto.isActive !== undefined) {
        await tx.user.update({
          where: { id },
          data: {
            ...(dto.fullName && { fullName: dto.fullName }),
            ...(dto.phone !== undefined && { phone: dto.phone }),
            ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          },
        });
      }

      if (existing.teacherProfile) {
        await tx.teacherProfile.update({
          where: { userId: id },
          data: {
            ...(dto.employeeCode && { employeeCode: dto.employeeCode }),
            ...(dto.qualification !== undefined && { qualification: dto.qualification }),
            ...(dto.specialization !== undefined && { specialization: dto.specialization }),
            ...(dto.dateOfJoining !== undefined && {
              dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : null,
            }),
            ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
            ...(dto.address !== undefined && { address: dto.address }),
          },
        });
      }
    });

    await this.audit.log('teachers.update', 'teachers', actor, {
      entityId: id,
      meta: { changes: Object.keys(dto) },
    });

    return this.findOneTeacher(id);
  }

  async removeTeacher(
    id: string,
    actor: { id: string; role: string; ip?: string },
  ) {
    const teacher = await this.findOneTeacher(id);

    const hasClasses = await this.prisma.classSubject.findFirst({
      where: { teacherId: teacher.teacherProfile?.id },
    });
    if (hasClasses) {
      throw new BadRequestException('Cannot delete teacher with assigned classes');
    }

    await this.prisma.user.delete({ where: { id } });

    await this.audit.log('teachers.delete', 'teachers', actor, {
      entityId: id,
      meta: { email: teacher.email },
    });

    return { deleted: true };
  }

  // ──────────────────── Students ────────────────────

  async createStudent(
    dto: CreateStudentDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) throw new ConflictException('Email already in use');

    const existingRoll = await this.prisma.studentProfile.findUnique({
      where: { rollNumber: dto.rollNumber },
    });
    if (existingRoll) throw new ConflictException('Roll number already in use');

    const existingAdmission = await this.prisma.studentProfile.findUnique({
      where: { admissionNumber: dto.admissionNumber },
    });
    if (existingAdmission) throw new ConflictException('Admission number already in use');

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);

    const student = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          role: 'student',
          phone: dto.phone,
          isActive: true,
        },
      });

      const profile = await tx.studentProfile.create({
        data: {
          userId: user.id,
          rollNumber: dto.rollNumber,
          admissionNumber: dto.admissionNumber,
          admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
          dob: dto.dob ? new Date(dto.dob) : undefined,
          gender: dto.gender,
          bloodGroup: dto.bloodGroup,
          guardianName: dto.guardianName,
          guardianPhone: dto.guardianPhone,
          guardianRelation: dto.guardianRelation,
          address: dto.address,
        },
      });

      return { user, profile };
    });

    await this.audit.log('students.create', 'students', actor, {
      entityId: student.user.id,
      meta: { email: dto.email, rollNumber: dto.rollNumber },
    });

    return student;
  }

  async listStudents(query: ListPeopleQuery) {
    const where: Record<string, unknown> = { role: 'student' };

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { studentProfile: { rollNumber: { contains: query.search.toUpperCase() } } },
        { studentProfile: { admissionNumber: { contains: query.search.toUpperCase() } } },
      ];
    }

    if (query.status) {
      where.studentProfile = {
        ...where.studentProfile as Record<string, unknown>,
        status: query.status,
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { fullName: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          studentProfile: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async findOneStudent(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: {
          include: {
            enrollments: {
              include: {
                class: true,
                section: true,
                session: true,
              },
            },
          },
        },
      },
    });
    if (!user || user.role !== 'student') throw new NotFoundException('Student not found');
    return user;
  }

  async updateStudent(
    id: string,
    dto: UpdateStudentDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    const existing = await this.findOneStudent(id);

    if (dto.rollNumber && dto.rollNumber !== existing.studentProfile?.rollNumber) {
      const conflict = await this.prisma.studentProfile.findUnique({
        where: { rollNumber: dto.rollNumber },
      });
      if (conflict) throw new ConflictException('Roll number already in use');
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.fullName || dto.phone !== undefined) {
        await tx.user.update({
          where: { id },
          data: {
            ...(dto.fullName && { fullName: dto.fullName }),
            ...(dto.phone !== undefined && { phone: dto.phone }),
          },
        });
      }

      if (existing.studentProfile) {
        await tx.studentProfile.update({
          where: { userId: id },
          data: {
            ...(dto.rollNumber && { rollNumber: dto.rollNumber }),
            ...(dto.dob !== undefined && {
              dob: dto.dob ? new Date(dto.dob) : null,
            }),
            ...(dto.gender !== undefined && { gender: dto.gender }),
            ...(dto.bloodGroup !== undefined && { bloodGroup: dto.bloodGroup }),
            ...(dto.guardianName !== undefined && { guardianName: dto.guardianName }),
            ...(dto.guardianPhone !== undefined && { guardianPhone: dto.guardianPhone }),
            ...(dto.guardianRelation !== undefined && { guardianRelation: dto.guardianRelation }),
            ...(dto.address !== undefined && { address: dto.address }),
            ...(dto.status !== undefined && { status: dto.status }),
          },
        });
      }
    });

    await this.audit.log('students.update', 'students', actor, {
      entityId: id,
      meta: { changes: Object.keys(dto) },
    });

    return this.findOneStudent(id);
  }

  async removeStudent(
    id: string,
    actor: { id: string; role: string; ip?: string },
  ) {
    const student = await this.findOneStudent(id);

    const hasEnrollments = await this.prisma.studentEnrollment.findFirst({
      where: { studentId: student.studentProfile?.id, status: 'ACTIVE' },
    });
    if (hasEnrollments) {
      throw new BadRequestException('Cannot delete student with active enrollments');
    }

    await this.prisma.user.delete({ where: { id } });

    await this.audit.log('students.delete', 'students', actor, {
      entityId: id,
      meta: { email: student.email },
    });

    return { deleted: true };
  }

  // ──────────────────── Overview ────────────────────

  async getOverviewCounts() {
    const [totalTeachers, activeTeachers, totalStudents, activeStudents] = await Promise.all([
      this.prisma.user.count({ where: { role: 'teacher' } }),
      this.prisma.user.count({ where: { role: 'teacher', isActive: true } }),
      this.prisma.user.count({ where: { role: 'student' } }),
      this.prisma.user.count({ where: { role: 'student', isActive: true } }),
    ]);

    return {
      totalTeachers,
      activeTeachers,
      totalStudents,
      activeStudents,
    };
  }
}
