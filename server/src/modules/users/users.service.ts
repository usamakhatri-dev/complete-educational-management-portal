import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import {
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
  UpdateUserStatusDto,
} from './dto/user.dto.js';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rbac: RbacService,
  ) {}

  async create(
    dto: CreateUserDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing)
      throw new ConflictException('A user with this email already exists');

    if (dto.role === 'teacher' && !dto.teacher) {
      throw new BadRequestException(
        'Teacher profile data is required for teacher role',
      );
    }
    if (dto.role === 'student' && !dto.student) {
      throw new BadRequestException(
        'Student profile data is required for student role',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          fullName: dto.fullName,
          email,
          passwordHash,
          role: dto.role,
          phone: dto.phone,
          mustChangePassword: false,
        },
      });

      if (dto.teacher) {
        await tx.teacherProfile.create({
          data: {
            userId: created.id,
            employeeCode: dto.teacher.employeeCode,
            qualification: dto.teacher.qualification,
            specialization: dto.teacher.specialization,
            departmentId: dto.teacher.departmentId,
            dateOfJoining: dto.teacher.dateOfJoining
              ? new Date(dto.teacher.dateOfJoining)
              : null,
          },
        });
      }
      if (dto.student) {
        await tx.studentProfile.create({
          data: {
            userId: created.id,
            rollNumber: dto.student.rollNumber,
            admissionNumber: dto.student.admissionNumber,
            admissionDate: dto.student.admissionDate
              ? new Date(dto.student.admissionDate)
              : null,
            dob: dto.student.dob ? new Date(dto.student.dob) : null,
            gender: dto.student.gender,
            guardianName: dto.student.guardianName,
            guardianPhone: dto.student.guardianPhone,
            guardianRelation: dto.student.guardianRelation,
            address: dto.student.address,
          },
        });
      }
      return created;
    });

    await this.audit.log('users.create', 'users', actor, {
      entityId: user.id,
      meta: { email },
    });

    return this.findOne(user.id);
  }

  async findAll(
    query: PaginationDto & {
      role?: string;
      search?: string;
      isActive?: string;
    },
  ) {
    const where: Record<string, unknown> = {};
    if (query.role) where.role = query.role;
    if (query.isActive !== undefined && query.isActive !== '') {
      where.isActive = query.isActive === 'true';
    }
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search } },
        { email: { contains: query.search.toLowerCase() } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          teacherProfile: { select: { id: true, employeeCode: true } },
          studentProfile: {
            select: {
              id: true,
              rollNumber: true,
              admissionNumber: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        teacherProfile: true,
        studentProfile: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    await this.findOne(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        avatarUrl: dto.avatarUrl,
        isActive: dto.isActive,
      },
    });
    await this.audit.log('users.update', 'users', actor, { entityId: id });
    return this.findOne(updated.id);
  }

  async setStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    await this.findOne(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
    });
    // Revoke all sessions when disabling.
    if (!dto.isActive) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await this.audit.log(
      dto.isActive ? 'users.enable' : 'users.disable',
      'users',
      actor,
      {
        entityId: id,
      },
    );
    return this.findOne(updated.id);
  }

  async remove(id: string, actor: { id: string; role: string; ip?: string }) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    await this.audit.log('users.delete', 'users', actor, { entityId: id });
    return { success: true };
  }

  async resetPassword(
    id: string,
    dto: ResetPasswordDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    await this.findOne(id);
    const generated = dto.newPassword ?? randomBytes(10).toString('base64url');
    const passwordHash = await bcrypt.hash(generated, SALT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash, mustChangePassword: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.audit.log('users.reset-password', 'users', actor, {
      entityId: id,
    });

    return {
      success: true,
      message: dto.newPassword
        ? 'Password has been reset'
        : 'A temporary password has been generated',
      ...(dto.newPassword ? {} : { temporaryPassword: generated }),
    };
  }
}
