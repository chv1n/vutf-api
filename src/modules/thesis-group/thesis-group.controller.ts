// src/modules/thesis-group/thesis-group.controller.ts
import { Body, Controller, Get, Post, Put, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { ThesisGroupService } from './thesis-group.service';
import { CreateThesisGroupDto } from './dto/create-thesis-group.dto';
import { UpdateThesisDto } from '../thesis/dto/update-thesis.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
@Controller('thesis-group')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ThesisGroupController {
  constructor(private readonly thesisGroupService: ThesisGroupService) { }

  @Post()
  async create(
    @Body() createThesisGroupDto: CreateThesisGroupDto,
    @Req() req,
  ) {
    return this.thesisGroupService.createFullThesis(createThesisGroupDto, req.user.userId);
  }

  @Patch('/:groupId/thesis')
  async updateThesisInfo(
    @Req() req: any,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateThesisDto,
  ) {
    return this.thesisGroupService.updateThesisInfo(req.user.userId, groupId, dto);
  }

  @Get('/:groupId')
  async getThesisGroupById(@Param('groupId') groupId: string) {
    return this.thesisGroupService.getThesisGroupById(groupId);
  }

}
