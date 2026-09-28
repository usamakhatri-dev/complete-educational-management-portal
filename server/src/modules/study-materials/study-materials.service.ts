import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  CreateStudyMaterialDto,
  UpdateStudyMaterialDto,
  ListStudyMaterialQuery,
} from './dto/study-material.dto.js';

@Injectable()
export class StudyMaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateStudyMaterialDto, actor: { id: string; role: string; ip?: string }) {
    const teacherProfile = await this.getTeacherProfile(actor.id, actor.role);
    const cls = await this.prisma.academicClass.findUnique({ where: { id: dto.classId } });
    if (!cls) throw new NotFoundException('Class not found');
    const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
    if (!subject) throw new NotFoundException('Subject not found');

    if (teacherProfile) {
      const cs = await this.prisma.classSubject.findFirst({
        where: { teacherId: teacherProfile.id, classId: dto.classId, subjectId: dto.subjectId },
      });
      if (!cs) throw new BadRequestException('You are not assigned to teach this class-subject combination');
    }

    if (dto.sectionId) {
      const section = await this.prisma.section.findUnique({ where: { id: dto.sectionId } });
      if (!section) throw new NotFoundException('Section not found');
    }

    const material = await this.prisma.studyMaterial.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        classId: dto.classId,
        sectionId: dto.sectionId || null,
        subjectId: dto.subjectId,
        teacherId: teacherProfile?.id ?? null,
        fileIds: dto.fileIds ? JSON.stringify(dto.fileIds) : null,
        isPublished: dto.isPublished ?? false,
      },
      include: {
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
      },
    });

    this.audit.log('study-material.create', 'study-materials', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: material.id, meta: { title: dto.title } });

    return material;
  }

  async findAll(query: ListStudyMaterialQuery, actor: { id: string; role: string }) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const where: Record<string, unknown> = {};

    if (query.classId) where.classId = query.classId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.subjectId) where.subjectId = query.subjectId;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Students only see published materials
    if (actor.role === 'student') {
      where.isPublished = true;
    }

    // Teachers only see their own materials (unless super_admin)
    if (actor.role === 'teacher') {
      const teacherProfile = await this.getTeacherProfile(actor.id, actor.role);
      if (teacherProfile) where.teacherId = teacherProfile.id;
    }

    const [materials, total] = await Promise.all([
      this.prisma.studyMaterial.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          class: { select: { id: true, name: true, code: true } },
          subject: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true } },
        },
      }),
      this.prisma.studyMaterial.count({ where }),
    ]);

    return { items: materials, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, actor: { id: string; role: string }) {
    const material = await this.prisma.studyMaterial.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
      },
    });

    if (!material) throw new NotFoundException('Study material not found');

    // Students can only see published materials
    if (actor.role === 'student' && !material.isPublished) {
      throw new ForbiddenException('Access denied');
    }

    // Teachers can only see their own materials (unless super_admin)
    if (actor.role === 'teacher') {
      const profile = await this.getTeacherProfile(actor.id, actor.role);
      if (profile && material.teacherId !== profile.id) {
        throw new ForbiddenException('Access denied');
      }
    }

    return material;
  }

  async update(id: string, dto: UpdateStudyMaterialDto, actor: { id: string; role: string; ip?: string }) {
    const material = await this.prisma.studyMaterial.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('Study material not found');

    if (actor.role === 'teacher') {
      const teacherProfile = await this.getTeacherProfile(actor.id, actor.role);
      if (teacherProfile && material.teacherId !== teacherProfile.id) {
        throw new ForbiddenException('You can only edit your own materials');
      }
    }

    if (dto.classId) {
      const cls = await this.prisma.academicClass.findUnique({ where: { id: dto.classId } });
      if (!cls) throw new NotFoundException('Class not found');
    }
    if (dto.subjectId) {
      const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
      if (!subject) throw new NotFoundException('Subject not found');
    }

    const updated = await this.prisma.studyMaterial.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.classId !== undefined && { classId: dto.classId }),
        ...(dto.sectionId !== undefined && { sectionId: dto.sectionId || null }),
        ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
        ...(dto.fileIds !== undefined && { fileIds: dto.fileIds ? JSON.stringify(dto.fileIds) : null }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
      include: {
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
      },
    });

    this.audit.log('study-material.update', 'study-materials', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: id });

    return updated;
  }

  async togglePublish(id: string, actor: { id: string; role: string; ip?: string }) {
    const material = await this.prisma.studyMaterial.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('Study material not found');

    if (actor.role === 'teacher') {
      const teacherProfile = await this.getTeacherProfile(actor.id, actor.role);
      if (teacherProfile && material.teacherId !== teacherProfile.id) {
        throw new ForbiddenException('You can only publish/unpublish your own materials');
      }
    }

    const updated = await this.prisma.studyMaterial.update({
      where: { id },
      data: { isPublished: !material.isPublished },
    });

    this.audit.log('study-material.toggle-publish', 'study-materials', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: id, meta: { isPublished: updated.isPublished } });

    return updated;
  }

  async remove(id: string, actor: { id: string; role: string; ip?: string }) {
    const material = await this.prisma.studyMaterial.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('Study material not found');

    if (actor.role === 'teacher') {
      const teacherProfile = await this.getTeacherProfile(actor.id, actor.role);
      if (teacherProfile && material.teacherId !== teacherProfile.id) {
        throw new ForbiddenException('You can only delete your own materials');
      }
    }

    await this.prisma.studyMaterial.delete({ where: { id } });

    this.audit.log('study-material.delete', 'study-materials', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: id, meta: { title: material.title } });

    return { deleted: true };
  }

  private async getTeacherProfile(userId: string, role: string) {
    if (role === 'super_admin') return null;
    const profile = await this.prisma.teacherProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('Teacher profile not found');
    return profile;
  }
}
