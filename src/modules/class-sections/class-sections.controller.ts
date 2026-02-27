// src/modules/class-sections/class-sections.controller.ts
import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
  UseGuards, ParseIntPipe
} from '@nestjs/common';
import { ClassSectionsService } from './class-sections.service';
import { CreateClassSectionDto } from './dto/create-class-section.dto';
import { UpdateClassSectionDto } from './dto/update-class-section.dto';
import { GetClassSectionsFilterDto } from './dto/get-class-sections-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('class-sections')
export class ClassSectionsController {
  constructor(private readonly service: ClassSectionsService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  async create(@Body() dto: CreateClassSectionDto) {
    const data = await this.service.create(dto);
    return { success: true, data };
  }

  @Get('current-semester')
  getCurrentSemester() {
    const data = this.service.getCurrentSemester();
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() filterDto: GetClassSectionsFilterDto) {

    const result = await this.service.findAllWithFilter(filterDto);
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassSectionDto,
  ) {
    const data = await this.service.update(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.service.remove(id);
    return { success: true, data };
  }
}