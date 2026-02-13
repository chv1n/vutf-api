import { PartialType } from '@nestjs/mapped-types';
import { CreateExportFileDto } from './create-export-file.dto';

export class UpdateExportFileDto extends PartialType(CreateExportFileDto) {}
