import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SendMessageDto, ListMessagesQuery } from './dto/message.dto.js';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async send(dto: SendMessageDto, senderId: string) {
    if (senderId === dto.recipientId) {
      throw new BadRequestException('Cannot send a message to yourself');
    }

    const recipient = await this.prisma.user.findUnique({ where: { id: dto.recipientId } });
    if (!recipient) throw new NotFoundException('Recipient not found');

    return this.prisma.message.create({
      data: {
        senderId,
        recipientId: dto.recipientId,
        subject: dto.subject,
        body: dto.body,
      },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
        recipient: { select: { id: true, fullName: true, role: true } },
      },
    });
  }

  async listInbox(query: ListMessagesQuery, userId: string) {
    const where: Record<string, unknown> = { recipientId: userId };

    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { body: { contains: query.search, mode: 'insensitive' } },
        { sender: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: {
          sender: { select: { id: true, fullName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async listSent(query: ListMessagesQuery, userId: string) {
    const where: Record<string, unknown> = { senderId: userId };

    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { body: { contains: query.search, mode: 'insensitive' } },
        { recipient: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: {
          recipient: { select: { id: true, fullName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      data,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async getMessage(id: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
        recipient: { select: { id: true, fullName: true, role: true } },
      },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId && message.recipientId !== userId) {
      throw new NotFoundException('Message not found');
    }

    if (message.recipientId === userId && !message.isRead) {
      await this.prisma.message.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
      });
      message.isRead = true;
      message.readAt = new Date();
    }

    return message;
  }

  async markAsRead(id: string, userId: string) {
    const message = await this.prisma.message.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.recipientId !== userId) throw new NotFoundException('Message not found');

    return this.prisma.message.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({ where: { recipientId: userId, isRead: false } });
    return { count };
  }
}
