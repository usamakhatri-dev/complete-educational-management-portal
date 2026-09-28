import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class BackupsService {
  private readonly backupDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {
    this.backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(actor: { id: string; role: string; ip?: string }) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.sql`;
    const filePath = path.join(this.backupDir, filename);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new BadRequestException('DATABASE_URL not configured');

    const record = await this.prisma.backupRecord.create({
      data: {
        filename,
        type: 'FULL',
        sizeBytes: 0,
        status: 'RUNNING',
        path: filePath,
        createdById: actor.id,
      },
    });

    try {
      const url = new URL(dbUrl);
      const host = url.hostname;
      const port = url.port || '5432';
      const dbName = url.pathname.slice(1);
      const username = url.username;
      const password = url.password;

      const env = { ...process.env, PGPASSWORD: password };
      await execAsync(`pg_dump -h ${host} -p ${port} -U ${username} -d ${dbName} -f "${filePath}" --no-owner --no-acl`, { env, timeout: 60000 });

      const stats = fs.statSync(filePath);
      await this.prisma.backupRecord.update({
        where: { id: record.id },
        data: { status: 'COMPLETED', sizeBytes: stats.size },
      });

      await this.audit.log('backup.create', 'backups', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: record.id, meta: { filename } });

      return { id: record.id, filename, status: 'COMPLETED', sizeBytes: stats.size, createdAt: record.createdAt };
    } catch (err) {
      await this.prisma.backupRecord.update({
        where: { id: record.id },
        data: { status: 'FAILED' },
      });
      await this.audit.log('backup.failed', 'backups', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: record.id, meta: { error: String(err) } });
      throw new BadRequestException('Backup failed. Check server logs for details.');
    }
  }

  async listBackups() {
    return this.prisma.backupRecord.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, filename: true, type: true, sizeBytes: true, status: true, createdAt: true, createdById: true },
    });
  }

  async getBackup(id: string) {
    const backup = await this.prisma.backupRecord.findUnique({ where: { id } });
    if (!backup) throw new NotFoundException('Backup not found');
    return backup;
  }

  async downloadBackup(id: string, actor: { id: string; role: string; ip?: string }) {
    const backup = await this.prisma.backupRecord.findUnique({ where: { id } });
    if (!backup) throw new NotFoundException('Backup not found');
    if (backup.status !== 'COMPLETED') throw new BadRequestException('Backup not ready');
    if (!fs.existsSync(backup.path)) throw new NotFoundException('Backup file not found on disk');

    await this.audit.log('backup.download', 'backups', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: id });

    return { path: backup.path, filename: backup.filename, mimeType: 'application/sql' };
  }

  async deleteBackup(id: string, actor: { id: string; role: string; ip?: string }) {
    const backup = await this.prisma.backupRecord.findUnique({ where: { id } });
    if (!backup) throw new NotFoundException('Backup not found');

    if (fs.existsSync(backup.path)) {
      fs.unlinkSync(backup.path);
    }

    await this.prisma.backupRecord.delete({ where: { id } });
    await this.audit.log('backup.delete', 'backups', { userId: actor.id, role: actor.role, ip: actor.ip }, { entityId: id, meta: { filename: backup.filename } });
  }
}
