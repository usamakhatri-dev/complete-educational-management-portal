import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ListNotificationsQuery, CreateNotificationDto } from './dto/notification.dto.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListNotificationsQuery, userId: string) {
    const where: Record<string, unknown> = { userId };

    if (query.type) where.type = query.type;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { body: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        body: dto.body ?? null,
        type: dto.type ?? 'INFO',
        link: dto.link ?? null,
      },
    });
  }

  async createBulk(userIds: string[], title: string, body?: string, type?: string, link?: string) {
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title,
        body: body ?? null,
        type: type ?? 'INFO',
        link: link ?? null,
      })),
    });
  }
}
