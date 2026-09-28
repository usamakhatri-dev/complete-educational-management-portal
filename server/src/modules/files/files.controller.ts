import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { FilesService } from './files.service.js';
import { ListFilesQuery } from './dto/file.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @RequirePermissions('files.upload')
  @UseInterceptors(FileInterceptor('file', { dest: 'uploads/' }))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string; role: string; ip?: string },
    @Body('module') module?: string,
  ) {
    return this.filesService.upload(file, user, module);
  }

  @Get()
  @RequirePermissions('files.download')
  listFiles(
    @Query() query: ListFilesQuery,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.filesService.listFiles(query, user);
  }

  @Get(':id')
  @RequirePermissions('files.download')
  async getFile(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const file = await this.filesService.getFile(id);
    if (user.role !== 'super_admin' && file.uploadedById !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return {
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      module: file.module,
      createdAt: file.createdAt,
    };
  }

  @Get(':id/download')
  @RequirePermissions('files.download')
  async downloadFile(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Res() res: Response,
  ) {
    const { file, stream } = await this.filesService.downloadFile(id, user);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
    });
    stream.pipe(res);
  }

  @Delete(':id')
  @RequirePermissions('files.upload')
  deleteFile(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string; ip?: string },
  ) {
    return this.filesService.deleteFile(id, user);
  }
}
