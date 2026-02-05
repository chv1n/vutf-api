import { 
  Controller, Get, Post, Body, Param, Delete, Put, Query, 
  Res, HttpStatus, UseGuards 
} from '@nestjs/common';
import type { Response } from 'express';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard) 
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles('admin','instructor')
  async create(@Body() createAnnouncementDto: CreateAnnouncementDto, @Res() res: Response) {
    const result = await this.announcementsService.create(createAnnouncementDto);
    return res.status(HttpStatus.CREATED).json({
      success: true,
      data: result,
    });
  }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string,
    @Res() res: Response
  ) {
    const result = await this.announcementsService.findAll(Number(page), Number(limit), search);
    return res.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const result = await this.announcementsService.findOne(id);
    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
    });
  }

  @Put(':id')
  @Roles('admin','instructor')
  async update(
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
    @Res() res: Response
  ) {
    const result = await this.announcementsService.update(id, updateAnnouncementDto);
    return res.status(HttpStatus.OK).json({
      success: true,
      data: result,
    });
  }

  @Delete(':id')
  @Roles('admin','instructor')
  async remove(@Param('id') id: string, @Res() res: Response) {
    await this.announcementsService.remove(id);
    return res.status(HttpStatus.OK).json({
      success: true,
      data: { message: 'Announcement deleted successfully' },
    });
  }
}