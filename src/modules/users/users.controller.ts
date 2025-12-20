// src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { UsersService } from './users.service';
import { GetUsersFilterDto } from './dto/get-users-filter.dto';
import { AdminUpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateStudentByAdminDto } from './dto/create-student.dto';
import { CreateInstructorByAdminDto } from './dto/create-instructor.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('profile')
  getProfile(@Request() req) {
    // req.user มาจาก JwtStrategy.validate()
    return req.user;
  }

  @Roles('admin')
  @Get('instructors')
  @HttpCode(HttpStatus.OK)
  async getInstructors(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search: string
  ) {
    return this.usersService.findAllInstructors(page, limit, search);
  }

  @Roles('admin')
  @Get('instructors/:id')
  @HttpCode(HttpStatus.OK)
  async getInstructorById(@Param('id') id: string) {
    return this.usersService.findOneInstructor(id);
  }

  @Roles('admin')
  @Patch('instructors/:id')
  @HttpCode(HttpStatus.OK)
  async updateInstructor(
    @Param('id') id: string,
    @Body() updateDto: AdminUpdateUserDto
  ) {
    return this.usersService.updateInstructor(id, updateDto);
  }

  @Roles('admin')
  @Delete('instructors/:id')
  @HttpCode(HttpStatus.OK)
  async removeInstructor(@Param('id') id: string) {
    return this.usersService.removeInstructor(id);
  }

  @Roles('admin')
  @Get()
  @HttpCode(HttpStatus.OK)
  async getUsers(@Query() filterDto: GetUsersFilterDto) {
    return this.usersService.findAllUsers(filterDto);
  }

  @Roles('admin')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getUserById(@Param('id') id: string) {
    return this.usersService.findOneUser(id);
  }

  @Roles('admin')
  @Post('student')
  @HttpCode(HttpStatus.CREATED)
  async createStudent(@Body() dto: CreateStudentByAdminDto) {
    return this.usersService.createStudentByAdmin(dto);
  }

  @Roles('admin')
  @Post('instructor')
  @HttpCode(HttpStatus.CREATED)
  async createInstructor(@Body() dto: CreateInstructorByAdminDto) {
    return this.usersService.createInstructorByAdmin(dto);
  }

  @Roles('admin')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id') id: string,
    @Body() updateDto: AdminUpdateUserDto
  ) {
    return this.usersService.updateUser(id, updateDto);
  }

  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async removeUser(@Param('id') id: string) {
    return this.usersService.removeUser(id);
  }
}