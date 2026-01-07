import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddMemberDto {
    @IsNotEmpty()
    @IsUUID()
    student_uuid: string;
}
