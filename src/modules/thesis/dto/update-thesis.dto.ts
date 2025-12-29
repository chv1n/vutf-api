import { PartialType } from '@nestjs/mapped-types';
import { CreateThesisDto } from './create-thesis.dto';

export class UpdateThesisDto extends PartialType(CreateThesisDto) {}
