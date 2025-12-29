import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ThesisGroupService } from './thesis-group.service';
import { CreateThesisGroupDto } from './dto/create-thesis-group.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('thesis-group')
export class ThesisGroupController {
  constructor(private readonly thesisGroupService: ThesisGroupService) {}


  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Body() createThesisGroupDto: CreateThesisGroupDto,
    @Req() req,
  ) {
    console.log('User Info:', req.user.userId);
    return this.thesisGroupService.createFullThesis(createThesisGroupDto, req.user.userId);
  }
}


