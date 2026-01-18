import { Injectable } from '@nestjs/common';
import { CreateReportFileDto } from './dto/create-report-file.dto';
import { UpdateReportFileDto } from './dto/update-report-file.dto';

@Injectable()
export class ReportFileService {
  create(createReportFileDto: CreateReportFileDto) {
    return 'This action adds a new reportFile';
  }

  findAll() {
    return `This action returns all reportFile`;
  }

  findOne(id: number) {
    return `This action returns a #${id} reportFile`;
  }

  update(id: number, updateReportFileDto: UpdateReportFileDto) {
    return `This action updates a #${id} reportFile`;
  }

  remove(id: number) {
    return `This action removes a #${id} reportFile`;
  }
}
