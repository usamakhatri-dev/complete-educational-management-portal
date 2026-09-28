import { Controller, Get, Put, Body, Param, Query } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { UpdateSettingDto, UpdateProfileDto } from './dto/setting.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('public')
  getPublic() {
    return this.service.getPublicSettings();
  }

  @Get()
  @RequirePermissions('settings.manage')
  getSettings(@Query('category') category?: string) {
    return this.service.getSettings(category);
  }

  @Put()
  @RequirePermissions('settings.manage')
  updateSetting(@Body() dto: UpdateSettingDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.updateSetting(dto, { id: actor.id, role: actor.role });
  }

  @Get('profile')
  getProfile(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.getProfile(actor.id);
  }

  @Put('profile')
  updateProfile(@Body() dto: UpdateProfileDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.updateProfile(actor.id, dto);
  }
}
