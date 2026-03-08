import { OnboardService } from './onboard.service';
export declare class OnboardController {
    private readonly onboardService;
    constructor(onboardService: OnboardService);
    checkSubdomain(subdomain: string): Promise<{
        available: boolean;
        message: string;
    }>;
    registerTenant(data: any): Promise<{
        message: string;
        tenant: {
            id: string;
            name: string;
            subdomain: string;
            loginUrl: string;
        };
    }>;
}
