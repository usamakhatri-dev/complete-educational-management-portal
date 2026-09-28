import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export interface AuditContext {
  userId?: string;
  role?: string;
  ip?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Persist an audit trail entry for a performed action. */
  async log(
    action: string,
    module: string,
    context: AuditContext,
    opts?: { entityId?: string; meta?: Record<string, unknown> },
  ) {
    await this.prisma.activityLog
      .create({
        data: {
          action,
          module,
          userId: context.userId,
          role: context.role,
          entityId: opts?.entityId,
          meta: opts?.meta ? JSON.stringify(opts.meta) : null,
          ipAddress: context.ip,
        },
      })
      .catch((err) => {
        // Audit logging must never break the business operation.
        console.error('Audit log failed', err);
      });
  }

  async recordLogin(
    userId: string,
    success: boolean,
    ctx: { ip?: string; userAgent?: string; device?: string; reason?: string },
  ) {
    await this.prisma.loginHistory
      .create({
        data: {
          userId,
          success,
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
          device: ctx.device,
          reason: ctx.reason,
        },
      })
      .catch(() => undefined);
  }

  async listActivityLogs(
    query: PaginationDto & {
      module?: string;
      action?: string;
      userId?: string;
    },
  ) {
    const where: Record<string, unknown> = {};
    if (query.module) where.module = query.module;
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;

    const [items, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
        },
      }),
      this.prisma.activityLog.count({ where }),
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

  async listLoginHistory(
    query: PaginationDto & { userId?: string; success?: boolean },
  ) {
    const where: Record<string, unknown> = {};
    if (query.userId) where.userId = query.userId;
    if (query.success !== undefined) where.success = query.success;

    const [items, total] = await Promise.all([
      this.prisma.loginHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
        },
      }),
      this.prisma.loginHistory.count({ where }),
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
}
