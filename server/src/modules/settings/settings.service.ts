import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { UpdateSettingDto, UpdateProfileDto } from './dto/setting.dto.js';
import bcrypt from 'bcryptjs';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getSettings(category?: string) {
    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    return this.prisma.setting.findMany({ where, orderBy: { key: 'asc' } });
  }

  async getPublicSettings() {
    return this.prisma.setting.findMany({ where: { isPublic: true }, orderBy: { key: 'asc' } });
  }

  async updateSetting(dto: UpdateSettingDto, actor: { id: string; role: string; ip?: string }) {
    const setting = await this.prisma.setting.upsert({
      where: { key: dto.key },
      update: { value: dto.value, category: dto.category ?? undefined },
      create: { key: dto.key, value: dto.value, category: dto.category ?? 'GENERAL', isPublic: false },
    });
    await this.audit.log('settings.update', 'settings', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: dto.key });
    return setting;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const updateData: Record<string, unknown> = {};
    if (dto.fullName) updateData.fullName = dto.fullName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;

    if (dto.newPassword) {
      if (!dto.currentPassword) throw new BadRequestException('Current password required');
      const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!valid) throw new BadRequestException('Current password is incorrect');
      updateData.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    return this.prisma.user.update({ where: { id: userId }, data: updateData, select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, role: true } });
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fullName: true, email: true, phone: true, avatarUrl: true, role: true,
        teacherProfile: { select: { id: true, employeeCode: true, qualification: true, specialization: true, departmentId: true } },
        studentProfile: { select: { id: true, rollNumber: true, admissionNumber: true, dob: true, gender: true, guardianName: true, guardianPhone: true } },
      },
    });
  }
}
