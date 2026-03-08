"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CommsService = class CommsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllAnnouncements(tenantId) {
        return this.prisma.announcement.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createAnnouncement(tenantId, data, createdBy) {
        return this.prisma.announcement.create({
            data: { ...data, tenantId, createdBy },
        });
    }
    async findAllMessages(tenantId, userId) {
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
    async sendMessage(tenantId, fromUserId, data) {
        const { toUserId, groupId, text } = data;
        return this.prisma.message.create({
            data: { tenantId, fromUserId, toUserId, groupId, text },
        });
    }
};
exports.CommsService = CommsService;
exports.CommsService = CommsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CommsService);
//# sourceMappingURL=comms.service.js.map