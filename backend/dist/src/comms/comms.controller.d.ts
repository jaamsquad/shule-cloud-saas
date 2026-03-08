import { CommsService } from './comms.service';
export declare class CommsController {
    private readonly commsService;
    constructor(commsService: CommsService);
    findAllAnnouncements(req: any): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        message: string;
        tenantId: string;
        title: string;
        createdBy: string;
        targetJson: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    createAnnouncement(req: any, data: any): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        message: string;
        tenantId: string;
        title: string;
        createdBy: string;
        targetJson: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    findAllMessages(req: any): Promise<({
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
    sendMessage(req: any, data: any): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        fromUserId: string;
        toUserId: string | null;
        groupId: string | null;
        text: string;
    }>;
}
