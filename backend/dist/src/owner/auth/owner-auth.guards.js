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
exports.OwnerRolesGuard = exports.OwnerRoles = exports.OWNER_ROLES_KEY = exports.OwnerJwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
let OwnerJwtStrategy = class OwnerJwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'owner-jwt') {
    constructor(config) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get('OWNER_JWT_SECRET') || 'fallback_secret',
        });
    }
    async validate(payload) {
        if (payload.type !== 'owner') {
            throw new common_1.UnauthorizedException('Invalid platform token');
        }
        return { userId: payload.sub, email: payload.email };
    }
};
exports.OwnerJwtStrategy = OwnerJwtStrategy;
exports.OwnerJwtStrategy = OwnerJwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OwnerJwtStrategy);
exports.OWNER_ROLES_KEY = 'owner_roles';
const OwnerRoles = (...roles) => (0, common_1.SetMetadata)(exports.OWNER_ROLES_KEY, roles);
exports.OwnerRoles = OwnerRoles;
let OwnerRolesGuard = class OwnerRolesGuard {
    canActivate(context) {
        return true;
    }
};
exports.OwnerRolesGuard = OwnerRolesGuard;
exports.OwnerRolesGuard = OwnerRolesGuard = __decorate([
    (0, common_1.Injectable)()
], OwnerRolesGuard);
//# sourceMappingURL=owner-auth.guards.js.map