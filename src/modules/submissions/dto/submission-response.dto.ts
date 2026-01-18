// src/modules/submissions/dto/submission-response.dto.ts
import { Submission } from '../entities/submission.entity';
import { SubmissionStatus } from '../enum/submission-status.enum';

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

export class SubmissionResponseDto {
    submissionId: number;
    fileName: string;
    fileUrl: string;
    downloadUrl: string;
    fileSize: number;
    mimeType: string;
    status: SubmissionStatus;
    submittedAt: Date;
    verifiedAt: Date | null;
    comment: string | null;
    groupId: string;

    inspectionId: number;
    inspectionRoundNumber: number;
    inspectionTitle: string;
    inspectionDescription: string;
    inspectionStartDate: Date;
    inspectionEndDate: Date;
    inspectionCourseType: string;

    thesisTitleTh: string;
    thesisTitleEn: string;
    thesisCode: string;
    thesisCourseType: string;
    submitterName: string;      // ชื่อคนกดส่ง

    groupMembers: GroupMemberDto[]; // รายชื่อเพื่อนในกลุ่ม
    advisors: AdvisorDto[];         // รายชื่ออาจารย์ที่ปรึกษา

    static fromEntity(entity: Submission): SubmissionResponseDto {
        const dto = new SubmissionResponseDto();
        dto.submissionId = entity.submissionId;
        dto.fileName = entity.fileName;
        dto.fileUrl = entity.fileUrl;
        dto.downloadUrl = entity.fileUrl;
        dto.fileSize = entity.fileSize;
        dto.mimeType = entity.mimeType;
        dto.status = entity.status;
        dto.submittedAt = entity.submittedAt;
        dto.verifiedAt = entity.verifiedAt;
        dto.comment = entity.comment;
        dto.groupId = entity.group?.group_id;
        dto.inspectionId = entity.inspectionRound?.inspectionId;

        // 1. ข้อมูลโครงงาน (Thesis)
        if (entity.thesis) {
            dto.thesisTitleTh = entity.thesis.thesis_name_th;
            dto.thesisTitleEn = entity.thesis.thesis_name_en;
            dto.thesisCode = entity.thesis.thesis_code;
            dto.thesisCourseType = entity.thesis.course_type;
        }

        // 2. ข้อมูลคนกดส่ง (Submitter Name)
        if (entity.submitter?.student) {
            dto.submitterName = `${entity.submitter.student.first_name} ${entity.submitter.student.last_name}`;
        }

        // 3. ข้อมูลรอบการตรวจ (Inspection Round)
        if (entity.inspectionRound) {
            dto.inspectionRoundNumber = entity.inspectionRound.roundNumber;
            dto.inspectionTitle = entity.inspectionRound.title;
            dto.inspectionDescription = entity.inspectionRound.description;
            dto.inspectionStartDate = entity.inspectionRound.startDate;
            dto.inspectionEndDate = entity.inspectionRound.endDate;
            dto.inspectionCourseType = entity.inspectionRound.courseType;
        }

        // 4. ข้อมูลสมาชิกในกลุ่ม (Group Members)
        dto.groupMembers = [];
        // เช็คว่ามีข้อมูล group และ members หรือไม่ (ต้อง Join มาก่อนถึงจะมีข้อมูล)
        if (entity.group && entity.group.members) {
            dto.groupMembers = entity.group.members.map((member) => ({
                studentId: member.student?.student_uuid || '',
                studentCode: member.student?.student_code || '',
                firstName: member.student?.first_name || '',
                lastName: member.student?.last_name || '',
                role: member.role,
                avatarUrl: null,
            }));
        }

        // 5. ข้อมูลอาจารย์ที่ปรึกษา (Advisors)
        dto.advisors = [];
        if (entity.group && entity.group.advisor) {
            dto.advisors = entity.group.advisor.map((assign) => ({
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
