import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

const CACHE_TTL_MS = 30_000;

interface CacheEntry {
  keys: string[];
  expiresAt: number;
}

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);
  private readonly permissionCache = new Map<string, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  /** Effective permission keys for a user. super_admin always returns the full catalog. */
  async getEffectivePermissions(userId: string): Promise<string[]> {
    const cached = this.permissionCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.keys;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) return [];

    let keys: string[];
    if (user.role === 'super_admin') {
      const perms = await this.prisma.permission.findMany({
        select: { key: true },
      });
      keys = perms.map((p) => p.key);
    } else {
      const role = await this.prisma.role.findUnique({
        where: { name: user.role },
        select: {
          permissions: { select: { permission: { select: { key: true } } } },
        },
      });
      keys = (role?.permissions ?? []).map((rp) => rp.permission.key);
    }

    this.permissionCache.set(userId, {
      keys,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return keys;
  }

  invalidate(userId?: string): void {
    if (userId) this.permissionCache.delete(userId);
    else this.permissionCache.clear();
  }

  async getPermissionCatalog() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { label: 'asc' }],
      include: { roles: { select: { role: { select: { name: true } } } } },
    });
  }

  async getRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: { select: { permission: { select: { key: true } } } },
      },
    });
  }

  async updateRolePermissions(roleId: string, keys: string[]) {
    const existing = await this.prisma.permission.findMany({
      where: { key: { in: keys } },
      select: { id: true },
    });
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: existing.map((p) => ({ roleId, permissionId: p.id })),
      }),
    ]);
    // Roles are shared by all users of that role; clear the whole cache.
    this.invalidate();
    return this.getRoles();
  }
}
