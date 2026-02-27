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
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('profile')
  getProfile(@Request() req) {
    // req.user มาจาก JwtStrategy.validate()
    return req.user;
  }

  @RequirePermissions('manage:users')
  @Get()
  @HttpCode(HttpStatus.OK)
  async getUsers(@Query() filterDto: GetUsersFilterDto) {
    return this.usersService.findAllUsers(filterDto);
  }

  @RequirePermissions('manage:users')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getUserById(@Param('id') id: string) {
    return this.usersService.findOneUser(id);
  }

  @RequirePermissions('manage:users')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id') id: string,
    @Body() updateDto: AdminUpdateUserDto
  ) {
    return this.usersService.updateUser(id, updateDto);
  }

  @RequirePermissions('manage:users')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async removeUser(@Param('id') id: string) {
    return this.usersService.removeUser(id);
  }

  @Roles('admin')
  @Patch(':id/permissions')
  @HttpCode(HttpStatus.OK)
  async updatePermissions(
    @Param('id') id: string,
    @Body('permissionIds') permissionIds: number[]
  ) {
    return this.usersService.assignPermissions(id, permissionIds);
  }

  @Roles('admin')
  @Patch(':id/unlock')
  async unlockUser(@Param('id') id: string) {
    return this.usersService.unlockUserAccount(id);
  }
}