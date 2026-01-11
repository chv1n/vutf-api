import { Submission } from '../entities/submission.entity';
import { SubmissionStatus } from '../enum/submission-status.enum';

export class SubmissionResponseDto {
    submissionId: number;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    status: SubmissionStatus;
    submittedAt: Date;
    verifiedAt: Date | null;
    comment: string | null;
    groupId: string;
    inspectionId: number;

    static fromEntity(entity: Submission): SubmissionResponseDto {
        const dto = new SubmissionResponseDto();
        dto.submissionId = entity.submissionId;
        dto.fileName = entity.fileName;
        dto.fileUrl = entity.fileUrl;
        dto.fileSize = entity.fileSize;
        dto.mimeType = entity.mimeType;
        dto.status = entity.status;
        dto.submittedAt = entity.submittedAt;
        dto.verifiedAt = entity.verifiedAt;
        dto.comment = entity.comment;
        dto.groupId = entity.group?.group_id;
        dto.inspectionId = entity.inspectionRound?.inspectionId;
        return dto;
    }
}
