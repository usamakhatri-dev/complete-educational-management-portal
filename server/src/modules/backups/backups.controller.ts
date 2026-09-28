import { Controller, Get, Post, Delete, Param, Res } from '@nestjs/common';
import { BackupsService } from './backups.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import type { Response } from 'express';
import * as fs from 'fs';

@Controller('backups')
export class BackupsController {
  constructor(private readonly service: BackupsService) {}

  @Post()
  @RequirePermissions('backups.manage')
  create(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.createBackup({ id: actor.id, role: actor.role });
  }

  @Get()
  @RequirePermissions('backups.manage')
  list() {
    return this.service.listBackups();
  }

  @Get(':id')
  @RequirePermissions('backups.manage')
  getOne(@Param('id') id: string) {
    return this.service.getBackup(id);
  }

  @Get(':id/download')
  @RequirePermissions('backups.manage')
  async download(@Param('id') id: string, @Res() res: Response, @CurrentUser() actor: AuthenticatedUser) {
    const info = await this.service.downloadBackup(id, { id: actor.id, role: actor.role });
    res.setHeader('Content-Type', info.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${info.filename}"`);
    fs.createReadStream(info.path).pipe(res);
  }

  @Delete(':id')
  @RequirePermissions('backups.manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.deleteBackup(id, { id: actor.id, role: actor.role });
  }
}
