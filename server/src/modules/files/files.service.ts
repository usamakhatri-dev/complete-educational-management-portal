import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { randomUUID } from 'crypto';
import { extname, join, resolve, relative, isAbsolute } from 'path';
import { existsSync, mkdirSync, unlinkSync, renameSync } from 'fs';
import {
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
} from './dto/file.dto.js';

@Injectable()
export class FilesService {
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {
    this.uploadDir = this.config.get<string>('UPLOAD_DIR') || join(process.cwd(), 'uploads');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(
    file: Express.Multer.File,
    actor: { id: string; role: string; ip?: string },
    module?: string,
  ) {
    this.validateFile(file);

    const id = randomUUID();
    const ext = extname(file.originalname).toLowerCase();
    const storedName = `${id}${ext}`;

    const safePath = join(this.uploadDir, storedName);

    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }

    // Move Multer temp file to final location
    if (file.path && existsSync(file.path)) {
      renameSync(file.path, safePath);
    }

    const fileRecord = await this.prisma.file.create({
      data: {
        originalName: file.originalname,
        storedName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        path: safePath,
        module: module || null,
        uploadedById: actor.id,
      },
    });

    this.audit.log('file.upload', 'files', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: fileRecord.id, meta: { originalName: file.originalname, size: file.size } });

    return fileRecord;
  }

  async listFiles(
    query: { module?: string; page?: number; limit?: number },
    actor: { id: string; role: string; ip?: string },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: Record<string, unknown> = {};

    if (query.module) {
      where.module = query.module;
    }

    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          originalName: true,
          storedName: true,
          mimeType: true,
          sizeBytes: true,
          module: true,
          uploadedById: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.file.count({ where }),
    ]);

    return { items: files, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getFile(fileId: string) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async downloadFile(fileId: string, actor: { id: string; role: string }) {
    const file = await this.getFile(fileId);

    // Path traversal protection: ensure resolved path stays within uploadDir
    const resolvedPath = resolve(file.path);
    const resolvedUploadDir = resolve(this.uploadDir);
    const rel = relative(resolvedUploadDir, resolvedPath);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new ForbiddenException('Access denied');
    }

    // Authorization: admin or uploader only
    if (actor.role !== 'super_admin' && file.uploadedById !== actor.id) {
      throw new ForbiddenException('Access denied');
    }

    if (!existsSync(file.path)) {
      throw new NotFoundException('File not found on disk');
    }

    const { createReadStream } = await import('fs');
    return { file, stream: createReadStream(file.path) };
  }

  async deleteFile(fileId: string, actor: { id: string; role: string; ip?: string }) {
    const file = await this.getFile(fileId);

    if (actor.role !== 'super_admin' && file.uploadedById !== actor.id) {
      throw new ForbiddenException('You can only delete your own files');
    }

    if (existsSync(file.path)) {
      unlinkSync(file.path);
    }

    await this.prisma.file.delete({ where: { id: fileId } });

    this.audit.log('file.delete', 'files', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: fileId, meta: { originalName: file.originalName } });

    return { deleted: true };
  }

  async getFilesByIds(ids: string[]) {
    if (!ids.length) return [];
    return this.prisma.file.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        originalName: true,
        storedName: true,
        mimeType: true,
        sizeBytes: true,
        module: true,
        createdAt: true,
      },
    });
  }

  private validateFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(`File too large. Maximum size is 50MB`);
    }

    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`File type "${ext}" is not allowed`);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`MIME type "${file.mimetype}" is not allowed`);
    }

    const dangerous = [/\.\./, /\//, /\\/, /\0/];
    if (dangerous.some((p) => p.test(file.originalname))) {
      throw new BadRequestException('Invalid filename');
    }
  }
}
