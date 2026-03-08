"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OwnerAuthModule = void 0;
const common_1 = require("@nestjs/common");
const owner_auth_service_1 = require("./owner-auth.service");
const owner_auth_controller_1 = require("./owner-auth.controller");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const owner_auth_guards_1 = require("./owner-auth.guards");
const passport_1 = require("@nestjs/passport");
const prisma_module_1 = require("../../prisma/prisma.module");
const owner_audit_module_1 = require("../audit/owner-audit.module");
let OwnerAuthModule = class OwnerAuthModule {
};
exports.OwnerAuthModule = OwnerAuthModule;
exports.OwnerAuthModule = OwnerAuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({ defaultStrategy: 'owner-jwt' }),
            jwt_1.JwtModule.register({}),
            prisma_module_1.PrismaModule,
            config_1.ConfigModule,
            owner_audit_module_1.OwnerAuditModule,
        ],
        controllers: [owner_auth_controller_1.OwnerAuthController],
        providers: [owner_auth_service_1.OwnerAuthService, owner_auth_guards_1.OwnerJwtStrategy],
        exports: [owner_auth_service_1.OwnerAuthService],
    })
], OwnerAuthModule);
//# sourceMappingURL=owner-auth.module.js.map