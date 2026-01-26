import { PartialType } from '@nestjs/mapped-types';
import { CreateReportFileDto } from './create-report-file.dto';

export class UpdateReportFileDto extends PartialType(CreateReportFileDto) {}
