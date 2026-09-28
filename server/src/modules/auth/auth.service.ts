import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { AuditService } from '../audit/audit.service.js';
import { LoginDto } from './dto/login.dto.js';

interface ClientInfo {
  ip?: string;
  userAgent?: string;
}

export interface AuthResult {
  user: Record<string, unknown>;
  accessToken: string;
  refreshToken: string;
  permissions: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly rbacService: RbacService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto, client: ClientInfo): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      if (user) {
        await this.auditService.recordLogin(user.id, false, {
          ip: client.ip,
          userAgent: client.userAgent,
          reason: 'Invalid credentials',
        });
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      await this.auditService.recordLogin(user.id, false, {
        ip: client.ip,
        userAgent: client.userAgent,
        reason: 'Account disabled',
      });
      throw new UnauthorizedException('This account has been disabled');
    }

    if (user.mustChangePassword) {
      throw new UnauthorizedException('Password change required. Please reset your password before logging in.');
    }

    await this.auditService.recordLogin(user.id, true, {
      ip: client.ip,
      userAgent: client.userAgent,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const [refreshToken, accessToken, permissions] = await Promise.all([
      this.createRefreshToken(user.id, client),
      this.createAccessToken(user.id, user.email, user.role),
      this.rbacService.getEffectivePermissions(user.id),
    ]);

    await this.auditService.log('auth.login', 'auth', {
      userId: user.id,
      role: user.role,
      ip: client.ip,
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      permissions,
    };
  }

  async refresh(refreshToken: string, client: ClientInfo): Promise<AuthResult> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }
    if (!stored.user.isActive) {
      throw new UnauthorizedException('This account has been disabled');
    }

    // Rotate: revoke the used token, issue a new one.
    const newToken = randomBytes(48).toString('hex');
    const newHash = this.hashToken(newToken);
    await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: newHash,
          expiresAt: this.refreshExpiry(),
          ipAddress: client.ip,
          userAgent: client.userAgent,
        },
      }),
      this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date(), replacedById: newHash },
      }),
    ]);

    const accessToken = await this.createAccessToken(
      stored.userId,
      stored.user.email,
      stored.user.role,
    );
    const permissions = await this.rbacService.getEffectivePermissions(
      stored.userId,
    );

    return {
      user: this.sanitizeUser(stored.user),
      accessToken,
      refreshToken: newToken,
      permissions,
    };
  }

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        teacherProfile: true,
        studentProfile: true,
      },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const permissions = await this.rbacService.getEffectivePermissions(userId);
    return {
      user: this.sanitizeUser(user),
      profile: user.teacherProfile ?? user.studentProfile ?? null,
      permissions,
    };
  }

  private async createAccessToken(
    userId: string,
    email: string,
    role: string,
  ): Promise<string> {
    return this.jwtService.signAsync({ sub: userId, email, role });
  }

  private async createRefreshToken(
    userId: string,
    client: ClientInfo,
  ): Promise<string> {
    const token = randomBytes(48).toString('hex');
    const days = Number(
      this.config.get<string>('JWT_REFRESH_EXPIRES_DAYS') ?? 7,
    );
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        ipAddress: client.ip,
        userAgent: client.userAgent,
      },
    });
    return token;
  }

  private refreshExpiry(): Date {
    const days = Number(
      this.config.get<string>('JWT_REFRESH_EXPIRES_DAYS') ?? 7,
    );
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: {
    passwordHash?: string;
    [key: string]: unknown;
  }) {
    const { passwordHash: _passwordHash, ...rest } = user;
    return rest;
  }
}
