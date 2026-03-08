import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StaffService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string) {
        return this.prisma.staffProfile.findMany({
            where: { tenantId },
            include: {
                user: { select: { email: true, phone: true, status: true, firstName: true, lastName: true } },
                department: true,
                _count: { select: { classesTaught: true } },
            }
        });
    }

    async findOne(tenantId: string, id: string) {
        const staff = await this.prisma.staffProfile.findFirst({
            where: { id, tenantId },
            include: { user: true, department: true }
        });
        if (!staff) throw new NotFoundException('Staff not found');
        return staff;
    }

    async create(tenantId: string, data: any) {
        const { email, phone, firstName, lastName, staffNumber, staffNo, title, designation, departmentId, isTeachingStaff, employmentType, password, role } = data;

        const actualStaffNo = staffNumber || staffNo;

        // Check if email already used in this tenant
        const existingUser = await this.prisma.user.findFirst({
            where: { tenantId, email },
        });
        if (existingUser) throw new ConflictException('Email already in use');

        const hashedPassword = await bcrypt.hash(password || 'staff123', 10);

        return this.prisma.$transaction(async (tx) => {
            // 1. Create User
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

            // 2. Assign Role (using name for now or id if provided)
            const roleObj = await tx.role.findFirst({
                where: { tenantId, name: role || 'TEACHER' }
            });
            if (roleObj) {
                await tx.userRole.create({
                    data: { userId: user.id, roleId: roleObj.id },
                });
            }

            // 3. Create Staff Profile
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

    async update(tenantId: string, id: string, data: any) {
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

    async delete(tenantId: string, id: string) {
        const staff = await this.findOne(tenantId, id);
        return this.prisma.$transaction(async (tx) => {
            await tx.staffProfile.delete({ where: { id } });
            await tx.user.delete({ where: { id: staff.userId } });
            return { message: 'Staff deleted successfully' };
        });
    }

    // Departments
    async findAllDepartments(tenantId: string) {
        return this.prisma.department.findMany({
            where: { tenantId },
            include: { _count: { select: { staff: true } } }
        });
    }

    async createDepartment(tenantId: string, data: any) {
        return this.prisma.department.create({
            data: { ...data, tenantId },
        });
    }
}
