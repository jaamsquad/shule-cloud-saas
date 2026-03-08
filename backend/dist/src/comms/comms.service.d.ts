import { PrismaService } from '../prisma/prisma.service';
export declare class CommsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllAnnouncements(tenantId: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        message: string;
        tenantId: string;
        title: string;
        createdBy: string;
        targetJson: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    createAnnouncement(tenantId: string, data: any, createdBy: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        message: string;
        tenantId: string;
        title: string;
        createdBy: string;
        targetJson: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    findAllMessages(tenantId: string, userId: string): Promise<({
        fromUser: {
            id: string;
            email: string | null;
            passwordHash: string;
            status: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            phone: string | null;
            firstName: string | null;
            lastName: string | null;
            lastLoginAt: Date | null;
        };
        toUser: {
            id: string;
            email: string | null;
            passwordHash: string;
            status: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            phone: string | null;
            firstName: string | null;
            lastName: string | null;
            lastLoginAt: Date | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        tenantId: string;
        fromUserId: string;
        toUserId: string | null;
        groupId: string | null;
        text: string;
    })[]>;
    sendMessage(tenantId: string, fromUserId: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        fromUserId: string;
        toUserId: string | null;
        groupId: string | null;
        text: string;
    }>;
}
