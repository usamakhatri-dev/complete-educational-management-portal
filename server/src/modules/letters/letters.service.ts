import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateLetterDto, ListLettersQuery, RespondLetterDto } from './dto/letter.dto.js';

@Injectable()
export class LettersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createLetter(dto: CreateLetterDto, actor: { id: string; role: string; ip?: string }) {
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
    if (!profile) throw new BadRequestException('Student profile not found');

    const count = await this.prisma.letterRequest.count();
    const trackingNumber = `LR-${String(count + 1).padStart(5, '0')}`;

    const letter = await this.prisma.letterRequest.create({
      data: {
        trackingNumber,
        studentId: profile.id,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        createdById: actor.id,
        leaveFrom: dto.leaveFrom ? new Date(dto.leaveFrom) : null,
        leaveTo: dto.leaveTo ? new Date(dto.leaveTo) : null,
        leaveType: dto.leaveType ?? null,
        attachmentIds: dto.attachmentIds ?? null,
      },
    });

    await this.audit.log('letters.create', 'letters', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: letter.id });
    return letter;
  }

  async listLetters(query: ListLettersQuery, actor: { id: string; role: string }) {
    const where: Record<string, unknown> = {};

    if (actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (!profile) return { data: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
      where.studentId = profile.id;
    }

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.studentId && actor.role !== 'student') where.studentId = query.studentId;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { trackingNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.letterRequest.findMany({
        where,
        include: {
          student: { include: { user: { select: { id: true, fullName: true, email: true } } } },
          timeline: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.letterRequest.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async getLetter(id: string, actor: { id: string; role: string }) {
    const letter = await this.prisma.letterRequest.findUnique({
      where: { id },
      include: {
        student: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!letter) throw new NotFoundException('Letter not found');

    if (actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (!profile || letter.studentId !== profile.id) {
        throw new NotFoundException('Letter not found');
      }
    }

    return letter;
  }

  async respondToLetter(id: string, dto: RespondLetterDto, actor: { id: string; role: string; ip?: string }) {
    const letter = await this.prisma.letterRequest.findUnique({ where: { id } });
    if (!letter) throw new NotFoundException('Letter not found');

    const updateData: Record<string, unknown> = {};
    if (dto.status) {
      updateData.status = dto.status;
      if (['APPROVED', 'REJECTED', 'COMPLETED'].includes(dto.status)) {
        updateData.resolvedAt = new Date();
        updateData.resolvedById = actor.id;
      }
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.letterRequest.update({ where: { id }, data: updateData }),
      this.prisma.letterTimeline.create({
        data: {
          letterRequestId: id,
          actorRole: actor.role,
          actorId: actor.id,
          message: dto.message,
          newStatus: dto.status ?? null,
        },
      }),
    ]);

    await this.audit.log('letters.respond', 'letters', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: id });

    return updated;
  }
}
