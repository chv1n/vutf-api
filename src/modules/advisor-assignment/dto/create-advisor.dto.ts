import { IsEnum, IsString } from 'class-validator';
import { AdvisorRole } from '../enum/advisor-role.enum';

export class CreateAdvisorDto {
  @IsString()
  instructor_id: string;

  @IsEnum(AdvisorRole)
  role: string;
}
