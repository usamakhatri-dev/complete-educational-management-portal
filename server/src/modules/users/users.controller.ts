import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import {
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
  UpdateUserStatusDto,
} from './dto/user.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { IsOptional, IsString } from 'class-validator';

class ListUsersQuery extends PaginationDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  isActive?: string;
}

@Controller('users')
@Roles('super_admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('users.create')
  create(
    @Body() dto: CreateUserDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.create(dto, {
      id: actor.id,
      role: actor.role,
      ip: req.ip,
    });
  }

  @Get()
  @RequirePermissions('users.list')
  findAll(@Query() query: ListUsersQuery) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('users.view')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('users.edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, {
      id: actor.id,
      role: actor.role,
      ip: req.ip,
    });
  }

  @Patch(':id/status')
  @RequirePermissions('users.disable')
  setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.setStatus(id, dto, {
      id: actor.id,
      role: actor.role,
      ip: req.ip,
    });
  }

  @Post(':id/reset-password')
  @RequirePermissions('users.reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.resetPassword(id, dto, {
      id: actor.id,
      role: actor.role,
      ip: req.ip,
    });
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  remove(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.remove(id, {
      id: actor.id,
      role: actor.role,
      ip: req.ip,
    });
  }
}
