import { IsOptional, IsEnum } from 'class-validator';
import { AdvisorRole } from '../enum/advisor-role.enum';

export class UpdateAdvisorDto {
    @IsOptional()
    @IsEnum(AdvisorRole)
    role?: AdvisorRole;
}
