import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LimitsGuard implements CanActivate {
    constructor(private prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { tenantContext, path, method } = request;

        if (!tenantContext || method !== 'POST') return true;

        const plan = tenantContext.subscription?.plan;
        const limits: any = plan?.limitsJson || {};

        if (path.includes('/students')) {
            const current = await this.prisma.student.count({ where: { tenantId: tenantContext.tenantId } });
            if (limits.maxStudents && current >= limits.maxStudents) {
                throw new ForbiddenException(`Maximum student limit of ${limits.maxStudents} reached.`);
            }
        }

        if (path.includes('/staff')) {
            const current = await this.prisma.staffProfile.count({ where: { tenantId: tenantContext.tenantId } });
            if (limits.maxStaff && current >= limits.maxStaff) {
                throw new ForbiddenException(`Maximum staff limit of ${limits.maxStaff} reached.`);
            }
        }

        return true;
    }
}
