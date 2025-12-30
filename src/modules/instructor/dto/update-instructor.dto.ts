import { PartialType } from '@nestjs/mapped-types';
import { CreateInstructorByAdminDto } from './create-instructor.dto';

export class UpdateInstructorDto extends PartialType(CreateInstructorByAdminDto) {}