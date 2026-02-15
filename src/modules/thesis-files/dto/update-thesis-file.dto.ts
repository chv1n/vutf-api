import { PartialType } from '@nestjs/mapped-types';
import { CreateThesisFileDto } from './create-thesis-file.dto';

export class UpdateThesisFileDto extends PartialType(CreateThesisFileDto) {}
