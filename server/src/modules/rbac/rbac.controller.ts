import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { RbacService } from './rbac.service.js';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('permissions')
  @RequirePermissions('users.list')
  getPermissionCatalog() {
    return this.rbacService.getPermissionCatalog();
  }

  @Get('roles')
  @RequirePermissions('users.list')
  getRoles() {
    return this.rbacService.getRoles();
  }

  @Put('roles/:id/permissions')
  @RequirePermissions('users.edit')
  updateRolePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rbacService.updateRolePermissions(id, dto.permissions);
  }
}
