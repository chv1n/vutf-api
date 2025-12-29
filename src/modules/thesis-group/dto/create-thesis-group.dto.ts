import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateThesisDto } from 'src/modules/thesis/dto/create-thesis.dto';
import { CreateGroupMemberDto } from 'src/modules/group-member/dto/create-group-member.dto';
import { CreateAdvisorDto } from 'src/modules/advisor-assignment/dto/create-advisor.dto';

export class CreateThesisGroupDto {
  @ValidateNested()
  @Type(() => CreateThesisDto)
  thesis: CreateThesisDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGroupMemberDto)
  group_member: CreateGroupMemberDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAdvisorDto)
  advisor: CreateAdvisorDto[];
}
