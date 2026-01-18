// import { ApiProperty } from '@nestjs/swagger'; // ถ้าใช้ Swagger (Optional)

export class GroupStudentDto {
  name: string;
  code: string;
  role: string;
}

export class GroupProgressDto {
  roundId: number;
  roundTitle: string;
  roundNumber: number;
  startDate: Date;
  endDate: Date;
  status: string;
  submittedAt: Date | null;
  submissionId: number | null;
  fileUrl: string | null;
  downloadUrl: string | null;
  fileName: string | null;
}

export class AdvisedGroupResponseDto {
  groupId: string;
  thesisCode: string;
  thesisName: string;
  thesisStatus: string;
  advisorRole: string;
  courseType: string;
  academicYear: string; 
  term: string;        
  
  students: GroupStudentDto[];
  progress: GroupProgressDto[];
}