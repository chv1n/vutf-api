// src/modules/thesis-files/thesis-files.controller.ts
import { Controller, UseGuards, Get, Query, Res, BadRequestException, Request } from '@nestjs/common';
import * as Express from 'express';
import { ThesisFilesService } from './thesis-files.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('thesis-files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ThesisFilesController {
  constructor(private readonly thesisFilesService: ThesisFilesService) { }

  @Get('browse')
  @Roles('admin')
  async browse(@Query('path') path: string) {
    // path parameter: เช่น ?path=WIP/2567/1
    return this.thesisFilesService.getContents(path);
  }

  @Get('search')
  @Roles('admin')
  search(@Query('q') q: string) {
    return this.thesisFilesService.search(q);
  }

  @Get('download-zip')
  @Roles('admin')
  async downloadZip(
    @Query('path') path: string,
    @Res() res: Express.Response,
    @Request() req: any
  ) {
    await this.thesisFilesService.downloadZip(path, res, req.user);
  }

  @Get('stats')
  @Roles('admin')
  async getStats() {
    return this.thesisFilesService.getDashboardStats();
  }
}