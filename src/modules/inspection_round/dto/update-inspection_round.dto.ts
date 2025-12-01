import { PartialType } from '@nestjs/mapped-types';
import { CreateInspectionRoundDto } from './create-inspection_round.dto';

export class UpdateInspectionRoundDto extends PartialType(CreateInspectionRoundDto) {}