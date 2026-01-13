import { 
  Controller, Get, Post, Put, Delete, 
  Body, Param, Query, Request, 
  UseGuards, ParseIntPipe 
} from '@nestjs/common';
import { ClassSectionsService } from './class-sections.service';
import { CreateClassSectionDto } from './dto/create-class-section.dto';
import { UpdateClassSectionDto } from './dto/update-class-section.dto';
import { GetClassSectionsFilterDto } from './dto/get-class-sections-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('class-sections')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassSectionsController {
  constructor(private readonly service: ClassSectionsService) {}

  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateClassSectionDto) {
    const data = await this.service.create(dto);
    return { success: true, data };
  }

  @Get()
  @Roles('admin', 'student')
  async findAll(
    @Query() filterDto: GetClassSectionsFilterDto,
    @Request() req,
  ) {
    // Logic พิเศษสำหรับ Student: บังคับดูแค่เทอมปัจจุบัน
    if (req.user.role === 'student') {
      const current = this.service.getCurrentSemester();
      
      // Override Filter
      filterDto.academic_year = current.academic_year;
      filterDto.term = current.term;
    }

    const result = await this.service.findAllWithFilter(filterDto);

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Put(':id')
  @Roles('admin')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassSectionDto,
  ) {
    const data = await this.service.update(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.service.remove(id);
    return { success: true, data };
  }
}