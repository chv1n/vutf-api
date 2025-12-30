import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InstructorService } from './instructor.service';
import { CreateInstructorByAdminDto } from './dto/create-instructor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('instructors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  @Roles('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createInstructor(@Body() dto: CreateInstructorByAdminDto) {
    return this.instructorService.createInstructorByAdmin(dto);
  }
}