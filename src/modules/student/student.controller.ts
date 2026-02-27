// src/modules/student/student.controller.ts
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
} from '@nestjs/common';
import { StudentService } from './student.service';
import { InviteStudentsDto } from './dto/invite-students.dto';
import { SetupStudentProfileDto } from './dto/setup-student-profile.dto';
import { GetStudentsQueryDto } from './dto/get-students-query.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) { }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: GetStudentsQueryDto) {
    return this.studentService.findAll(query);
  }

  @RequirePermissions('manage:users')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Post('invite')
  @HttpCode(HttpStatus.OK)
  async inviteStudents(@Body() dto: InviteStudentsDto) {
    return this.studentService.inviteStudents(dto);
  }

  @Get('validate-invite-token')
  @HttpCode(HttpStatus.OK)
  async validateToken(@Query('token') token: string) {
    return this.studentService.validateInviteToken(token);
  }

  @Public()
  @Post('setup-profile')
  @HttpCode(HttpStatus.CREATED)
  async setupProfile(@Body() dto: SetupStudentProfileDto) {
    return this.studentService.setupStudentProfile(dto);
  }


  @Roles('student')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Request() req) {
    const data = await this.studentService.getProfile(req.user.userId);
    return this.studentService.getProfile(req.user.userId);
  }

  @Roles('student')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Request() req, @Body() dto: UpdateStudentProfileDto) {
    const data = await this.studentService.updateProfile(req.user.userId, dto);
    return this.studentService.updateProfile(req.user.userId, dto);
  }
}