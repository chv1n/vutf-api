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
import { InstructorService } from './instructor.service';
import { CreateInstructorByAdminDto } from './dto/create-instructor.dto';
import { GetInstructorsQueryDto } from './dto/get-instructors-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('instructors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) { }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: GetInstructorsQueryDto) {
    return this.instructorService.findAll(query);
  }

  @Roles('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createInstructor(@Body() dto: CreateInstructorByAdminDto) {
    return this.instructorService.createInstructorByAdmin(dto);
  }
}