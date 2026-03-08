import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BasicModulesService {
    constructor(private prisma: PrismaService) { }

    // Library
    async findAllBooks(tenantId: string) {
        return this.prisma.libraryBook.findMany({ where: { tenantId } });
    }
    async createBook(tenantId: string, data: any) {
        return this.prisma.libraryBook.create({ data: { ...data, tenantId } });
    }

    // Transport
    async findAllTransport(tenantId: string) {
        return this.prisma.transportRoute.findMany({ where: { tenantId } });
    }
    async createTransport(tenantId: string, data: any) {
        return this.prisma.transportRoute.create({ data: { ...data, tenantId } });
    }

    // Inventory
    async findAllInventory(tenantId: string) {
        return this.prisma.inventoryItem.findMany({ where: { tenantId } });
    }
    async createInventory(tenantId: string, data: any) {
        return this.prisma.inventoryItem.create({ data: { ...data, tenantId } });
    }
}
