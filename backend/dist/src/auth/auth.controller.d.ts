import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(data: any): Promise<{
        user: {
            id: string;
            email: string | null;
            phone: string | null;
            permissions: string[];
        };
        tenant: {
            id: string;
            name: string;
            subdomain: string;
            theme: string | null;
            logoUrl: string | null;
        };
        access_token: string;
        refresh_token: string;
    }>;
    refresh(req: any): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    me(req: any): Promise<any>;
}
