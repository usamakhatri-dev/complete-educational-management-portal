import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  ListAnnouncementsQuery,
} from './dto/announcement.dto.js';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateAnnouncementDto, actor: { id: string; role: string; ip?: string }) {
    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type ?? 'ANNOUNCEMENT',
        audience: dto.audience ?? 'ALL',
        classId: dto.classId ?? null,
        sectionId: dto.sectionId ?? null,
        targetRole: dto.targetRole ?? null,
        targetUserId: dto.targetUserId ?? null,
        createdById: actor.id,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isPinned: dto.isPinned ?? false,
      },
    });

    await this.audit.log('announcements.create', 'announcements', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: announcement.id });
    return announcement;
  }

  async update(id: string, dto: UpdateAnnouncementDto, actor: { id: string; role: string; ip?: string }) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.audience !== undefined) data.audience = dto.audience;
    if (dto.classId !== undefined) data.classId = dto.classId;
    if (dto.sectionId !== undefined) data.sectionId = dto.sectionId;
    if (dto.targetRole !== undefined) data.targetRole = dto.targetRole;
    if (dto.targetUserId !== undefined) data.targetUserId = dto.targetUserId;
    if (dto.expiresAt !== undefined) data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.isPinned !== undefined) data.isPinned = dto.isPinned;

    const updated = await this.prisma.announcement.update({ where: { id }, data });
    await this.audit.log('announcements.update', 'announcements', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: id });
    return updated;
  }

  async remove(id: string, actor: { id: string; role: string; ip?: string }) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');

    await this.prisma.announcement.delete({ where: { id } });
    await this.audit.log('announcements.delete', 'announcements', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: id });
    return { deleted: true };
  }

  async list(query: ListAnnouncementsQuery, actor: { id: string; role: string }) {
    const where: Record<string, unknown> = {};

    if (actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const enrollment = await this.prisma.studentEnrollment.findFirst({
          where: { studentId: profile.id, status: 'ACTIVE' },
        });
        where.OR = [
          { audience: 'ALL' },
          { audience: 'STUDENTS' },
          { audience: 'CLASS', classId: enrollment?.classId },
          { audience: 'SECTION', sectionId: enrollment?.sectionId },
          { targetUserId: actor.id },
        ];
      } else {
        where.OR = [{ audience: 'ALL' }, { audience: 'STUDENTS' }];
      }
    } else if (actor.role === 'teacher') {
      where.OR = [
        { audience: 'ALL' },
        { audience: 'TEACHERS' },
        { targetRole: 'teacher' },
        { targetUserId: actor.id },
      ];
    }

    if (query.audience) where.audience = query.audience;
    if (query.classId) where.classId = query.classId;
    if (query.search) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { content: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        include: {
          class: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { publishDate: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async getOne(id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
      },
    });
    if (!announcement) throw new NotFoundException('Announcement not found');
    return announcement;
  }
}
