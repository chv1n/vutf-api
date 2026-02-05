// src/modules/advisor-assignment/dto/advised-group-response.dto.ts

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

export class GroupReportDto {
  id: number;
  roundNumber: number;
  attemptNumber: number;
  submittedAt: Date;
  verificationStatus: string;
  reviewStatus: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  downloadUrl: string | null;
  csvUrl: string | null;
  senderName: string;
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
  reports: GroupReportDto[];
}