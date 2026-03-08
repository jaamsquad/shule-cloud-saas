import { PrismaService } from '../prisma/prisma.service';
export declare class RbacService {
    private prisma;
    constructor(prisma: PrismaService);
    getPermissions(): Promise<{
        id: string;
        key: string;
    }[]>;
    getRoles(tenantId: string): Promise<({
        permissions: {
            roleId: string;
            permissionKey: string;
        }[];
        _count: {
            users: number;
        };
    } & {
        id: string;
        name: string;
        tenantId: string;
    })[]>;
    createRole(tenantId: string, data: any): Promise<{
        id: string;
        name: string;
        tenantId: string;
    }>;
    updateRolePermissions(tenantId: string, roleId: string, permissions: string[]): Promise<{
        message: string;
    }>;
    deleteRole(tenantId: string, roleId: string): Promise<{
        id: string;
        name: string;
        tenantId: string;
    }>;
    assignUserRole(tenantId: string, userId: string, roleId: string): Promise<{
        roleId: string;
        userId: string;
    }>;
    removeUserRole(tenantId: string, userId: string, roleId: string): Promise<{
        roleId: string;
        userId: string;
    }>;
}
