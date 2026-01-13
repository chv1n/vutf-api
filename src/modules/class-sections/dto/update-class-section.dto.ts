import { PartialType } from '@nestjs/mapped-types';
import { CreateClassSectionDto } from './create-class-section.dto';

export class UpdateClassSectionDto extends PartialType(CreateClassSectionDto) {}