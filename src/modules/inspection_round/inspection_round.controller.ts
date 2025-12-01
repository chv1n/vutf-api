import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InspectionRoundService } from './inspection_round.service';
import { CreateInspectionRoundDto } from './dto/create-inspection_round.dto';
import { UpdateInspectionRoundDto } from './dto/update-inspection_round.dto';

@Controller('inspection-round')
export class InspectionRoundController {
  constructor(private readonly inspectionRoundService: InspectionRoundService) {}

  @Post()
  create(@Body() createInspectionRoundDto: CreateInspectionRoundDto) {
    return this.inspectionRoundService.create(createInspectionRoundDto);
  }

  @Get()
  findAll() {
    return this.inspectionRoundService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inspectionRoundService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInspectionRoundDto: UpdateInspectionRoundDto) {
    return this.inspectionRoundService.update(+id, updateInspectionRoundDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inspectionRoundService.remove(+id);
  }
}
