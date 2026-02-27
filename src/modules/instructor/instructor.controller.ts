// src/modules/instructor/instructor.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Req,
} from '@nestjs/common';
import { InstructorService } from './instructor.service';
import { AdvisorAssignmentService } from '../advisor-assignment/advisor-assignment.service';
import { CreateInstructorByAdminDto } from './dto/create-instructor.dto';
import { GetInstructorsQueryDto } from './dto/get-instructors-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UpdateInstructorProfileDto } from './dto/update-instructor-profile.dto';

import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('instructors')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InstructorController {
  constructor(
    private readonly instructorService: InstructorService,
    private readonly advisorAssignmentService: AdvisorAssignmentService
  ) { }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: GetInstructorsQueryDto) {
    return this.instructorService.findAll(query);
  }

  @RequirePermissions('manage:users')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createInstructor(@Body() dto: CreateInstructorByAdminDto) {
    return this.instructorService.createInstructorByAdmin(dto);
  }

  @Roles('instructor')
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Request() req) {
    return this.instructorService.getProfile(req.user.userId);
  }

  @Roles('instructor')
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Request() req, @Body() dto: UpdateInstructorProfileDto) {
    return this.instructorService.updateProfile(req.user.userId, dto);
  }

  @Roles('instructor')
  @Get('my-advised-groups')
  async getMyAdvisedGroups(@Req() req) {
    return this.advisorAssignmentService.getGroupsByInstructor(req.user.userId);
  }

  @Roles('instructor')
  @Get('my-advised-groups-progress')
  async getMyAdvisedGroupsProgress(@Req() req) {
    return this.advisorAssignmentService.getAdvisedGroupsWithProgress(req.user.userId);
  }
}