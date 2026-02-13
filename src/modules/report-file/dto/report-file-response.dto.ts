// src/modules/report-file/dto/report-file-response.dto.ts
import { ReportFile } from '../entities/report-file.entity';
import { VerificationResultStatus, InstructorReviewStatus } from '../enum/report-status.enum';

// DTO ย่อยสำหรับไฟล์
export class FileDto {
    name: string;
    url: string;
    downloadUrl: string;
    type: string;
    size: number | null;
}

export class CsvDto {
    url: string;
    downloadUrl: string;
}

// DTO ย่อยสำหรับ Reviewer
export class ReviewerDto {
    name: string;
    id: string | null;
}

// DTO ย่อยสำหรับ Project
export class ProjectDto {
    nameTh: string;
    nameEn: string;
    code: string;
    courseType: string;
}

// DTO ย่อยสำหรับ Inspection Round
export class InspectionRoundDto {
    id: number;
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    courseType: string;
    year: string;
    term: string;
    roundNumber: number;
}

export class GroupMemberDto {
    studentId: string;
    studentCode: string;
    firstName: string;
    lastName: string;
    role: string;      // OWNER, MEMBER
    avatarUrl?: string | null;
}

export class AdvisorDto {
    instructorId: string;
    instructorCode?: string;
    firstName: string;
    lastName: string;
    role: string; // 'MAIN' (ที่ปรึกษาหลัก), 'CO' (ที่ปรึกษาร่วม)
}

// DTO ย่อยสำหรับ Context
export class ContextDto {
    submissionId: number;
    round: string;
}

// DTO หลัก
export class ReportFileResponseDto {
    id: number;
    attemptNumber: number;
    file: FileDto;
    originalFile: FileDto | null;
    csv: CsvDto | null;
    reviewer: ReviewerDto;
    commenter: ReviewerDto;
    project: ProjectDto;
    inspectionRound: InspectionRoundDto | null;
    createdAt: Date;
    verificationStatus: VerificationResultStatus;
    reviewStatus: InstructorReviewStatus;
    comment: string;
    context: ContextDto;
    courseType?: string;

    groupMembers: GroupMemberDto[]; // รายชื่อเพื่อนในกลุ่ม
    advisors: AdvisorDto[];         // รายชื่ออาจารย์ที่ปรึกษา

    /**
     * Static Factory Method: แปลง Entity -> DTO
     * รับ urls เข้ามาเพิ่ม เพราะต้อง generate แบบ Async จากข้างนอก
     */
    static fromEntity(
        entity: ReportFile, 
        pdfUrls: { url: string; downloadUrl: string },
        submissionPdfUrls: { url: string; downloadUrl: string } | null,
        csvUrls: { url: string; downloadUrl: string } | null,
        attemptNumber?: number
    ): ReportFileResponseDto {
        const dto = new ReportFileResponseDto();
        dto.id = entity.report_file_id;
        dto.attemptNumber = attemptNumber || 1;
        dto.createdAt = entity.reported_at;
        dto.verificationStatus = entity.verification_status;
        dto.reviewStatus = entity.review_status;
        dto.comment = entity.comment;

        // 1. File Info (PDF)
        dto.file = {
            name: entity.file_name,
            url: pdfUrls.url,
            downloadUrl: pdfUrls.downloadUrl,
            type: entity.file_type,
            size: entity.file_size || null,
        };

        if (entity.submission && submissionPdfUrls) {
            dto.originalFile = {
                name: entity.submission.fileName || 'original.pdf',
                url: submissionPdfUrls.url,
                downloadUrl: submissionPdfUrls.downloadUrl,
                type: entity.submission.mimeType,
                size: entity.submission.fileSize || null,
            };
        } else {
            dto.originalFile = null;
        }

        // CSV Info 
        if (entity.csv_url && csvUrls) {
            dto.csv = {
                url: csvUrls.url,
                downloadUrl: csvUrls.downloadUrl
            };
        } else {
            dto.csv = null;
        }

        // 2. Reviewer Info
        const reviewerProfile = entity.submission?.reviewer?.instructor;
        dto.reviewer = {
            name: reviewerProfile
                ? `${reviewerProfile.first_name} ${reviewerProfile.last_name}`.trim()
                : '-',
            id: entity.submission?.reviewer?.user_uuid || null
        };

        const commenterProfile = entity.commenter?.instructor;
        dto.commenter = {
            name: commenterProfile
                ? `${commenterProfile.first_name} ${commenterProfile.last_name}`.trim()
                : '-', // ถ้ายังไม่มีคนตรวจ หรือหาไม่เจอ
            id: entity.comment_by || null
        };

        // 3. Project Info
        if (entity.submission?.thesis) {
            const thesisCourseType = entity.submission.thesis.course_type;
            dto.project = {
                nameTh: entity.submission.thesis.thesis_name_th,
                nameEn: entity.submission.thesis.thesis_name_en,
                code: entity.submission.thesis.thesis_code,
                courseType: thesisCourseType,
            };
            dto.courseType = thesisCourseType;
        } else {
            dto.project = { nameTh: '-', nameEn: '-', code: '-', courseType: '' };
            dto.courseType = '';
        }

        // 4. Inspection Round Info
        const roundData = entity.submission?.inspectionRound;
        if (roundData) {
            dto.inspectionRound = {
                id: roundData.inspectionId,
                title: roundData.title,
                description: roundData.description,
                startDate: roundData.startDate,
                endDate: roundData.endDate,
                courseType: roundData.courseType,
                year: roundData.academicYear,
                term: roundData.term,
                roundNumber: roundData.roundNumber
            };
        } else {
            dto.inspectionRound = null;
        }

        // 5. Context
        dto.context = {
            submissionId: entity.submission_id,
            round: roundData?.title || '',
        };

        // 6. ข้อมูลสมาชิกในกลุ่ม (Group Members)
        dto.groupMembers = [];
        // เช็คว่ามีข้อมูล group และ members หรือไม่ (ต้อง Join มาก่อนถึงจะมีข้อมูล)
        if (entity.submission.group && entity.submission.group.members) {
            dto.groupMembers = entity.submission.group.members.map((member) => ({
                studentId: member.student?.student_uuid || '',
                studentCode: member.student?.student_code || '',
                firstName: member.student?.first_name || '',
                lastName: member.student?.last_name || '',
                role: member.role,
                avatarUrl: null,
            }));
        }

        // 7. ข้อมูลอาจารย์ที่ปรึกษา (Advisors)
        dto.advisors = [];
        if (entity.submission.group && entity.submission.group.advisor) {
            dto.advisors = entity.submission.group.advisor.map((assign) => ({
                instructorId: assign.instructor?.instructor_uuid,
                instructorCode: assign.instructor?.instructor_code,
                firstName: assign.instructor?.first_name || '',
                lastName: assign.instructor?.last_name || '',
                role: assign.role,
            }));
        }
        return dto;
    }
}