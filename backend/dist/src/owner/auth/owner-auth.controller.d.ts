import { OwnerAuthService } from './owner-auth.service';
export declare class OwnerAuthController {
    private readonly authService;
    constructor(authService: OwnerAuthService);
    register(dto: any): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    login(dto: any): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    getMe(req: any): Promise<{
        id: string;
        name: string | null;
        email: string;
        isActive: boolean;
        lastLogin: Date | null;
    } | null>;
    changePassword(req: any, dto: any): Promise<boolean>;
}
