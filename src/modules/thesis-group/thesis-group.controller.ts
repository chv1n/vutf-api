import { Body, Controller, Get, Post, Put, Param, Req, UseGuards } from '@nestjs/common';
import { ThesisGroupService } from './thesis-group.service';
import { CreateThesisGroupDto } from './dto/create-thesis-group.dto';
import { UpdateThesisDto } from '../thesis/dto/update-thesis.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('thesis-group')
export class ThesisGroupController {
  constructor(private readonly thesisGroupService: ThesisGroupService) { }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Body() createThesisGroupDto: CreateThesisGroupDto,
    @Req() req,
  ) {
    return this.thesisGroupService.createFullThesis(createThesisGroupDto, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('/:groupId/thesis')
  async updateThesisInfo(
    @Req() req,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateThesisDto,
  ) {
    return this.thesisGroupService.updateThesisInfo(req.user.userId, groupId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/:groupId')
  async getThesisGroupById(@Param('groupId') groupId: string) {
    return this.thesisGroupService.getThesisGroupById(groupId);
  }
}
