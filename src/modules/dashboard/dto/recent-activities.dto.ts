// src/modules/dashboard/dto/recent-activities.dto.ts

export interface IRecentUpload {
  submissionId: number;
  thesisCode: string;
  thesisName: string;
  status: string;
  uploadedAt: Date;
}

export interface IRecentUploadsStats {
  waitingForVerify: number;
  items: IRecentUpload[];
}

export interface IGroupRequest {
  groupId: string;
  requesterName: string;
  thesisName: string;
  memberCount: number;
  advisorCount: number;
  term: number;
  academicYear: number;
  createdAt: Date;
}

export interface IGroupRequestsStats {
  pendingCount: number;
  items: IGroupRequest[];
}