import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
export interface TenantContext {
    tenantId: string;
    tenantSubdomain: string;
    subscription: any | null;
}
declare global {
    namespace Express {
        interface Request {
            tenantContext?: TenantContext;
        }
    }
}
export declare class TenancyMiddleware implements NestMiddleware {
    private prisma;
    constructor(prisma: PrismaService);
    use(req: Request, res: Response, next: NextFunction): Promise<void>;
}
