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
exports.GuardiansService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let GuardiansService = class GuardiansService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId) {
        return this.prisma.guardian.findMany({
            where: { tenantId },
            include: { students: true }
        });
    }
    async create(tenantId, data) {
        return this.prisma.guardian.create({
            data: { ...data, tenantId },
        });
    }
    async findOne(tenantId, id) {
        const guardian = await this.prisma.guardian.findFirst({
            where: { id, tenantId },
            include: { students: true }
        });
        if (!guardian)
            throw new common_1.NotFoundException('Guardian not found');
        return guardian;
    }
};
exports.GuardiansService = GuardiansService;
exports.GuardiansService = GuardiansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GuardiansService);
//# sourceMappingURL=guardians.service.js.map