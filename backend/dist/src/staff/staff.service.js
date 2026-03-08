"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
let StaffService = class StaffService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId) {
        return this.prisma.staffProfile.findMany({
            where: { tenantId },
            include: {
                user: { select: { email: true, phone: true, status: true, firstName: true, lastName: true } },
                department: true,
                _count: { select: { classesTaught: true } },
            }
        });
    }
    async findOne(tenantId, id) {
        const staff = await this.prisma.staffProfile.findFirst({
            where: { id, tenantId },
            include: { user: true, department: true }
        });
        if (!staff)
            throw new common_1.NotFoundException('Staff not found');
        return staff;
    }
    async create(tenantId, data) {
        const { email, phone, firstName, lastName, staffNumber, staffNo, title, designation, departmentId, isTeachingStaff, employmentType, password, role } = data;
        const actualStaffNo = staffNumber || staffNo;
        const existingUser = await this.prisma.user.findFirst({
            where: { tenantId, email },
        });
        if (existingUser)
            throw new common_1.ConflictException('Email already in use');
        const hashedPassword = await bcrypt.hash(password || 'staff123', 10);
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    tenantId,
                    email,
                    phone,
                    firstName,
                    lastName,
                    passwordHash: hashedPassword,
                    status: 'active',
                }
            });
            const roleObj = await tx.role.findFirst({
                where: { tenantId, name: role || 'TEACHER' }
            });
            if (roleObj) {
                await tx.userRole.create({
                    data: { userId: user.id, roleId: roleObj.id },
                });
            }
            return tx.staffProfile.create({
                data: {
                    tenantId,
                    userId: user.id,
                    staffNo: actualStaffNo,
                    title,
                    designation,
                    isTeachingStaff: isTeachingStaff !== undefined ? isTeachingStaff : true,
                    departmentId: departmentId && departmentId !== 'none' ? departmentId : null,
                    employmentType,
                },
                include: { user: true, department: true }
            });
        });
    }
    async update(tenantId, id, data) {
        const { title, designation, departmentId, isTeachingStaff, employmentType, status, firstName, lastName } = data;
        const staff = await this.findOne(tenantId, id);
        return this.prisma.$transaction(async (tx) => {
            if (status || firstName || lastName) {
                await tx.user.update({
                    where: { id: staff.userId },
                    data: { status, firstName, lastName },
                });
            }
            return tx.staffProfile.update({
                where: { id },
                data: {
                    title,
                    designation,
                    isTeachingStaff: isTeachingStaff !== undefined ? isTeachingStaff : undefined,
                    departmentId: departmentId && departmentId !== 'none' ? departmentId : undefined,
                    employmentType
                },
            });
        });
    }
    async delete(tenantId, id) {
        const staff = await this.findOne(tenantId, id);
        return this.prisma.$transaction(async (tx) => {
            await tx.staffProfile.delete({ where: { id } });
            await tx.user.delete({ where: { id: staff.userId } });
            return { message: 'Staff deleted successfully' };
        });
    }
    async findAllDepartments(tenantId) {
        return this.prisma.department.findMany({
            where: { tenantId },
            include: { _count: { select: { staff: true } } }
        });
    }
    async createDepartment(tenantId, data) {
        return this.prisma.department.create({
            data: { ...data, tenantId },
        });
    }
};
exports.StaffService = StaffService;
exports.StaffService = StaffService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StaffService);
//# sourceMappingURL=staff.service.js.map