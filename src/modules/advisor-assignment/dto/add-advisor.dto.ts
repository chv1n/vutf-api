import { IsNotEmpty, IsUUID, IsEnum } from 'class-validator';
import { AdvisorRole } from '../enum/advisor-role.enum';

export class AddAdvisorDto {
    @IsNotEmpty()
    @IsUUID()
    instructor_uuid: string;

    @IsNotEmpty()
    @IsEnum(AdvisorRole)
    role: AdvisorRole;
}
