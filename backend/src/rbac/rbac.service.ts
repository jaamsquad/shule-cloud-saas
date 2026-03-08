import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RbacService {
    constructor(private prisma: PrismaService) { }

    async getPermissions() {
        return this.prisma.permission.findMany({
            orderBy: { key: 'asc' },
        });
    }

    async getRoles(tenantId: string) {
        return this.prisma.role.findMany({
            where: { tenantId },
            include: {
                permissions: true,
                _count: { select: { users: true } },
            },
            orderBy: { name: 'asc' },
        });
    }

    async createRole(tenantId: string, data: any) {
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

    async updateRolePermissions(tenantId: string, roleId: string, permissions: string[]) {
        const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId } });
        if (!role) throw new NotFoundException('Role not found');

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

    async deleteRole(tenantId: string, roleId: string) {
        return this.prisma.role.delete({
            where: { id: roleId, tenantId },
        });
    }

    async assignUserRole(tenantId: string, userId: string, roleId: string) {
        return this.prisma.userRole.create({
            data: { userId, roleId },
        });
    }

    async removeUserRole(tenantId: string, userId: string, roleId: string) {
        return this.prisma.userRole.delete({
            where: { userId_roleId: { userId, roleId } },
        });
    }
}
