// src/modules/student/student.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { InviteStudentsDto } from './dto/invite-students.dto';
import { SetupStudentProfileDto } from './dto/setup-student-profile.dto';
import { GetStudentsQueryDto } from './dto/get-students-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) { }


  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: GetStudentsQueryDto) {
    return this.studentService.findAll(query);
  }

  @Roles('admin')
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
}