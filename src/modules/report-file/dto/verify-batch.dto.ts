import { IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class VerifyBatchDto {
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  submissionIds: number[];
}
