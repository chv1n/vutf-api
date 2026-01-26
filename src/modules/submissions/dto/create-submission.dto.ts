import { IsNotEmpty, IsNumber, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSubmissionDto {
    @Transform(({ value }) => parseInt(value, 10))
    @IsNumber()
    @IsNotEmpty()
    inspectionId: number;

    @IsUUID()
    @IsNotEmpty()
    groupId: string;
}

