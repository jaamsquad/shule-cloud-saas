import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) { }

  async login(data: any) {
    const { email, password, subdomain } = data;

    // 1. Resolve tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
    });

    if (!tenant) throw new NotFoundException('School not found.');
    if (tenant.status !== 'active') throw new UnauthorizedException('School account is inactive.');

    // 2. Find user
    const user = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        email: email,
        status: 'active',
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: true,
              }
            }
          }
        }
      }
    });

    if (!user) throw new UnauthorizedException('Invalid credentials.');

    const pwMatches = await bcrypt.compare(password, user.passwordHash);
    if (!pwMatches) throw new UnauthorizedException('Invalid credentials.');

    // 3. Get permissions
    const permissionsSet = new Set<string>();
    for (const userRole of user.roles) {
      for (const rolePerm of userRole.role.permissions) {
        permissionsSet.add(rolePerm.permissionKey);
      }
    }
    const permissions = Array.from(permissionsSet);

    // 4. Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 5. Generate tokens
    const tokens = await this.getTokens(user.id, tenant.id, user.email || '');

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        permissions,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        theme: tenant.theme,
        logoUrl: tenant.logoUrl,
      }
    };
  }

  async refreshToken(userId: string, tenantId: string, email: string) {
    return this.getTokens(userId, tenantId, email);
  }

  private async getTokens(userId: string, tenantId: string, email: string) {
    const payload = { sub: userId, tenantId, email, type: 'tenant' };
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: '4h',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);
    return { access_token: at, refresh_token: rt };
  }
}
