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
import { TimetableService } from './timetable.service.js';
import {
  CreateTimetableSlotDto,
  UpdateTimetableSlotDto,
  BulkCreateSlotDto,
  ListTimetableQuery,
} from './dto/timetable.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth-user.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('timetable')
@Roles('super_admin', 'teacher')
export class TimetableController {
  constructor(private readonly service: TimetableService) {}

  // ──────── Overview ────────

  @Get('overview')
  @RequirePermissions('timetable.view')
  getOverview() {
    return this.service.getOverviewCounts();
  }

  // ──────── Single Slot CRUD ────────

  @Post('slots')
  @RequirePermissions('timetable.manage')
  createSlot(
    @Body() dto: CreateTimetableSlotDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.createSlot(dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Get('slots')
  @RequirePermissions('timetable.view')
  listSlots(@Query() query: ListTimetableQuery) {
    return this.service.listSlots(query);
  }

  @Get('slots/:id')
  @RequirePermissions('timetable.view')
  findOneSlot(@Param('id') id: string) {
    return this.service.findOneSlot(id);
  }

  @Patch('slots/:id')
  @RequirePermissions('timetable.manage')
  updateSlot(
    @Param('id') id: string,
    @Body() dto: UpdateTimetableSlotDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateSlot(id, dto, { id: actor.id, role: actor.role, ip: req.ip });
  }

  @Delete('slots/:id')
  @RequirePermissions('timetable.manage')
  removeSlot(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.removeSlot(id, { id: actor.id, role: actor.role, ip: req.ip });
  }

  // ──────── Bulk Operations ────────

  @Post('slots/bulk')
  @RequirePermissions('timetable.manage')
  bulkCreateSlots(
    @Body() dto: BulkCreateSlotDto,
    @Req() req: Request,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.bulkCreateSlots(dto.slots, { id: actor.id, role: actor.role, ip: req.ip });
  }
}
