import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { StudyMaterialsService } from './study-materials.service.js';
import {
  CreateStudyMaterialDto,
  UpdateStudyMaterialDto,
  ListStudyMaterialQuery,
} from './dto/study-material.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('study-materials')
export class StudyMaterialsController {
  constructor(private readonly service: StudyMaterialsService) {}

  @Post()
  @RequirePermissions('materials.manage')
  create(
    @Body() dto: CreateStudyMaterialDto,
    @CurrentUser() user: { id: string; role: string; ip?: string },
  ) {
    return this.service.create(dto, user);
  }

  @Get()
  @RequirePermissions('materials.view')
  findAll(
    @Query() query: ListStudyMaterialQuery,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions('materials.view')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermissions('materials.manage')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStudyMaterialDto,
    @CurrentUser() user: { id: string; role: string; ip?: string },
  ) {
    return this.service.update(id, dto, user);
  }

  @Patch(':id/publish')
  @RequirePermissions('materials.manage')
  togglePublish(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string; ip?: string },
  ) {
    return this.service.togglePublish(id, user);
  }

  @Delete(':id')
  @RequirePermissions('materials.manage')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string; ip?: string },
  ) {
    return this.service.remove(id, user);
  }
}
