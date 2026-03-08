import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommsService {
    constructor(private prisma: PrismaService) { }

    // Announcements
    async findAllAnnouncements(tenantId: string) {
        return this.prisma.announcement.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createAnnouncement(tenantId: string, data: any, createdBy: string) {
        return this.prisma.announcement.create({
            data: { ...data, tenantId, createdBy },
        });
    }

    // Messages
    async findAllMessages(tenantId: string, userId: string) {
        return this.prisma.message.findMany({
            where: {
                tenantId,
                OR: [
                    { fromUserId: userId },
                    { toUserId: userId },
                ]
            },
            include: { fromUser: true, toUser: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async sendMessage(tenantId: string, fromUserId: string, data: any) {
        const { toUserId, groupId, text } = data;
        return this.prisma.message.create({
            data: { tenantId, fromUserId, toUserId, groupId, text },
        });
    }
}
