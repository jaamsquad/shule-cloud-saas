import { RbacService } from './rbac.service';
export declare class RbacController {
    private readonly rbacService;
    constructor(rbacService: RbacService);
    getPermissions(): Promise<{
        id: string;
        key: string;
    }[]>;
    getRoles(req: any): Promise<({
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
    createRole(req: any, data: any): Promise<{
        id: string;
        name: string;
        tenantId: string;
    }>;
    updateRolePermissions(req: any, roleId: string, data: {
        permissions: string[];
    }): Promise<{
        message: string;
    }>;
    deleteRole(req: any, roleId: string): Promise<{
        id: string;
        name: string;
        tenantId: string;
    }>;
    assignUserRole(req: any, data: any): Promise<{
        roleId: string;
        userId: string;
    }>;
    removeUserRole(req: any, userId: string, roleId: string): Promise<{
        roleId: string;
        userId: string;
    }>;
}
