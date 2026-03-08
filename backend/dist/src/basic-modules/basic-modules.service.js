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
exports.BasicModulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BasicModulesService = class BasicModulesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllBooks(tenantId) {
        return this.prisma.libraryBook.findMany({ where: { tenantId } });
    }
    async createBook(tenantId, data) {
        return this.prisma.libraryBook.create({ data: { ...data, tenantId } });
    }
    async findAllTransport(tenantId) {
        return this.prisma.transportRoute.findMany({ where: { tenantId } });
    }
    async createTransport(tenantId, data) {
        return this.prisma.transportRoute.create({ data: { ...data, tenantId } });
    }
    async findAllInventory(tenantId) {
        return this.prisma.inventoryItem.findMany({ where: { tenantId } });
    }
    async createInventory(tenantId, data) {
        return this.prisma.inventoryItem.create({ data: { ...data, tenantId } });
    }
};
exports.BasicModulesService = BasicModulesService;
exports.BasicModulesService = BasicModulesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BasicModulesService);
//# sourceMappingURL=basic-modules.service.js.map