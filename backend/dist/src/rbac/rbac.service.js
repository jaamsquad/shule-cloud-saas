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
exports.RbacService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let RbacService = class RbacService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPermissions() {
        return this.prisma.permission.findMany({
            orderBy: { key: 'asc' },
        });
    }
    async getRoles(tenantId) {
        return this.prisma.role.findMany({
            where: { tenantId },
            include: {
                permissions: true,
                _count: { select: { users: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async createRole(tenantId, data) {
        const { name, permissions } = data;
        return this.prisma.$transaction(async (tx) => {
            const role = await tx.role.create({
                data: { tenantId, name },
            });
            if (permissions && permissions.length > 0) {
                for (const key of permissions) {
                    await tx.rolePermission.create({
                        data: { roleId: role.id, permissionKey: key },
                    });
                }
            }
            return role;
        });
    }
    async updateRolePermissions(tenantId, roleId, permissions) {
        const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId } });
        if (!role)
            throw new common_1.NotFoundException('Role not found');
        return this.prisma.$transaction(async (tx) => {
            await tx.rolePermission.deleteMany({ where: { roleId } });
            for (const key of permissions) {
                await tx.rolePermission.create({
                    data: { roleId, permissionKey: key },
                });
            }
            return { message: 'Permissions updated successfully' };
        });
    }
    async deleteRole(tenantId, roleId) {
        return this.prisma.role.delete({
            where: { id: roleId, tenantId },
        });
    }
    async assignUserRole(tenantId, userId, roleId) {
        return this.prisma.userRole.create({
            data: { userId, roleId },
        });
    }
    async removeUserRole(tenantId, userId, roleId) {
        return this.prisma.userRole.delete({
            where: { userId_roleId: { userId, roleId } },
        });
    }
};
exports.RbacService = RbacService;
exports.RbacService = RbacService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RbacService);
//# sourceMappingURL=rbac.service.js.map