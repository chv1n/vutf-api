import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReportFileService } from './report-file.service';
import { CreateReportFileDto } from './dto/create-report-file.dto';
import { UpdateReportFileDto } from './dto/update-report-file.dto';

@Controller('report-file')
export class ReportFileController {
  constructor(private readonly reportFileService: ReportFileService) {}

  @Get()
  findAll() {
    return this.reportFileService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportFileService.findOne(+id);
  }

  @Patch(':id/comment')
  update(@Param('id') id: string, @Body() updateReportFileDto: UpdateReportFileDto) {
    return this.reportFileService.update(+id, updateReportFileDto);
  }


}
