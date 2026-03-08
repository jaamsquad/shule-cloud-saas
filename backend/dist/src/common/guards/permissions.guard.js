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
exports.PermissionsGuard = exports.RequirePermissions = exports.PERMISSIONS_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
exports.PERMISSIONS_KEY = 'permissions';
const RequirePermissions = (...permissions) => (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, permissions);
exports.RequirePermissions = RequirePermissions;
let PermissionsGuard = class PermissionsGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    async canActivate(context) {
        const requiredPermissions = this.reflector.getAllAndOverride(exports.PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredPermissions) {
            return true;
        }
        const { user, tenantContext } = context.switchToHttp().getRequest();
        if (!tenantContext)
            return true;
        const plan = tenantContext.subscription?.limitsSnapshot;
        const allowedModules = plan?.allowedModules || [];
        for (const permission of requiredPermissions) {
            const module = permission.split(':')[0];
            if (!allowedModules.includes(module)) {
                throw new common_1.ForbiddenException(`Module ${module} is not included in your current subscription plan.`);
            }
        }
        const userPermissions = user?.permissions || [];
        const hasPermission = requiredPermissions.every((permission) => userPermissions.includes(permission));
        if (!hasPermission) {
            throw new common_1.ForbiddenException('Insufficient permissions');
        }
        return true;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map