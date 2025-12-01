import { Controller, Post, Body, UseGuards, Patch, Param, Delete, ParseIntPipe, Get } from '@nestjs/common';
import { InspectionRoundService } from './inspection_round.service';
import { CreateInspectionRoundDto } from './dto/create-inspection_round.dto';
import { UpdateInspectionRoundDto } from './dto/update-inspection_round.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('inspections')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InspectionRoundController {
  constructor(private readonly inspectionRoundService: InspectionRoundService) { }

  @Get()
  @Roles('admin', 'student', 'instructor')
  async findAll() {
    return await this.inspectionRoundService.findAll();
  }

  @Post()
  @Roles('admin')
  async create(@Body() createInspectionRoundDto: CreateInspectionRoundDto) {
    return await this.inspectionRoundService.create(createInspectionRoundDto);
  }

  @Get(':id')
  @Roles('admin', 'student', 'instructor') // อนุญาตให้ทุกคนที่มีสิทธิ์ดูได้
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.inspectionRoundService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInspectionRoundDto: UpdateInspectionRoundDto,
  ) {
    return await this.inspectionRoundService.update(id, updateInspectionRoundDto);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.inspectionRoundService.remove(id);
  }
}