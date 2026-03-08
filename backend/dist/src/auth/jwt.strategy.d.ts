import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private config;
    private prisma;
    constructor(config: ConfigService, prisma: PrismaService);
    validate(payload: any): Promise<{
        userId: string;
        tenantId: string;
        email: string | null;
        permissions: string[];
        tenantContext: {
            tenantId: string;
            tenantSubdomain: string;
            subscription: ({
                plan: {
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    priceMonthly: import("@prisma/client/runtime/library").Decimal;
                    billingCycle: string;
                    maxStudents: number;
                    moduleToggles: import("@prisma/client/runtime/library").JsonValue | null;
                };
            } & {
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                planId: string;
                trialStart: Date;
                trialEnd: Date | null;
                currentPeriodStart: Date;
                currentPeriodEnd: Date | null;
            }) | null;
        };
    } | null>;
}
export {};
