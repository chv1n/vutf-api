import { PartialType } from '@nestjs/mapped-types';
import { CreateTrackThesisDto } from './create-track-thesis.dto';

export class UpdateTrackThesisDto extends PartialType(CreateTrackThesisDto) {}
