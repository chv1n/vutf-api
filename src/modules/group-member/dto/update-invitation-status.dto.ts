import { IsEnum, IsOptional, IsString, IsIn } from 'class-validator';
import { InvitationStatus } from '../enum/invitation-status.enum';

export class UpdateInvitationStatusDto {

    @IsIn(
        [InvitationStatus.APPROVED, InvitationStatus.REJECTED],
        { message: 'Status must be approved or rejected' }
    )
    invitation_status: InvitationStatus;
}
